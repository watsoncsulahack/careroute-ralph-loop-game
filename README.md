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
- Run starts with zero obstacles.
- Obstacles spawn over time.
- Each obstacle disappears after ~15 seconds.

## Build strategy
- Rapid Kotlin Android prototype first
- AI-assisted content + scenario generation
- Optional Unity/Godot migration later
