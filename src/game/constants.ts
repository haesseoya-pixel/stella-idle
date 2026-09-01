export const SAVE_KEY = 'stella-idle:save';
export const BACKUP_KEY_PREFIX = 'stella-idle:backup:v';
export const TICK = 0.1; // seconds per simulation tick
export const MAX_TICKS_PER_FRAME = 50;
export const AUTOSAVE_INTERVAL = 10; // seconds

export const ECON = {
  START_MASS: 0.01,
  IGNITION_MASS: 0.08,
  CLICK_BASE: 0.0004,
  ACC_BASE: 0.0003,
  L0: 2,
  LUM_EXP: 2.2,
  HE_PER_PHOTON: 0.01,
  CLOUD_LUM_FACTOR: 0.1,
  GIANT_PHOTON_MULT: 3,
  GIANT_CLICK_SECONDS: 0.5,
  CLICK_RATE_CAP: 25,
} as const;

export const FUEL = {
  T0: 800,
  MASS_EXP: 1.0,
} as const;

export const PRESTIGE = {
  BASE: 10,
  MASS_EXP: 1.5,
  FATE_MULT: { whiteDwarf: 1, neutronStar: 4, blackHole: 8 } as const,
  NS_MIN_MASS: 8,
  BH_MIN_MASS: 20,
  DYSON_BONUS: 0.25,
  ESCAPED_CIV_BONUS: 0.05,
  ESCAPED_CIV_CAP: 10,
  BH_REMNANT_BONUS: 0.15,
  GOLD_RELIC_BONUS: 0.2,
  WD_PHOTON_BONUS: 0.05,
  WD_CAP: 20,
  NS_ACCRETION_BONUS: 0.1,
  NS_CAP: 10,
  FIRST_BH_PHOTON_MULT: 1.5,
  METAL_MULT_COEF: 0.02,
  METAL_MULT_EXP: 0.7,
} as const;

export const PLANETS = {
  MAX_SLOTS: 6,
  GAS_BASE_COST: 5000,
  GAS_COST_GROWTH: 3,
  ROCKY_BASE_COST: 20000,
  ROCKY_COST_GROWTH: 3,
  ROCKY_METAL_BASE: 5,
  ROCKY_METAL_GROWTH: 2,
  GAS_ACCRETION_BONUS: 0.15,
  LIFE_BASE_RATE: 1,
  TIER_LP: [100, 400, 1200, 3000] as const,
  TIER_PHOTON_BONUS: [0, 0.05, 0.15, 0.4, 0.4] as const,
  TIER3_HELIUM_BONUS: 0.25,
  DYSON_MULT_PER: 2,
  TRIBUTE_INTERVAL: 300,
  TRIBUTE_SECONDS: 60,
  HABITABILITY: { brown: 0, M: 0.5, K: 1, G: 1, F: 0.7, B: 0.25, O: 0.1 } as const,
} as const;

export const OFFLINE = {
  BASE_CAP: 8 * 3600,
  TIME_CRYSTAL_HOURS: 2,
  MIN_ELAPSED: 5,
  TOAST_THRESHOLD: 60,
  MODAL_THRESHOLD: 300,
  STEP: 1,
} as const;

export const ACHIEVEMENT_PHOTON_BONUS = 0.02;

export type StellarTypeId = 'brown' | 'M' | 'K' | 'G' | 'F' | 'B' | 'O';

export interface StellarType {
  id: StellarTypeId;
  minMass: number;
  name: string;
  temperature: number;
  rgb: [number, number, number];
  relRadius: number;
  flavor: string;
  order: number;
}

export const STELLAR_TYPES: readonly StellarType[] = [
  { id: 'brown', minMass: 0, name: '갈색 왜성', temperature: 1500, rgb: [150, 50, 60], relRadius: 0.3, order: 0, flavor: '아직 별이 아닙니다. 조금만 더 먹이면…' },
  { id: 'M', minMass: 0.08, name: '적색 왜성', temperature: 3000, rgb: [255, 180, 107], relRadius: 0.4, order: 1, flavor: '우주에서 가장 흔한 별. 수조 년을 삽니다. 게임에선 아니지만.' },
  { id: 'K', minMass: 0.5, name: '주황색 왜성', temperature: 4500, rgb: [255, 219, 186], relRadius: 0.75, order: 2, flavor: '안정적이고 오래 사는, 생명이 살기 좋은 별.' },
  { id: 'G', minMass: 0.8, name: '황색 왜성', temperature: 5800, rgb: [255, 243, 231], relRadius: 1.0, order: 3, flavor: '태양과 같은 별. 어딘가에서 누군가 일광욕 중.' },
  { id: 'F', minMass: 1.2, name: '백색 별', temperature: 7500, rgb: [235, 238, 255], relRadius: 1.4, order: 4, flavor: '눈부시게 하얀 빛. 선글라스 필수.' },
  { id: 'B', minMass: 2.1, name: '청백색 별', temperature: 15000, rgb: [183, 203, 255], relRadius: 2.2, order: 5, flavor: '짧고 굵게. 수명이 급격히 줄어듭니다.' },
  { id: 'O', minMass: 16, name: '청색 별', temperature: 35000, rgb: [155, 184, 255], relRadius: 3.2, order: 6, flavor: '은하의 등대. 곧 장렬한 최후를 맞이할 운명.' },
];

export const GIANT_INFO = {
  name: '적색 거성',
  temperature: 3500,
  rgb: [255, 160, 90] as [number, number, number],
  flavor: '연료 소진. 부풀어 오르며 마지막 빛을 냅니다.',
  flavorLight: '이론상 수조 년이 걸리지만, 게임이니까요.',
};

/** Temperature anchors in (mass, kelvin), interpolated linearly in log(mass). */
export const TEMP_ANCHORS: readonly [number, number][] = [
  [0.01, 1200],
  [0.08, 3000],
  [0.5, 4500],
  [0.8, 5300],
  [1.2, 6300],
  [2.1, 9000],
  [16, 30000],
  [50, 45000],
];

export type FateId = 'whiteDwarf' | 'neutronStar' | 'blackHole';
export type RemnantKind = 'wd' | 'ns' | 'bh';

export interface FateInfo {
  id: FateId;
  name: string;
  event: string;
  remnantKind: RemnantKind;
  description: string;
}

export const FATES: Record<FateId, FateInfo> = {
  whiteDwarf: { id: 'whiteDwarf', name: '백색 왜성', event: '행성상 성운', remnantKind: 'wd', description: '바깥층을 아름다운 성운으로 날려 보내고, 뜨거운 핵만 남습니다.' },
  neutronStar: { id: 'neutronStar', name: '중성자별', event: '초신성', remnantKind: 'ns', description: '핵이 붕괴하며 초신성 폭발. 도시 크기의 초고밀도 천체가 남습니다.' },
  blackHole: { id: 'blackHole', name: '블랙홀', event: '초신성', remnantKind: 'bh', description: '중력이 모든 것을 이깁니다. 빛조차 탈출하지 못하는 특이점.' },
};

export const REMNANT_NAMES: Record<RemnantKind, string> = { wd: '백색 왜성', ns: '중성자별', bh: '블랙홀' };

export const CIV_NAME_PREFIX = ['루멘', '헬리오', '아스트라', '솔라', '포톤'] as const;
export const CIV_NAME_SUFFIX = ['교단', '연방', '제국', '공화국'] as const;
export const PLANET_NAME_PREFIX = ['케플러', '트라피스트', '글리제', '프록시마', '타우', '볼프', '로스', '테가르덴'] as const;

export const TIER_NAMES = ['불모', '미생물', '문명', '우주 진출', '다이슨 스웜'] as const;

export const CODEX_IDS = ['brown', 'M', 'K', 'G', 'F', 'B', 'O', 'giant', 'wd', 'ns', 'bh', 'kilonova', 'nebula', 'supernova'] as const;
export type CodexId = (typeof CODEX_IDS)[number];

export const CODEX_INFO: Record<CodexId, { name: string; text: string }> = {
  brown: { name: '갈색 왜성', text: '핵융합에 실패한 별. 중수소만 조금 태우며 희미하게 빛납니다.' },
  M: { name: '적색 왜성', text: '작고 붉고 검소한 별. 연료를 아껴 써서 우주 나이보다 오래 삽니다.' },
  K: { name: '주황색 왜성', text: '태양보다 조금 작고 차분한 별. 생명 거주 가능성이 높다고 평가됩니다.' },
  G: { name: '황색 왜성', text: '태양의 분류. 약 100억 년을 살며, 그중 46억 년을 이미 썼습니다.' },
  F: { name: '백색 별', text: '태양보다 뜨겁고 밝은 별. 수명은 수십억 년으로 짧아집니다.' },
  B: { name: '청백색 별', text: '태양 질량의 수 배. 몇천만 년 안에 연료를 다 씁니다.' },
  O: { name: '청색 별', text: '가장 뜨겁고 무거운 별. 수백만 년의 짧고 찬란한 삶.' },
  giant: { name: '적색 거성', text: '핵의 수소가 바닥나면 바깥층이 부풀어 오릅니다. 태양은 이때 지구를 삼킬지도.' },
  wd: { name: '백색 왜성', text: '지구 크기에 태양 질량. 식어 가는 별의 시체. 티스푼 하나가 몇 톤.' },
  ns: { name: '중성자별', text: '반지름 10km에 태양 질량. 1초에 수백 번 자전하기도 합니다.' },
  bh: { name: '블랙홀', text: '사건의 지평선 너머에서는 시간이 다르게 흐릅니다… 라고 우기는 중.' },
  kilonova: { name: '킬로노바', text: '중성자별 두 개가 충돌하면 우주의 금과 백금이 여기서 만들어집니다.' },
  nebula: { name: '행성상 성운', text: '죽어 가는 별이 남긴 빛나는 가스 껍질. 행성과는 아무 상관 없는 이름.' },
  supernova: { name: '초신성', text: '한 별이 은하 전체만큼 밝아지는 순간. 무거운 원소가 우주로 흩어집니다.' },
};
