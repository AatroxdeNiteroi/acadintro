import { useEffect } from 'react';

// Triggers handlers when keys are pressed; ignores while typing in inputs/textareas.
export function useKeyboardShortcuts(map) {
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const handler = map[e.key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map]);
}
