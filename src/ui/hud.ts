import type { Game } from '@/app/game';
import { GIANT_INFO } from '@/game/constants';
import { fateFor } from '@/game/stellar';
import { formatMass, formatTime } from '@/util/format';
import { expDecay } from '@/util/math';
import { h, N, R, setText, toggleClass } from './dom';

export class Hud {
  private game: Game;
  private typeName: HTMLElement;
  private mass: HTMLElement;
  private massSub: HTMLElement;
  private flavor: HTMLElement;
  private fuelLabel: HTMLElement;
  private fuelFill: HTMLElement;
  private fuelWrap: HTMLElement;
  private photons: HTMLElement;
  private photonsRate: HTMLElement;
  private helium: HTMLElement;
  private heliumRate: HTMLElement;
  private tiny: HTMLElement;
  private fateWrap: HTMLElement;
  private fateSub: HTMLElement;
  private shownPhotons = 0;
  private shownHelium = 0;
  private shownMass = 0;

  constructor(root: HTMLElement, fateWrap: HTMLElement, game: Game, onFate: () => void) {
    this.game = game;
    this.typeName = h('span', { text: '' });
    this.mass = h('span');
    this.massSub = h('small');
    this.flavor = h('div', { class: 'hud-flavor' });
    this.fuelLabel = h('span');
    this.fuelFill = h('div', { class: 'fuel-fill' });
    this.photons = h('span', { class: 'res-val photons' });
    this.photonsRate = h('span', { class: 'res-rate' });
    this.helium = h('span', { class: 'res-val helium' });
    this.heliumRate = h('span', { class: 'res-rate' });
    this.tiny = h('div', { class: 'hud-tiny' });
    this.fuelWrap = h(
      'div',
      { class: 'fuel' },
      h('div', { class: 'fuel-label' }, h('span', { text: '연료 (수소 핵)' }), this.fuelLabel),
      h('div', { class: 'fuel-bar' }, this.fuelFill),
    );
    root.append(
      h(
        'div',
        { class: 'hud-card' },
        h('div', { class: 'hud-type' }, h('span', { class: 'hud-dot' }), this.typeName),
        h('div', { class: 'hud-mass' }, this.mass, this.massSub),
        this.flavor,
        this.fuelWrap,
      ),
      h(
        'div',
        { class: 'hud-card' },
        h('div', { class: 'res-row' }, h('span', { class: 'res-name', text: '광자' }), h('span', {}, this.photons, this.photonsRate)),
        h('div', { class: 'res-row' }, h('span', { class: 'res-name', text: '헬륨' }), h('span', {}, this.helium, this.heliumRate)),
        this.tiny,
      ),
    );
    this.fateSub = h('span', { class: 'fate-sub' });
    this.fateWrap = fateWrap;
    fateWrap.append(h('button', { class: 'fate-btn', text: '운명 맞이하기', on: { click: onFate } }), this.fateSub);
    this.shownPhotons = game.state.run.photons;
    this.shownHelium = game.state.run.helium;
    this.shownMass = game.state.run.mass;
  }

  /** Called every frame; counters lerp toward the true values. */
  update(dt: number): void {
    const s = this.game.state;
    const run = s.run;
    const r = this.game.rates;
    const k = 12;
    this.shownPhotons = Math.abs(run.photons - this.shownPhotons) < 1e-6 ? run.photons : expDecay(this.shownPhotons, run.photons, k, dt);
    this.shownHelium = expDecay(this.shownHelium, run.helium, k, dt);
    this.shownMass = expDecay(this.shownMass, run.mass, k, dt);
    if (run.photons < this.shownPhotons) this.shownPhotons = run.photons;
    if (run.helium < this.shownHelium) this.shownHelium = run.helium;

    const giant = run.phase === 'giant';
    setText(this.typeName, giant ? GIANT_INFO.name : r.type.name);
    setText(this.mass, formatMass(this.shownMass));
    setText(this.massSub, run.phase === 'cloud' ? `점화까지 ${Math.max(0, Math.round((0.08 - run.mass) / 0.0001) / 10000).toFixed(4)} M☉` : `${Math.round(r.temperature).toLocaleString('ko-KR')} K`);
    setText(this.flavor, giant ? (run.mass < 0.5 ? GIANT_INFO.flavorLight : GIANT_INFO.flavor) : r.type.flavor);

    if (run.phase === 'cloud') {
      this.fuelWrap.hidden = true;
    } else {
      this.fuelWrap.hidden = false;
      const pct = Math.max(0, Math.min(100, run.fuel * 100));
      this.fuelFill.style.width = `${pct.toFixed(1)}%`;
      toggleClass(this.fuelFill, 'low', pct < 15 && !giant);
      setText(this.fuelLabel, giant ? '소진 — 적색 거성' : `${pct.toFixed(1)}% · 잔여 ${Number.isFinite(r.remainingSec) ? formatTime(r.remainingSec) : '∞'}`);
    }

    setText(this.photons, N(this.shownPhotons));
    setText(this.photonsRate, `+${R(r.photons)}`);
    setText(this.helium, N(this.shownHelium));
    setText(this.heliumRate, run.phase === 'cloud' ? '점화 필요' : `+${R(r.helium)}`);
    setText(this.tiny, `#${run.runIndex}번째 별 · 광자 배율 ×${r.mult.photon >= 100 ? N(r.mult.photon) : r.mult.photon.toFixed(2)} · 예정 운명: ${fateFor(run.mass).name}`);

    const showFate = giant;
    if (this.fateWrap.hidden === showFate) this.fateWrap.hidden = !showFate;
    if (showFate) setText(this.fateSub, `${fateFor(run.mass).event} → ${fateFor(run.mass).name}`);
  }
}
