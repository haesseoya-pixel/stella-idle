export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;
/** Frame-rate independent exponential approach. */
export const expDecay = (a: number, b: number, rate: number, dt: number): number => b + (a - b) * Math.exp(-rate * dt);
export const TAU = Math.PI * 2;
export const safeNum = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
