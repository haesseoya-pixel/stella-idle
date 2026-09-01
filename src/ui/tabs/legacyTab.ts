import type { Game } from '@/app/game';
import { REMNANT_NAMES } from '@/game/constants';
import { METAL_UPGRADES } from '@/game/metalUpgrades';
import { predictPrestige, remnantBonusText } from '@/game/prestige';
import { remnantCount } from '@/game/state';
import { formatMass, formatTime } from '@/util/format';
import { clear, h, N, setText, toggleClass } from '../dom';
import { createMetalRow } from '../upgradeRow';
import type { TabView } from './upgradesTab';

export function createLegacyTab(game: Game, openPrestige: () => void, openKilonova: () => void): TabView {
  const fateOrb = h('div', { class: 'fate-orb wd' });
  const fateName = h('h3');
  const fateSub = h('div', { class: 'muted small' });
  const yieldLine = h('div', { style: 'margin-top:6px;font-weight:700;color:var(--metal)' });
  const prestigeBtn = h('button', { class: 'primary', text: '운명 맞이하기', on: { click: openPrestige } });
  const prestigeNote = h('div', { class: 'dim small', style: 'margin-top:6px' });
  const prestigeCard = h(
    'div',
    { class: 'card accent' },
    h('div', { class: 'fate-preview' }, fateOrb, h('div', {}, fateName, fateSub, yieldLine)),
    h('div', { class: 'row' }, h('span', { class: 'muted small', text: '별이 죽으면 금속(중원소)을 남기고, 다음 별은 더 강하게 태어납니다.' }), prestigeBtn),
    prestigeNote,
  );
  const metalsLine = h('div', { class: 'muted small' });
  const rows = METAL_UPGRADES.map((d) => createMetalRow(game, d));
  const kilonovaBtn = h('button', { class: 'primary', text: '킬로노바 일으키기', on: { click: openKilonova } });
  const kilonovaNote = h('div', { class: 'muted small' });
  const gallery = h('div', { class: 'remnant-grid' });
  const galleryEmpty = h('div', { class: 'dim small', text: '아직 남긴 잔해가 없습니다. 첫 별의 운명을 지켜보세요.' });
  const el = h(
    'div',
    {},
    prestigeCard,
    h('div', { class: 'section-title' }, h('span', { text: '영구 강화 (금속)' }), metalsLine),
    ...rows.map((r) => r.el),
    h('div', { class: 'section-title', text: '킬로노바' }),
    h('div', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('h3', { text: '중성자별 충돌' }), kilonovaNote), kilonovaBtn)),
    h('div', { class: 'section-title', text: '유산 갤러리' }),
    galleryEmpty,
    gallery,
  );

  let galleryKey = '';
  function rebuildGallery(): void {
    clear(gallery);
    const s = game.state;
    const items = [...s.meta.remnants].sort((a, b) => a.createdAt - b.createdAt);
    galleryEmpty.hidden = items.length > 0 || s.meta.goldRelics > 0;
    for (const r of items) {
      gallery.append(
        h(
          'div',
          { class: `remnant ${r.kind}`, title: `${r.runIndex}번째 별 · ${formatMass(r.mass)} · ${remnantBonusText(r.kind, r.fromKilonova)}` },
          h('div', { class: 'orb' }),
          h('b', { text: REMNANT_NAMES[r.kind] }),
          h('div', { text: formatMass(r.mass) }),
          h('div', { text: remnantBonusText(r.kind, r.fromKilonova), style: 'color:var(--ok)' }),
        ),
      );
    }
    for (let i = 0; i < s.meta.goldRelics; i++) {
      gallery.append(h('div', { class: 'remnant gold' }, h('div', { class: 'orb' }), h('b', { text: '황금 유물' }), h('div', { text: '킬로노바' }), h('div', { text: '금속 +20%', style: 'color:var(--ok)' })));
    }
  }

  function update(): void {
    const s = game.state;
    const pred = predictPrestige(s);
    fateOrb.className = `fate-orb ${pred.fate.remnantKind}`;
    setText(fateName, `${pred.fate.event} → ${pred.fate.name}`);
    setText(fateSub, `현재 질량 ${formatMass(s.run.mass)} 기준. ${pred.fate.description}`);
    setText(yieldLine, `예상 금속 +${N(pred.yieldMetals)}`);
    const can = game.canPrestige();
    prestigeBtn.disabled = !can;
    const rem = game.rates.remainingSec;
    setText(prestigeNote, can ? '적색 거성 단계입니다. 질량은 더 이상 늘지 않습니다. 준비되면 운명을 맞이하세요.' : s.run.phase === 'cloud' ? '점화 후 연료가 소진되면 가능합니다.' : `연료 소진까지 약 ${Number.isFinite(rem) ? formatTime(rem) : '∞'}. 그 전까지 질량을 키우세요 — 8 M☉부터 중성자별, 20 M☉ 초과 시 블랙홀.`);
    setText(metalsLine, `보유 ${N(s.meta.metals)} · 누적 ${N(s.meta.metalsEarnedTotal)} (광자 ×${game.rates.mult.metalsHeld.toFixed(2)})`);
    for (const r of rows) r.update();
    const ns = remnantCount(s.meta, 'ns');
    kilonovaBtn.disabled = !game.canKilonova();
    setText(kilonovaNote, ns >= 2 ? `중성자별 ${ns}개 보유. 가장 무거운 둘을 합쳐 블랙홀 + 황금 유물을 얻고 금속을 즉시 회수합니다.` : `중성자별 2개가 필요합니다 (현재 ${ns}개). 8~20 M☉ 별의 초신성으로 얻습니다.`);
    const key = `${s.meta.remnants.map((r) => r.id).join(',')}|${s.meta.goldRelics}`;
    if (key !== galleryKey) {
      galleryKey = key;
      rebuildGallery();
    }
    toggleClass(prestigeCard, 'accent', can);
  }

  return { el, update };
}
