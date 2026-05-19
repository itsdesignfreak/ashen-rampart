# Ashen Rampart — Product Requirements Document

## Overview
Web-based tower defense game. Medieval village theme. Top-down 2D. Desktop-first.

## Tech Stack
- React 18 + TypeScript 5
- Vite 5
- Tailwind CSS 4
- HTML5 Canvas 2D (no game engine)
- Vercel for deployment

## Core Gameplay Loop
1. Player starts with gold and a blank map
2. Player places towers on valid tiles before the wave begins
3. Player clicks "Start Wave" — enemies walk a fixed path toward the village
4. Towers auto-attack enemies in range
5. Enemies that reach the end remove lives
6. Killing enemies rewards gold
7. Waves increase in difficulty; player spends gold between waves

## Map
- Grid-based, top-down 2D
- 20 × 12 tiles, 64px per tile
- Tile types: grass (buildable), path (not buildable), water (not buildable)
- One fixed enemy path per level (defined in level data)
- Village/base tile at path end

## Towers
| Tower        | Cost | Range | Fire Rate | Damage | Notes                  |
|--------------|------|-------|-----------|--------|------------------------|
| Arrow Tower  | 50g  | 3     | 1/s       | 20     | Single target          |
| Cannon Tower | 100g | 2     | 0.4/s     | 80     | Splash damage, 1 tile r|

- Towers may only be placed on grass tiles
- Towers cannot be sold in V1
- Towers attack the enemy closest to the path end (furthest along)

## Enemies
| Enemy   | HP  | Speed        | Reward | Notes              |
|---------|-----|--------------|--------|--------------------|
| Peasant | 100 | 1 tile/s     | 10g    | Basic unit         |
| Knight  | 300 | 0.7 tile/s   | 25g    | Armored, slow      |
| Scout   | 80  | 1.8 tile/s   | 15g    | Fast, low HP       |

- Enemies follow the fixed path tile-by-tile
- Enemies that reach the end lose the player 1 life and despawn

## Economy
- Starting gold: 200
- Lives: 20
- Gold per kill: defined per enemy type (see Enemies table)
- No income per second in V1

## Waves (V1 — first 3 waves)
| Wave | Enemies                          | Spawn interval |
|------|----------------------------------|----------------|
| 1    | 10 × Peasant                     | 800ms          |
| 2    | 8 × Peasant + 3 × Knight         | 800ms          |
| 3    | 6 × Peasant + 4 × Scout + 2 × Knight | 600ms     |

- 5-second break between waves
- Game over when lives reach 0
- Victory screen after wave 3 (V1 scope)

## UI (React layer — never on canvas)
- Top bar: gold, lives, current wave number
- Right sidebar: tower selection buttons
- Tower button disabled if player cannot afford it
- "Start Wave" button — disabled during active wave
- Game Over overlay
- Victory overlay

## Sprites (all awaiting owner delivery)
### Tiles
- `grass.png` — 64×64, buildable ground
- `path_h.png` — horizontal path segment
- `path_v.png` — vertical path segment
- `path_corner_ne.png`, `path_corner_nw.png`, `path_corner_se.png`, `path_corner_sw.png`
- `water.png` — non-buildable decorative

### Towers
- `tower_arrow.png` — 64×64 base sprite
- `tower_arrow_head.png` — 32×32 rotating turret
- `tower_cannon.png` — 64×64 base sprite
- `tower_cannon_head.png` — 32×32 rotating turret

### Enemies
- `enemy_peasant.png` — 32×32 spritesheet (4 walk frames × 4 directions)
- `enemy_knight.png` — 32×32 spritesheet
- `enemy_scout.png` — 32×32 spritesheet

### Projectiles
- `arrow.png` — 16×4
- `cannonball.png` — 12×12

### UI
- `coin.png` — 16×16 gold icon
- `heart.png` — 16×16 life icon
- `button_start.png` — optional, can be CSS

## Out of scope for V1
- Mobile / touch support
- Tower upgrades
- Multiple levels
- Sound / music
- Leaderboard / save state
- Tower sell mechanic
- Enemy special abilities

## Definition of done (V1)
- [ ] Map renders with placeholder tiles
- [ ] Towers can be placed on grass tiles via click
- [ ] Enemies spawn and walk the path
- [ ] Towers detect and attack enemies in range
- [ ] Gold and lives update correctly
- [ ] Wave 1–3 play to victory or game over
- [ ] All sprite slots show "AWAITING ASSET" placeholder when image missing
- [ ] Deploys to Vercel with no console errors
