import { OFFLINE } from './constants';
import { achievementBonuses } from './achievements';
import { computeRates } from './economy';
import type { GameState } from './state';
import type { Phase } from './stellar';
import { simulate, type GameEvent } from './tick';
import { clamp } from '@/util/math';

export function offlineCap(s: GameState): number {
  const ach = achievementBonuses(s.meta);
  return OFFLINE.BASE_CAP + 3600 * (OFFLINE.TIME_CRYSTAL_HOURS * s.meta.metalUpgrades.timeCrystal + ach.offlineHours);
}

export interface OfflineReport {
  elapsed: number;
  requested: number;
  capped: boolean;
  photons: number;
  helium: number;
  massBefore: number;
  massAfter: number;
  fuelBefore: number;
  fuelAfter: number;
  phaseBefore: Phase;
  phaseAfter: Phase;
  events: GameEvent[];
  tributes: number;
}

/** Advances the state by up to the offline cap using the same simulate() as live play. */
export function simulateOffline(s: GameState, requestedSec: number, startNow: number): OfflineReport {
  const cap = offlineCap(s);
  const elapsed = clamp(Number.isFinite(requestedSec) ? requestedSec : 0, 0, cap);
  const report: OfflineReport = {
    elapsed,
    requested: requestedSec,
    capped: requestedSec > cap,
    photons: 0,
    helium: 0,
    massBefore: s.run.mass,
    massAfter: s.run.mass,
    fuelBefore: s.run.fuel,
    fuelAfter: s.run.fuel,
    phaseBefore: s.run.phase,
    phaseAfter: s.run.phase,
    events: [],
    tributes: 0,
  };
  if (elapsed <= 0) return report;

  const photons0 = s.run.photons;
  const helium0 = s.run.helium;
  let t = 0;
  while (t < elapsed) {
    const dt = Math.min(OFFLINE.STEP, elapsed - t);
    const now = startNow + (t + dt) * 1000;
    const rates = computeRates(s);
    for (const e of simulate(s, dt, now, rates)) {
      if (e.type === 'tribute') report.tributes += 1;
      else if (e.type !== 'codex') report.events.push(e);
    }
    t += dt;
  }
  report.photons = s.run.photons - photons0;
  report.helium = s.run.helium - helium0;
  report.massAfter = s.run.mass;
  report.fuelAfter = s.run.fuel;
  report.phaseAfter = s.run.phase;
  return report;
}
