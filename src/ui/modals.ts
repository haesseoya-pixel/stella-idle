import type { Game } from '@/app/game';
import { STELLAR_TYPES, TIER_NAMES } from '@/game/constants';
import { offlineCap, type OfflineReport } from '@/game/offline';
import { predictPrestige } from '@/game/prestige';
import { remnantCount } from '@/game/state';
import { formatMass, formatTime } from '@/util/format';
import { h, N, setNumberMode } from './dom';
import type { Toasts } from './toast';

export class Modals {
  private root: HTMLElement;
  private game: Game;
  private toasts: Toasts;
  private current: HTMLElement | null = null;
  private onCloseHooks: (() => void)[] = [];

  constructor(root: HTMLElement, game: Game, toasts: Toasts) {
    this.root = root;
    this.game = game;
    this.toasts = toasts;
    root.addEventListener('click', (e) => {
      if (e.target === root) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.current) this.close();
    });
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  private open(modal: HTMLElement): void {
    this.close();
    this.current = modal;
    this.root.replaceChildren(modal);
    this.root.hidden = false;
    const first = modal.querySelector<HTMLElement>('button, input, textarea');
    first?.focus({ preventScroll: true });
  }

  close(): void {
    if (!this.current) return;
    this.current = null;
    this.root.hidden = true;
    this.root.replaceChildren();
    for (const fn of this.onCloseHooks) fn();
    this.onCloseHooks = [];
  }

  private actions(...buttons: HTMLElement[]): HTMLElement {
    return h('div', { class: 'modal-actions' }, ...buttons);
  }

  openPrestige(): void {
    const s = this.game.state;
    if (!this.game.canPrestige()) return;
    const p = predictPrestige(s);
    const kind = p.fate.remnantKind;
    const civLines: HTMLElement[] = [];
    for (const pl of p.escaping) civLines.push(h('div', { text: `『${pl.civName ?? pl.name}』은(는) 우주로 탈출했습니다 (+1 유민 문명)`, style: 'color:var(--helium)' }));
    for (const pl of p.perishing) civLines.push(h('div', { text: `『${pl.civName ?? pl.name}』은(는) 별을 찬양하며 소멸했습니다`, style: 'color:var(--muted)' }));
    const breakdown = h(
      'div',
      { class: 'breakdown' },
      h('div', {}, h('span', { text: `기본 (10 × ${formatMass(p.mass)}^1.5)` }), h('span', { text: N(p.base) })),
      h('div', {}, h('span', { text: `운명 배율 (${p.fate.name})` }), h('span', { text: `×${p.fateMult}` })),
      p.dysonMult > 1 ? h('div', {}, h('span', { text: '다이슨 스웜' }), h('span', { text: `×${p.dysonMult.toFixed(2)}` })) : null,
      p.escapedMult > 1 ? h('div', {}, h('span', { text: '유민 문명' }), h('span', { text: `×${p.escapedMult.toFixed(2)}` })) : null,
      p.bhMult > 1 ? h('div', {}, h('span', { text: '블랙홀 유산' }), h('span', { text: `×${p.bhMult.toFixed(2)}` })) : null,
      p.goldMult > 1 ? h('div', {}, h('span', { text: '황금 유물' }), h('span', { text: `×${p.goldMult.toFixed(2)}` })) : null,
      p.achMult > 1 ? h('div', {}, h('span', { text: '업적 보너스' }), h('span', { text: `×${p.achMult.toFixed(2)}` })) : null,
      h('div', { class: 'total' }, h('span', { text: '획득 금속' }), h('span', { text: `+${N(p.yieldMetals)}` })),
    );
    const confirm = h('button', {
      class: 'primary',
      text: `${p.fate.event} 일으키기`,
      on: {
        click: () => {
          this.close();
          this.game.prestige();
        },
      },
    });
    const modal = h(
      'div',
      { class: 'modal' },
      h('h2', { text: '운명 맞이하기' }),
      h('div', { class: 'sub', text: `연료가 다한 ${formatMass(p.mass)}의 별이 ${p.fate.event}을(를) 일으킵니다.` }),
      h('div', { class: 'fate-preview' }, h('div', { class: `fate-orb ${kind}` }), h('div', {}, h('h3', { text: `${p.fate.event} → ${p.fate.name}`, style: 'margin:0 0 4px' }), h('div', { class: 'muted small', text: p.fate.description }))),
      breakdown,
      h(
        'div',
        { class: 'lose-keep' },
        h('div', {}, h('div', { class: 'lose', text: '잃는 것' }), h('ul', {}, h('li', { text: '질량, 광자, 헬륨' }), h('li', { text: '이번 별의 업그레이드' }), h('li', { text: '행성과 문명' }))),
        h('div', {}, h('div', { class: 'keep', text: '남는 것' }), h('ul', {}, h('li', { text: '금속과 영구 강화' }), h('li', { text: '잔해 (유산 보너스)' }), h('li', { text: '업적, 도감, 기록' }))),
      ),
      civLines.length ? h('div', { class: 'small', style: 'margin-top:10px' }, ...civLines) : null,
      this.actions(h('button', { text: '아직은…', on: { click: () => this.close() } }), confirm),
    );
    this.open(modal);
  }

  openKilonova(): void {
    const s = this.game.state;
    if (!this.game.canKilonova()) return;
    const ns = s.meta.remnants.filter((r) => r.kind === 'ns').sort((a, b) => b.mass - a.mass);
    const a = ns[0]!;
    const b = ns[1]!;
    const modal = h(
      'div',
      { class: 'modal' },
      h('h2', { text: '킬로노바' }),
      h('div', { class: 'sub', text: '중성자별 두 개가 나선을 그리며 충돌합니다. 우주의 금은 여기서 만들어집니다.' }),
      h(
        'div',
        { class: 'breakdown' },
        h('div', {}, h('span', { text: `중성자별 ${formatMass(a.mass)} + ${formatMass(b.mass)}` }), h('span', { text: `→ 블랙홀 ${formatMass(a.mass + b.mass)}` })),
        h('div', {}, h('span', { text: '잃는 것' }), h('span', { text: `강착 보너스 -${Math.min(20, remnantCount(s.meta, 'ns') * 10) - Math.min(100, Math.max(0, remnantCount(s.meta, 'ns') - 2) * 10)}%p` })),
        h('div', {}, h('span', { text: '얻는 것' }), h('span', { text: '블랙홀 유산 (금속 +15%) + 황금 유물 (금속 +20%)' })),
        h('div', { class: 'total' }, h('span', { text: '즉시 회수 금속' }), h('span', { text: `+${N(a.metalsAtCreation + b.metalsAtCreation)}` })),
      ),
      this.actions(
        h('button', { text: '취소', on: { click: () => this.close() } }),
        h('button', {
          class: 'primary',
          text: '충돌시키기',
          on: {
            click: () => {
              this.close();
              this.game.kilonova();
            },
          },
        }),
      ),
    );
    this.open(modal);
  }

  openOffline(r: OfflineReport): void {
    const events: HTMLElement[] = [];
    for (const e of r.events) {
      if (e.type === 'ignite') events.push(h('div', { text: '별이 점화되었습니다' }));
      else if (e.type === 'giant') events.push(h('div', { text: '연료 소진 — 적색 거성 단계 진입 (광자 ×3)' }));
      else if (e.type === 'typeChange') events.push(h('div', { text: `${STELLAR_TYPES.find((t) => t.id === e.to)?.name ?? e.to}이(가) 되었습니다` }));
      else if (e.type === 'civTier') events.push(h('div', { text: `${e.planet.civName ? `『${e.planet.civName}』` : e.planet.name}: ${TIER_NAMES[e.tier]} 단계` }));
      else if (e.type === 'achievement') events.push(h('div', { text: `업적 달성: ${e.id}` }));
    }
    if (r.tributes > 0) events.push(h('div', { text: `문명이 공물을 ${r.tributes}번 바쳤습니다` }));
    const modal = h(
      'div',
      { class: 'modal' },
      h('h2', { text: '부재 중 진행' }),
      h('div', { class: 'sub' }, h('span', { text: `${formatTime(r.elapsed)} 동안 별이 홀로 타올랐습니다.` }), r.capped ? h('span', { class: 'kbd', text: ` 상한 ${formatTime(offlineCap(this.game.state))} 적용`, style: 'margin-left:6px' }) : null),
      h(
        'div',
        { class: 'grid3' },
        h('div', { class: 'stat' }, h('div', { class: 'k', text: '광자' }), h('div', { class: 'v', text: `+${N(r.photons)}` })),
        h('div', { class: 'stat' }, h('div', { class: 'k', text: '헬륨' }), h('div', { class: 'v', text: `+${N(r.helium)}` })),
        h('div', { class: 'stat' }, h('div', { class: 'k', text: '질량' }), h('div', { class: 'v', text: `${formatMass(r.massBefore)} → ${formatMass(r.massAfter)}` })),
      ),
      h('div', { class: 'muted small', style: 'margin-top:10px', text: `연료 ${(r.fuelBefore * 100).toFixed(1)}% → ${(r.fuelAfter * 100).toFixed(1)}%` }),
      h('div', { class: 'fuel-bar', style: 'margin-top:4px' }, h('div', { class: 'fuel-fill', style: `width:${(r.fuelAfter * 100).toFixed(1)}%` })),
      events.length ? h('div', { class: 'offline-events' }, ...events) : null,
      this.actions(h('button', { class: 'primary', text: '확인', on: { click: () => this.close() } })),
    );
    this.open(modal);
  }

  openSettings(): void {
    const s = this.game.state.settings;
    const g = this.game;
    const sw = (key: 'sound' | 'ambient' | 'reducedMotion', label: string, desc: string) => {
      const btn = h('button', { class: `switch ${s[key] ? 'on' : ''}`, attrs: { 'aria-label': label } });
      btn.addEventListener('click', () => {
        g.setSetting(key, !g.state.settings[key]);
        btn.classList.toggle('on', g.state.settings[key]);
      });
      return h('div', { class: 'setting-row' }, h('div', {}, h('label', { text: label }), h('div', { class: 'desc', text: desc })), btn);
    };
    const vol = h('input', { attrs: { type: 'range', min: '0', max: '1', step: '0.05', value: String(s.volume) } }) as HTMLInputElement;
    vol.addEventListener('input', () => g.setSetting('volume', parseFloat(vol.value)));
    const seg = <T extends string | number>(key: 'particles' | 'numberFormat', opts: [T, string][]) => {
      const wrap = h('div', { class: 'seg' });
      const btns: HTMLButtonElement[] = [];
      for (const [val, label] of opts) {
        const b = h('button', { text: label, class: g.state.settings[key] === val ? 'active' : '' });
        b.addEventListener('click', () => {
          g.setSetting(key, val as never);
          for (const x of btns) x.classList.toggle('active', x === b);
        });
        btns.push(b);
        wrap.append(b);
      }
      return wrap;
    };
    const exportArea = h('textarea', { attrs: { readonly: 'true', spellcheck: 'false' } }) as HTMLTextAreaElement;
    exportArea.value = g.exportSave();
    const copyBtn = h('button', {
      text: '복사',
      on: {
        click: () => {
          exportArea.select();
          void navigator.clipboard?.writeText(exportArea.value).then(
            () => this.toasts.show('저장 코드를 복사했습니다', 'info'),
            () => this.toasts.show('복사 실패 — 직접 선택해 복사하세요', 'warn'),
          );
        },
      },
    });
    const importArea = h('textarea', { attrs: { placeholder: 'STELLA1:… 형식의 저장 코드를 붙여넣으세요', spellcheck: 'false' } }) as HTMLTextAreaElement;
    const importBtn = h('button', {
      text: '불러오기',
      on: {
        click: () => {
          if (!importArea.value.trim()) return;
          if (!window.confirm('현재 진행 상황을 덮어씁니다. 계속할까요?')) return;
          if (g.importSave(importArea.value)) {
            this.toasts.show('저장 코드를 불러왔습니다', 'milestone');
            this.close();
          } else {
            this.toasts.show('올바르지 않은 저장 코드입니다', 'warn');
          }
        },
      },
    });
    const modal = h(
      'div',
      { class: 'modal' },
      h('h2', { text: '설정' }),
      sw('sound', '효과음', '클릭, 구매, 점화, 초신성 등'),
      h('div', { class: 'setting-row' }, h('div', { style: 'flex:1' }, h('label', { text: '볼륨' }), vol)),
      sw('ambient', '앰비언트 험', '항성형에 따라 음높이가 달라지는 배경음'),
      sw('reducedMotion', '모션 감소', '화면 흔들림과 큰 애니메이션을 줄입니다'),
      h('div', { class: 'setting-row' }, h('div', {}, h('label', { text: '파티클' }), h('div', { class: 'desc', text: '느리면 자동으로 낮아집니다' })), seg('particles', [['low', '낮음'], ['medium', '보통'], ['high', '높음']])),
      h('div', { class: 'setting-row' }, h('div', {}, h('label', { text: '숫자 표기' }), h('div', { class: 'desc', text: '1.23만 / 1.23e4' })), seg('numberFormat', [['korean', '한국식'], ['scientific', '과학']])),
      h('div', { class: 'section-title', text: '저장 코드 내보내기' }),
      exportArea,
      h('div', { style: 'margin-top:6px;text-align:right' }, copyBtn),
      h('div', { class: 'section-title', text: '저장 코드 불러오기' }),
      importArea,
      h('div', { style: 'margin-top:6px;text-align:right' }, importBtn),
      h('div', { class: 'section-title', text: '위험 구역' }),
      h('div', { class: 'row' }, h('span', { class: 'muted small', text: '모든 진행(금속, 유산, 업적 포함)을 지웁니다.' }), h('button', { class: 'danger', text: '초기화', on: { click: () => this.openReset() } })),
      h('div', { class: 'dim small', style: 'margin-top:14px', text: 'STELLA v1.0 · 모든 그래픽과 사운드는 코드로 생성됩니다 · 실제 항성 물리를 게임용으로 손질했습니다' }),
      this.actions(h('button', { class: 'primary', text: '닫기', on: { click: () => this.close() } })),
    );
    this.onCloseHooks.push(() => setNumberMode(g.state.settings.numberFormat));
    this.open(modal);
  }

  openReset(): void {
    const input = h('input', { attrs: { type: 'text', placeholder: '초기화', autocomplete: 'off' }, style: 'width:100%;padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:var(--text);font:inherit' }) as HTMLInputElement;
    const btn = h('button', { class: 'danger', text: '영구 삭제' }) as HTMLButtonElement;
    btn.disabled = true;
    input.addEventListener('input', () => {
      btn.disabled = input.value.trim() !== '초기화';
    });
    btn.addEventListener('click', () => {
      this.close();
      this.game.hardReset();
      this.toasts.show('새 성운에서 다시 시작합니다', 'warn');
    });
    this.open(
      h(
        'div',
        { class: 'modal' },
        h('h2', { text: '정말 초기화할까요?' }),
        h('div', { class: 'sub', text: '되돌릴 수 없습니다. 계속하려면 아래에 “초기화”를 입력하세요.' }),
        input,
        this.actions(h('button', { text: '취소', on: { click: () => this.openSettings() } }), btn),
      ),
    );
    input.focus();
  }
}
