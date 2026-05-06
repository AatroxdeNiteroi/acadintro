import { Play } from 'lucide-react';

// Floating action button: persistent ▶ START WORKOUT trigger.
// Hidden when a workout is already active.
export default function FAB({ onStart, hidden, color = '#ff2eaa' }) {
  if (hidden) return null;
  return (
    <button onClick={onStart}
      className="fixed bottom-24 right-4 z-30 group"
      style={{
        width: 56, height: 56,
        background: `linear-gradient(135deg, ${color}, #00d4ff)`,
        boxShadow: `0 0 24px ${color}99, 0 4px 16px rgba(0,0,0,0.5)`,
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      }}
      title="Iniciar treino livre">
      <span className="absolute inset-0 flex items-center justify-center text-black">
        <Play size={22} fill="black"/>
      </span>
      <span className="absolute -top-8 right-0 px-2 py-1 text-[9px] font-mono tracking-widest text-cyan-300 bg-black/95 border border-cyan-500/50 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
        START_FREE
      </span>
    </button>
  );
}
