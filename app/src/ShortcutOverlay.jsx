import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['1'],     desc: 'Aba INÍCIO' },
  { keys: ['2'],     desc: 'Aba TREINOS' },
  { keys: ['3'],     desc: 'Aba AGENDA' },
  { keys: ['4'],     desc: 'Aba CORPO' },
  { keys: ['5'],     desc: 'Aba PERFIL' },
  { keys: ['Esc'],   desc: 'Fechar modal / inspector' },
  { keys: ['?'],     desc: 'Mostrar este overlay' },
];

export default function ShortcutOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?') { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-[min(440px,92vw)] bg-gradient-to-b from-gray-950 to-black border-2 border-cyan-500/60 p-5"
        style={{
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          boxShadow: '0 0 40px rgba(0,212,255,0.3)',
        }}>
        <div className="flex justify-between items-center mb-4">
          <div className="text-[10px] font-mono text-cyan-400 tracking-widest">// KEYBOARD_SHORTCUTS</div>
          <button onClick={() => setOpen(false)} className="text-cyan-700 hover:text-cyan-400" data-snd-click="0"><X size={14}/></button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3 bg-black/40 px-3 py-2 border-l-2 border-cyan-700/40">
              <span className="text-xs text-cyan-200 font-mono">{s.desc}</span>
              <span className="flex gap-1">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="px-2 py-1 text-[10px] font-mono font-bold text-cyan-300 bg-black border border-cyan-500/50"
                    style={{ boxShadow: '0 2px 0 rgba(0,212,255,0.4)' }}>
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-[9px] font-mono text-gray-600 text-center tracking-widest">
          PRESS <kbd className="px-1.5 py-0.5 border border-gray-700 text-gray-400">?</kbd> ANYTIME · ESC TO CLOSE
        </div>
      </div>
    </div>
  );
}
