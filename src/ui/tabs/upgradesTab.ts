import type { Game } from '@/app/game';
import { UPGRADES, type UpgradeTab } from '@/game/upgrades';
import { h } from '../dom';
import { createUpgradeRow, type RowView } from '../upgradeRow';

export interface TabView {
  el: HTMLElement;
  update(): void;
}

const INTRO: Record<UpgradeTab, string> = {
  accretion: '수소를 더 빨리, 더 많이 끌어모읍니다. 질량이 커질수록 별은 밝아지고 수명은 짧아집니다.',
  fusion: '핵융합 효율을 높여 광자와 헬륨 생산을 늘리고, 연료를 아낍니다.',
  planets: '',
};

export function createUpgradesTab(game: Game, tab: UpgradeTab): TabView {
  const rows: RowView[] = UPGRADES.filter((u) => u.tab === tab).map((u) => createUpgradeRow(game, u));
  const el = h('div', {}, h('p', { class: 'muted small', text: INTRO[tab], style: 'margin:0 0 10px' }), ...rows.map((r) => r.el));
  return {
    el,
    update: () => {
      for (const r of rows) r.update();
    },
  };
}
