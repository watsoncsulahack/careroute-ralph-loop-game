#!/usr/bin/env bash
set -euo pipefail
: "${IBM_WATSON_ORCHESTRATE_TOKEN:?set token}"
INSTANCE_ID="ad2f4e95-4076-49f9-ab86-0929b99fd23b"
AGENT_ID="0276ca66-db60-4d86-a2ee-292bb6470d3e"
BASE="https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/${INSTANCE_ID}/v1/orchestrate/runs"
PROMPT_FILE="${1:-docs/GAME-ORCHESTRATE-PROMPT.md}"
PAYLOAD=$(python3 - <<PY
import json
from pathlib import Path
prompt=Path('${PROMPT_FILE}').read_text()
print(json.dumps({"message":{"role":"user","content":prompt},"agent_id":"${AGENT_ID}"}))
PY
)
curl -sS -X POST "$BASE" -H "Authorization: Bearer ${IBM_WATSON_ORCHESTRATE_TOKEN}" -H 'Content-Type: application/json' -d "$PAYLOAD"
