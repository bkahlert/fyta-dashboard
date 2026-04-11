#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# FYTA API Probe — runs on your Mac to find the working auth
# Usage:  chmod +x probe-api.sh && ./probe-api.sh
# ─────────────────────────────────────────────────────────────

TOKEN="FYTA_API_TOKEN_REDACTED"

# Colour helpers
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

bar() { printf '%s\n' "───────────────────────────────────────────────────────────"; }
title() { echo; bar; printf "${BOLD}${CYAN}  %s${RESET}\n" "$1"; bar; }
result() {
  local code=$1 body=$2
  if   [[ "$code" == 2* ]]; then printf "${GREEN}✅  HTTP $code${RESET}\n"
  elif [[ "$code" == 4* ]]; then printf "${RED}❌  HTTP $code${RESET}\n"
  else                            printf "${YELLOW}⚠️   HTTP $code${RESET}\n"
  fi
  echo "$body" | head -c 800 | python3 -m json.tool 2>/dev/null || echo "$body" | head -c 400
  echo
}

call() {
  local label=$1; shift
  printf "${BOLD}▶ %s${RESET}\n" "$label"
  local resp code body
  resp=$(curl -s -w "\n__STATUS__%{http_code}" --max-time 10 "$@")
  code="${resp##*__STATUS__}"
  body="${resp%$'\n'__STATUS__*}"
  result "$code" "$body"
}

# ─────────────────────────────────────────────────────────────
title "1 · Static token as Bearer → /api/user-plant"
call "GET /api/user-plant  Auth: Bearer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  "https://web.fyta.de/api/user-plant"

# ─────────────────────────────────────────────────────────────
title "2 · Static token as Token → /api/user-plant"
call "GET /api/user-plant  Auth: Token" \
  -H "Authorization: Token $TOKEN" \
  -H "Accept: application/json" \
  "https://web.fyta.de/api/user-plant"

# ─────────────────────────────────────────────────────────────
title "3 · Static token via X-API-Key → /api/user-plant"
call "GET /api/user-plant  X-API-Key" \
  -H "X-API-Key: $TOKEN" \
  -H "Accept: application/json" \
  "https://web.fyta.de/api/user-plant"

# ─────────────────────────────────────────────────────────────
title "4 · Try alternate base URL: app.fyta.de"
call "GET https://app.fyta.de/api/user-plant  Bearer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  "https://app.fyta.de/api/user-plant"

# ─────────────────────────────────────────────────────────────
title "5 · Try /api/v1/user-plant"
call "GET /api/v1/user-plant  Bearer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  "https://web.fyta.de/api/v1/user-plant"

# ─────────────────────────────────────────────────────────────
title "6 · Probe login endpoint (no creds — just to see response shape)"
call "POST /api/auth/login  empty body" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}' \
  "https://web.fyta.de/api/auth/login"

# ─────────────────────────────────────────────────────────────
title "7 · Try token as form field in login POST"
call "POST /api/auth/login  token as password" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"email\":\"mail@bkahlert.com\",\"password\":\"$TOKEN\"}" \
  "https://web.fyta.de/api/auth/login"

# ─────────────────────────────────────────────────────────────
title "8 · Check what /api/ root returns"
call "GET /api/  Bearer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  "https://web.fyta.de/api/"

# ─────────────────────────────────────────────────────────────
title "9 · No auth at all — baseline /api/user-plant"
call "GET /api/user-plant  (no auth)" \
  -H "Accept: application/json" \
  "https://web.fyta.de/api/user-plant"

# ─────────────────────────────────────────────────────────────
title "10 · Check response headers on the 403 (for clues)"
echo "Full response headers from Bearer attempt:"
curl -s -D - -o /dev/null \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  "https://web.fyta.de/api/user-plant"

bar
echo
printf "${BOLD}Done. Paste the output above back to Claude.${RESET}\n"
echo
