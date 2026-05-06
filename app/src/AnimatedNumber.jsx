import { useEffect, useRef, useState } from 'react';

// Vertical "slot reel" for a single digit 0-9.
function DigitColumn({ digit }) {
  return (
    <span className="cy-digit">
      <span className="cy-digit-strip" style={{ transform: `translateY(-${digit}em)` }}>
        {Array.from({ length: 10 }, (_, i) => <span key={i}>{i}</span>)}
      </span>
    </span>
  );
}

function DigitRoll({ value, prefix = '', suffix = '' }) {
  const v = Math.abs(Math.round(value));
  const negative = value < 0;
  const digits = String(v).split('');
  return (
    <span className="cy-digit-row">
      {prefix}
      {negative && <span>-</span>}
      {digits.map((d, i) => /\d/.test(d)
        ? <DigitColumn key={`${digits.length}-${i}`} digit={Number(d)}/>
        : <span key={i}>{d}</span>)}
      {suffix}
    </span>
  );
}

// Smoothly tweens between values + flashes on change. Optional digit-roll mode for integer stats.
export default function AnimatedNumber({
  value, duration = 600, format = (v) => v, decimals = 0,
  digitRoll = false, className, style,
}) {
  const [display, setDisplay] = useState(value);
  const [flashKey, setFlashKey] = useState(0);
  const fromRef = useRef(value);
  const startRef = useRef(performance.now());
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setFlashKey((k) => k + 1);
      prevValueRef.current = value;
    }
    fromRef.current = display;
    startRef.current = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(decimals === 0 ? Math.round(v) : Number(v.toFixed(decimals)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  // First mount = no flare (avoid full-page sparkle on tab change). Only flare on real value changes.
  const flareCls = flashKey > 0 ? 'cy-num-flare' : '';

  if (digitRoll && Number.isFinite(value) && Math.abs(value) < 1e9 && decimals === 0) {
    return (
      <span key={flashKey} className={`${className || ''} ${flareCls}`} style={style}>
        <DigitRoll value={value}/>
      </span>
    );
  }

  return (
    <span key={flashKey} className={`${className || ''} ${flareCls}`} style={style}>
      {format(display)}
    </span>
  );
}
