import { TAU } from '@/util/math';
import { darken, lighten, mix, rgba, type RGB } from './color';

export interface StarView {
  x: number;
  y: number;
  radius: number;
  color: RGB;
  phase: 'cloud' | 'main' | 'giant';
  t: number;
  /** cloud phase progress 0..1 (mass / ignition mass) */
  progress: number;
  quality: 'low' | 'medium' | 'high';
  /** 0..1 scale (used for collapse animations) */
  scale: number;
  dimming: number;
}

export function drawStar(ctx: CanvasRenderingContext2D, v: StarView): void {
  if (v.scale <= 0.001) return;
  const { x, y, t } = v;
  const r = v.radius * v.scale;
  const col = v.color;
  const giant = v.phase === 'giant';
  const dim = 1 - v.dimming;

  // corona
  const pulse = 1 + 0.03 * Math.sin(t * 1.3) + 0.015 * Math.sin(t * 3.7);
  const coronaR = r * (giant ? 2.1 : 2.6) * pulse;
  const cg = ctx.createRadialGradient(x, y, r * 0.9, x, y, coronaR);
  cg.addColorStop(0, rgba(col, 0.55 * dim));
  cg.addColorStop(0.25, rgba(col, 0.22 * dim));
  cg.addColorStop(0.6, rgba(col, 0.07 * dim));
  cg.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(x, y, coronaR, 0, TAU);
  ctx.fill();

  // flares / prominences
  if (v.quality !== 'low') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = v.quality === 'high' ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const ang = t * (0.12 + i * 0.017) + (i * TAU) / n;
      const len = r * (0.35 + 0.25 * Math.sin(t * 0.9 + i * 1.7));
      const px = x + Math.cos(ang) * r * 0.98;
      const py = y + Math.sin(ang) * r * 0.98;
      const ex = x + Math.cos(ang + 0.35) * (r + len);
      const ey = y + Math.sin(ang + 0.35) * (r + len);
      const cx1 = x + Math.cos(ang + 0.1) * (r + len * 0.9);
      const cy1 = y + Math.sin(ang + 0.1) * (r + len * 0.9);
      ctx.strokeStyle = rgba(lighten(col, 0.2), 0.35 * dim);
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(cx1, cy1, ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  // body
  const bodyR = giant ? r * (1 + 0.02 * Math.sin(t * 2.1)) : r;
  const bg = ctx.createRadialGradient(x - bodyR * 0.25, y - bodyR * 0.25, bodyR * 0.05, x, y, bodyR);
  bg.addColorStop(0, rgba(lighten(col, 0.75), dim));
  bg.addColorStop(0.45, rgba(lighten(col, 0.25), dim));
  bg.addColorStop(0.85, rgba(col, dim));
  bg.addColorStop(1, rgba(darken(col, 0.35), dim));
  ctx.fillStyle = bg;
  ctx.beginPath();
  if (giant) {
    // turbulent limb
    ctx.moveTo(x + bodyR, y);
    for (let a = 0; a <= TAU + 0.001; a += TAU / 64) {
      const wob = 1 + 0.035 * Math.sin(a * 5 + t * 1.6) + 0.02 * Math.sin(a * 9 - t * 2.3);
      ctx.lineTo(x + Math.cos(a) * bodyR * wob, y + Math.sin(a) * bodyR * wob);
    }
    ctx.closePath();
  } else {
    ctx.arc(x, y, bodyR, 0, TAU);
  }
  ctx.fill();

  // granulation / spots
  if (v.quality === 'high') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, bodyR * 0.985, 0, TAU);
    ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 6; i++) {
      const a = t * 0.05 * (1 + i * 0.13) + i * 1.1;
      const d = bodyR * (0.35 + 0.4 * ((i * 37) % 10) / 10);
      const sx = x + Math.cos(a) * d;
      const sy = y + Math.sin(a * 0.7) * d * 0.6;
      const sr = bodyR * (0.12 + 0.08 * ((i * 53) % 7) / 7);
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      sg.addColorStop(0, rgba(darken(col, 0.45), 0.35));
      sg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = sg;
      ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }
    ctx.restore();
  }

  // limb glow
  ctx.strokeStyle = rgba(lighten(col, 0.4), 0.35 * dim);
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  ctx.arc(x, y, bodyR, 0, TAU);
  ctx.stroke();
}

/** Pre-ignition gas cloud with a dim, reddish protostar in the middle. */
export function drawCloud(ctx: CanvasRenderingContext2D, v: StarView): void {
  const { x, y, t, progress } = v;
  const r = v.radius * v.scale;
  const cloudR = r * (6.5 - progress * 2.5);
  const cloudCol: RGB = mix([120, 60, 140], [200, 80, 60], progress);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = t * 0.08 * (i % 2 ? 1 : -1) + i * 1.26;
    const d = cloudR * 0.35;
    const bx = x + Math.cos(a) * d;
    const by = y + Math.sin(a) * d * 0.8;
    const br = cloudR * (0.7 + 0.15 * Math.sin(t * 0.5 + i));
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, rgba(cloudCol, 0.16));
    g.addColorStop(0.5, rgba(cloudCol, 0.06));
    g.addColorStop(1, rgba(cloudCol, 0));
    ctx.fillStyle = g;
    ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  ctx.restore();
  // protostar core
  const core: RGB = mix([110, 40, 50], [255, 150, 90], progress);
  const glowR = r * (2.4 + progress * 1.6);
  const cg = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  cg.addColorStop(0, rgba(lighten(core, 0.5 * progress), 0.9));
  cg.addColorStop(0.35, rgba(core, 0.6));
  cg.addColorStop(1, rgba(core, 0));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, TAU);
  ctx.fill();
  const bodyR = r * (0.75 + 0.5 * progress);
  const bg = ctx.createRadialGradient(x - bodyR * 0.2, y - bodyR * 0.2, 0, x, y, bodyR);
  bg.addColorStop(0, rgba(lighten(core, 0.35), 1));
  bg.addColorStop(1, rgba(darken(core, 0.4), 1));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x, y, bodyR, 0, TAU);
  ctx.fill();
}

export function drawRemnant(ctx: CanvasRenderingContext2D, kind: 'wd' | 'ns' | 'bh', x: number, y: number, size: number, t: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (kind === 'wd') {
    const g = ctx.createRadialGradient(x, y, 0, x, y, size * 2.2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(210,228,255,0.8)');
    g.addColorStop(1, 'rgba(160,190,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.2, 0, TAU);
    ctx.fill();
  } else if (kind === 'ns') {
    ctx.translate(x, y);
    ctx.rotate(t * 9);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of [1, -1]) {
      const g = ctx.createLinearGradient(0, 0, 0, s * size * 14);
      g.addColorStop(0, 'rgba(180,210,255,0.9)');
      g.addColorStop(1, 'rgba(180,210,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, 0);
      ctx.lineTo(size * 0.3, 0);
      ctx.lineTo(size * 1.6, s * size * 14);
      ctx.lineTo(-size * 1.6, s * size * 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.rotate(-t * 9);
    const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.6);
    g2.addColorStop(0, 'rgba(255,255,255,1)');
    g2.addColorStop(0.5, 'rgba(200,220,255,0.7)');
    g2.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.6, 0, TAU);
    ctx.fill();
  } else {
    // accretion disc
    ctx.translate(x, y);
    ctx.save();
    ctx.scale(1, 0.32);
    ctx.rotate(t * 0.6);
    const dg = ctx.createRadialGradient(0, 0, size * 1.1, 0, 0, size * 4.2);
    dg.addColorStop(0, 'rgba(255,240,200,0.95)');
    dg.addColorStop(0.3, 'rgba(255,170,70,0.75)');
    dg.addColorStop(0.7, 'rgba(255,90,30,0.35)');
    dg.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(0, 0, size * 4.2, 0, TAU);
    ctx.fill();
    ctx.restore();
    // photon ring
    ctx.strokeStyle = 'rgba(255,220,160,0.9)';
    ctx.lineWidth = Math.max(1.5, size * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.08, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
