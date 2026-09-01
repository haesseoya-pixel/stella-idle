import { describe, expect, it } from 'vitest';
import { computeRates } from '@/game/economy';
import { evaluateAchievements } from '@/game/achievements';
import { createInitialState } from '@/game/state';
import { applyClick, simulate } from '@/game/tick';

describe('simulate', () => {
  it('integrates rates over 1s of 0.1s ticks (±0.5%)', () => {
    const s = createInitialState(0);
    s.run.mass = 1;
    s.run.phase = 'main';
    s.run.peakMass = 1;
    s.meta.bestMass = 1;
    evaluateAchievements(s, 0);
    const r0 = computeRates(s);
    for (let i = 0; i < 10; i++) simulate(s, 0.1, i * 100);
    expect(s.run.photons).toBeGreaterThan(r0.photons * 0.995);
    expect(s.run.photons).toBeLessThan(r0.photons * 1.01);
    expect(s.run.fuel).toBeCloseTo(1 - r0.fuelBurn, 4);
    expect(s.run.mass).toBeGreaterThan(1);
  });
  it('ignites exactly once at 0.08 and records codex', () => {
    const s = createInitialState(0);
    s.run.mass = 0.0799;
    let ignites = 0;
    for (let i = 0; i < 20; i++) {
      s.run.mass += 0.0001;
      for (const e of simulate(s, 0.1, i)) if (e.type === 'ignite') ignites++;
    }
    expect(ignites).toBe(1);
    expect(s.run.phase).toBe('main');
    expect(s.meta.codex.M).toBeDefined();
    expect(s.meta.codex.brown).toBeDefined();
  });
  it('enters giant phase when fuel hits zero and freezes mass', () => {
    const s = createInitialState(0);
    s.run.mass = 1;
    s.run.phase = 'main';
    s.run.fuel = 0.00001;
    const events = simulate(s, 0.1, 5);
    expect(events.some((e) => e.type === 'giant')).toBe(true);
    expect(s.run.phase).toBe('giant');
    expect(s.run.giantSince).toBe(5);
    const m = s.run.mass;
    simulate(s, 1, 6);
    expect(s.run.mass).toBe(m);
    expect(s.meta.codex.giant).toBeDefined();
  });
  it('emits typeChange with codex update', () => {
    const s = createInitialState(0);
    s.run.mass = 0.49;
    s.run.phase = 'main';
    s.run.lastTypeId = 'M';
    s.run.mass = 0.5;
    const events = simulate(s, 0.1, 1);
    const tc = events.find((e) => e.type === 'typeChange');
    expect(tc).toBeDefined();
    if (tc && tc.type === 'typeChange') {
      expect(tc.from).toBe('M');
      expect(tc.to).toBe('K');
    }
    expect(s.meta.codex.K).toBeDefined();
  });
  it('tribute fires every 300s per civilization', () => {
    const s = createInitialState(0);
    s.run.mass = 1;
    s.run.phase = 'main';
    s.run.planets.push({ id: 'p', seed: 1, name: 'x', kind: 'rocky', orbitIndex: 0, angle: 0, life: 400, tier: 2, civName: '루멘 교단' });
    let tributes = 0;
    for (let t = 0; t < 601; t++) for (const e of simulate(s, 1, t * 1000)) if (e.type === 'tribute') tributes++;
    expect(tributes).toBe(2);
  });
});

describe('applyClick', () => {
  it('adds mass in main phase and photons in giant phase', () => {
    const s = createInitialState(0);
    const r = applyClick(s, 0);
    expect(r.mass).toBeCloseTo(0.0004, 9);
    expect(s.run.mass).toBeCloseTo(0.0104, 9);
    expect(s.stats.totalClicks).toBe(1);
    expect(s.meta.achievements.firstBreath).toBeDefined();
    s.run.phase = 'giant';
    s.run.mass = 1;
    const before = s.run.photons;
    const r2 = applyClick(s, 1);
    expect(r2.mass).toBe(0);
    expect(r2.photons).toBeGreaterThan(0);
    expect(s.run.photons).toBeGreaterThan(before);
    expect(s.run.mass).toBe(1);
  });
  it('click can trigger ignition immediately', () => {
    const s = createInitialState(0);
    s.run.mass = 0.0799;
    const r = applyClick(s, 0);
    expect(r.events.some((e) => e.type === 'ignite')).toBe(true);
    expect(s.run.phase).toBe('main');
  });
});
