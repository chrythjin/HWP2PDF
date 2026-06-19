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
ENV UPLOAD_DIR=/tmp/hwp2pdf/uploads
ENV RESULT_DIR=/tmp/hwp2pdf/results
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    fonts-nanum \
    fonts-noto-cjk \
    fonts-unfonts-core \
    ca-certificates \
    curl \
    unzip \
  && mkdir -p /usr/lib/libreoffice/share/extensions/H2Orestart \
  && curl -fsSL $H2ORESTART_URL -o /tmp/H2Orestart.oxt \
  && unzip -o /tmp/H2Orestart.oxt -d /usr/lib/libreoffice/share/extensions/H2Orestart \
  && rm -f /tmp/H2Orestart.oxt \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 hwp2pdf \
  && useradd --system --uid 1001 --gid hwp2pdf --create-home hwp2pdf \
  && mkdir -p /tmp/hwp2pdf/uploads /tmp/hwp2pdf/results \
  && chown -R hwp2pdf:hwp2pdf /tmp/hwp2pdf /app

COPY --from=build --chown=hwp2pdf:hwp2pdf /prod/api ./

USER hwp2pdf
EXPOSE 8080
CMD ["node", "dist/server.js"]

