import type { Planet } from '@/game/state';
import { TAU } from '@/util/math';
import { mulberry32 } from '@/util/rng';
import { darken, lighten, mix, rgba, type RGB } from './color';

export const ORBIT_Y_SCALE = 0.38;

export function orbitRadius(index: number, starR: number, minDim: number): number {
  const r0 = Math.max(1.6 * starR, 0.17 * minDim);
  return r0 + index * 0.065 * minDim;
}

export interface PlanetStyle {
  base: RGB;
  band: RGB;
  size: number;
  bands: number;
  tilt: number;
}

const styleCache = new Map<number, PlanetStyle>();

export function planetStyle(p: Planet): PlanetStyle {
  const key = p.seed * 2 + (p.kind === 'gas' ? 1 : 0);
  let s = styleCache.get(key);
  if (s) return s;
  const rng = mulberry32(p.seed + 11);
  if (p.kind === 'gas') {
    const palettes: [RGB, RGB][] = [
      [[214, 170, 120], [160, 120, 80]],
      [[120, 160, 220], [80, 110, 170]],
      [[220, 200, 160], [180, 150, 110]],
      [[150, 190, 200], [100, 140, 160]],
    ];
    const pal = palettes[Math.floor(rng() * palettes.length)]!;
    s = { base: pal[0], band: pal[1], size: 7 + rng() * 3, bands: 2 + Math.floor(rng() * 3), tilt: (rng() - 0.5) * 0.6 };
  } else {
    const palettes: [RGB, RGB][] = [
      [[150, 140, 130], [110, 100, 95]],
      [[170, 120, 90], [120, 80, 60]],
      [[130, 135, 150], [90, 95, 110]],
    ];
    const pal = palettes[Math.floor(rng() * palettes.length)]!;
    s = { base: pal[0], band: pal[1], size: 4 + rng() * 2.5, bands: 0, tilt: 0 };
  }
  styleCache.set(key, s);
  return s;
}

export function planetPosition(p: Planet, cx: number, cy: number, starR: number, minDim: number): { x: number; y: number; depth: number } {
  const r = orbitRadius(p.orbitIndex, starR, minDim);
  const x = cx + Math.cos(p.angle) * r;
  const y = cy + Math.sin(p.angle) * r * ORBIT_Y_SCALE;
  return { x, y, depth: Math.sin(p.angle) };
}

export function drawOrbits(ctx: CanvasRenderingContext2D, cx: number, cy: number, slots: number, starR: number, minDim: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(180,195,255,0.13)';
  ctx.lineWidth = 1;
  for (let i = 0; i < slots; i++) {
    const r = orbitRadius(i, starR, minDim);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * ORBIT_Y_SCALE, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlanet(ctx: CanvasRenderingContext2D, p: Planet, x: number, y: number, depth: number, starX: number, starY: number, t: number, starColor: RGB): void {
  const st = planetStyle(p);
  const scale = 0.8 + 0.2 * (depth + 1) * 0.5 + (depth > 0 ? 0.15 : 0);
  const size = st.size * scale;
  let base = st.base;
  if (p.kind === 'rocky' && p.tier >= 1) base = mix(base, [60, 170, 110], Math.min(0.55, 0.25 + p.tier * 0.1));
  // light direction from star
  const dx = starX - x;
  const dy = starY - y;
  const d = Math.hypot(dx, dy) || 1;
  const lx = x + (dx / d) * size * 0.45;
  const ly = y + (dy / d) * size * 0.45;
  const g = ctx.createRadialGradient(lx, ly, size * 0.1, x, y, size);
  g.addColorStop(0, rgba(lighten(base, 0.35), 1));
  g.addColorStop(0.6, rgba(base, 1));
  g.addColorStop(1, rgba(darken(base, 0.6), 1));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, TAU);
  ctx.fill();
  if (st.bands > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = rgba(st.band, 0.45);
    ctx.lineWidth = size * 0.22;
    for (let i = 0; i < st.bands; i++) {
      const yy = y - size + ((i + 1) * size * 2) / (st.bands + 1);
      ctx.beginPath();
      ctx.moveTo(x - size, yy + st.tilt * (-size));
      ctx.lineTo(x + size, yy + st.tilt * size);
      ctx.stroke();
    }
    ctx.restore();
  }
  // civilization: night-side city lights
  if (p.kind === 'rocky' && p.tier >= 2) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.clip();
    const rng = mulberry32(p.seed + 99);
    ctx.fillStyle = 'rgba(255,220,140,0.95)';
    const n = 6 + p.tier * 3;
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU;
      const rr = rng() * size * 0.9;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      // only on the side facing away from the star
      if ((px - x) * dx + (py - y) * dy > 0) continue;
      ctx.fillRect(px, py, 0.9, 0.9);
    }
    ctx.restore();
  }
  // spacefaring: satellites
  if (p.kind === 'rocky' && p.tier >= 3) {
    ctx.fillStyle = 'rgba(200,230,255,0.9)';
    for (let i = 0; i < 3; i++) {
      const a = t * (1.8 + i * 0.4) + i * 2.1;
      const rr = size * (1.6 + i * 0.25);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.5, 1.1, 0, TAU);
      ctx.fill();
    }
  }
  // dyson: faint ring hint around planet using star colour
  if (p.tier >= 4) {
    ctx.strokeStyle = rgba(starColor, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.9, 0, TAU);
    ctx.stroke();
  }
}

export function drawDyson(ctx: CanvasRenderingContext2D, cx: number, cy: number, starR: number, count: number, t: number, color: RGB, quality: 'low' | 'medium' | 'high'): void {
  if (count <= 0) return;
  const n = quality === 'high' ? 80 : quality === 'medium' ? 48 : 24;
  const r = starR * 1.35;
  ctx.save();
  ctx.fillStyle = rgba(lighten(color, 0.3), 0.9);
  for (let ring = 0; ring < Math.min(count, 3); ring++) {
    const tilt = 0.25 + ring * 0.12;
    const dir = ring % 2 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.25 * dir + ring;
      const x = cx + Math.cos(a) * r * (1 + ring * 0.12);
      const y = cy + Math.sin(a) * r * (1 + ring * 0.12) * tilt;
      const front = Math.sin(a) > 0;
      ctx.globalAlpha = front ? 0.95 : 0.45;
      ctx.fillRect(x - 1, y - 1, 2.2, 2.2);
    }
  }
  ctx.restore();
}
