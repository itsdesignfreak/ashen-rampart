import type { Projectile, TowerType } from '../types';
import type { Enemy } from './enemy';
import { enemyGridPos } from './enemy';
import { TOWER_STATS } from './towerData';
import type { Waypoint } from '../types';

// ── Factory ───────────────────────────────────────────────────────────────────

export function createProjectile(
  id:        number,
  type:      TowerType,
  fromCol:   number,   // fractional grid col of the firing tower centre
  fromRow:   number,   // fractional grid row of the firing tower centre
  target:    Enemy,
  waypoints: readonly Waypoint[],
  towerKey:  string,
): Projectile {
  const pos = enemyGridPos(target, waypoints);
  return {
    id,
    type,
    x:        fromCol,
    y:        fromRow,
    fromX:    fromCol,
    fromY:    fromRow,
    targetId: target.id,
    targetX:  pos.col + 0.5,
    targetY:  pos.row + 0.5,
    alive:    true,
    towerKey,
  };
}

// ── Collision radius ──────────────────────────────────────────────────────────

const HIT_RADIUS = 0.4; // tiles — how close a projectile must be to count as a hit

// ── Hit resolution ────────────────────────────────────────────────────────────

function applyHit(
  proj:      Projectile,
  enemies:   Enemy[],
  waypoints: readonly Waypoint[],
  timestamp: number,
  onHit?:    (type: TowerType, x: number, y: number, targetId: number) => void,
): void {
  const stats = TOWER_STATS[proj.type];

  if (proj.type === 'cannon' && stats.splashRadius) {
    // Splash: damage all living enemies within splashRadius tiles of impact point
    for (const e of enemies) {
      if (!e.alive) continue;
      const pos = enemyGridPos(e, waypoints);
      const dx = pos.col + 0.5 - proj.targetX;
      const dy = pos.row + 0.5 - proj.targetY;
      if (Math.sqrt(dx * dx + dy * dy) <= stats.splashRadius) {
        e.hp -= stats.projectileDamage;
        if (e.hp <= 0 && e.alive) {
          e.alive = false;
          e.reached = false;
        }
      }
    }
  } else {
    // Single-target: find the homed enemy
    const target = enemies.find(e => e.id === proj.targetId);
    if (target && target.alive) {
      target.hp -= stats.projectileDamage;
      if (target.hp <= 0) {
        target.alive = false;
        target.reached = false;
      }
      // Mage slow
      if (proj.type === 'mage' && stats.slowDuration && target.alive) {
        target.slowUntil = Math.max(target.slowUntil, timestamp + stats.slowDuration);
      }
    }
  }

  onHit?.(proj.type, proj.x, proj.y, proj.targetId);
  proj.alive = false;
}

// ── Per-frame update ──────────────────────────────────────────────────────────

export function updateProjectiles(
  projectiles: Projectile[],
  enemies:     Enemy[],
  waypoints:   readonly Waypoint[],
  dt:          number,
  timestamp:   number,
  onHit?:      (type: TowerType, x: number, y: number, targetId: number) => void,
): void {
  for (const proj of projectiles) {
    if (!proj.alive) continue;

    const stats = TOWER_STATS[proj.type];

    // Track living target position
    const target = enemies.find(e => e.id === proj.targetId && e.alive);
    if (target) {
      const pos = enemyGridPos(target, waypoints);
      proj.targetX = pos.col + 0.5;
      proj.targetY = pos.row + 0.5;
    }
    // If target is dead, cannon still flies to last known position; others detonate immediately
    else if (proj.type !== 'cannon') {
      proj.alive = false;
      continue;
    }

    // Move toward target
    const dx   = proj.targetX - proj.x;
    const dy   = proj.targetY - proj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= stats.projectileSpeed * dt + HIT_RADIUS) {
      // Close enough — snap to target and detonate
      proj.x = proj.targetX;
      proj.y = proj.targetY;
      applyHit(proj, enemies, waypoints, timestamp, onHit);
    } else {
      proj.x += (dx / dist) * stats.projectileSpeed * dt;
      proj.y += (dy / dist) * stats.projectileSpeed * dt;
    }
  }
}
