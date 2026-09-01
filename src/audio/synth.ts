/**
 * All game sound is synthesized with the Web Audio API; there are no audio assets.
 * The context is created lazily on the first user gesture (autoplay policy).
 */
export class Synth {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private brownBuffer: AudioBuffer | null = null;
  private lastClickAt = 0;
  private clickStreak = 0;
  enabled = true;
  volume = 0.6;

  /** Must be called from a user gesture handler. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 20;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    const master = ctx.createGain();
    master.gain.value = this.enabled ? this.volume : 0;
    const sfx = ctx.createGain();
    sfx.gain.value = 1;
    sfx.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.sfx = sfx;
    if (ctx.state === 'suspended') void ctx.resume();
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  get output(): GainNode | null {
    return this.master;
  }

  setVolume(v: number): void {
    this.volume = v;
    this.applyGain();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyGain();
  }

  private applyGain(): void {
    if (!this.master || !this.ctx) return;
    const target = this.enabled ? this.volume : 0;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private noise(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    return this.noiseBuffer;
  }

  private brown(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.brownBuffer) {
      const len = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        d[i] = last * 3.5;
      }
      this.brownBuffer = buf;
    }
    return this.brownBuffer;
  }

  private tone(opts: {
    type: OscillatorType;
    freq: number;
    freqEnd?: number;
    start?: number;
    attack?: number;
    decay: number;
    gain: number;
    sustain?: number;
    lowpass?: number;
    lowpassEnd?: number;
    detune?: number;
  }): void {
    const ctx = this.ctx;
    const out = this.sfx;
    if (!ctx || !out || !this.enabled) return;
    const t0 = ctx.currentTime + (opts.start ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.detune) osc.detune.value = opts.detune;
    const total = (opts.attack ?? 0.005) + (opts.sustain ?? 0) + opts.decay;
    if (opts.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + total);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain, t0 + (opts.attack ?? 0.005));
    if (opts.sustain) g.gain.setValueAtTime(opts.gain, t0 + (opts.attack ?? 0.005) + opts.sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + total);
    let node: AudioNode = osc;
    if (opts.lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(opts.lowpass, t0);
      if (opts.lowpassEnd) lp.frequency.exponentialRampToValueAtTime(opts.lowpassEnd, t0 + total);
      osc.connect(lp);
      node = lp;
    }
    node.connect(g);
    g.connect(out);
    osc.start(t0);
    osc.stop(t0 + total + 0.05);
  }

  private noiseBurst(opts: { start?: number; duration: number; gain: number; filter?: BiquadFilterType; freq?: number; freqEnd?: number; q?: number; brown?: boolean }): void {
    const ctx = this.ctx;
    const out = this.sfx;
    if (!ctx || !out || !this.enabled) return;
    const t0 = ctx.currentTime + (opts.start ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = opts.brown ? this.brown() : this.noise();
    src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    let node: AudioNode = src;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.setValueAtTime(opts.freq ?? 1000, t0);
      if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + opts.duration);
      if (opts.q) f.Q.value = opts.q;
      src.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(out);
    src.start(t0);
    src.stop(t0 + opts.duration + 0.05);
  }

  // ---- cues ----------------------------------------------------------------

  click(): void {
    const now = performance.now();
    this.clickStreak = now - this.lastClickAt < 200 ? Math.min(this.clickStreak + 1, 15) : 0;
    this.lastClickAt = now;
    const pitch = 1 + 0.02 * this.clickStreak;
    this.tone({ type: 'sine', freq: 880 * pitch, freqEnd: 440 * pitch, decay: 0.08, gain: 0.12 });
    this.noiseBurst({ duration: 0.03, gain: 0.04, filter: 'highpass', freq: 3000 });
  }

  giantClick(): void {
    this.tone({ type: 'triangle', freq: 220, freqEnd: 110, decay: 0.15, gain: 0.1, lowpass: 900 });
  }

  purchase(count = 1): void {
    this.tone({ type: 'triangle', freq: 523, decay: 0.07, gain: 0.1 });
    this.tone({ type: 'triangle', freq: 784, start: 0.07, decay: 0.09, gain: 0.1 });
    if (count > 1) this.tone({ type: 'triangle', freq: 1046, start: 0.15, decay: 0.12, gain: 0.09 });
  }

  cannotAfford(): void {
    this.tone({ type: 'square', freq: 110, decay: 0.06, gain: 0.06, lowpass: 600 });
  }

  ignition(): void {
    this.tone({ type: 'sawtooth', freq: 120, freqEnd: 720, decay: 0.5, gain: 0.18, lowpass: 300, lowpassEnd: 4000 });
    for (const [f, i] of [
      [261.6, 0],
      [329.6, 1],
      [392, 2],
    ] as const) {
      this.tone({ type: 'sine', freq: f, start: 0.4 + i * 0.02, attack: 0.4, sustain: 0.4, decay: 1.5, gain: 0.08 });
    }
  }

  typeChange(order: number): void {
    const base = 1 + order * 0.08;
    const notes = [659.3, 784, 987.8, 1318.5];
    notes.forEach((f, i) => this.tone({ type: 'sine', freq: f * base, start: i * 0.11, decay: 0.4, gain: 0.1 }));
  }

  achievement(): void {
    [523.3, 659.3, 784].forEach((f, i) => this.tone({ type: 'triangle', freq: f, start: i * 0.1, decay: 0.35, gain: 0.09 }));
    this.tone({ type: 'sine', freq: 2000, start: 0.3, decay: 0.3, gain: 0.03 });
  }

  giant(): void {
    this.noiseBurst({ duration: 2.5, gain: 0.25, filter: 'lowpass', freq: 120, brown: true });
    this.tone({ type: 'sine', freq: 55, decay: 1.5, gain: 0.25 });
  }

  nebula(): void {
    for (const f of [220, 221.5, 330]) this.tone({ type: 'sine', freq: f, attack: 0.8, sustain: 0.5, decay: 2.5, gain: 0.07 });
    for (let i = 0; i < 6; i++) this.tone({ type: 'sine', freq: 1200 + Math.random() * 1800, start: 0.5 + Math.random() * 2, decay: 0.5, gain: 0.03 });
  }

  supernova(): void {
    this.noiseBurst({ start: 0.15, duration: 2.5, gain: 0.45, filter: 'lowpass', freq: 8000, freqEnd: 100 });
    this.tone({ type: 'sine', freq: 40, start: 0.15, decay: 2, gain: 0.35 });
    for (let i = 0; i < 4; i++) this.tone({ type: 'sine', freq: 1500 + i * 500, start: 1.35, attack: 0.2, decay: 1, gain: 0.03 });
  }

  kilonova(): void {
    this.supernova();
    const ctx = this.ctx;
    const out = this.sfx;
    if (!ctx || !out || !this.enabled) return;
    const t0 = ctx.currentTime + 0.4;
    const carrier = ctx.createOscillator();
    carrier.frequency.value = 1320;
    const mod = ctx.createOscillator();
    mod.frequency.value = 1320 * 3.3;
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(200, t0);
    modGain.gain.exponentialRampToValueAtTime(1, t0 + 1.5);
    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    carrier.connect(g);
    g.connect(out);
    carrier.start(t0);
    mod.start(t0);
    carrier.stop(t0 + 2.3);
    mod.stop(t0 + 2.3);
  }

  tribute(): void {
    this.tone({ type: 'sine', freq: 440, decay: 0.12, gain: 0.07 });
    this.tone({ type: 'sine', freq: 587.3, start: 0.12, decay: 0.2, gain: 0.07 });
  }

  planet(): void {
    this.tone({ type: 'sine', freq: 330, freqEnd: 660, attack: 0.05, decay: 0.5, gain: 0.08 });
    this.tone({ type: 'triangle', freq: 990, start: 0.2, decay: 0.4, gain: 0.05 });
  }

  civ(tier: number): void {
    const notes = [392, 493.9, 587.3, 784].slice(0, 2 + tier);
    notes.forEach((f, i) => this.tone({ type: 'triangle', freq: f, start: i * 0.09, decay: 0.4, gain: 0.08 }));
  }

  ui(): void {
    this.tone({ type: 'sine', freq: 1000, decay: 0.03, gain: 0.04 });
  }
}
