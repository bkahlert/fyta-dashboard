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
        host = self.headers.get('Host', f'localhost:{PORT}')
        # Derive scheme from Referer so this works behind an HTTPS reverse proxy
        referer = self.headers.get('Referer', '')
        scheme = 'https' if referer.startswith('https://') else 'http'
        return f"{scheme}://{host}"

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
            self.send_error(405)

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
