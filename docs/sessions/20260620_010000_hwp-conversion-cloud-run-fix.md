---
title: HWP → PDF 변환 Cloud Run end-to-end 성공
summary: LibreOffice Java/H2Orestart 등록, express-rate-limit keyGenerator 검증, LibreOffice UserInstallation 문법 문제를 해결하여 Cloud Run에서 HWP→PDF 변환이 완료되고 signed PDF 다운로드까지 확인함.
date: 2026-06-20
---

# HWP → PDF 변환 Cloud Run end-to-end 성공

## 상태

- API end-to-end (initiate → GCS PUT → complete → job polling → completed → PDF download) 성공
- Vercel 프론트엔드 연동은 `NEXT_PUBLIC_API_BASE_URL` 설정/재배포 확인 후 종료 예정

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
- **수정**: `apps/api/src/app.ts`에서 `ipKeyGenerator(request.ip ?? "unknown")` 사용

### 4. LibreOffice UserInstallation 문법 오류

- **증상**: `--env:UserInstallation=file:///tmp/...` 옵션을 LibreOffice 7.4.7.2가 거부
- **원인**: LibreOffice 7.4의 CLI는 `--env:`(더블 대시) 형식을 인식하지 않음
- **수정**: `apps/api/src/services/conversion-service.ts`에서 `-env:UserInstallation=file://...` (싱글 대시)로 변경, 동시에 stdout도 캡처하여 향후 LibreOffice 디버깅 정보 확보

## 변경 파일

- `apps/api/Dockerfile`
- `apps/api/src/app.ts`
- `apps/api/src/services/conversion-service.ts`

## 검증

- `pnpm --filter api build` 통과
- GitHub Actions `deploy-api-cloud-run.yml` 3회 연속 성공
- curl end-to-end 테스트:
  - `POST /v1/uploads/initiate` 201
  - GCS signed URL PUT 200
  - `POST /v1/uploads/complete` 200
  - `GET /v1/jobs/:jobId` polling → `status=completed, progress=100`
  - signed PDF URL 다운로드 200, 260,371 bytes

## 남은 작업

- Vercel Dashboard에서 `NEXT_PUBLIC_API_BASE_URL=https://hwp2pdf-api-130439872251.asia-northeast3.run.app` 확인
- Vercel 재배포 후 `https://hwp2pdf-phi.vercel.app`에서 브라우저 업로드 테스트
