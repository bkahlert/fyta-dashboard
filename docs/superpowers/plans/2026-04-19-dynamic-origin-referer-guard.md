# Dynamic-Origin Referer Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `ORIGIN` constant in `server.py` with a per-request `_origin()` helper that derives the allowed origin from the HTTP `Host` header, so the Referer guard and CORS headers work correctly for any hostname.

**Architecture:** One new method `_origin(self)` on `Handler` reads `self.headers.get('Host')` and returns `f"http://{host}"`. `_check_referer` and all three `Access-Control-Allow-Origin` callsites switch from the old module-level constant to `self._origin()`. Two new assertions are added to the integration test script (TDD red first) to explicitly verify the new hostname-agnostic behaviour.

**Tech Stack:** Python 3 (`http.server`), bash (`curl`)

---

## File map

| File                          | Change                                                               |
| ----------------------------- | -------------------------------------------------------------------- |
| `scripts/integration-test.sh` | Add 2 new assertions for custom-Host behaviour (TDD red)             |
| `server.py`                   | Remove `ORIGIN` constant; add `_origin()` helper; update 4 callsites |

---

### Task 1: Add failing tests for hostname-agnostic behaviour (TDD red)

**Files:**

- Modify: `scripts/integration-test.sh`

The existing tests all use `localhost` as both the connection target and the Referer host, so they pass even with the hardcoded constant. We need two new assertions that are only possible to satisfy with the dynamic-origin approach.

- [ ] **Step 1: Add two new assertions after the existing local server tests**

In `scripts/integration-test.sh`, after the last `assert_not_status` block for `/img-proxy` (around line 102), and before the `kill "${SERVER_PID}"` line, insert:

```bash
assert_status \
    '/api with custom Host + matching Referer → 200' \
    '200' \
    "${ORIGIN}/api/user-plant" \
    -H "Host: paul.local:${PORT}" \
    -H "Referer: http://paul.local:${PORT}/"

assert_status \
    '/api with custom Host + mismatched Referer → 403' \
    '403' \
    "${ORIGIN}/api/user-plant" \
    -H "Host: paul.local:${PORT}" \
    -H "Referer: http://evil.com/"
```

- [ ] **Step 2: Run — verify the first new assertion fails (red)**

```bash
./scripts/integration-test.sh 2>&1 | grep -A1 'custom Host'
```

Expected output:

```
ϟ /api with custom Host + matching Referer → 200: expected 200, got 403
```

The second assertion (`mismatched Referer → 403`) will pass even now because `evil.com` also doesn't match `localhost` — that's fine, it verifies the guard still rejects bad Referers after the fix.

- [ ] **Step 3: Commit**

```bash
git add scripts/integration-test.sh
git commit -m "test: add hostname-agnostic Referer guard assertions (red)"
```

---

### Task 2: Implement `_origin()` and update all callsites (green)

**Files:**

- Modify: `server.py`

- [ ] **Step 1: Write the complete updated `server.py`**

Replace the full contents of `server.py` with:

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
TOKEN        = os.environ.get('FYTA_API_TOKEN', '')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def _origin(self):
        return f"http://{self.headers.get('Host', f'localhost:{PORT}')}"

    def _check_referer(self):
        if not self.headers.get('Referer', '').startswith(self._origin()):
            self.send_error(403, 'Forbidden')
            return False
        return True

    def do_OPTIONS(self):
        if self.path.startswith('/api/'):
            if not self._check_referer():
                return
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', self._origin())
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
            self.send_header('Access-Control-Allow-Origin', self._origin())
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
            self.send_header('Access-Control-Allow-Origin', self._origin())
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
    if not TOKEN:
        print("WARNING: FYTA_API_TOKEN is not set — API requests will fail")
    with http.server.HTTPServer(('', PORT), Handler) as srv:
        print(f"FYTA Dashboard → http://localhost:{PORT}")
        srv.serve_forever()
```

Key changes vs current file:

- Line 17 (`ORIGIN = ...`) — **removed**
- New method `_origin(self)` added before `_check_referer`
- `_check_referer`: `ORIGIN` → `self._origin()`
- `do_OPTIONS`: `ORIGIN` → `self._origin()`
- `_proxy_api`: `ORIGIN` → `self._origin()`
- `_proxy_img`: `ORIGIN` → `self._origin()`

- [ ] **Step 2: Verify `ORIGIN` constant is gone**

```bash
grep 'ORIGIN' server.py
```

Expected — only method references, no constant:

```
            return f"http://{self.headers.get('Host', f'localhost:{PORT}')}"
            self.send_header('Access-Control-Allow-Origin', self._origin())
            self.send_header('Access-Control-Allow-Origin', self._origin())
            self.send_header('Access-Control-Allow-Origin', self._origin())
```

- [ ] **Step 3: Run the full integration test suite (all green)**

```bash
./scripts/integration-test.sh 2>&1
```

Expected — all tests pass including the two new ones:

```
▪ Local server tests
✔ /api without Referer → 403
✔ /api with correct Referer → 200
✔ /img-proxy without Referer → 403
✔ /img-proxy with correct Referer → forwarded (not 403)
✔ /api with custom Host + matching Referer → 200
✔ /api with custom Host + mismatched Referer → 403

▪ Container tests (docker/podman)
✔ [container] /api without Referer → 403
✔ [container] /api with correct Referer → 200
✔ [container] /img-proxy without Referer → 403
✔ [container] /img-proxy with correct Referer → forwarded (not 403)

✔ All tests passed
```

- [ ] **Step 4: Commit**

```bash
git add server.py
git commit -m "feat: derive Referer guard origin from Host header — works for any hostname"
```

---

## Self-review

**Spec coverage:**

| Spec requirement                                | Task           |
| ----------------------------------------------- | -------------- |
| Remove `ORIGIN` constant                        | Task 2         |
| Add `_origin()` helper reading `Host` header    | Task 2         |
| Update `_check_referer` to use `self._origin()` | Task 2         |
| Update `do_OPTIONS` CORS header                 | Task 2         |
| Update `_proxy_api` CORS header                 | Task 2         |
| Update `_proxy_img` CORS header                 | Task 2         |
| Integration tests still pass                    | Task 2, Step 3 |
| New behaviour tested (custom hostname accepted) | Task 1         |

All requirements covered. No placeholders. No TODOs. Method name `_origin` used consistently across both tasks.
