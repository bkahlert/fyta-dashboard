#!/usr/bin/env python3
"""
FYTA Dashboard server — serves dist/ and proxies:
  /api/*       → https://web.fyta.de/api/*        (JSON, auth from browser)
  /img-proxy/* → https://api.prod.fyta-app.de/*   (images, auth from config.js)
Usage: python3 server.py
"""
import http.server
import os
import re
import urllib.request
import urllib.error

PORT = 8080
UPSTREAM     = "https://web.fyta.de"
IMG_UPSTREAM = "https://api.prod.fyta-app.de"
DIST_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')


def _load_token():
    try:
        with open('config.js') as f:
            m = re.search(r"api_token:\s*['\"]([^'\"]+)['\"]", f.read())
            return m.group(1) if m else ''
    except FileNotFoundError:
        pass
    # Also try .env.local
    try:
        with open('.env.local') as f:
            for line in f:
                if line.startswith('VITE_API_TOKEN='):
                    return line.split('=', 1)[1].strip()
    except FileNotFoundError:
        return ''
    return ''


TOKEN = _load_token()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_OPTIONS(self):
        if self.path.startswith('/api/'):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Authorization, Accept')
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
        url  = UPSTREAM + self.path
        auth = self.headers.get('Authorization', '')
        req  = urllib.request.Request(url, headers={
            'Authorization': auth,
            'Accept': 'application/json',
        })
        try:
            with urllib.request.urlopen(req) as resp:
                body = resp.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.HTTPError as e:
            self.send_error(e.code, e.reason)

    def _proxy_img(self):
        img_path = self.path[len('/img-proxy'):]
        url = IMG_UPSTREAM + img_path
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
