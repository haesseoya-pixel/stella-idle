import { ECON, FUEL, PLANETS, PRESTIGE, type StellarType } from './constants';
import { achievementBonuses } from './achievements';
import type { GameState, MetaState, RunState } from './state';
import { remnantCount } from './state';
import { classify, temperatureOf } from './stellar';

export interface RemnantBonuses {
  wdPhotonMult: number;
  nsAccretionMult: number;
  bhMetalMult: number;
  firstBhPhotonMult: number;
  goldMetalMult: number;
  wdCount: number;
  nsCount: number;
  bhCount: number;
}

export function remnantBonuses(meta: MetaState): RemnantBonuses {
  const wd = remnantCount(meta, 'wd');
  const ns = remnantCount(meta, 'ns');
  const bh = remnantCount(meta, 'bh');
  return {
    wdPhotonMult: 1 + PRESTIGE.WD_PHOTON_BONUS * Math.min(wd, PRESTIGE.WD_CAP),
    nsAccretionMult: 1 + PRESTIGE.NS_ACCRETION_BONUS * Math.min(ns, PRESTIGE.NS_CAP),
    bhMetalMult: 1 + PRESTIGE.BH_REMNANT_BONUS * bh,
    firstBhPhotonMult: bh >= 1 ? PRESTIGE.FIRST_BH_PHOTON_MULT : 1,
    goldMetalMult: 1 + PRESTIGE.GOLD_RELIC_BONUS * meta.goldRelics,
    wdCount: wd,
    nsCount: ns,
    bhCount: bh,
  };
}

export function metalsHeldMult(meta: MetaState): number {
  return 1 + PRESTIGE.METAL_MULT_COEF * Math.pow(Math.max(0, meta.metalsEarnedTotal), PRESTIGE.METAL_MULT_EXP);
}

export interface CivEffects {
  photonMult: number;
  heliumMult: number;
  dysonMult: number;
  dysonCount: number;
}

export function civEffects(run: RunState): CivEffects {
  let photonMult = 1;
  let heliumMult = 1;
  let dysonCount = 0;
  const worship = run.upgrades.starWorship;
  for (const p of run.planets) {
    if (p.kind !== 'rocky' || p.tier === 0) continue;
    const bonus = (PLANETS.TIER_PHOTON_BONUS[p.tier] ?? 0) + (p.tier >= 2 ? 0.05 * worship : 0);
    photonMult *= 1 + bonus;
    if (p.tier >= 3) heliumMult *= 1 + PLANETS.TIER3_HELIUM_BONUS;
    if (p.tier >= 4) dysonCount++;
  }
  return { photonMult, heliumMult, dysonMult: 1 + PLANETS.DYSON_MULT_PER * dysonCount, dysonCount };
}

export function gasGiantCount(run: RunState): number {
  let n = 0;
  for (const p of run.planets) if (p.kind === 'gas') n++;
  return n;
}

export function luminosity(mass: number, phase: RunState['phase']): number {
  const base = ECON.L0 * Math.pow(Math.max(mass, 1e-9) / ECON.IGNITION_MASS, ECON.LUM_EXP);
  return phase === 'cloud' ? base * ECON.CLOUD_LUM_FACTOR : base;
}

export interface Rates {
  type: StellarType;
  temperature: number;
  lum: number;
  clickMass: number;
  clickPhotons: number;
  accretion: number;
  photons: number;
  helium: number;
  fuelBurn: number;
  fuelEff: number;
  remainingSec: number;
  lifeRateBase: number;
  mult: {
    photon: number;
    accretion: number;
    click: number;
    metalsHeld: number;
    civ: number;
    dyson: number;
    remnantWd: number;
    firstBh: number;
    achievement: number;
  };
}

export function computeRates(s: GameState): Rates {
  const run = s.run;
  const meta = s.meta;
  const L = run.upgrades;
  const M = meta.metalUpgrades;
  const phase = run.phase;
  const type = classify(run.mass);
  const temperature = temperatureOf(run.mass, phase);
  const rb = remnantBonuses(meta);
  const ach = achievementBonuses(meta);
  const civ = civEffects(run);

  const massFactor = Math.max(1, Math.pow(run.mass / ECON.IGNITION_MASS, 0.5));
  const accMult =
    (1 + 0.3 * L.accretionDisk) *
    (1 + 0.5 * M.ironHeart) *
    rb.nsAccretionMult *
    (1 + PLANETS.GAS_ACCRETION_BONUS * gasGiantCount(run)) *
    (1 + ach.accretion) *
    massFactor;
  const accretion = phase === 'giant' ? 0 : (ECON.ACC_BASE + 0.0003 * L.nebulaCondense) * accMult;

  const clickMult = (1 + 0.5 * L.gravityWell) * Math.pow(2, Math.floor(L.gravityWell / 10)) * (1 + ach.click);
  const clickMass = phase === 'giant' ? 0 : ECON.CLICK_BASE * clickMult * accMult + accretion * 0.2 * L.tidalCapture;

  const lum = luminosity(run.mass, phase);
  const metalsHeld = metalsHeldMult(meta);
  const achievementMult = 1 + ach.photon;
  const photonMult =
    (1 + 0.25 * L.coreCompress) *
    (1 + 0.5 * L.heliumFlash) *
    Math.pow(1.5, L.photosphere) *
    (1 + 0.5 * M.carbonCatalyst) *
    metalsHeld *
    rb.wdPhotonMult *
    rb.firstBhPhotonMult *
    civ.photonMult *
    civ.dysonMult *
    achievementMult *
    (phase === 'giant' ? ECON.GIANT_PHOTON_MULT : 1);
  const photons = lum * photonMult;
  const clickPhotons = phase === 'giant' ? photons * ECON.GIANT_CLICK_SECONDS : 0;
  const helium = phase === 'cloud' ? 0 : photons * ECON.HE_PER_PHOTON * (1 + 0.2 * L.convection) * civ.heliumMult;

  const fuelEff = (1 + 0.2 * L.cnoCycle) * (1 + 0.25 * M.uraniumRod);
  const fuelBurn = phase === 'main' ? Math.pow(run.mass, FUEL.MASS_EXP) / FUEL.T0 / fuelEff : 0;
  const remainingSec = fuelBurn > 0 ? run.fuel / fuelBurn : Infinity;

  const lifeRateBase = PLANETS.LIFE_BASE_RATE * (1 + 0.5 * L.panspermia) * (1 + 0.3 * M.oxygenAtmo) * (phase === 'giant' ? 0.5 : 1);

  return {
    type,
    temperature,
    lum,
    clickMass,
    clickPhotons,
    accretion,
    photons,
    helium,
    fuelBurn,
    fuelEff,
    remainingSec,
    lifeRateBase,
    mult: {
      photon: photonMult,
      accretion: accMult,
      click: clickMult,
      metalsHeld,
      civ: civ.photonMult,
      dyson: civ.dysonMult,
      remnantWd: rb.wdPhotonMult,
      firstBh: rb.firstBhPhotonMult,
      achievement: achievementMult,
    },
  };
}

export function habitability(typeId: StellarType['id']): number {
  return PLANETS.HABITABILITY[typeId] ?? 0;
}
