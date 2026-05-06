import { useEffect, useState } from 'react';

const LINES = [
  { t: 'BIOS_v4.7.1 ........................ OK', delay: 60 },
  { t: 'NEURAL_INTERFACE ................... ONLINE', delay: 80 },
  { t: 'BIOMETRIC_HANDSHAKE ................ ACK', delay: 70 },
  { t: 'LOADING /usr/gym/strength_db.json .. 100%', delay: 90 },
  { t: 'LOADING /usr/gym/holo_engine.bin ... 100%', delay: 90 },
  { t: 'CALIBRATING_HOLO_PROJECTOR ......... DONE', delay: 80 },
  { t: 'NEURAL.GYM v0.1.0 .................. READY', delay: 90 },
];

export default function BootScreen({ onDone }) {
  const [shown, setShown] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (shown >= LINES.length) {
      const t = setTimeout(() => setFadingOut(true), 350);
      const t2 = setTimeout(() => onDone && onDone(), 700);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
    const id = setTimeout(() => setShown((s) => s + 1), LINES[shown].delay);
    return () => clearTimeout(id);
  }, [shown, onDone]);

  return (
    <div className={`fixed inset-0 z-[2000] bg-black flex flex-col justify-center px-6 transition-opacity duration-300 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,212,255,0.05) 0px, rgba(0,212,255,0.05) 1px, transparent 1px, transparent 3px)',
      }}/>
      <div className="relative max-w-md mx-auto w-full">
        <div className="mb-6">
          <div className="text-[10px] font-mono text-cyan-700 tracking-widest mb-1">{'> '}INITIALIZING</div>
          <h1 className="text-3xl font-bold tracking-widest font-mono"
            style={{
              background: 'linear-gradient(90deg, #00d4ff, #ff2eaa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(0,212,255,0.4)',
              animation: 'glitchText 2s infinite',
            }}>NEURAL.GYM</h1>
        </div>

        <div className="space-y-1 font-mono text-[11px]">
          {LINES.slice(0, shown).map((l, i) => (
            <div key={i} className="text-cyan-300/80 animate-[fadeIn_0.15s_ease-out]">
              <span className="text-cyan-700">[{String(i+1).padStart(2,'0')}] </span>
              {l.t}
            </div>
          ))}
          {shown < LINES.length && (
            <div className="text-cyan-500 animate-pulse">
              <span className="text-cyan-700">[{String(shown+1).padStart(2,'0')}] </span>
              {LINES[shown].t.split('.')[0]}<span className="opacity-60">...</span>
              <span className="ml-1 inline-block w-2 h-3 bg-cyan-400 animate-pulse"/>
            </div>
          )}
        </div>

        {shown >= LINES.length && (
          <div className="mt-4 text-emerald-400 font-mono text-xs tracking-widest animate-pulse">
            ▣ SYSTEM READY
          </div>
        )}
      </div>
    </div>
  );
}
