import { ECON, PLANETS, type CodexId, type StellarTypeId } from './constants';
import { evaluateAchievements } from './achievements';
import { computeRates, type Rates } from './economy';
import { advancePlanets, civilizations } from './planets';
import type { AchievementId, CivTier, GameState, Planet } from './state';
import { classify } from './stellar';

export type GameEvent =
  | { type: 'ignite' }
  | { type: 'typeChange'; from: StellarTypeId; to: StellarTypeId }
  | { type: 'giant' }
  | { type: 'civTier'; planet: Planet; tier: CivTier }
  | { type: 'tribute'; amount: number; civName: string; count: number }
  | { type: 'achievement'; id: AchievementId }
  | { type: 'codex'; id: CodexId };

function recordCodex(s: GameState, id: CodexId, now: number, events: GameEvent[]): void {
  if (s.meta.codex[id] === undefined) {
    s.meta.codex[id] = now;
    events.push({ type: 'codex', id });
  }
}

/** Phase and type transitions shared by ticks and clicks. */
export function checkTransitions(s: GameState, now: number, events: GameEvent[]): void {
  const run = s.run;
  if (run.phase === 'cloud' && run.mass >= ECON.IGNITION_MASS) {
    run.phase = 'main';
    events.push({ type: 'ignite' });
  }
  const t = classify(run.mass);
  if (t.id !== run.lastTypeId) {
    events.push({ type: 'typeChange', from: run.lastTypeId, to: t.id });
    run.lastTypeId = t.id;
  }
  recordCodex(s, t.id, now, events);
  if (run.mass > run.peakMass) run.peakMass = run.mass;
  if (run.mass > s.meta.bestMass) s.meta.bestMass = run.mass;
}

/** One pure simulation step of `dt` seconds. */
export function simulate(s: GameState, dt: number, now: number, rates: Rates = computeRates(s)): GameEvent[] {
  const events: GameEvent[] = [];
  const run = s.run;

  if (run.phase !== 'giant') run.mass += rates.accretion * dt;

  const photonGain = rates.photons * dt;
  run.photons += photonGain;
  run.photonsEarned += photonGain;
  s.stats.totalPhotons += photonGain;

  const heGain = rates.helium * dt;
  run.helium += heGain;
  s.stats.totalHelium += heGain;
  if (!run.heliumEverSeen && run.helium >= 1) run.heliumEverSeen = true;

  if (run.phase === 'main') {
    run.fuel = Math.max(0, run.fuel - rates.fuelBurn * dt);
    if (run.fuel <= 0) {
      run.phase = 'giant';
      run.giantSince = now;
      events.push({ type: 'giant' });
      recordCodex(s, 'giant', now, events);
    }
  }

  checkTransitions(s, now, events);

  for (const e of advancePlanets(s, dt, rates)) events.push(e);

  const civs = civilizations(s);
  if (civs.length > 0) {
    run.tributeTimer += dt;
    if (run.tributeTimer >= PLANETS.TRIBUTE_INTERVAL) {
      run.tributeTimer -= PLANETS.TRIBUTE_INTERVAL;
      const amount = rates.photons * PLANETS.TRIBUTE_SECONDS * (1 + 0.25 * run.upgrades.starWorship) * civs.length;
      run.photons += amount;
      run.photonsEarned += amount;
      s.stats.totalPhotons += amount;
      events.push({ type: 'tribute', amount, civName: civs[0]?.civName ?? '이름 없는 문명', count: civs.length });
    }
  } else {
    run.tributeTimer = 0;
  }

  s.stats.playtimeSec += dt;

  for (const id of evaluateAchievements(s, now)) events.push({ type: 'achievement', id });
  return events;
}

export interface ClickResult {
  mass: number;
  photons: number;
  events: GameEvent[];
}

export function applyClick(s: GameState, now: number, rates: Rates = computeRates(s)): ClickResult {
  const events: GameEvent[] = [];
  const run = s.run;
  let mass = 0;
  let photons = 0;
  if (run.phase === 'giant') {
    photons = rates.clickPhotons;
    run.photons += photons;
    run.photonsEarned += photons;
    s.stats.totalPhotons += photons;
  } else {
    mass = rates.clickMass;
    run.mass += mass;
  }
  run.clicks += 1;
  s.stats.totalClicks += 1;
  checkTransitions(s, now, events);
  for (const id of evaluateAchievements(s, now)) events.push({ type: 'achievement', id });
  return { mass, photons, events };
}
