import { ECON, type CodexId, type FateId, type RemnantKind, type StellarTypeId } from './constants';
import type { Phase } from './stellar';
import { classify } from './stellar';

export const SAVE_VERSION = 1;

export type UpgradeId =
  | 'gravityWell'
  | 'nebulaCondense'
  | 'accretionDisk'
  | 'tidalCapture'
  | 'coreCompress'
  | 'convection'
  | 'cnoCycle'
  | 'heliumFlash'
  | 'photosphere'
  | 'protoDisk'
  | 'panspermia'
  | 'starWorship';

export const UPGRADE_IDS: readonly UpgradeId[] = [
  'gravityWell',
  'nebulaCondense',
  'accretionDisk',
  'tidalCapture',
  'coreCompress',
  'convection',
  'cnoCycle',
  'heliumFlash',
  'photosphere',
  'protoDisk',
  'panspermia',
  'starWorship',
];

export type MetalUpgradeId =
  | 'ironHeart'
  | 'carbonCatalyst'
  | 'siliconCrust'
  | 'oxygenAtmo'
  | 'uraniumRod'
  | 'timeCrystal'
  | 'stardustMemory';

export const METAL_UPGRADE_IDS: readonly MetalUpgradeId[] = [
  'ironHeart',
  'carbonCatalyst',
  'siliconCrust',
  'oxygenAtmo',
  'uraniumRod',
  'timeCrystal',
  'stardustMemory',
];

export type AchievementId =
  | 'firstBreath'
  | 'ignition'
  | 'sunSibling'
  | 'whiteLight'
  | 'blueGiant'
  | 'lighthouse'
  | 'clicks1k'
  | 'clicks10k'
  | 'photons1e8'
  | 'photons1e12'
  | 'photons1e16'
  | 'firstPlanet'
  | 'fullSystem'
  | 'lifeBegins'
  | 'worshippers'
  | 'starChildren'
  | 'dyson'
  | 'firstFate'
  | 'heavyEnd'
  | 'horizon'
  | 'goldRain'
  | 'patience'
  | 'fullCodex';

export type PlanetKind = 'gas' | 'rocky';
export type CivTier = 0 | 1 | 2 | 3 | 4;

export interface Planet {
  id: string;
  seed: number;
  name: string;
  kind: PlanetKind;
  orbitIndex: number;
  angle: number;
  life: number;
  tier: CivTier;
  civName?: string;
}

export interface Remnant {
  id: string;
  kind: RemnantKind;
  mass: number;
  metalsAtCreation: number;
  runIndex: number;
  createdAt: number;
  fromKilonova?: boolean;
}

export interface RunState {
  runIndex: number;
  startedAt: number;
  mass: number;
  photons: number;
  helium: number;
  fuel: number;
  phase: Phase;
  giantSince: number | null;
  upgrades: Record<UpgradeId, number>;
  slots: number;
  planets: Planet[];
  peakMass: number;
  photonsEarned: number;
  clicks: number;
  lastTypeId: StellarTypeId;
  tributeTimer: number;
  heliumEverSeen: boolean;
}

export interface MetaState {
  metals: number;
  metalsEarnedTotal: number;
  metalUpgrades: Record<MetalUpgradeId, number>;
  remnants: Remnant[];
  goldRelics: number;
  escapedCivs: number;
  totalPrestiges: number;
  bestMass: number;
  achievements: Partial<Record<AchievementId, number>>;
  codex: Partial<Record<CodexId, number>>;
  tutorialSeen: string[];
}

export interface Settings {
  sound: boolean;
  volume: number;
  ambient: boolean;
  particles: 'low' | 'medium' | 'high';
  reducedMotion: boolean;
  numberFormat: 'korean' | 'scientific';
  buyAmount: 1 | 10 | 'max';
}

export interface Stats {
  totalClicks: number;
  totalPhotons: number;
  totalHelium: number;
  playtimeSec: number;
  longestOfflineSec: number;
  offlineReturns: number;
  fatesSeen: Partial<Record<FateId, number>>;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastTick: number;
  lastSaved: number;
  run: RunState;
  meta: MetaState;
  settings: Settings;
  stats: Stats;
}

export function emptyUpgrades(): Record<UpgradeId, number> {
  const r = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) r[id] = 0;
  return r;
}

export function emptyMetalUpgrades(): Record<MetalUpgradeId, number> {
  const r = {} as Record<MetalUpgradeId, number>;
  for (const id of METAL_UPGRADE_IDS) r[id] = 0;
  return r;
}

export const STARDUST_START_MASS = [ECON.START_MASS, 0.08, 0.3, 0.6, 1.0, 1.5] as const;

export function startMassFor(meta: MetaState): number {
  const lv = Math.min(meta.metalUpgrades.stardustMemory, STARDUST_START_MASS.length - 1);
  return STARDUST_START_MASS[lv] ?? ECON.START_MASS;
}

export function createRunState(meta: MetaState, runIndex: number, now: number): RunState {
  const mass = startMassFor(meta);
  return {
    runIndex,
    startedAt: now,
    mass,
    photons: 0,
    helium: 0,
    fuel: 1,
    phase: mass >= ECON.IGNITION_MASS ? 'main' : 'cloud',
    giantSince: null,
    upgrades: emptyUpgrades(),
    slots: 0,
    planets: [],
    peakMass: mass,
    photonsEarned: 0,
    clicks: 0,
    lastTypeId: classify(mass).id,
    tributeTimer: 0,
    heliumEverSeen: false,
  };
}

export function createMetaState(now = Date.now()): MetaState {
  return {
    metals: 0,
    metalsEarnedTotal: 0,
    metalUpgrades: emptyMetalUpgrades(),
    remnants: [],
    goldRelics: 0,
    escapedCivs: 0,
    totalPrestiges: 0,
    bestMass: 0,
    achievements: {},
    codex: { brown: now },
    tutorialSeen: [],
  };
}

export function createSettings(): Settings {
  return {
    sound: true,
    volume: 0.6,
    ambient: true,
    particles: 'high',
    reducedMotion: false,
    numberFormat: 'korean',
    buyAmount: 1,
  };
}

export function createStats(): Stats {
  return {
    totalClicks: 0,
    totalPhotons: 0,
    totalHelium: 0,
    playtimeSec: 0,
    longestOfflineSec: 0,
    offlineReturns: 0,
    fatesSeen: {},
  };
}

export function createInitialState(now = Date.now()): GameState {
  const meta = createMetaState(now);
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    lastSaved: now,
    run: createRunState(meta, 1, now),
    meta,
    settings: createSettings(),
    stats: createStats(),
  };
}

export function remnantCount(meta: MetaState, kind: RemnantKind): number {
  let n = 0;
  for (const r of meta.remnants) if (r.kind === kind) n++;
  return n;
}

export function achievementCount(meta: MetaState): number {
  return Object.keys(meta.achievements).length;
}
