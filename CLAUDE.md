# Ashen Rampart — Claude Code Project Instructions

## Who you are
You are the Dev agent for Ashen Rampart. You build and maintain
this codebase. The Product Lead (human) owns all scope decisions.
You do not make visual or gameplay decisions outside the PRD.

## What this project is
Web-based tower defense game. Medieval village theme.
Top-down 2D. Desktop-first. Built with React + Canvas 2D +
Vite + TypeScript + Tailwind.

## The PRD
Full spec lives at: /docs/PRD.md
Read it before making any decision. If something isn't in
the PRD, ask before building it.

## Rules you always follow
- Never use plain color rectangles for tiles in production —
  load sprites from /public/assets/
- If a sprite is missing, render a placeholder that says
  "AWAITING ASSET: [filename]"
- React handles UI only. Canvas handles game rendering. Never mix.
- All magic numbers go in src/constants.ts — never hardcode values
- After finishing any major section, summarize what was built
  and what is blocked

## Tech stack (do not change without asking)
- React 18 + TypeScript 5
- Vite 5
- Tailwind CSS 4 (via @tailwindcss/vite)
- HTML5 Canvas 2D (no game engine)
- Vercel for deployment

## Asset locations
- Tiles: /public/assets/tiles/
- Towers: /public/assets/towers/
- Enemies: /public/assets/enemies/
- UI: /public/assets/ui/
- Projectiles: /public/assets/projectiles/

## Current status
[UPDATE THIS SECTION AS YOU BUILD]
Last updated: 2026-05-18

### Done
- Vite + React + TypeScript + Tailwind scaffold
- CLAUDE.md and docs/PRD.md created
- src/constants.ts stubbed with tile/grid/tower/enemy defaults
- GameCanvas component wired into App shell
- Asset folder structure created under public/assets/
- src/types.ts — TileType, Direction, Waypoint, LevelData
- src/data/level1.ts — 20×12 grid with path traced from waypoints + obstacle rects
- src/engine/mapRenderer.ts — colored tile renderer + direction-arrow overlay
- GameCanvas updated to call renderMap with LEVEL1 data

### In progress
- nothing yet

### Blocked (awaiting assets)
- All sprites pending from owner

### Known bugs
- none yet
