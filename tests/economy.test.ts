import { describe, expect, it } from 'vitest';
import { computeRates, luminosity, metalsHeldMult } from '@/game/economy';
import { createInitialState } from '@/game/state';

function stateAt(mass: number, phase: 'cloud' | 'main' | 'giant' = 'main') {
  const s = createInitialState(0);
  s.run.mass = mass;
  s.run.phase = phase;
  return s;
}

describe('luminosity', () => {
  it('anchors', () => {
    expect(luminosity(0.08, 'main')).toBeCloseTo(2, 6);
    expect(luminosity(1, 'main')).toBeGreaterThan(510);
    expect(luminosity(1, 'main')).toBeLessThan(526);
    expect(luminosity(0.05, 'cloud')).toBeCloseTo(luminosity(0.05, 'main') * 0.1, 9);
  });
});

describe('computeRates', () => {
  it('cloud phase: no helium, no fuel burn, accretion floors at massFactor 1', () => {
    const r = computeRates(stateAt(0.01, 'cloud'));
    expect(r.helium).toBe(0);
    expect(r.fuelBurn).toBe(0);
    expect(r.accretion).toBeCloseTo(0.0003, 9);
    expect(r.clickMass).toBeCloseTo(0.0004, 9);
  });
  it('main phase basics at 1 M☉', () => {
    const r = computeRates(stateAt(1, 'main'));
    expect(r.photons).toBeCloseTo(luminosity(1, 'main'));
    expect(r.helium).toBeCloseTo(r.photons * 0.01);
    expect(r.fuelBurn).toBeCloseTo(1 / 800);
    expect(r.remainingSec).toBeCloseTo(800);
    expect(r.accretion).toBeCloseTo(0.0003 * Math.sqrt(1 / 0.08), 9);
  });
  it('giant phase: mass frozen, photons ×3, click gives photons', () => {
    const main = computeRates(stateAt(1, 'main'));
    const giant = computeRates(stateAt(1, 'giant'));
    expect(giant.accretion).toBe(0);
    expect(giant.clickMass).toBe(0);
    expect(giant.fuelBurn).toBe(0);
    expect(giant.photons).toBeCloseTo(main.photons * 3);
    expect(giant.clickPhotons).toBeCloseTo(giant.photons * 0.5);
  });
  it('multipliers compose in isolation', () => {
    const base = computeRates(stateAt(1)).photons;
    const s1 = stateAt(1);
    s1.run.upgrades.coreCompress = 4;
    expect(computeRates(s1).photons).toBeCloseTo(base * 2);
    const s2 = stateAt(1);
    s2.run.upgrades.photosphere = 2;
    expect(computeRates(s2).photons).toBeCloseTo(base * 2.25);
    const s3 = stateAt(1);
    s3.meta.remnants.push({ id: 'a', kind: 'bh', mass: 25, metalsAtCreation: 1, runIndex: 1, createdAt: 0 });
    expect(computeRates(s3).photons).toBeCloseTo(base * 1.5);
    const s4 = stateAt(1);
    for (let i = 0; i < 30; i++) s4.meta.remnants.push({ id: `w${i}`, kind: 'wd', mass: 1, metalsAtCreation: 1, runIndex: 1, createdAt: 0 });
    expect(computeRates(s4).photons).toBeCloseTo(base * 2); // capped at 20 × 5%
  });
  it('fuel efficiency caps', () => {
    const s = stateAt(1);
    s.run.upgrades.cnoCycle = 15;
    s.meta.metalUpgrades.uraniumRod = 10;
    expect(computeRates(s).fuelEff).toBeCloseTo(4 * 3.5);
  });
  it('metals held multiplier', () => {
    const s = createInitialState(0);
    expect(metalsHeldMult(s.meta)).toBe(1);
    s.meta.metalsEarnedTotal = 100;
    expect(metalsHeldMult(s.meta)).toBeCloseTo(1 + 0.02 * Math.pow(100, 0.7));
  });
});
