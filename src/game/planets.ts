import { CIV_NAME_PREFIX, CIV_NAME_SUFFIX, PLANETS, PLANET_NAME_PREFIX, TIER_NAMES } from './constants';
import { habitability, type Rates } from './economy';
import type { CivTier, GameState, Planet, PlanetKind } from './state';
import { mulberry32, pick } from '@/util/rng';

export interface PlanetCost {
  photons: number;
  metals: number;
}

export function gasCost(s: GameState): PlanetCost {
  const n = s.run.planets.filter((p) => p.kind === 'gas').length;
  return { photons: PLANETS.GAS_BASE_COST * Math.pow(PLANETS.GAS_COST_GROWTH, n), metals: 0 };
}

export function rockyCost(s: GameState): PlanetCost {
  const n = s.run.planets.filter((p) => p.kind === 'rocky').length;
  return {
    photons: PLANETS.ROCKY_BASE_COST * Math.pow(PLANETS.ROCKY_COST_GROWTH, n),
    metals: PLANETS.ROCKY_METAL_BASE * Math.pow(PLANETS.ROCKY_METAL_GROWTH, n),
  };
}

export function rockyCount(s: GameState): number {
  return s.run.planets.filter((p) => p.kind === 'rocky').length;
}

export function rockyAllowed(s: GameState): number {
  return s.meta.metalUpgrades.siliconCrust;
}

export function hasFreeSlot(s: GameState): boolean {
  return s.run.planets.length < Math.min(s.run.slots, PLANETS.MAX_SLOTS);
}

export function canBuyGas(s: GameState): boolean {
  return hasFreeSlot(s) && s.run.photons >= gasCost(s).photons;
}

export function canBuyRocky(s: GameState): boolean {
  if (!hasFreeSlot(s)) return false;
  if (rockyCount(s) >= rockyAllowed(s)) return false;
  const c = rockyCost(s);
  return s.run.photons >= c.photons && s.meta.metals >= c.metals;
}

function nextOrbitIndex(s: GameState): number {
  const used = new Set(s.run.planets.map((p) => p.orbitIndex));
  for (let i = 0; i < PLANETS.MAX_SLOTS; i++) if (!used.has(i)) return i;
  return s.run.planets.length;
}

export function planetName(seed: number, orbitIndex: number): string {
  const rng = mulberry32(seed);
  const prefix = pick(rng, PLANET_NAME_PREFIX);
  const num = 1 + Math.floor(rng() * 900);
  const letter = String.fromCharCode(98 + orbitIndex); // b, c, d...
  return `${prefix}-${num}${letter}`;
}

export function civName(seed: number): string {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  return `${pick(rng, CIV_NAME_PREFIX)} ${pick(rng, CIV_NAME_SUFFIX)}`;
}

export function createPlanet(kind: PlanetKind, orbitIndex: number, seed: number): Planet {
  return {
    id: `p${seed.toString(36)}`,
    seed,
    name: planetName(seed, orbitIndex),
    kind,
    orbitIndex,
    angle: mulberry32(seed + 7)() * Math.PI * 2,
    life: 0,
    tier: 0,
  };
}

export function buyGas(s: GameState, seed: number): Planet | null {
  if (!canBuyGas(s)) return null;
  s.run.photons -= gasCost(s).photons;
  const p = createPlanet('gas', nextOrbitIndex(s), seed);
  s.run.planets.push(p);
  return p;
}

export function buyRocky(s: GameState, seed: number): Planet | null {
  if (!canBuyRocky(s)) return null;
  const c = rockyCost(s);
  s.run.photons -= c.photons;
  s.meta.metals -= c.metals;
  const p = createPlanet('rocky', nextOrbitIndex(s), seed);
  s.run.planets.push(p);
  return p;
}

export function tierName(t: CivTier): string {
  return TIER_NAMES[t];
}

export function tierThreshold(t: CivTier): number {
  return (PLANETS.TIER_LP as readonly number[])[t] ?? Infinity;
}

export function tierFor(life: number): CivTier {
  let t: CivTier = 0;
  for (let i = 0; i < PLANETS.TIER_LP.length; i++) {
    if (life >= (PLANETS.TIER_LP[i] ?? Infinity)) t = (i + 1) as CivTier;
  }
  return t;
}

export function lifeRateFor(s: GameState, rates: Rates): number {
  if (s.run.phase === 'cloud') return 0;
  return rates.lifeRateBase * habitability(rates.type.id);
}

export interface PlanetTickEvent {
  type: 'civTier';
  planet: Planet;
  tier: CivTier;
}

/** Advances orbits and life. Returns tier-change events. */
export function advancePlanets(s: GameState, dt: number, rates: Rates): PlanetTickEvent[] {
  const events: PlanetTickEvent[] = [];
  const rate = lifeRateFor(s, rates);
  for (const p of s.run.planets) {
    const period = 8 * Math.pow(1 + p.orbitIndex * 0.45, 1.5);
    p.angle = (p.angle + (dt * Math.PI * 2) / period) % (Math.PI * 2);
    if (p.kind !== 'rocky' || rate <= 0) continue;
    p.life += rate * dt;
    const t = tierFor(p.life);
    if (t > p.tier) {
      p.tier = t;
      if (t >= 2 && !p.civName) p.civName = civName(p.seed);
      events.push({ type: 'civTier', planet: p, tier: t });
    }
  }
  return events;
}

export function dysonCount(s: GameState): number {
  return s.run.planets.filter((p) => p.tier >= 4).length;
}

export function civilizations(s: GameState): Planet[] {
  return s.run.planets.filter((p) => p.tier >= 2);
}
