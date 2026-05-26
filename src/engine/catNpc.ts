// ── Cat NPC — decorative wandering cat ───────────────────────────────────────
//
// Sprite sheet: 384×48, 8 frames at 48×48 each, 8 fps
// Frame groups (0-indexed):
//   down  → 0, 1   (sx = 0,   48)
//   left  → 2, 3   (sx = 96,  144)
//   right → 4, 5   (sx = 192, 240)
//   up    → 6, 7   (sx = 288, 336)

export const CAT_FRAME_W = 48;
export const CAT_FRAME_H = 48;
export const CAT_FPS     = 8;

export type CatDir   = 'down' | 'left' | 'right' | 'up';
export type CatState = 'idle' | 'walking';

const DIR_FRAME_START: Record<CatDir, number> = {
  down: 0, left: 2, right: 4, up: 6,
};

export interface CatNpc {
  x:            number;   // fractional col (centre of cat)
  y:            number;   // fractional row
  // Current sub-target (centre of next waypoint tile)
  targetX:      number;
  targetY:      number;
  // Remaining waypoint tiles to reach the final destination
  path:         { col: number; row: number }[];
  state:        CatState;
  dir:          CatDir;
  speed:        number;   // tiles/sec
  idleTimeLeft: number;   // seconds until next wander pick
  frameIndex:   number;   // 0 or 1 within the direction pair
  frameAccMs:   number;   // accumulated ms toward next frame flip
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createCatNpc(startCol: number, startRow: number): CatNpc {
  return {
    x: startCol + 0.5,
    y: startRow + 0.5,
    targetX: startCol + 0.5,
    targetY: startRow + 0.5,
    path: [],
    state: 'idle',
    dir:   'down',
    speed: 1.5,
    idleTimeLeft: 1 + Math.random(),   // 1–2 s initial pause
    frameIndex: 0,
    frameAccMs: 0,
  };
}

// ── BFS pathfinder (grass-only) ───────────────────────────────────────────────

const DIRS_4 = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;

/**
 * BFS from (startCol, startRow) to (endCol, endRow) stepping only through
 * tiles where isGrass returns true.  Returns the list of tile waypoints to
 * follow (NOT including the start tile).  Returns [] if unreachable.
 */
function bfsPath(
  startCol: number, startRow: number,
  endCol:   number, endRow:   number,
  isGrass:  (col: number, row: number) => boolean,
): { col: number; row: number }[] {
  if (startCol === endCol && startRow === endRow) return [];

  const key    = (c: number, r: number) => `${c},${r}`;
  const startK = key(startCol, startRow);
  const endK   = key(endCol,   endRow);

  // parent map: nodeKey → parentKey (null for start)
  const parent = new Map<string, string | null>();
  parent.set(startK, null);

  const queue: [number, number][] = [[startCol, startRow]];

  while (queue.length > 0) {
    const [col, row] = queue.shift()!;
    const curK = key(col, row);

    if (curK === endK) {
      // Reconstruct path (exclude start, include end)
      const path: { col: number; row: number }[] = [];
      let k: string | null = curK;
      while (k !== null && k !== startK) {
        const [c, r] = k.split(',').map(Number);
        path.unshift({ col: c, row: r });
        k = parent.get(k) ?? null;
      }
      return path;
    }

    for (const [dc, dr] of DIRS_4) {
      const nc = col + dc;
      const nr = row + dr;
      const nk = key(nc, nr);
      if (!parent.has(nk) && isGrass(nc, nr)) {
        parent.set(nk, curK);
        queue.push([nc, nr]);
      }
    }
  }

  return []; // unreachable
}

// ── Direction helpers ─────────────────────────────────────────────────────────

function dirFromVector(dx: number, dy: number): CatDir {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

// ── Candidate tile picker ─────────────────────────────────────────────────────

/** Pick a random grass tile within `radius` tiles of (cx, cy). */
function pickNearbyGrass(
  cx: number, cy: number,
  radius: number,
  isGrass: (col: number, row: number) => boolean,
): { col: number; row: number } | null {
  const candidates: { col: number; row: number }[] = [];
  const baseCol = Math.floor(cx);
  const baseRow = Math.floor(cy);
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue;
      const col = baseCol + dc;
      const row = baseRow + dr;
      if (isGrass(col, row)) candidates.push({ col, row });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ── Per-frame update ──────────────────────────────────────────────────────────

export function updateCatNpc(
  cat:     CatNpc,
  dt:      number,
  isGrass: (col: number, row: number) => boolean,
): void {

  if (cat.state === 'walking') {
    // Animate sprite at CAT_FPS
    cat.frameAccMs += dt * 1000;
    if (cat.frameAccMs >= 1000 / CAT_FPS) {
      cat.frameAccMs -= 1000 / CAT_FPS;
      cat.frameIndex  = (cat.frameIndex + 1) % 2;
    }

    // Move toward current waypoint target
    const dx   = cat.targetX - cat.x;
    const dy   = cat.targetY - cat.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = cat.speed * dt;

    if (dist <= step) {
      // Arrived at this waypoint — snap position
      cat.x = cat.targetX;
      cat.y = cat.targetY;

      if (cat.path.length > 0) {
        // Advance to next waypoint along the BFS path
        const next = cat.path.shift()!;
        cat.targetX = next.col + 0.5;
        cat.targetY = next.row + 0.5;
        cat.dir     = dirFromVector(cat.targetX - cat.x, cat.targetY - cat.y);
      } else {
        // Final destination reached — start idle
        cat.state        = 'idle';
        cat.idleTimeLeft = 1 + Math.random();   // 1–2 s
        cat.frameIndex   = 0;
        cat.frameAccMs   = 0;
      }
    } else {
      cat.x  += (dx / dist) * step;
      cat.y  += (dy / dist) * step;
      cat.dir = dirFromVector(dx, dy);
    }

  } else {
    // Idle — countdown then pick a reachable grass tile
    cat.idleTimeLeft -= dt;
    if (cat.idleTimeLeft <= 0) {
      const startCol = Math.floor(cat.x);
      const startRow = Math.floor(cat.y);

      // Try up to 5 random candidates; use the first one reachable via grass
      let found = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = pickNearbyGrass(cat.x, cat.y, 4, isGrass);
        if (!candidate) break;

        const path = bfsPath(startCol, startRow, candidate.col, candidate.row, isGrass);
        if (path.length > 0) {
          cat.path    = path;
          const first = cat.path.shift()!;
          cat.targetX = first.col + 0.5;
          cat.targetY = first.row + 0.5;
          cat.dir     = dirFromVector(cat.targetX - cat.x, cat.targetY - cat.y);
          cat.state   = 'walking';
          found       = true;
          break;
        }
      }

      if (!found) {
        cat.idleTimeLeft = 1 + Math.random();   // retry later
      }
    }
  }
}

// ── Sprite helpers ────────────────────────────────────────────────────────────

/** X offset (px) into the sprite sheet for the current frame. */
export function catFrameSx(cat: CatNpc): number {
  return (DIR_FRAME_START[cat.dir] + cat.frameIndex) * CAT_FRAME_W;
}
