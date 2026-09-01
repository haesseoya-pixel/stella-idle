import { ACHIEVEMENT_PHOTON_BONUS, CODEX_IDS } from './constants';
import type { AchievementId, GameState, MetaState } from './state';
import { remnantCount } from './state';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  reward: string;
  check: (s: GameState) => boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'firstBreath', name: '첫 숨결', description: '처음으로 수소를 끌어모았다.', reward: '광자 +2%', check: (s) => s.stats.totalClicks >= 1 },
  { id: 'ignition', name: '점화!', description: '0.08 M☉에 도달해 핵융합을 시작했다.', reward: '광자 +2%', check: (s) => s.meta.bestMass >= 0.08 || s.run.peakMass >= 0.08 },
  { id: 'sunSibling', name: '태양의 형제', description: '황색 왜성이 되었다.', reward: '광자 +2%', check: (s) => Math.max(s.meta.bestMass, s.run.peakMass) >= 0.8 },
  { id: 'whiteLight', name: '백색의 빛', description: '백색 별이 되었다.', reward: '광자 +2%', check: (s) => Math.max(s.meta.bestMass, s.run.peakMass) >= 1.2 },
  { id: 'blueGiant', name: '푸른 거인', description: '청백색 별이 되었다.', reward: '광자 +2%', check: (s) => Math.max(s.meta.bestMass, s.run.peakMass) >= 2.1 },
  { id: 'lighthouse', name: '우주의 등대', description: '청색 별이 되었다.', reward: '광자 +2%, 강착 +5%', check: (s) => Math.max(s.meta.bestMass, s.run.peakMass) >= 16 },
  { id: 'clicks1k', name: '천 번의 손길', description: '1,000번 클릭했다.', reward: '광자 +2%, 클릭 +10%', check: (s) => s.stats.totalClicks >= 1000 },
  { id: 'clicks10k', name: '만 번의 손길', description: '10,000번 클릭했다.', reward: '광자 +2%, 클릭 +25%', check: (s) => s.stats.totalClicks >= 10000 },
  { id: 'photons1e8', name: '억 개의 광자', description: '누적 광자 1억.', reward: '광자 +2%', check: (s) => s.stats.totalPhotons >= 1e8 },
  { id: 'photons1e12', name: '조 개의 광자', description: '누적 광자 1조.', reward: '광자 +2%', check: (s) => s.stats.totalPhotons >= 1e12 },
  { id: 'photons1e16', name: '경 개의 광자', description: '누적 광자 1경.', reward: '광자 +2%', check: (s) => s.stats.totalPhotons >= 1e16 },
  { id: 'firstPlanet', name: '첫 행성', description: '행성을 하나 만들었다.', reward: '광자 +2%', check: (s) => s.run.planets.length >= 1 },
  { id: 'fullSystem', name: '만원 행성계', description: '행성 6개를 거느렸다.', reward: '광자 +2%', check: (s) => s.run.planets.length >= 6 },
  { id: 'lifeBegins', name: '생명의 탄생', description: '행성에 미생물이 나타났다.', reward: '광자 +2%', check: (s) => s.run.planets.some((p) => p.tier >= 1) },
  { id: 'worshippers', name: '우리를 섬기는 자들', description: '문명이 당신을 신으로 섬기기 시작했다.', reward: '광자 +2%', check: (s) => s.run.planets.some((p) => p.tier >= 2) },
  { id: 'starChildren', name: '별의 자식들', description: '문명이 우주로 나아갔다.', reward: '광자 +2%', check: (s) => s.run.planets.some((p) => p.tier >= 3) },
  { id: 'dyson', name: '태양을 감싸다', description: '다이슨 스웜이 완성되었다.', reward: '광자 +2%', check: (s) => s.run.planets.some((p) => p.tier >= 4) },
  { id: 'firstFate', name: '운명을 맞이하다', description: '처음으로 별의 죽음을 지켜봤다.', reward: '광자 +2%', check: (s) => s.meta.totalPrestiges >= 1 },
  { id: 'heavyEnd', name: '무거운 결말', description: '중성자별을 남겼다.', reward: '광자 +2%, 금속 +5%', check: (s) => remnantCount(s.meta, 'ns') >= 1 || (s.stats.fatesSeen.neutronStar ?? 0) >= 1 },
  { id: 'horizon', name: '사건의 지평선', description: '블랙홀을 남겼다.', reward: '광자 +2%, 금속 +5%', check: (s) => remnantCount(s.meta, 'bh') >= 1 || (s.stats.fatesSeen.blackHole ?? 0) >= 1 },
  { id: 'goldRain', name: '황금 비', description: '킬로노바를 일으켰다.', reward: '광자 +2%, 금속 +5%', check: (s) => s.meta.goldRelics >= 1 },
  { id: 'patience', name: '오래 기다렸어요', description: '4시간 이상 자리를 비웠다 돌아왔다.', reward: '광자 +2%, 오프라인 상한 +1시간', check: (s) => s.stats.longestOfflineSec >= 4 * 3600 },
  { id: 'fullCodex', name: '완전한 도감', description: '도감 14항목을 모두 채웠다.', reward: '광자 +2%, 금속 +10%', check: (s) => CODEX_IDS.every((id) => s.meta.codex[id] !== undefined) },
];

export const ACHIEVEMENT_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<AchievementId, AchievementDef>;

export interface AchievementBonuses {
  photon: number; // additive fraction
  click: number;
  accretion: number;
  metal: number;
  offlineHours: number;
}

export function achievementBonuses(meta: MetaState): AchievementBonuses {
  const has = (id: AchievementId) => meta.achievements[id] !== undefined;
  const count = Object.keys(meta.achievements).length;
  return {
    photon: ACHIEVEMENT_PHOTON_BONUS * count,
    click: (has('clicks1k') ? 0.1 : 0) + (has('clicks10k') ? 0.25 : 0),
    accretion: has('lighthouse') ? 0.05 : 0,
    metal: (has('heavyEnd') ? 0.05 : 0) + (has('horizon') ? 0.05 : 0) + (has('goldRain') ? 0.05 : 0) + (has('fullCodex') ? 0.1 : 0),
    offlineHours: has('patience') ? 1 : 0,
  };
}

/** Unlocks any newly satisfied achievements; returns their ids. */
export function evaluateAchievements(s: GameState, now: number): AchievementId[] {
  const unlocked: AchievementId[] = [];
  for (const a of ACHIEVEMENTS) {
    if (s.meta.achievements[a.id] !== undefined) continue;
    if (a.check(s)) {
      s.meta.achievements[a.id] = now;
      unlocked.push(a.id);
    }
  }
  return unlocked;
}
