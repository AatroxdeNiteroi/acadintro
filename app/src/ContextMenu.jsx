import { useEffect, useState } from 'react';

// Cyberpunk-styled right-click menu. Generic actions only.
const ACTIONS = [
  { id: 'reload',     label: 'RELOAD_NEURAL_LINK',  fn: () => window.location.reload() },
  { id: 'top',        label: 'SCROLL_TO_TOP',       fn: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
  { id: 'home',       label: 'RETURN_TO_BOOT',      fn: () => { try { sessionStorage.removeItem('booted'); } catch {} window.location.href = '/'; } },
  { id: 'shortcuts',  label: 'SHOW_SHORTCUTS',      fn: () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' })); } },
];

export default function ContextMenu() {
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    function onContext(e) {
      // Don't override on inputs (let native paste/cut menu through)
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Shift+right-click bypasses the custom menu (lets user copy text, inspect element, etc.)
      if (e.shiftKey) return;
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY });
    }
    function onClick() { setMenu(null); }
    function onKey(e) { if (e.key === 'Escape') setMenu(null); }
    window.addEventListener('contextmenu', onContext);
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('contextmenu', onContext);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!menu) return null;
  // Clamp to viewport
  const w = 220;
  const x = Math.min(menu.x, window.innerWidth - w - 8);
  const y = Math.min(menu.y, window.innerHeight - 200);
  return (
    <div className="fixed z-[1500] bg-gradient-to-b from-black to-gray-950/95 border border-cyan-500/60 backdrop-blur-md animate-[fadeIn_0.12s_ease-out]"
      style={{
        left: x, top: y, width: w,
        boxShadow: '0 0 28px rgba(0,212,255,0.35)',
        clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
      }}>
      <div className="text-[9px] font-mono text-cyan-500 tracking-widest px-3 pt-2 pb-1 border-b border-cyan-900/40">
        // CONTEXT_MENU
      </div>
      {ACTIONS.map(a => (
        <button key={a.id} onClick={(e) => { e.stopPropagation(); a.fn(); setMenu(null); }}
          className="w-full text-left text-xs font-mono text-cyan-200 hover:bg-cyan-500/15 px-3 py-2 transition border-l-2 border-transparent hover:border-cyan-400">
          {'> '}{a.label}
        </button>
      ))}
    </div>
  );
}
