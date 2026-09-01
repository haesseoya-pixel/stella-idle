import type { RGB } from './color';

export type ParticleMode = 0 | 1 | 2; // 0 free, 1 attracted to centre, 2 expanding shell (slows)

export interface EmitOpts {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: RGB;
  mode?: ParticleMode;
  drag?: number;
}

const STRIDE = 12; // x y vx vy life maxLife size r g b mode drag

export class ParticleSystem {
  private data: Float32Array;
  private count = 0;
  readonly capacity: number;
  center = { x: 0, y: 0 };
  centerPull = 60;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.data = new Float32Array(capacity * STRIDE);
  }

  get length(): number {
    return this.count;
  }

  clear(): void {
    this.count = 0;
  }

  emit(o: EmitOpts): void {
    let i: number;
    if (this.count < this.capacity) {
      i = this.count++;
    } else {
      i = Math.floor(Math.random() * this.capacity); // overwrite random particle when full
    }
    const d = this.data;
    const b = i * STRIDE;
    d[b] = o.x;
    d[b + 1] = o.y;
    d[b + 2] = o.vx;
    d[b + 3] = o.vy;
    d[b + 4] = o.life;
    d[b + 5] = o.life;
    d[b + 6] = o.size;
    d[b + 7] = o.color[0];
    d[b + 8] = o.color[1];
    d[b + 9] = o.color[2];
    d[b + 10] = o.mode ?? 0;
    d[b + 11] = o.drag ?? 0;
  }

  update(dt: number): void {
    const d = this.data;
    const cx = this.center.x;
    const cy = this.center.y;
    let i = 0;
    while (i < this.count) {
      const b = i * STRIDE;
      let life = d[b + 4]! - dt;
      if (life <= 0) {
        // swap-remove
        const last = (this.count - 1) * STRIDE;
        if (b !== last) for (let k = 0; k < STRIDE; k++) d[b + k] = d[last + k]!;
        this.count--;
        continue;
      }
      d[b + 4] = life;
      const mode = d[b + 10];
      let vx = d[b + 2]!;
      let vy = d[b + 3]!;
      if (mode === 1) {
        const dx = cx - d[b]!;
        const dy = cy - d[b + 1]!;
        const dist = Math.hypot(dx, dy) + 1;
        const pull = this.centerPull * dt * (1 + 40 / dist);
        vx += (dx / dist) * pull;
        vy += (dy / dist) * pull;
        // tangential swirl
        vx += (-dy / dist) * 12 * dt;
        vy += (dx / dist) * 12 * dt;
        if (dist < 6) {
          d[b + 4] = 0.0001;
        }
      }
      const drag = d[b + 11]!;
      if (drag > 0) {
        const f = Math.exp(-drag * dt);
        vx *= f;
        vy *= f;
      }
      d[b + 2] = vx;
      d[b + 3] = vy;
      d[b] = d[b]! + vx * dt;
      d[b + 1] = d[b + 1]! + vy * dt;
      i++;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const d = this.data;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.count; i++) {
      const b = i * STRIDE;
      const t = d[b + 4]! / d[b + 5]!;
      const a = t < 0.3 ? t / 0.3 : 1;
      const size = d[b + 6]! * (d[b + 10] === 2 ? 1 + (1 - t) * 1.5 : 0.6 + 0.4 * t);
      ctx.fillStyle = `rgba(${d[b + 7]},${d[b + 8]},${d[b + 9]},${a * 0.85})`;
      ctx.beginPath();
      ctx.arc(d[b]!, d[b + 1]!, size, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }
}
