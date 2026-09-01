import type { Game } from '@/app/game';
import { ACHIEVEMENTS } from '@/game/achievements';
import { CODEX_IDS, CODEX_INFO, GIANT_INFO, STELLAR_TYPES } from '@/game/constants';
import { formatMass, formatTime } from '@/util/format';
import { rgb } from '@/render/color';
import { h, N, setText, toggleClass } from '../dom';
import type { TabView } from './upgradesTab';

const CODEX_COLORS: Record<string, [number, number, number]> = {
  giant: GIANT_INFO.rgb,
  wd: [220, 235, 255],
  ns: [170, 200, 255],
  bh: [255, 140, 60],
  kilonova: [255, 209, 102],
  nebula: [150, 230, 210],
  supernova: [255, 240, 220],
};
for (const t of STELLAR_TYPES) CODEX_COLORS[t.id] = t.rgb;

export function createRecordsTab(game: Game): TabView {
  const achCount = h('span', { class: 'muted' });
  const achEls = ACHIEVEMENTS.map((a) => ({
    a,
    el: h('div', { class: 'ach locked' }, h('b', { text: a.name }), h('div', { class: 'muted', text: a.description }), h('div', { class: 'rw', text: a.reward })),
  }));
  const codexCount = h('span', { class: 'muted' });
  const codexEls = CODEX_IDS.map((id) => {
    const info = CODEX_INFO[id];
    const text = h('div', { class: 'muted', text: '???' });
    const name = h('b', { text: '???' });
    return { id, el: h('div', { class: 'codex-item locked' }, h('span', { class: 'cdot', style: `background:${rgb(CODEX_COLORS[id] ?? [200, 200, 200])}` }), h('div', {}, name, text)), name, text, info };
  });
  const stats: Record<string, HTMLElement> = {};
  const statEl = (k: string, label: string) => {
    const v = h('div', { class: 'v' });
    stats[k] = v;
    return h('div', { class: 'stat' }, h('div', { class: 'k', text: label }), v);
  };
  const el = h(
    'div',
    {},
    h('div', { class: 'section-title' }, h('span', { text: '업적' }), achCount),
    h('div', { class: 'ach-grid' }, ...achEls.map((x) => x.el)),
    h('div', { class: 'section-title' }, h('span', { text: '도감' }), codexCount),
    h('div', {}, ...codexEls.map((x) => x.el)),
    h('div', { class: 'section-title', text: '통계' }),
    h(
      'div',
      { class: 'grid2' },
      statEl('clicks', '총 클릭'),
      statEl('photons', '누적 광자'),
      statEl('helium', '누적 헬륨'),
      statEl('metals', '누적 금속'),
      statEl('best', '최고 질량'),
      statEl('prestiges', '별의 죽음'),
      statEl('play', '플레이 시간'),
      statEl('offline', '최장 부재'),
      statEl('civs', '탈출한 문명'),
      statEl('runs', '현재 별'),
    ),
  );

  function update(): void {
    const s = game.state;
    let n = 0;
    for (const { a, el } of achEls) {
      const has = s.meta.achievements[a.id] !== undefined;
      if (has) n++;
      toggleClass(el, 'locked', !has);
    }
    setText(achCount, `${n}/${ACHIEVEMENTS.length}`);
    let c = 0;
    for (const x of codexEls) {
      const has = s.meta.codex[x.id] !== undefined;
      if (has) c++;
      toggleClass(x.el, 'locked', !has);
      setText(x.name, has ? x.info.name : '???');
      setText(x.text, has ? x.info.text : '아직 발견하지 못했습니다.');
    }
    setText(codexCount, `${c}/${CODEX_IDS.length}`);
    setText(stats.clicks!, N(s.stats.totalClicks));
    setText(stats.photons!, N(s.stats.totalPhotons));
    setText(stats.helium!, N(s.stats.totalHelium));
    setText(stats.metals!, N(s.meta.metalsEarnedTotal));
    setText(stats.best!, formatMass(Math.max(s.meta.bestMass, s.run.peakMass)));
    setText(stats.prestiges!, `${s.meta.totalPrestiges}회`);
    setText(stats.play!, formatTime(s.stats.playtimeSec));
    setText(stats.offline!, formatTime(s.stats.longestOfflineSec));
    setText(stats.civs!, `${s.meta.escapedCivs}개`);
    setText(stats.runs!, `#${s.run.runIndex}`);
  }
  return { el, update };
}
