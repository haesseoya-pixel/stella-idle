import type { Game } from '@/app/game';
import { ECON, GIANT_INFO } from '@/game/constants';
import type { Planet } from '@/game/state';
import { visualRadius } from '@/game/stellar';
import { clamp, expDecay, TAU } from '@/util/math';
import { Background } from './background';
import { lighten, mix, rgba, starColor, type RGB } from './color';
import { Effects } from './effects';
import { ParticleSystem } from './particles';
import { drawDyson, drawOrbits, drawPlanet, planetPosition } from './planets';
import { drawCloud, drawRemnant, drawStar } from './star';

type Quality = 'low' | 'medium' | 'high';
const PARTICLE_CAP: Record<Quality, number> = { low: 60, medium: 180, high: 420 };

export class Scene {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: Game;
  private bg = new Background();
  readonly effects = new Effects();
  private particles: ParticleSystem;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private time = 0;
  private displayRadius = 30;
  private displayColor: RGB = [150, 50, 60];
  private accretionAcc = 0;
  private quality: Quality;
  private frameTimes: number[] = [];
  private governorCooldown = 0;
  private lastRemnantKind: 'wd' | 'ns' | 'bh' = 'wd';
  private lastSeqColor: RGB = [255, 200, 120];

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    this.game = game;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.quality = game.state.settings.particles;
    this.particles = new ParticleSystem(PARTICLE_CAP[this.quality]);
    this.effects.reducedMotion = game.state.settings.reducedMotion;
    this.resize();
    this.wire();
  }

  get cx(): number {
    return this.w / 2;
  }
  get cy(): number {
    return this.h * 0.5;
  }
  get starRadius(): number {
    return this.displayRadius;
  }
  get starColor(): RGB {
    return this.displayColor;
  }

  setQuality(q: Quality): void {
    if (q === this.quality) return;
    this.quality = q;
    this.particles = new ParticleSystem(PARTICLE_CAP[q]);
  }

  resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect?.width ?? window.innerWidth));
    const h = Math.max(1, Math.floor(rect?.height ?? window.innerHeight));
    const isTouch = matchMedia('(pointer: coarse)').matches;
    this.dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.bg.resize(w, h, this.dpr);
  }

  private targetRadius(): number {
    const run = this.game.state.run;
    const minDim = Math.min(this.w, this.h);
    const raw = 0.11 * minDim * visualRadius(run.mass, run.phase) * (this.w < 600 ? 0.85 : 1);
    return Math.min(raw, minDim * (run.phase === 'giant' ? 0.36 : 0.26));
  }

  private targetColor(): RGB {
    const run = this.game.state.run;
    return starColor(this.game.rates.temperature, run.phase);
  }

  private wire(): void {
    const ev = this.game.events;
    ev.on('click', ({ mass, photons }) => this.onClick(mass, photons));
    ev.on('game', (e) => {
      if (e.type === 'ignite') {
        this.effects.flash([255, 230, 200], 0.55, 3);
        this.effects.shake(0.35);
        this.effects.ring(this.cx, this.cy, [255, 200, 140], { speed: 420, maxR: 900, width: 4, alpha: 0.9, life: 1.8 });
        this.burst(120, 160, 3, [255, 200, 140], 1.4);
      } else if (e.type === 'typeChange') {
        this.effects.ring(this.cx, this.cy, lighten(this.targetColor(), 0.3), { speed: 300, maxR: 700, width: 2.5, alpha: 0.7, life: 1.8 });
        this.burst(60, 120, 2.2, lighten(this.targetColor(), 0.3), 1.2);
      } else if (e.type === 'giant') {
        this.effects.shake(0.6);
        this.effects.flash([255, 140, 80], 0.35, 2);
        this.effects.ring(this.cx, this.cy, [255, 140, 80], { speed: 200, maxR: 800, width: 6, alpha: 0.6, life: 2.4 });
      } else if (e.type === 'civTier') {
        this.civPulse(e.planet, e.tier);
      } else if (e.type === 'tribute') {
        this.burst(30, 80, 2, [255, 230, 150], 1.2);
      }
    });
    ev.on('purchase', (p) => {
      if (p.kind === 'planet' && p.planet) {
        const pos = planetPosition(p.planet, this.cx, this.cy, this.displayRadius, Math.min(this.w, this.h));
        this.effects.ring(pos.x, pos.y, [180, 220, 255], { speed: 160, maxR: 140, width: 2, alpha: 0.8, life: 0.9 });
      }
    });
    ev.on('prestige', (r) => {
      const kind = r.fate.remnantKind;
      const seqKind = kind === 'wd' ? 'nebula' : 'supernova';
      this.lastRemnantKind = kind;
      this.lastSeqColor = this.displayColor;
      this.effects.startSequence(seqKind, kind, this.cx, this.cy, this.displayColor);
      if (seqKind === 'supernova') {
        setTimeout(() => {
          this.effects.flash([255, 255, 255], 1, 2.2);
          this.effects.shake(1);
          this.effects.ring(this.cx, this.cy, [255, 240, 220], { speed: 700, maxR: 1600, width: 8, alpha: 1, life: 2.6 });
          this.effects.ring(this.cx, this.cy, [255, 170, 90], { speed: 420, maxR: 1200, width: 4, alpha: 0.8, life: 3 });
          this.burst(this.quality === 'low' ? 60 : 260, 520, 3.2, [255, 220, 170], 3.2, 0.3);
          this.burst(this.quality === 'low' ? 30 : 120, 260, 2.2, [255, 120, 60], 3.6, 0.2);
        }, 500);
      } else {
        this.effects.flash([200, 240, 230], 0.35, 2);
        this.burst(this.quality === 'low' ? 40 : 160, 90, 2.4, [180, 240, 220], 4.5, 0.05);
        this.burst(this.quality === 'low' ? 30 : 100, 60, 2.6, [255, 190, 200], 5, 0.05);
      }
    });
    ev.on('kilonova', () => {
      this.lastRemnantKind = 'bh';
      this.lastSeqColor = [255, 215, 120];
      this.effects.startSequence('kilonova', 'bh', this.cx, this.cy, [255, 215, 120]);
      setTimeout(() => {
        this.effects.flash([255, 240, 200], 1, 2.2);
        this.effects.shake(1);
        this.effects.ring(this.cx, this.cy, [255, 220, 120], { speed: 700, maxR: 1600, width: 8, alpha: 1, life: 2.6 });
        this.burst(this.quality === 'low' ? 60 : 300, 420, 2.6, [255, 215, 120], 3.6, 0.25);
      }, 500);
    });
    ev.on('replaced', () => {
      this.effects.sequence = null;
      this.particles.clear();
      this.displayRadius = this.targetRadius();
      this.displayColor = this.targetColor();
    });
    ev.on('settings', ({ key }) => {
      if (key === 'particles') this.setQuality(this.game.state.settings.particles);
      if (key === 'reducedMotion') this.effects.reducedMotion = this.game.state.settings.reducedMotion;
    });
  }

  private civPulse(planet: Planet, tier: number): void {
    const pos = planetPosition(planet, this.cx, this.cy, this.displayRadius, Math.min(this.w, this.h));
    const col: RGB = tier === 1 ? [120, 255, 170] : tier === 2 ? [255, 224, 138] : tier === 3 ? [154, 216, 255] : [255, 209, 102];
    this.effects.ring(pos.x, pos.y, col, { speed: 120, maxR: 120, width: 2, alpha: 0.9, life: 1.2 });
    if (tier >= 4) this.effects.flash([255, 209, 102], 0.2, 3);
  }

  private onClick(mass: number, photons: number): void {
    const run = this.game.state.run;
    const col = run.phase === 'giant' ? [255, 200, 140] : lighten(this.displayColor, 0.3);
    const n = this.quality === 'low' ? 3 : this.quality === 'medium' ? 6 : 10;
    if (mass > 0) {
      // gas falling in from the edge
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const d = this.displayRadius * (2.6 + Math.random() * 2.2);
        this.particles.emit({
          x: this.cx + Math.cos(a) * d,
          y: this.cy + Math.sin(a) * d,
          vx: -Math.cos(a) * 40,
          vy: -Math.sin(a) * 40,
          life: 1.6,
          size: 1.4 + Math.random() * 1.2,
          color: col as RGB,
          mode: 1,
        });
      }
    } else if (photons > 0) {
      this.burst(n * 2, 140, 2, col as RGB, 0.9);
    }
    this.effects.ring(this.cx, this.cy, col as RGB, { startR: this.displayRadius * 1.02, speed: 120, maxR: this.displayRadius * 1.9, width: 1.5, alpha: 0.35, life: 0.5 });
  }

  private burst(count: number, speed: number, size: number, color: RGB, life: number, drag = 1.2): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.particles.emit({
        x: this.cx + Math.cos(a) * this.displayRadius * 0.9,
        y: this.cy + Math.sin(a) * this.displayRadius * 0.9,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: life * (0.6 + Math.random() * 0.6),
        size: size * (0.6 + Math.random() * 0.8),
        color,
        mode: 2,
        drag,
      });
    }
  }

  frame(dt: number, ts: number): void {
    const t0 = performance.now();
    this.time += dt;
    const t = this.time;
    const state = this.game.state;
    const run = state.run;
    const rates = this.game.rates;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    // smooth visual radius/colour
    this.displayRadius = expDecay(this.displayRadius, this.targetRadius(), 2.2, dt);
    const tc = this.targetColor();
    this.displayColor = mix(this.displayColor, tc, 1 - Math.exp(-2.5 * dt));

    // ambient accretion particles
    if (run.phase !== 'giant' && !this.effects.sequence) {
      const rate = clamp(6 + rates.accretion * 4000, 6, this.quality === 'low' ? 10 : this.quality === 'medium' ? 24 : 40);
      this.accretionAcc += rate * dt;
      while (this.accretionAcc >= 1) {
        this.accretionAcc -= 1;
        const a = Math.random() * TAU;
        const d = this.displayRadius * (3 + Math.random() * 3);
        this.particles.emit({
          x: this.cx + Math.cos(a) * d,
          y: this.cy + Math.sin(a) * d,
          vx: Math.sin(a) * 20,
          vy: -Math.cos(a) * 20,
          life: 4,
          size: 0.9 + Math.random() * 0.9,
          color: run.phase === 'cloud' ? [200, 120, 180] : lighten(this.displayColor, 0.1),
          mode: 1,
        });
      }
    }
    this.particles.center.x = this.cx;
    this.particles.center.y = this.cy;
    this.particles.centerPull = 40 + this.displayRadius * 0.6;
    this.particles.update(dt);
    this.effects.update(dt);

    // ---- draw ----
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#05060d';
    ctx.fillRect(0, 0, w, h);
    this.bg.draw(ctx, t);
    const [sx, sy] = this.effects.shakeOffset(ts / 1000);
    ctx.translate(sx, sy);

    const seq = this.effects.starState();
    const minDim = Math.min(w, h);
    const cx = this.cx;
    const cy = this.cy;
    const R = this.displayRadius;
    const showSystem = !this.effects.sequence;

    if (showSystem && run.slots > 0) drawOrbits(ctx, cx, cy, run.slots, R, minDim);
    this.effects.drawSequence(ctx, w, h);

    // planets behind the star
    const planets = run.planets.map((p) => ({ p, pos: planetPosition(p, cx, cy, R, minDim) }));
    if (showSystem) for (const { p, pos } of planets) if (pos.depth < 0) drawPlanet(ctx, p, pos.x, pos.y, pos.depth, cx, cy, t, this.displayColor);

    // star / cloud / remnant
    const dysonCount = run.planets.filter((p) => p.tier >= 4).length;
    const view = {
      x: cx,
      y: cy,
      radius: R,
      color: this.displayColor,
      phase: run.phase,
      t,
      progress: clamp(run.mass / ECON.IGNITION_MASS, 0, 1),
      quality: this.quality,
      scale: seq.starScale,
      dimming: Math.min(0.3, dysonCount * 0.1),
    } as const;
    if (this.effects.sequence) {
      if (seq.starScale > 0) {
        if (run.phase === 'cloud' && seq.cloudFade > 0) {
          drawCloud(ctx, { ...view, scale: seq.cloudFade });
        } else if (seq.cloudFade === 0) {
          // dying star (giant look)
          drawStar(ctx, { ...view, phase: 'giant', color: this.lastSeqColor, scale: seq.starScale });
        }
      }
      if (seq.remnantAlpha > 0) {
        drawRemnant(ctx, this.lastRemnantKind, cx, cy, Math.max(6, minDim * 0.03), t, seq.remnantAlpha);
      }
      if (seq.cloudFade > 0) {
        if (run.phase === 'cloud') drawCloud(ctx, { ...view, scale: seq.cloudFade });
        else drawStar(ctx, { ...view, scale: seq.cloudFade });
      }
    } else if (run.phase === 'cloud') {
      drawCloud(ctx, view);
    } else {
      drawStar(ctx, view);
    }
    if (showSystem && dysonCount > 0) drawDyson(ctx, cx, cy, R, dysonCount, t, this.displayColor, this.quality);
    this.particles.draw(ctx);
    if (showSystem) for (const { p, pos } of planets) if (pos.depth >= 0) drawPlanet(ctx, p, pos.x, pos.y, pos.depth, cx, cy, t, this.displayColor);
    this.effects.drawRings(ctx);

    // vignette
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const vg = ctx.createRadialGradient(cx, cy, minDim * 0.35, cx, cy, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(5,6,13,0)');
    vg.addColorStop(1, 'rgba(5,6,13,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    this.effects.drawOverlay(ctx, w, h);

    // giant phase label glow hint
    if (run.phase === 'giant' && !this.effects.sequence) {
      ctx.fillStyle = rgba(GIANT_INFO.rgb, 0.08 + 0.04 * Math.sin(t * 2));
      ctx.fillRect(0, 0, w, h);
    }

    this.governor(performance.now() - t0, dt);
  }

  private governor(frameMs: number, dt: number): void {
    this.frameTimes.push(frameMs);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    this.governorCooldown -= dt;
    if (this.governorCooldown > 0 || this.frameTimes.length < 60) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    if (avg > 22 && this.quality !== 'low') {
      this.setQuality(this.quality === 'high' ? 'medium' : 'low');
      this.governorCooldown = 6;
      this.frameTimes = [];
    }
  }
}
