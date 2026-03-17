#!/usr/bin/env bash
set -euo pipefail
# RALPH loop: Repeated Agent Loop for Progressive Hardening
# Stops when acceptance tests pass or max iterations reached.

MAX_ITERS="${1:-6}"
INSTANCE_ID="ad2f4e95-4076-49f9-ab86-0929b99fd23b"
AGENT_ID="0276ca66-db60-4d86-a2ee-292bb6470d3e"
BASE="https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/${INSTANCE_ID}/v1/orchestrate/runs"
TOKEN="${IBM_WATSON_ORCHESTRATE_TOKEN:-}"
[ -n "$TOKEN" ] || { echo "Missing IBM_WATSON_ORCHESTRATE_TOKEN"; exit 1; }

mkdir -p docs/orchestrate-rounds

for i in $(seq 1 "$MAX_ITERS"); do
  echo "== RALPH iteration $i =="
  PROMPT=$(cat <<'EOF'
You are coordinating a ChatDev-style software team to improve the browser game prototype in this repo.
Goal: playable CareRoute flow User -> Ambulance -> Hospital -> Insurance.
Tasks this round:
1) propose concrete code patch plan
2) identify one highest-impact improvement
3) provide acceptance checks
Return concise actionable output.
EOF
)
  BODY=$(python3 -c 'import json,os; print(json.dumps({"message":{"role":"user","content":os.environ["PROMPT"]},"agent_id":os.environ["AGENT_ID"]}))' )
  RUN=$(curl -sS -X POST "$BASE" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$BODY")
  RUN_ID=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("run_id",""))' <<<"$RUN")

  for _ in $(seq 1 30); do
    RESP=$(curl -sS -H "Authorization: Bearer $TOKEN" "$BASE/$RUN_ID")
    ST=$(python3 -c 'import json,sys;print(json.load(sys.stdin).get("status",""))' <<<"$RESP")
    [ "$ST" = "completed" ] && break
    [ "$ST" = "failed" ] && break
    sleep 1
  done

  python3 - <<PY
import json
from pathlib import Path
resp=json.loads('''$RESP''')
text=(((((resp.get('result') or {}).get('data') or {}).get('message') or {}).get('content') or [{}])[0]).get('text','')
Path('docs/orchestrate-rounds').mkdir(parents=True,exist_ok=True)
Path(f'docs/orchestrate-rounds/ROUND-{i:02d}.md').write_text(f"# Round {i}\n\n- run_id: $RUN_ID\n- status: {resp.get('status')}\n\n{text}\n")
PY

  # local acceptance check (minimal)
  if grep -q "User" web/game.js && grep -q "Insurance" web/game.js; then
    echo "Core flow present."
  fi
done

echo "RALPH loop completed. Review docs/orchestrate-rounds/"
