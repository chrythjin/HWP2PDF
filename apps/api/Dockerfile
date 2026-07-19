# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @hwp2pdf/shared build \
  && pnpm --filter api build \
  && pnpm --filter api deploy --prod /prod/api

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
ENV LIBREOFFICE_BIN=soffice
ENV H2ORESTART_URL=https://github.com/ebandal/H2Orestart/releases/download/v0.7.12/H2Orestart.oxt
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH
ENV UPLOAD_DIR=/tmp/hwp2pdf/uploads
ENV RESULT_DIR=/tmp/hwp2pdf/results
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    libreoffice-java-common \
    fonts-nanum \
    fonts-noto-cjk \
    fonts-unfonts-core \
    ca-certificates \
    curl \
    unzip \
    openjdk-17-jre-headless \
  && curl -fsSL $H2ORESTART_URL -o /tmp/H2Orestart.oxt \
  && mkdir -p /usr/lib/libreoffice/share/extensions \
  && /usr/lib/libreoffice/program/unopkg add --shared /tmp/H2Orestart.oxt \
  && echo "--- H2Orestart extension verification ---" \
  && /usr/lib/libreoffice/program/unopkg list --shared 2>&1 | grep -qi "h2orestart" \
  || (echo "ERROR: H2Orestart filter not registered after installation" && exit 1) \
  && rm -f /tmp/H2Orestart.oxt \
  && fc-cache -f -v \
  && mkdir -p /app/.lo-profile \
  && /usr/lib/libreoffice/program/soffice --headless --nologo --nofirststartwizard --norestore --invisible -env:UserInstallation=file:///app/.lo-profile --terminate_after_init 2>&1 || echo "WARN: LO warm-up exited non-zero (expected on some versions)" \
  && ls -la /app/.lo-profile || true \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 hwp2pdf \
  && useradd --system --uid 1001 --gid hwp2pdf --create-home hwp2pdf \
  && mkdir -p /tmp/hwp2pdf/uploads /tmp/hwp2pdf/results \
  && chown -R hwp2pdf:hwp2pdf /app /tmp/hwp2pdf \
  && echo "--- Final extension check ---" \
  && /usr/lib/libreoffice/program/unopkg list --shared 2>&1 | head -20

COPY --from=build --chown=hwp2pdf:hwp2pdf /prod/api ./

USER hwp2pdf
EXPOSE 8080
CMD ["node", "dist/server.js"]

