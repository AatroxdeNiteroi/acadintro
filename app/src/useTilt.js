import { useEffect, useRef } from 'react';

// Apply subtle 3D tilt to an element following cursor position. Apple-style depth.
export function useTilt({ max = 5, scale = 1.01, perspective = 1000 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let rect = null;
    let raf = null;
    let active = false;

    function onEnter() {
      active = true;
      rect = el.getBoundingClientRect();
      el.style.transition = 'transform 0.15s ease-out';
      el.style.willChange = 'transform';
    }
    function onMove(e) {
      if (!active) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const x = (e.clientX - rect.left) / rect.width;  // 0..1
        const y = (e.clientY - rect.top)  / rect.height; // 0..1
        const rx = (0.5 - y) * max * 2;
        const ry = (x - 0.5) * max * 2;
        el.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
      });
    }
    function onLeave() {
      active = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      el.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
      el.style.transform  = `perspective(${perspective}px) rotateX(0) rotateY(0) scale(1)`;
    }

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove',  onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove',  onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [max, scale, perspective]);

  return ref;
}
