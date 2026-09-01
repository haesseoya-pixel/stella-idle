import { describe, expect, it } from 'vitest';
import { offlineCap, simulateOffline } from '@/game/offline';
import { createInitialState } from '@/game/state';
import { simulate } from '@/game/tick';

describe('offline progress', () => {
  it('applies the cap and time crystal', () => {
    const s = createInitialState(0);
    expect(offlineCap(s)).toBe(8 * 3600);
    s.meta.metalUpgrades.timeCrystal = 2;
    expect(offlineCap(s)).toBe(12 * 3600);
    s.meta.achievements.patience = 1;
    expect(offlineCap(s)).toBe(13 * 3600);
    const r = simulateOffline(s, 100 * 3600, 0);
    expect(r.capped).toBe(true);
    expect(r.elapsed).toBe(13 * 3600);
  });
  it('negative or NaN elapsed does nothing', () => {
    const s = createInitialState(0);
    s.run.mass = 1;
    s.run.phase = 'main';
    const r = simulateOffline(s, -100, 0);
    expect(r.elapsed).toBe(0);
    expect(r.photons).toBe(0);
    expect(simulateOffline(s, NaN, 0).elapsed).toBe(0);
  });
  it('equals running simulate directly at 1s steps', () => {
    const a = createInitialState(0);
    a.run.mass = 1;
    a.run.phase = 'main';
    const b = createInitialState(0);
    b.run.mass = 1;
    b.run.phase = 'main';
    const r = simulateOffline(a, 120.5, 0);
    for (let t = 0; t < 120; t++) simulate(b, 1, (t + 1) * 1000);
    simulate(b, 0.5, 120500);
    expect(r.photons).toBeCloseTo(b.run.photons, 6);
    expect(a.run.mass).toBeCloseTo(b.run.mass, 9);
    expect(a.run.fuel).toBeCloseTo(b.run.fuel, 9);
  });
  it('handles a giant transition mid-offline (×3 only afterwards)', () => {
    const s = createInitialState(0);
    s.run.mass = 1;
    s.run.phase = 'main';
    s.run.fuel = 10 / 800; // ~10 seconds of fuel
    const r = simulateOffline(s, 20, 0);
    expect(r.phaseBefore).toBe('main');
    expect(r.phaseAfter).toBe('giant');
    expect(r.events.some((e) => e.type === 'giant')).toBe(true);
    // roughly 10s at 1x + 10s at 3x → 40 units vs 20 if no boost
    const perSec = r.photons / 20;
    expect(perSec).toBeGreaterThan(518 * 1.8);
    expect(perSec).toBeLessThan(518 * 2.2);
  });
  it('16h completes quickly', () => {
    const s = createInitialState(0);
    s.run.mass = 3;
    s.run.phase = 'main';
    s.meta.metalUpgrades.timeCrystal = 4;
    const t0 = performance.now();
    const r = simulateOffline(s, 16 * 3600, 0);
    const ms = performance.now() - t0;
    expect(r.elapsed).toBe(16 * 3600);
    expect(ms).toBeLessThan(1500);
  });
});
