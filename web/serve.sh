#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-8102}"
python3 -m http.server "$PORT"
