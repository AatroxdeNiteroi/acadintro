import { useEffect, useRef, useState } from 'react';
import { gsap } from './gsapSetup.js';

// Mounted only when arriving from the resonance intro. Starts fully opaque
// (matching the intro's final black curtain) and fades to transparent so the
// React app surfaces without a perceptible cut.
export default function HandoffCurtain() {
  const ref = useRef(null);
  const [armed] = useState(() => {
    try {
      if (sessionStorage.getItem('intro_handoff') === '1') {
        sessionStorage.removeItem('intro_handoff');  // one-shot
        return true;
      }
    } catch {}
    return false;
  });
  const [done, setDone] = useState(!armed);

  useEffect(() => {
    if (!armed || !ref.current) return;
    // Hold for one frame in opaque state, then ease out.
    // Slight tint pulse from the chosen avatar color → black, mirroring intro end.
    let tintHex = '#000000';
    try {
      const c = sessionStorage.getItem('handoff_color');
      if (c) tintHex = c;
      sessionStorage.removeItem('handoff_color');
    } catch {}

    const tl = gsap.timeline({ onComplete: () => setDone(true) });
    // Frame 1: hold solid black so the redirect cut is invisible
    tl.set(ref.current, { backgroundColor: '#000', opacity: 1 });
    // 0.25s breath of color (subtle echo of the chosen avatar) under black
    tl.to(ref.current, {
      backgroundColor: tintHex,
      duration: 0.5, ease: 'power2.inOut',
    }, 0.05);
    tl.to(ref.current, {
      backgroundColor: '#000000',
      duration: 0.6, ease: 'power2.inOut',
    }, 0.4);
    // Long, soft fade — the cut from intro to app lives entirely under here
    tl.to(ref.current, {
      opacity: 0, duration: 1.4, ease: 'power3.inOut',
    }, 0.7);
  }, [armed]);

  if (done) return null;
  return (
    <div ref={ref} aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#000', opacity: 1,
      pointerEvents: 'none',
      willChange: 'opacity, background-color',
    }}/>
  );
}
