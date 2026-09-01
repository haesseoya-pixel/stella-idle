import type { GameState, MetalUpgradeId } from './state';
import { STARDUST_START_MASS } from './state';
import { costOf, costOfN } from './upgrades';

export interface MetalUpgradeDef {
  id: MetalUpgradeId;
  name: string;
  description: string;
  base: number;
  growth: number;
  max: number;
  effect: (level: number) => string;
}

const pct = (x: number) => `+${Math.round(x * 100)}%`;

export const METAL_UPGRADES: readonly MetalUpgradeDef[] = [
  { id: 'ironHeart', name: '철의 심장', description: '무거운 핵이 더 강한 중력으로 물질을 끌어당깁니다.', base: 5, growth: 2.0, max: 20, effect: (l) => `강착 ${pct(0.5 * l)}` },
  { id: 'carbonCatalyst', name: '탄소 촉매', description: '중원소가 핵융합 반응을 촉진합니다.', base: 5, growth: 2.0, max: 20, effect: (l) => `광자 ${pct(0.5 * l)}` },
  { id: 'siliconCrust', name: '규소 지각', description: '암석 행성을 만들 재료. 첫 레벨에서 생명 시스템이 열립니다.', base: 5, growth: 3.0, max: 6, effect: (l) => `암석 행성 ${l}개 허용` },
  { id: 'oxygenAtmo', name: '산소 대기', description: '숨 쉴 수 있는 공기. 생명이 빠르게 진화합니다.', base: 20, growth: 2.5, max: 10, effect: (l) => `생명 진화 속도 ${pct(0.3 * l)}` },
  { id: 'uraniumRod', name: '우라늄 연료봉', description: '핵융합 별에 핵분열 연료를? 물어보지 마세요.', base: 10, growth: 2.5, max: 10, effect: (l) => `연료 효율 ${pct(0.25 * l)}` },
  { id: 'timeCrystal', name: '시간 결정', description: '부재 중에도 별은 시간을 기억합니다.', base: 50, growth: 3.0, max: 4, effect: (l) => `오프라인 상한 ${8 + 2 * l}시간` },
  { id: 'stardustMemory', name: '별먼지 기억', description: '새 별이 이전 별의 기억을 품고 태어납니다.', base: 25, growth: 3.0, max: 5, effect: (l) => `시작 질량 ${(STARDUST_START_MASS[Math.min(l, 5)] ?? 0.01).toFixed(2)} M☉` },
];

export const METAL_UPGRADE_BY_ID: Record<MetalUpgradeId, MetalUpgradeDef> = Object.fromEntries(METAL_UPGRADES.map((u) => [u.id, u])) as Record<MetalUpgradeId, MetalUpgradeDef>;

export function metalCost(id: MetalUpgradeId, level: number): number {
  return costOf(METAL_UPGRADE_BY_ID[id], level);
}

export function buyMetalUpgrade(s: GameState, id: MetalUpgradeId, n = 1): number {
  const def = METAL_UPGRADE_BY_ID[id];
  const level = s.meta.metalUpgrades[id];
  const count = Math.min(n, Math.max(0, def.max - level));
  if (count <= 0) return 0;
  const cost = costOfN(def, level, count);
  if (s.meta.metals < cost) return 0;
  s.meta.metals -= cost;
  s.meta.metalUpgrades[id] = level + count;
  return count;
}
