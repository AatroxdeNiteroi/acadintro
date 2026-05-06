// Synthesized cyberpunk UI sounds — no audio files. All Web Audio API.
// Lazy-init on first user gesture (browser autoplay policy).

let ctx = null;
let masterGain = null;
let enabled = true;

try { enabled = localStorage.getItem('snd_enabled') !== '0'; } catch {}

function ensureCtx() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(ctx.destination);
  return ctx;
}

export function isSoundEnabled() { return enabled; }
export function setSoundEnabled(v) {
  enabled = !!v;
  try { localStorage.setItem('snd_enabled', v ? '1' : '0'); } catch {}
  if (v) ensureCtx(); // unlock on enable
}

function tone({ freq, dur = 0.05, type = 'sine', vol = 0.05, attack = 0.003, decay = null, sweep = null, when = 0 }) {
  if (!enabled) return;
  const c = ensureCtx(); if (!c) return;
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(masterGain);
  const t0 = c.currentTime + when;
  const t1 = t0 + dur;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  if (sweep != null) {
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t1);
  }
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

function noiseBurst({ dur = 0.04, vol = 0.05, lp = 4000 }) {
  if (!enabled) return;
  const c = ensureCtx(); if (!c) return;
  if (c.state === 'suspended') c.resume();
  const len = Math.max(64, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lp;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(filter); filter.connect(g); g.connect(masterGain);
  src.start();
}

// ── Persona-specific cues — short stylized stings per avatar ─────────
// Triggered on save / PR / finalize for character flavor.
export const personaSfx = {
  aatrox: () => {
    // Heavy slash: noise burst + descending sawtooth
    noiseBurst({ dur: 0.18, vol: 0.05, lp: 1500 });
    tone({ freq: 220, dur: 0.3, type: 'sawtooth', vol: 0.07, sweep: 70 });
    tone({ freq: 110, dur: 0.4, type: 'sine', vol: 0.04, when: 0.05 });
  },
  druid: () => {
    // Nature shimmer: ascending arpeggio with reverb-like decay
    [330, 440, 587, 880].forEach((f, i) => tone({ freq: f, dur: 0.4, type: 'triangle', vol: 0.04, when: i * 0.06 }));
  },
  kratos: () => {
    // Spartan war horn: low square + rising tone
    tone({ freq: 80,  dur: 0.5, type: 'square', vol: 0.06, sweep: 140 });
    tone({ freq: 160, dur: 0.45, type: 'sawtooth', vol: 0.05, when: 0.08, sweep: 280 });
    noiseBurst({ dur: 0.3, vol: 0.025, lp: 600 });
  },
  gun: () => {
    // Cocked & aimed: short metallic clicks + brief tone
    tone({ freq: 1800, dur: 0.04, type: 'square', vol: 0.06 });
    tone({ freq: 1200, dur: 0.04, type: 'square', vol: 0.05, when: 0.06 });
    tone({ freq: 600,  dur: 0.18, type: 'sine', vol: 0.04, when: 0.13 });
  },
  ichigo: () => {
    // Cero charge: ascending FM-ish sweep
    tone({ freq: 200, dur: 0.6, type: 'sawtooth', vol: 0.06, sweep: 1400 });
    tone({ freq: 800, dur: 0.4, type: 'sine', vol: 0.04, when: 0.15 });
    noiseBurst({ dur: 0.5, vol: 0.02, lp: 4000 });
  },
};

// ── Presets ──────────────────────────────────────────────────
export const sfx = {
  click:   () => { tone({ freq: 1200, dur: 0.035, type: 'square', vol: 0.04 }); tone({ freq: 600, dur: 0.04, type: 'sine', vol: 0.025, when: 0.005 }); },
  hover:   () => tone({ freq: 1400, dur: 0.025, type: 'sine', vol: 0.012 }),
  tab:     () => { tone({ freq: 500, dur: 0.08, type: 'sawtooth', vol: 0.04, sweep: 1400 }); },
  success: () => { tone({ freq: 880, dur: 0.08, type: 'triangle', vol: 0.05 }); tone({ freq: 1320, dur: 0.16, type: 'triangle', vol: 0.05, when: 0.06 }); },
  error:   () => { tone({ freq: 320, dur: 0.18, type: 'sawtooth', vol: 0.06, sweep: 80 }); noiseBurst({ dur: 0.08, vol: 0.03, lp: 1200 }); },
  warn:    () => { tone({ freq: 660, dur: 0.10, type: 'square', vol: 0.04 }); tone({ freq: 660, dur: 0.10, type: 'square', vol: 0.04, when: 0.13 }); },
  toast:   () => tone({ freq: 880, dur: 0.06, type: 'triangle', vol: 0.03 }),
  modal:   () => { noiseBurst({ dur: 0.12, vol: 0.04, lp: 800 }); tone({ freq: 200, dur: 0.18, type: 'sine', vol: 0.05, sweep: 80 }); },
  open:    () => tone({ freq: 700, dur: 0.06, type: 'triangle', vol: 0.03, sweep: 1200 }),
  close:   () => tone({ freq: 1200, dur: 0.06, type: 'triangle', vol: 0.03, sweep: 500 }),
  start:   () => { tone({ freq: 440, dur: 0.10, type: 'sawtooth', vol: 0.05, sweep: 880 }); tone({ freq: 660, dur: 0.10, type: 'sawtooth', vol: 0.04, when: 0.05, sweep: 1320 }); },
  delete:  () => { noiseBurst({ dur: 0.20, vol: 0.05, lp: 600 }); tone({ freq: 180, dur: 0.20, type: 'square', vol: 0.04, sweep: 50 }); },
  ping:    () => tone({ freq: 2000, dur: 0.04, type: 'sine', vol: 0.02 }),
};

// ── Ambient audio bed ─────────────────────────────────────────
// Quiet evolving pad: detuned sines + occasional sub-thump. Toggleable.
let bedNodes = null;
let bedEnabled = false;
try { bedEnabled = localStorage.getItem('bed_enabled') === '1'; } catch {}

export function isBedEnabled() { return bedEnabled; }

export function setBedEnabled(v) {
  bedEnabled = !!v;
  try { localStorage.setItem('bed_enabled', v ? '1' : '0'); } catch {}
  if (v) startBed(); else stopBed();
}

function startBed() {
  if (bedNodes || !enabled) { bedEnabled = true; if (!enabled) return; }
  const c = ensureCtx(); if (!c) return;
  if (c.state === 'suspended') c.resume();

  const master = c.createGain();
  master.gain.value = 0.0;
  master.gain.linearRampToValueAtTime(0.06, c.currentTime + 2);
  master.connect(masterGain);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.7;
  filter.connect(master);

  // Three detuned sine drones
  const oscs = [];
  [55, 82.5, 110].forEach((f, i) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.detune.value = (i - 1) * 7;
    const g = c.createGain();
    g.gain.value = 0.4 + i * 0.1;
    osc.connect(g); g.connect(filter);
    osc.start();
    oscs.push({ osc, g });
  });

  // Slow LFO modulating the filter cutoff (breathing pad)
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 350;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  bedNodes = { master, filter, oscs, lfo, lfoGain };
}

function stopBed() {
  if (!bedNodes) return;
  const c = ensureCtx(); if (!c) return;
  bedNodes.master.gain.cancelScheduledValues(c.currentTime);
  bedNodes.master.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
  setTimeout(() => {
    if (!bedNodes) return;
    try {
      bedNodes.oscs.forEach(({ osc }) => osc.stop());
      bedNodes.lfo.stop();
    } catch {}
    bedNodes = null;
  }, 1700);
}

// Auto-start bed if it was previously enabled (and perf-mode isn't on)
export function maybeRestoreBed() {
  let perf = false;
  try { perf = localStorage.getItem('perf_mode') === '1'; } catch {}
  if (bedEnabled && !perf) startBed();
}

// Auto-attach hover/click to elements with data attribute (cheap delegation)
let attached = false;
export function attachUiSounds() {
  if (attached) return;
  attached = true;
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest('button, a[role=button], [data-snd]');
    if (el && el.dataset && el.dataset.sndHover !== '0') sfx.hover();
  }, { passive: true });
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('button, a[role=button], [data-snd]');
    if (el && el.dataset && el.dataset.sndClick !== '0') sfx.click();
  }, { capture: true });
}
