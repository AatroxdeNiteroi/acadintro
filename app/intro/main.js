/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Resonance Chamber entry
   ═══════════════════════════════════════════════════════════ */
import { createWorld } from './world.js';
import { startDirector } from './director.js';
import { loadAllModels, describeModel } from './modelLoader.js';

// Visual error reporter — surfaces any uncaught error directly on the page
// so we never end up staring at a silent black curtain again.
function reportError(err, where) {
  console.error('[intro]', where, err);
  let box = document.getElementById('intro-error');
  if (!box) {
    box = document.createElement('pre');
    box.id = 'intro-error';
    box.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      max-width:80vw; max-height:80vh; overflow:auto;
      padding:20px 28px; z-index:99999;
      background:rgba(20,4,8,0.95); border:1px solid #ff2056;
      color:#ff8a8a; font:12px/1.5 'JetBrains Mono', monospace;
      white-space:pre-wrap; box-shadow:0 0 30px rgba(255,32,86,0.5);
    `;
    document.body.appendChild(box);
  }
  box.textContent += `\n[${where}]\n${err && (err.stack || err.message || err)}\n`;
}
window.addEventListener('error', (e) => reportError(e.error || e.message, 'window.error'));
window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'unhandled-rejection'));

// ── Loading screen — visible during GLB download (~minutes on heavy assets)
function makeLoaderUI() {
  const wrap = document.createElement('div');
  wrap.id = 'intro-loader';
  wrap.style.cssText = `
    position:fixed; inset:0; z-index:300;
    background:#000; color:#7ad9f0;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    font:11px/1.6 'JetBrains Mono', monospace; letter-spacing:3px;
    pointer-events:none;
  `;
  wrap.innerHTML = `
    <div style="font-size:9px; opacity:0.5; margin-bottom:18px;">// ESTABLISHING_RESONANCE</div>
    <div style="width:280px; height:1px; background:rgba(0,212,255,0.18); position:relative;">
      <div id="intro-loader-bar" style="
        position:absolute; left:0; top:-1px; bottom:-1px; width:0%;
        background:linear-gradient(90deg, #00d4ff, #ff2eaa);
        box-shadow:0 0 10px #00d4ff;
        transition:width 0.18s ease-out;
      "></div>
    </div>
    <div id="intro-loader-pct" style="margin-top:14px; font-size:10px; color:#00d4ff;">0%</div>
  `;
  document.body.appendChild(wrap);
  return wrap;
}

const loaderEl = makeLoaderUI();
const barEl = document.getElementById('intro-loader-bar');
const pctEl = document.getElementById('intro-loader-pct');

async function bootstrap() {
  let models = {};
  try {
    // Cap download progress at 80% — the remaining 20% is reserved for
    // scene build / shader compile / warm-up. Keeps the bar monotonic.
    models = await loadAllModels(({ totalAll, loadedAll }) => {
      const pct = totalAll > 0 ? Math.min(80, (loadedAll / totalAll) * 80) : 0;
      barEl.style.width = pct.toFixed(1) + '%';
      pctEl.textContent = pct.toFixed(0) + '%';
    });
    // Audit which models actually loaded + log connection structure for filtering
    console.log('[models] loaded:',
      Object.fromEntries(Object.entries(models).map(([k, v]) => [k, !!v])));
    if (models.ichigo) describeModel(models.ichigo, 'ichigo');
    if (models.guts)   describeModel(models.guts,   'guts');
  } catch (e) {
    reportError(e, 'loadAllModels');
  }

  // Switch loader label from download → scene assembly. The bar continues
  // to advance through stage-based progress (lights/skybox/sigil 1-5/etc.).
  document.querySelector('#intro-loader > div').textContent = '// ASSEMBLING_RESONANCE';

  // Step the bar forward as each named stage fires, so the user sees
  // smooth progress instead of a frozen 100% during world build.
  const STAGE_PROGRESS = {
    LIGHTING: 80,  NEBULA: 82, SKYBOX: 85, CORE: 88,
    'SIGIL 1/5': 90, 'SIGIL 2/5': 91, 'SIGIL 3/5': 92,
    'SIGIL 4/5': 93, 'SIGIL 5/5': 94,
    ENV_MAP:  95,  COMPILING: 96, WARMING: 99, READY: 100,
  };

  let world;
  try {
    const canvas = document.getElementById('stage');
    world = await createWorld(canvas, models, (label) => {
      pctEl.textContent = label;
      const p = STAGE_PROGRESS[label];
      if (p != null) barEl.style.width = p + '%';
    });
  } catch (e) { reportError(e, 'createWorld'); }

  // Animate the bar smoothly to 100% if we haven't already.
  barEl.style.width = '100%';
  pctEl.textContent = 'READY';
  await new Promise((r) => setTimeout(r, 420));

  // Smooth loader → boot timeline handoff. Long gentle fade (1s),
  // generous gap before director starts.
  loaderEl.style.transition = 'opacity 1.0s cubic-bezier(0.5, 0, 0.2, 1)';
  loaderEl.style.opacity = '0';
  await new Promise((r) => setTimeout(r, 360));

  try {
    if (world) startDirector(world);
  } catch (e) { reportError(e, 'startDirector'); }

  setTimeout(() => loaderEl.remove(), 1100);

  if (import.meta.env?.DEV) {
    window.__world = world;
  }
}

bootstrap();
