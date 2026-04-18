# Token Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `VITE_API_TOKEN` references with a single `FYTA_API_TOKEN` env var, injected server-side so the token never enters the browser bundle; add a Referer guard to prevent open-relay abuse.

**Architecture:** Both the Vite dev proxy (`vite.config.js`) and the production server (`server.py`) inject `Authorization: Bearer $FYTA_API_TOKEN` before forwarding to upstream FYTA APIs. The Vue app sends no auth header. A Referer guard on `server.py` rejects requests whose `Referer` header doesn't start with the server's own origin, preventing third-party relay abuse.

**Tech Stack:** Python 3 (`http.server`), Vite 8, Vue 3, bash (`curl`, `grep`, `kill`)

---

## File map

| File | Change |
|---|---|
| `scripts/integration-test.sh` | **Create** — runnable test script (written first for TDD) |
| `server.py` | Inject token for `/api`; add `_check_referer` guard to both proxies; tighten CORS |
| `vite.config.js` | `VITE_API_TOKEN` → `FYTA_API_TOKEN`; add auth inject to `/api` proxy |
| `src/composables/usePlants.js` | Remove `Authorization` header from `useFetch` |
| `src/App.vue` | Remove `apiToken` const and `v-if="!apiToken"` gate |
| `config.example.js` | Update comment to reference `FYTA_API_TOKEN` |
| `docs/superpowers/specs/2026-04-11-viewport-fill-vue-rewrite-design.md` | Mark `VITE_API_TOKEN` references as superseded |
| `docs/superpowers/plans/2026-04-11-viewport-fill-vue-rewrite.md` | Same |
| `README.md` | Remove any remaining `VITE_API_TOKEN` mentions |

---

### Task 1: Write the integration test script (TDD — runs red first)

**Files:**
- Create: `scripts/integration-test.sh`

- [ ] **Step 1: Create the test script**

```bash
#!/usr/bin/env bash
# Integration tests for FYTA Dashboard server.
# Usage: ./scripts/integration-test.sh
# Requires: FYTA_API_TOKEN in .env.local, npm build output in dist/

set -euo pipefail

# ── colour helpers ────────────────────────────────────────────────────────────
GREEN="$(tput setaf 2)"
RED="$(tput setaf 1)"
RESET="$(tput sgr0)"

pass() { printf '%s✔%s %s\n' "${GREEN}" "${RESET}" "$*"; }
fail() { printf '%sϟ%s %s\n' "${RED}"   "${RESET}" "$*"; exit 1; }

# ── load token ───────────────────────────────────────────────────────────────
ENV_FILE="$(dirname "$0")/../.env.local"
if [[ ! -f "${ENV_FILE}" ]]; then
    fail ".env.local not found at ${ENV_FILE}"
fi
FYTA_API_TOKEN="$(grep -E '^FYTA_API_TOKEN=' "${ENV_FILE}" | cut -d= -f2-)"
if [[ -z "${FYTA_API_TOKEN}" ]]; then
    fail "FYTA_API_TOKEN not set in .env.local"
fi
export FYTA_API_TOKEN

# ── build ────────────────────────────────────────────────────────────────────
printf '⚙  Building app...\n'
npm run build --silent

# ── start server ─────────────────────────────────────────────────────────────
PORT=18080
ORIGIN="http://localhost:${PORT}"

python3 server.py &
SERVER_PID=$!
trap 'kill "${SERVER_PID}" 2>/dev/null; wait "${SERVER_PID}" 2>/dev/null || true' EXIT

# wait for server to be ready
for i in $(seq 1 20); do
    curl -sf "${ORIGIN}/" -o /dev/null 2>/dev/null && break
    sleep 0.3
done

# ── helper ───────────────────────────────────────────────────────────────────
assert_status() {
    local desc="$1" expected="$2" url="$3"
    shift 3
    local actual
    actual="$(curl -s -o /dev/null -w '%{http_code}' "$@" "${url}")"
    if [[ "${actual}" == "${expected}" ]]; then
        pass "${desc} → ${actual}"
    else
        fail "${desc}: expected ${expected}, got ${actual}"
    fi
}

assert_not_status() {
    local desc="$1" forbidden="$2" url="$3"
    shift 3
    local actual
    actual="$(curl -s -o /dev/null -w '%{http_code}' "$@" "${url}")"
    if [[ "${actual}" != "${forbidden}" ]]; then
        pass "${desc} → ${actual} (not ${forbidden})"
    else
        fail "${desc}: got forbidden status ${forbidden}"
    fi
}

# ── server tests ──────────────────────────────────────────────────────────────
printf '\n▪ Local server tests\n'

assert_status \
    '/api without Referer → 403' \
    '403' \
    "${ORIGIN}/api/user-plant"

assert_status \
    '/api with correct Referer → 200' \
    '200' \
    "${ORIGIN}/api/user-plant" \
    -H "Referer: ${ORIGIN}/"

assert_status \
    '/img-proxy without Referer → 403' \
    '403' \
    "${ORIGIN}/img-proxy/test"

assert_not_status \
    '/img-proxy with correct Referer → forwarded (not 403)' \
    '403' \
    "${ORIGIN}/img-proxy/test" \
    -H "Referer: ${ORIGIN}/"

kill "${SERVER_PID}"
wait "${SERVER_PID}" 2>/dev/null || true
trap - EXIT

# ── container runtime detection ───────────────────────────────────────────────
if docker info &>/dev/null 2>&1; then
    RUNTIME=docker
elif podman info &>/dev/null 2>&1; then
    RUNTIME=podman
else
    printf '\nℹ  Neither docker nor podman available — skipping container tests\n'
    printf '✔ All local tests passed\n'
    exit 0
fi

# ── container tests ───────────────────────────────────────────────────────────
printf '\n▪ Container tests (%s)\n' "${RUNTIME}"
IMAGE="fyta-dashboard-test-$$"
CONT="fyta-test-$$"
CPORT=18081
CORIGIN="http://localhost:${CPORT}"

"${RUNTIME}" build -t "${IMAGE}" . -q

"${RUNTIME}" run --rm --name "${CONT}" \
    -p "${CPORT}:8080" \
    --env-file "$(dirname "$0")/../.env.local" \
    -d "${IMAGE}"
trap '"${RUNTIME}" rm -f "${CONT}" 2>/dev/null; "${RUNTIME}" rmi "${IMAGE}" 2>/dev/null || true' EXIT

for i in $(seq 1 30); do
    curl -sf "${CORIGIN}/" -o /dev/null 2>/dev/null && break
    sleep 0.5
done

assert_status \
    '[container] /api without Referer → 403' \
    '403' \
    "${CORIGIN}/api/user-plant"

assert_status \
    '[container] /api with correct Referer → 200' \
    '200' \
    "${CORIGIN}/api/user-plant" \
    -H "Referer: ${CORIGIN}/"

assert_status \
    '[container] /img-proxy without Referer → 403' \
    '403' \
    "${CORIGIN}/img-proxy/test"

assert_not_status \
    '[container] /img-proxy with correct Referer → forwarded (not 403)' \
    '403' \
    "${CORIGIN}/img-proxy/test" \
    -H "Referer: ${CORIGIN}/"

printf '\n%s✔ All tests passed%s\n' "${GREEN}" "${RESET}"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/integration-test.sh
```

- [ ] **Step 3: Run — verify it fails (Referer guard not yet implemented)**

```bash
./scripts/integration-test.sh 2>&1 | head -20
```

Expected: `ϟ /api without Referer → 403: expected 403, got <some other code>`

- [ ] **Step 4: Commit the failing test**

```bash
git add scripts/integration-test.sh
git commit -m "test: add integration-test.sh (red — Referer guard not yet implemented)"
```

---

### Task 2: Harden `server.py` — Referer guard, auth injection, CORS

**Files:**
- Modify: `server.py`

- [ ] **Step 1: Replace `server.py` with hardened version**

```python
#!/usr/bin/env python3
"""
FYTA Dashboard server — serves dist/ and proxies:
  /api/*       → https://web.fyta.de/api/*        (JSON, auth from FYTA_API_TOKEN)
  /img-proxy/* → https://api.prod.fyta-app.de/*   (images, auth from FYTA_API_TOKEN)
Usage: FYTA_API_TOKEN=<token> python3 server.py
"""
import http.server
import os
import urllib.request
import urllib.error

PORT         = 8080
UPSTREAM     = "https://web.fyta.de"
IMG_UPSTREAM = "https://api.prod.fyta-app.de"
DIST_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
ORIGIN       = f"http://localhost:{PORT}"
TOKEN        = os.environ.get('FYTA_API_TOKEN', '')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def _check_referer(self):
        if not self.headers.get('Referer', '').startswith(ORIGIN):
            self.send_error(403, 'Forbidden')
            return False
        return True

    def do_OPTIONS(self):
        if self.path.startswith('/api/'):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', ORIGIN)
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Accept')
            self.end_headers()
        else:
            super().do_OPTIONS()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy_api()
        elif self.path.startswith('/img-proxy/'):
            self._proxy_img()
        else:
            super().do_GET()

    def _proxy_api(self):
        if not self._check_referer():
            return
        req = urllib.request.Request(UPSTREAM + self.path, headers={
            'Authorization': f'Bearer {TOKEN}',
            'Accept': 'application/json',
        })
        try:
            with urllib.request.urlopen(req) as resp:
                body = resp.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', ORIGIN)
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.HTTPError as e:
            self.send_error(e.code, e.reason)

    def _proxy_img(self):
        if not self._check_referer():
            return
        url = IMG_UPSTREAM + self.path[len('/img-proxy'):]
        req = urllib.request.Request(url, headers={
            'Authorization': f'Bearer {TOKEN}',
            'Accept': 'image/*,*/*',
        })
        try:
            with urllib.request.urlopen(req) as resp:
                body         = resp.read()
                content_type = resp.headers.get('Content-Type', 'image/jpeg')
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Cache-Control', 'public, max-age=3600')
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.HTTPError as e:
            self.send_error(e.code, e.reason)

    def log_message(self, fmt, *args):
        pass  # silence access log


if __name__ == '__main__':
    if not os.path.isdir(DIST_DIR):
        print(f"ERROR: dist/ not found — run 'npm run build' first")
        raise SystemExit(1)
    with http.server.HTTPServer(('', PORT), Handler) as srv:
        print(f"FYTA Dashboard → http://localhost:{PORT}")
        srv.serve_forever()
```

- [ ] **Step 2: Run the local portion of the integration tests (green)**

```bash
./scripts/integration-test.sh 2>&1
```

Expected: all four `✔` lines for local server tests. Container tests follow automatically.

- [ ] **Step 3: Commit**

```bash
git add server.py
git commit -m "feat: inject FYTA_API_TOKEN server-side for /api, add Referer guard, tighten CORS"
```

---

### Task 3: Update `vite.config.js` — token rename and auth injection for `/api`

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Replace `vite.config.js`**

```js
// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          target: 'https://web.fyta.de',
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.FYTA_API_TOKEN}`)
            })
          },
        },
        '/img-proxy': {
          target: 'https://api.prod.fyta-app.de',
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(/^\/img-proxy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.FYTA_API_TOKEN}`)
            })
          },
        },
      },
    },
  }
})
```

- [ ] **Step 2: Verify no `VITE_API_TOKEN` remains in vite.config.js**

```bash
grep 'VITE_API_TOKEN' vite.config.js && echo "FOUND — fix it" || echo "clean"
```

Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add vite.config.js
git commit -m "feat: vite dev proxy injects FYTA_API_TOKEN for both /api and /img-proxy"
```

---

### Task 4: Remove token usage from Vue app

**Files:**
- Modify: `src/composables/usePlants.js`
- Modify: `src/App.vue`

- [ ] **Step 1: Update `src/composables/usePlants.js` — remove Authorization header**

Replace the `useFetch` call's options object:

```js
  const { data, isFetching, error, execute } = useFetch(
    '/api/user-plant',
    {
      headers: {
        Accept: 'application/json',
      },
    }
  ).json()
```

- [ ] **Step 2: Update `src/App.vue` — remove token gate**

Remove these lines from `<script setup>`:

```js
const apiToken = import.meta.env.VITE_API_TOKEN
```

Remove this entire block from `<template>` (the "Config missing" div, lines 3–18):

```html
  <!-- Config missing -->
  <div v-if="!apiToken" class="min-h-screen flex items-center justify-center p-6 bg-base-100">
    <div class="card bg-base-200 shadow-xl w-full max-w-lg">
      <div class="card-body gap-4">
        <span class="text-5xl select-none">🌿</span>
        <h1 class="card-title text-xl">Einrichtung erforderlich</h1>
        <div role="alert" class="alert alert-warning text-sm">
          <span>
            Erstelle eine <code class="font-mono">.env.local</code> Datei mit:<br />
            <code class="font-mono">VITE_API_TOKEN=your-token-here</code><br />
            Token erhalten unter <strong>web.fyta.de → API Token</strong>
          </span>
        </div>
      </div>
    </div>
  </div>
```

Also change the outer dashboard wrapper from `v-else` to remove the conditional entirely:

```html
  <!-- Dashboard -->
  <div class="flex flex-col h-screen overflow-hidden bg-base-100">
```

- [ ] **Step 3: Verify no `VITE_API_TOKEN` or `import.meta.env` remain in src/**

```bash
grep -r 'VITE_API_TOKEN\|import\.meta\.env' src/ && echo "FOUND — fix it" || echo "clean"
```

Expected: `clean`

- [ ] **Step 4: Commit**

```bash
git add src/composables/usePlants.js src/App.vue
git commit -m "feat: remove VITE_API_TOKEN from Vue app — proxy handles auth"
```

---

### Task 5: Update `config.example.js`

**Files:**
- Modify: `config.example.js`

- [ ] **Step 1: Replace the file content**

```js
// config.example.js
// FYTA Dashboard — Configuration
// ────────────────────────────────────────────────
// Create a .env.local file in the project root with:
//
//   FYTA_API_TOKEN=your-token-here
//
// Get your token at: https://web.fyta.de → "API Token" tab
//
// ⚠️  .env.local is listed in .gitignore — never commit it.
```

- [ ] **Step 2: Commit**

```bash
git add config.example.js
git commit -m "docs: update config.example.js — FYTA_API_TOKEN replaces VITE_API_TOKEN"
```

---

### Task 6: Update historical docs and README

**Files:**
- Modify: `docs/superpowers/specs/2026-04-11-viewport-fill-vue-rewrite-design.md`
- Modify: `docs/superpowers/plans/2026-04-11-viewport-fill-vue-rewrite.md`
- Modify: `README.md`

- [ ] **Step 1: Add a superseded notice at the top of the old spec**

In `docs/superpowers/specs/2026-04-11-viewport-fill-vue-rewrite-design.md`, insert after the `**Status:** Approved` line:

```markdown
> **Note (2026-04-18):** Token configuration has changed. `VITE_API_TOKEN` references below are superseded by `FYTA_API_TOKEN`. See `docs/superpowers/specs/2026-04-18-token-consolidation-design.md`.
```

- [ ] **Step 2: Add the same notice to the old plan**

In `docs/superpowers/plans/2026-04-11-viewport-fill-vue-rewrite.md`, insert the same note after the header block (first `---`):

```markdown
> **Note (2026-04-18):** Token configuration has changed. `VITE_API_TOKEN` references in this plan are superseded by `FYTA_API_TOKEN`. See `docs/superpowers/specs/2026-04-18-token-consolidation-design.md`.
```

- [ ] **Step 3: Check README for any remaining VITE_API_TOKEN references**

```bash
grep 'VITE_API_TOKEN' README.md && echo "FOUND — fix it" || echo "clean"
```

If any found, replace them with `FYTA_API_TOKEN`.

- [ ] **Step 4: Verify no VITE_API_TOKEN remains outside of historical/archived docs**

```bash
grep -r 'VITE_API_TOKEN' \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  --exclude='2026-04-11-*.md' \
  . && echo "FOUND — fix it" || echo "clean"
```

Expected: `clean`

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-11-viewport-fill-vue-rewrite-design.md \
        docs/superpowers/plans/2026-04-11-viewport-fill-vue-rewrite.md \
        README.md
git commit -m "docs: mark VITE_API_TOKEN references as superseded, clean up README"
```

---

### Task 7: Run full integration tests (green)

- [ ] **Step 1: Run the complete integration test suite**

```bash
./scripts/integration-test.sh
```

Expected output (all lines present, no `ϟ`):

```
⚙  Building app...

▪ Local server tests
✔ /api without Referer → 403
✔ /api with correct Referer → 200
✔ /img-proxy without Referer → 403
✔ /img-proxy with correct Referer → forwarded (not 403)

▪ Container tests (docker)          ← or podman, or skipped
✔ [container] /api without Referer → 403
✔ [container] /api with correct Referer → 200
✔ [container] /img-proxy without Referer → 403
✔ [container] /img-proxy with correct Referer → forwarded (not 403)

✔ All tests passed
```

- [ ] **Step 2: Commit test run confirmation**

```bash
git add scripts/integration-test.sh
git commit -m "test: integration tests green — token consolidation complete"
```

---

## Self-review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `FYTA_API_TOKEN` single public env var | Tasks 2, 3, 4, 5 |
| Token never in browser bundle | Task 4 (removed from usePlants.js, App.vue) |
| Vite dev proxy injects auth for both `/api` and `/img-proxy` | Task 3 |
| `server.py` injects auth for `/api` | Task 2 |
| Referer guard on both proxy handlers | Task 2 |
| CORS tightened from `*` to own origin | Task 2 |
| Integration test script created and run | Tasks 1, 7 |
| Docker + podman fallback in test | Task 1 |
| `README.md` references `docker` only (no podman) | Task 6 (check only) |
| Historical docs updated | Task 6 |
| `config.example.js` updated | Task 5 |

All requirements covered. No placeholders. No TODOs. No type mismatches across tasks.
