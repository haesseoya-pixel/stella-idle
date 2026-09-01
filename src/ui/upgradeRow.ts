import type { Game } from '@/app/game';
import type { MetalUpgradeDef } from '@/game/metalUpgrades';
import { affordableCount, costOf, costOfN, type UpgradeDef } from '@/game/upgrades';
import { h, N, setText, toggleClass } from './dom';

export interface RowView {
  el: HTMLElement;
  update(): void;
}

export function createUpgradeRow(game: Game, def: UpgradeDef): RowView {
  const name = h('span', { text: def.name });
  const lv = h('span', { class: 'lv' });
  const desc = h('div', { class: 'desc', text: def.description });
  const eff = h('div', { class: 'eff' });
  const cost = h('span', { class: `cost ${def.currency}` });
  const cnt = h('span', { class: 'cnt' });
  const buy = h('button', { class: 'buy', on: { click: () => game.buy(def.id) } }, cost, cnt);
  const el = h('div', { class: 'upgrade' }, h('div', {}, h('div', { class: 'name' }, name, lv), desc, eff), buy);
  let wasLocked: boolean | null = null;

  const update = () => {
    const s = game.state;
    const level = s.run.upgrades[def.id];
    const unlocked = def.isUnlocked(s);
    if (wasLocked !== !unlocked) {
      wasLocked = !unlocked;
      toggleClass(el, 'locked', !unlocked);
      buy.hidden = !unlocked;
    }
    if (!unlocked) {
      setText(name, '???');
      setText(lv, '');
      setText(desc, `해금 조건: ${def.unlockHint}`);
      setText(eff, '');
      return;
    }
    setText(name, def.name);
    const maxed = level >= def.max;
    setText(lv, maxed ? `Lv ${level} MAX` : `Lv ${level}`);
    toggleClass(lv, 'max', maxed);
    setText(desc, def.description);
    if (maxed) {
      setText(eff, def.effect(level));
      setText(cost, 'MAX');
      setText(cnt, '');
      buy.disabled = true;
      toggleClass(el, 'affordable', false);
      return;
    }
    const amount = s.settings.buyAmount;
    const n = affordableCount(s, def, amount);
    const want = amount === 'max' ? Math.max(1, n) : Math.min(amount, def.max === Infinity ? amount : Math.max(1, def.max - level));
    const total = costOfN(def, level, want);
    setText(eff, `${def.effect(level)} → ${def.effect(level + want)}`);
    setText(cost, `${N(total)} ${def.currency === 'photons' ? '광자' : '헬륨'}`);
    setText(cnt, amount === 'max' ? (n > 0 ? `MAX ×${n}` : `×1 (${N(costOf(def, level))})`) : `×${want}`);
    const can = n > 0;
    buy.disabled = !can;
    toggleClass(el, 'affordable', can);
  };
  return { el, update };
}

export function createMetalRow(game: Game, def: MetalUpgradeDef): RowView {
  const lv = h('span', { class: 'lv' });
  const eff = h('div', { class: 'eff' });
  const cost = h('span', { class: 'cost metals' });
  const buy = h('button', { class: 'buy', on: { click: () => game.buyMetal(def.id) } }, cost, h('span', { class: 'cnt', text: '×1' }));
  const el = h('div', { class: 'upgrade' }, h('div', {}, h('div', { class: 'name' }, h('span', { text: def.name }), lv), h('div', { class: 'desc', text: def.description }), eff), buy);
  const update = () => {
    const s = game.state;
    const level = s.meta.metalUpgrades[def.id];
    const maxed = level >= def.max;
    setText(lv, maxed ? `Lv ${level} MAX` : `Lv ${level}/${def.max}`);
    toggleClass(lv, 'max', maxed);
    if (maxed) {
      setText(eff, def.effect(level));
      setText(cost, 'MAX');
      buy.disabled = true;
      toggleClass(el, 'affordable', false);
      return;
    }
    const c = costOf(def, level);
    setText(eff, `${def.effect(level)} → ${def.effect(level + 1)}`);
    setText(cost, `${N(c)} 금속`);
    const can = s.meta.metals >= c;
    buy.disabled = !can;
    toggleClass(el, 'affordable', can);
  };
  return { el, update };
}
