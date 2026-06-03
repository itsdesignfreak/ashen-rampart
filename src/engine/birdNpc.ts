// ── Bird NPC — decorative bird that flies across the map ─────────────────────
//
// Sprite sheet (bird.png): 192×48, 4 frames at 48×48 each, 12 fps
// Birds use canvas-pixel coordinates (not grid tiles) and are drawn on top of
// everything — no Y-sorting needed.

export const BIRD_FRAME_W    = 48;
export const BIRD_FRAME_H    = 48;
export const BIRD_FPS        = 12;
export const BIRD_FRAME_COUNT = 4;
export const BIRD_DRAW_SIZE  = 56;   // same visual size as the cat
export const MAX_BIRDS       = 3;

// Wave flight parameters
export const BIRD_WAVE_AMPLITUDE = 18;   // px — max vertical deviation
export const BIRD_WAVE_SPEED     = 2.5;  // radians / sec (~0.4 cycles/sec)

// Spawn interval: 2–5 s
export const BIRD_SPAWN_MIN_MS = 2_000;
export const BIRD_SPAWN_MAX_MS = 5_000;

export interface BirdNpc {
  x:          number;   // canvas px — current horizontal position
  y:          number;   // canvas px — current vertical position (waves around baseY)
  baseY:      number;   // canvas px — centre of the wave
  wavePhase:  number;   // radians — current sine phase
  speed:      number;   // px / sec
  dir:        1 | -1;  // 1 = left→right, -1 = right→left
  frameIndex: number;
  frameAccMs: number;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createBird(canvasWidth: number, canvasHeight: number): BirdNpc {
  const dir    = (Math.random() < 0.5 ? 1 : -1) as 1 | -1;
  const x      = dir === 1 ? -BIRD_DRAW_SIZE : canvasWidth + BIRD_DRAW_SIZE;
  const baseY  = 60 + Math.random() * (canvasHeight * 0.4 - 60);
  const speed  = canvasWidth / (4 + Math.random() * 2);
  // Random start phase so multiple birds don't bob in sync
  const wavePhase = Math.random() * Math.PI * 2;
  return { x, y: baseY, baseY, wavePhase, speed, dir, frameIndex: 0, frameAccMs: 0 };
}

// ── Per-frame update ──────────────────────────────────────────────────────────

export function updateBird(bird: BirdNpc, dt: number): void {
  // Animate sprite
  bird.frameAccMs += dt * 1000;
  if (bird.frameAccMs >= 1000 / BIRD_FPS) {
    bird.frameAccMs -= 1000 / BIRD_FPS;
    bird.frameIndex  = (bird.frameIndex + 1) % BIRD_FRAME_COUNT;
  }
  // Move horizontally
  bird.x += bird.dir * bird.speed * dt;
  // Sine-wave vertical bob
  bird.wavePhase += BIRD_WAVE_SPEED * dt;
  bird.y = bird.baseY + Math.sin(bird.wavePhase) * BIRD_WAVE_AMPLITUDE;
}

export function isBirdOffScreen(bird: BirdNpc, canvasWidth: number): boolean {
  return (bird.dir ===  1 && bird.x >  canvasWidth + BIRD_DRAW_SIZE) ||
         (bird.dir === -1 && bird.x < -BIRD_DRAW_SIZE);
}

// ── Sprite helper ─────────────────────────────────────────────────────────────

export function birdFrameSx(bird: BirdNpc): number {
  return bird.frameIndex * BIRD_FRAME_W;
}
