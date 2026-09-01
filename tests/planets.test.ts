import { describe, expect, it } from 'vitest';
import { civEffects, computeRates } from '@/game/economy';
import { advancePlanets, buyGas, buyRocky, canBuyRocky, gasCost, hasFreeSlot, rockyCost, tierFor } from '@/game/planets';
import { createInitialState } from '@/game/state';

describe('planet purchases', () => {
  it('needs slots and photons', () => {
    const s = createInitialState(0);
    s.run.photons = 1e9;
    expect(hasFreeSlot(s)).toBe(false);
    expect(buyGas(s, 1)).toBeNull();
    s.run.slots = 1;
    const p = buyGas(s, 1);
    expect(p?.kind).toBe('gas');
    expect(p?.orbitIndex).toBe(0);
    expect(s.run.photons).toBeCloseTo(1e9 - 5000);
    expect(gasCost(s).photons).toBe(15000);
    expect(buyGas(s, 2)).toBeNull(); // no free slot
  });
  it('rocky planets require silicon crust and metals', () => {
    const s = createInitialState(0);
    s.run.photons = 1e9;
    s.run.slots = 6;
    expect(canBuyRocky(s)).toBe(false);
    s.meta.metalUpgrades.siliconCrust = 1;
    expect(canBuyRocky(s)).toBe(false); // no metals
    s.meta.metals = 5;
    expect(canBuyRocky(s)).toBe(true);
    const p = buyRocky(s, 3);
    expect(p?.kind).toBe('rocky');
    expect(s.meta.metals).toBe(0);
    expect(rockyCost(s)).toEqual({ photons: 60000, metals: 10 });
    s.meta.metals = 100;
    expect(canBuyRocky(s)).toBe(false); // crust allows only 1
  });
  it('caps at 6 slots', () => {
    const s = createInitialState(0);
    s.run.photons = 1e12;
    s.run.slots = 99;
    for (let i = 0; i < 8; i++) buyGas(s, i);
    expect(s.run.planets.length).toBe(6);
  });
});

describe('life and tiers', () => {
  it('tier thresholds', () => {
    expect(tierFor(0)).toBe(0);
    expect(tierFor(100)).toBe(1);
    expect(tierFor(399)).toBe(1);
    expect(tierFor(400)).toBe(2);
    expect(tierFor(1200)).toBe(3);
    expect(tierFor(3000)).toBe(4);
  });
  it('rocky planets evolve with habitability and emit tier events', () => {
    const s = createInitialState(0);
    s.run.mass = 1;
    s.run.phase = 'main';
    s.run.planets.push({ id: 'r', seed: 5, name: 'r', kind: 'rocky', orbitIndex: 0, angle: 0, life: 0, tier: 0 });
    s.run.planets.push({ id: 'g', seed: 6, name: 'g', kind: 'gas', orbitIndex: 1, angle: 0, life: 0, tier: 0 });
    const rates = computeRates(s);
    let events = advancePlanets(s, 99, rates);
    expect(events.length).toBe(0);
    events = advancePlanets(s, 1, rates);
    expect(events.length).toBe(1);
    expect(events[0]?.tier).toBe(1);
    expect(s.run.planets[1]?.life).toBe(0);
    advancePlanets(s, 300, rates);
    expect(s.run.planets[0]?.tier).toBe(2);
    expect(s.run.planets[0]?.civName).toBeTruthy();
  });
  it('M-type stars halve life speed, giant halves again', () => {
    const s = createInitialState(0);
    s.run.mass = 0.2;
    s.run.phase = 'main';
    s.run.planets.push({ id: 'r', seed: 5, name: 'r', kind: 'rocky', orbitIndex: 0, angle: 0, life: 0, tier: 0 });
    advancePlanets(s, 10, computeRates(s));
    expect(s.run.planets[0]?.life).toBeCloseTo(5);
    s.run.phase = 'giant';
    advancePlanets(s, 10, computeRates(s));
    expect(s.run.planets[0]?.life).toBeCloseTo(7.5);
  });
  it('civ effects and dyson multiplier', () => {
    const s = createInitialState(0);
    s.run.planets.push({ id: 'a', seed: 1, name: 'a', kind: 'rocky', orbitIndex: 0, angle: 0, life: 5000, tier: 4 });
    s.run.planets.push({ id: 'b', seed: 2, name: 'b', kind: 'rocky', orbitIndex: 1, angle: 0, life: 5000, tier: 4 });
    const c = civEffects(s.run);
    expect(c.dysonCount).toBe(2);
    expect(c.dysonMult).toBe(5);
    expect(c.photonMult).toBeCloseTo(1.4 * 1.4);
    expect(c.heliumMult).toBeCloseTo(1.25 * 1.25);
  });
});
