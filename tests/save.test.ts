import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '@/game/constants';
import { createInitialState } from '@/game/state';
import { deserialize, exportString, importString, loadState, migrate, sanitize, saveState, serialize, type StorageLike } from '@/util/save';

class MemStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

function richState() {
  const s = createInitialState(1000);
  s.run.mass = 3.2;
  s.run.peakMass = 3.2;
  s.run.phase = 'main';
  s.run.photons = 1.5e7;
  s.run.upgrades.coreCompress = 7;
  s.run.planets.push({ id: 'p1', seed: 42, name: '케플러-1b', kind: 'rocky', orbitIndex: 0, angle: 1.2, life: 450, tier: 2, civName: '루멘 교단' });
  s.meta.metals = 120;
  s.meta.remnants.push({ id: 'r1', kind: 'ns', mass: 9, metalsAtCreation: 900, runIndex: 1, createdAt: 5 });
  s.meta.achievements.ignition = 7;
  s.meta.codex.M = 8;
  s.settings.buyAmount = 'max';
  s.stats.totalClicks = 321;
  return s;
}

describe('serialize/deserialize', () => {
  it('roundtrips deep-equal', () => {
    const s = richState();
    const back = deserialize(serialize(s), 1000);
    expect(back).toEqual(s);
  });
  it('export/import with unicode-safe base64', () => {
    const s = richState();
    const text = exportString(s);
    expect(text.startsWith('STELLA1:')).toBe(true);
    expect(importString(text, 1000)).toEqual(s);
    expect(importString('garbage', 1000)).toBeNull();
    expect(importString('STELLA1:!!!notbase64', 1000)).toBeNull();
    expect(importString('STELLA1:' + btoa('{"nope": 1'), 1000)).toBeNull();
  });
});

describe('sanitize', () => {
  it('fills defaults from partial/garbage objects', () => {
    const s = sanitize({ run: { mass: 'x', photons: -5, upgrades: { coreCompress: 3, bogus: 9 } }, meta: { metals: NaN } }, 77);
    expect(s.run.mass).toBe(0.01);
    expect(s.run.photons).toBe(0);
    expect(s.run.upgrades.coreCompress).toBe(3);
    expect((s.run.upgrades as Record<string, number>).bogus).toBeUndefined();
    expect(s.meta.metals).toBe(0);
    expect(s.settings.volume).toBe(0.6);
    expect(s.createdAt).toBe(77);
  });
  it('clamps and drops invalid nested items', () => {
    const s = sanitize({
      run: { mass: 2, fuel: 5, planets: [{ kind: 'gas', tier: 9 }, { kind: 'nope' }, 'x'], phase: 'weird' },
      meta: { remnants: [{ kind: 'bh', mass: -1 }, { kind: 'zzz' }], achievements: { ignition: 1, fake: 2 }, codex: { M: 1, fake: 2 } },
    });
    expect(s.run.fuel).toBe(1);
    expect(s.run.phase).toBe('main');
    expect(s.run.planets.length).toBe(1);
    expect(s.run.planets[0]?.tier).toBe(4);
    expect(s.meta.remnants.length).toBe(1);
    expect(s.meta.remnants[0]?.mass).toBe(0);
    expect(Object.keys(s.meta.achievements)).toEqual(['ignition']);
    expect(Object.keys(s.meta.codex)).toEqual(['M']);
  });
  it('sanitize never throws on non-objects', () => {
    expect(sanitize(null).version).toBe(1);
    expect(sanitize(42).version).toBe(1);
    expect(sanitize('str').version).toBe(1);
  });
});

describe('migrate + load/save', () => {
  it('migrates a version-less save', () => {
    const m = migrate({ run: { mass: 1 } });
    expect(m?.version).toBe(1);
    expect(migrate(null)).toBeNull();
  });
  it('load returns fresh on missing, corrupt on bad JSON, and backs up old versions', () => {
    const st = new MemStorage();
    expect(loadState(st).fresh).toBe(true);
    st.setItem(SAVE_KEY, '{not json');
    const bad = loadState(st);
    expect(bad.fresh).toBe(true);
    expect(bad.corrupt).toBe(true);
    st.setItem(SAVE_KEY, JSON.stringify({ run: { mass: 2, phase: 'main' } }));
    const old = loadState(st, 5);
    expect(old.fresh).toBe(false);
    expect(old.migratedFrom).toBe(0);
    expect(old.state.run.mass).toBe(2);
    expect(st.getItem('stella-idle:backup:v0')).toContain('"mass":2');
  });
  it('saveState writes and loads back', () => {
    const st = new MemStorage();
    const s = richState();
    expect(saveState(st, s, 2000)).toBe(true);
    expect(s.lastSaved).toBe(2000);
    const back = loadState(st, 2000);
    expect(back.state).toEqual(s);
    expect(saveState(null, s)).toBe(false);
  });
});
