import { useState } from 'react';
import { X, Settings as Cog, Volume2, Music, Eye, Zap, Activity, RotateCw } from 'lucide-react';
import { getAvatar } from './avatar.js';
import { isSoundEnabled, setSoundEnabled, isBedEnabled, setBedEnabled, sfx } from './sounds.js';
import { useDialog } from './dialogs.jsx';

// localStorage helpers
const get = (k, def = true) => {
  try { const v = localStorage.getItem(k); return v == null ? def : v === '1'; } catch { return def; }
};
const set = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch {} };

// Notify components that a setting changed
function emitChange() { window.dispatchEvent(new Event('settings-changed')); }

export const settingsApi = {
  showCursor:    () => get('show_cursor',    true),
  showParallax:  () => get('show_parallax',  true),
  showTelemetry: () => get('show_telemetry', true),
  perfMode:      () => get('perf_mode',      false),
};

export default function Settings({ open, onClose }) {
  const dialog = useDialog();
  const avatar = getAvatar();
  const [snd, setSnd]               = useState(() => isSoundEnabled());
  const [bed, setBed]               = useState(() => isBedEnabled());
  const [perfMode, setPerfMode]     = useState(() => settingsApi.perfMode());
  const [telemetry, setTelemetry]   = useState(() => settingsApi.showTelemetry());
  const [parallax, setParallax]     = useState(() => settingsApi.showParallax());
  const [cursor, setCursor]         = useState(() => settingsApi.showCursor());

  if (!open) return null;

  function update(k, v, setter) { set(k, v); setter(v); emitChange(); }

  async function rebindAvatar() {
    if (!await dialog.confirm('Voltar ao boot pra escolher outro avatar?', { destructive: true, okLabel: 'RESELECIONAR' })) return;
    try {
      localStorage.removeItem('avatar_ns');
      localStorage.removeItem('avatar_fn');
      localStorage.removeItem('intro_seen');
      sessionStorage.removeItem('booted');
    } catch {}
    window.location.href = '/';
  }
  async function replayIntro() {
    if (!await dialog.confirm('Replay da intro? Você vai re-escolher o avatar também.')) return;
    try { localStorage.removeItem('intro_seen'); sessionStorage.removeItem('booted'); } catch {}
    window.location.href = '/';
  }

  return (
    <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm animate-[fadeIn_0.18s_ease-out]" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-[min(380px,90vw)] bg-gradient-to-b from-black to-gray-950 border-l-2 overflow-y-auto"
        style={{ borderColor: avatar.color, boxShadow: `-8px 0 40px ${avatar.color}50` }}
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-cyan-900/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cog size={14} style={{ color: avatar.color }}/>
            <span className="text-[11px] font-mono tracking-widest" style={{ color: avatar.color }}>// SETTINGS</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white" data-snd-click="0"><X size={14}/></button>
        </div>

        <div className="p-4 space-y-4">
          <SettingsGroup title="// SOUND">
            <ToggleRow icon={<Volume2 size={12}/>} label="Efeitos sonoros" on={snd}
              onChange={(v) => { setSoundEnabled(v); setSnd(v); if (v) sfx.ping(); }}/>
            <ToggleRow icon={<Music size={12}/>}   label="Pad ambiente"   on={bed}
              onChange={(v) => { setBedEnabled(v); setBed(v); }}/>
          </SettingsGroup>

          <SettingsGroup title="// VISUAL">
            <ToggleRow icon={<Eye size={12}/>}      label="Cursor customizado"
              on={cursor} onChange={(v) => update('show_cursor', v, setCursor)}/>
            <ToggleRow icon={<Activity size={12}/>} label="Parallax do background"
              on={parallax} onChange={(v) => update('show_parallax', v, setParallax)}/>
            <ToggleRow icon={<Zap size={12}/>}      label="Telemetry stream"
              on={telemetry} onChange={(v) => update('show_telemetry', v, setTelemetry)}/>
          </SettingsGroup>

          <SettingsGroup title="// PERFORMANCE">
            <ToggleRow icon={<Zap size={12}/>} label="Modo calmo (desativa atmosféricos)"
              on={perfMode} onChange={(v) => update('perf_mode', v, setPerfMode)}/>
            <p className="text-[9px] text-gray-600 font-mono px-2 mt-1 italic">// para hardware mais fraco — corta partículas, parallax, telemetry e bed</p>
          </SettingsGroup>

          <SettingsGroup title="// AVATAR">
            <div className="px-3 py-2 bg-black/40 border border-cyan-900/40">
              <div className="text-[9px] font-mono text-gray-500 mb-1 tracking-widest">VINCULADO</div>
              <div className="font-mono text-sm" style={{ color: avatar.color }}>
                <span className="opacity-70">{avatar.ns}</span>.<span className="font-bold">{avatar.fn}</span>
              </div>
            </div>
            <button onClick={rebindAvatar}
              className="w-full bg-black border border-pink-700 hover:border-pink-400 text-pink-400 py-2.5 font-mono text-[10px] tracking-widest mt-2 cy-lift">
              <RotateCw size={11} className="inline mr-1.5"/> RESELEC. AVATAR
            </button>
            <button onClick={replayIntro}
              className="w-full bg-black border border-cyan-900 hover:border-cyan-500 text-cyan-400 py-2.5 font-mono text-[10px] tracking-widest mt-2 cy-lift">
              ▸ REPLAY INTRO
            </button>
          </SettingsGroup>

          <div className="text-[8px] font-mono text-gray-700 text-center pt-2 tracking-widest">
            NEURAL.GYM v0.1.0 // settings persisted to localStorage
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <div>
      <div className="text-[9px] font-mono text-cyan-700 tracking-widest mb-1.5">{title}</div>
      <div className="bg-black/40 border-l-2 border-cyan-900/40 p-1 space-y-0.5">{children}</div>
    </div>
  );
}

function ToggleRow({ label, icon, on, onChange }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-cyan-500/5 transition">
      <span className="text-cyan-700">{icon}</span>
      <span className="flex-1 text-[11px] font-mono text-cyan-100">{label}</span>
      <button onClick={() => onChange(!on)} data-snd-click="0"
        className={`w-9 h-5 border relative transition-colors ${on ? 'border-cyan-400 bg-cyan-500/20' : 'border-gray-700 bg-black'}`}>
        <span className="absolute top-0.5 w-3.5 h-3.5 transition-all"
          style={{
            left: on ? '18px' : '2px',
            background: on ? '#67e8f9' : '#4b5563',
            boxShadow: on ? '0 0 6px #00d4ff' : 'none',
          }}/>
      </button>
    </div>
  );
}
