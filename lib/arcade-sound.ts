// Arcade mode sounds, synthesized with the Web Audio API (no audio files). Browser-only; call from
// a user gesture (key press, tap, click) so the audio context is allowed to start.

let ctx: AudioContext | null = null;
const audio = () => (ctx ??= new AudioContext());

/** A referee's whistle: two close high tones with a fast pea trill, about a third of a second. */
export function whistle(volume = 0.06) {
  const a = audio();
  const t = a.currentTime;
  const out = a.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(volume, t + 0.015);
  out.gain.setValueAtTime(volume, t + 0.26);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  out.connect(a.destination);
  const trill = a.createOscillator();
  const depth = a.createGain();
  trill.frequency.value = 32;
  depth.gain.value = 140;
  trill.connect(depth);
  for (const f of [2870, 3090]) {
    const o = a.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    depth.connect(o.frequency);
    o.connect(out);
    o.start(t);
    o.stop(t + 0.36);
  }
  trill.start(t);
  trill.stop(t + 0.36);
}

/** A stadium air horn: a brassy three-note chord with a little pitch scoop, about a second long. */
export function airHorn(volume = 0.1) {
  const a = audio();
  const t = a.currentTime;
  const tone = a.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 1900;
  const out = a.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(volume, t + 0.04);
  out.gain.setValueAtTime(volume, t + 0.85);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
  tone.connect(out);
  out.connect(a.destination);
  for (const f of [233, 294, 349]) {
    const o = a.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f * 0.94, t);
    o.frequency.linearRampToValueAtTime(f, t + 0.08);
    o.connect(tone);
    o.start(t);
    o.stop(t + 1.2);
  }
}
