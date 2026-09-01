import type { Game } from '@/app/game';
import { UPGRADES } from '@/game/upgrades';
import { affordableCount } from '@/game/upgrades';
import { canBuyGas, canBuyRocky } from '@/game/planets';
import { h, N, qs, setText, toggleClass } from './dom';
import { createLegacyTab } from './tabs/legacyTab';
import { createPlanetsTab } from './tabs/planetsTab';
import { createRecordsTab } from './tabs/recordsTab';
import { createRankTab, type RankTabHooks } from './tabs/rankTab';
import { createUpgradesTab, type TabView } from './tabs/upgradesTab';

export type TabId = 'accretion' | 'fusion' | 'planets' | 'legacy' | 'records' | 'rank';

const TAB_LABELS: Record<TabId, string> = { accretion: '강착', fusion: '핵융합', planets: '행성계', legacy: '유산', records: '기록', rank: '랭킹' };
const TAB_ORDER: TabId[] = ['accretion', 'fusion', 'planets', 'legacy', 'records', 'rank'];

export class Panels {
  private game: Game;
  private tabs: Record<TabId, TabView>;
  private buttons: Record<TabId, HTMLButtonElement>;
  private badges: Record<TabId, HTMLElement>;
  private body: HTMLElement;
  private metals: HTMLElement;
  private runLabel: HTMLElement;
  private saveStatus: HTMLElement;
  private amountBtns: HTMLButtonElement[] = [];
  active: TabId = 'accretion';
  private saveFlashUntil = 0;

  constructor(game: Game, opts: { openSettings: () => void; openPrestige: () => void; openKilonova: () => void; rank: RankTabHooks }) {
    this.game = game;
    this.tabs = {
      accretion: createUpgradesTab(game, 'accretion'),
      fusion: createUpgradesTab(game, 'fusion'),
      planets: createPlanetsTab(game),
      legacy: createLegacyTab(game, opts.openPrestige, opts.openKilonova),
      records: createRecordsTab(game),
      rank: createRankTab(game, opts.rank),
    };
    const header = qs('#panelHeader');
    this.metals = h('span');
    this.runLabel = h('span', { class: 'lbl' });
    header.append(
      h('div', { class: 'brand', html: '<b>STELLA</b> · 별 키우기' }),
      h('div', { class: 'metals-badge' }, this.runLabel, h('span', { class: 'lbl', text: '금속' }), this.metals),
      h('button', { class: 'icon-btn', title: '설정', attrs: { 'aria-label': '설정' }, text: '⚙', on: { click: opts.openSettings } }),
    );
    const bar = qs('#tabbar');
    this.buttons = {} as Record<TabId, HTMLButtonElement>;
    this.badges = {} as Record<TabId, HTMLElement>;
    for (const id of TAB_ORDER) {
      const badge = h('span', { class: 'badge' });
      badge.hidden = true;
      const btn = h('button', { class: 'tab', text: TAB_LABELS[id], on: { click: () => this.show(id) } }, badge);
      this.buttons[id] = btn;
      this.badges[id] = badge;
      bar.append(btn);
    }
    this.body = qs('#tabBody');
    const footer = qs('#panelFooter');
    this.saveStatus = h('span', { class: 'dim', text: '' });
    const seg = h('div', { class: 'seg' });
    for (const amt of [1, 10, 'max'] as const) {
      const b = h('button', { text: amt === 'max' ? 'MAX' : `×${amt}`, on: { click: () => game.setSetting('buyAmount', amt) } });
      this.amountBtns.push(b);
      seg.append(b);
    }
    footer.append(h('span', {}, h('span', { class: 'muted', text: '구매 수량 ' }), seg), this.saveStatus);
    game.events.on('saved', ({ ok }) => {
      this.saveFlashUntil = performance.now() + 1500;
      setText(this.saveStatus, ok ? '저장됨' : '저장 실패');
    });
    this.show(this.active);
  }

  show(id: TabId): void {
    this.active = id;
    for (const t of TAB_ORDER) toggleClass(this.buttons[t], 'active', t === id);
    this.body.replaceChildren(this.tabs[id].el);
    this.body.scrollTop = 0;
    this.tabs[id].update();
  }

  /** ~10 Hz */
  update(): void {
    const s = this.game.state;
    this.tabs[this.active].update();
    setText(this.metals, N(s.meta.metals));
    setText(this.runLabel, `#${s.run.runIndex} · `);
    for (const [i, amt] of ([1, 10, 'max'] as const).entries()) toggleClass(this.amountBtns[i]!, 'active', s.settings.buyAmount === amt);
    if (performance.now() > this.saveFlashUntil && this.saveStatus.textContent) setText(this.saveStatus, '');
    // affordability badges on inactive tabs
    const affordable: Record<TabId, boolean> = { accretion: false, fusion: false, planets: false, legacy: false, records: false, rank: false };
    for (const u of UPGRADES) {
      if (affordable[u.tab]) continue;
      if (u.isUnlocked(s) && s.run.upgrades[u.id] < u.max && affordableCount(s, u, 1) > 0) affordable[u.tab] = true;
    }
    if (!affordable.planets && (canBuyGas(s) || canBuyRocky(s))) affordable.planets = true;
    if (this.game.canPrestige() || this.game.canKilonova()) affordable.legacy = true;
    for (const t of TAB_ORDER) {
      const show = affordable[t] && t !== this.active;
      if (this.badges[t].hidden === show) this.badges[t].hidden = !show;
    }
  }
}
