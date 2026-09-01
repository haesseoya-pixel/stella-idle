import { ECON } from './constants';
import type { GameState, UpgradeId } from './state';

export type Currency = 'photons' | 'helium';
export type UpgradeTab = 'accretion' | 'fusion' | 'planets';

export interface UpgradeDef {
  id: UpgradeId;
  tab: UpgradeTab;
  name: string;
  description: string;
  base: number;
  growth: number;
  max: number; // Infinity for unbounded
  currency: Currency;
  /** Human-readable effect at a given level. */
  effect: (level: number) => string;
  unlockHint: string;
  isUnlocked: (s: GameState) => boolean;
}

const pct = (x: number) => `+${Math.round(x * 100)}%`;

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'gravityWell',
    tab: 'accretion',
    name: '중력 우물',
    description: '클릭 한 번에 끌어오는 수소가 늘어납니다. 10레벨마다 두 배.',
    base: 10,
    growth: 1.15,
    max: Infinity,
    currency: 'photons',
    effect: (l) => `클릭 ×${((1 + 0.5 * l) * Math.pow(2, Math.floor(l / 10))).toFixed(1)}`,
    unlockHint: '점화 필요',
    isUnlocked: (s) => s.run.phase !== 'cloud',
  },
  {
    id: 'nebulaCondense',
    tab: 'accretion',
    name: '성운 응축',
    description: '주변 분자운이 짙어져 저절로 흘러드는 수소가 늘어납니다.',
    base: 25,
    growth: 1.18,
    max: Infinity,
    currency: 'photons',
    effect: (l) => `기본 강착 +${(0.0003 * l).toFixed(4)} M☉/s`,
    unlockHint: '점화 필요',
    isUnlocked: (s) => s.run.phase !== 'cloud',
  },
  {
    id: 'accretionDisk',
    tab: 'accretion',
    name: '강착 원반',
    description: '회전하는 원반이 물질을 효율적으로 별로 나릅니다.',
    base: 200,
    growth: 1.6,
    max: 20,
    currency: 'photons',
    effect: (l) => `모든 강착 ${pct(0.3 * l)}`,
    unlockHint: '점화 필요',
    isUnlocked: (s) => s.run.phase !== 'cloud',
  },
  {
    id: 'tidalCapture',
    tab: 'accretion',
    name: '조석 포획',
    description: '클릭할 때마다 지나가던 가스 덩어리를 붙잡습니다.',
    base: 500,
    growth: 2.0,
    max: 10,
    currency: 'photons',
    effect: (l) => `클릭당 강착 ${(0.2 * l).toFixed(1)}초분 추가`,
    unlockHint: '강착 원반 1레벨',
    isUnlocked: (s) => s.run.upgrades.accretionDisk >= 1,
  },
  {
    id: 'coreCompress',
    tab: 'fusion',
    name: '핵 압축',
    description: '핵의 압력이 높아져 핵융합이 활발해집니다.',
    base: 50,
    growth: 1.25,
    max: Infinity,
    currency: 'photons',
    effect: (l) => `광자 ${pct(0.25 * l)}`,
    unlockHint: '점화 필요',
    isUnlocked: (s) => s.run.phase !== 'cloud',
  },
  {
    id: 'convection',
    tab: 'fusion',
    name: '대류층 순환',
    description: '융합 산물인 헬륨을 더 많이 걷어 올립니다.',
    base: 80,
    growth: 1.3,
    max: 25,
    currency: 'photons',
    effect: (l) => `헬륨 ${pct(0.2 * l)}`,
    unlockHint: '핵 압축 1레벨',
    isUnlocked: (s) => s.run.upgrades.coreCompress >= 1,
  },
  {
    id: 'cnoCycle',
    tab: 'fusion',
    name: 'CNO 순환',
    description: '탄소·질소·산소를 촉매로 써서 연료를 아낍니다.',
    base: 100,
    growth: 1.5,
    max: 15,
    currency: 'helium',
    effect: (l) => `연료 효율 ${pct(0.2 * l)}`,
    unlockHint: '헬륨 획득',
    isUnlocked: (s) => s.run.heliumEverSeen,
  },
  {
    id: 'heliumFlash',
    tab: 'fusion',
    name: '헬륨 섬광',
    description: '쌓인 헬륨이 순간적으로 타오르며 광도를 끌어올립니다.',
    base: 50,
    growth: 2.2,
    max: 10,
    currency: 'helium',
    effect: (l) => `광자 ${pct(0.5 * l)}`,
    unlockHint: '헬륨 획득',
    isUnlocked: (s) => s.run.heliumEverSeen,
  },
  {
    id: 'photosphere',
    tab: 'fusion',
    name: '광구 확장',
    description: '빛을 내는 표면이 넓어집니다. 광자 배율이 곱해집니다.',
    base: 1000,
    growth: 4.0,
    max: 8,
    currency: 'photons',
    effect: (l) => `광자 ×${Math.pow(1.5, l).toFixed(2)}`,
    unlockHint: '질량 0.5 M☉',
    isUnlocked: (s) => s.run.peakMass >= 0.5,
  },
  {
    id: 'protoDisk',
    tab: 'planets',
    name: '원시 행성 원반',
    description: '별 주위의 먼지가 뭉쳐 행성이 태어날 자리가 생깁니다.',
    base: 2000,
    growth: 6.0,
    max: 6,
    currency: 'photons',
    effect: (l) => `행성 슬롯 ${l}개`,
    unlockHint: '질량 0.3 M☉',
    isUnlocked: (s) => s.run.peakMass >= 0.3,
  },
  {
    id: 'panspermia',
    tab: 'planets',
    name: '생명의 씨앗',
    description: '혜성에 실려 온 유기물이 생명의 진화를 재촉합니다.',
    base: 500,
    growth: 3.0,
    max: 5,
    currency: 'helium',
    effect: (l) => `생명 진화 속도 ${pct(0.5 * l)}`,
    unlockHint: '암석 행성 보유',
    isUnlocked: (s) => s.run.planets.some((p) => p.kind === 'rocky'),
  },
  {
    id: 'starWorship',
    tab: 'planets',
    name: '항성 숭배',
    description: '문명이 당신을 신으로 섬깁니다. 공물이 늘어나고 티어 보너스가 커집니다.',
    base: 100000,
    growth: 3.0,
    max: 10,
    currency: 'photons',
    effect: (l) => `공물 ${pct(0.25 * l)}, 티어 보너스 ${pct(0.05 * l)}`,
    unlockHint: '문명 등장',
    isUnlocked: (s) => s.run.planets.some((p) => p.tier >= 2),
  },
];

export const UPGRADE_BY_ID: Record<UpgradeId, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<UpgradeId, UpgradeDef>;

export function costOf(def: { base: number; growth: number }, level: number): number {
  return def.base * Math.pow(def.growth, level);
}

/** Total cost of buying n levels starting at `level`. */
export function costOfN(def: { base: number; growth: number }, level: number, n: number): number {
  if (n <= 0) return 0;
  const g = def.growth;
  if (Math.abs(g - 1) < 1e-9) return def.base * n;
  return (def.base * Math.pow(g, level) * (Math.pow(g, n) - 1)) / (g - 1);
}

/** Maximum levels affordable with `budget` starting at `level`, capped by `maxLevel`. */
export function maxAffordable(def: { base: number; growth: number; max: number }, level: number, budget: number): number {
  const remaining = def.max === Infinity ? Infinity : Math.max(0, def.max - level);
  if (remaining === 0 || budget <= 0) return 0;
  const g = def.growth;
  const first = costOf(def, level);
  if (budget < first) return 0;
  let n: number;
  if (Math.abs(g - 1) < 1e-9) {
    n = Math.floor(budget / def.base);
  } else {
    n = Math.floor(Math.log(1 + (budget * (g - 1)) / first) / Math.log(g));
  }
  // guard rounding: ensure we don't overspend and don't undercount by one
  while (n > 0 && costOfN(def, level, n) > budget) n--;
  while (costOfN(def, level, n + 1) <= budget) n++;
  return Math.min(n, remaining);
}

export function affordableCount(s: GameState, def: UpgradeDef, amount: 1 | 10 | 'max'): number {
  const level = s.run.upgrades[def.id];
  const budget = def.currency === 'photons' ? s.run.photons : s.run.helium;
  const cap = def.max === Infinity ? Infinity : Math.max(0, def.max - level);
  if (amount === 'max') return maxAffordable(def, level, budget);
  const want = Math.min(amount, cap);
  return costOfN(def, level, want) <= budget ? want : 0;
}

export function buyUpgrade(s: GameState, id: UpgradeId, n: number): number {
  const def = UPGRADE_BY_ID[id];
  const level = s.run.upgrades[id];
  const cap = def.max === Infinity ? Infinity : Math.max(0, def.max - level);
  const count = Math.min(n, cap);
  if (count <= 0) return 0;
  const cost = costOfN(def, level, count);
  if (def.currency === 'photons') {
    if (s.run.photons < cost) return 0;
    s.run.photons -= cost;
  } else {
    if (s.run.helium < cost) return 0;
    s.run.helium -= cost;
  }
  s.run.upgrades[id] = level + count;
  if (id === 'protoDisk') s.run.slots = s.run.upgrades.protoDisk;
  return count;
}

export const CLICK_CAP = ECON.CLICK_RATE_CAP;
