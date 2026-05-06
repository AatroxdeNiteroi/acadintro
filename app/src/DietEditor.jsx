import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react';
import { getAvatar } from './avatar.js';

export const DEFAULT_MEALS = [
  { id: 'cafe',      nome: '🍳 Café',       horario: '07:00', kcalPct: 0.25,
    itens: ['3 ovos inteiros', '50g aveia + banana', '1 col. pasta amendoim', 'Café'] },
  { id: 'almoco',    nome: '🍗 Almoço',     horario: '12:30', kcalPct: 0.30,
    itens: ['180g frango/carne magra', '120g arroz integral', 'Feijão (1 concha)', 'Salada + azeite'] },
  { id: 'pretreino', nome: '🥤 Pré-treino', horario: '16:00', kcalPct: 0.20,
    itens: ['1 scoop whey', '1 banana', '40g aveia', 'Café'] },
  { id: 'jantar',    nome: '🍽 Jantar',     horario: '20:00', kcalPct: 0.25,
    itens: ['200g peixe ou frango', '150g batata-doce/arroz', 'Brócolis, abobrinha', 'Azeite extra virgem'] },
];

function newMealId() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

export default function DietEditor({ open, onClose, dieta, onSave }) {
  const [meals, setMeals] = useState(() => dieta && dieta.length ? structuredClone(dieta) : structuredClone(DEFAULT_MEALS));
  const avatar = getAvatar();

  // Reset internal state when reopening with different data
  useEffect(() => {
    if (open) setMeals(dieta && dieta.length ? structuredClone(dieta) : structuredClone(DEFAULT_MEALS));
  }, [open, dieta]);

  if (!open) return null;

  const totalPct = meals.reduce((a, m) => a + (Number(m.kcalPct) || 0), 0);
  const pctOff = Math.abs(totalPct - 1) > 0.005;

  function update(idx, patch) {
    setMeals(ms => ms.map((m, i) => i === idx ? { ...m, ...patch } : m));
  }
  function updateItem(mIdx, iIdx, val) {
    setMeals(ms => ms.map((m, i) =>
      i !== mIdx ? m : { ...m, itens: m.itens.map((it, j) => j === iIdx ? val : it) }
    ));
  }
  function addItem(mIdx) {
    setMeals(ms => ms.map((m, i) => i !== mIdx ? m : { ...m, itens: [...m.itens, ''] }));
  }
  function removeItem(mIdx, iIdx) {
    setMeals(ms => ms.map((m, i) =>
      i !== mIdx ? m : { ...m, itens: m.itens.filter((_, j) => j !== iIdx) }
    ));
  }
  function moveMeal(idx, dir) {
    const next = idx + dir;
    if (next < 0 || next >= meals.length) return;
    const out = [...meals];
    [out[idx], out[next]] = [out[next], out[idx]];
    setMeals(out);
  }
  function addMeal() {
    setMeals(ms => [
      ...ms,
      { id: newMealId(), nome: '🍴 Nova refeição', horario: '00:00', kcalPct: 0.10, itens: [] },
    ]);
  }
  function removeMeal(idx) {
    setMeals(ms => ms.filter((_, i) => i !== idx));
  }
  function normalizePct() {
    const sum = meals.reduce((a, m) => a + (Number(m.kcalPct) || 0), 0) || 1;
    setMeals(ms => ms.map(m => ({ ...m, kcalPct: (Number(m.kcalPct) || 0) / sum })));
  }
  function resetDefault() {
    setMeals(structuredClone(DEFAULT_MEALS));
  }
  function save() {
    onSave(meals);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm animate-[fadeIn_0.18s_ease-out] overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative max-w-[760px] mx-auto my-6 mx-3 sm:mx-auto bg-gradient-to-b from-gray-950 to-black border-2 p-5 sm:p-6"
        style={{
          borderColor: avatar.color + '70',
          boxShadow: `0 0 50px ${avatar.color}40`,
          clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
        }}>
        {/* corner ticks */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: avatar.color }}/>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: avatar.color }}/>

        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white" data-snd-click="0">
          <X size={16}/>
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2" style={{ background: avatar.color, boxShadow: `0 0 8px ${avatar.color}` }}/>
          <div className="text-[10px] font-mono tracking-widest" style={{ color: avatar.color }}>// EDITAR_DIETA</div>
        </div>
        <h2 className="text-xl font-bold tracking-wider mb-1" style={{ color: avatar.color, textShadow: `0 0 12px ${avatar.color}50`, fontFamily: 'Orbitron, monospace' }}>
          PROTOCOLO_NUTRICIONAL
        </h2>
        <p className="text-[11px] text-gray-400 font-mono mb-4">
          Personalize refeições, horários, itens e a porcentagem calórica de cada uma. Os totais de kcal/macros vêm do seu perfil.
        </p>

        {/* PCT total indicator */}
        <div className="mb-4 px-3 py-2 bg-black/50 border-l-2 flex items-center justify-between text-[11px] font-mono"
          style={{ borderColor: pctOff ? '#ffdd00' : '#3ddc84' }}>
          <span className="text-gray-400">SOMA DAS PORCENTAGENS:</span>
          <span style={{ color: pctOff ? '#ffdd00' : '#3ddc84' }}>
            {Math.round(totalPct * 100)}% {pctOff && <span className="ml-2 text-[10px]">⚠ deveria ser 100%</span>}
          </span>
          {pctOff && (
            <button onClick={normalizePct} className="ml-2 text-cyan-400 hover:text-cyan-300 text-[10px] underline" data-snd-click="0">
              normalizar
            </button>
          )}
        </div>

        <div className="space-y-3">
          {meals.map((m, idx) => (
            <div key={m.id} className="bg-black/50 border border-cyan-900/40 p-3">
              <div className="flex items-start gap-2 mb-3">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button onClick={() => moveMeal(idx, -1)} disabled={idx === 0} className="text-cyan-700 disabled:opacity-30 hover:text-cyan-400 px-1" data-snd-click="0">↑</button>
                  <button onClick={() => moveMeal(idx, +1)} disabled={idx === meals.length - 1} className="text-cyan-700 disabled:opacity-30 hover:text-cyan-400 px-1" data-snd-click="0">↓</button>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_90px_90px] gap-2">
                  <input type="text" value={m.nome} onChange={(e) => update(idx, { nome: e.target.value })}
                    placeholder="Nome (com emoji opcional)"
                    className="bg-black border border-cyan-700/40 focus:border-cyan-400 px-2 py-1.5 text-sm font-mono text-cyan-100 outline-none"/>
                  <input type="time" value={m.horario} onChange={(e) => update(idx, { horario: e.target.value })}
                    className="bg-black border border-cyan-700/40 focus:border-cyan-400 px-2 py-1.5 text-xs font-mono text-cyan-100 outline-none"/>
                  <div className="flex items-center gap-1 bg-black border border-cyan-700/40 px-2 py-1.5">
                    <input type="number" min="0" max="100" step="1"
                      value={Math.round((m.kcalPct || 0) * 100)}
                      onChange={(e) => update(idx, { kcalPct: Math.max(0, Math.min(100, Number(e.target.value))) / 100 })}
                      className="w-12 bg-transparent text-xs font-mono text-cyan-100 outline-none text-right"/>
                    <span className="text-xs font-mono text-cyan-700">%</span>
                  </div>
                </div>
                <button onClick={() => removeMeal(idx)} className="text-red-500 hover:text-red-400 p-1" data-snd-click="0" title="Remover refeição">
                  <Trash2 size={13}/>
                </button>
              </div>

              <div className="space-y-1 ml-7">
                <div className="text-[9px] font-mono text-cyan-700 tracking-widest mb-1">▸ ITENS</div>
                {m.itens.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center gap-1.5">
                    <span className="text-cyan-700 text-xs">▸</span>
                    <input type="text" value={item} onChange={(e) => updateItem(idx, iIdx, e.target.value)}
                      placeholder="ex: 200g batata-doce"
                      className="flex-1 bg-black border border-cyan-900/30 focus:border-cyan-500 px-2 py-1 text-[11px] font-mono text-gray-200 outline-none"/>
                    <button onClick={() => removeItem(idx, iIdx)} className="text-gray-600 hover:text-red-400 p-1" data-snd-click="0">
                      <X size={11}/>
                    </button>
                  </div>
                ))}
                <button onClick={() => addItem(idx)}
                  className="text-[10px] font-mono text-cyan-500 hover:text-cyan-300 mt-1 tracking-widest"
                  data-snd-click="0">
                  + ADICIONAR_ITEM
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addMeal}
          className="w-full mt-3 bg-black border border-dashed border-cyan-700 hover:border-cyan-400 text-cyan-400 py-3 font-mono text-xs tracking-widest cy-lift">
          <Plus size={12} className="inline mr-1"/> ADICIONAR_REFEIÇÃO
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mt-5 pt-4 border-t border-cyan-900/30">
          <button onClick={resetDefault}
            className="bg-black border border-yellow-700/50 hover:border-yellow-400 text-yellow-400 py-2.5 font-mono text-[11px] tracking-widest"
            data-snd-click="0">
            <RotateCcw size={11} className="inline mr-1"/> RESETAR_PADRÃO
          </button>
          <button onClick={onClose}
            className="bg-black border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 py-2.5 px-6 font-mono text-[11px] tracking-widest">
            ✕ CANCELAR
          </button>
          <button onClick={save}
            className="text-black py-2.5 px-6 font-mono text-[11px] font-bold tracking-widest cy-lift"
            style={{
              background: `linear-gradient(90deg, ${avatar.color}, #00d4ff)`,
              boxShadow: `0 0 16px ${avatar.color}80`,
            }}>
            ▣ SALVAR
          </button>
        </div>
      </div>
    </div>
  );
}
