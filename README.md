# CareRoute 8-bit Android Game (Prototype)

Goal: playable touchscreen Android mini-game demonstrating CareRoute decision flow.

## Core loop
1. Intake patient condition/time pressure
2. Check insurance and hospital fit
3. Dispatch ambulance with route constraints
4. Score outcomes (time, cost, clinical fit)

## Style
- 8-bit/pixel-inspired visuals
- Top-down city-driving interaction tuned for touch + keyboard

## Live links
- Landing page: https://watsoncsulahack.github.io/careroute-landing-page/
- Game: https://watsoncsulahack.github.io/careroute-ambulance-game/
- Web prototype: https://watsoncsulahack.github.io/careroute-prototype-web/

## Difficulty behavior
- Run starts with **$1000** and zero hazards.
- Triangle obstacles: first at 5s, then every 3s; each lasts ~25s.
- Water splats: start after 15s, then every 15s; each lasts ~30s and slows momentum on hit.
- Roadblocks: start after 30s, then every 10s; each lasts ~8s and blocks passage.
- Cars: start after 45s; refresh every 15s, stay ~10s, and move at a consistent medium speed.
- Patients must be picked up within 10s and dropped off within 10s after pickup.
- Money drain is momentum-based: ~$100/s at standstill, down to ~$4/s at max momentum.

## Build strategy
- Rapid Kotlin Android prototype first
- AI-assisted content + scenario generation
- Optional Unity/Godot migration later
