import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/game/state';
import { UPGRADE_BY_ID, affordableCount, buyUpgrade, costOf, costOfN, maxAffordable } from '@/game/upgrades';

const def = { base: 10, growth: 1.15, max: Infinity };

describe('cost curves', () => {
  it('costOf', () => {
    expect(costOf(def, 0)).toBe(10);
    expect(costOf(def, 1)).toBeCloseTo(11.5);
    expect(costOf(def, 10)).toBeCloseTo(10 * Math.pow(1.15, 10));
  });
  it('costOfN equals summed singles', () => {
    let sum = 0;
    for (let i = 3; i < 3 + 7; i++) sum += costOf(def, i);
    expect(costOfN(def, 3, 7)).toBeCloseTo(sum, 6);
    expect(costOfN(def, 3, 0)).toBe(0);
  });
  it('maxAffordable exact at boundaries', () => {
    const budget = costOfN(def, 0, 5);
    expect(maxAffordable(def, 0, budget)).toBe(5);
    expect(maxAffordable(def, 0, budget - 0.01)).toBe(4);
    expect(maxAffordable(def, 0, 9.99)).toBe(0);
    expect(maxAffordable({ ...def, max: 3 }, 1, 1e9)).toBe(2);
    expect(maxAffordable({ ...def, max: 3 }, 3, 1e9)).toBe(0);
  });
});

describe('buyUpgrade', () => {
  it('deducts and increments', () => {
    const s = createInitialState(0);
    s.run.phase = 'main';
    s.run.photons = 100;
    expect(buyUpgrade(s, 'gravityWell', 1)).toBe(1);
    expect(s.run.upgrades.gravityWell).toBe(1);
    expect(s.run.photons).toBeCloseTo(90);
    expect(buyUpgrade(s, 'gravityWell', 100)).toBe(0);
    expect(s.run.photons).toBeCloseTo(90);
  });
  it('respects max level and helium currency', () => {
    const s = createInitialState(0);
    s.run.helium = 1e12;
    s.run.heliumEverSeen = true;
    expect(buyUpgrade(s, 'heliumFlash', 50)).toBe(10);
    expect(s.run.upgrades.heliumFlash).toBe(10);
    expect(buyUpgrade(s, 'heliumFlash', 1)).toBe(0);
  });
  it('protoDisk updates slots', () => {
    const s = createInitialState(0);
    s.run.photons = 1e9;
    buyUpgrade(s, 'protoDisk', 2);
    expect(s.run.slots).toBe(2);
  });
  it('affordableCount honours amount modes', () => {
    const s = createInitialState(0);
    s.run.photons = costOfN(UPGRADE_BY_ID.coreCompress, 0, 10);
    expect(affordableCount(s, UPGRADE_BY_ID.coreCompress, 1)).toBe(1);
    expect(affordableCount(s, UPGRADE_BY_ID.coreCompress, 10)).toBe(10);
    expect(affordableCount(s, UPGRADE_BY_ID.coreCompress, 'max')).toBe(10);
    s.run.photons -= 1;
    expect(affordableCount(s, UPGRADE_BY_ID.coreCompress, 10)).toBe(0);
    expect(affordableCount(s, UPGRADE_BY_ID.coreCompress, 'max')).toBe(9);
  });
  it('unlock conditions', () => {
    const s = createInitialState(0);
    expect(UPGRADE_BY_ID.gravityWell.isUnlocked(s)).toBe(false);
    s.run.phase = 'main';
    expect(UPGRADE_BY_ID.gravityWell.isUnlocked(s)).toBe(true);
    expect(UPGRADE_BY_ID.cnoCycle.isUnlocked(s)).toBe(false);
    s.run.heliumEverSeen = true;
    expect(UPGRADE_BY_ID.cnoCycle.isUnlocked(s)).toBe(true);
    expect(UPGRADE_BY_ID.photosphere.isUnlocked(s)).toBe(false);
    s.run.peakMass = 0.5;
    expect(UPGRADE_BY_ID.photosphere.isUnlocked(s)).toBe(true);
  });
});
