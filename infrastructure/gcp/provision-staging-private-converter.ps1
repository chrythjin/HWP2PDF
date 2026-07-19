param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [Parameter(Mandatory = $true)][string]$Region,
  [Parameter(Mandatory = $true)][string]$BucketName,
  [Parameter(Mandatory = $true)][string]$ConverterImage,
  [Parameter(Mandatory = $true)][string]$EgressNetwork,
  [Parameter(Mandatory = $true)][string]$EgressSubnet,
  [Parameter(Mandatory = $true)][string]$EgressNetworkTag,
  [Parameter(Mandatory = $true)][string]$PublicEgressDenyRule,
  [string]$FirestoreDatabase = "(default)",
  [string]$ApiService = "hwp2pdf-api",
  [string]$ConverterService = "hwp2pdf-converter",
  [string]$QueueName = "conversion-queue"
)

$ErrorActionPreference = "Stop"
$dispatcherSa = "api-dispatcher-sa@$ProjectId.iam.gserviceaccount.com"
$converterSa = "api-converter-sa@$ProjectId.iam.gserviceaccount.com"
$apiRuntimeSa = & gcloud run services describe $ApiService --region=$Region --project=$ProjectId --format="value(spec.template.spec.serviceAccountName)"
if (-not $apiRuntimeSa) {
  throw "The public API runtime service account could not be resolved."
}
if ($apiRuntimeSa -eq $dispatcherSa -or $apiRuntimeSa -eq $converterSa) {
  throw "The public API runtime identity must be distinct from the dispatcher and converter identities."
}
$projectNumber = & gcloud projects describe $ProjectId --format="value(projectNumber)"
$tasksAgent = "service-$projectNumber@gcp-sa-cloudtasks.iam.gserviceaccount.com"

if ($ConverterImage -notmatch "@sha256:[a-f0-9]{64}$") {
  throw "ConverterImage must be an immutable image digest."
}

$computeEnabled = & gcloud services list --enabled --project=$ProjectId --filter="config.name=compute.googleapis.com" --format="value(config.name)"
if ($computeEnabled -ne "compute.googleapis.com") {
  throw "Compute Engine API must already be enabled for the approved Direct VPC egress preflight."
}

$subnetPga = & gcloud compute networks subnets describe $EgressSubnet --region=$Region --project=$ProjectId --format="value(privateIpGoogleAccess)"
if ($subnetPga -ne "True") {
  throw "The approved converter subnet must have Private Google Access enabled."
}

$egressRule = & gcloud compute firewall-rules describe $PublicEgressDenyRule --project=$ProjectId --format=json | ConvertFrom-Json
if (
  $egressRule.direction -ne "EGRESS" -or
  $egressRule.disabled -or
  $egressRule.targetTags -notcontains $EgressNetworkTag -or
  -not $egressRule.denied -or
  $egressRule.destinationRanges -notcontains "0.0.0.0/0"
) {
  throw "The approved public-egress deny firewall rule must be enabled, tagged, deny egress, and cover 0.0.0.0/0."
}

$natNames = @(& gcloud compute routers nats list --region=$Region --project=$ProjectId --format="value(name)")
if ($natNames.Count -gt 0) {
  throw "A regional Cloud NAT exists; verify it cannot serve the converter subnet before deployment."
}

foreach ($account in @(
  @{ Name = "api-dispatcher-sa"; Display = "HWP2PDF staging Cloud Tasks OIDC subject" },
  @{ Name = "api-converter-sa"; Display = "HWP2PDF staging private converter runtime" }
)) {
  & gcloud iam service-accounts describe "$($account.Name)@$ProjectId.iam.gserviceaccount.com" --project=$ProjectId 2>$null
  if ($LASTEXITCODE -ne 0) {
    & gcloud iam service-accounts create $account.Name --display-name=$account.Display --project=$ProjectId
  }
}

& gcloud tasks queues describe $QueueName --location=$Region --project=$ProjectId 2>$null
if ($LASTEXITCODE -ne 0) {
  & gcloud tasks queues create $QueueName --location=$Region --max-concurrent-dispatches=1 --max-dispatches-per-second=0.1 --max-attempts=3 --project=$ProjectId
}

& gcloud storage buckets add-iam-policy-binding "gs://$BucketName" --member="serviceAccount:$apiRuntimeSa" --role="roles/storage.objectAdmin"
& gcloud tasks queues add-iam-policy-binding $QueueName --location=$Region --member="serviceAccount:$apiRuntimeSa" --role="roles/cloudtasks.enqueuer" --project=$ProjectId

& gcloud iam service-accounts add-iam-policy-binding $dispatcherSa --member="serviceAccount:$apiRuntimeSa" --role="roles/iam.serviceAccountUser" --project=$ProjectId
& gcloud iam service-accounts add-iam-policy-binding $dispatcherSa --member="serviceAccount:$tasksAgent" --role="roles/iam.serviceAccountUser" --project=$ProjectId

& gcloud storage buckets add-iam-policy-binding "gs://$BucketName" --member="serviceAccount:$converterSa" --role="roles/storage.objectAdmin"
& gcloud firestore databases add-iam-policy-binding $FirestoreDatabase --project=$ProjectId --member="serviceAccount:$converterSa" --role="roles/datastore.user"

& gcloud run deploy $ConverterService --image=$ConverterImage --command=node --args=dist/server-converter.js --region=$Region --project=$ProjectId --service-account=$converterSa --ingress=internal --no-allow-unauthenticated --network=$EgressNetwork --subnet=$EgressSubnet --vpc-egress=all-traffic --network-tags=$EgressNetworkTag --memory=2Gi --cpu=2 --concurrency=1 --timeout=300 --min-instances=0 --max-instances=1 --set-env-vars="NODE_ENV=production,CONVERTER_ONLY=true,STORAGE_BACKEND=gcs,GCS_BUCKET_NAME=$BucketName,JOB_STORE_BACKEND=firestore,FIREBASE_PROJECT_ID=$ProjectId,FIREBASE_ADMIN_MODE=adc,CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL=$dispatcherSa,INTERNAL_WORKER_URL=__SET_AFTER_DEPLOY__,INTERNAL_WORKER_AUDIENCE=__SET_AFTER_DEPLOY__,INTERNAL_WORKER_ISSUER=https://accounts.google.com"
$converterUrl = & gcloud run services describe $ConverterService --region=$Region --project=$ProjectId --format="value(status.url)"
if (-not $converterUrl) {
  throw "Converter service URL was not returned after deployment."
}
& gcloud run services update $ConverterService --region=$Region --project=$ProjectId --update-env-vars="INTERNAL_WORKER_URL=$converterUrl/internal/workers/convert,INTERNAL_WORKER_AUDIENCE=$converterUrl,INTERNAL_WORKER_ISSUER=https://accounts.google.com"
& gcloud run services add-iam-policy-binding $ConverterService --region=$Region --project=$ProjectId --member="serviceAccount:$dispatcherSa" --role="roles/run.invoker"

Write-Output "Provisioned private converter resources with an immutable image and verified egress prerequisite. The public API was intentionally not redeployed or pointed at the converter. To promote, set CONVERSION_DISPATCH_TARGET=converter plus CONVERTER_WORKER_URL/AUDIENCE; roll back target-only by setting CONVERSION_DISPATCH_TARGET=legacy, or set CONVERSION_DISPATCHER=inline."
