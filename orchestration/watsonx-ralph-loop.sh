#!/usr/bin/env bash
set -euo pipefail

# Requires IBM Cloud API key (not short-lived access token)
: "${IBM_CLOUD_API_KEY:?Set IBM_CLOUD_API_KEY in environment}"
INSTANCE_ID="ad2f4e95-4076-49f9-ab86-0929b99fd23b"
AGENT_ID="0276ca66-db60-4d86-a2ee-292bb6470d3e"
MAX_ITERS="${1:-5}"
BASE="https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/${INSTANCE_ID}/v1/orchestrate/runs"

TOKEN=$(curl -sS -X POST 'https://iam.cloud.ibm.com/identity/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=urn:ibm:params:oauth:grant-type:apikey' \
  --data-urlencode "apikey=${IBM_CLOUD_API_KEY}" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("access_token",""))')

[ -n "$TOKEN" ] || { echo "Failed to mint IAM access token"; exit 1; }
mkdir -p docs/orchestrate-rounds

for i in $(seq 1 "$MAX_ITERS"); do
  echo "== watsonx RALPH iteration $i =="
  PROMPT="$(cat <<'EOF'
You are a ChatDev-style multi-agent software team building a browser-playable CareRoute game.
Read and honor project context:
- orchestration/context/PRD-smart-emergency-routing-platform.md
- orchestration/context/FLOWMAP-smart-emergency-routing.md
- orchestration/context/telegram-intent-history.md

For this iteration:
1) Propose one highest-impact improvement for the current web game.
2) Provide exact patch instructions (files + changes).
3) Provide acceptance checks.
4) Provide commit message.
EOF
)"

  BODY=$(PROMPT="$PROMPT" AGENT_ID="$AGENT_ID" python3 -c 'import json,os; print(json.dumps({"message":{"role":"user","content":os.environ["PROMPT"]},"agent_id":os.environ["AGENT_ID"]}))' )
  RUN=$(curl -sS --max-time 60 -X POST "$BASE" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$BODY")
  RUN_ID=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("run_id",""))' <<<"$RUN")
  [ -n "$RUN_ID" ] || { echo "No run_id returned: $RUN"; exit 1; }

  RESP=''
  for _ in $(seq 1 45); do
    RESP=$(curl -sS --max-time 30 -H "Authorization: Bearer $TOKEN" "$BASE/$RUN_ID")
    ST=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",""))' <<<"$RESP")
    [ "$ST" = "completed" ] && break
    [ "$ST" = "failed" ] && break
    sleep 2
  done

  python3 - <<PY
import json
from pathlib import Path
resp=json.loads('''$RESP''')
text=(((((resp.get('result') or {}).get('data') or {}).get('message') or {}).get('content') or [{}])[0]).get('text','')
Path(f'docs/orchestrate-rounds/WATSONX-ROUND-{i:02d}.md').write_text(f"# watsonx RALPH Round {i}\n\n- run_id: $RUN_ID\n- status: {resp.get('status')}\n\n{text}\n")
print('wrote round',i)
PY

done

echo "Done. See docs/orchestrate-rounds/WATSONX-ROUND-*.md"
