import { describe, expect, it } from 'vitest';
import { classify, fateFor, temperatureOf, visualRadius } from '@/game/stellar';

describe('classify', () => {
  it('thresholds', () => {
    expect(classify(0.01).id).toBe('brown');
    expect(classify(0.079).id).toBe('brown');
    expect(classify(0.08).id).toBe('M');
    expect(classify(0.499).id).toBe('M');
    expect(classify(0.5).id).toBe('K');
    expect(classify(0.8).id).toBe('G');
    expect(classify(1.2).id).toBe('F');
    expect(classify(2.1).id).toBe('B');
    expect(classify(15.99).id).toBe('B');
    expect(classify(16).id).toBe('O');
    expect(classify(500).id).toBe('O');
  });
});

describe('temperatureOf', () => {
  it('is monotonic in mass', () => {
    let prev = 0;
    for (let m = 0.01; m < 60; m *= 1.1) {
      const t = temperatureOf(m);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });
  it('hits anchors', () => {
    expect(temperatureOf(0.08)).toBeCloseTo(3000, 0);
    expect(temperatureOf(1.2)).toBeCloseTo(6300, 0);
    expect(temperatureOf(1000)).toBe(45000);
    expect(temperatureOf(5, 'giant')).toBe(3500);
  });
});

describe('visualRadius / fateFor', () => {
  it('clamps radius', () => {
    expect(visualRadius(0.0001)).toBe(0.3);
    expect(visualRadius(1)).toBe(1);
    expect(visualRadius(1e6)).toBe(3.2);
    expect(visualRadius(1, 'giant')).toBeCloseTo(1.8);
  });
  it('fates by mass', () => {
    expect(fateFor(7.99).id).toBe('whiteDwarf');
    expect(fateFor(8).id).toBe('neutronStar');
    expect(fateFor(20).id).toBe('neutronStar');
    expect(fateFor(20.01).id).toBe('blackHole');
  });
});
