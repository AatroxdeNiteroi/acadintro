import { useEffect, useRef, useState } from 'react';
import { settingsApi } from './Settings.jsx';

// Background ambient layer: drifting cyan/pink data motes connected by faint lines + slow CRT scanline.
// Idle 60s+ → ambient intensifies. Mouse parallax shifts background subtly.
export default function Ambient() {
  const canvasRef = useRef(null);
  const layerRef = useRef(null);
  const [idle, setIdle] = useState(false);
  const [perfMode, setPerfMode] = useState(() => settingsApi.perfMode());
  const [parallaxOn, setParallaxOn] = useState(() => settingsApi.showParallax());

  useEffect(() => {
    function onChange() {
      setPerfMode(settingsApi.perfMode());
      setParallaxOn(settingsApi.showParallax());
    }
    window.addEventListener('settings-changed', onChange);
    return () => window.removeEventListener('settings-changed', onChange);
  }, []);

  // Idle detection
  useEffect(() => {
    let lastInput = performance.now();
    let timer = null;
    function reset() {
      lastInput = performance.now();
      if (idle) setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 60000);
    }
    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    timer = setTimeout(() => setIdle(true), 60000);
    return () => {
      ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => window.removeEventListener(ev, reset));
      clearTimeout(timer);
    };
  }, [idle]);

  // Parallax — shift background canvas 0..12px based on mouse position
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (!parallaxOn || perfMode) {
      layer.style.transform = '';
      return;
    }
    let raf = null;
    function onMove(e) {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const tx = (e.clientX / window.innerWidth  - 0.5) * -16;
        const ty = (e.clientY / window.innerHeight - 0.5) * -16;
        layer.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      });
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, [parallaxOn, perfMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (perfMode) {
      const ctx = canvas.getContext('2d');
      ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const ctx = canvas.getContext('2d');
    let raf;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0;
    const motes = [];
    const baseCount = Math.max(28, Math.floor((window.innerWidth * window.innerHeight) / 24000));
    let COUNT = baseCount;

    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn() {
      for (let i = 0; i < COUNT; i++) {
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vy: -0.05 - Math.random() * 0.15,
          vx: (Math.random() - 0.5) * 0.04,
          r: 0.6 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
          hue: Math.random() < 0.85 ? 'cy' : 'pk',
        });
      }
    }
    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      // soft glow background - very subtle radial pulse driven by time
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.0006);
      const grad = ctx.createRadialGradient(w/2, h*0.7, 0, w/2, h*0.7, Math.max(w, h) * 0.7);
      grad.addColorStop(0, `rgba(0,212,255,${0.020 + pulse * 0.018})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // motes + connections
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.x += m.vx; m.y += m.vy;
        m.phase += 0.02;
        if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
        if (m.x < -10) m.x = w + 10; if (m.x > w + 10) m.x = -10;
        const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(m.phase));
        const color = m.hue === 'cy' ? `0,212,255` : `255,46,170`;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        // glow
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${alpha * 0.15})`;
        ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // lines between near motes (cheap O(n^2) but n is small)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < motes.length; i++) {
        for (let j = i + 1; j < motes.length; j++) {
          const dx = motes[i].x - motes[j].x;
          const dy = motes[i].y - motes[j].y;
          const d2 = dx*dx + dy*dy;
          if (d2 < 11000) {
            const a = (1 - d2 / 11000) * 0.15;
            ctx.strokeStyle = `rgba(0,212,255,${a})`;
            ctx.beginPath();
            ctx.moveTo(motes[i].x, motes[i].y);
            ctx.lineTo(motes[j].x, motes[j].y);
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    spawn();
    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [perfMode]);

  return (
    <>
      <div ref={layerRef} className="fixed inset-0 z-0 pointer-events-none" style={{ willChange: 'transform', transition: 'transform 0.3s ease-out' }}>
        <canvas ref={canvasRef} className="absolute inset-0" aria-hidden/>
      </div>
      {/* slow CRT scanline — accelerates when idle */}
      <div className="fixed left-0 right-0 z-[5] pointer-events-none h-12 transition-opacity duration-1000"
        style={{
          top: 0,
          background: 'linear-gradient(180deg, transparent, rgba(0,212,255,0.05) 50%, transparent)',
          animation: idle ? 'crtSweep 4.5s linear infinite' : 'crtSweep 9s linear infinite',
          mixBlendMode: 'screen',
          opacity: idle ? 0.55 : 0.3,
        }}/>
      {/* breathing vignette — deepens when idle */}
      <div className="fixed inset-0 z-[6] pointer-events-none transition-opacity duration-1000"
        style={{
          background: idle
            ? 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)'
            : 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
          animation: idle ? 'vignettePulse 4s ease-in-out infinite' : 'vignettePulse 7s ease-in-out infinite',
        }}/>
      {idle && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[8] pointer-events-none text-[10px] font-mono tracking-[0.4em] text-cyan-500/40"
          style={{ animation: 'fadeIn 1.5s ease forwards', textShadow: '0 0 12px rgba(0,212,255,0.4)' }}>
          // DEEP_FOCUS_MODE
        </div>
      )}
    </>
  );
}
