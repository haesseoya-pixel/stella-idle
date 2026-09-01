import { BACKUP_KEY_PREFIX, CODEX_IDS, SAVE_KEY, type CodexId } from '@/game/constants';
import {
  METAL_UPGRADE_IDS,
  SAVE_VERSION,
  UPGRADE_IDS,
  createInitialState,
  createRunState,
  emptyMetalUpgrades,
  emptyUpgrades,
  type AchievementId,
  type GameState,
  type MetaState,
  type MetalUpgradeId,
  type Planet,
  type Remnant,
  type RunState,
  type Settings,
  type Stats,
  type UpgradeId,
} from '@/game/state';
import { ACHIEVEMENTS } from '@/game/achievements';
import { classify } from '@/game/stellar';
import { STELLAR_TYPES } from '@/game/constants';
import { clamp, safeNum } from './math';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const EXPORT_PREFIX = 'STELLA1:';

type AnyObj = Record<string, unknown>;
const isObj = (v: unknown): v is AnyObj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number => clamp(safeNum(v, fallback), min, max);
const nonNeg = (v: unknown, fallback = 0): number => num(v, fallback, 0, Number.MAX_VALUE);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);

const ACHIEVEMENT_ID_SET = new Set<string>(ACHIEVEMENTS.map((a) => a.id));
const CODEX_ID_SET = new Set<string>(CODEX_IDS);

function sanitizeUpgrades(v: unknown): Record<UpgradeId, number> {
  const out = emptyUpgrades();
  if (isObj(v)) for (const id of UPGRADE_IDS) out[id] = Math.floor(nonNeg(v[id]));
  return out;
}

function sanitizeMetalUpgrades(v: unknown): Record<MetalUpgradeId, number> {
  const out = emptyMetalUpgrades();
  if (isObj(v)) for (const id of METAL_UPGRADE_IDS) out[id] = Math.floor(nonNeg(v[id]));
  return out;
}

function sanitizePlanet(v: unknown): Planet | null {
  if (!isObj(v)) return null;
  const kind = v.kind === 'gas' || v.kind === 'rocky' ? v.kind : null;
  if (!kind) return null;
  const tier = Math.floor(num(v.tier, 0, 0, 4)) as Planet['tier'];
  const p: Planet = {
    id: str(v.id, `p${Math.random().toString(36).slice(2, 8)}`),
    seed: Math.floor(nonNeg(v.seed)),
    name: str(v.name, '이름 없는 행성'),
    kind,
    orbitIndex: Math.floor(num(v.orbitIndex, 0, 0, 5)),
    angle: num(v.angle, 0),
    life: nonNeg(v.life),
    tier,
  };
  if (typeof v.civName === 'string') p.civName = v.civName;
  return p;
}

function sanitizeRemnant(v: unknown): Remnant | null {
  if (!isObj(v)) return null;
  const kind = v.kind === 'wd' || v.kind === 'ns' || v.kind === 'bh' ? v.kind : null;
  if (!kind) return null;
  const r: Remnant = {
    id: str(v.id, `r${Math.random().toString(36).slice(2, 8)}`),
    kind,
    mass: nonNeg(v.mass),
    metalsAtCreation: nonNeg(v.metalsAtCreation),
    runIndex: Math.floor(nonNeg(v.runIndex, 1)),
    createdAt: nonNeg(v.createdAt),
  };
  if (v.fromKilonova === true) r.fromKilonova = true;
  return r;
}

function sanitizeRun(v: unknown, meta: MetaState, now: number): RunState {
  const d = createRunState(meta, 1, now);
  if (!isObj(v)) return d;
  const mass = nonNeg(v.mass, d.mass);
  const phase = v.phase === 'cloud' || v.phase === 'main' || v.phase === 'giant' ? v.phase : mass >= 0.08 ? 'main' : 'cloud';
  const planets = Array.isArray(v.planets) ? v.planets.map(sanitizePlanet).filter((p): p is Planet => p !== null).slice(0, 6) : [];
  const upgrades = sanitizeUpgrades(v.upgrades);
  return {
    runIndex: Math.max(1, Math.floor(nonNeg(v.runIndex, 1))),
    startedAt: nonNeg(v.startedAt, now),
    mass,
    photons: nonNeg(v.photons),
    helium: nonNeg(v.helium),
    fuel: num(v.fuel, 1, 0, 1),
    phase,
    giantSince: typeof v.giantSince === 'number' && Number.isFinite(v.giantSince) ? v.giantSince : null,
    upgrades,
    slots: Math.floor(num(v.slots, upgrades.protoDisk, 0, 6)),
    planets,
    peakMass: Math.max(mass, nonNeg(v.peakMass)),
    photonsEarned: nonNeg(v.photonsEarned),
    clicks: Math.floor(nonNeg(v.clicks)),
    lastTypeId: STELLAR_TYPES.some((t) => t.id === v.lastTypeId) ? (v.lastTypeId as RunState['lastTypeId']) : classify(mass).id,
    tributeTimer: nonNeg(v.tributeTimer),
    heliumEverSeen: bool(v.heliumEverSeen, nonNeg(v.helium) >= 1),
  };
}

function sanitizeMeta(v: unknown): MetaState {
  const d = createInitialState().meta;
  if (!isObj(v)) return d;
  const achievements: Partial<Record<AchievementId, number>> = {};
  if (isObj(v.achievements)) {
    for (const [k, t] of Object.entries(v.achievements)) if (ACHIEVEMENT_ID_SET.has(k)) achievements[k as AchievementId] = nonNeg(t);
  }
  const codex: Partial<Record<CodexId, number>> = {};
  if (isObj(v.codex)) {
    for (const [k, t] of Object.entries(v.codex)) if (CODEX_ID_SET.has(k)) codex[k as CodexId] = nonNeg(t);
  }
  return {
    metals: nonNeg(v.metals),
    metalsEarnedTotal: nonNeg(v.metalsEarnedTotal),
    metalUpgrades: sanitizeMetalUpgrades(v.metalUpgrades),
    remnants: Array.isArray(v.remnants) ? v.remnants.map(sanitizeRemnant).filter((r): r is Remnant => r !== null) : [],
    goldRelics: Math.floor(nonNeg(v.goldRelics)),
    escapedCivs: Math.floor(nonNeg(v.escapedCivs)),
    totalPrestiges: Math.floor(nonNeg(v.totalPrestiges)),
    bestMass: nonNeg(v.bestMass),
    achievements,
    codex,
    tutorialSeen: Array.isArray(v.tutorialSeen) ? v.tutorialSeen.filter((x): x is string => typeof x === 'string') : [],
  };
}

function sanitizeSettings(v: unknown): Settings {
  const d = createInitialState().settings;
  if (!isObj(v)) return d;
  return {
    sound: bool(v.sound, d.sound),
    volume: num(v.volume, d.volume, 0, 1),
    ambient: bool(v.ambient, d.ambient),
    particles: v.particles === 'low' || v.particles === 'medium' || v.particles === 'high' ? v.particles : d.particles,
    reducedMotion: bool(v.reducedMotion, d.reducedMotion),
    numberFormat: v.numberFormat === 'scientific' ? 'scientific' : 'korean',
    buyAmount: v.buyAmount === 10 || v.buyAmount === 'max' ? v.buyAmount : 1,
  };
}

function sanitizeStats(v: unknown): Stats {
  const d = createInitialState().stats;
  if (!isObj(v)) return d;
  const fatesSeen: Stats['fatesSeen'] = {};
  if (isObj(v.fatesSeen)) {
    for (const k of ['whiteDwarf', 'neutronStar', 'blackHole'] as const) if (v.fatesSeen[k] !== undefined) fatesSeen[k] = Math.floor(nonNeg(v.fatesSeen[k]));
  }
  return {
    totalClicks: Math.floor(nonNeg(v.totalClicks)),
    totalPhotons: nonNeg(v.totalPhotons),
    totalHelium: nonNeg(v.totalHelium),
    playtimeSec: nonNeg(v.playtimeSec),
    longestOfflineSec: nonNeg(v.longestOfflineSec),
    offlineReturns: Math.floor(nonNeg(v.offlineReturns)),
    fatesSeen,
  };
}

/** Fills defaults, clamps values, drops unknown ids. Never throws. */
export function sanitize(raw: unknown, now = Date.now()): GameState {
  if (!isObj(raw)) return createInitialState(now);
  const meta = sanitizeMeta(raw.meta);
  return {
    version: SAVE_VERSION,
    createdAt: nonNeg(raw.createdAt, now),
    lastTick: nonNeg(raw.lastTick, now),
    lastSaved: nonNeg(raw.lastSaved, now),
    run: sanitizeRun(raw.run, meta, now),
    meta,
    settings: sanitizeSettings(raw.settings),
    stats: sanitizeStats(raw.stats),
  };
}

type Migration = (raw: AnyObj) => AnyObj;
/** migrations[v] upgrades a save at version v to v+1. */
const migrations: Record<number, Migration> = {
  0: (raw) => ({ ...raw, version: 1 }),
};

export function migrate(raw: unknown): AnyObj | null {
  if (!isObj(raw)) return null;
  let obj: AnyObj = raw;
  let v = typeof obj.version === 'number' ? obj.version : 0;
  while (v < SAVE_VERSION) {
    const m = migrations[v];
    if (!m) return null;
    obj = m(obj);
    v = typeof obj.version === 'number' ? obj.version : v + 1;
  }
  return obj;
}

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string, now = Date.now()): GameState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const migrated = migrate(parsed);
  if (!migrated) return null;
  return sanitize(migrated, now);
}

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function exportString(s: GameState): string {
  return EXPORT_PREFIX + utf8ToBase64(serialize(s));
}

export function importString(text: string, now = Date.now()): GameState | null {
  const t = text.trim();
  if (!t.startsWith(EXPORT_PREFIX)) return null;
  try {
    return deserialize(base64ToUtf8(t.slice(EXPORT_PREFIX.length)), now);
  } catch {
    return null;
  }
}

export interface LoadResult {
  state: GameState;
  fresh: boolean;
  migratedFrom: number | null;
  corrupt: boolean;
}

export function loadState(storage: StorageLike | null, now = Date.now()): LoadResult {
  if (!storage) return { state: createInitialState(now), fresh: true, migratedFrom: null, corrupt: false };
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return { state: createInitialState(now), fresh: true, migratedFrom: null, corrupt: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: createInitialState(now), fresh: true, migratedFrom: null, corrupt: true };
  }
  const fromVersion = isObj(parsed) && typeof parsed.version === 'number' ? parsed.version : 0;
  if (fromVersion < SAVE_VERSION) {
    try {
      storage.setItem(BACKUP_KEY_PREFIX + fromVersion, raw);
    } catch {
      /* ignore */
    }
  }
  const migrated = migrate(parsed);
  if (!migrated) return { state: createInitialState(now), fresh: true, migratedFrom: null, corrupt: true };
  return { state: sanitize(migrated, now), fresh: false, migratedFrom: fromVersion < SAVE_VERSION ? fromVersion : null, corrupt: false };
}

export function saveState(storage: StorageLike | null, s: GameState, now = Date.now()): boolean {
  if (!storage) return false;
  s.lastSaved = now;
  try {
    storage.setItem(SAVE_KEY, serialize(s));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function getLocalStorage(): StorageLike | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = '__stella_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}
