import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, achievementBonuses, evaluateAchievements } from '@/game/achievements';
import { CODEX_IDS } from '@/game/constants';
import { createInitialState } from '@/game/state';

describe('achievements', () => {
  it('has 23 definitions with unique ids', () => {
    expect(ACHIEVEMENTS.length).toBe(23);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(23);
  });
  it('evaluate is idempotent and only unlocks satisfied ones', () => {
    const s = createInitialState(0);
    expect(evaluateAchievements(s, 1)).toEqual([]);
    s.stats.totalClicks = 1;
    expect(evaluateAchievements(s, 2)).toEqual(['firstBreath']);
    expect(evaluateAchievements(s, 3)).toEqual([]);
    expect(s.meta.achievements.firstBreath).toBe(2);
  });
  it('bonuses sum correctly', () => {
    const s = createInitialState(0);
    s.meta.achievements = { clicks1k: 1, clicks10k: 1, heavyEnd: 1, horizon: 1, goldRain: 1, fullCodex: 1, patience: 1, lighthouse: 1 };
    const b = achievementBonuses(s.meta);
    expect(b.photon).toBeCloseTo(0.16);
    expect(b.click).toBeCloseTo(0.35);
    expect(b.metal).toBeCloseTo(0.25);
    expect(b.accretion).toBeCloseTo(0.05);
    expect(b.offlineHours).toBe(1);
  });
  it('fullCodex needs all 14 entries', () => {
    const s = createInitialState(0);
    for (const id of CODEX_IDS.slice(0, 13)) s.meta.codex[id] = 1;
    expect(evaluateAchievements(s, 1)).not.toContain('fullCodex');
    s.meta.codex[CODEX_IDS[13]] = 1;
    expect(evaluateAchievements(s, 1)).toContain('fullCodex');
  });
});
