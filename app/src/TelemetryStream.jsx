import { useEffect, useState, useMemo } from 'react';
import { eventPool, getAvatar } from './avatar.js';

// Persistent low-key telemetry feed pinned bottom-left.
// Generates a fresh line every 6-12s, keeps last 4 visible.
export default function TelemetryStream() {
  const avatar = useMemo(() => getAvatar(), []);
  const pool = useMemo(() => eventPool(avatar.ns), [avatar.ns]);
  const [lines, setLines] = useState(() => seedLines(pool, 3));
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let alive = true;
    function schedule() {
      const delay = 6000 + Math.random() * 6000;
      setTimeout(() => {
        if (!alive) return;
        const e = pool[Math.floor(Math.random() * pool.length)];
        const ts = new Date().toTimeString().slice(0, 8);
        setLines((ls) => [...ls.slice(-3), { ts, msg: e.msg, kind: e.kind, id: Date.now() + Math.random() }]);
        schedule();
      }, delay);
    }
    schedule();
    return () => { alive = false; };
  }, [pool]);

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)}
        className="fixed bottom-24 left-3 z-20 text-[9px] font-mono text-cyan-700 hover:text-cyan-400 tracking-widest"
        title="Expand telemetry"
        data-snd-click="0">
        // TELEMETRY ▸
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 left-3 z-20 max-w-[280px] pointer-events-auto opacity-50 hover:opacity-100 transition-opacity">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[8px] font-mono text-cyan-700 tracking-widest">// TELEMETRY_STREAM</span>
        <button onClick={() => setCollapsed(true)} className="text-[8px] font-mono text-cyan-700 hover:text-cyan-400" data-snd-click="0">▾ HIDE</button>
      </div>
      <div className="space-y-0.5">
        {lines.map((l) => (
          <div key={l.id} className="text-[9px] font-mono leading-tight animate-[fadeIn_0.3s_ease-out]"
            style={{ color: kindColor(l.kind), textShadow: `0 0 4px ${kindColor(l.kind)}40` }}>
            <span className="opacity-50">[{l.ts}]</span> {l.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function seedLines(pool, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = pool[Math.floor(Math.random() * pool.length)];
    const ts = new Date(Date.now() - (n - i) * 5000).toTimeString().slice(0, 8);
    out.push({ ts, msg: e.msg, kind: e.kind, id: i });
  }
  return out;
}

function kindColor(kind) {
  return kind === 'success' ? '#3ddc84'
       : kind === 'warn'    ? '#ffd60a'
       : kind === 'error'   ? '#ff2056'
       : '#7ad9f0';
}
