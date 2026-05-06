import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from './gsapSetup.js';

const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const IS_TOUCH =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// ── Cursor-tracking radial glow on a card ──────────────────────────
// Sets two CSS custom properties on the element (--mx, --my as 0..1)
// plus an --on flag. Pair with a CSS background that uses them.
export function useCursorGlow({ enabled = true } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || PREFERS_REDUCED_MOTION || IS_TOUCH) return;
    let rect = null;
    let raf = null;

    const setVar = (mx, my) => {
      el.style.setProperty('--mx', mx.toFixed(3));
      el.style.setProperty('--my', my.toFixed(3));
    };

    const onEnter = () => {
      rect = el.getBoundingClientRect();
      el.style.setProperty('--on', '1');
    };
    const onMove = (e) => {
      if (!rect) rect = el.getBoundingClientRect();
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const mx = (e.clientX - rect.left) / rect.width;
        const my = (e.clientY - rect.top) / rect.height;
        setVar(mx, my);
      });
    };
    const onLeave = () => {
      el.style.setProperty('--on', '0');
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);
  return ref;
}

// ── Magnetic button pull ───────────────────────────────────────────
export function useMagnetic({ strength = 0.35, scale = 1.04 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || PREFERS_REDUCED_MOTION || IS_TOUCH) return;
    const qx = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' });
    const qs = gsap.quickTo(el, 'scale', { duration: 0.35, ease: 'power3.out' });

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      qx(mx * strength);
      qy(my * strength);
    };
    const onEnter = () => qs(scale);
    const onLeave = () => {
      qx(0);
      qy(0);
      qs(1);
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(el);
    };
  }, [strength, scale]);
  return ref;
}

// ── ScrollTrigger batch reveal ─────────────────────────────────────
// Apply to an array of refs, or a CSS selector inside a scope.
// Usage: useRevealBatch(scopeRef, '[data-reveal]')
export function useRevealBatch(scopeRef, selector = '[data-reveal]', deps = []) {
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    const root = scopeRef?.current || document;
    const els = root.querySelectorAll(selector);
    if (!els.length) return;

    gsap.set(els, { opacity: 0, y: 18, scale: 0.985, filter: 'blur(4px)' });

    const triggers = ScrollTrigger.batch(els, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          overwrite: true,
        }),
    });

    // Refresh after fonts/layout settle
    const refresh = () => ScrollTrigger.refresh();
    const t = setTimeout(refresh, 150);

    return () => {
      clearTimeout(t);
      triggers.forEach((tr) => tr.kill());
      gsap.set(els, { clearProps: 'opacity,y,scale,filter,transform' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Background drift on scroll ─────────────────────────────────────
export function useScrollDrift(targetRef, { intensity = 80 } = {}) {
  useEffect(() => {
    const el = targetRef?.current;
    if (!el || PREFERS_REDUCED_MOTION) return;
    const tween = gsap.to(el, {
      backgroundPosition: `0px ${intensity}px`,
      ease: 'none',
      scrollTrigger: {
        trigger: document.documentElement,
        start: 0,
        end: 'max',
        scrub: 0.6,
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [targetRef, intensity]);
}
