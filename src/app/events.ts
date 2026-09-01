import type { Rates } from '@/game/economy';
import type { OfflineReport } from '@/game/offline';
import type { KilonovaResult, PrestigeResult } from '@/game/prestige';
import type { Planet, Settings } from '@/game/state';
import type { GameEvent } from '@/game/tick';

export type AppEvents = {
  tick: { rates: Rates; dt: number };
  game: GameEvent;
  click: { mass: number; photons: number; x: number; y: number };
  purchase: { kind: 'upgrade' | 'metal' | 'planet'; id: string; count: number; planet?: Planet };
  cannotAfford: { id: string };
  prestige: PrestigeResult;
  kilonova: KilonovaResult;
  offline: OfflineReport;
  replaced: { reason: 'import' | 'reset' };
  settings: { key: keyof Settings };
  saved: { ok: boolean };
};

type Handler<T> = (payload: T) => void;

export class Emitter<E extends Record<string, unknown>> {
  private handlers: { [K in keyof E]?: Set<Handler<E[K]>> } = {};

  on<K extends keyof E>(key: K, fn: Handler<E[K]>): () => void {
    let set = this.handlers[key];
    if (!set) {
      set = new Set();
      this.handlers[key] = set;
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof E>(key: K, payload: E[K]): void {
    const set = this.handlers[key];
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[events] handler for ${String(key)} failed`, err);
      }
    }
  }
}
