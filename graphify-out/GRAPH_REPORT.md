# Graph Report - .  (2026-06-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 204 nodes · 251 edges · 61 communities (15 shown, 46 thin omitted)
- Extraction: 76% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e908aff3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]

## God Nodes (most connected - your core abstractions)
1. `HWP File Upload Constraints` - 14 edges
2. `@hwp2pdf/shared Package` - 14 edges
3. `HWP2PDF Documentation Index` - 13 edges
4. `API Cloud Run Runtime Contract` - 13 edges
5. `Recommended MVP Architecture (frontend/backend/storage separation)` - 12 edges
6. `Cloud Run Conversion Backend` - 11 edges
7. `pnpm Monorepo Workspace Configuration` - 11 edges
8. `HWP2PDF Deployment Guide (Korean, beginner)` - 9 edges
9. `HWP2PDF Blueprint (Korean Spec)` - 9 edges
10. `HWP2PDF Plan v1 (Korean Spec)` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Session 2026-06-13 01:59 - llmwiki source splitting` --references--> `HWP2PDF Documentation Index`  [INFERRED]
  C://NEW PRG//HWP2PDF//docs//sessions//20260613_015938_llmwiki-source-splitting.md → C://NEW PRG//HWP2PDF//docs//INDEX.md
- `Session 2026-06-13 03:04 - API backend MVP` --references--> `HWP2PDF Agent Guide (root)`  [INFERRED]
  C://NEW PRG//HWP2PDF//docs//sessions//20260613_030400_api-backend-mvp.md → C://NEW PRG//HWP2PDF//AGENTS.md
- `HWP2PDF Deployment Guide (Korean, beginner)` --conceptually_related_to--> `Why direct browser-to-GCS upload pattern`  [INFERRED]
  C://NEW PRG//HWP2PDF//docs//DEPLOYMENT_GUIDE.md → C://NEW PRG//HWP2PDF//docs//sessions//20260613_193000_direct-gcs-upload.md
- `GCS Lifecycle Rules` --semantically_similar_to--> `GCS Lifecycle Management`  [INFERRED] [semantically similar]
  C:/NEW PRG/HWP2PDF/wiki/concepts/gcs-lifecycle-rules.md → C:/NEW PRG/HWP2PDF/wiki/concepts/gcs-lifecycle-management.md
- `HWP File Upload Constraints` --semantically_similar_to--> `HWP File Upload Validation`  [INFERRED] [semantically similar]
  C:/NEW PRG/HWP2PDF/wiki/concepts/hwp-file-upload-constraints.md → C:/NEW PRG/HWP2PDF/wiki/concepts/hwp-file-upload-validation.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **HWP2PDF production runtime stack** — concept_cloud_run_api_service, concept_h2orestart_extension, concept_direct_gcs_upload, concept_firestore_job_state, concept_job_retention_30min, concept_gcs_signed_url_ttl, concept_shared_upload_constraints [INFERRED 0.95]
- **HWP2PDF deployment workflow chain** — workflows_deploy_api_cloud_run_yml, workflows_deploy_web_vercel_yml, deployment_guide, user_setup_checklist, concept_workerdentity_federation [INFERRED 0.95]
- **HWP2PDF API/infra session progression** — sessions_20260613_030400_api_backend_mvp, sessions_20260613_041500_frontend_api_upload_polling, sessions_20260613_043000_api_cloud_run_runtime, sessions_20260613_181757_api_gcs_storage_boundary, sessions_20260613_190000_firestore_job_store_deploy, sessions_20260613_191700_job_expiry_download_gate, sessions_20260613_193000_direct_gcs_upload [INFERRED 0.85]
- **MVP Architecture Component Layers** — next_js_frontend, cloud_run_api, gcs_temp_storage, presigned_url_pattern, signed_download_url, gcs_lifecycle_rule, rate_limiting, libreoffice_conversion, async_job_model [EXTRACTED 1.00]
- **Job Status Lifecycle States** — job_status_polling, job_status_states, async_job_model [EXTRACTED 1.00]
- **Blueprint-derived Source Files** — sources_blueprint_architecture_overview, sources_blueprint_async_processing_flow, sources_blueprint_conversion_strategy, sources_blueprint_security_and_retention, sources_plan_scope_and_success_metrics, sources_plan_system_components [EXTRACTED 1.00]
- **HWP to PDF Conversion Pipeline** — concepts_cloud_run_conversion_backend_cloud_run_conversion_backend, concepts_libreoffice_headless_conversion_libreoffice_headless_conversion, concepts_h2orestart_extension_h2orestart_extension, concepts_cloud_run_document_conversion_architecture_cloud_run_document_conversion_architecture, concepts_gcs_lifecycle_rules_gcs_lifecycle_rules, concepts_hwp_file_format_conversion_challenges_hwp_file_format_conversion_challenges [EXTRACTED 1.00]
- **Centralized Upload Validation Chain** — concepts_hwp_file_upload_constraints_hwp_file_upload_constraints, concepts_hwp_file_upload_validation_hwp_file_upload_validation, concepts_hwp2pdfshared_package_hwp2pdfshared_package, concepts_nextjs_16_frontend_nextjs_16_frontend, concepts_pnpm_monorepo_workspace_configuration_pnpm_monorepo_workspace_configuration [EXTRACTED 1.00]
- **pnpm Monorepo Build Chain** — concepts_pnpm_monorepo_workspace_configuration_pnpm_monorepo_workspace_configuration, concepts_pnpm_monorepo_structure_pnpm_monorepo_structure, concepts_hwp2pdfshared_package_hwp2pdfshared_package, concepts_hwp2pdf_project_hwp2pdf_project, concepts_monorepo_workspace_scripts_monorepo_workspace_scripts, concepts_llm_wiki_repository_structure_llm_wiki_repository_structure [EXTRACTED 1.00]
- **pnpm Workspace Infrastructure** — concepts_pnpm_workspace_architecture, concepts_pnpm_workspace_configuration, concepts_pnpm_workspace_monorepo, concepts_pnpm_recursive_build_verification [INFERRED 0.85]
- **Shared TypeScript Contracts Layer** — concepts_shared_package_architecture, concepts_shared_typescript_contracts, concepts_shared_typescript_contracts_package [INFERRED 0.95]
- **Serverless Rate Limiting Strategy** — concepts_serverless_rate_limiting, concepts_upstash_rate_limiting, concepts_redis_job_queue_system [INFERRED 0.85]
- **Globe Sphere Construction** — public_globe_globe_icon, public_globe_sphere_outline, public_globe_latitude_curves, public_globe_meridian_curves [EXTRACTED 1.00]
- **Vercel Logo Design System** — public_vercel_vercel_logo_svg, public_vercel_upward_triangle, public_vercel_vercel_brand, public_vercel_brand_identity, public_vercel_minimalist_monochrome [INFERRED 0.85]
- **Anatomy of the Window Icon** — public_window_outerframe, public_window_titlebar, public_window_controlbuttons, public_window_contentpanel [EXTRACTED 1.00]

## Communities (61 total, 46 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (29): Cloud Run API service hwp2pdf-api (asia-northeast3), Direct browser-to-GCS signed URL upload, Firestore-backed job polling state, V4 signed result download URL (15-min TTL), H2Orestart LibreOffice extension v0.7.12, 30-minute job retention and expiresAt contract, scripts/smoke-api.mjs deployment smoke test, Vercel Next.js deployment of apps/web (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.29
Nodes (22): Cloud Run Conversion Backend, Cloud Run Document Conversion Architecture, Documentation Gaps, GCS Lifecycle Management, GCS Lifecycle Rules, H2Orestart Extension, HWP2PDF Project, HWP2PDF Service Architecture (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (20): 30-minute File Retention Target, Beginner-friendly Deployment Guide (docs/DEPLOYMENT_GUIDE.md), Cloud Run API/Worker, GCS Lifecycle-based Deletion, GCS Temporary Storage, HWP2PDF Blueprint (Korean Spec), Recommended MVP Architecture (frontend/backend/storage separation), LibreOffice Headless Conversion (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (13): Asynchronous Job Model, Async job model preferred over synchronous (serverless-friendly, natural progress UI, easier retry/failure handling), Job Status Polling (frontend polls GET /v1/jobs/:jobId), Job Status States (idle/uploading/queued/processing/completed/failed/expired), Session Documentation Rule (docs/sessions/ per successful change), HWP2PDF Agent Guide (sources copy), Blueprint Async Processing Flow (derived), HWP2PDF Blueprint Full (derived) (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.21
Nodes (13): pnpm Recursive Build Verification, pnpm Workspace Architecture, pnpm Workspace Configuration, pnpm Workspace Monorepo, Presigned URL Security Pattern, Presigned URL Upload Pattern, Session-Based Documentation, Session Documentation Rule (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.27
Nodes (11): 15-minute Signed Download URL TTL, API Layer: Presigned URLs, Job Management, Rate Limiting, Conversion Latency KPI (<= 60s warm), Conversion Success Rate KPI (>= 95%), Conversion Worker: HWP-to-PDF Engine, Frontend: Next.js on Vercel, HWP2PDF Plan v1 (Korean Spec), HWP to PDF Conversion (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (10): HWP2PDF Agent Guide (root), HWP to PDF conversion pipeline (LibreOffice + H2Orestart), pnpm workspace (apps/*, packages/*), Shared upload constraints (.hwp only, 20MB), Serena project.yml (HWP2PDF), Session 2026-06-13 00:46 - llm-wiki init, Session 2026-06-13 01:20 - llmwiki MiniMax aborted, Session 2026-06-13 01:59 - llmwiki source splitting (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (9): Clip Path Boundary, Globe Icon, Glyph Fill #666, Internationalization Symbol Concept, Latitude Curves, Meridian Curves, Next.js Public Static Asset, Sphere Outline (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (7): Window Icon SVG Asset, Inner Content Panel, Three Traffic-light Control Buttons, macOS-style Window Affordance (Three-dot Title Bar), Outer Window Frame, Title Bar Region, Window Icon (16x16 UI Glyph)

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (5): Document/File Concept, Folded Top-Right Corner Motif, Gray Glyph Color #666, Generic File Icon SVG, Horizontal Text Lines Motif

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (5): Brand Identity Asset, Minimalist Monochrome Design, Upward Triangle Shape, Vercel Brand, Vercel Logo SVG

### Community 11 - "Community 11"
Cohesion: 0.67
Nodes (4): Next.js Logo SVG, create-next-app Default Boilerplate Branding, Next.js Brand Wordmark, Next.js Static Public Asset Pattern

### Community 12 - "Community 12"
Cohesion: 0.67
Nodes (3): Redis Job Queue System, Serverless Rate Limiting, Upstash Rate Limiting

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (3): pnpm Workspace Configuration, LLM Wiki Initialization Session, pnpm Workspace Packages (apps/* and packages/*)

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (3): Test Infrastructure and Shared Validation Session, Shared Validation Refactor, Vitest Test Infrastructure

## Ambiguous Edges - Review These
- `Session Documentation Rule` → `Verified Build Commands`  [AMBIGUOUS]
  C:/NEW PRG/HWP2PDF/wiki/concepts/verified-build-commands.md · relation: conceptually_related_to

## Knowledge Gaps
- **84 isolated node(s):** `createApp`, `notFoundHandler`, `errorHandler`, `requestIdMiddleware`, `handleUploadMiddleware` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Session Documentation Rule` and `Verified Build Commands`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `HWP2PDF Documentation Index` connect `Community 0` to `Community 6`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Recommended MVP Architecture (frontend/backend/storage separation)` connect `Community 2` to `Community 3`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Asynchronous Job Model` connect `Community 3` to `Community 2`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `API Cloud Run Runtime Contract` (e.g. with `HWP2PDF Deployment Guide (Korean, beginner)` and `Why Firestore job store across Cloud Run instances`) actually correct?**
  _`API Cloud Run Runtime Contract` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `createApp`, `notFoundHandler`, `errorHandler` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14039408866995073 - nodes in this community are weakly interconnected._