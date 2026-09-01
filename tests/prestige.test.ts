import { describe, expect, it } from 'vitest';
import { canKilonova, performKilonova, performPrestige, predictPrestige } from '@/game/prestige';
import { createInitialState, type Remnant } from '@/game/state';

function giantAt(mass: number) {
  const s = createInitialState(0);
  s.run.mass = mass;
  s.run.phase = 'giant';
  s.run.photons = 12345;
  s.run.upgrades.coreCompress = 5;
  return s;
}

describe('predictPrestige yields', () => {
  it('matches the design table', () => {
    expect(predictPrestige(giantAt(1)).yieldMetals).toBe(10);
    expect(predictPrestige(giantAt(2.5)).yieldMetals).toBe(39);
    expect(predictPrestige(giantAt(7.9)).yieldMetals).toBe(222);
    expect(predictPrestige(giantAt(8)).yieldMetals).toBe(905);
    expect(predictPrestige(giantAt(12)).yieldMetals).toBe(1662);
    expect(predictPrestige(giantAt(20.001)).yieldMetals).toBe(7155);
    expect(predictPrestige(giantAt(40)).yieldMetals).toBe(20238);
  });
  it('stacks bonuses', () => {
    const s = giantAt(8);
    s.run.planets.push({ id: 'd', seed: 1, name: 'd', kind: 'rocky', orbitIndex: 0, angle: 0, life: 5000, tier: 4 });
    s.meta.escapedCivs = 20;
    s.meta.remnants.push({ id: 'b', kind: 'bh', mass: 30, metalsAtCreation: 1, runIndex: 1, createdAt: 0 });
    s.meta.goldRelics = 1;
    const p = predictPrestige(s);
    expect(p.dysonMult).toBeCloseTo(1.25);
    expect(p.escapedMult).toBeCloseTo(1.5);
    expect(p.bhMult).toBeCloseTo(1.15);
    expect(p.goldMult).toBeCloseTo(1.2);
    expect(p.yieldMetals).toBe(Math.floor(905.096 * 1.25 * 1.5 * 1.15 * 1.2));
    expect(p.escaping.length).toBe(1);
  });
});

describe('performPrestige', () => {
  it('resets run, keeps meta, records remnant and codex', () => {
    const s = giantAt(8);
    s.run.planets.push({ id: 'e', seed: 2, name: 'e', kind: 'rocky', orbitIndex: 0, angle: 0, life: 1300, tier: 3, civName: 'x' });
    s.meta.metalUpgrades.stardustMemory = 2;
    const r = performPrestige(s, 1000);
    expect(r.fate.id).toBe('neutronStar');
    expect(s.meta.metals).toBe(r.yieldMetals);
    expect(s.meta.metalsEarnedTotal).toBe(r.yieldMetals);
    expect(s.meta.remnants.length).toBe(1);
    expect(s.meta.remnants[0]?.kind).toBe('ns');
    expect(s.meta.remnants[0]?.metalsAtCreation).toBe(r.yieldMetals);
    expect(s.meta.escapedCivs).toBe(1);
    expect(s.meta.totalPrestiges).toBe(1);
    expect(s.meta.bestMass).toBe(8);
    expect(s.meta.codex.ns).toBeDefined();
    expect(s.meta.codex.supernova).toBeDefined();
    expect(s.stats.fatesSeen.neutronStar).toBe(1);
    expect(s.run.runIndex).toBe(2);
    expect(s.run.mass).toBe(0.3);
    expect(s.run.phase).toBe('main');
    expect(s.run.photons).toBe(0);
    expect(s.run.upgrades.coreCompress).toBe(0);
    expect(s.run.planets.length).toBe(0);
    expect(s.run.fuel).toBe(1);
  });
  it('white dwarf records nebula codex and starts a cloud when memory is 0', () => {
    const s = giantAt(1);
    performPrestige(s, 1);
    expect(s.meta.codex.wd).toBeDefined();
    expect(s.meta.codex.nebula).toBeDefined();
    expect(s.run.phase).toBe('cloud');
    expect(s.run.mass).toBe(0.01);
  });
});

describe('kilonova', () => {
  const ns = (id: string, mass: number, metals: number): Remnant => ({ id, kind: 'ns', mass, metalsAtCreation: metals, runIndex: 1, createdAt: 0 });
  it('requires two neutron stars', () => {
    const s = createInitialState(0);
    expect(canKilonova(s.meta)).toBe(false);
    expect(performKilonova(s, 1)).toBeNull();
    s.meta.remnants.push(ns('a', 9, 100));
    expect(canKilonova(s.meta)).toBe(false);
    s.meta.remnants.push(ns('b', 12, 200));
    expect(canKilonova(s.meta)).toBe(true);
  });
  it('merges the two heaviest into a black hole with gold and metals', () => {
    const s = createInitialState(0);
    s.meta.remnants.push(ns('a', 9, 100), ns('b', 12, 200), ns('c', 10, 150));
    const r = performKilonova(s, 5);
    expect(r).not.toBeNull();
    expect(r!.merged.map((m) => m.id).sort()).toEqual(['b', 'c']);
    expect(r!.blackHole.mass).toBe(22);
    expect(r!.blackHole.fromKilonova).toBe(true);
    expect(r!.metals).toBe(350);
    expect(s.meta.metals).toBe(350);
    expect(s.meta.goldRelics).toBe(1);
    expect(s.meta.remnants.filter((x) => x.kind === 'ns').length).toBe(1);
    expect(s.meta.remnants.filter((x) => x.kind === 'bh').length).toBe(1);
    expect(s.meta.codex.kilonova).toBeDefined();
    expect(canKilonova(s.meta)).toBe(false);
  });
});
