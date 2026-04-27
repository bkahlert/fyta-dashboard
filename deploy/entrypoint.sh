#!/usr/bin/env bash
# Validates FYTA_API_TOKEN and launches the dashboard server.

set -euo pipefail

if [[ -z "${FYTA_API_TOKEN:-}" ]]; then
    printf '\033[1;31mϟ\033[0m FYTA_API_TOKEN is required but not set\n' >&2
    exit 1
fi

DIST="$(dirname "$0")/dist"
printf '{"autoReloadInterval":%s}\n' "${AUTO_RELOAD_INTERVAL:-60000}" > "$DIST/config.json"

exec python3 "$(dirname "$0")/server.py"
