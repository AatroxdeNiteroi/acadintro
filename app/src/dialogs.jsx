import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { X, AlertTriangle, Check, Info, Pin } from 'lucide-react';
import { sfx } from './sounds.js';

const DialogContext = createContext(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
}

let toastId = 0;

export function DialogProvider({ children }) {
  const [modal, setModal] = useState(null);   // { type, message, defaultValue, resolve, opts }
  const [toasts, setToasts] = useState([]);

  const confirm = useCallback((message, opts = {}) => {
    sfx.modal();
    return new Promise((resolve) => setModal({ type: 'confirm', message, opts, resolve }));
  }, []);
  const prompt = useCallback((message, defaultValue = '', opts = {}) => {
    sfx.modal();
    return new Promise((resolve) => setModal({ type: 'prompt', message, defaultValue, opts, resolve }));
  }, []);

  const toast = useCallback((message, kind = 'info') => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, kind, pinned: false }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id || x.pinned)), 3500);
    if (kind === 'success') sfx.success();
    else if (kind === 'error') sfx.error();
    else if (kind === 'warn') sfx.warn();
    else sfx.toast();
  }, []);

  const pinToast = useCallback((id) => {
    setToasts((ts) => ts.map((t) => t.id === id ? { ...t, pinned: !t.pinned } : t));
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const resolveModal = useCallback((value) => {
    if (!modal) return;
    modal.resolve(value);
    setModal(null);
  }, [modal]);

  // Esc closes modal
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') resolveModal(modal.type === 'confirm' ? false : null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, resolveModal]);

  return (
    <DialogContext.Provider value={{ confirm, prompt, toast }}>
      {children}
      {modal && <ModalRender modal={modal} onResolve={resolveModal} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} onPin={pinToast} />
    </DialogContext.Provider>
  );
}

function ModalRender({ modal, onResolve }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState(modal.defaultValue || '');

  useEffect(() => {
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const isConfirm = modal.type === 'confirm';
  const isDestructive = modal.opts?.destructive;
  const accent = isDestructive ? '#ff0055' : '#00d4ff';
  const okLabel = modal.opts?.okLabel || (isConfirm ? 'CONFIRMAR' : 'OK');
  const cancelLabel = modal.opts?.cancelLabel || 'CANCELAR';

  function handleOk() {
    onResolve(isConfirm ? true : value);
  }
  function handleCancel() {
    onResolve(isConfirm ? false : null);
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={handleCancel}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-[min(420px,92vw)] bg-gradient-to-b from-gray-950 to-black border-2 p-5 animate-[modalIn_0.2s_cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          borderColor: accent + '60',
          boxShadow: `0 0 40px ${accent}30, inset 0 0 20px ${accent}08`,
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        }}>
        {/* corner ticks */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: accent }}/>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: accent }}/>

        <div className="flex items-center gap-2 mb-3">
          {isDestructive
            ? <AlertTriangle size={14} style={{ color: accent }}/>
            : <Info size={14} style={{ color: accent }}/>}
          <div className="text-[10px] font-mono tracking-widest" style={{ color: accent }}>
            {isDestructive ? '// AÇÃO DESTRUTIVA //' : isConfirm ? '// CONFIRMAR //' : '// ENTRADA //'}
          </div>
        </div>

        <div className="text-sm text-cyan-100 font-mono leading-relaxed mb-4 whitespace-pre-line">
          {modal.message}
        </div>

        {!isConfirm && (
          <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleOk(); }}
            placeholder={modal.opts?.placeholder || ''}
            className="w-full bg-black border border-cyan-700/50 focus:border-cyan-400 px-3 py-2 text-sm font-mono text-cyan-100 outline-none mb-4"/>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleCancel}
            className="bg-black border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 py-2 text-[11px] font-mono tracking-widest transition">
            ✕ {cancelLabel}
          </button>
          <button onClick={handleOk} autoFocus={isConfirm}
            className="text-black py-2 text-[11px] font-mono font-bold tracking-widest transition"
            style={{
              background: `linear-gradient(90deg, ${accent}, ${isDestructive ? '#ff8800' : '#ff2eaa'})`,
              boxShadow: `0 0 12px ${accent}80`,
            }}>
            ▶ {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToastStack({ toasts, onDismiss, onPin }) {
  return (
    <div className="fixed bottom-24 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} onPin={() => onPin(t.id)}/>)}
    </div>
  );
}

function Toast({ toast, onDismiss, onPin }) {
  const colors = {
    info:    { c: '#00d4ff', icon: <Info size={14}/> },
    success: { c: '#00ff9f', icon: <Check size={14}/> },
    error:   { c: '#ff0055', icon: <AlertTriangle size={14}/> },
    warn:    { c: '#ffdd00', icon: <AlertTriangle size={14}/> },
  };
  const cfg = colors[toast.kind] || colors.info;
  return (
    <div className="pointer-events-auto bg-black/95 border-l-2 pl-3 pr-2 py-2 flex items-center gap-2 min-w-[260px] max-w-[340px] animate-[slideInRight_0.25s_cubic-bezier(0.2,0.8,0.2,1)]"
      style={{
        borderColor: cfg.c,
        boxShadow: `0 0 18px ${cfg.c}30, -2px 0 0 ${cfg.c}`,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      }}>
      <span style={{ color: cfg.c }}>{cfg.icon}</span>
      <div className="flex-1 text-[12px] font-mono text-cyan-100">{toast.message}</div>
      <button onClick={onPin} className={`hover:text-cyan-300 ${toast.pinned ? 'text-cyan-300' : 'text-gray-600'}`} title={toast.pinned ? 'Unpin' : 'Pin'} data-snd-click="0">
        <Pin size={11} style={{ transform: toast.pinned ? 'rotate(0deg)' : 'rotate(35deg)' }}/>
      </button>
      <button onClick={onDismiss} className="text-gray-500 hover:text-cyan-300" data-snd-click="0"><X size={12}/></button>
    </div>
  );
}
