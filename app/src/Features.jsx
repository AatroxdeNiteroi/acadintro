import { Sparkles, X } from 'lucide-react';
import { getAvatar } from './avatar.js';

const FEATURES = [
  { cat: 'TREINO', items: [
    'Geração de plano com IA (Claude)',
    'Templates: Push / Pull / Legs / Full Body',
    'Editor visual de planos custom',
    'Execução com timer global + descanso',
    'Botões rápidos ±2.5 / ±5 / ±10 kg',
    'Detecção de PRs com confetti + cue do avatar',
    'Histórico agrupado por semana',
  ]},
  { cat: 'ANÁLISE', items: [
    'Holograma 3D anatômico interativo',
    'Modo FORÇA (5 níveis por músculo)',
    'Modo VOLUME 7d (heatmap colorido)',
    'Click no músculo → inspector com PRs',
    'Auto-rotação idle do corpo',
    'Gráficos: 1RM, volume por sessão, peso',
    'Heatmap de streak (26 semanas)',
    'Top 10 PRs',
  ]},
  { cat: 'AGENDA', items: [
    'Calendário semanal com atribuição',
    'Stats: planejados / executados / conclusão / streak 🔥',
    'Volume projetado vs executado',
    'Distribuição muscular semanal',
    'Copiar semana anterior',
  ]},
  { cat: 'PERSONA', items: [
    '5 avatares (aatrox / druid / kratos / gun.park / ichigo)',
    'Cursor customizado por avatar',
    'Cues sonoros únicos por avatar',
    'Empty states com voz do personagem',
    'Telemetry stream com refs constantes',
    'Toasts e mensagens flavoradas',
  ]},
  { cat: 'NUTRIÇÃO', items: [
    'TMB (Mifflin-St Jeor)',
    'TDEE por nível de atividade',
    'Macros por objetivo (cutting/bulking/hipertrofia)',
    '4 refeições calculadas automaticamente',
  ]},
  { cat: 'ATMOSFERA', items: [
    'Intro completa (sigilo, boot log, seleção de avatar)',
    'Partículas ambient drifting',
    'CRT scanline + vignette pulsante',
    'Modo deep-focus quando idle',
    'Pad ambiente sintetizado',
    'Glitch + ripples + shockwaves',
    'Parallax do background',
  ]},
  { cat: 'INTERFACE', items: [
    'Atalhos: 1-5 abas, Esc, ?',
    'Toast pinning (alfinete)',
    'Menu de contexto custom',
    'FAB de treino livre',
    'Modais cyberpunk',
    'Boot screen automático',
  ]},
];

const VOICES = {
  aatrox: 'I, the World Ender, grant you this arsenal.',
  druid:  'Behold what the wild has gathered.',
  kratos: 'These tools you may wield, mortal.',
  gun:    'Mission parameters // available capabilities.',
  ichigo: 'These are the techniques at your disposal.',
};

const SUBTITLES = {
  aatrox: '// the darkin opens its archive',
  druid:  '// the grove unveils its gifts',
  kratos: '// ΟΜΕΓΑ catalogues the arsenal',
  gun:    '// big_deal briefing dossier',
  ichigo: '// hollow_codex revealed',
};

export default function Features({ open, onClose }) {
  if (!open) return null;
  const avatar = getAvatar();
  const voice = VOICES[avatar.ns] || VOICES.ichigo;
  const sub   = SUBTITLES[avatar.ns] || SUBTITLES.ichigo;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] px-4"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-[min(720px,94vw)] max-h-[88vh] overflow-y-auto bg-gradient-to-b from-gray-950 to-black border-2 p-6 animate-[modalIn_0.28s_cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          borderColor: avatar.color + '90',
          boxShadow: `0 0 60px ${avatar.color}55, inset 0 0 40px ${avatar.color}10`,
          clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
        }}>
        {/* corner ticks */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: avatar.color }}/>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: avatar.color }}/>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: avatar.color }}/>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: avatar.color }}/>

        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white" data-snd-click="0">
          <X size={16}/>
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} style={{ color: avatar.color }}/>
          <div className="text-[10px] font-mono tracking-widest" style={{ color: avatar.color }}>{sub}</div>
        </div>
        <h2 className="text-2xl font-bold tracking-widest mb-1" style={{
          background: `linear-gradient(90deg, ${avatar.color}, #00d4ff)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: 'Orbitron, monospace',
          textShadow: `0 0 20px ${avatar.color}80`,
        }}>{avatar.ns.toUpperCase()}.{avatar.fn.toUpperCase()}</h2>
        <p className="text-xs italic mb-5 font-mono" style={{ color: avatar.color, opacity: 0.85, textShadow: `0 0 8px ${avatar.color}40` }}>
          ❝ {voice} ❞
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map((group) => (
            <div key={group.cat}>
              <div className="text-[10px] font-mono tracking-widest mb-2 pb-1.5 border-b flex items-center gap-2"
                style={{ color: avatar.color, borderColor: avatar.color + '40' }}>
                <span className="w-1.5 h-1.5" style={{ background: avatar.color, boxShadow: `0 0 6px ${avatar.color}` }}/>
                ▸ {group.cat}
              </div>
              <ul className="space-y-1.5">
                {group.items.map((item, i) => (
                  <li key={i} className="text-[11px] font-mono text-cyan-200 flex items-start gap-2 leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: avatar.color, boxShadow: `0 0 4px ${avatar.color}` }}/>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t text-[9px] font-mono tracking-widest text-center"
          style={{ borderColor: avatar.color + '30', color: avatar.color, opacity: 0.6 }}>
          NEURAL.GYM v0.1.0 // Ω BOUND :: {avatar.ns}.{avatar.fn}
        </div>
      </div>
    </div>
  );
}
