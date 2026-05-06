/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Resonance Chamber director
   GSAP cinematic timeline + interactions + UI orchestration.
   ═══════════════════════════════════════════════════════════ */
import { gsap } from 'gsap';
import { AVATARS } from './world.js';
import * as audio from './audio.js';

// ── Voice probe: discover available /audio/<ns>-<n>.mp3 files ─────
const VOICE_POOL = Object.fromEntries(AVATARS.map((a) => [a.ns, []]));
const MAX_VOICE_FILES = 8;
const voiceProbeDone = (async () => {
  const probes = [];
  for (const a of AVATARS) {
    for (let i = 1; i <= MAX_VOICE_FILES; i++) {
      probes.push({ ns: a.ns, url: `/audio/${a.ns}-${i}.mp3` });
    }
    probes.push({ ns: a.ns, url: `/audio/${a.ns}.mp3` });
  }
  const results = await Promise.all(probes.map(({ ns, url }) =>
    fetch(url, { method: 'HEAD' })
      .then((r) => (r.ok ? { ns, url } : null))
      .catch(() => null),
  ));
  for (const r of results) if (r) VOICE_POOL[r.ns].push(r.url);
})();

async function playVoice(ns) {
  await voiceProbeDone;
  const list = VOICE_POOL[ns] || [];
  if (!list.length) return;
  const url = list[Math.floor(Math.random() * list.length)];
  try {
    const a = new Audio(url);
    a.volume = 0.85;
    a.play().catch(() => {});
  } catch {}
}

// ── Boot log helper ───────────────────────────────────────────────
const BOOT_LINES = [
  { t: 200,   text: '> mounting /dev/neural0 ...',                                          cls: '' },
  { t: 700,   text: '  → handshake [TLS_1.3] established',                                  cls: 'ok' },
  { t: 1300,  text: '> chamber_07 spinup ...',                                              cls: '' },
  { t: 1900,  text: '  → effigy_array initialized [5 / 5]',                                 cls: 'ok' },
  { t: 2700,  text: '> resonance_field calibrating ...',                                    cls: '' },
  { t: 3500,  text: '  → soul_core eigenstate locked',                                      cls: 'ok' },
  { t: 4400,  text: '  → import <span class="key">aatrox.darkin_protocol</span>',           cls: '' },
  { t: 4900,  text: '  → import <span class="key">druid.wildshape_kernel</span>',           cls: '' },
  { t: 5400,  text: '  → import <span class="key">kratos.spartan_rage</span>',              cls: '' },
  { t: 5900,  text: '  → import <span class="key">gun.park_directive</span>',               cls: '' },
  { t: 6400,  text: '  → import <span class="key">ichigo.vasto_lorde</span>',               cls: '' },
  { t: 7100,  text: '> [WARN] reiatsu_overflow detected',                                   cls: 'warn' },
  { t: 7700,  text: '> all effigies staged. AWAITING_USER_RESONANCE.',                       cls: 'crit' },
];

function streamBootLog(host) {
  BOOT_LINES.forEach((l) => {
    const div = document.createElement('div');
    div.className = 'ln ' + l.cls;
    const ts = new Date().toISOString().split('T')[1].slice(0, 12);
    div.innerHTML = `<span class="ts">[${ts}]</span> ` + l.text;
    host.appendChild(div);
    setTimeout(() => {
      gsap.to(div, { opacity: 1, duration: 0.35 });
      while (host.children.length > 8) host.removeChild(host.firstChild);
    }, l.t);
  });
}

// ── Sigil DOM labels — anchored to 3D positions each frame ────────
function buildSigilLabels(world, host) {
  const labels = world.sigils.map((s) => {
    const el = document.createElement('div');
    el.className = 'sigil-label';
    el.style.setProperty('--avatar', '#' + s.avatar.color.getHexString());
    el.innerHTML = `
      <div class="lbl-name"><span class="lbl-bracket"></span>${s.avatar.label}<span class="lbl-bracket"></span></div>
      <div class="lbl-fn">${s.avatar.ns}.${s.avatar.fn}</div>
    `;
    el.dataset.idx = String(world.sigils.indexOf(s));
    host.appendChild(el);
    return el;
  });

  const _worldPos = new (world.THREE.Vector3)();
  function update() {
    world.sigils.forEach((s, i) => {
      // The sigil now lives under a rotating parent (sigilGroup), so
      // we need its WORLD position, not its local position.
      s.group.getWorldPosition(_worldPos);
      _worldPos.y += 1.85;     // float a bit above the sigil
      const p = world.projectToScreen(_worldPos);
      const el = labels[i];
      el.style.left = `${p.x}px`;
      el.style.top  = `${p.y}px`;
      // Hide labels that are behind the camera or far off-screen
      el.style.visibility = p.visible ? 'visible' : 'hidden';
    });
    requestAnimationFrame(update);
  }
  update();

  return labels;
}

// ── Director ──────────────────────────────────────────────────────
export function startDirector(world) {
  const $ = (s) => document.querySelector(s);
  const curtain = $('#curtain');
  const corners = document.querySelectorAll('.corner');
  const readouts = document.querySelectorAll('.readout');
  const kanjis = document.querySelectorAll('.kanji');
  const marquee = $('#marquee');
  const prompt = $('#select-prompt');
  const skip = $('#skip');
  const bootLog = $('#boot-log');
  const finalEl = $('#final');
  const finalGlyph = $('.final-glyph');
  const finalTitle = $('#final-title');
  const finalSub = $('.final-sub');
  const finalLock = $('.final-lock');
  const enterBtn = $('#enter');
  const labelHost = $('#sigil-labels');
  const chamberStatus = $('#chamber-status');
  const bio = $('#bio');
  const utc = $('#utc');
  const uid = $('#uid');

  // ── Audio unlock — first user gesture starts the procedural drone.
  // Browsers refuse to play AudioContext output without a gesture.
  function tryUnlockAudio() {
    if (audio.unlock()) audio.startDrone();
  }
  window.addEventListener('pointerdown', tryUnlockAudio, { once: true });
  window.addEventListener('pointermove', tryUnlockAudio, { once: true });
  window.addEventListener('keydown',     tryUnlockAudio, { once: true });
  window.addEventListener('wheel',       tryUnlockAudio, { once: true });

  // ── Custom cursor — followed via quickTo for buttery feel ─────
  const cursor = document.getElementById('cursor');
  const cqx = gsap.quickTo(cursor, 'x', { duration: 0.12, ease: 'power3.out' });
  const cqy = gsap.quickTo(cursor, 'y', { duration: 0.12, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => {
    cqx(e.clientX);
    cqy(e.clientY);
  });
  // Click-able HUD elements get a soft cursor-hint
  document.querySelectorAll('#skip, #enter, .sigil-label').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('click'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('click'));
  });

  // UID + UTC
  uid.textContent = Array.from({ length: 4 }, () =>
    Math.random().toString(16).slice(2, 6).toUpperCase()).join('-');
  function tickClock() {
    const t = new Date().toUTCString().split(' ')[4] || '00:00:00';
    utc.textContent = t + ' UTC';
  }
  tickClock();
  setInterval(tickClock, 1000);

  // Sigil labels
  const labels = buildSigilLabels(world, labelHost);

  // ── State ──────────────────────────────────────────────────────
  let chosen = null;       // sigil object
  let canSelect = false;   // gate during opening choreography
  let bootDone = false;

  // ── Initial frame state — everything off, dark, tight in ───────
  gsap.set(corners, { opacity: 0, scale: 1.4 });
  gsap.set(readouts, { opacity: 0 });
  gsap.set(kanjis, { opacity: 0 });
  gsap.set(marquee, { opacity: 0, y: -20, filter: 'blur(8px)' });
  gsap.set(prompt, { opacity: 0, y: 30 });
  gsap.set(skip, { opacity: 0 });
  gsap.set(bootLog, { opacity: 0 });
  gsap.set(finalEl, { opacity: 0 });

  // ── Initial 3D scene state — pre-narrative ─────────────────────
  // Camera starts pulled in CLOSE to the dormant heart, looking at it.
  world.camera.position.set(0, 0.5, 3.2);
  world.camera.lookAt(0, 0.4, 0);
  world.state.mouseInfluence = 0;
  world.state.bloom = 1.4;
  world.state.chroma = 0.012;
  world.state.orbitSpeed = 0;
  world.state.exposure = 0.18;
  world.state.heartIntensity = 0;     // heart is dark / dormant

  // Heart is invisible at start (intensity 0 = barely visible)
  // Tendrils invisible (uReveal=0)
  world.sigils.forEach((s) => {
    s.group.scale.setScalar(0.001);
    s.uniformProxy.uAlpha.value = 0;
    s.uniformProxy.uIntensity.value = 0;
    s.revealAmount = 0;
  });

  // Particles invisible at start — they'll be born from tendrils later
  world.particles.material.uniforms.uConverge.value = 1;
  world.particles.material.uniforms.uTarget.value.set(0, 0.4, 0);
  world.particles.material.uniforms.uOpacity.value = 0;

  // ── Boot timeline — coherent energy-flow narrative ─────────────
  // Phase 1 (0.0–1.4s) "Spark" — black, then a single point of light at
  //   the heart's location. Camera stays close, watching.
  // Phase 2 (1.4–3.2s) "Awakening" — the heart bursts to life: shader
  //   intensity ramps, camera pulls back smoothly to reveal the chamber.
  // Phase 3 (3.0–5.0s) "Reaching out" — 5 tendrils extend RADIALLY from
  //   the heart toward the 5 anchor positions, drawn in sequence.
  // Phase 4 (4.4–6.4s) "Manifestation" — at the tip of each tendril, a
  //   shrine materializes (scale up + emissive boost). Energy now flows
  //   continuously along the tendrils.
  // Phase 5 (6.4s+) "Ready" — HUD finishes streaming, prompt appears.
  const bootTl = gsap.timeline({ paused: true, onComplete: () => {
    bootDone = true;
    canSelect = true;
    chamberStatus.textContent = 'STANDBY';
    chamberStatus.className = 'val ok';
  }});

  // Phase 1: curtain falls slowly with a softer ease so the reveal is
  // perceptually smooth (no abrupt black-to-scene cut).
  bootTl.to(curtain, { opacity: 0, duration: 2.0, ease: 'power3.inOut' }, 0);
  bootTl.to(world.state, { exposure: 0.85, duration: 2.4, ease: 'power2.out' }, 0.6);

  // Phase 2: heart awakens — shader intensity ramps, camera pulls back
  bootTl.to(world.state, {
    heartIntensity: 1, duration: 1.6, ease: 'power2.inOut',
  }, 1.0);

  // Camera pull-back along a CatmullRom curve (more organic than a lerp).
  // Slight side-weave gives the shot weight + parallax against the heart.
  const THREE_REF = world.THREE;
  const bootCurve = new THREE_REF.CatmullRomCurve3([
    new THREE_REF.Vector3(0,    0.5, 3.2),
    new THREE_REF.Vector3(0.9,  0.85, 4.6),
    new THREE_REF.Vector3(0.4,  1.20, 6.5),
    new THREE_REF.Vector3(0,    1.4,  9.0),
  ], false, 'catmullrom', 0.5);
  const _bootProxy = { t: 0 };
  bootTl.to(_bootProxy, {
    t: 1, duration: 2.6, ease: 'power3.out',
    onUpdate: () => {
      bootCurve.getPoint(_bootProxy.t, world.camera.position);
      world.camera.lookAt(0, 0.4, 0);
    },
  }, 1.2);
  bootTl.to(world.state, { bloom: 0.6, duration: 2.0, ease: 'power2.out' }, 2.0);
  bootTl.to(world.state, { exposure: 1.0, duration: 1.6, ease: 'power2.out' }, 2.0);

  // HUD chrome streams in WITH the heart awakening — synchronized energy
  bootTl.to(corners, { opacity: 1, scale: 1, duration: 0.9, stagger: 0.06, ease: 'power3.out' }, 1.6);
  bootTl.to(readouts, { opacity: 1, duration: 0.7, stagger: 0.08, ease: 'power2.out' }, 1.8);
  bootTl.to(kanjis, { opacity: (i) => i === 0 ? 0.10 : 0.08, duration: 1.6, stagger: 0.4, ease: 'power2.out' }, 2.2);
  bootTl.to(skip, { opacity: 0.4, duration: 0.4 }, 2.4);
  bootTl.to(bootLog, { opacity: 1, duration: 0.4 }, 2.4);

  bootTl.fromTo(marquee,
    { opacity: 0, y: -10, filter: 'blur(10px)' },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' },
    3.0);

  // Phase 3: tendrils SHOOT OUT from the heart in radial sequence.
  // Each tendril's `uReveal` ramps 0→1 — the shader cuts off at that
  // boundary so it visually "draws out" toward the shrine.
  world.sigils.forEach((s, i) => {
    const tendrilStart = 3.0 + i * 0.18;
    bootTl.to(s, {
      revealAmount: 1, duration: 0.85, ease: 'power3.out',
    }, tendrilStart);
  });

  // Phase 4: shrines materialize at the END of each tendril
  // (offset slightly after tendril reveal so the tip visibly "lands").
  world.sigils.forEach((s, i) => {
    const at = 3.7 + i * 0.18;
    bootTl.to(s.uniformProxy.uAlpha, { value: 1, duration: 0.5, ease: 'power2.out' }, at);
    bootTl.to(s.uniformProxy.uIntensity, { value: 1.0, duration: 0.7, ease: 'power3.out' }, at);
    bootTl.fromTo(s.group.scale,
      { x: 0.001, y: 0.001, z: 0.001 },
      { x: 1, y: 1, z: 1, duration: 0.95, ease: 'back.out(1.4)' },
      at);
  });

  // Particles fade in along with shrines — they ride the tendrils
  bootTl.to(world.particles.material.uniforms.uConverge, {
    value: 0, duration: 2.5, ease: 'power3.out',
  }, 4.0);
  bootTl.to(world.particles.material.uniforms.uOpacity, {
    value: 0.55, duration: 1.4, ease: 'power2.out',
  }, 4.2);

  // Reveal sigil labels — synchronized with shrine materialization
  labels.forEach((el, i) => {
    bootTl.to(el, { opacity: 1, duration: 0.5, ease: 'power2.out',
      onStart: () => el.classList.add('visible') }, 4.6 + i * 0.18);
  });

  // Mouse parallax engages once shrines are settled — but we DO NOT enable
  // mouseRotateInfluence anymore; the carousel responds only to scroll-wheel.
  bootTl.to(world.state, {
    mouseInfluence: 1, duration: 1.2, ease: 'power1.out',
  }, 5.6);
  // Slow ambient drift after manifestation
  bootTl.to(world.state, { orbitSpeed: 0.012, duration: 3, ease: 'power2.out' }, 4.4);

  // Prompt appears last
  bootTl.fromTo(prompt,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
    6.2);
  bootTl.add(() => {
    gsap.to(prompt, { y: -4, duration: 1.3, ease: 'sine.inOut', repeat: -1, yoyo: true });
  }, 6.2);

  // Stream boot log lines (offset to start with the curtain)
  setTimeout(() => streamBootLog(bootLog), 500);

  // Start
  bootTl.play();

  // ── Mouse interaction: hover detection ─────────────────────────
  let lastHovered = null;
  function tickHover() {
    if (chosen) return;
    if (!canSelect) { requestAnimationFrame(tickHover); return; }
    const hit = world.pickSigil();
    if (hit !== lastHovered) {
      world.sigils.forEach((s) => {
        s.hovered = (s === hit);
      });
      // Update labels
      labels.forEach((el, i) => {
        const s = world.sigils[i];
        el.classList.toggle('hot', s === hit);
        el.classList.toggle('dim', !!hit && s !== hit);
      });
      // Cursor tint
      if (hit) {
        cursor.classList.add('hot');
        const c = hit.avatar.color;
        cursor.style.setProperty('--cur-color',
          `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`);
        // Hover ping — character-specific frequency
        audio.hoverPing(hit.avatar.icon);
      } else {
        cursor.classList.remove('hot');
        cursor.style.setProperty('--cur-color', '0,212,255');
      }
      // Subtle camera lean toward the hovered sigil
      if (hit) {
        gsap.to(world.camera.position, {
          x: hit.basePos.x * 0.18,
          y: 1.4 + hit.basePos.y * 0.05,
          duration: 0.9, ease: 'power3.out',
          overwrite: 'auto',
        });
      } else {
        gsap.to(world.camera.position, {
          x: 0, y: 1.4, duration: 0.9, ease: 'power3.out',
          overwrite: 'auto',
        });
      }
      lastHovered = hit;
    }
    requestAnimationFrame(tickHover);
  }
  tickHover();

  // ── Click to select ────────────────────────────────────────────
  window.addEventListener('pointerdown', (e) => {
    if (chosen || !canSelect) return;
    if (e.target.closest('.skip, .enter')) return;
    const hit = world.pickSigil();
    if (hit) selectSigil(hit);
  });

  // Click on DOM label also selects
  labels.forEach((el, i) => {
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (chosen || !canSelect) return;
      selectSigil(world.sigils[i]);
    });
  });

  // ── Selection sequence — fluid, single timeline, no jumps ─────
  function selectSigil(sigil) {
    chosen = sigil;
    canSelect = false;
    sigil.hovered = false;

    const THREE = world.THREE;
    const ns = sigil.avatar.ns;
    const fn = sigil.avatar.fn;
    try {
      localStorage.setItem('avatar_ns', ns);
      localStorage.setItem('avatar_fn', fn);
    } catch {}
    playVoice(ns);

    bio.textContent = 'BINDING';
    bio.className = 'val ok';
    chamberStatus.textContent = 'BOUND';
    chamberStatus.className = 'val ok';

    // Capture chosen sigil's WORLD position NOW (before we kill orbit) —
    // because once the carousel stops rotating the LOCAL position is
    // what matters, but the camera dolly needs the world position.
    const targetPos = new THREE.Vector3();
    sigil.group.getWorldPosition(targetPos);

    // ── Single fluid GSAP timeline driving the whole sequence ─────
    const sel = gsap.timeline({
      onComplete: () => revealFinal(sigil),
    });

    // (0.0s) Hand camera control to the timeline + apply environment shift
    sel.add(() => {
      gsap.to(world.state, {
        mouseInfluence: 0, mouseRotateInfluence: 0, orbitSpeed: 0,
        duration: 0.5, ease: 'power2.in',
      });
      applyEnvironment(sigil.avatar);
    }, 0);

    // (0.0s) Hide marquee + prompt — UI clears for the moment
    sel.to([marquee, prompt], {
      opacity: 0, y: -10, duration: 0.5, ease: 'power2.in',
    }, 0);

    // (0.0s) Hot-mark chosen label, fade others
    labels.forEach((el, i) => {
      const s = world.sigils[i];
      if (s === sigil) {
        el.classList.add('hot');
        el.classList.remove('dim');
      } else {
        sel.to(el, { opacity: 0, duration: 0.4, ease: 'power2.out' }, 0);
      }
    });

    // (0.0s) Particles begin converging on the chosen sigil
    world.particles.material.uniforms.uTarget.value.copy(targetPos);
    sel.to(world.particles.material.uniforms.uConverge, {
      value: 1, duration: 1.6, ease: 'power3.in',
    }, 0);

    // (0.0s) Other sigils dim — emissive + tendril + podium accents fade
    world.sigils.forEach((s) => {
      if (s === sigil) return;
      sel.to(s.uniformProxy.uIntensity, { value: 0.10, duration: 0.8, ease: 'power2.in' }, 0);
      sel.to(s.uniformProxy.uAlpha,     { value: 0.18, duration: 0.8, ease: 'power2.in' }, 0);
      sel.to(s,                          { revealAmount: 0, duration: 0.9, ease: 'power3.in' }, 0);
      sel.to(s.podiumRing.material,      { opacity: 0.10, duration: 0.8, ease: 'power2.in' }, 0);
      sel.to(s.innerRing.material,       { opacity: 0.06, duration: 0.8, ease: 'power2.in' }, 0);
      sel.to(s.haloRing.material,        { opacity: 0.04, duration: 0.8, ease: 'power2.in' }, 0);
      sel.to(s.glowDisc.material,        { opacity: 0.04, duration: 0.8, ease: 'power2.in' }, 0);
      sel.to(s.upLight,                  { intensity: 0.5, duration: 0.8, ease: 'power2.in' }, 0);
      sel.to(s.keyLight,                 { intensity: 0.8, duration: 0.8, ease: 'power2.in' }, 0);
      sel.to(s.rimSigil,                 { intensity: 0.3, duration: 0.8, ease: 'power2.in' }, 0);
    });

    // (0.0s) Boost the chosen sigil — bright accents
    sel.to(sigil.uniformProxy.uIntensity, { value: 1.8, duration: 0.9, ease: 'power3.out' }, 0);
    sel.to(sigil.uniformProxy.uHover,     { value: 1.0, duration: 0.5, ease: 'power3.out' }, 0);
    sel.to(sigil.podiumRing.material,     { opacity: 1.4, duration: 0.6, ease: 'power3.out' }, 0);
    sel.to(sigil.innerRing.material,      { opacity: 1.0, duration: 0.6, ease: 'power3.out' }, 0);
    sel.to(sigil.haloRing.material,       { opacity: 0.95, duration: 0.6, ease: 'power3.out' }, 0);
    sel.to(sigil.glowDisc.material,       { opacity: 0.95, duration: 0.6, ease: 'power3.out' }, 0);
    sel.to(sigil.upLight,                 { intensity: 12, duration: 0.6, ease: 'power3.out' }, 0);
    sel.to(sigil.keyLight,                { intensity: 14, duration: 0.6, ease: 'power3.out' }, 0);
    sel.to(sigil.rimSigil,                { intensity: 6,  duration: 0.6, ease: 'power3.out' }, 0);

    // (0.05s) Heart shader color flood — accent + outer shift toward avatar
    const heartU = world.heart?.material?.uniforms;
    if (heartU) {
      sel.to(heartU.uColorAccent.value, {
        r: sigil.avatar.color.r,
        g: sigil.avatar.color.g,
        b: sigil.avatar.color.b,
        duration: 1.6, ease: 'power2.inOut',
      }, 0.05);
      sel.to(heartU.uColorOuter.value, {
        r: sigil.avatar.color2.r * 0.7,
        g: sigil.avatar.color2.g * 0.7,
        b: sigil.avatar.color2.b * 0.7,
        duration: 1.6, ease: 'power2.inOut',
      }, 0.05);
    }
    // Ambient orbit ring tints to avatar
    if (world.coreColorTargets?.length) {
      world.coreColorTargets.forEach((mat) => {
        sel.to(mat.color, {
          r: sigil.avatar.color.r, g: sigil.avatar.color.g, b: sigil.avatar.color.b,
          duration: 1.6, ease: 'power2.inOut',
        }, 0.05);
      });
    }

    // (0.1s) Subtle chroma kiss
    sel.to(world.state, { chroma: 0.04, duration: 0.5, ease: 'power2.out' }, 0.1)
       .to(world.state, { chroma: 0.0,  duration: 0.6, ease: 'power2.in'  }, 0.6);

    // (0.05s) Single elegant shockwave from the chosen sigil
    sel.add(() => {
      const ringGeom = new THREE.RingGeometry(0.5, 0.55, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: sigil.avatar.color, transparent: true, opacity: 0.9,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.copy(targetPos);
      ring.lookAt(world.camera.position);
      world.scene.add(ring);
      gsap.to(ring.scale, { x: 5.5, y: 5.5, z: 5.5, duration: 1.8, ease: 'power3.out' });
      gsap.to(ringMat,    { opacity: 0, duration: 1.8, ease: 'power2.out',
        onComplete: () => { world.scene.remove(ring); ringGeom.dispose(); ringMat.dispose(); }
      });
    }, 0.05);

    // ── Selection clang — synthesized noise burst with sub-tone ─────
    sel.add(() => audio.selectClang(sigil.avatar.icon), 0.05);

    // (0.3s) Camera arc on a CatmullRom curve. 4 control points give a
    // sweeping orbital approach instead of a straight dolly.
    const startPos = world.camera.position.clone();
    const dir = targetPos.clone().setY(0).normalize();
    const finalCam = targetPos.clone().add(dir.clone().multiplyScalar(2.5)).setY(targetPos.y + 0.55);
    const orbitalOffset = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(1.4);
    const midA = startPos.clone().lerp(finalCam, 0.30)
      .add(new THREE.Vector3(0, 0.45, 0))
      .add(orbitalOffset);
    const midB = startPos.clone().lerp(finalCam, 0.65)
      .add(new THREE.Vector3(0, 0.65, 0))
      .add(orbitalOffset.clone().multiplyScalar(0.65));
    const camCurve = new THREE.CatmullRomCurve3(
      [startPos, midA, midB, finalCam], false, 'catmullrom', 0.55,
    );

    // Motion blur ON during the arc, OFF once camera settles
    sel.add(() => { if (world.afterimagePass) world.afterimagePass.enabled = true; }, 0.3);
    sel.to({ t: 0 }, {
      t: 1, duration: 1.85, ease: 'power3.inOut',
      onUpdate: function() {
        camCurve.getPoint(this.targets()[0].t, world.camera.position);
        world.camera.lookAt(targetPos);
      },
    }, 0.3);
    sel.add(() => { if (world.afterimagePass) world.afterimagePass.enabled = false; }, 2.25);

    // (1.5s) Hold for a beat at the final framing before the overlay ramps in
    sel.add(() => {}, 2.4);
  }

  function revealFinal(sigil) {
    document.getElementById('avatar-ns').textContent = sigil.avatar.ns;
    document.getElementById('avatar-key').textContent = sigil.avatar.fn;

    finalEl.classList.add('shown');
    gsap.set(finalEl, { opacity: 0, pointerEvents: 'auto' });

    // Final glyph color tinted to chosen avatar
    const colorHex = '#' + sigil.avatar.color.getHexString();
    finalGlyph.style.borderColor = colorHex;
    finalGlyph.style.boxShadow = `0 0 40px ${colorHex}99, inset 0 0 40px ${colorHex}66`;

    gsap.set([finalGlyph, finalTitle, finalSub, finalLock, enterBtn],
      { opacity: 0, y: 18 });
    gsap.set(finalGlyph, { scale: 0.4, rotate: 45, filter: 'blur(8px)' });
    gsap.set(finalTitle, { letterSpacing: '40px', filter: 'blur(8px)' });

    const tl = gsap.timeline();
    tl.to(finalEl, { opacity: 1, duration: 0.8, ease: 'power2.out' })
      .to(finalGlyph, {
        scale: 1, opacity: 1, filter: 'blur(0px)',
        duration: 0.9, ease: 'expo.out',
      }, '-=0.3')
      .to(finalTitle, {
        opacity: 1, y: 0, letterSpacing: '12px', filter: 'blur(0px)',
        duration: 0.7, ease: 'power3.out',
      }, '-=0.4')
      .to(finalSub,  { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.3')
      .to(finalLock, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.2')
      .to(enterBtn,  { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.6)' }, '-=0.2');

    // Magnetic pull on enter button
    attachMagnetic(enterBtn, 0.22);
  }

  // ── Apply chamber environment for the chosen avatar ───────────
  // Tweens fog, chamber rings/markers, particles, lights, and core distortion
  // toward the avatar's `env` palette. Each character gets a distinct vibe.
  function applyEnvironment(avatar) {
    const env = avatar.env;
    const D = 1.6;     // unified transition duration
    const ease = 'power2.inOut';

    // Fog color
    gsap.to(world.scene.fog.color, {
      r: env.fog.r, g: env.fog.g, b: env.fog.b,
      duration: D, ease,
    });

    // Chamber rings (RingGeometry meshes) tint to avatar color
    world.chamber.children.forEach((m) => {
      if (m.material && m.material.color) {
        gsap.to(m.material.color, {
          r: avatar.color.r, g: avatar.color.g, b: avatar.color.b,
          duration: D, ease,
        });
      }
    });

    // (Floor grid uses vertex colors — its tint is baked in geometry. Skip.)

    // Particle palette + opacity bump
    gsap.to(world.particles.material.uniforms.uColor.value, {
      r: env.particleA.r, g: env.particleA.g, b: env.particleA.b,
      duration: D, ease,
    });
    gsap.to(world.particles.material.uniforms.uColor2.value, {
      r: env.particleB.r, g: env.particleB.g, b: env.particleB.b,
      duration: D, ease,
    });
    gsap.to(world.particles.material.uniforms.uOpacity, {
      value: 0.75, duration: D, ease,
    });

    // Ambient + rim lights shift
    gsap.to(world.ambient.color, {
      r: env.ambient.r * 0.4, g: env.ambient.g * 0.4, b: env.ambient.b * 0.4,
      duration: D, ease,
    });
    gsap.to(world.ambient, { intensity: 0.85, duration: D, ease });
    gsap.to(world.rim.color, {
      r: env.rim.r, g: env.rim.g, b: env.rim.b,
      duration: D, ease,
    });
    gsap.to(world.rim2.color, {
      r: avatar.color.r, g: avatar.color.g, b: avatar.color.b,
      duration: D, ease,
    });

    // For chaotic characters (aatrox, ichigo) the core's outermost ring
    // tilts more dramatically — subtle but felt.
    if (world.coreRings && world.coreRings[2]) {
      gsap.to(world.coreRings[2].mesh.rotation, {
        z: env.coreDistort * 1.6,
        duration: D, ease,
      });
    }
    // Soul core color is already tinted to avatar in selectSigil — leave alone.
  }

  // ── Magnetic helper ────────────────────────────────────────────
  function attachMagnetic(el, strength = 0.22) {
    const qx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      qx((e.clientX - (r.left + r.width / 2)) * strength);
      qy((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => { qx(0); qy(0); });
  }

  // ── ENGAGE → warp transition → /app.html ───────────────────────
  enterBtn.addEventListener('click', engageProtocol);

  function engageProtocol() {
    // Persist intro-seen flag + the avatar color (the React app reads this
    // and matches its own startup curtain so the cut is imperceptible).
    try {
      sessionStorage.setItem('booted', '1');
      sessionStorage.setItem('intro_handoff', '1');   // tells React to mount with curtain
      localStorage.setItem('intro_seen', '1');
      if (chosen) {
        sessionStorage.setItem('handoff_color',
          '#' + chosen.avatar.color.getHexString());
      }
    } catch {}

    // Hide final overlay
    gsap.to(finalEl, {
      opacity: 0, duration: 0.55, ease: 'power2.in',
      pointerEvents: 'none',
    });

    // ── Warp choreography ──────────────────────────────────────
    // Phase A (0–0.9s): camera dives forward, chroma + bloom ramp,
    //   exposure crushes — the chosen avatar's color floods the scene.
    // Phase B (0.9–1.6s): chamber dims to BLACK while chroma decays —
    //   a dark, soft fade rather than a hard flash.
    // Phase C (1.6s): redirect under fully black curtain.
    const warpTl = gsap.timeline({
      onComplete: () => { window.location.href = '/app.html'; },
    });

    // Bass drop on the drone
    audio.bassDrop();

    // Motion blur ON for the warp
    if (world.afterimagePass) world.afterimagePass.enabled = true;

    // Camera dive along a CatmullRom curve into the chosen sigil — smoother
    // than a straight tween, with subtle vertical lift mid-arc.
    const THREE = world.THREE;
    const startCam = world.camera.position.clone();
    let target;
    if (chosen) {
      target = chosen.group.position.clone();
    } else {
      target = new THREE.Vector3(0, 0.4, 0);
    }
    const finalCam = target.clone()
      .multiplyScalar(0.55)
      .add(new THREE.Vector3(0, 0.5, -1.0));
    const midCam = startCam.clone().lerp(finalCam, 0.55)
      .add(new THREE.Vector3(0, 0.4, -0.3));
    const warpCurve = new THREE.CatmullRomCurve3(
      [startCam, midCam, finalCam], false, 'catmullrom', 0.5,
    );

    // Tween a t-proxy along the curve + apply random shake on the last 25%
    const _warpProxy = { t: 0 };
    warpTl.to(_warpProxy, {
      t: 1, duration: 1.4, ease: 'power3.inOut',
      onUpdate: () => {
        warpCurve.getPoint(_warpProxy.t, world.camera.position);
        // Camera shake ramps in over the final 25% of the warp
        if (_warpProxy.t > 0.75) {
          const k = (_warpProxy.t - 0.75) / 0.25;     // 0..1
          const amp = 0.04 * k * k;
          world.camera.position.x += (Math.random() - 0.5) * amp;
          world.camera.position.y += (Math.random() - 0.5) * amp;
        }
        world.camera.lookAt(target);
      },
    }, 0);

    // Phase A: bloom + chroma + exposure ramp UP harder
    warpTl.to(world.state, {
      chroma: 0.16, bloom: 1.8, exposure: 1.6,
      duration: 0.7, ease: 'power2.in',
    }, 0);
    // Phase B: chroma decays, exposure crushes to 0 — fade to black
    warpTl.to(world.state, {
      chroma: 0.0, bloom: 0.4, exposure: 0.0,
      duration: 0.85, ease: 'power2.inOut',
    }, 0.7);

    // Curtain: tinted to chosen color first (under the world), then fades to
    // pure black opacity 1 right when exposure crushes. No more white flash.
    const tintHex = chosen ? '#' + chosen.avatar.color.getHexString() : '#000000';
    gsap.set(curtain, { background: tintHex, opacity: 0 });
    warpTl.to(curtain, { opacity: 0.85, duration: 0.6, ease: 'power2.in' }, 0.4);
    warpTl.to(curtain, { background: '#000000', duration: 0.5, ease: 'power2.inOut' }, 1.0);
    warpTl.to(curtain, { opacity: 1, duration: 0.4, ease: 'power2.inOut' }, 1.1);
  }

  // ── Skip — fast-forward to selection state ────────────────────
  function doSkip() {
    if (bootDone) return;
    bootTl.progress(0.85);   // jump near the end
  }
  skip.addEventListener('click', doSkip);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); doSkip(); }
    if (e.code === 'Enter' && finalEl.classList.contains('shown')) engageProtocol();
  });
}
