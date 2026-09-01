import type { Game } from '@/app/game';
import { PLANETS, TIER_NAMES } from '@/game/constants';
import { civEffects, habitability } from '@/game/economy';
import { canBuyGas, canBuyRocky, gasCost, lifeRateFor, rockyAllowed, rockyCost, rockyCount, tierThreshold } from '@/game/planets';
import type { Planet } from '@/game/state';
import { UPGRADE_BY_ID } from '@/game/upgrades';
import { formatTime } from '@/util/format';
import { rgb } from '@/render/color';
import { planetStyle } from '@/render/planets';
import { clear, h, N, setText, toggleClass } from '../dom';
import { createUpgradeRow } from '../upgradeRow';
import type { TabView } from './upgradesTab';

export function createPlanetsTab(game: Game): TabView {
  const slotRow = createUpgradeRow(game, UPGRADE_BY_ID.protoDisk);
  const panspermia = createUpgradeRow(game, UPGRADE_BY_ID.panspermia);
  const worship = createUpgradeRow(game, UPGRADE_BY_ID.starWorship);
  const slotsWrap = h('div');
  const dysonLine = h('div', { class: 'muted small' });
  const habLine = h('div', { class: 'muted small' });
  const buyGasCost = h('span', { class: 'cost photons' });
  const buyRockyCost = h('span', { class: 'cost' });
  const buyGas = h('button', { class: 'buy', on: { click: () => game.buyPlanet('gas') } }, h('span', { text: '가스 행성' }), buyGasCost);
  const buyRocky = h('button', { class: 'buy', on: { click: () => game.buyPlanet('rocky') } }, h('span', { text: '암석 행성' }), buyRockyCost);
  const rockyNote = h('div', { class: 'dim small', style: 'margin-top:6px' });
  const buyCard = h(
    'div',
    { class: 'card' },
    h('h3', { text: '행성 만들기' }),
    h('div', { class: 'muted small', text: '가스 행성은 강착 +15%. 암석 행성은 생명이 깃들어 문명으로 자랍니다 (규소 지각 필요).' }),
    h('div', { class: 'grid2', style: 'margin-top:8px' }, buyGas, buyRocky),
    rockyNote,
  );
  const el = h(
    'div',
    {},
    h('p', { class: 'muted small', text: '별 주위에 행성계를 꾸리세요. 암석 행성에서 생명이 태어나면 문명이 당신을 신으로 섬깁니다.', style: 'margin:0 0 10px' }),
    slotRow.el,
    buyCard,
    h('div', { class: 'section-title' }, h('span', { text: '행성' }), dysonLine),
    habLine,
    slotsWrap,
    h('div', { class: 'section-title', text: '생명과 문명' }),
    panspermia.el,
    worship.el,
  );

  interface SlotView {
    el: HTMLElement;
    planet: Planet | null;
    name: HTMLElement;
    dot: HTMLElement;
    badge: HTMLElement;
    barFill: HTMLElement;
    info: HTMLElement;
    civ: HTMLElement;
  }
  let views: SlotView[] = [];
  let lastKey = '';

  function rebuild(): void {
    clear(slotsWrap);
    views = [];
    const s = game.state;
    const slots = Math.min(s.run.slots, PLANETS.MAX_SLOTS);
    if (slots === 0) {
      slotsWrap.append(h('div', { class: 'slot empty muted small', text: '원시 행성 원반을 만들면 행성 슬롯이 열립니다.' }));
      return;
    }
    const byOrbit = new Map<number, Planet>();
    for (const p of s.run.planets) byOrbit.set(p.orbitIndex, p);
    for (let i = 0; i < slots; i++) {
      const p = byOrbit.get(i) ?? null;
      if (!p) {
        slotsWrap.append(h('div', { class: 'slot empty' }, h('div', { class: 'muted small', text: `궤도 ${i + 1} · 비어 있음` })));
        continue;
      }
      const dot = h('span', { class: 'pdot' });
      const name = h('span');
      const badge = h('span', { class: 'tier-badge' });
      const barFill = h('div');
      const info = h('div', { class: 'muted small', style: 'margin-top:4px' });
      const civ = h('div', { class: 'small', style: 'margin-top:4px;color:var(--gold)' });
      const bar = h('div', { class: 'bar' }, barFill);
      const view: SlotView = { el: h('div', { class: 'slot' }, h('div', { class: 'row' }, h('div', { class: 'pname' }, dot, name), badge), info, civ, bar), planet: p, name, dot, badge, barFill, info, civ };
      if (p.kind === 'gas') bar.hidden = true;
      views.push(view);
      slotsWrap.append(view.el);
    }
  }

  function update(): void {
    const s = game.state;
    slotRow.update();
    panspermia.update();
    worship.update();
    const key = `${s.run.slots}|${s.run.planets.map((p) => p.id).join(',')}`;
    if (key !== lastKey) {
      lastKey = key;
      rebuild();
    }
    const gc = gasCost(s);
    const rc = rockyCost(s);
    setText(buyGasCost, `${N(gc.photons)} 광자`);
    setText(buyRockyCost, `${N(rc.photons)} 광자 + ${N(rc.metals)} 금속`);
    buyGas.disabled = !canBuyGas(s);
    buyRocky.disabled = !canBuyRocky(s);
    const allowed = rockyAllowed(s);
    setText(rockyNote, allowed === 0 ? '암석 행성을 만들려면 유산 탭에서 규소 지각을 구매하세요.' : `암석 행성 ${rockyCount(s)}/${allowed} (규소 지각 레벨만큼 허용)`);
    const civ = civEffects(s.run);
    setText(dysonLine, civ.dysonCount > 0 ? `다이슨 스웜 ${civ.dysonCount}기 · 광자 ×${civ.dysonMult}` : '');
    const rate = lifeRateFor(s, game.rates);
    const hab = habitability(game.rates.type.id);
    setText(habLine, s.run.phase === 'cloud' ? '점화 전에는 생명이 자라지 않습니다.' : `생명 거주 적합도 ${Math.round(hab * 100)}% (${game.rates.type.name}) · 진화 속도 ${rate.toFixed(2)} LP/s`);
    for (const v of views) {
      const p = v.planet!;
      const st = planetStyle(p);
      v.dot.style.background = rgb(st.base);
      setText(v.name, p.name);
      setText(v.badge, p.kind === 'gas' ? '가스 행성' : TIER_NAMES[p.tier]);
      for (let t = 1; t <= 4; t++) toggleClass(v.badge, `t${t}`, p.kind === 'rocky' && p.tier === t);
      if (p.kind === 'gas') {
        setText(v.info, '강착 +15%');
        continue;
      }
      const next = tierThreshold(p.tier);
      if (p.tier >= 4) {
        setText(v.info, '다이슨 스웜 완성 · 광자 ×3 기여 · 프레스티지 금속 +25%');
        v.barFill.style.width = '100%';
      } else {
        const prev = p.tier === 0 ? 0 : tierThreshold((p.tier - 1) as 0 | 1 | 2 | 3);
        const frac = Math.max(0, Math.min(1, (p.life - prev) / (next - prev)));
        v.barFill.style.width = `${(frac * 100).toFixed(1)}%`;
        const eta = rate > 0 ? formatTime((next - p.life) / rate) : '∞';
        const bonus = (PLANETS.TIER_PHOTON_BONUS[p.tier] ?? 0) * 100;
        setText(v.info, `${bonus > 0 ? `광자 +${Math.round(bonus)}% · ` : ''}다음 단계(${TIER_NAMES[p.tier + 1]})까지 ${eta}`);
      }
      setText(v.civ, p.civName ? `『${p.civName}』${p.tier >= 4 ? ' — 별을 감싸고 빛을 수확합니다' : p.tier >= 3 ? ' — 우주로 나아갑니다' : ' — 당신을 섬깁니다'}` : '');
    }
  }

  return { el, update };
}
