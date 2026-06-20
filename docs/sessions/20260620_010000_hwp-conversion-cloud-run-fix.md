---
title: HWP → PDF 변환 Cloud Run end-to-end 성공 및 속도 최적화
summary: LibreOffice Java/H2Orestart 등록, express-rate-limit keyGenerator 검증, LibreOffice UserInstallation 문법 문제를 해결하여 Cloud Run에서 HWP→PDF 변환이 완료되고 signed PDF 다운로드까지 확인함. 추가로 Dockerfile에서 LibreOffice profile을 warm-up하고 /app에 고정하여 변환 시간을 112s → 92s로 단축.
date: 2026-06-20
---

# HWP → PDF 변환 Cloud Run end-to-end 성공 및 속도 최적화

## 상태

- API end-to-end (initiate → GCS PUT → complete → job polling → completed → PDF download) 성공
- Vercel 프론트엔드 연동 성공: `NEXT_PUBLIC_API_BASE_URL`가 Cloud Run URL로 설정되어 있음
- 변환 시간: 초기 105~112s → warm-up profile 적용 후 91.7s (~20s 단축, ~18% 개선)

## 원인 및 수정

### 1. LibreOffice Java 확장(H2Orestart) 실패

- **증상**: 변환 시작 직후 `Warning: failed to launch javaldx - java may not function correctly` → 종료 코드 1
- **원인**: Docker 런타임 이미지에 OpenJDK JRE가 없어 LibreOffice가 Java 기반 H2Orestart 확장을 로드하지 못함
- **수정**: `apps/api/Dockerfile` runtime 단계에 `openjdk-17-jre-headless` 및 `JAVA_HOME` 추가

### 2. H2Orestart 시스템 확장 등록 미비

- **증상**: Java 추가 후에도 LibreOffice가 HWP 파일을 열지 못하고 종료 코드 1
- **원인**: `/usr/lib/libreoffice/share/extensions/H2Orestart`에 직접 unzip했으나 LibreOffice가 확장을 인식하지 못함
- **수정**: `unopkg add --shared /tmp/H2Orestart.oxt`로 명시적 시스템 확장 등록

### 3. express-rate-limit keyGenerator 검증 실패

- **증상**: Cloud Run revision 시작 시 `ValidationError: Custom keyGenerator appears to use request IP without calling the ipKeyGenerator helper function for IPv6 addresses.` → 서버 500
- **원인**: fallback에서 `request.ip ?? "unknown"`을 직접 반환하면 express-rate-limit v8이 IPv6 처리 검증에서 거부
- **수정**: `apps/api/src/app.ts`에서 `ipKeyGenerator(request.ip ?? "unknown")` 사용, 추가로 `/health`와 `/v1/jobs/:jobId` polling은 rate limit 제외

### 4. LibreOffice UserInstallation 문법 오류

- **증상**: `--env:UserInstallation=file:///tmp/...` 옵션을 LibreOffice 7.4.7.2가 거부
- **원인**: LibreOffice 7.4의 CLI는 `--env:`(더블 대시) 형식을 인식하지 않음
- **수정**: `apps/api/src/services/conversion-service.ts`에서 `-env:UserInstallation=file://...` (싱글 대시)로 변경, 동시에 stdout도 캡처하여 향후 LibreOffice 디버깅 정보 확보

### 5. 변환 속도 최적화 (비용 추가 없음)

- **증상**: Vercel 프론트엔드에서 업로드 후 변환 완료까지 105~112s 소요
- **원인**: 매번 새 LibreOffice user profile을 생성하여 JVM/H2Orestart/폰트 캐시를 매번 초기화; Cloud Run `/tmp`는 tmpfs라 Docker 이미지에 warm-up한 profile이 사라짐
- **수정**:
  - `apps/api/src/services/conversion-service.ts`에서 profile directory를 `/app/.lo-profile`로 고정하고 재사용
  - `apps/api/Dockerfile`에서 `fc-cache -f -v`로 시스템 폰트 캐시 생성
  - Dockerfile에서 동일 `/app/.lo-profile`로 `soffice --headless --terminate_after_init`를 실행해 warm-up
  - `/app/.lo-profile`이 Docker 이미지에 포함되고 runtime에서도 유지되도록 `/app`에 위치

## 변경 파일

- `apps/api/Dockerfile`
- `apps/api/src/app.ts`
- `apps/api/src/services/conversion-service.ts`

## 검증

- `pnpm --filter api build` 통과
- GitHub Actions `deploy-api-cloud-run.yml` 연속 성공
- curl end-to-end 테스트:
  - `POST /v1/uploads/initiate` 201
  - GCS signed URL PUT 200
  - `POST /v1/uploads/complete` 200
  - `GET /v1/jobs/:jobId` polling → `status=completed, progress=100`
  - signed PDF URL 다운로드 200
- Vercel 프론트엔드 browser 테스트:
  - 페이지 로드 200
  - 파일 업로드 → GCS PUT → complete → polling → "변환 완료!" 및 PDF 다운로드 버튼까지 성공
  - 변환 시간 91.7s (warm-up profile 적용 후)
  - polling 44~53회 모두 200, 429 없음

## 결과물 위치

변환된 PDF는 GCS에 저장됨:

```
gs://hwp2pdf-bucket-1014/output/<jobId>/<jobId>.pdf
```

예시 (테스트로 생성된 파일):

- `gs://hwp2pdf-bucket-1014/output/7f675795-e7f1-46be-9519-f59807bc52d4/7f675795-e7f1-46be-9519-f59807bc52d4.pdf` (260,371 bytes)
- `gs://hwp2pdf-bucket-1014/output/4a7c1eae-3ee4-4513-8a7e-9fcaf406d62e/4a7c1eae-3ee4-4513-8a7e-9fcaf406d62e.pdf` (260,371 bytes)
- `gs://hwp2pdf-bucket-1014/output/9e4d9659-0e8e-4515-aaf5-b82b81271b47/9e4d9659-0e8e-4515-aaf5-b82b81271b47.pdf` (82,970 bytes)

로컬에 다운로드된 `C:\Users\U-N-00658\Downloads\converted_test.pdf`는 260,371 bytes이며 magic bytes가 `%PDF-1.6`으로 정상 PDF임을 확인.

## 남은 가능한 개선

- **Cloud Run cold start 제거**: `min-instances=1` 설정 시 첫 요청도 즉시 처리되나 비용 발생
- **CPU/메모리 업그레이드**: 변환 자체 속도 향상 가능하나 비용 발생
- 현재 1CPU/2GB, 비용 추가 없는 최적화는 profile warm-up까지 적용 완료
