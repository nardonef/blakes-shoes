// Stadium sound, synthesized with Web Audio (no audio files): a referee's whistle and pads hitting. Browsers only allow audio after a tap, so start() is
// called from a click handler.

const MUTE_KEY = "rivalry-muted";

export class StadiumAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {}
  }

  /** Create the audio graph. Safe to call more than once. */
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);

    // Two seconds of pink-ish noise, the raw material for hits.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + w * 0.06;
      b1 = 0.96 * b1 + w * 0.12;
      d[i] = (b0 + b1 + w * 0.05) * 0.5;
    }
    this.noise = buf;
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {}
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  /** Referee whistle: two detuned tones with a quick warble. */
  whistle(long = false) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = long ? 0.9 : 0.45;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.16, t + 0.02);
    out.gain.setValueAtTime(0.16, t + dur - 0.06);
    out.gain.linearRampToValueAtTime(0, t + dur);
    out.connect(this.master);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 28;
    const depth = ctx.createGain();
    depth.gain.value = 45;
    lfo.connect(depth);
    for (const f of [2700, 2930]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      depth.connect(o.frequency);
      o.connect(out);
      o.start(t);
      o.stop(t + dur);
    }
    lfo.start(t);
    lfo.stop(t + dur);
  }

  /** Pads colliding: a short low-passed noise burst with a body thump. */
  hit(strength = 1) {
    if (!this.ctx || !this.master || !this.noise) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9 * strength, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + 0.2);
    const thump = ctx.createOscillator();
    thump.frequency.setValueAtTime(110, t);
    thump.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.5 * strength, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    thump.connect(tg).connect(this.master);
    thump.start(t);
    thump.stop(t + 0.2);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}

/** Phone buzz where supported (Android); a no-op elsewhere. */
export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
