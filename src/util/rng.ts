/** mulberry32 — small, fast, seedable PRNG returning [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  const i = Math.floor(rng() * arr.length);
  return arr[Math.min(i, arr.length - 1)] as T;
}

export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
