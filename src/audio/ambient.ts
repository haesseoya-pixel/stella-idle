import type { Synth } from './synth';

const TYPE_FREQ: Record<string, number> = { brown: 55, M: 55, K: 65, G: 73, F: 82, B: 98, O: 110, giant: 49 };

/** Continuous hum whose pitch tracks the stellar type. */
export class Ambient {
  private synth: Synth;
  private started = false;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private currentKey = '';
  enabled = true;

  constructor(synth: Synth) {
    this.synth = synth;
  }

  private ensure(): boolean {
    const ctx = this.synth.ctx;
    const out = this.synth.output;
    if (!ctx || !out) return false;
    if (this.started) return true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(out);
    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    oscA.connect(gain);
    oscB.connect(gain);
    oscA.start();
    oscB.start();
    lfo.start();
    // solar wind: filtered noise
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.05 * w) / 1.05;
      d[i] = last * 2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const ng = ctx.createGain();
    ng.gain.value = 0;
    src.connect(lp);
    lp.connect(ng);
    ng.connect(out);
    src.start();
    this.oscA = oscA;
    this.oscB = oscB;
    this.gain = gain;
    this.noiseGain = ng;
    this.started = true;
    return true;
  }

  setType(key: string): void {
    if (!this.ensure()) return;
    if (key === this.currentKey) return;
    this.currentKey = key;
    const ctx = this.synth.ctx!;
    const f = TYPE_FREQ[key] ?? 60;
    const t = ctx.currentTime;
    this.oscA!.frequency.setTargetAtTime(f, t, 0.8);
    this.oscB!.frequency.setTargetAtTime(f * 1.008, t, 0.8);
    this.applyGain();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyGain();
  }

  private applyGain(): void {
    if (!this.ensure()) return;
    const ctx = this.synth.ctx!;
    const t = ctx.currentTime;
    this.gain!.gain.setTargetAtTime(this.enabled ? 0.06 : 0, t, 0.8);
    this.noiseGain!.gain.setTargetAtTime(this.enabled ? 0.025 : 0, t, 0.8);
  }
}
