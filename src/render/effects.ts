import { clamp, easeOutCubic, TAU } from '@/util/math';
import { rgba, type RGB } from './color';

interface Ring {
  x: number;
  y: number;
  r: number;
  speed: number;
  maxR: number;
  color: RGB;
  width: number;
  alpha: number;
  age: number;
  life: number;
}

export type SequenceKind = 'nebula' | 'supernova' | 'kilonova';

export interface Sequence {
  kind: SequenceKind;
  remnant: 'wd' | 'ns' | 'bh';
  t: number;
  duration: number;
  x: number;
  y: number;
  color: RGB;
}

/** Screen-level effects: flashes, shake, expanding rings, and the death/rebirth sequences. */
export class Effects {
  private flashAlpha = 0;
  private flashColor: RGB = [255, 255, 255];
  private flashDecay = 4;
  trauma = 0;
  private rings: Ring[] = [];
  sequence: Sequence | null = null;
  reducedMotion = false;

  flash(color: RGB, alpha: number, decay = 4): void {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
    this.flashDecay = decay;
  }

  shake(amount: number): void {
    if (this.reducedMotion) return;
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  ring(x: number, y: number, color: RGB, opts: { speed?: number; maxR?: number; width?: number; alpha?: number; life?: number; startR?: number } = {}): void {
    this.rings.push({
      x,
      y,
      r: opts.startR ?? 0,
      speed: opts.speed ?? 260,
      maxR: opts.maxR ?? 600,
      color,
      width: opts.width ?? 3,
      alpha: opts.alpha ?? 0.8,
      age: 0,
      life: opts.life ?? 1.6,
    });
  }

  startSequence(kind: SequenceKind, remnant: 'wd' | 'ns' | 'bh', x: number, y: number, color: RGB): void {
    this.sequence = { kind, remnant, t: 0, duration: kind === 'nebula' ? 6.5 : 7, x, y, color };
  }

  skipSequence(): void {
    if (this.sequence) this.sequence.t = this.sequence.duration;
  }

  get blocking(): boolean {
    return this.sequence !== null && this.sequence.t < this.sequence.duration - 0.3;
  }

  update(dt: number): void {
    this.flashAlpha = Math.max(0, this.flashAlpha - this.flashDecay * dt * this.flashAlpha - 0.02 * dt);
    this.trauma = Math.max(0, this.trauma - 1.5 * dt);
    for (const r of this.rings) {
      r.age += dt;
      r.r += r.speed * dt;
    }
    this.rings = this.rings.filter((r) => r.age < r.life && r.r < r.maxR);
    if (this.sequence) {
      this.sequence.t += dt;
      if (this.sequence.t >= this.sequence.duration) this.sequence = null;
    }
  }

  shakeOffset(t: number): [number, number] {
    if (this.trauma <= 0) return [0, 0];
    const k = 14 * this.trauma * this.trauma;
    return [k * Math.sin(t * 61.3) * Math.cos(t * 23.1), k * Math.cos(t * 47.7) * Math.sin(t * 31.9)];
  }

  /** How the star should be drawn during a sequence: scale of the star body, remnant alpha, overlay progress. */
  starState(): { starScale: number; remnantAlpha: number; cloudFade: number } {
    const s = this.sequence;
    if (!s) return { starScale: 1, remnantAlpha: 0, cloudFade: 1 };
    const t = s.t;
    if (s.kind === 'nebula') {
      // 0-1.2: swell and fade; 1.2-4.5: remnant; 4.5-6.5: new cloud fades in
      const starScale = t < 1.2 ? 1 + 0.6 * easeOutCubic(t / 1.2) : 0;
      const starAlphaFade = t < 1.2 ? 1 : 0;
      const remnantAlpha = t < 1.0 ? 0 : t < 1.8 ? (t - 1.0) / 0.8 : t < 5.0 ? 1 : Math.max(0, 1 - (t - 5.0) / 1.2);
      const cloudFade = t < 5.0 ? 0 : clamp((t - 5.0) / 1.5, 0, 1);
      return { starScale: starScale * starAlphaFade, remnantAlpha, cloudFade };
    }
    // supernova / kilonova: 0-0.5 collapse; 0.5 flash; 0.5-1.2 nothing; 1.2-5.5 remnant; 5.5-7 cloud fades in
    const starScale = t < 0.5 ? 1 - 0.85 * easeOutCubic(t / 0.5) : 0;
    const remnantAlpha = t < 1.2 ? 0 : t < 2.0 ? (t - 1.2) / 0.8 : t < 5.5 ? 1 : Math.max(0, 1 - (t - 5.5) / 1.2);
    const cloudFade = t < 5.5 ? 0 : clamp((t - 5.5) / 1.5, 0, 1);
    return { starScale, remnantAlpha, cloudFade };
  }

  drawRings(ctx: CanvasRenderingContext2D): void {
    if (this.rings.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const a = r.alpha * (1 - r.age / r.life);
      ctx.strokeStyle = rgba(r.color, a);
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSequence(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const s = this.sequence;
    if (!s) return;
    const t = s.t;
    if (s.kind === 'nebula') {
      // expanding pastel shells
      if (t > 0.9 && t < 6.5) {
        const p = (t - 0.9) / 5.6;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const shells: [RGB, number][] = [
          [[120, 220, 200], 1],
          [[220, 140, 200], 0.72],
          [[255, 190, 120], 0.5],
        ];
        for (const [col, k] of shells) {
          const r = 40 + p * Math.max(w, h) * 0.75 * k;
          const g = ctx.createRadialGradient(s.x, s.y, r * 0.55, s.x, s.y, r);
          const a = 0.35 * (1 - p);
          g.addColorStop(0, rgba(col, 0));
          g.addColorStop(0.8, rgba(col, a));
          g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    } else {
      if (t >= 0.5 && t < 4) {
        const p = (t - 0.5) / 3.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const r = p * Math.max(w, h) * 1.1;
        const g = ctx.createRadialGradient(s.x, s.y, r * 0.8, s.x, s.y, r);
        const col: RGB = s.kind === 'kilonova' ? [255, 215, 120] : [255, 240, 220];
        g.addColorStop(0, rgba(col, 0));
        g.addColorStop(0.85, rgba(col, 0.7 * (1 - p)));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.flashAlpha > 0.003) {
      ctx.fillStyle = rgba(this.flashColor, this.flashAlpha);
      ctx.fillRect(0, 0, w, h);
    }
  }
}
