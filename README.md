# Breakout // GitHub Activity

A browser-based Breakout clone styled with a GitHub dark theme and contribution-grid inspired colors.

## Overview

This project keeps the classic brick-breaker gameplay but updates the visuals to match a clean GitHub-style aesthetic. The canvas, HUD, overlays, and brick palette now use dark-mode UI tones with green activity-square inspired gradients instead of the earlier neon terminal look.

## Game features

- Classic paddle-and-ball gameplay
- Multiple level layouts with varied brick patterns
- Increasing difficulty as you advance through levels
- Power-ups dropped from bricks: wide paddle, slow ball, and extra life
- Keyboard and mouse paddle controls
- Pause/resume support via the `P` key
- Score, lives, current level, and active power-up HUD
- Restartable game-over overlay
- GitHub dark theme with contribution-grid-inspired brick colors

## Controls

- `Arrow Left` / `Arrow Right` — move paddle
- Mouse movement — move paddle
- `Space` — launch the ball
- `P` — pause / resume

## Gameplay

The player controls a paddle at the bottom of the screen and launches a ball upward to break every brick. Each level introduces a different arrangement, and the ball becomes faster as levels progress.

Breaking bricks has a chance to drop a falling power-up. Collecting one applies the effect:

| Power-up | Effect | Duration |
|---|---|---|
| Expand | Paddle width increases | 10 seconds |
| Slow | Ball speed is reduced | 10 seconds |
| 1-UP | Extra life is granted | Instant |

Active temporary power-ups are shown in the HUD. Losing a life clears temporary effects and resets the paddle.

## Theme update

The recent visual refresh changes the game from a blue retro terminal style to a GitHub dark mode design:

- dark background and panels
- subtle gray borders and UI details
- GitHub-inspired green brick palette
- modern, minimal scoreboard styling
- cleaner overlay and button treatments

## Project files

- `index.html` — page structure, HUD, and overlay UI
- `style.css` — GitHub dark-theme visual design and layout
- `script.js` — gameplay logic, collisions, rendering, and power-ups