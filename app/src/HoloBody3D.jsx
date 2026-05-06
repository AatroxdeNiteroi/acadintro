import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { HoloEngine } from './holoEngine.js';
import { getAvatar, holoLabel } from './avatar.js';

// Maps artifact muscle IDs (from STRENGTH_STANDARDS) → list of hologram zone IDs.
// Used to translate force/volume data into hologram highlights.
export const ARTIFACT_TO_HOLO = {
  chest_upper: ['pectoralis_l', 'pectoralis_r'],
  chest_mid:   ['pectoralis_l', 'pectoralis_r'],
  chest_lower: ['pectoralis_l', 'pectoralis_r'],
  lats:        ['lats_l', 'lats_r'],
  rhomboids:   ['lats_l', 'lats_r', 'trapezius'],
  traps_upper: ['trapezius'],
  traps_lower: ['trapezius'],
  erectors:    ['erectors'],
  delts_front: ['deltoid_l', 'deltoid_r'],
  delts_mid:   ['deltoid_l', 'deltoid_r'],
  rear_delts:  ['deltoid_l', 'deltoid_r'],
  biceps:      ['biceps_l', 'biceps_r'],
  triceps:     ['triceps_l', 'triceps_r'],
  forearms:    ['forearm_l', 'forearm_r'],
  abs_upper:   ['abs'],
  abs_lower:   ['abs'],
  obliques:    ['obliques_l', 'obliques_r'],
  quads:       ['quad_l', 'quad_r'],
  hamstrings:  ['hamstring_l', 'hamstring_r'],
  glutes:      ['glutes_l', 'glutes_r'],
  adductors:   ['adductors_l', 'adductors_r'],
  abductors:   ['glutes_l', 'glutes_r'],
  gastro:      ['calf_l', 'calf_r'],
  soleus:      ['calf_l', 'calf_r'],
};

// Reverse: hologram zone ID → primary artifact muscle ID (for click-to-inspect).
export const HOLO_TO_ARTIFACT = {
  trapezius:    'traps_upper',
  deltoid_l:    'delts_mid',
  deltoid_r:    'delts_mid',
  pectoralis_l: 'chest_mid',
  pectoralis_r: 'chest_mid',
  biceps_l:     'biceps',
  biceps_r:     'biceps',
  triceps_l:    'triceps',
  triceps_r:    'triceps',
  forearm_l:    'forearms',
  forearm_r:    'forearms',
  lats_l:       'lats',
  lats_r:       'lats',
  abs:          'abs_upper',
  obliques_l:   'obliques',
  obliques_r:   'obliques',
  erectors:     'erectors',
  glutes_l:     'glutes',
  glutes_r:     'glutes',
  quad_l:       'quads',
  quad_r:       'quads',
  adductors_l:  'adductors',
  adductors_r:  'adductors',
  hamstring_l:  'hamstrings',
  hamstring_r:  'hamstrings',
  calf_l:       'gastro',
  calf_r:       'gastro',
  neck:         null,
};

const ZONE_LABELS = {
  trapezius: 'TRAPÉZIO',
  deltoid_l: 'DELTOIDE_E', deltoid_r: 'DELTOIDE_D',
  pectoralis_l: 'PEITORAL_E', pectoralis_r: 'PEITORAL_D',
  biceps_l: 'BÍCEPS_E', biceps_r: 'BÍCEPS_D',
  triceps_l: 'TRÍCEPS_E', triceps_r: 'TRÍCEPS_D',
  forearm_l: 'ANTEBRAÇO_E', forearm_r: 'ANTEBRAÇO_D',
  lats_l: 'LATÍSSIMO_E', lats_r: 'LATÍSSIMO_D',
  abs: 'ABDÔMEN',
  obliques_l: 'OBLÍQUO_E', obliques_r: 'OBLÍQUO_D',
  erectors: 'ERETORES',
  glutes_l: 'GLÚTEO_E', glutes_r: 'GLÚTEO_D',
  quad_l: 'QUADRÍCEPS_E', quad_r: 'QUADRÍCEPS_D',
  adductors_l: 'ADUTORES_E', adductors_r: 'ADUTORES_D',
  hamstring_l: 'POSTERIOR_E', hamstring_r: 'POSTERIOR_D',
  calf_l: 'PANTURRILHA_E', calf_r: 'PANTURRILHA_D',
  neck: 'CERVICAL',
};

const HoloBody3D = forwardRef(function HoloBody3D({ highlights, onSelect, onLoad, className }, ref) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const onLoadRef = useRef(onLoad);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onLoadRef.current = onLoad; }, [onLoad]);

  useImperativeHandle(ref, () => ({
    gotoView: (name) => engineRef.current && engineRef.current.gotoView(name),
    resetCamera: () => engineRef.current && engineRef.current.resetCamera(),
  }), []);

  // Mount engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new HoloEngine(canvas, {
      modelUrl: '/models/anatomy.glb',
      onSelect: (id) => onSelectRef.current && onSelectRef.current(id),
      onLoad: () => {
        setLoaded(true);
        onLoadRef.current && onLoadRef.current();
      },
      onError: (err) => {
        console.error('[HoloBody3D]', err);
        setLoadError(String(err && err.message || err));
      },
    });
    const ns = getAvatar().ns;
    engine.setLabelResolver((id) => holoLabel(ns, id, ZONE_LABELS[id] || id));
    engineRef.current = engine;

    // Apply any highlights set before mount
    if (highlights) engine.setHighlights(highlights);

    // Observe parent size changes (panel resize, tab switch, etc.)
    const ro = new ResizeObserver(() => engine._resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push highlights when prop changes
  useEffect(() => {
    if (engineRef.current) engineRef.current.setHighlights(highlights || {});
  }, [highlights]);

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      {!loaded && !loadError && <HoloBootOverlay/>}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85">
          <div className="text-center font-mono">
            <div className="text-[10px] text-red-500 tracking-widest mb-1">// PROJECTION_ERROR //</div>
            <div className="text-xs text-red-300">{loadError}</div>
          </div>
        </div>
      )}
    </div>
  );
});

function HoloBootOverlay() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);
  const dots = '.'.repeat(phase);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-none">
      <div className="absolute inset-0" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,212,255,0.06) 0px, rgba(0,212,255,0.06) 1px, transparent 1px, transparent 4px)',
        animation: 'scanShift 1.5s linear infinite',
      }}/>
      <div className="relative text-center">
        <div className="text-[10px] font-mono text-cyan-700 tracking-widest mb-2">{'> '}HOLO_PROJECTOR</div>
        <div className="text-cyan-300 font-mono text-sm tracking-widest" style={{ textShadow: '0 0 12px #00d4ff' }}>
          PROJECTING NEURAL_MAP{dots}
        </div>
        <div className="mt-3 mx-auto w-48 h-0.5 bg-cyan-900/40 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-pink-500" style={{
            width: '40%', animation: 'progressSlide 1.2s ease-in-out infinite',
          }}/>
        </div>
      </div>
    </div>
  );
}

export default HoloBody3D;

// Helper: convert artifact's `forcas` / `volumeSemanal` map into hologram-zone highlights.
const NIVEL_HOLO_COLORS = {
  iniciante: 0xff3030, novato: 0xff8030, intermediario: 0xffd030,
  avancado: 0x40ffaa, elite: 0x00d4ff,
};

export function highlightsFromForca(forcas) {
  const out = {};
  for (const [artifactId, level] of Object.entries(forcas || {})) {
    const zones = ARTIFACT_TO_HOLO[artifactId];
    if (!zones) continue;
    const order = { iniciante: 1, novato: 2, intermediario: 3, avancado: 4, elite: 5 };
    for (const z of zones) {
      const cur = out[z];
      if (!cur || order[level] > order[cur._level]) {
        out[z] = { color: NIVEL_HOLO_COLORS[level], intensity: 0.8 + order[level] * 0.18, _level: level };
      }
    }
  }
  // Strip _level (kept only for ranking)
  for (const k of Object.keys(out)) delete out[k]._level;
  return out;
}

export function highlightsFromVolume(volumeSemanal) {
  const totals = {};
  for (const [artifactId, vol] of Object.entries(volumeSemanal || {})) {
    const zones = ARTIFACT_TO_HOLO[artifactId];
    if (!zones || !vol) continue;
    for (const z of zones) totals[z] = (totals[z] || 0) + vol;
  }
  const max = Math.max(1, ...Object.values(totals));
  const out = {};
  for (const [z, v] of Object.entries(totals)) {
    const t = v / max;
    let hue;
    if (t < 0.25) hue = 0.66 - t * 0.4;
    else if (t < 0.5) hue = 0.5 - (t - 0.25) * 0.6;
    else if (t < 0.75) hue = 0.33 - (t - 0.5) * 0.5;
    else hue = 0.16 - (t - 0.75) * 0.64;
    const c = hslToHex(Math.max(0, hue), 0.95, 0.45 + t * 0.15);
    out[z] = { color: c, intensity: 0.4 + t * 1.6 };
  }
  return out;
}

function hslToHex(h, s, l) {
  // h in [0,1]
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return (r << 16) | (g << 8) | b;
}
