import { ECON, FATES, GIANT_INFO, PRESTIGE, STELLAR_TYPES, TEMP_ANCHORS, type FateId, type FateInfo, type StellarType, type StellarTypeId } from './constants';
import { clamp } from '@/util/math';

export type Phase = 'cloud' | 'main' | 'giant';

export function classify(mass: number): StellarType {
  let found = STELLAR_TYPES[0] as StellarType;
  for (const t of STELLAR_TYPES) {
    if (mass >= t.minMass) found = t;
  }
  return found;
}

export function typeById(id: StellarTypeId): StellarType {
  return STELLAR_TYPES.find((t) => t.id === id) ?? (STELLAR_TYPES[0] as StellarType);
}

/** Effective temperature in kelvin, interpolated in log(mass). */
export function temperatureOf(mass: number, phase: Phase = 'main'): number {
  if (phase === 'giant') return GIANT_INFO.temperature;
  const first = TEMP_ANCHORS[0]!;
  const last = TEMP_ANCHORS[TEMP_ANCHORS.length - 1]!;
  const m = clamp(mass, first[0], last[0]);
  const lm = Math.log(m);
  for (let i = 0; i < TEMP_ANCHORS.length - 1; i++) {
    const [m0, t0] = TEMP_ANCHORS[i]!;
    const [m1, t1] = TEMP_ANCHORS[i + 1]!;
    if (m <= m1) {
      const f = (lm - Math.log(m0)) / (Math.log(m1) - Math.log(m0));
      return t0 + (t1 - t0) * clamp(f, 0, 1);
    }
  }
  return last[1];
}

/** Relative visual radius (1.0 = Sun-like), clamped for the canvas. */
export function visualRadius(mass: number, phase: Phase = 'main'): number {
  const base = clamp(Math.pow(Math.max(mass, 1e-6), 0.45), 0.3, 3.2);
  return phase === 'giant' ? base * 1.8 : base;
}

export function fateFor(mass: number): FateInfo {
  const id: FateId = mass > PRESTIGE.BH_MIN_MASS ? 'blackHole' : mass >= PRESTIGE.NS_MIN_MASS ? 'neutronStar' : 'whiteDwarf';
  return FATES[id];
}

export function isIgnited(mass: number): boolean {
  return mass >= ECON.IGNITION_MASS;
}
