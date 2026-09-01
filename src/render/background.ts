import { mulberry32 } from '@/util/rng';

interface Twinkle {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

/** Static starfield pre-rendered on resize plus a few twinkling stars drawn live. */
export class Background {
  private layer: HTMLCanvasElement = document.createElement('canvas');
  private twinkles: Twinkle[] = [];
  private w = 0;
  private h = 0;

  resize(w: number, h: number, dpr: number): void {
    this.w = w;
    this.h = h;
    this.layer.width = Math.max(1, Math.floor(w * dpr));
    this.layer.height = Math.max(1, Math.floor(h * dpr));
    const ctx = this.layer.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const rng = mulberry32(1337);
    // faint nebulous patches
    for (let i = 0; i < 5; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = 120 + rng() * 260;
      const hue = rng() < 0.5 ? '90, 60, 160' : '40, 80, 150';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${hue}, 0.10)`);
      g.addColorStop(1, `rgba(${hue}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const count = Math.floor((w * h) / 2800);
    for (let i = 0; i < count; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = rng() < 0.85 ? 0.5 + rng() * 0.6 : 1 + rng() * 0.8;
      const a = 0.25 + rng() * 0.6;
      const tint = rng();
      ctx.fillStyle = tint < 0.15 ? `rgba(255,220,190,${a})` : tint < 0.3 ? `rgba(190,210,255,${a})` : `rgba(235,240,255,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }
    this.twinkles = [];
    const trng = mulberry32(99);
    for (let i = 0; i < 34; i++) {
      this.twinkles.push({ x: trng() * w, y: trng() * h, r: 0.9 + trng() * 1.2, phase: trng() * 6.28, speed: 0.6 + trng() * 1.6 });
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(this.layer, 0, 0, this.w, this.h);
    for (const s of this.twinkles) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = `rgba(240,244,255,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (0.8 + 0.3 * a), 0, 6.2832);
      ctx.fill();
    }
  }
}
