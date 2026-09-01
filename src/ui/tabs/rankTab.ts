import type { Game } from '@/app/game';
import { fetchTop, getPlayerId, getPlayerName, isValidName, setPlayerName, type Entry } from '@/rank/leaderboard';
import { formatMass } from '@/util/format';
import { h, N, setText } from '../dom';
import type { TabView } from './upgradesTab';

export type StellaBoard = 'stella-mass' | 'stella-metals';

export const BOARD_LABELS: Record<StellaBoard, string> = { 'stella-mass': '최고 질량', 'stella-metals': '누적 금속' };

export interface RankTabHooks {
  submitNow: () => Promise<string>;
}

export function createRankTab(game: Game, hooks: RankTabHooks): TabView {
  let board: StellaBoard = 'stella-mass';
  const nameInput = h('input', { attrs: { type: 'text', maxlength: '12', placeholder: '닉네임 (2~12자)' }, style: 'flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:var(--text);font:inherit' }) as HTMLInputElement;
  nameInput.value = getPlayerName();
  const nameMsg = h('div', { class: 'small dim', style: 'margin-top:4px;min-height:16px' });
  const saveBtn = h('button', {
    class: 'primary',
    text: '저장 후 등록',
    on: {
      click: () => {
        if (!isValidName(nameInput.value)) {
          setText(nameMsg, '닉네임은 2~12자여야 합니다');
          return;
        }
        setPlayerName(nameInput.value);
        setText(nameMsg, '등록 중…');
        saveBtn.disabled = true;
        void hooks.submitNow().then((m) => {
          setText(nameMsg, m);
          saveBtn.disabled = false;
          void refresh();
        });
      },
    },
  });
  const seg = h('div', { class: 'seg' });
  const segBtns: HTMLButtonElement[] = [];
  for (const b of ['stella-mass', 'stella-metals'] as const) {
    const btn = h('button', { text: BOARD_LABELS[b], class: b === board ? 'active' : '' });
    btn.addEventListener('click', () => {
      board = b;
      for (const x of segBtns) x.classList.toggle('active', x === btn);
      void refresh();
    });
    segBtns.push(btn);
    seg.append(btn);
  }
  const status = h('div', { class: 'small muted', style: 'margin:6px 0' });
  const tableWrap = h('div', { style: 'border:1px solid var(--line);border-radius:10px;overflow:hidden' });
  const refreshBtn = h('button', { text: '새로고침', on: { click: () => void refresh() } });
  const mine = h('div', { class: 'small', style: 'margin-top:8px;color:var(--muted)' });
  const el = h(
    'div',
    {},
    h('div', { class: 'card' }, h('h3', { text: '랭킹 등록' }), h('div', { class: 'muted small', text: '닉네임을 저장하면 최고 질량과 누적 금속이 자동으로 랭킹에 올라갑니다 (별의 죽음마다, 그리고 주기적으로).' }), h('div', { style: 'display:flex;gap:8px;margin-top:8px' }, nameInput, saveBtn), nameMsg),
    h('div', { class: 'section-title' }, h('span', { text: '전세계 랭킹' }), h('span', {}, seg)),
    h('div', { class: 'row' }, status, refreshBtn),
    tableWrap,
    mine,
  );

  let loading = false;
  let lastLoaded = 0;
  async function refresh(): Promise<void> {
    if (loading) return;
    loading = true;
    setText(status, '불러오는 중…');
    try {
      const entries = await fetchTop(board, 50);
      renderTable(entries);
      setText(status, `상위 ${entries.length}명`);
      lastLoaded = performance.now();
    } catch {
      setText(status, '랭킹 서버에 연결할 수 없습니다');
    } finally {
      loading = false;
    }
  }

  function renderTable(entries: Entry[]): void {
    tableWrap.replaceChildren();
    if (entries.length === 0) {
      tableWrap.append(h('div', { class: 'muted small', style: 'padding:12px', text: '아직 기록이 없습니다. 첫 번째가 되어 보세요.' }));
      setText(mine, '');
      return;
    }
    const pid = getPlayerId();
    const table = h('table', { style: 'width:100%;border-collapse:collapse;font-size:13px' });
    const head = h('tr', {}, th('#'), th('이름'), th(board === 'stella-mass' ? '최고 질량' : '누적 금속'), th('별'));
    table.append(head);
    entries.forEach((e, i) => {
      const isMe = e.pid === pid;
      const tr = h('tr', { style: isMe ? 'background:rgba(var(--star-rgb),0.15)' : '' });
      const rankColor = i === 0 ? 'var(--gold)' : i === 1 ? '#d8dee9' : i === 2 ? '#d9a066' : 'var(--muted)';
      tr.append(
        td(String(i + 1), `color:${rankColor};font-weight:700`),
        td(e.name, 'max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'),
        td(board === 'stella-mass' ? formatMass(Number(e.meta.mass ?? e.score)) : N(Number(e.meta.metals ?? e.score)), 'font-weight:600'),
        td(`${Number(e.meta.prestiges ?? 0)}회`, 'color:var(--muted)'),
      );
      table.append(tr);
    });
    tableWrap.append(table);
    const my = entries.findIndex((e) => e.pid === pid);
    setText(mine, my >= 0 ? `내 순위: ${my + 1}위` : getPlayerName() ? '내 기록은 아직 상위 50위 밖입니다' : '닉네임을 저장하면 내 기록이 등록됩니다');
  }
  function th(t: string) {
    return h('th', { text: t, style: 'text-align:left;padding:6px 8px;font-size:11px;color:var(--muted);border-bottom:1px solid var(--line);font-weight:600' });
  }
  function td(t: string, style = '') {
    return h('td', { text: t, style: `padding:6px 8px;border-bottom:1px solid var(--line);${style}` });
  }

  return {
    el,
    update: () => {
      if (performance.now() - lastLoaded > 120000 && !loading) void refresh();
    },
  };
}

export function currentScores(game: Game): { mass: number; metals: number; prestiges: number } {
  const s = game.state;
  return { mass: Math.max(s.meta.bestMass, s.run.peakMass), metals: s.meta.metalsEarnedTotal, prestiges: s.meta.totalPrestiges };
}
