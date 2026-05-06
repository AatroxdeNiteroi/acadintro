/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Procedural Web Audio.

   Zero external assets. All sounds synthesized live:
     • Drone ambient — 3 oscillators with LFO-modulated low-pass
       filter, plus subtle delay-feedback for cathedral feel.
     • Hover ping — character-specific frequency, short envelope.
     • Selection clang — noise burst through bandpass sweep.
     • Bass drop — drone pitch-shifts down dramatically for warp.
     • Wheel tick — short noise burst with high-pass.

   Browsers require a user gesture before AudioContext starts —
   call `unlock()` on the first pointer/key event.
   ═══════════════════════════════════════════════════════════ */

let ctx = null;
let masterGain = null;
let droneState = null;
let unlocked = false;

const AVATAR_FREQ = {
  aatrox: 116.5,    // A♯2 — grave, threatening
  druid:  220.0,    // A3 — earthy mid
  kratos: 174.6,    // F3 — heavy bronze
  guts:    87.3,    // F2 — deep void
  ichigo: 392.0,    // G4 — high spectral
};

export function unlock() {
  if (unlocked) return false;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    if (ctx.state === 'suspended') ctx.resume();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.85;
    masterGain.connect(ctx.destination);
    unlocked = true;
    return true;
  } catch (e) {
    console.warn('[audio] unlock failed', e);
    return false;
  }
}

export function isUnlocked() { return unlocked; }

// ── Ambient drone — fades in over 4s, hum forever ───────────────
export function startDrone() {
  if (!ctx || droneState) return;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0, ctx.currentTime);
  out.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 4.5);
  out.connect(masterGain);

  // LFO-modulated low-pass for breathing warmth
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  lp.Q.value = 0.7;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.11;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(lp.frequency);

  // Three sine oscs — root + fifth + octave (perfect open chord)
  const o1 = ctx.createOscillator(); o1.type = 'sine';     o1.frequency.value =  55;   // A1
  const o2 = ctx.createOscillator(); o2.type = 'sine';     o2.frequency.value =  82.5; // E2
  const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 110;   // A2

  const sum = ctx.createGain(); sum.gain.value = 0.55;
  o1.connect(sum); o2.connect(sum); o3.connect(sum);

  // Cheap delay-feedback for cathedral ambience
  const delay = ctx.createDelay(2.0);
  delay.delayTime.value = 0.42;
  const fb = ctx.createGain(); fb.gain.value = 0.55;
  delay.connect(fb).connect(delay);

  sum.connect(lp);
  lp.connect(out);
  lp.connect(delay).connect(out);

  o1.start(); o2.start(); o3.start(); lfo.start();

  droneState = { out, oscs: [o1, o2, o3], lfo, lp };
}

// ── Hover ping — subtle character-flavoured note ───────────────
export function hoverPing(avatarKey) {
  if (!ctx) return;
  const freq = AVATAR_FREQ[avatarKey] || 220;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;

  // Tiny detune wobble for life
  const detune = ctx.createOscillator();
  detune.frequency.value = 6;
  const detuneGain = ctx.createGain();
  detuneGain.gain.value = 4;
  detune.connect(detuneGain).connect(osc.frequency);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.07, t + 0.04);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

  osc.connect(env).connect(masterGain);
  osc.start(t); detune.start(t);
  osc.stop(t + 0.6); detune.stop(t + 0.6);
}

// ── Selection clang — noise burst + bandpass sweep down ───────
export function selectClang(avatarKey) {
  if (!ctx) return;
  const t = ctx.currentTime;

  // Noise buffer with exponential decay
  const dur = 1.1;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 4.5);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  // Bandpass sweep — high to low (resonant clang)
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 6;
  bp.frequency.setValueAtTime(2400, t);
  bp.frequency.exponentialRampToValueAtTime(280, t + 0.85);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.22, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);

  noise.connect(bp).connect(env).connect(masterGain);
  noise.start(t);

  // Sub-tonal layer at the avatar's frequency one octave down
  const sub = ctx.createOscillator();
  sub.type = 'sawtooth';
  sub.frequency.value = (AVATAR_FREQ[avatarKey] || 220) * 0.5;
  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0.10, t);
  subEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
  const subLP = ctx.createBiquadFilter();
  subLP.type = 'lowpass'; subLP.frequency.value = 380;
  sub.connect(subLP).connect(subEnv).connect(masterGain);
  sub.start(t); sub.stop(t + 1.5);
}

// ── Bass drop — drone pitches down, swells, then chokes ───────
export function bassDrop() {
  if (!ctx || !droneState) return;
  const t = ctx.currentTime;

  droneState.oscs.forEach((o) => {
    const f = o.frequency.value;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.42, t + 1.1);
  });

  droneState.out.gain.cancelScheduledValues(t);
  droneState.out.gain.setValueAtTime(droneState.out.gain.value, t);
  droneState.out.gain.linearRampToValueAtTime(0.18, t + 0.55);
  droneState.out.gain.linearRampToValueAtTime(0.0,  t + 1.5);
}

// ── Wheel tick — tiny crisp click when rotating carousel ──────
let _lastTick = 0;
export function wheelTick() {
  if (!ctx) return;
  const now = performance.now();
  if (now - _lastTick < 75) return;   // throttle
  _lastTick = now;

  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 2400;
  const env = ctx.createGain(); env.gain.value = 0.025;
  src.connect(hp).connect(env).connect(masterGain);
  src.start(t);
}
