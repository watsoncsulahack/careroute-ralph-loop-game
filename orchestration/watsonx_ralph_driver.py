#!/usr/bin/env python3
import json, os, subprocess, time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "docs" / "orchestrate-rounds"
OUT.mkdir(parents=True, exist_ok=True)

INSTANCE = "ad2f4e95-4076-49f9-ab86-0929b99fd23b"
AGENT = "0276ca66-db60-4d86-a2ee-292bb6470d3e"
BASE = f"https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/{INSTANCE}/v1/orchestrate/runs"
MAX_ITERS = int(os.getenv("RALPH_ITERS", "3"))

api_key = os.getenv("IBM_CLOUD_API_KEY", "")
if not api_key:
    raise SystemExit("IBM_CLOUD_API_KEY is required")

def curl(args):
    return subprocess.check_output(["curl", "-sS", *args], text=True)

tok = json.loads(curl([
    "-X", "POST", "https://iam.cloud.ibm.com/identity/token",
    "-H", "Content-Type: application/x-www-form-urlencoded",
    "--data-urlencode", "grant_type=urn:ibm:params:oauth:grant-type:apikey",
    "--data-urlencode", f"apikey={api_key}",
])).get("access_token", "")

if not tok:
    raise SystemExit("Failed to mint IAM token")

context = (REPO / "orchestration" / "context" / "telegram-intent-history.md").read_text()
for i in range(1, MAX_ITERS + 1):
    prompt = f"""
You are a ChatDev-style multi-agent team.
Goal now: build MVP for CareRoute Ambulance Rescue game.
Game concept:
- map-based ambulance driving game
- start with time + money draining continuously
- pick up patients quickly
- deliver to nearest hospital
- faster deliveries preserve/add time and money
- game ends when time or money runs out
- rank players by total survival time
- style vibe: retro pixel-art, cozy readable sprites (harvest-moon-like inspiration)

Context from user history:
{context}

Return:
1) one highest-impact next improvement,
2) exact patch steps,
3) acceptance checks,
4) atomic commit message.
""".strip()

    body = {"message": {"role": "user", "content": prompt}, "agent_id": AGENT}
    run = json.loads(curl([
        "-X", "POST", BASE,
        "-H", f"Authorization: Bearer {tok}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(body)
    ]))
    run_id = run.get("run_id")
    if not run_id:
        raise SystemExit(f"No run_id returned: {run}")

    res = {}
    for _ in range(60):
        res = json.loads(curl(["-H", f"Authorization: Bearer {tok}", f"{BASE}/{run_id}"]))
        if res.get("status") in ("completed", "failed", "cancelled"):
            break
        time.sleep(2)

    text = (((((res.get("result") or {}).get("data") or {}).get("message") or {}).get("content") or [{}])[0]).get("text", "")
    (OUT / f"WATSONX-ROUND-{i+1:02d}.md").write_text(
        f"# watsonx RALPH Round {i+1}\n\n- run_id: {run_id}\n- status: {res.get('status')}\n\n{text}\n"
    )
    print(f"round {i+1}: {res.get('status')} -> WATSONX-ROUND-{i+1:02d}.md")
