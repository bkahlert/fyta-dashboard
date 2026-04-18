# Dynamic-Origin Referer Guard Design

**Date:** 2026-04-19
**Status:** Approved

## Problem

`server.py` hardcodes `ORIGIN = f"http://localhost:{PORT}"`. The Referer guard and CORS headers use this constant, so any request from a browser that loaded the page via a different hostname (e.g. `http://paul.local:8080`, `http://192.168.1.5:8080`) is rejected with 403.

The fix must work for any deployment target without configuration.

## Security context

This is an **interim** solution. The Referer guard prevents browser-based cross-origin relay abuse (a third-party website making requests through your proxy). It does **not** stop a determined attacker with network access who can craft arbitrary HTTP headers. Authentication (e.g. HTTP Basic Auth) is planned as a separate future hardening step for public deployments.

## Solution: derive origin from `Host` request header

Every HTTP/1.1 request includes a `Host` header containing exactly the hostname and port the browser used to connect. The server derives the expected origin per-request from that header:

```python
def _origin(self):
    return f"http://{self.headers.get('Host', f'localhost:{PORT}')}"
```

The Referer check becomes:

```python
def _check_referer(self):
    if not self.headers.get('Referer', '').startswith(self._origin()):
        self.send_error(403, 'Forbidden')
        return False
    return True
```

Every `Access-Control-Allow-Origin` response header uses `self._origin()` instead of the old constant — three callsites: `do_OPTIONS`, `_proxy_api`, `_proxy_img`.

The module-level `ORIGIN` constant is removed entirely.

## Why Host works

When a browser loads the page from `http://paul.local:8080` and then makes a fetch to `/api/user-plant`, it sends:
- `Host: paul.local:8080` (where it connected)
- `Referer: http://paul.local:8080/` (where the page came from)

Both agree. The check passes. A cross-origin request from `http://evil.com` sends `Host: paul.local:8080` but `Referer: http://evil.com/` — mismatch → 403.

## Integration test impact

None. Tests send requests to `localhost:8080`, so curl automatically sends `Host: localhost:8080`. The server derives `http://localhost:8080` and the test's `Referer: http://localhost:8080/` matches. No changes to `scripts/integration-test.sh`.

## File changes

| File | Change |
|---|---|
| `server.py` | Remove `ORIGIN` constant; add `_origin()` helper; update `_check_referer` and all three `Access-Control-Allow-Origin` callsites |

## Deployment note

For public deployments, the Referer guard is a lightweight protection only. Until authentication is added, treat the URL as a shared secret and restrict network access where possible.
