import { useEffect, useRef } from 'react';
import { getAvatar } from './avatar.js';

// One SVG glyph per avatar. All centered on (18,18) with a 36×36 viewBox.
// The click hotspot is the center white pip; the symbol surrounds it.
const GLYPHS = {
  // ─── aatrox: curved Darkin blade arcing around the click point ───
  aatrox: (
    <g>
      <path d="M 4 30 Q 18 2 32 12 Q 22 18 28 30 Q 18 22 4 30 Z"
        fill="#ff2056" stroke="#ff5f8a" strokeWidth="0.7" opacity="0.95"/>
      <path d="M 8 27 Q 18 8 28 14" stroke="#fff" strokeWidth="0.4" fill="none" opacity="0.6"/>
      <circle cx="18" cy="18" r="1.4" fill="#fff"/>
    </g>
  ),
  // ─── druid: crescent moon + small spirit wisp ───
  druid: (
    <g>
      <path d="M 30 8 A 11 11 0 1 0 30 28 A 7.5 7.5 0 1 1 30 8 Z"
        fill="#3ddc84" stroke="#7cf2b1" strokeWidth="0.5"/>
      <circle cx="9" cy="11" r="1.2" fill="#3ddc84" opacity="0.7"/>
      <circle cx="6" cy="22" r="0.9" fill="#3ddc84" opacity="0.5"/>
      <circle cx="18" cy="18" r="1.4" fill="#fff"/>
    </g>
  ),
  // ─── kratos: Omega (Spartan rage) ───
  kratos: (
    <g stroke="#ffd60a" strokeLinecap="round" fill="none">
      <path d="M 9 30 L 13 22 A 6.5 6.5 0 1 1 23 22 L 27 30" strokeWidth="2.4"/>
      <line x1="6"  y1="30" x2="13" y2="30" strokeWidth="2.4"/>
      <line x1="23" y1="30" x2="30" y2="30" strokeWidth="2.4"/>
      <circle cx="18" cy="18" r="1.4" fill="#fff" stroke="none"/>
    </g>
  ),
  // ─── gun.park: sniper reticle, click point = bullseye ───
  gun: (
    <g stroke="#7ad9f0" fill="none">
      <circle cx="18" cy="18" r="12" strokeWidth="0.9"/>
      <circle cx="18" cy="18" r="5"  strokeWidth="0.7"/>
      <line x1="18" y1="2"  x2="18" y2="9"  strokeWidth="0.9"/>
      <line x1="18" y1="27" x2="18" y2="34" strokeWidth="0.9"/>
      <line x1="2"  y1="18" x2="9"  y2="18" strokeWidth="0.9"/>
      <line x1="27" y1="18" x2="34" y2="18" strokeWidth="0.9"/>
      <circle cx="18" cy="18" r="1.5" fill="#7ad9f0" stroke="none"/>
    </g>
  ),
  // ─── ichigo: hollow mask outline ───
  ichigo: (
    <g>
      <path d="M 8 23 Q 8 4 18 4 Q 28 4 28 23 L 22 23 L 18 30 L 14 23 Z"
        fill="none" stroke="#ff5f8a" strokeWidth="1.2"/>
      <rect x="11" y="13" width="3.5" height="2.2" fill="#ff2056"/>
      <rect x="21.5" y="13" width="3.5" height="2.2" fill="#ff2056"/>
      <path d="M 14 19 L 22 19" stroke="#ff5f8a" strokeWidth="0.7" opacity="0.7"/>
      <circle cx="18" cy="18" r="1.4" fill="#fff"/>
    </g>
  ),
};

export default function Cursor() {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const avatar = getAvatar();
  const glyph = GLYPHS[avatar.ns] || GLYPHS.ichigo;

  useEffect(() => {
    let lastTrail = 0;
    const onMove = (e) => {
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate3d(${e.clientX - 18}px, ${e.clientY - 18}px, 0)`;
      }
      // Trail dot — throttled
      const now = performance.now();
      if (now - lastTrail > 28) {
        lastTrail = now;
        const dot = document.createElement('div');
        dot.className = 'cy-cursor-trail';
        dot.style.left = e.clientX + 'px';
        dot.style.top  = e.clientY + 'px';
        dot.style.color = avatar.color;
        document.body.appendChild(dot);
        setTimeout(() => dot.remove(), 600);
      }
    };
    const onOver = (e) => {
      const t = e.target;
      const isInteractive = t && t.closest && t.closest('button, a, [role=button], [data-interactive]');
      const isText = t && t.closest && t.closest('input, textarea, select, [contenteditable=true]');
      if (innerRef.current) {
        innerRef.current.classList.toggle('cy-cursor-hot',  !!isInteractive && !isText);
        innerRef.current.classList.toggle('cy-cursor-text', !!isText);
      }
    };
    const onLeave = () => wrapRef.current && wrapRef.current.classList.add('cy-cursor-hidden');
    const onEnter = () => wrapRef.current && wrapRef.current.classList.remove('cy-cursor-hidden');
    const onClick = (e) => {
      // Inner shockwave — sharp and fast
      const ripple = document.createElement('div');
      ripple.className = 'cy-cursor-ripple';
      ripple.style.left = e.clientX + 'px';
      ripple.style.top  = e.clientY + 'px';
      ripple.style.color = avatar.color;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 720);
      // Outer shockwave — wider, slower
      const wave = document.createElement('div');
      wave.className = 'cy-cursor-shockwave';
      wave.style.left = e.clientX + 'px';
      wave.style.top  = e.clientY + 'px';
      wave.style.color = avatar.color;
      document.body.appendChild(wave);
      setTimeout(() => wave.remove(), 900);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.documentElement.addEventListener('pointerenter', onEnter);
    window.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.documentElement.removeEventListener('pointerenter', onEnter);
      window.removeEventListener('click', onClick, true);
    };
  }, [avatar.color]);

  return (
    <div ref={wrapRef} className="cy-cursor"
      style={{ filter: `drop-shadow(0 0 8px ${avatar.color}) drop-shadow(0 0 2px ${avatar.color})` }}>
      <div ref={innerRef} className="cy-cursor-inner">
        <svg width="36" height="36" viewBox="0 0 36 36">{glyph}</svg>
      </div>
    </div>
  );
}
