import { useEffect, useState } from 'react';

export default function Clock({ className = '' }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  const t = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const d = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  return (
    <div className={`hidden md:block text-right font-mono leading-tight ${className}`}>
      <div className="text-[10px] text-cyan-400 tracking-widest" style={{ textShadow: '0 0 6px rgba(0,212,255,0.5)' }}>{t}</div>
      <div className="text-[8px] text-cyan-700 tracking-wider">{d}</div>
    </div>
  );
}
