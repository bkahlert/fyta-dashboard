# syntax=docker/dockerfile:1

# ── Stage 1: build the Vite/Vue app ─────────────────────────────────────────
FROM node:lts-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ── Stage 2: minimal Python runtime ─────────────────────────────────────────
FROM python:3.12-slim AS runtime

RUN useradd --no-create-home --shell /bin/false app

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY deploy/server.py deploy/entrypoint.sh ./

RUN chmod +x entrypoint.sh && chown -R app:app /app

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/')" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
