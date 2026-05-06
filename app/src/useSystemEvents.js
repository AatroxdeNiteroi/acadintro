import { useEffect, useMemo } from 'react';
import { eventPool } from './avatar.js';

// Fires a flavor toast every 45-110s. Feels like a live system breathing in the background.
// The bound avatar's flavor lines get 3× weight so its references trickle in more often.
export function useSystemEvents(toast, avatarNs = 'ichigo') {
  const pool = useMemo(() => eventPool(avatarNs), [avatarNs]);

  useEffect(() => {
    let alive = true;
    function schedule() {
      const delay = 45000 + Math.random() * 65000;
      setTimeout(() => {
        if (!alive) return;
        const e = pool[Math.floor(Math.random() * pool.length)];
        toast(`// ${e.msg}`, e.kind);
        schedule();
      }, delay);
    }
    schedule();
    return () => { alive = false; };
  }, [toast, pool]);
}
