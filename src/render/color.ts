import { clamp } from '@/util/math';

export type RGB = [number, number, number];

/** Blackbody colour approximation (Tanner Helland), kelvin 1000..40000. */
export function blackbody(kelvin: number): RGB {
  const t = clamp(kelvin, 1000, 40000) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  return [clamp(Math.round(r), 0, 255), clamp(Math.round(g), 0, 255), clamp(Math.round(b), 0, 255)];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

export function rgba(c: RGB, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a > 1 ? 1 : a})`;
}

export function rgb(c: RGB): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function lighten(c: RGB, t: number): RGB {
  return mix(c, [255, 255, 255], t);
}

export function darken(c: RGB, t: number): RGB {
  return mix(c, [0, 0, 0], t);
}

/** Star colour for a given temperature; brown dwarfs lean magenta. */
export function starColor(kelvin: number, phase: 'cloud' | 'main' | 'giant'): RGB {
  const bb = blackbody(kelvin);
  if (phase === 'cloud') return mix(bb, [150, 50, 60], 0.5);
  if (phase === 'giant') return mix(bb, [255, 120, 60], 0.35);
  return bb;
}
