/**
 * TemporalPathfinder — era-aware pedestrian archetypes + simple node graph.
 */

import * as pc from 'playcanvas';

const ARCHETYPES = {
  '1885': { speed: 0.7, panicMultiplier: 1.1, label: 'townsfolk' },
  '1955': { speed: 1.0, panicMultiplier: 1.3, label: 'citizen' },
  '1985': { speed: 1.15, panicMultiplier: 1.5, label: 'mallgoer' },
  '2015': { speed: 1.2, panicMultiplier: 1.4, label: 'techie' },
  '2045': { speed: 0.9, panicMultiplier: 2.0, label: 'survivor' }
};

export class TemporalPathfinder {
  constructor(options = {}) {
    this.nodes = options.nodes || this._defaultSquareNodes();
    this.currentEra = '1985';
    this.panic = false;
  }

  _defaultSquareNodes() {
    // Simple waypoints around Courthouse Square
    return [
      new pc.Vec3(-15, 0, -8),
      new pc.Vec3(15, 0, -8),
      new pc.Vec3(15, 0, 12),
      new pc.Vec3(-15, 0, 12),
      new pc.Vec3(0, 0, 18),
      new pc.Vec3(-22, 0, 6),
      new pc.Vec3(22, 0, -14),
      new pc.Vec3(8, 0, -18)
    ];
  }

  setEra(era) {
    this.currentEra = era;
  }

  setPanic(active) {
    this.panic = !!active;
  }

  getArchetype(era = this.currentEra) {
    return ARCHETYPES[era] || ARCHETYPES['1985'];
  }

  /** Pick a random nearby node different from current position */
  nextWaypoint(fromPos) {
    let best = this.nodes[0];
    let bestScore = -Infinity;
    for (const n of this.nodes) {
      const d = fromPos.distance(n);
      // Prefer medium distance
      const score = 10 - Math.abs(d - 12) + Math.random() * 3;
      if (score > bestScore && d > 3) {
        bestScore = score;
        best = n;
      }
    }
    return best.clone();
  }

  getMoveSpeed() {
    const a = this.getArchetype();
    return a.speed * (this.panic ? a.panicMultiplier : 1);
  }
}
