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
npm run build

# ── start server ─────────────────────────────────────────────────────────────
PORT=8080  # must match server.py's hard-coded port; ensure port is free before running
ORIGIN="http://localhost:${PORT}"

python3 server.py &
SERVER_PID=$!
trap 'kill "${SERVER_PID}" 2>/dev/null; wait "${SERVER_PID}" 2>/dev/null || true' EXIT

# wait for server to be ready
for i in $(seq 1 20); do
    curl -sf "${ORIGIN}/" -o /dev/null 2>/dev/null && break
    sleep 0.3
done
if ! curl -sf "${ORIGIN}/" -o /dev/null 2>/dev/null; then
    fail "server did not start on ${ORIGIN} after 6 seconds"
fi

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

# Fetch a real plant thumb path via the API proxy so the img-proxy test uses a
# valid upstream URL (arbitrary paths like /test always return 403 from upstream).
IMG_PATH="$(curl -s -H "Referer: ${ORIGIN}/" "${ORIGIN}/api/user-plant" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); plants=d.get('plants',[]); print(plants[0].get('thumb_path','').replace('https://api.prod.fyta-app.de','')) if plants else sys.exit(1)" 2>/dev/null)" \
    || IMG_PATH="/test"

assert_not_status \
    '/img-proxy with correct Referer → forwarded (not 403)' \
    '403' \
    "${ORIGIN}/img-proxy${IMG_PATH}" \
    -H "Referer: ${ORIGIN}/"

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
CPORT=8080
CORIGIN="http://localhost:${CPORT}"

"${RUNTIME}" build -t "${IMAGE}" . -q
trap '"${RUNTIME}" rmi -f "${IMAGE}" 2>/dev/null || true' EXIT

"${RUNTIME}" run --rm --name "${CONT}" \
    -p "${CPORT}:8080" \
    --env-file "$(dirname "$0")/../.env.local" \
    -d "${IMAGE}"
trap '"${RUNTIME}" rm -f "${CONT}" 2>/dev/null; "${RUNTIME}" rmi -f "${IMAGE}" 2>/dev/null || true' EXIT

for i in $(seq 1 30); do
    curl -sf "${CORIGIN}/" -o /dev/null 2>/dev/null && break
    sleep 0.5
done
if ! curl -sf "${CORIGIN}/" -o /dev/null 2>/dev/null; then
    fail "container did not start on ${CORIGIN} after 15 seconds"
fi

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

CIMG_PATH="$(curl -s -H "Referer: ${CORIGIN}/" "${CORIGIN}/api/user-plant" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); plants=d.get('plants',[]); print(plants[0].get('thumb_path','').replace('https://api.prod.fyta-app.de','')) if plants else sys.exit(1)" 2>/dev/null)" \
    || CIMG_PATH="/test"

assert_not_status \
    '[container] /img-proxy with correct Referer → forwarded (not 403)' \
    '403' \
    "${CORIGIN}/img-proxy${CIMG_PATH}" \
    -H "Referer: ${CORIGIN}/"

printf '\n%s✔ All tests passed%s\n' "${GREEN}" "${RESET}"
