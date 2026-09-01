import { AUTOSAVE_INTERVAL, ECON, MAX_TICKS_PER_FRAME, OFFLINE, TICK } from '@/game/constants';
import { computeRates, type Rates } from '@/game/economy';
import { buyMetalUpgrade, METAL_UPGRADE_BY_ID } from '@/game/metalUpgrades';
import { simulateOffline } from '@/game/offline';
import { buyGas, buyRocky, canBuyGas, canBuyRocky } from '@/game/planets';
import { canKilonova, canPrestige, performKilonova, performPrestige } from '@/game/prestige';
import { createInitialState, type GameState, type MetalUpgradeId, type Settings, type UpgradeId } from '@/game/state';
import { applyClick, simulate, type GameEvent } from '@/game/tick';
import { affordableCount, buyUpgrade, UPGRADE_BY_ID } from '@/game/upgrades';
import { clearSave, getLocalStorage, importString, loadState, saveState, exportString, type StorageLike } from '@/util/save';
import { randomSeed } from '@/util/rng';
import { Emitter, type AppEvents } from './events';

type FrameFn = (dt: number, now: number) => void;

export class Game {
  state: GameState;
  rates: Rates;
  readonly events = new Emitter<AppEvents>();
  readonly storage: StorageLike | null;
  readonly storageOk: boolean;
  readonly loadedFresh: boolean;
  readonly loadCorrupt: boolean;

  private acc = 0;
  private saveTimer = 0;
  private frameFns: FrameFn[] = [];
  private lastFrameTs = 0;
  private running = false;
  private rafId = 0;
  private clickTimes: number[] = [];

  constructor() {
    this.storage = getLocalStorage();
    this.storageOk = this.storage !== null;
    const loaded = loadState(this.storage);
    this.state = loaded.state;
    this.loadedFresh = loaded.fresh;
    this.loadCorrupt = loaded.corrupt;
    this.rates = computeRates(this.state);
  }

  /** Applies the gap since the last tick (call once after UI is ready). */
  boot(): void {
    const now = Date.now();
    const gap = (now - this.state.lastTick) / 1000;
    if (gap > OFFLINE.MIN_ELAPSED) this.applyOffline(gap, now);
    this.state.lastTick = now;
    this.rates = computeRates(this.state);
  }

  onFrame(fn: FrameFn): () => void {
    this.frameFns.push(fn);
    return () => {
      this.frameFns = this.frameFns.filter((f) => f !== fn);
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTs = performance.now();
    const loop = (ts: number) => {
      if (!this.running) return;
      this.frame(ts);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private frame(ts: number): void {
    const frameDt = Math.min(0.25, Math.max(0, (ts - this.lastFrameTs) / 1000));
    this.lastFrameTs = ts;
    const now = Date.now();
    const elapsed = (now - this.state.lastTick) / 1000;
    if (elapsed > OFFLINE.MIN_ELAPSED) {
      this.applyOffline(elapsed, now);
      this.state.lastTick = now;
      this.acc = 0;
    } else if (elapsed > 0) {
      this.acc += elapsed;
      this.state.lastTick = now;
      let ticks = Math.floor(this.acc / TICK);
      if (ticks > MAX_TICKS_PER_FRAME) ticks = MAX_TICKS_PER_FRAME;
      if (ticks > 0) {
        this.acc -= ticks * TICK;
        for (let i = 0; i < ticks; i++) {
          const rates = computeRates(this.state);
          const evs = simulate(this.state, TICK, now, rates);
          if (evs.length) this.dispatch(evs);
        }
      }
    } else if (elapsed < 0) {
      // clock moved backwards; resync silently
      this.state.lastTick = now;
    }
    this.rates = computeRates(this.state);
    this.events.emit('tick', { rates: this.rates, dt: frameDt });
    this.saveTimer += frameDt;
    if (this.saveTimer >= AUTOSAVE_INTERVAL) {
      this.saveTimer = 0;
      this.save();
    }
    for (const fn of this.frameFns) fn(frameDt, ts);
  }

  private dispatch(evs: GameEvent[]): void {
    for (const e of evs) this.events.emit('game', e);
  }

  private applyOffline(elapsed: number, now: number): void {
    const report = simulateOffline(this.state, elapsed, now - elapsed * 1000);
    this.state.stats.offlineReturns += 1;
    if (report.elapsed > this.state.stats.longestOfflineSec) this.state.stats.longestOfflineSec = report.elapsed;
    this.rates = computeRates(this.state);
    this.events.emit('offline', report);
    // achievement checks after stats update
    this.dispatch(simulate(this.state, 0, now, this.rates));
  }

  // ---- actions -------------------------------------------------------------

  click(x = 0, y = 0): boolean {
    const t = performance.now();
    this.clickTimes = this.clickTimes.filter((c) => t - c < 1000);
    if (this.clickTimes.length >= ECON.CLICK_RATE_CAP) return false;
    this.clickTimes.push(t);
    const res = applyClick(this.state, Date.now(), this.rates);
    this.rates = computeRates(this.state);
    this.events.emit('click', { mass: res.mass, photons: res.photons, x, y });
    if (res.events.length) this.dispatch(res.events);
    return true;
  }

  buy(id: UpgradeId): number {
    const def = UPGRADE_BY_ID[id];
    if (!def.isUnlocked(this.state)) return 0;
    const count = affordableCount(this.state, def, this.state.settings.buyAmount);
    if (count <= 0) {
      this.events.emit('cannotAfford', { id });
      return 0;
    }
    const bought = buyUpgrade(this.state, id, count);
    if (bought > 0) {
      this.rates = computeRates(this.state);
      this.events.emit('purchase', { kind: 'upgrade', id, count: bought });
      this.dispatch(simulate(this.state, 0, Date.now(), this.rates));
    }
    return bought;
  }

  buyMetal(id: MetalUpgradeId): number {
    const def = METAL_UPGRADE_BY_ID[id];
    const level = this.state.meta.metalUpgrades[id];
    if (level >= def.max) return 0;
    const bought = buyMetalUpgrade(this.state, id, 1);
    if (bought <= 0) {
      this.events.emit('cannotAfford', { id });
      return 0;
    }
    this.rates = computeRates(this.state);
    this.events.emit('purchase', { kind: 'metal', id, count: bought });
    return bought;
  }

  buyPlanet(kind: 'gas' | 'rocky'): boolean {
    const ok = kind === 'gas' ? canBuyGas(this.state) : canBuyRocky(this.state);
    if (!ok) {
      this.events.emit('cannotAfford', { id: kind });
      return false;
    }
    const planet = kind === 'gas' ? buyGas(this.state, randomSeed()) : buyRocky(this.state, randomSeed());
    if (!planet) return false;
    this.rates = computeRates(this.state);
    this.events.emit('purchase', { kind: 'planet', id: kind, count: 1, planet });
    this.dispatch(simulate(this.state, 0, Date.now(), this.rates));
    return true;
  }

  canPrestige(): boolean {
    return canPrestige(this.state);
  }

  prestige(): boolean {
    if (!canPrestige(this.state)) return false;
    const result = performPrestige(this.state, Date.now());
    this.rates = computeRates(this.state);
    this.events.emit('prestige', result);
    this.dispatch(simulate(this.state, 0, Date.now(), this.rates));
    this.save();
    return true;
  }

  canKilonova(): boolean {
    return canKilonova(this.state.meta);
  }

  kilonova(): boolean {
    const result = performKilonova(this.state, Date.now());
    if (!result) return false;
    this.rates = computeRates(this.state);
    this.events.emit('kilonova', result);
    this.dispatch(simulate(this.state, 0, Date.now(), this.rates));
    this.save();
    return true;
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.state.settings[key] = value;
    this.events.emit('settings', { key });
    this.save();
  }

  markTutorial(id: string): void {
    if (!this.state.meta.tutorialSeen.includes(id)) this.state.meta.tutorialSeen.push(id);
  }

  // ---- persistence ---------------------------------------------------------

  save(): boolean {
    const ok = saveState(this.storage, this.state);
    this.events.emit('saved', { ok });
    return ok;
  }

  exportSave(): string {
    return exportString(this.state);
  }

  importSave(text: string): boolean {
    const s = importString(text);
    if (!s) return false;
    this.state = s;
    this.boot();
    this.save();
    this.events.emit('replaced', { reason: 'import' });
    return true;
  }

  hardReset(): void {
    clearSave(this.storage);
    this.state = createInitialState();
    this.acc = 0;
    this.rates = computeRates(this.state);
    this.save();
    this.events.emit('replaced', { reason: 'reset' });
  }
}
