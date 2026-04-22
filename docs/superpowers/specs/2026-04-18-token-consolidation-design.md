# Token Consolidation Design

**Date:** 2026-04-18
**Status:** Approved

## Problem

The app currently uses two token variables:

| Variable         | Where                                                     | Problem                                                                          |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `VITE_API_TOKEN` | `.env.local`, `vite.config.js`, `usePlants.js`, `App.vue` | Baked into the JS bundle at build time — token ends up in the Docker image layer |
| `FYTA_API_TOKEN` | `server.py`, `entrypoint.sh`                              | Server-side only, correct                                                        |

The goal is a single `FYTA_API_TOKEN` env var that works identically in local dev and Docker, with the token never entering the browser bundle.

## Solution: Server-side auth injection

Both the Vite dev proxy and `server.py` inject `Authorization: Bearer $FYTA_API_TOKEN` before forwarding requests upstream. The browser sends **no** auth header — it knows nothing about the token.

```
FYTA_API_TOKEN (env var, .env.local)
       │
       ├─ Dev:    vite.config.js (loadEnv reads FYTA_API_TOKEN, no VITE_ prefix)
       │            ├─ /api proxy      → injects Authorization header
       │            └─ /img-proxy proxy → injects Authorization header
       │
       └─ Prod/Docker:  entrypoint.sh validates → server.py reads os.environ
                          ├─ /api/*       → injects Authorization header
                          └─ /img-proxy/* → injects Authorization header
```

## Changes

### `vite.config.js`

- `loadEnv(mode, process.cwd(), '')` already loads all env vars; change `env.VITE_API_TOKEN` → `env.FYTA_API_TOKEN` in the `/img-proxy` proxy configure block.
- Add the same auth injection to the `/api` proxy configure block.

### `server.py`

- `/api/*` handler currently forwards the browser's `Authorization` header. Change it to inject `FYTA_API_TOKEN` from the environment instead (same pattern as `/img-proxy`).
- Add a Referer guard to both `_proxy_api` and `_proxy_img` (see Security section).
- Tighten `Access-Control-Allow-Origin: *` → `Access-Control-Allow-Origin: http://localhost:{PORT}`.

### `src/composables/usePlants.js`

- Remove `Authorization` header from the `useFetch` call — the proxy adds it.

### `src/App.vue`

- Remove `const apiToken = import.meta.env.VITE_API_TOKEN`.
- Remove the `v-if="!apiToken"` "setup required" gate. A 401 from the API will surface via the existing error alert (`Pflanzen konnten nicht geladen werden`).

### `.env.local`

- Already updated to `FYTA_API_TOKEN=...`. No change needed.

### Docs / historical references

- `config.example.js`: update comment to reference `FYTA_API_TOKEN`.
- `docs/superpowers/specs/2026-04-11-viewport-fill-vue-rewrite-design.md`: update `VITE_API_TOKEN` references to `FYTA_API_TOKEN` or mark as historical.
- `docs/superpowers/plans/2026-04-11-viewport-fill-vue-rewrite.md`: same.

## Security: Referer guard

Without a guard the proxy is an open relay — anyone who discovers the URL can make authenticated FYTA API calls through the server. The guard rejects requests whose `Referer` header doesn't start with the server's own origin.

```python
allowed = f"http://localhost:{PORT}"
ref = self.headers.get("Referer", "")
if not ref.startswith(allowed):
    self.send_error(403, "Forbidden")
    return
```

This is applied to both `_proxy_api` and `_proxy_img`. Browsers always send `Referer` for fetch requests from the served page; curl and external callers don't by default.

`Access-Control-Allow-Origin` is tightened from `*` to `http://localhost:{PORT}`.

## Integration tests

A runnable shell script `scripts/integration-test.sh` is added and **executed as part of implementation**. It:

1. Builds the app (`npm run build`).
2. Starts `server.py` with `FYTA_API_TOKEN` from `.env.local`.
3. Asserts `/api/user-plant` with correct Referer → `200`.
4. Asserts `/api/user-plant` without Referer → `403`.
5. Asserts `/img-proxy/...` with correct Referer → `200`.
6. Asserts `/img-proxy/...` without Referer → `403`.
7. Stops the server.
8. Detects container runtime (`docker` preferred, falls back to `podman` if `docker` is absent or not working).
9. Builds the container image using the detected runtime.
10. Runs the container with `--env-file .env.local` and repeats assertions 3–6 against the containerised server.
11. Stops and removes the container.

The test script exits non-zero on any failure so it can be used in CI.

### Container runtime detection

```bash
if docker info &>/dev/null 2>&1; then
    CONTAINER_RUNTIME=docker
elif podman info &>/dev/null 2>&1; then
    CONTAINER_RUNTIME=podman
else
    echo "Neither docker nor podman available — skipping container tests"
    CONTAINER_RUNTIME=
fi
```

The podman fallback applies only to the integration test script, not to user-facing documentation. `README.md` continues to reference `docker` only.

## File inventory

| File                                                                    | Action                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `vite.config.js`                                                        | Update token var name; add auth injection to `/api` proxy               |
| `server.py`                                                             | Inject auth for `/api`; add Referer guard to both proxies; tighten CORS |
| `src/composables/usePlants.js`                                          | Remove Authorization header                                             |
| `src/App.vue`                                                           | Remove token gate                                                       |
| `config.example.js`                                                     | Update comment                                                          |
| `docs/superpowers/specs/2026-04-11-viewport-fill-vue-rewrite-design.md` | Update references                                                       |
| `docs/superpowers/plans/2026-04-11-viewport-fill-vue-rewrite.md`        | Update references                                                       |
| `scripts/integration-test.sh`                                           | Create and run                                                          |
| `README.md`                                                             | Remove any remaining `VITE_API_TOKEN` mentions                          |
