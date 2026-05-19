import { ENEMY_HP_BASE, ENEMY_SPEED_BASE } from '../constants';
import type { Waypoint } from '../types';

// ── Enemy type ────────────────────────────────────────────────────────────────

export interface Enemy {
  id:            number;
  waypointIndex: number;   // index of the segment start (from wp[i] → wp[i+1])
  progress:      number;   // 0..1 along current segment
  hp:            number;
  maxHp:         number;
  alive:         boolean;  // false = dead (hp ≤ 0) or reached base
  reached:       boolean;  // true = made it to the base
}

export function createEnemy(id: number): Enemy {
  return {
    id,
    waypointIndex: 0,
    progress:      0,
    hp:            ENEMY_HP_BASE,
    maxHp:         ENEMY_HP_BASE,
    alive:         true,
    reached:       false,
  };
}

// ── Movement ─────────────────────────────────────────────────────────────────

/**
 * Advance an enemy along the waypoint path.
 * @param dt seconds elapsed since last frame (capped upstream)
 */
export function updateEnemy(
  enemy: Enemy,
  waypoints: readonly Waypoint[],
  dt: number,
): void {
  if (!enemy.alive) return;

  const a = waypoints[enemy.waypointIndex];
  const b = waypoints[enemy.waypointIndex + 1];
  if (!b) { enemy.reached = true; enemy.alive = false; return; }

  // Segments are always axis-aligned, so Manhattan distance = Euclidean distance
  const segLen = Math.abs(b.col - a.col) + Math.abs(b.row - a.row);

  enemy.progress += (ENEMY_SPEED_BASE * dt) / segLen;

  // Advance to next segment, carrying over any overshoot
  while (enemy.progress >= 1) {
    enemy.progress -= 1;
    enemy.waypointIndex++;
    if (enemy.waypointIndex >= waypoints.length - 1) {
      enemy.reached = true;
      enemy.alive   = false;
      return;
    }
  }
}

// ── Position helpers ──────────────────────────────────────────────────────────

/** Fractional grid position of an enemy (for use with perspCenter). */
export function enemyGridPos(
  enemy: Enemy,
  waypoints: readonly Waypoint[],
): { col: number; row: number } {
  const a = waypoints[enemy.waypointIndex];
  const b = waypoints[Math.min(enemy.waypointIndex + 1, waypoints.length - 1)];
  return {
    col: a.col + (b.col - a.col) * enemy.progress,
    row: a.row + (b.row - a.row) * enemy.progress,
  };
}
