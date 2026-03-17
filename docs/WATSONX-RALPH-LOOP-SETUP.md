# watsonx Orchestrate RALPH Loop Setup

## Goal
Use watsonx Orchestrate agent runs to iteratively improve this game using PRD + flowmap + Telegram intent context.

## Required env
- `IBM_CLOUD_API_KEY` (IAM API key, not an expired/short token)

## Run
```bash
export IBM_CLOUD_API_KEY=...
./orchestration/watsonx-ralph-loop.sh 5
```

## Outputs
- `docs/orchestrate-rounds/WATSONX-ROUND-01.md` ...

## Publish
Push to GitHub after each round (or in batches):
```bash
git add docs/orchestrate-rounds
git commit -m "docs(watsonx): add RALPH round outputs"
git push
```
