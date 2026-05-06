import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dumbbell, Apple, User, BarChart3, Plus, Trash2, Play, Pause, RotateCcw, Save, X, Flame, Target, TrendingUp, TrendingDown, Activity, Zap, ChevronRight, Calendar, Home, Sparkles, BookOpen, Edit2, Copy, ArrowLeft, Info, HelpCircle, Wand2, Loader2, Check, Volume2, VolumeX, Settings as SettingsIcon } from 'lucide-react';
import { storageGet, storageSet } from './storage.js';
import HoloBody3D, { highlightsFromForca, highlightsFromVolume, HOLO_TO_ARTIFACT } from './HoloBody3D.jsx';
import { DialogProvider, useDialog } from './dialogs.jsx';
import AnimatedNumber from './AnimatedNumber.jsx';
import Clock from './Clock.jsx';
import BootScreen from './BootScreen.jsx';
import Ambient from './Ambient.jsx';
import Cursor from './Cursor.jsx';
import ShortcutOverlay from './ShortcutOverlay.jsx';
import FAB from './FAB.jsx';
import Features from './Features.jsx';
import Settings, { settingsApi } from './Settings.jsx';
import StreakHeatmap from './StreakHeatmap.jsx';
import ContextMenu from './ContextMenu.jsx';
import TelemetryStream from './TelemetryStream.jsx';
import DietEditor, { DEFAULT_MEALS } from './DietEditor.jsx';
import { CyberLine, CyberBar } from './themedCharts.jsx';
import { useKeyboardShortcuts } from './useKeyboardShortcuts.js';
import { useSystemEvents } from './useSystemEvents.js';
import { sfx, personaSfx, attachUiSounds, isSoundEnabled, setSoundEnabled, isBedEnabled, setBedEnabled, maybeRestoreBed } from './sounds.js';
import { getAvatar, emptyQuote, flavor, nivelLabel } from './avatar.js';
import { useTilt } from './useTilt.js';
import { gsap, ScrollTrigger, useGSAP } from './gsapSetup.js';
import { useCursorGlow, useMagnetic } from './useGsapEffects.js';
import HandoffCurtain from './HandoffCurtain.jsx';

// ═══════════════════════════════════════════════════════════════
// STRENGTH STANDARDS
// ═══════════════════════════════════════════════════════════════
const STRENGTH_STANDARDS = {
  'Supino reto': { muscles: ['chest_mid', 'triceps', 'delts_front'], ratios: { iniciante: 0.5, novato: 0.75, intermediario: 1.0, avancado: 1.5, elite: 2.0 } },
  'Supino inclinado': { muscles: ['chest_upper', 'delts_front', 'triceps'], ratios: { iniciante: 0.4, novato: 0.6, intermediario: 0.85, avancado: 1.25, elite: 1.7 } },
  'Supino declinado': { muscles: ['chest_lower', 'triceps'], ratios: { iniciante: 0.5, novato: 0.75, intermediario: 1.05, avancado: 1.5, elite: 2.0 } },
  'Crucifixo': { muscles: ['chest_mid'], ratios: { iniciante: 0.15, novato: 0.25, intermediario: 0.4, avancado: 0.6, elite: 0.85 } },
  'Crossover': { muscles: ['chest_lower', 'chest_mid'], ratios: { iniciante: 0.15, novato: 0.25, intermediario: 0.4, avancado: 0.55, elite: 0.75 } },
  'Levantamento terra': { muscles: ['lats', 'glutes', 'hamstrings', 'traps_lower', 'erectors'], ratios: { iniciante: 1.0, novato: 1.25, intermediario: 1.75, avancado: 2.5, elite: 3.0 } },
  'Terra romeno': { muscles: ['hamstrings', 'glutes', 'erectors'], ratios: { iniciante: 0.6, novato: 0.9, intermediario: 1.3, avancado: 1.8, elite: 2.3 } },
  'Remada curvada': { muscles: ['lats', 'rhomboids', 'biceps', 'rear_delts'], ratios: { iniciante: 0.5, novato: 0.75, intermediario: 1.0, avancado: 1.4, elite: 1.85 } },
  'Remada cavalinho': { muscles: ['lats', 'rhomboids', 'biceps'], ratios: { iniciante: 0.4, novato: 0.65, intermediario: 0.9, avancado: 1.25, elite: 1.65 } },
  'Remada baixa': { muscles: ['lats', 'rhomboids', 'biceps'], ratios: { iniciante: 0.4, novato: 0.6, intermediario: 0.85, avancado: 1.2, elite: 1.6 } },
  'Barra fixa': { muscles: ['lats', 'biceps', 'rhomboids'], ratios: { iniciante: 0.0, novato: 0.1, intermediario: 0.25, avancado: 0.5, elite: 0.85 } },
  'Pulley costas': { muscles: ['lats', 'biceps'], ratios: { iniciante: 0.5, novato: 0.7, intermediario: 0.95, avancado: 1.3, elite: 1.7 } },
  'Pull-over': { muscles: ['lats', 'chest_upper'], ratios: { iniciante: 0.2, novato: 0.3, intermediario: 0.45, avancado: 0.65, elite: 0.9 } },
  'Agachamento': { muscles: ['quads', 'glutes', 'hamstrings'], ratios: { iniciante: 0.75, novato: 1.0, intermediario: 1.5, avancado: 2.0, elite: 2.5 } },
  'Agachamento frontal': { muscles: ['quads', 'glutes'], ratios: { iniciante: 0.5, novato: 0.75, intermediario: 1.1, avancado: 1.5, elite: 2.0 } },
  'Leg press': { muscles: ['quads', 'glutes'], ratios: { iniciante: 1.5, novato: 2.0, intermediario: 2.75, avancado: 3.5, elite: 4.5 } },
  'Stiff': { muscles: ['hamstrings', 'glutes'], ratios: { iniciante: 0.6, novato: 0.85, intermediario: 1.2, avancado: 1.65, elite: 2.1 } },
  'Cadeira extensora': { muscles: ['quads'], ratios: { iniciante: 0.5, novato: 0.75, intermediario: 1.0, avancado: 1.35, elite: 1.7 } },
  'Mesa flexora': { muscles: ['hamstrings'], ratios: { iniciante: 0.4, novato: 0.6, intermediario: 0.85, avancado: 1.15, elite: 1.5 } },
  'Cadeira adutora': { muscles: ['adductors'], ratios: { iniciante: 0.3, novato: 0.5, intermediario: 0.75, avancado: 1.0, elite: 1.3 } },
  'Cadeira abdutora': { muscles: ['glutes', 'abductors'], ratios: { iniciante: 0.3, novato: 0.5, intermediario: 0.75, avancado: 1.0, elite: 1.3 } },
  'Avanço': { muscles: ['quads', 'glutes'], ratios: { iniciante: 0.2, novato: 0.4, intermediario: 0.6, avancado: 0.85, elite: 1.1 } },
  'Hip thrust': { muscles: ['glutes', 'hamstrings'], ratios: { iniciante: 0.75, novato: 1.1, intermediario: 1.6, avancado: 2.2, elite: 2.8 } },
  'Panturrilha em pé': { muscles: ['gastro'], ratios: { iniciante: 0.75, novato: 1.0, intermediario: 1.4, avancado: 1.9, elite: 2.5 } },
  'Panturrilha sentado': { muscles: ['soleus'], ratios: { iniciante: 0.5, novato: 0.75, intermediario: 1.0, avancado: 1.35, elite: 1.75 } },
  'Desenvolvimento militar': { muscles: ['delts_front', 'delts_mid', 'triceps'], ratios: { iniciante: 0.35, novato: 0.55, intermediario: 0.8, avancado: 1.1, elite: 1.5 } },
  'Desenvolvimento halteres': { muscles: ['delts_front', 'delts_mid', 'triceps'], ratios: { iniciante: 0.15, novato: 0.25, intermediario: 0.4, avancado: 0.55, elite: 0.75 } },
  'Elevação lateral': { muscles: ['delts_mid'], ratios: { iniciante: 0.1, novato: 0.18, intermediario: 0.28, avancado: 0.4, elite: 0.55 } },
  'Elevação frontal': { muscles: ['delts_front'], ratios: { iniciante: 0.1, novato: 0.18, intermediario: 0.28, avancado: 0.4, elite: 0.55 } },
  'Crucifixo invertido': { muscles: ['rear_delts', 'rhomboids'], ratios: { iniciante: 0.1, novato: 0.18, intermediario: 0.28, avancado: 0.4, elite: 0.55 } },
  'Encolhimento': { muscles: ['traps_upper'], ratios: { iniciante: 0.5, novato: 0.8, intermediario: 1.15, avancado: 1.6, elite: 2.1 } },
  'Rosca direta': { muscles: ['biceps'], ratios: { iniciante: 0.2, novato: 0.35, intermediario: 0.55, avancado: 0.8, elite: 1.05 } },
  'Rosca martelo': { muscles: ['biceps', 'forearms'], ratios: { iniciante: 0.15, novato: 0.25, intermediario: 0.4, avancado: 0.6, elite: 0.85 } },
  'Rosca scott': { muscles: ['biceps'], ratios: { iniciante: 0.15, novato: 0.25, intermediario: 0.4, avancado: 0.6, elite: 0.85 } },
  'Rosca concentrada': { muscles: ['biceps'], ratios: { iniciante: 0.1, novato: 0.18, intermediario: 0.3, avancado: 0.45, elite: 0.65 } },
  'Tríceps testa': { muscles: ['triceps'], ratios: { iniciante: 0.25, novato: 0.4, intermediario: 0.6, avancado: 0.85, elite: 1.1 } },
  'Tríceps corda': { muscles: ['triceps'], ratios: { iniciante: 0.2, novato: 0.35, intermediario: 0.5, avancado: 0.7, elite: 0.95 } },
  'Tríceps francês': { muscles: ['triceps'], ratios: { iniciante: 0.15, novato: 0.25, intermediario: 0.4, avancado: 0.6, elite: 0.85 } },
  'Mergulho': { muscles: ['triceps', 'chest_lower'], ratios: { iniciante: 0.0, novato: 0.0, intermediario: 0.15, avancado: 0.4, elite: 0.7 } },
  'Rosca punho': { muscles: ['forearms'], ratios: { iniciante: 0.1, novato: 0.18, intermediario: 0.28, avancado: 0.4, elite: 0.55 } },
  'Abdominal supra': { muscles: ['abs_upper'], ratios: { iniciante: 0.0, novato: 0.1, intermediario: 0.25, avancado: 0.45, elite: 0.7 } },
  'Abdominal infra': { muscles: ['abs_lower'], ratios: { iniciante: 0.0, novato: 0.0, intermediario: 0.0, avancado: 0.0, elite: 0.0 } },
  'Prancha': { muscles: ['abs_upper', 'abs_lower'], ratios: { iniciante: 0.0, novato: 0.0, intermediario: 0.0, avancado: 0.0, elite: 0.0 } },
  'Oblíquos': { muscles: ['obliques'], ratios: { iniciante: 0.0, novato: 0.05, intermediario: 0.15, avancado: 0.3, elite: 0.5 } },
};

const MUSCLE_LABELS = {
  chest_upper: 'Peitoral superior', chest_mid: 'Peitoral médio', chest_lower: 'Peitoral inferior',
  lats: 'Dorsal (latíssimo)', rhomboids: 'Romboides', traps_upper: 'Trapézio superior',
  traps_lower: 'Trapézio médio/inferior', erectors: 'Eretores da espinha',
  delts_front: 'Deltoide anterior', delts_mid: 'Deltoide medial', rear_delts: 'Deltoide posterior',
  biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraço',
  abs_upper: 'Reto abdominal sup.', abs_lower: 'Reto abdominal inf.', obliques: 'Oblíquos',
  quads: 'Quadríceps', hamstrings: 'Posterior de coxa', glutes: 'Glúteos',
  adductors: 'Adutores', abductors: 'Abdutores',
  gastro: 'Gastrocnêmio', soleus: 'Sóleo',
};

const NIVEL_COLORS = {
  iniciante: '#ff0055', novato: '#ff8800', intermediario: '#ffdd00',
  avancado: '#00ff9f', elite: '#00d4ff',
};
const NIVEL_LABELS = {
  iniciante: 'Iniciante', novato: 'Novato', intermediario: 'Intermediário',
  avancado: 'Avançado', elite: 'Elite',
};
const NIVEL_LABELS_SHORT = {
  iniciante: 'INIT', novato: 'NOV', intermediario: 'INT', avancado: 'ADV', elite: 'ELITE',
};

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function classificarForca(exercicio, pesoLevantado, pesoCorporal, sexo) {
  const std = STRENGTH_STANDARDS[exercicio];
  if (!std || !pesoLevantado || !pesoCorporal) return null;
  const ajuste = sexo === 'F' ? 0.7 : 1.0;
  const ratio = pesoLevantado / pesoCorporal;
  const r = std.ratios;
  if (ratio >= r.elite * ajuste) return 'elite';
  if (ratio >= r.avancado * ajuste) return 'avancado';
  if (ratio >= r.intermediario * ajuste) return 'intermediario';
  if (ratio >= r.novato * ajuste) return 'novato';
  return 'iniciante';
}
function calcular1RM(peso, reps) { return reps === 1 ? peso : Math.round(peso * (1 + reps / 30)); }
function calcularTMB(peso, altura, idade, sexo) {
  if (sexo === 'F') return 10 * peso + 6.25 * altura - 5 * idade - 161;
  return 10 * peso + 6.25 * altura - 5 * idade + 5;
}
function calcularGastoTotal(tmb, fa) { return Math.round(tmb * fa); }
function calcularMacros(kcal, peso, obj) {
  let pkg, gp;
  if (obj === 'cutting') { pkg = 2.4; gp = 0.25; }
  else if (obj === 'bulking') { pkg = 2.0; gp = 0.25; }
  else if (obj === 'forca') { pkg = 2.0; gp = 0.30; }
  else { pkg = 1.8; gp = 0.30; }
  const proteina = Math.round(peso * pkg);
  const gordura = Math.round((kcal * gp) / 9);
  const carbo = Math.round((kcal - (proteina * 4) - (gordura * 9)) / 4);
  return { proteina, gordura, carbo };
}
function volumeSerie(s) { return Number(s.peso || 0) * Number(s.reps || 0); }
function volumeExercicio(ex) { return ex.series.reduce((a, s) => a + volumeSerie(s), 0); }
function volumeSessao(s) { return s.exercicios.reduce((a, ex) => a + volumeExercicio(ex), 0); }
function dataIso(d) { return new Date(d).toISOString().slice(0, 10); }
function diaDaSemana(d) { return new Date(d).getDay(); }
function uuid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }
function parseRepsMid(reps) {
  if (!reps) return 8;
  const m = String(reps).match(/(\d+)\s*-\s*(\d+)/);
  if (m) return (Number(m[1]) + Number(m[2])) / 2;
  const single = String(reps).match(/\d+/);
  if (single) return Number(single[0]);
  return 8;
}

// ═══════════════════════════════════════════════════════════════
// API CLAUDE — via Vite dev proxy at /api/anthropic
// ═══════════════════════════════════════════════════════════════
async function gerarTreinoIA(prompt, perfil) {
  const exerciciosDisponiveis = Object.keys(STRENGTH_STANDARDS).join(', ');
  const promptCompleto = `Você é um personal trainer especialista. Crie um plano de treino baseado no pedido do usuário.

PERFIL: ${perfil.sexo === 'M' ? 'Homem' : 'Mulher'}, ${perfil.idade} anos, ${perfil.peso}kg, ${perfil.altura}cm, objetivo: ${perfil.objetivo}.

PEDIDO: ${prompt}

EXERCÍCIOS DISPONÍVEIS (use APENAS estes nomes exatos): ${exerciciosDisponiveis}

Responda APENAS com JSON válido, sem markdown, sem texto antes/depois. Formato:
{
  "nome": "Nome curto do plano (ex: 'Push Pesado')",
  "descricao": "1 frase descrevendo o foco",
  "duracao_estimada_min": 60,
  "exercicios": [
    {"nome": "Supino reto", "series": 4, "reps": "6-8", "descanso_seg": 120, "obs": "explicação curta"}
  ]
}

REGRAS:
- 5 a 8 exercícios
- Comece com compostos pesados, termine com isoladores
- Reps em formato "6-8" ou "10-12" ou "AMRAP"
- Descanso 60s pra isoladores, 120-180s pra compostos
- Use APENAS exercícios da lista acima`;

  const response = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: promptCompleto }],
    }),
  });
  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    throw new Error('API ' + response.status + (txt ? ': ' + txt.slice(0, 200) : ''));
  }
  const data = await response.json();
  let texto = '';
  if (data.content) for (const b of data.content) if (b.type === 'text') texto += b.text;
  let limpo = texto.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const ini = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  if (ini >= 0 && fim > ini) limpo = limpo.substring(ini, fim + 1);
  return JSON.parse(limpo);
}

function gerarPlanoGenerico(tipo, perfil) {
  const planos = {
    push: {
      nome: 'Push (Peito/Ombro/Tríceps)',
      descricao: 'Foco em movimentos de empurrar',
      duracao_estimada_min: 60,
      exercicios: [
        { nome: 'Supino reto', series: 4, reps: '6-8', descanso_seg: 150, obs: 'Composto principal' },
        { nome: 'Supino inclinado', series: 3, reps: '8-10', descanso_seg: 120, obs: 'Foco em peitoral superior' },
        { nome: 'Desenvolvimento halteres', series: 3, reps: '8-12', descanso_seg: 90, obs: 'Ombros' },
        { nome: 'Elevação lateral', series: 3, reps: '12-15', descanso_seg: 60, obs: 'Deltoide medial' },
        { nome: 'Tríceps corda', series: 3, reps: '10-12', descanso_seg: 60, obs: 'Tríceps' },
        { nome: 'Tríceps testa', series: 3, reps: '10-12', descanso_seg: 75, obs: 'Cabeça longa' },
      ],
    },
    pull: {
      nome: 'Pull (Costas/Bíceps)',
      descricao: 'Foco em movimentos de puxar',
      duracao_estimada_min: 60,
      exercicios: [
        { nome: 'Barra fixa', series: 4, reps: '6-10', descanso_seg: 150, obs: 'Composto principal' },
        { nome: 'Remada curvada', series: 4, reps: '8-10', descanso_seg: 120, obs: 'Espessura' },
        { nome: 'Pulley costas', series: 3, reps: '10-12', descanso_seg: 90, obs: 'Largura' },
        { nome: 'Crucifixo invertido', series: 3, reps: '12-15', descanso_seg: 60, obs: 'Deltoide posterior' },
        { nome: 'Rosca direta', series: 3, reps: '8-12', descanso_seg: 75, obs: 'Bíceps' },
        { nome: 'Rosca martelo', series: 3, reps: '10-12', descanso_seg: 60, obs: 'Braquial + antebraço' },
      ],
    },
    legs: {
      nome: 'Legs (Pernas)',
      descricao: 'Treino completo de membros inferiores',
      duracao_estimada_min: 70,
      exercicios: [
        { nome: 'Agachamento', series: 4, reps: '5-8', descanso_seg: 180, obs: 'Composto rei' },
        { nome: 'Leg press', series: 4, reps: '10-12', descanso_seg: 120, obs: 'Volume' },
        { nome: 'Stiff', series: 3, reps: '8-10', descanso_seg: 120, obs: 'Posterior + glúteo' },
        { nome: 'Cadeira extensora', series: 3, reps: '12-15', descanso_seg: 60, obs: 'Quadríceps isolado' },
        { nome: 'Mesa flexora', series: 3, reps: '12-15', descanso_seg: 60, obs: 'Posterior isolado' },
        { nome: 'Panturrilha em pé', series: 4, reps: '12-15', descanso_seg: 60, obs: 'Gastrocnêmio' },
      ],
    },
    fullbody: {
      nome: 'Full Body',
      descricao: 'Trabalha todo o corpo numa sessão',
      duracao_estimada_min: 75,
      exercicios: [
        { nome: 'Agachamento', series: 4, reps: '6-10', descanso_seg: 150, obs: 'Pernas' },
        { nome: 'Supino reto', series: 4, reps: '6-10', descanso_seg: 150, obs: 'Peito' },
        { nome: 'Remada curvada', series: 3, reps: '8-10', descanso_seg: 120, obs: 'Costas' },
        { nome: 'Desenvolvimento militar', series: 3, reps: '8-10', descanso_seg: 90, obs: 'Ombros' },
        { nome: 'Rosca direta', series: 3, reps: '10-12', descanso_seg: 60, obs: 'Bíceps' },
        { nome: 'Tríceps corda', series: 3, reps: '10-12', descanso_seg: 60, obs: 'Tríceps' },
      ],
    },
  };
  return planos[tipo];
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function GymApp() {
  // intro_seen lives in localStorage so closing the tab doesn't replay
  const [booted, setBooted] = useState(() => {
    try { return localStorage.getItem('intro_seen') === '1' || sessionStorage.getItem('booted') === '1'; }
    catch { return false; }
  });
  useEffect(() => {
    if (booted) {
      try { sessionStorage.setItem('booted', '1'); localStorage.setItem('intro_seen', '1'); } catch {}
    }
  }, [booted]);
  useEffect(() => { attachUiSounds(); }, []);

  // Re-render when settings change so toggles take effect
  const [settingsTick, setSettingsTick] = useState(0);
  useEffect(() => {
    const onChange = () => setSettingsTick(t => t + 1);
    window.addEventListener('settings-changed', onChange);
    return () => window.removeEventListener('settings-changed', onChange);
  }, []);
  const showCursor    = settingsApi.showCursor();
  const showTelemetry = settingsApi.showTelemetry();
  const perfMode      = settingsApi.perfMode();

  return (
    <DialogProvider>
      <HandoffCurtain/>
      {showCursor && !perfMode && <Cursor/>}
      <Ambient/>
      <ShortcutOverlay/>
      <ContextMenu/>
      {showTelemetry && !perfMode && <TelemetryStream/>}
      {!booted && <BootScreen onDone={() => { setBooted(true); sfx.start(); }}/>}
      <GymAppInner/>
    </DialogProvider>
  );
}

function GymAppInner() {
  const [tab, setTabRaw] = useState('inicio');
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dialog = useDialog();
  const setTab = (t) => { sfx.tab(); setTabRaw(t); };
  const avatar = useMemo(() => getAvatar(), []);
  useSystemEvents(dialog.toast, avatar.ns);
  const [perfil, setPerfil] = useState({
    nome: '', sexo: 'M', peso: 75, altura: 175, idade: 25,
    objetivo: 'hipertrofia', atividade: 1.55,
  });
  const [historico, setHistorico] = useState([]);
  const [pesosCorporais, setPesosCorporais] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [agenda, setAgenda] = useState({});
  const [dieta, setDieta] = useState(null); // null = use defaults
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await storageGet('gym_perfil', null);
      const h = await storageGet('gym_historico', []);
      const pc = await storageGet('gym_pesos', []);
      const pl = await storageGet('gym_planos', []);
      const ag = await storageGet('gym_agenda', {});
      const di = await storageGet('gym_dieta', null);
      if (p) setPerfil(p);
      setHistorico(h);
      setPesosCorporais(pc);
      setPlanos(pl);
      setAgenda(ag);
      setDieta(di);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (!loading) storageSet('gym_perfil', perfil); }, [perfil, loading]);
  useEffect(() => { if (!loading) storageSet('gym_historico', historico); }, [historico, loading]);
  useEffect(() => { if (!loading) storageSet('gym_pesos', pesosCorporais); }, [pesosCorporais, loading]);
  useEffect(() => { if (!loading) storageSet('gym_planos', planos); }, [planos, loading]);
  useEffect(() => { if (!loading) storageSet('gym_agenda', agenda); }, [agenda, loading]);
  useEffect(() => { if (!loading) storageSet('gym_dieta', dieta); }, [dieta, loading]);

  const shortcuts = useMemo(() => ({
    '1': () => setTab('inicio'),
    '2': () => setTab('treinos'),
    '3': () => setTab('agenda'),
    '4': () => setTab('corpo'),
    '5': () => setTab('perfil'),
  }), []);
  useKeyboardShortcuts(shortcuts);

  const forcasPorMusculo = useMemo(() => {
    const melhor = {};
    historico.forEach(s => s.exercicios.forEach(ex => ex.series.forEach(sr => {
      if (sr.peso > 0 && sr.reps > 0) {
        const o = calcular1RM(sr.peso, sr.reps);
        if (!melhor[ex.nome] || o > melhor[ex.nome]) melhor[ex.nome] = o;
      }
    })));
    const f = {};
    Object.entries(melhor).forEach(([nome, peso]) => {
      const std = STRENGTH_STANDARDS[nome];
      if (!std) return;
      const nivel = classificarForca(nome, peso, perfil.peso, perfil.sexo);
      if (!nivel) return;
      const ord = { iniciante: 1, novato: 2, intermediario: 3, avancado: 4, elite: 5 };
      std.muscles.forEach(m => {
        if (!f[m] || ord[nivel] > ord[f[m]]) f[m] = nivel;
      });
    });
    return f;
  }, [historico, perfil.peso, perfil.sexo]);

  const volumeSemanalPorMusculo = useMemo(() => {
    const sem = 7 * 24 * 60 * 60 * 1000;
    const agora = Date.now();
    const v = {};
    historico.filter(s => agora - new Date(s.data).getTime() < sem).forEach(s => {
      s.exercicios.forEach(ex => {
        const std = STRENGTH_STANDARDS[ex.nome];
        if (!std) return;
        const vol = volumeExercicio(ex);
        std.muscles.forEach(m => { v[m] = (v[m] || 0) + vol; });
      });
    });
    return v;
  }, [historico]);

  const mainRef = useRef(null);
  const gridRef = useRef(null);

  // Tab transition: page-level fade/blur in, then per-card reveals via ScrollTrigger
  useGSAP(() => {
    const root = mainRef.current;
    if (!root) return;
    gsap.fromTo(root,
      { opacity: 0, y: 14, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power3.out' });

    // Pick up explicit [data-anim] markers and every Card (uses bg-gray-950/80) at any depth
    const set = new Set();
    root.querySelectorAll('[data-anim]').forEach((el) => set.add(el));
    root.querySelectorAll('[class*="bg-gray-950"]').forEach((el) => set.add(el));
    // Filter out cards nested inside another card so reveals don't double-animate children
    const cards = Array.from(set).filter((el) => {
      let p = el.parentElement;
      while (p && p !== root) {
        if (set.has(p)) return false;
        p = p.parentElement;
      }
      return true;
    });
    if (!cards.length) return;
    gsap.set(cards, { opacity: 0, y: 22, scale: 0.985, filter: 'blur(4px)' });

    // Stagger reveal anything visible at mount; ScrollTrigger.batch handles below-fold
    const triggers = ScrollTrigger.batch(cards, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
          duration: 0.55, stagger: 0.07, ease: 'power3.out',
          clearProps: 'filter',
          overwrite: true,
        }),
    });

    // Refresh once layout settles (fonts, async data)
    const t = setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => {
      clearTimeout(t);
      triggers.forEach((tr) => tr.kill());
    };
  }, { scope: mainRef, dependencies: [tab, loading, sessaoAtiva], revertOnUpdate: true });

  // Subtle parallax on the grid background as the page scrolls
  useGSAP(() => {
    const el = gridRef.current;
    if (!el) return;
    gsap.to(el, {
      backgroundPosition: '40px 80px',
      ease: 'none',
      scrollTrigger: {
        trigger: document.documentElement,
        start: 0,
        end: 'max',
        scrub: 0.8,
      },
    });
  }, { scope: gridRef });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 font-mono text-xs animate-pulse">// INICIALIZANDO //</div>
      </div>
    );
  }

  if (sessaoAtiva) {
    return (
      <ExecutarTreino
        sessao={sessaoAtiva}
        setSessao={setSessaoAtiva}
        historico={historico}
        setHistorico={setHistorico}
        onCompleto={() => setSessaoAtiva(null)}
      />
    );
  }

  return (
    <div className="relative min-h-screen text-cyan-50 pb-24">
      <div ref={gridRef} className="fixed inset-0 cy-grid-bg z-[1] pointer-events-none" style={{
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }}/>
      <div className="fixed inset-0 pointer-events-none z-[7]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,212,255,0.025) 0px, rgba(0,212,255,0.025) 1px, transparent 1px, transparent 3px)',
      }}/>

      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-cyan-500/30">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-widest cy-glitch cursor-default" style={{
              background: 'linear-gradient(90deg, #00d4ff, #ff2eaa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontFamily: 'monospace',
            }}>NEURAL.GYM</h1>
            <p className="hidden sm:block text-[10px] text-cyan-400/70 font-mono tracking-wider truncate">
              {'> '}{perfil.nome || 'USER'} :: {perfil.peso}kg :: {historico.length} sessões
            </p>
            <p className="text-[9px] font-mono tracking-wider truncate" style={{ color: avatar.color, textShadow: `0 0 6px ${avatar.color}80` }}>
              ⌬ <span className="opacity-90">{avatar.ns}</span><span className="opacity-50">.</span><span className="font-bold">{avatar.fn}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Clock/>
            <button onClick={() => setFeaturesOpen(true)} data-snd-click="0"
              className="hidden sm:inline-block px-2 py-1 border text-[9px] font-mono tracking-widest hover:brightness-125 transition cy-lift"
              style={{ borderColor: avatar.color + '70', color: avatar.color, background: avatar.color + '10' }}
              title="Ver capacidades">
              <Sparkles size={10} className="inline mr-1"/> FEATURES
            </button>
            <button onClick={() => setSettingsOpen(true)} data-snd-click="0"
              className="p-1.5 border border-gray-700 hover:border-cyan-400 text-gray-500 hover:text-cyan-300 transition"
              title="Settings">
              <SettingsIcon size={12}/>
            </button>
          </div>
        </div>
      </header>

      <main ref={mainRef} key={tab} className="max-w-4xl mx-auto px-4 py-4">
        {tab === 'inicio' && <AbaInicio perfil={perfil} historico={historico} planos={planos} agenda={agenda} setSessaoAtiva={setSessaoAtiva} setTab={setTab}/>}
        {tab === 'treinos' && <AbaTreinos planos={planos} setPlanos={setPlanos} historico={historico} perfil={perfil} setSessaoAtiva={setSessaoAtiva}/>}
        {tab === 'agenda' && <AbaAgenda agenda={agenda} setAgenda={setAgenda} planos={planos} historico={historico} setSessaoAtiva={setSessaoAtiva}/>}
        {tab === 'corpo' && <AbaCorpo forcas={forcasPorMusculo} volumeSemanal={volumeSemanalPorMusculo} historico={historico} perfil={perfil}/>}
        {tab === 'perfil' && <AbaPerfil perfil={perfil} setPerfil={setPerfil} historico={historico} setHistorico={setHistorico} pesosCorporais={pesosCorporais} setPesosCorporais={setPesosCorporais} planos={planos} dieta={dieta} setDieta={setDieta}/>}
      </main>

      <FAB color={avatar.color}
        onStart={async () => {
          const nome = await dialog.prompt('Nome do treino livre:', '', { placeholder: 'ex: Empurrar livre' });
          if (!nome) return;
          setSessaoAtiva({ data: new Date().toISOString(), treino: nome, exercicios: [] });
        }}/>

      <Features open={featuresOpen} onClose={() => setFeaturesOpen(false)}/>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)}/>

      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-cyan-500/30 z-40">
        <div className="max-w-4xl mx-auto grid grid-cols-5">
          <TabButton hotkey="1" icon={<Home size={18}/>} label="INÍCIO" active={tab==='inicio'} onClick={()=>setTab('inicio')}/>
          <TabButton hotkey="2" icon={<Dumbbell size={18}/>} label="TREINOS" active={tab==='treinos'} onClick={()=>setTab('treinos')}/>
          <TabButton hotkey="3" icon={<Calendar size={18}/>} label="AGENDA" active={tab==='agenda'} onClick={()=>setTab('agenda')}/>
          <TabButton hotkey="4" icon={<User size={18}/>} label="CORPO" active={tab==='corpo'} onClick={()=>setTab('corpo')}/>
          <TabButton hotkey="5" icon={<Target size={18}/>} label="PERFIL" active={tab==='perfil'} onClick={()=>setTab('perfil')}/>
        </div>
      </nav>
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(() => isSoundEnabled());
  const [bed, setBed] = useState(() => isBedEnabled());
  useEffect(() => { maybeRestoreBed(); }, []);
  function toggle() {
    const next = !on;
    setSoundEnabled(next);
    setOn(next);
    if (next) sfx.ping();
  }
  function toggleBed() {
    const next = !bed;
    setBedEnabled(next);
    setBed(next);
  }
  return (
    <div className="flex gap-1">
      <button onClick={toggle} data-snd-click="0" data-snd-hover="0"
        className={`p-1.5 border ${on ? 'border-cyan-500/50 text-cyan-300 bg-cyan-500/10' : 'border-gray-700 text-gray-500'} hover:border-cyan-400 transition`}
        title={on ? 'Desativar sons' : 'Ativar sons'}>
        {on ? <Volume2 size={12}/> : <VolumeX size={12}/>}
      </button>
      <button onClick={toggleBed} data-snd-click="0" data-snd-hover="0"
        className={`px-1.5 py-1 border text-[8px] font-mono tracking-widest ${bed ? 'border-pink-500/50 text-pink-300 bg-pink-500/10' : 'border-gray-700 text-gray-500'} hover:border-pink-400 transition`}
        title={bed ? 'Desativar pad ambiente' : 'Ativar pad ambiente'}>
        BED
      </button>
    </div>
  );
}

function TabButton({ icon, label, active, onClick, hotkey }) {
  return (
    <button onClick={onClick}
      className={`py-3 flex flex-col items-center gap-1 transition relative group ${active ? 'text-cyan-400' : 'text-gray-600 hover:text-cyan-600'}`}>
      {active && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-pink-500" style={{ boxShadow: '0 0 12px #00d4ff' }}/>}
      {hotkey && (
        <span className={`hidden md:block absolute top-1 right-2 text-[8px] font-mono leading-none px-1 py-0.5 border ${active ? 'border-cyan-400/60 text-cyan-300' : 'border-gray-700 text-gray-600'}`}>{hotkey}</span>
      )}
      {icon}
      <span className="text-[8px] sm:text-[9px] font-mono tracking-widest">{label}</span>
    </button>
  );
}

const Card = React.forwardRef(function Card({ children, className = '', glow = 'cyan', style, ...rest }, ref) {
  const colors = {
    cyan: 'shadow-[0_0_20px_rgba(0,212,255,0.12)] border-cyan-500/30',
    pink: 'shadow-[0_0_20px_rgba(255,46,170,0.12)] border-pink-500/30',
    green: 'shadow-[0_0_20px_rgba(0,255,159,0.12)] border-emerald-500/30',
    yellow: 'shadow-[0_0_20px_rgba(255,221,0,0.12)] border-yellow-500/30',
  };
  return (
    <div ref={ref} className={`bg-gray-950/80 backdrop-blur-sm border ${colors[glow]} ${className}`}
      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)', ...style }}
      {...rest}>
      {children}
    </div>
  );
});

function TiltCard({ extraRef, ...props }) {
  const ref = useTilt({ max: 5, scale: 1.005 });
  const setRefs = (node) => {
    ref.current = node;
    if (typeof extraRef === 'function') extraRef(node);
    else if (extraRef) extraRef.current = node;
  };
  return <Card {...props} ref={setRefs}/>;
}

function HelpBox({ children, color = 'cyan' }) {
  const colors = {
    cyan: 'border-cyan-700/50 bg-cyan-950/20 text-cyan-300',
    pink: 'border-pink-700/50 bg-pink-950/20 text-pink-300',
    yellow: 'border-yellow-700/50 bg-yellow-950/20 text-yellow-300',
  };
  return (
    <div className={`flex gap-2 px-3 py-2 border-l-2 ${colors[color]} text-[11px] font-mono leading-relaxed`}>
      <Info size={12} className="flex-shrink-0 mt-0.5"/>
      <div>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ABA INÍCIO
// ═══════════════════════════════════════════════════════════════
function AbaInicio({ perfil, historico, planos, agenda, setSessaoAtiva, setTab }) {
  const dialog = useDialog();
  const hoje = dataIso(new Date());
  const planoHojeId = agenda[hoje];
  const planoHoje = planos.find(p => p.id === planoHojeId);
  const treinoHoje = historico.find(h => dataIso(h.data) === hoje);
  const ultimosTreinos = [...historico].slice(-3).reverse();
  const sem = 7 * 24 * 60 * 60 * 1000;
  const agora = Date.now();
  const treinosSemana = historico.filter(h => agora - new Date(h.data).getTime() < sem);
  const volumeSemana = treinosSemana.reduce((a, s) => a + volumeSessao(s), 0);
  const heroRef = useCursorGlow();
  const startBtnRef = useMagnetic({ strength: 0.28, scale: 1.03 });
  const avatarColor = getAvatar().color;
  const heroGlowRgb = avatarColor === '#ff2056' ? '255,32,86'
    : avatarColor === '#3ddc84' ? '61,220,132'
    : avatarColor === '#ffd60a' ? '255,214,10'
    : avatarColor === '#7ad9f0' ? '122,217,240'
    : avatarColor === '#ff5f8a' ? '255,95,138'
    : '0,212,255';

  function iniciarPlano(plano) {
    setSessaoAtiva({
      data: new Date().toISOString(),
      treino: plano.nome,
      planoId: plano.id,
      exercicios: plano.exercicios.map(e => ({
        nome: e.nome,
        seriesAlvo: e.series,
        repsAlvo: e.reps,
        descansoAlvo: e.descanso_seg,
        obs: e.obs,
        series: Array.from({ length: e.series }, () => ({ peso: '', reps: '' })),
      })),
    });
  }

  async function iniciarLivre() {
    const nome = await dialog.prompt('Nome do treino livre:', '', { placeholder: 'ex: Empurrar livre' });
    if (!nome) return;
    setSessaoAtiva({ data: new Date().toISOString(), treino: nome, exercicios: [] });
  }

  return (
    <div className="space-y-3">
      {/* Compact greeting strip — demoted */}
      <div data-anim className="flex items-baseline justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-cyan-100 truncate">
            Olá{perfil.nome ? `, ${perfil.nome}` : ''} <span className="text-base">👋</span>
          </h2>
          <p className="text-[10px] font-mono italic" style={{ color: getAvatar().color, opacity: 0.85 }}>
            // {flavor(getAvatar().ns, 'greet')} · {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      {/* HERO — today's training */}
      <TiltCard extraRef={heroRef} data-anim glow={treinoHoje ? 'green' : planoHoje ? 'pink' : 'cyan'}
        style={{ '--glow-color': heroGlowRgb }}
        className="p-6 sm:p-8 cy-breathe cy-border-trace cy-cursor-glow">
        <div className="text-[11px] font-mono text-cyan-500 tracking-[4px] mb-4 flex items-center gap-2">
          <span className="w-2 h-2" style={{ background: getAvatar().color, boxShadow: `0 0 8px ${getAvatar().color}` }}/>
          {'> '}TREINO_DE_HOJE
        </div>

        {treinoHoje ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Check size={26} className="text-emerald-400" style={{ filter: 'drop-shadow(0 0 8px #00ff9f)' }}/>
              <h3 className="text-2xl font-bold text-emerald-300 font-mono tracking-wider">CONCLUÍDO</h3>
            </div>
            <p className="text-base text-gray-200 mb-3">{treinoHoje.treino}</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-black/40 border border-emerald-900/40 px-3 py-2">
                <div className="text-xl font-bold font-mono text-emerald-300">{treinoHoje.exercicios.length}</div>
                <div className="text-[9px] font-mono text-gray-500 tracking-widest">EXERCÍCIOS</div>
              </div>
              <div className="bg-black/40 border border-emerald-900/40 px-3 py-2">
                <div className="text-xl font-bold font-mono text-emerald-300">{volumeSessao(treinoHoje).toLocaleString('pt-BR')}<span className="text-[10px] text-gray-500 ml-1">kg</span></div>
                <div className="text-[9px] font-mono text-gray-500 tracking-widest">VOLUME</div>
              </div>
            </div>
          </div>
        ) : planoHoje ? (
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-pink-300 mb-1 font-mono tracking-wider" style={{ textShadow: '0 0 16px rgba(255,46,170,0.6)' }}>
              {planoHoje.nome}
            </h3>
            <p className="text-sm text-gray-300 mb-4">{planoHoje.descricao}</p>
            <div className="flex items-center gap-3 text-xs font-mono text-gray-500 mb-5">
              <span className="px-2 py-1 bg-black/40 border border-pink-900/40">{planoHoje.exercicios.length} ex</span>
              <span className="px-2 py-1 bg-black/40 border border-pink-900/40">~{planoHoje.duracao_estimada_min || 60}min</span>
            </div>
            <button ref={startBtnRef} onClick={() => iniciarPlano(planoHoje)}
              className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-400 hover:to-cyan-400 text-black py-4 sm:py-5 font-mono text-base font-bold tracking-[3px]"
              style={{
                clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                boxShadow: '0 0 24px rgba(255,46,170,0.4)',
                willChange: 'transform',
              }}>
              ▶ INICIAR TREINO
            </button>
          </div>
        ) : (
          <div>
            <p className="text-base text-gray-300 mb-4">Nenhum treino agendado para hoje.</p>
            <HelpBox>
              Vá em <strong>AGENDA</strong> e atribua um plano ao dia de hoje, ou comece um treino livre agora.
            </HelpBox>
            <button onClick={iniciarLivre}
              className="mt-4 w-full bg-black border-2 border-cyan-700 hover:border-cyan-400 text-cyan-300 py-3.5 font-mono text-sm tracking-[3px] cy-lift">
              ▶ TREINO LIVRE
            </button>
          </div>
        )}
      </TiltCard>

      <Card data-anim glow="cyan" className="p-5">
        <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-3">{'> '}SEUS_NÚMEROS_DA_SEMANA</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center bg-black/40 py-3 px-2 border border-cyan-900/30">
            <AnimatedNumber digitRoll value={treinosSemana.length} className="text-2xl font-bold font-mono text-cyan-400 block" style={{ textShadow: '0 0 10px rgba(0,212,255,0.5)' }}/>
            <div className="text-[9px] font-mono text-gray-500">treinos</div>
          </div>
          <div className="text-center bg-black/40 py-3 px-2 border border-cyan-900/30">
            <span className="text-2xl font-bold font-mono text-emerald-400 block" style={{ textShadow: '0 0 10px rgba(0,255,159,0.5)' }}>
              <AnimatedNumber value={volumeSemana/1000} decimals={1}/><span className="text-xs">t</span>
            </span>
            <div className="text-[9px] font-mono text-gray-500">volume</div>
          </div>
          <div className="text-center bg-black/40 py-3 px-2 border border-cyan-900/30">
            <AnimatedNumber digitRoll value={planos.length} className="text-2xl font-bold font-mono text-pink-400 block" style={{ textShadow: '0 0 10px rgba(255,46,170,0.5)' }}/>
            <div className="text-[9px] font-mono text-gray-500">planos</div>
          </div>
        </div>
      </Card>

      <div data-anim className="grid grid-cols-2 gap-2">
        <button onClick={() => setTab('treinos')}
          className="bg-black border border-cyan-700/50 hover:border-cyan-400 p-4 text-left transition cy-lift">
          <Dumbbell size={20} className="text-cyan-400 mb-2"/>
          <div className="text-sm font-bold text-cyan-100">Meus treinos</div>
          <div className="text-[10px] text-gray-500 font-mono">criar e iniciar planos</div>
        </button>
        <button onClick={() => setTab('agenda')}
          className="bg-black border border-pink-700/50 hover:border-pink-400 p-4 text-left transition cy-lift">
          <Calendar size={20} className="text-pink-400 mb-2"/>
          <div className="text-sm font-bold text-pink-100">Agenda semanal</div>
          <div className="text-[10px] text-gray-500 font-mono">organize sua semana</div>
        </button>
      </div>

      <Card data-anim glow="pink" className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono text-pink-500 tracking-widest">{'> '}ÚLTIMOS_TREINOS</div>
          {historico.length > 3 && (
            <button onClick={() => setTab('treinos')} className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300">
              ver todos →
            </button>
          )}
        </div>
        {ultimosTreinos.length === 0 ? (
          <HelpBox color="pink">
            Você ainda não registrou treinos. Comece agora indo em <strong>TREINOS</strong> ou clicando em "Treino livre" acima.
          </HelpBox>
        ) : (
          <div className="space-y-2 cy-stagger">
            {ultimosTreinos.map((s, i) => (
              <div key={i} className="bg-black/50 border-l-2 border-pink-500/50 px-3 py-2.5 hover:border-pink-400 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-pink-100 font-medium">{s.treino}</div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {new Date(s.data).toLocaleDateString('pt-BR')} · {s.exercicios.length} ex
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold font-mono text-sm">{volumeSessao(s).toLocaleString('pt-BR')}</div>
                    <div className="text-[9px] text-gray-600 font-mono">kg</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ABA TREINOS
// ═══════════════════════════════════════════════════════════════
function AbaTreinos({ planos, setPlanos, historico, perfil, setSessaoAtiva }) {
  const [view, setView] = useState('planos');
  const [editandoPlano, setEditandoPlano] = useState(null);

  if (editandoPlano) {
    return <EditorDePlano plano={editandoPlano} planos={planos} setPlanos={setPlanos} onClose={() => setEditandoPlano(null)}/>;
  }

  return (
    <div className="space-y-4">
      <Card glow="cyan" className="p-4">
        <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-1">{'> '}TREINOS</div>
        <p className="text-xs text-gray-400 mb-3">
          {view === 'planos' && 'Aqui ficam os planos que você criou. Crie templates e use sempre que quiser.'}
          {view === 'montador' && 'Crie um plano novo: do zero, baseado em template, ou descrevendo em linguagem natural.'}
        </p>
        <div className="grid grid-cols-2 gap-1 bg-black border border-cyan-900">
          {[['planos', 'MEUS PLANOS'], ['montador', 'MONTADOR']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              className={`py-2 text-[10px] font-mono ${view===k ? 'bg-cyan-500 text-black font-bold' : 'text-cyan-500 hover:text-cyan-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </Card>

      {view === 'planos' && <ViewMeusPlanos planos={planos} setPlanos={setPlanos} setEditandoPlano={setEditandoPlano} setSessaoAtiva={setSessaoAtiva}/>}
      {view === 'montador' && <ViewMontador planos={planos} setPlanos={setPlanos} perfil={perfil} setEditandoPlano={setEditandoPlano} onCriado={() => setView('planos')}/>}
    </div>
  );
}

function PlanMenu({ plano, onEdit, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    setTimeout(() => window.addEventListener('click', close, { once: true }), 0);
    return () => window.removeEventListener('click', close);
  }, [open]);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="text-cyan-500 hover:text-cyan-300 p-1.5 cy-lift" title="Mais opções">
        <span className="text-lg leading-none">⋯</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[140px] bg-black/95 backdrop-blur-md border border-cyan-500/50 animate-[fadeIn_0.12s_ease-out]"
          style={{ boxShadow: '0 0 20px rgba(0,212,255,0.3)', clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left px-3 py-2 text-[11px] font-mono text-pink-300 hover:bg-pink-500/15 flex items-center gap-2 border-l-2 border-transparent hover:border-pink-400">
            <Edit2 size={11}/> EDITAR
          </button>
          <button onClick={() => { onDuplicate(); setOpen(false); }} className="w-full text-left px-3 py-2 text-[11px] font-mono text-cyan-300 hover:bg-cyan-500/15 flex items-center gap-2 border-l-2 border-transparent hover:border-cyan-400">
            <Copy size={11}/> DUPLICAR
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full text-left px-3 py-2 text-[11px] font-mono text-red-400 hover:bg-red-500/15 flex items-center gap-2 border-l-2 border-transparent hover:border-red-500">
            <Trash2 size={11}/> APAGAR
          </button>
        </div>
      )}
    </div>
  );
}

function ViewMeusPlanos({ planos, setPlanos, setEditandoPlano, setSessaoAtiva }) {
  const dialog = useDialog();
  function iniciar(plano) {
    setSessaoAtiva({
      data: new Date().toISOString(),
      treino: plano.nome,
      planoId: plano.id,
      exercicios: plano.exercicios.map(e => ({
        nome: e.nome, seriesAlvo: e.series, repsAlvo: e.reps,
        descansoAlvo: e.descanso_seg, obs: e.obs,
        series: Array.from({ length: e.series }, () => ({ peso: '', reps: '' })),
      })),
    });
  }
  function duplicar(plano) {
    setPlanos([...planos, { ...plano, id: uuid(), nome: plano.nome + ' (cópia)' }]);
  }
  async function deletar(id) {
    if (await dialog.confirm('Apagar este plano?', { destructive: true, okLabel: 'APAGAR' })) {
      setPlanos(planos.filter(p => p.id !== id));
      dialog.toast('Plano apagado.', 'success');
    }
  }
  function novoVazio() {
    const novo = {
      id: uuid(), nome: 'Novo Plano', descricao: 'Descrição do plano',
      duracao_estimada_min: 60, exercicios: [],
    };
    setPlanos([...planos, novo]);
    setEditandoPlano(novo);
  }

  if (planos.length === 0) {
    return (
      <Card glow="cyan" className="p-6 text-center">
        <Dumbbell size={32} className="text-cyan-700 mx-auto mb-3"/>
        <h3 className="text-sm font-bold text-cyan-200 mb-2">Nenhum plano salvo ainda</h3>
        <p className="text-[11px] mb-2 font-mono italic" style={{ color: getAvatar().color, opacity: 0.85 }}>
          {emptyQuote(getAvatar().ns, 'planos')}
        </p>
        <p className="text-xs text-gray-500 mb-4 font-mono">
          Crie seu primeiro plano usando o <strong className="text-cyan-400">MONTADOR</strong> ou comece do zero.
        </p>
        <button onClick={novoVazio} className="bg-cyan-500 text-black py-2 px-6 font-mono text-xs font-bold tracking-wider">
          + CRIAR PLANO VAZIO
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-3 cy-stagger">
      <button onClick={novoVazio}
        className="w-full bg-black border border-dashed border-cyan-700 hover:border-cyan-400 text-cyan-400 py-3 font-mono text-xs tracking-wider cy-lift">
        <Plus size={14} className="inline mr-1"/> CRIAR NOVO PLANO
      </button>
      {planos.map(p => (
        <Card key={p.id} glow="cyan" className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-cyan-100">{p.nome}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{p.descricao}</p>
              <div className="text-[10px] text-gray-500 font-mono mt-1">
                {p.exercicios.length} ex · ~{p.duracao_estimada_min || 60}min
              </div>
            </div>
            <PlanMenu plano={p} onEdit={() => setEditandoPlano(p)} onDuplicate={() => duplicar(p)} onDelete={() => deletar(p.id)}/>
          </div>
          <div className="text-[10px] text-gray-500 font-mono mb-3 truncate">
            {p.exercicios.map(e => e.nome).join(' · ')}
          </div>
          <button onClick={() => iniciar(p)}
            className="w-full bg-gradient-to-r from-cyan-500 to-pink-500 text-black py-2 font-mono text-xs font-bold tracking-wider"
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
            ▶ INICIAR
          </button>
        </Card>
      ))}
    </div>
  );
}

function ViewMontador({ planos, setPlanos, perfil, setEditandoPlano, onCriado }) {
  const [prompt, setPrompt] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [previaPlano, setPreviaPlano] = useState(null);

  async function gerarComIA() {
    if (!prompt.trim()) return;
    setCarregando(true);
    setErro(null);
    try {
      const plano = await gerarTreinoIA(prompt, perfil);
      plano.exercicios = plano.exercicios.filter(e => STRENGTH_STANDARDS[e.nome]);
      if (plano.exercicios.length === 0) throw new Error('Nenhum exercício válido gerado. Tente reformular.');
      setPreviaPlano({ ...plano, id: uuid() });
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  function gerarPorTemplate(tipo) {
    const plano = gerarPlanoGenerico(tipo, perfil);
    setPreviaPlano({ ...plano, id: uuid() });
  }

  function salvarPlano() {
    setPlanos([...planos, previaPlano]);
    setPreviaPlano(null);
    setPrompt('');
    onCriado();
  }

  if (previaPlano) {
    return (
      <Card glow="green" className="p-5">
        <div className="text-[10px] font-mono text-emerald-500 tracking-widest mb-1">{'> '}PRÉ-VISUALIZAÇÃO</div>
        <h3 className="text-lg font-bold text-emerald-300 mb-1">{previaPlano.nome}</h3>
        <p className="text-xs text-gray-400 mb-3">{previaPlano.descricao}</p>
        <div className="text-[10px] text-gray-500 font-mono mb-3">
          {previaPlano.exercicios.length} exercícios · ~{previaPlano.duracao_estimada_min || 60}min
        </div>
        <div className="space-y-2 mb-4">
          {previaPlano.exercicios.map((ex, i) => (
            <div key={i} className="bg-black/50 border-l-2 border-emerald-500/40 px-3 py-2">
              <div className="flex justify-between text-sm">
                <span className="text-cyan-200">{ex.nome}</span>
                <span className="text-emerald-400 font-mono text-[11px]">{ex.series}×{ex.reps}</span>
              </div>
              {ex.obs && <div className="text-[10px] text-gray-500 mt-0.5 italic">"{ex.obs}"</div>}
              <div className="text-[9px] text-gray-600 font-mono mt-0.5">descanso {ex.descanso_seg}s</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setPreviaPlano(null)}
            className="bg-black border border-red-700 hover:border-red-400 text-red-400 py-2.5 font-mono text-xs tracking-wider">
            ✕ DESCARTAR
          </button>
          <button onClick={salvarPlano}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-black py-2.5 font-mono text-xs font-bold tracking-wider">
            ▣ SALVAR PLANO
          </button>
        </div>
        <button onClick={() => { setPlanos([...planos, previaPlano]); setEditandoPlano(previaPlano); setPreviaPlano(null); }}
          className="mt-2 w-full bg-black border border-pink-700 hover:border-pink-400 text-pink-400 py-2 font-mono text-[10px] tracking-wider">
          SALVAR E EDITAR
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card glow="pink" className="p-5">
        <div className="text-[10px] font-mono text-pink-500 tracking-widest mb-2">{'> '}MONTADOR_IA</div>
        <h3 className="text-base font-bold text-pink-100 mb-1 flex items-center gap-2">
          <Wand2 size={16}/> Descreva o treino que quer
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          A IA vai gerar um plano personalizado considerando seu perfil ({perfil.objetivo}, {perfil.peso}kg).
        </p>
        <HelpBox color="pink">
          <strong>Exemplos:</strong><br/>
          • "Treino de peito focado em hipertrofia, 1h, 6 exercícios"<br/>
          • "Pernas pesado com agachamento principal, foco em quadríceps"<br/>
          • "Push curto de 40min para hipertrofia"
        </HelpBox>
        {!__HAS_ANTHROPIC_KEY__ && (
          <div className="mt-3 bg-yellow-950/40 border border-yellow-700/50 px-3 py-2 text-[11px] text-yellow-300 font-mono leading-relaxed">
            ⚠ ANTHROPIC_API_KEY não definida. Defina em <code>app/.env.local</code> para usar IA, ou use os templates abaixo.
          </div>
        )}
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Descreva o treino..."
          rows={3}
          className="w-full mt-3 bg-black border border-pink-700/40 focus:border-pink-400 px-3 py-2 text-sm font-mono text-pink-100 outline-none resize-none"/>
        {erro && <div className="text-xs text-red-400 font-mono mt-2">⚠ {erro}</div>}
        <button onClick={gerarComIA} disabled={carregando || !prompt.trim()}
          className="mt-3 w-full bg-gradient-to-r from-pink-500 to-cyan-500 disabled:from-gray-700 disabled:to-gray-800 text-black disabled:text-gray-500 py-3 font-mono text-sm font-bold tracking-wider flex items-center justify-center gap-2"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
          {carregando ? <><Loader2 size={14} className="animate-spin"/> GERANDO...</> : <><Sparkles size={14}/> GERAR COM IA</>}
        </button>
      </Card>

      <Card glow="cyan" className="p-5">
        <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-2">{'> '}TEMPLATES_PRONTOS</div>
        <h3 className="text-base font-bold text-cyan-100 mb-1">Ou use um template</h3>
        <p className="text-xs text-gray-400 mb-3">Planos genéricos prontos para começar.</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'push', nome: 'Push', desc: 'Peito, ombro, tríceps' },
            { id: 'pull', nome: 'Pull', desc: 'Costas, bíceps' },
            { id: 'legs', nome: 'Legs', desc: 'Pernas completo' },
            { id: 'fullbody', nome: 'Full Body', desc: 'Corpo todo' },
          ].map(t => (
            <button key={t.id} onClick={() => gerarPorTemplate(t.id)}
              className="bg-black border border-cyan-700/40 hover:border-cyan-400 p-3 text-left transition">
              <div className="text-sm font-bold text-cyan-200">{t.nome}</div>
              <div className="text-[10px] text-gray-500 font-mono">{t.desc}</div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ViewHistorico({ historico }) {
  const [aberto, setAberto] = useState(null);
  const porSemana = useMemo(() => {
    const grupos = {};
    historico.forEach(h => {
      const d = new Date(h.data);
      const inicioSem = new Date(d);
      inicioSem.setDate(d.getDate() - d.getDay());
      const chave = dataIso(inicioSem);
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(h);
    });
    return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]));
  }, [historico]);

  if (historico.length === 0) {
    return (
      <Card glow="cyan" className="p-6 text-center">
        <BookOpen size={32} className="text-cyan-700 mx-auto mb-3"/>
        <h3 className="text-sm font-bold text-cyan-200 mb-1">Sem histórico ainda</h3>
        <p className="text-[11px] mb-2 font-mono italic" style={{ color: getAvatar().color, opacity: 0.85 }}>
          {emptyQuote(getAvatar().ns, 'historico')}
        </p>
        <p className="text-xs text-gray-500 font-mono">
          Treinos executados aparecerão aqui agrupados por semana.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <HelpBox>
        Cada bloco abaixo é uma <strong>semana</strong>. Clique num treino para ver detalhes de séries, pesos e volume.
      </HelpBox>
      {porSemana.map(([semIni, treinos]) => {
        const fim = new Date(semIni);
        fim.setDate(fim.getDate() + 6);
        const volSemana = treinos.reduce((a, t) => a + volumeSessao(t), 0);
        return (
          <Card key={semIni} glow="cyan" className="p-4">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-cyan-900/30">
              <div>
                <div className="text-[10px] font-mono text-cyan-500 tracking-widest">SEMANA</div>
                <div className="text-sm font-bold text-cyan-200">
                  {new Date(semIni).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} → {fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold font-mono text-pink-400">{(volSemana/1000).toFixed(1)}t</div>
                <div className="text-[9px] font-mono text-gray-500">{treinos.length} treinos</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {treinos.map((t, i) => {
                const id = `${semIni}-${i}`;
                const expandido = aberto === id;
                return (
                  <div key={i}>
                    <button onClick={() => setAberto(expandido ? null : id)}
                      className="w-full bg-black/60 hover:bg-black border-l-2 border-pink-500/40 hover:border-pink-400 px-3 py-2 text-left flex justify-between items-center">
                      <div>
                        <div className="text-xs text-pink-100 font-medium">{t.treino}</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {DIAS[diaDaSemana(t.data)]} · {new Date(t.data).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-cyan-400 font-bold font-mono text-xs">{volumeSessao(t).toLocaleString('pt-BR')}kg</div>
                          <div className="text-[9px] text-gray-600 font-mono">{t.exercicios.length} ex</div>
                        </div>
                        <ChevronRight size={14} className={`text-gray-500 transition-transform ${expandido ? 'rotate-90' : ''}`}/>
                      </div>
                    </button>
                    {expandido && (
                      <div className="bg-black/40 border-l-2 border-pink-900/30 ml-2 px-3 py-2 mt-1 space-y-2">
                        {t.exercicios.map((ex, exIdx) => (
                          <div key={exIdx}>
                            <div className="text-[11px] text-cyan-200 font-medium mb-1">{ex.nome}</div>
                            <div className="grid grid-cols-1 gap-0.5">
                              {ex.series.map((s, sIdx) => (
                                <div key={sIdx} className="text-[10px] font-mono text-gray-400 flex justify-between bg-black/40 px-2 py-0.5">
                                  <span>S{sIdx+1}</span>
                                  <span>{s.peso}kg × {s.reps} reps</span>
                                  <span className="text-cyan-500">{volumeSerie(s)}kg</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EDITOR DE PLANO
// ═══════════════════════════════════════════════════════════════
function EditorDePlano({ plano, planos, setPlanos, onClose }) {
  const [tmp, setTmp] = useState(plano);
  const [busca, setBusca] = useState('');

  function salvar() {
    setPlanos(planos.map(p => p.id === tmp.id ? tmp : p));
    onClose();
  }
  function addExercicio(nome) {
    setTmp({
      ...tmp,
      exercicios: [...tmp.exercicios, { nome, series: 3, reps: '8-12', descanso_seg: 90, obs: '' }],
    });
    setBusca('');
  }
  function updateEx(idx, campo, val) {
    const novas = [...tmp.exercicios];
    novas[idx][campo] = val;
    setTmp({ ...tmp, exercicios: novas });
  }
  function removerEx(idx) {
    setTmp({ ...tmp, exercicios: tmp.exercicios.filter((_, i) => i !== idx) });
  }
  function moverEx(idx, dir) {
    const novas = [...tmp.exercicios];
    const novo = idx + dir;
    if (novo < 0 || novo >= novas.length) return;
    [novas[idx], novas[novo]] = [novas[novo], novas[idx]];
    setTmp({ ...tmp, exercicios: novas });
  }

  const filtrados = Object.keys(STRENGTH_STANDARDS).filter(e =>
    e.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-cyan-50 pb-24" style={{
      backgroundImage: `radial-gradient(circle at 20% 0%, rgba(255,46,170,0.08) 0%, transparent 50%)`,
    }}>
      <header className="sticky top-0 z-30 bg-black/85 backdrop-blur-md border-b border-pink-500/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onClose} className="text-cyan-400 flex items-center gap-1 text-sm font-mono">
            <ArrowLeft size={16}/> VOLTAR
          </button>
          <button onClick={salvar} className="bg-gradient-to-r from-cyan-500 to-pink-500 text-black px-4 py-1.5 font-mono text-xs font-bold tracking-wider">
            ▣ SALVAR
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        <Card glow="pink" className="p-4">
          <div className="text-[10px] font-mono text-pink-500 tracking-widest mb-2">{'> '}EDITAR_PLANO</div>
          <input value={tmp.nome} onChange={e => setTmp({ ...tmp, nome: e.target.value })}
            placeholder="Nome do plano"
            className="w-full bg-black border border-pink-700/40 focus:border-pink-400 px-3 py-2 text-base font-bold text-pink-100 outline-none mb-2"/>
          <input value={tmp.descricao} onChange={e => setTmp({ ...tmp, descricao: e.target.value })}
            placeholder="Descrição curta"
            className="w-full bg-black border border-pink-700/40 focus:border-pink-400 px-3 py-2 text-xs text-gray-300 outline-none mb-2"/>
          <input type="number" value={tmp.duracao_estimada_min || ''}
            onChange={e => setTmp({ ...tmp, duracao_estimada_min: Number(e.target.value) })}
            placeholder="Duração estimada (min)"
            className="w-full bg-black border border-pink-700/40 focus:border-pink-400 px-3 py-2 text-xs text-gray-300 outline-none"/>
        </Card>

        {tmp.exercicios.map((ex, idx) => (
          <Card key={idx} glow="cyan" className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="text-sm font-bold text-cyan-200">{ex.nome}</div>
              </div>
              <div className="flex gap-0.5">
                <button onClick={() => moverEx(idx, -1)} disabled={idx===0} className="text-cyan-700 disabled:opacity-30 p-1">↑</button>
                <button onClick={() => moverEx(idx, 1)} disabled={idx===tmp.exercicios.length-1} className="text-cyan-700 disabled:opacity-30 p-1">↓</button>
                <button onClick={() => removerEx(idx)} className="text-red-500 p-1"><X size={14}/></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <FieldEditor label="SÉRIES">
                <input type="number" value={ex.series}
                  onChange={e => updateEx(idx, 'series', Number(e.target.value))}
                  className="w-full bg-black border border-cyan-900 px-2 py-1 text-xs font-mono text-cyan-100 outline-none"/>
              </FieldEditor>
              <FieldEditor label="REPS">
                <input value={ex.reps}
                  onChange={e => updateEx(idx, 'reps', e.target.value)}
                  placeholder="8-12"
                  className="w-full bg-black border border-cyan-900 px-2 py-1 text-xs font-mono text-cyan-100 outline-none"/>
              </FieldEditor>
              <FieldEditor label="DESCANSO_S">
                <input type="number" value={ex.descanso_seg}
                  onChange={e => updateEx(idx, 'descanso_seg', Number(e.target.value))}
                  className="w-full bg-black border border-cyan-900 px-2 py-1 text-xs font-mono text-cyan-100 outline-none"/>
              </FieldEditor>
            </div>
            <input value={ex.obs || ''}
              onChange={e => updateEx(idx, 'obs', e.target.value)}
              placeholder="Observação (opcional)"
              className="w-full mt-2 bg-black border border-cyan-900 px-2 py-1 text-[11px] text-gray-400 outline-none italic"/>
          </Card>
        ))}

        <Card glow="cyan" className="p-3">
          <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-2">{'> '}ADICIONAR_EXERCÍCIO</div>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="// buscar..."
            className="w-full bg-black border border-cyan-900 focus:border-cyan-500 px-3 py-2 text-xs font-mono text-cyan-100 outline-none mb-2"/>
          <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
            {filtrados.map(e => (
              <button key={e} onClick={() => addExercicio(e)}
                className="text-left bg-black border border-cyan-900/40 hover:border-cyan-400 text-[11px] px-2 py-1.5 transition truncate font-mono text-cyan-200">
                + {e}
              </button>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

function FieldEditor({ label, children }) {
  return (
    <div>
      <div className="text-[9px] font-mono text-gray-500 tracking-widest mb-0.5">{label}</div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXECUTAR TREINO
// ═══════════════════════════════════════════════════════════════
function ExecutarTreino({ sessao, setSessao, historico, setHistorico, onCompleto }) {
  const dialog = useDialog();
  const avatar = useMemo(() => getAvatar(), []);
  const [timer, setTimer] = useState(0);
  // Selected (focused) set: { exIdx, sIdx } — controls which row +/- targets
  const [focused, setFocused] = useState(null);
  const [timerRodando, setTimerRodando] = useState(true);
  const [restTimer, setRestTimer] = useState(0);
  const [restAtivo, setRestAtivo] = useState(false);
  const intervalRef = useRef(null);
  const restRef = useRef(null);

  useEffect(() => {
    if (timerRodando) intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    else clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [timerRodando]);

  useEffect(() => {
    if (restAtivo && restTimer > 0) {
      restRef.current = setInterval(() => {
        setRestTimer(t => { if (t <= 1) { setRestAtivo(false); return 0; } return t - 1; });
      }, 1000);
    } else clearInterval(restRef.current);
    return () => clearInterval(restRef.current);
  }, [restAtivo, restTimer]);

  const ultimaPerf = useMemo(() => {
    const map = {};
    [...historico].reverse().forEach(s => {
      s.exercicios.forEach(ex => {
        if (!map[ex.nome]) map[ex.nome] = { data: s.data, series: ex.series, volume: volumeExercicio(ex) };
      });
    });
    return map;
  }, [historico]);

  function adicionarSerie(idx) {
    const novas = [...sessao.exercicios];
    novas[idx].series.push({ peso: '', reps: '' });
    setSessao({ ...sessao, exercicios: novas });
  }
  function removerSerie(exIdx, sIdx) {
    const novas = [...sessao.exercicios];
    novas[exIdx].series.splice(sIdx, 1);
    if (novas[exIdx].series.length === 0) novas.splice(exIdx, 1);
    setSessao({ ...sessao, exercicios: novas });
  }
  function atualizarSerie(exIdx, sIdx, campo, val) {
    const novas = [...sessao.exercicios];
    novas[exIdx].series[sIdx][campo] = val === '' ? '' : Number(val);
    setSessao({ ...sessao, exercicios: novas });
  }
  function adicionarExercicio(nome) {
    setSessao({
      ...sessao,
      exercicios: [...sessao.exercicios, { nome, series: [{ peso: '', reps: '' }] }],
    });
  }
  function iniciarDescanso(seg) {
    setRestTimer(seg);
    setRestAtivo(true);
  }
  async function finalizar() {
    if (sessao.exercicios.length === 0) {
      if (!await dialog.confirm('Treino vazio. Descartar?', { destructive: true, okLabel: 'DESCARTAR' })) return;
      onCompleto(); return;
    }
    const limpo = sessao.exercicios.map(ex => ({
      ...ex, series: ex.series.filter(s => s.peso !== '' && s.reps !== '')
    })).filter(ex => ex.series.length > 0);
    if (limpo.length === 0) {
      if (!await dialog.confirm('Sem séries preenchidas. Descartar?', { destructive: true, okLabel: 'DESCARTAR' })) return;
      onCompleto(); return;
    }
    // Detect PR breaks: best 1RM per exercise BEFORE this session vs in this session
    const prevBest = {};
    historico.forEach(s => s.exercicios.forEach(ex => ex.series.forEach(sr => {
      if (!sr.peso || !sr.reps) return;
      const o = calcular1RM(Number(sr.peso) || 0, Number(sr.reps) || 0);
      if (!prevBest[ex.nome] || o > prevBest[ex.nome]) prevBest[ex.nome] = o;
    })));
    const newPRs = [];
    limpo.forEach(ex => {
      ex.series.forEach(sr => {
        const o = calcular1RM(Number(sr.peso) || 0, Number(sr.reps) || 0);
        const prev = prevBest[ex.nome] || 0;
        if (o > prev && (!newPRs.find(p => p.nome === ex.nome) || newPRs.find(p => p.nome === ex.nome).oneRM < o)) {
          const idx = newPRs.findIndex(p => p.nome === ex.nome);
          if (idx >= 0) newPRs[idx] = { nome: ex.nome, oneRM: o, prev };
          else newPRs.push({ nome: ex.nome, oneRM: o, prev });
        }
      });
    });

    setHistorico([...historico, { ...sessao, exercicios: limpo, duracao: timer }]);
    dialog.toast(`${flavor(avatar.ns, 'save')} · ${limpo.reduce((a, ex) => a + volumeExercicio(ex), 0).toLocaleString('pt-BR')}kg`, 'success');
    // Persona finalize cue
    (personaSfx[avatar.ns] || personaSfx.ichigo)();

    // PR celebration
    if (newPRs.length > 0) {
      setTimeout(() => {
        import('./Confetti.jsx').then(({ burstConfetti }) => {
          burstConfetti(window.innerWidth / 2, window.innerHeight / 2, avatar.color);
        });
        sfx.success(); sfx.success();
        newPRs.forEach((pr, i) => {
          setTimeout(() => {
            dialog.toast(`${flavor(avatar.ns, 'pr')} · ${pr.nome} · 1RM ${pr.oneRM}kg (${pr.prev > 0 ? '+' + (pr.oneRM - pr.prev) + 'kg' : 'primeiro registro'})`, 'success');
          }, 600 + i * 350);
        });
      }, 350);
    }
    onCompleto();
  }

  const fmtTimer = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="min-h-screen bg-black text-cyan-50 pb-24" style={{
      backgroundImage: `radial-gradient(circle at 20% 0%, rgba(255,46,170,0.08) 0%, transparent 50%)`,
    }}>
      <div className="fixed inset-0 pointer-events-none z-50" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,212,255,0.03) 0px, rgba(0,212,255,0.03) 1px, transparent 1px, transparent 3px)',
      }}/>

      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-cyan-500/40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <button onClick={async () => { if (await dialog.confirm('Descartar treino?', { destructive: true, okLabel: 'DESCARTAR' })) { dialog.toast(flavor(avatar.ns, 'cancel'), 'warn'); onCompleto(); } }} className="text-red-400 text-xs font-mono">✕ CANCELAR</button>
            <div className="text-[10px] font-mono text-cyan-400 tracking-widest">{'>'} EM ANDAMENTO</div>
            <button onClick={finalizar} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-black px-3 py-1 font-mono text-xs font-bold tracking-wider">▣ FINALIZAR</button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm font-bold text-cyan-100 truncate">{sessao.treino}</div>
              <div className="text-[10px] font-mono text-gray-500">{sessao.exercicios.length} exercícios planejados</div>
            </div>
            <div className="bg-black px-3 py-1.5 border border-cyan-500/40 text-cyan-300 font-mono text-base tracking-widest">
              {fmtTimer(timer)}
            </div>
            <button onClick={() => setTimerRodando(!timerRodando)} className="bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/40 p-2">
              {timerRodando ? <Pause size={14}/> : <Play size={14}/>}
            </button>
          </div>
          {restAtivo && (
            <div className="mt-2 bg-pink-500/20 border border-pink-500/40 px-3 py-2 flex justify-between items-center">
              <div className="text-pink-200 text-xs font-mono">⏱ DESCANSO</div>
              <div className="text-pink-100 font-bold font-mono text-lg">{fmtTimer(restTimer)}</div>
              <button onClick={() => setRestAtivo(false)} className="text-pink-300"><X size={14}/></button>
            </div>
          )}
        </div>
      </header>

      {/* Floating rest timer pill — visible while scrolled past the header */}
      {restAtivo && (
        <div className="fixed bottom-32 right-4 z-30 cursor-pointer cy-pulse"
          onClick={() => setRestAtivo(false)}
          title="Cancelar descanso">
          <div className="relative bg-black/95 border-2 border-pink-500 backdrop-blur-md px-4 py-3 flex items-center gap-3"
            style={{
              boxShadow: '0 0 30px rgba(255,46,170,0.5)',
              clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            }}>
            <div className="text-pink-300 text-[8px] font-mono tracking-widest leading-tight">
              ⏱ <br/>REST
            </div>
            <div className="text-pink-100 font-bold font-mono text-2xl tabular-nums" style={{ textShadow: '0 0 14px #ff2eaa' }}>
              {fmtTimer(restTimer)}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {sessao.exercicios.map((ex, exIdx) => {
          const ult = ultimaPerf[ex.nome];
          const volAtual = volumeExercicio(ex);
          const delta = ult ? volAtual - ult.volume : 0;
          return (
            <Card key={exIdx} glow="cyan" className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-cyan-100">{ex.nome}</h3>
                  {ex.repsAlvo && (
                    <div className="text-[10px] font-mono text-pink-400 mt-0.5">
                      META: {ex.seriesAlvo}×{ex.repsAlvo} · descanso {ex.descansoAlvo}s
                    </div>
                  )}
                  {ex.obs && <div className="text-[10px] text-gray-500 italic mt-0.5">"{ex.obs}"</div>}
                </div>
                <button onClick={() => {
                  const novas = [...sessao.exercicios];
                  novas.splice(exIdx, 1);
                  setSessao({ ...sessao, exercicios: novas });
                }} className="text-pink-400 p-1"><Trash2 size={14}/></button>
              </div>

              {ult && (
                <div className="mb-2 bg-black/50 border-l-2 border-pink-500/40 px-3 py-1.5 text-[11px] font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-pink-300">ÚLTIMO ({new Date(ult.data).toLocaleDateString('pt-BR')}): {ult.volume}kg</span>
                    {volAtual > 0 && (
                      <span className={`font-bold flex items-center gap-1 ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {delta > 0 ? <TrendingUp size={11}/> : delta < 0 ? <TrendingDown size={11}/> : null}
                        {delta > 0 ? '+' : ''}{delta}kg
                      </span>
                    )}
                  </div>
                  <div className="text-gray-600 text-[10px] mt-0.5 truncate">
                    {ult.series.map(s => `${s.peso}×${s.reps}`).join(' · ')}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="grid grid-cols-[24px_1fr_1fr_1fr_24px_24px] sm:grid-cols-12 gap-1.5 sm:gap-2 text-[9px] font-mono text-gray-600 px-1 tracking-wider">
                  <div className="sm:col-span-1">#</div>
                  <div className="sm:col-span-3">PESO</div>
                  <div className="sm:col-span-3">REPS</div>
                  <div className="sm:col-span-3">VOL</div>
                  <div className="sm:col-span-1">Δ</div>
                  <div className="sm:col-span-1"></div>
                </div>
                {ex.series.map((s, sIdx) => {
                  const vol = volumeSerie(s);
                  const ultS = ult && ult.series[sIdx];
                  const dS = ultS ? vol - volumeSerie(ultS) : 0;
                  // Auto-detect "current": first empty row, else last filled
                  const firstEmpty = ex.series.findIndex(x => x.peso === '' || x.reps === '');
                  const autoCurrent = firstEmpty >= 0 ? firstEmpty : ex.series.length - 1;
                  const isFocused = focused && focused.exIdx === exIdx && focused.sIdx === sIdx;
                  const isCurrent = focused ? isFocused : (sIdx === autoCurrent);
                  return (
                    <div key={sIdx}
                      onClick={() => setFocused({ exIdx, sIdx })}
                      className={`grid grid-cols-[24px_1fr_1fr_1fr_24px_24px] sm:grid-cols-12 gap-1.5 sm:gap-2 items-center px-1 py-0.5 border-l-2 transition ${
                        isCurrent
                          ? 'border-cyan-400 bg-cyan-500/5'
                          : 'border-transparent hover:border-cyan-900'
                      }`}
                      style={isCurrent ? { boxShadow: 'inset 2px 0 8px -4px #00d4ff' } : undefined}>
                      <div className={`sm:col-span-1 text-[10px] font-mono text-center ${isCurrent ? 'text-cyan-300 font-bold' : 'text-cyan-700'}`}>
                        {isCurrent ? '▸' : ''}{sIdx + 1}
                      </div>
                      <input type="number" inputMode="decimal" step="0.5" value={s.peso}
                        onFocus={() => setFocused({ exIdx, sIdx })}
                        onChange={e => atualizarSerie(exIdx, sIdx, 'peso', e.target.value)}
                        placeholder={ultS ? String(ultS.peso) : '0'}
                        className={`min-w-0 sm:col-span-3 bg-black border ${isCurrent ? 'border-cyan-500' : 'border-cyan-900'} focus:border-cyan-500 px-2 py-1.5 text-sm font-mono text-cyan-100 outline-none`}/>
                      <input type="number" inputMode="numeric" value={s.reps}
                        onFocus={() => setFocused({ exIdx, sIdx })}
                        onChange={e => atualizarSerie(exIdx, sIdx, 'reps', e.target.value)}
                        placeholder={ultS ? String(ultS.reps) : '0'}
                        className={`min-w-0 sm:col-span-3 bg-black border ${isCurrent ? 'border-cyan-500' : 'border-cyan-900'} focus:border-cyan-500 px-2 py-1.5 text-sm font-mono text-cyan-100 outline-none`}/>
                      <div className="min-w-0 sm:col-span-3 text-xs font-mono text-cyan-400 text-center truncate">{vol || '-'}</div>
                      <div className="sm:col-span-1 text-[10px] font-mono text-center">
                        {ultS && vol > 0 ? (
                          <span className={dS > 0 ? 'text-emerald-400' : dS < 0 ? 'text-red-400' : 'text-gray-500'}>
                            {dS > 0 ? '+' : ''}{dS}
                          </span>
                        ) : <span className="text-gray-700">-</span>}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removerSerie(exIdx, sIdx); }} className="sm:col-span-1 text-gray-600 hover:text-red-400">
                        <X size={12}/>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Quick-set buttons: bump weight of the FOCUSED set (or auto-current if none) */}
              <div className="mt-2">
                <div className="text-[8px] font-mono text-gray-600 tracking-widest mb-1 px-1">
                  // ajusta peso da série marcada ▸
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[-5, -2.5, -1, +1, +2.5, +5].map(delta => (
                    <button key={delta} onClick={() => {
                      const series = ex.series;
                      const firstEmpty = series.findIndex(x => x.peso === '' || x.reps === '');
                      const autoIdx = firstEmpty >= 0 ? firstEmpty : series.length - 1;
                      const targetIdx = (focused && focused.exIdx === exIdx) ? focused.sIdx : autoIdx;
                      const cur = Number(series[targetIdx]?.peso) || 0;
                      const next = Math.max(0, cur + delta);
                      atualizarSerie(exIdx, targetIdx, 'peso', String(next));
                      setFocused({ exIdx, sIdx: targetIdx });
                    }}
                      className={`text-[10px] font-mono py-1 ${delta > 0 ? 'border-emerald-700 hover:border-emerald-400 text-emerald-400' : 'border-red-700 hover:border-red-400 text-red-400'} bg-black border tracking-wider cy-lift`}>
                      {delta > 0 ? '+' : ''}{delta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 mt-1">
                <button onClick={() => adicionarSerie(exIdx)}
                  className="bg-black border border-cyan-900/50 hover:border-cyan-500 text-cyan-500 py-1.5 text-[10px] font-mono tracking-widest">
                  + SÉRIE
                </button>
                <button onClick={() => iniciarDescanso(ex.descansoAlvo || 90)}
                  className="bg-black border border-pink-900/50 hover:border-pink-500 text-pink-400 py-1.5 text-[10px] font-mono tracking-widest">
                  ⏱ DESCANSO
                </button>
              </div>
            </Card>
          );
        })}

        <SeletorExercicioInline onSelect={adicionarExercicio}/>

        <div className="grid grid-cols-3 gap-1">
          {[60, 90, 120].map(s => (
            <button key={s} onClick={() => iniciarDescanso(s)}
              className="text-[10px] font-mono text-pink-500 hover:text-pink-300 border border-pink-900/40 hover:border-pink-500 py-2 bg-black/50">
              ⏱ {s}s
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function SeletorExercicioInline({ onSelect }) {
  const [busca, setBusca] = useState('');
  const exercicios = Object.keys(STRENGTH_STANDARDS).filter(e =>
    e.toLowerCase().includes(busca.toLowerCase())
  );
  return (
    <Card glow="cyan" className="p-3">
      <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-2">{'> '}+ ADICIONAR_EXERCÍCIO_EXTRA</div>
      <input type="text" placeholder="// buscar..." value={busca} onChange={e => setBusca(e.target.value)}
        className="w-full bg-black border border-cyan-900 focus:border-cyan-500 px-3 py-2 text-sm font-mono text-cyan-100 outline-none mb-2"/>
      <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto">
        {exercicios.map(e => (
          <button key={e} onClick={() => { onSelect(e); setBusca(''); }}
            className="text-left bg-black border border-cyan-900/40 hover:border-cyan-400 text-xs px-2 py-1.5 transition truncate font-mono text-cyan-200">
            + {e}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// ABA AGENDA
// ═══════════════════════════════════════════════════════════════
function AbaAgenda({ agenda, setAgenda, planos, historico, setSessaoAtiva }) {
  const dialog = useDialog();
  const avatar = useMemo(() => getAvatar(), []);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  const inicioSemana = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + (semanaOffset * 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }, [semanaOffset]);

  const dias = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const d = new Date(inicioSemana);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [inicioSemana]);

  function planoNoDia(d) {
    const id = agenda[dataIso(d)];
    return planos.find(p => p.id === id);
  }
  function treinoNoDia(d) {
    return historico.find(h => dataIso(h.data) === dataIso(d));
  }
  function atribuirPlano(d, planoId) {
    setAgenda({ ...agenda, [dataIso(d)]: planoId });
    setDiaSelecionado(null);
  }
  function removerPlano(d) {
    const novo = { ...agenda };
    delete novo[dataIso(d)];
    setAgenda(novo);
    setDiaSelecionado(null);
  }

  const hojeIso = dataIso(new Date());

  // Week stats
  const stats = useMemo(() => {
    let planejados = 0, executados = 0, volExec = 0;
    const muscleVol = {};
    dias.forEach(d => {
      if (planoNoDia(d)) planejados++;
      const t = treinoNoDia(d);
      if (t) {
        executados++;
        volExec += volumeSessao(t);
        t.exercicios.forEach(ex => {
          const std = STRENGTH_STANDARDS[ex.nome];
          if (!std) return;
          const v = volumeExercicio(ex);
          std.muscles.forEach(m => { muscleVol[m] = (muscleVol[m] || 0) + v; });
        });
      }
    });
    // Volume projected: from the plans of the week (sum of expected volume — estimated as series × middle reps × ?).
    // Use 100kg placeholder x series x rep midpoint as projection.
    let volProj = 0;
    dias.forEach(d => {
      const p = planoNoDia(d);
      if (!p) return;
      p.exercicios.forEach(ex => {
        const repsMid = parseRepsMid(ex.reps);
        // Use last performed peso for this exercise as projection if available
        let lastPeso = 0;
        for (let i = historico.length - 1; i >= 0; i--) {
          const found = historico[i].exercicios.find(h => h.nome === ex.nome);
          if (found) {
            const last = found.series[found.series.length - 1];
            if (last && last.peso) { lastPeso = Number(last.peso) || 0; break; }
          }
        }
        volProj += (lastPeso || 50) * (Number(ex.series) || 3) * repsMid;
      });
    });
    return { planejados, executados, volExec, volProj, completion: planejados ? Math.round((executados / planejados) * 100) : 0, muscleVol };
  }, [dias, agenda, planos, historico]);

  // Week streak — consecutive past weeks with ≥1 treino
  const streak = useMemo(() => {
    let s = 0;
    const c = new Date(); c.setHours(0,0,0,0);
    c.setDate(c.getDate() - c.getDay()); // Sunday of current week
    for (let w = 0; w < 52; w++) {
      const start = new Date(c); start.setDate(start.getDate() - w*7);
      const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
      const got = historico.some(h => {
        const d = new Date(h.data); return d >= start && d <= end;
      });
      if (got) s++;
      else if (w > 0) break; // current week can be empty without breaking streak
    }
    return s;
  }, [historico]);

  function copiarDeSemanaAnterior() {
    const novo = { ...agenda };
    let copiados = 0;
    for (let i = 0; i < 7; i++) {
      const dst = new Date(inicioSemana); dst.setDate(dst.getDate() + i);
      const src = new Date(dst); src.setDate(src.getDate() - 7);
      const srcId = agenda[dataIso(src)];
      if (srcId) { novo[dataIso(dst)] = srcId; copiados++; }
    }
    setAgenda(novo);
    dialog.toast(`${copiados} dias copiados da semana anterior`, 'success');
  }
  function limparSemana() {
    const novo = { ...agenda };
    dias.forEach(d => { delete novo[dataIso(d)]; });
    setAgenda(novo);
    dialog.toast('Semana zerada', 'warn');
  }

  return (
    <div className="space-y-4">
      {/* Hero stats card — agenda overview */}
      <TiltCard glow="pink" className="p-5 cy-border-trace">
        <div className="text-[10px] font-mono tracking-widest mb-3" style={{ color: avatar.color }}>
          {'> '}AGENDA · <span className="opacity-70">{flavor(avatar.ns, 'section')}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-black/40 border border-pink-900/30 px-2 py-2 text-center">
            <AnimatedNumber digitRoll value={stats.planejados} className="text-2xl font-bold font-mono text-pink-400 block" style={{ textShadow: '0 0 10px rgba(255,46,170,0.5)' }}/>
            <div className="text-[8px] font-mono text-gray-500 tracking-widest">PLANEJADOS</div>
          </div>
          <div className="bg-black/40 border border-emerald-900/30 px-2 py-2 text-center">
            <AnimatedNumber digitRoll value={stats.executados} className="text-2xl font-bold font-mono text-emerald-400 block" style={{ textShadow: '0 0 10px rgba(0,255,159,0.5)' }}/>
            <div className="text-[8px] font-mono text-gray-500 tracking-widest">EXECUTADOS</div>
          </div>
          <div className="bg-black/40 border border-cyan-900/30 px-2 py-2 text-center">
            <AnimatedNumber digitRoll value={stats.completion} className="text-2xl font-bold font-mono text-cyan-400 block" style={{ textShadow: '0 0 10px rgba(0,212,255,0.5)' }}/>
            <div className="text-[8px] font-mono text-gray-500 tracking-widest">CONCLUSÃO%</div>
          </div>
          <div className="bg-black/40 border border-yellow-900/30 px-2 py-2 text-center">
            <span className="text-2xl font-bold font-mono text-yellow-300 block" style={{ textShadow: '0 0 10px rgba(255,221,10,0.5)' }}>
              <AnimatedNumber digitRoll value={streak}/>
            </span>
            <div className="text-[8px] font-mono text-gray-500 tracking-widest">SEMANAS · 🔥</div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="text-[9px] font-mono tracking-widest text-gray-500 mb-1 flex justify-between">
          <span>// PROGRESSO_DA_SEMANA</span>
          <span style={{ color: avatar.color }}>{stats.executados}/{stats.planejados || '∅'}</span>
        </div>
        <div className="h-2 bg-black border border-pink-900/30 mb-3 relative overflow-hidden">
          <div className="h-full transition-all duration-700"
            style={{
              width: stats.planejados ? `${stats.completion}%` : '0%',
              background: `linear-gradient(90deg, ${avatar.color}, #00d4ff)`,
              boxShadow: `0 0 12px ${avatar.color}`,
            }}/>
        </div>

        {/* Volume — projected vs done */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-black/30 border-l-2 border-pink-500/50 px-3 py-2">
            <div className="text-[8px] font-mono text-gray-500 tracking-widest">VOLUME_PROJETADO</div>
            <div className="text-base font-bold font-mono text-pink-300">{(stats.volProj/1000).toFixed(1)}<span className="text-[10px] text-gray-600 ml-1">t</span></div>
          </div>
          <div className="bg-black/30 border-l-2 border-emerald-500/50 px-3 py-2">
            <div className="text-[8px] font-mono text-gray-500 tracking-widest">VOLUME_EXECUTADO</div>
            <div className="text-base font-bold font-mono text-emerald-300">{(stats.volExec/1000).toFixed(1)}<span className="text-[10px] text-gray-600 ml-1">t</span></div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={copiarDeSemanaAnterior}
            className="bg-black border border-cyan-700/50 hover:border-cyan-400 text-cyan-300 py-2 font-mono text-[10px] tracking-widest cy-lift">
            ↳ COPIAR_SEMANA_ANTERIOR
          </button>
          <button onClick={async () => { if (await dialog.confirm('Apagar todos planos atribuídos esta semana?', { destructive: true, okLabel: 'ZERAR' })) limparSemana(); }}
            className="bg-black border border-red-800/50 hover:border-red-500 text-red-400 py-2 font-mono text-[10px] tracking-widest cy-lift">
            ✕ ZERAR_SEMANA
          </button>
        </div>
      </TiltCard>

      {/* Muscle distribution for the week (executed) */}
      {Object.keys(stats.muscleVol).length > 0 && (
        <Card glow="cyan" className="p-4">
          <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-2">{'> '}MÚSCULOS_TRABALHADOS_NA_SEMANA</div>
          <div className="space-y-1.5">
            {Object.entries(stats.muscleVol).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([m, v]) => {
              const max = Math.max(...Object.values(stats.muscleVol), 1);
              const pct = (v / max) * 100;
              return (
                <div key={m}>
                  <div className="flex justify-between text-[10px] font-mono mb-0.5">
                    <span className="text-gray-300">{MUSCLE_LABELS[m] || m}</span>
                    <span style={{ color: avatar.color }}>{v.toLocaleString('pt-BR')}kg</span>
                  </div>
                  <div className="h-1.5 bg-black border border-cyan-900/30">
                    <div className="h-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${avatar.color}, #00d4ff)`, boxShadow: `0 0 6px ${avatar.color}` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Help — moved below the meat */}
      <Card glow="pink" className="p-4">
        <HelpBox color="pink">
          <strong>Como usar:</strong> toque num dia para ver/escolher um plano. Dias <span className="text-emerald-400">verdes</span> têm treino executado. <span className="text-pink-400">Rosa</span> = agendado para o futuro.
        </HelpBox>
      </Card>

      <Card glow="cyan" className="p-4">
        <div className="flex justify-between items-center mb-3">
          <button onClick={() => setSemanaOffset(s => s - 1)} className="text-cyan-400 p-1 hover:bg-cyan-500/10">‹ Anterior</button>
          <div className="text-center">
            <div className="text-[10px] font-mono text-gray-500">SEMANA</div>
            <div className="text-sm font-bold text-cyan-200 font-mono">
              {dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} → {dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </div>
          </div>
          <button onClick={() => setSemanaOffset(s => s + 1)} className="text-cyan-400 p-1 hover:bg-cyan-500/10">Próxima ›</button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {dias.map((d, i) => {
            const plano = planoNoDia(d);
            const treino = treinoNoDia(d);
            const isHoje = dataIso(d) === hojeIso;
            const noPassado = d < new Date(hojeIso);
            let bgClass = 'bg-black/40 border-gray-800';
            if (treino) bgClass = 'bg-emerald-500/15 border-emerald-500';
            else if (plano && !noPassado) bgClass = 'bg-pink-500/15 border-pink-500';
            else if (plano && noPassado) bgClass = 'bg-gray-700/20 border-gray-700';
            return (
              <button key={i} onClick={() => setDiaSelecionado(d)}
                className={`border ${bgClass} ${isHoje ? 'ring-2 ring-cyan-400' : ''} aspect-square flex flex-col items-center justify-center hover:border-cyan-400 transition p-1`}>
                <div className="text-[9px] font-mono text-gray-500">{DIAS[d.getDay()]}</div>
                <div className={`text-base font-bold font-mono ${isHoje ? 'text-cyan-300' : 'text-cyan-100'}`}>
                  {d.getDate()}
                </div>
                {treino && <Check size={10} className="text-emerald-400"/>}
                {plano && !treino && <div className="text-[7px] font-mono text-pink-300 truncate w-full text-center">{plano.nome.slice(0, 6)}</div>}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-1 mt-3 text-[9px] font-mono">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500"/><span className="text-gray-500">EXECUTADO</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-pink-500"/><span className="text-gray-500">AGENDADO</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-cyan-400 ring-1 ring-cyan-400"/><span className="text-gray-500">HOJE</span></div>
        </div>
      </Card>

      {diaSelecionado && (
        <Card glow="pink" className="p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="text-[10px] font-mono text-pink-500 tracking-widest">{'> '}DIA_SELECIONADO</div>
              <div className="text-base font-bold text-pink-200">
                {DIAS_LONG[diaSelecionado.getDay()]} · {diaSelecionado.toLocaleDateString('pt-BR')}
              </div>
            </div>
            <button onClick={() => setDiaSelecionado(null)} className="text-gray-500"><X size={16}/></button>
          </div>

          {treinoNoDia(diaSelecionado) ? (
            <div className="bg-emerald-500/10 border-l-2 border-emerald-500 px-3 py-2">
              <div className="flex items-center gap-2 mb-1"><Check size={14} className="text-emerald-400"/><span className="text-sm text-emerald-300 font-bold">Treino executado</span></div>
              <div className="text-xs text-gray-400">{treinoNoDia(diaSelecionado).treino}</div>
            </div>
          ) : (
            <>
              {planoNoDia(diaSelecionado) ? (
                <div className="mb-3">
                  <div className="text-[10px] font-mono text-gray-500 mb-1">PLANO_AGENDADO:</div>
                  <div className="bg-pink-500/10 border-l-2 border-pink-500 px-3 py-2 mb-2">
                    <div className="text-sm text-pink-200 font-bold">{planoNoDia(diaSelecionado).nome}</div>
                    <div className="text-[10px] text-gray-400">{planoNoDia(diaSelecionado).descricao}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dataIso(diaSelecionado) === hojeIso && (
                      <button onClick={() => {
                        const p = planoNoDia(diaSelecionado);
                        setSessaoAtiva({
                          data: new Date().toISOString(),
                          treino: p.nome, planoId: p.id,
                          exercicios: p.exercicios.map(e => ({
                            nome: e.nome, seriesAlvo: e.series, repsAlvo: e.reps,
                            descansoAlvo: e.descanso_seg, obs: e.obs,
                            series: Array.from({ length: e.series }, () => ({ peso: '', reps: '' })),
                          })),
                        });
                      }}
                        className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-black py-2 font-mono text-xs font-bold tracking-wider">
                        ▶ INICIAR
                      </button>
                    )}
                    <button onClick={() => removerPlano(diaSelecionado)}
                      className={`bg-black border border-red-700 hover:border-red-400 text-red-400 py-2 font-mono text-xs tracking-wider ${dataIso(diaSelecionado) !== hojeIso ? 'col-span-2' : ''}`}>
                      ✕ REMOVER
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 mb-3 font-mono">// nenhum plano atribuído //</div>
              )}

              <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-2">ATRIBUIR PLANO:</div>
              {planos.length === 0 ? (
                <p className="text-xs text-gray-500 font-mono">Você ainda não tem planos. Vá em TREINOS &gt; MONTADOR.</p>
              ) : (
                <div className="space-y-1">
                  {planos.map(p => (
                    <button key={p.id} onClick={() => atribuirPlano(diaSelecionado, p.id)}
                      className="w-full text-left bg-black border border-cyan-900/40 hover:border-cyan-400 px-3 py-2 transition">
                      <div className="text-sm text-cyan-200">{p.nome}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{p.exercicios.length} ex · {p.descricao}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ABA CORPO — agora com hologram 3D real
// ═══════════════════════════════════════════════════════════════
function AbaCorpo({ forcas, volumeSemanal, historico, perfil }) {
  const [modo, setModo] = useState('forca');
  const [musculoSel, setMusculoSel] = useState(null);
  const holoRef = useRef(null);
  const inspectorRef = useRef(null);

  // Esc closes inspector
  useKeyboardShortcuts(useMemo(() => ({
    Escape: () => setMusculoSel(null),
  }), []));

  const highlights = useMemo(
    () => modo === 'forca' ? highlightsFromForca(forcas) : highlightsFromVolume(volumeSemanal),
    [modo, forcas, volumeSemanal]
  );

  function handleSelect(zoneId) {
    if (!zoneId) { setMusculoSel(null); return; }
    setMusculoSel(HOLO_TO_ARTIFACT[zoneId] || null);
  }

  // Auto-scroll inspector into view when a muscle is selected
  useEffect(() => {
    if (musculoSel && inspectorRef.current) {
      setTimeout(() => {
        inspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [musculoSel]);

  const exsDoMusculo = useMemo(() => {
    if (!musculoSel) return [];
    return Object.entries(STRENGTH_STANDARDS)
      .filter(([_, info]) => info.muscles.includes(musculoSel))
      .map(([nome]) => nome);
  }, [musculoSel]);

  const prsDoMusculo = useMemo(() => {
    if (!musculoSel) return [];
    const prs = {};
    historico.forEach(s => s.exercicios.forEach(ex => {
      if (!exsDoMusculo.includes(ex.nome)) return;
      ex.series.forEach(sr => {
        if (!sr.peso || !sr.reps) return;
        const o = calcular1RM(sr.peso, sr.reps);
        if (!prs[ex.nome] || o > prs[ex.nome].oneRM) prs[ex.nome] = { oneRM: o, peso: sr.peso, reps: sr.reps };
      });
    }));
    return Object.entries(prs).map(([nome, d]) => ({
      nome, ...d, nivel: classificarForca(nome, d.oneRM, perfil.peso, perfil.sexo),
    }));
  }, [musculoSel, exsDoMusculo, historico, perfil]);

  return (
    <div className="space-y-4">
      <Card glow="cyan" className="p-4">
        <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-1">{'> '}HOLO_MAP_3D</div>
        <p className="text-xs text-gray-400 mb-3">Holograma 3D anatômico. Arraste para girar, scroll para zoom.</p>

        <HelpBox>
          <strong>FORÇA</strong>: cor mostra seu nível em cada músculo (vermelho = iniciante → azul = elite). <strong>VOLUME 7D</strong>: cor mostra quanto você trabalhou cada músculo nos últimos 7 dias.
        </HelpBox>

        <div className="grid grid-cols-2 gap-1 my-3 bg-black border border-cyan-900">
          <button onClick={() => setModo('forca')}
            className={`py-2 text-[10px] font-mono ${modo==='forca' ? 'bg-cyan-500 text-black font-bold' : 'text-cyan-500'}`}>FORÇA</button>
          <button onClick={() => setModo('volume')}
            className={`py-2 text-[10px] font-mono ${modo==='volume' ? 'bg-pink-500 text-black font-bold' : 'text-pink-500'}`}>VOLUME 7D</button>
        </div>

        <div className="grid grid-cols-5 gap-1 mb-2">
          {[['front','FRENTE'],['back','COSTAS'],['left','ESQ'],['right','DIR'],['reset','RESET']].map(([k,l]) => (
            <button key={k} onClick={() => k==='reset' ? holoRef.current?.resetCamera() : holoRef.current?.gotoView(k)}
              className="py-1.5 text-[9px] font-mono bg-black border border-cyan-900 hover:border-cyan-500 text-cyan-400 tracking-wider">
              {l}
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-b from-black via-cyan-950/10 to-black border border-cyan-900/50 mx-auto relative w-full h-[420px] sm:h-[520px]">
          <HoloBody3D ref={holoRef} highlights={highlights} onSelect={handleSelect}/>
        </div>

        <div className="mt-4">
          {modo === 'forca' ? (
            <div className="grid grid-cols-5 gap-1 text-[9px] font-mono">
              {Object.entries(NIVEL_COLORS).map(([n, c]) => (
                <div key={n} className="flex items-center gap-1">
                  <div className="w-2 h-2" style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }}/>
                  <span className="text-gray-400">{NIVEL_LABELS_SHORT[n]}</span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="flex h-2 mb-1">
                {['#7d1577','#c4188e','#ff2eaa','#ff5fcc','#00d4ff'].map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: c }}/>
                ))}
              </div>
              <div className="flex justify-between text-[9px] font-mono text-gray-500">
                <span>POUCO</span><span>VOLUME 7D</span><span>MUITO</span>
              </div>
            </div>
          )}
          <p className="text-[9px] font-mono text-gray-600 mt-2">{'>'} CLIQUE NUM MÚSCULO PARA DETALHES · DUPLO CLIQUE PARA ZOOM</p>
        </div>
      </Card>

      {modo === 'volume' && Object.keys(volumeSemanal).length > 0 && (
        <Card glow="pink" className="p-4">
          <div className="text-[10px] font-mono text-pink-500 tracking-widest mb-2">{'> '}MÚSCULOS_TRABALHADOS_SEMANA</div>
          <div className="space-y-2">
            {Object.entries(volumeSemanal).sort((a, b) => b[1] - a[1]).map(([m, v]) => {
              const max = Math.max(...Object.values(volumeSemanal), 1);
              const pct = (v / max) * 100;
              return (
                <div key={m}>
                  <div className="flex justify-between text-[10px] font-mono mb-0.5">
                    <span className="text-gray-300">{MUSCLE_LABELS[m] || m}</span>
                    <span className="text-pink-300">{v.toLocaleString('pt-BR')}kg</span>
                  </div>
                  <div className="h-1.5 bg-black border border-pink-900/30">
                    <div className="h-full bg-gradient-to-r from-pink-600 to-cyan-500" style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {musculoSel && (
        <div ref={inspectorRef}>
        <Card glow="cyan" className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-cyan-300 font-mono">▣ {(MUSCLE_LABELS[musculoSel] || musculoSel).toUpperCase()}</h3>
            <button onClick={() => setMusculoSel(null)} className="text-cyan-700 hover:text-cyan-400"><X size={16}/></button>
          </div>

          {forcas[musculoSel] && (
            <div className="mb-3 px-3 py-2" style={{
              backgroundColor: NIVEL_COLORS[forcas[musculoSel]] + '15',
              borderLeft: `2px solid ${NIVEL_COLORS[forcas[musculoSel]]}`,
            }}>
              <div className="text-[9px] font-mono text-gray-500">SEU NÍVEL</div>
              <div className="font-bold font-mono tracking-widest" style={{ color: NIVEL_COLORS[forcas[musculoSel]] }}>
                {nivelLabel(getAvatar().ns, forcas[musculoSel])}
              </div>
            </div>
          )}

          {volumeSemanal[musculoSel] > 0 && (
            <div className="mb-3 px-3 py-2 bg-pink-500/10 border-l-2 border-pink-500">
              <div className="text-[9px] font-mono text-gray-500">VOLUME ÚLT 7 DIAS</div>
              <div className="font-bold font-mono text-pink-300">{volumeSemanal[musculoSel].toLocaleString('pt-BR')} kg</div>
            </div>
          )}

          <h4 className="text-[10px] font-mono tracking-widest text-cyan-500 mb-2">{'>'} SEUS_PRS</h4>
          {prsDoMusculo.length === 0 ? (
            <p className="text-xs text-gray-500 font-mono">// sem registros para este músculo //</p>
          ) : (
            <div className="space-y-1.5">
              {prsDoMusculo.map(pr => (
                <div key={pr.nome} className="bg-black/50 border border-cyan-900/40 px-3 py-2 flex justify-between items-center">
                  <div>
                    <div className="text-sm text-cyan-100">{pr.nome}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{pr.peso}kg × {pr.reps} → 1RM est. {pr.oneRM}kg</div>
                  </div>
                  {pr.nivel && (
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5" style={{
                      backgroundColor: NIVEL_COLORS[pr.nivel] + '25',
                      color: NIVEL_COLORS[pr.nivel],
                      border: `1px solid ${NIVEL_COLORS[pr.nivel]}`,
                    }}>
                      {NIVEL_LABELS_SHORT[pr.nivel]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ABA PERFIL
// ═══════════════════════════════════════════════════════════════
function AbaPerfil({ perfil, setPerfil, historico, setHistorico, pesosCorporais, setPesosCorporais, planos, dieta, setDieta }) {
  const [view, setView] = useState('dados');
  return (
    <div className="space-y-4">
      <Card glow="cyan" className="p-4">
        <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-1">{'> '}PERFIL</div>
        <p className="text-xs text-gray-400 mb-3">Seus dados, dieta calculada e gráficos de progresso.</p>
        <div className="grid grid-cols-3 gap-1 bg-black border border-cyan-900">
          {[['dados','DADOS'],['dieta','DIETA'],['progresso','PROGRESSO']].map(([k,l]) => (
            <button key={k} onClick={() => setView(k)}
              className={`py-2 text-[10px] font-mono ${view===k ? 'bg-cyan-500 text-black font-bold' : 'text-cyan-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </Card>

      {view === 'dados' && <ViewDadosPessoais perfil={perfil} setPerfil={setPerfil} historico={historico} setHistorico={setHistorico} setPesosCorporais={setPesosCorporais}/>}
      {view === 'dieta' && <ViewDieta perfil={perfil} dieta={dieta} setDieta={setDieta}/>}
      {view === 'progresso' && <ViewProgresso historico={historico} pesosCorporais={pesosCorporais} setPesosCorporais={setPesosCorporais}/>}
    </div>
  );
}

function ViewDadosPessoais({ perfil, setPerfil, historico, setHistorico, setPesosCorporais }) {
  const dialog = useDialog();
  const [tmp, setTmp] = useState(perfil);
  function salvar() { setPerfil(tmp); dialog.toast('Perfil salvo.', 'success'); }
  async function reset() {
    if (!await dialog.confirm('APAGAR TUDO? Sem volta.\nIsto remove perfil, histórico, pesos, planos e agenda.', { destructive: true, okLabel: 'APAGAR TUDO' })) return;
    setHistorico([]); setPesosCorporais([]);
    const def = { nome: '', sexo: 'M', peso: 75, altura: 175, idade: 25, objetivo: 'hipertrofia', atividade: 1.55 };
    setPerfil(def); setTmp(def);
    dialog.toast('Tudo apagado.', 'warn');
  }
  function exportar() {
    const dados = { perfil, historico, exportadoEm: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gym-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <Card glow="cyan" className="p-5 space-y-3">
        <FieldCyber label="NOME">
          <input type="text" value={tmp.nome} onChange={e => setTmp({...tmp, nome: e.target.value})} className="cy-input"/>
        </FieldCyber>
        <div className="grid grid-cols-2 gap-3">
          <FieldCyber label="SEXO">
            <select value={tmp.sexo} onChange={e => setTmp({...tmp, sexo: e.target.value})} className="cy-input">
              <option value="M">M</option><option value="F">F</option>
            </select>
          </FieldCyber>
          <FieldCyber label="IDADE">
            <input type="number" value={tmp.idade} onChange={e => setTmp({...tmp, idade: Number(e.target.value)})} className="cy-input"/>
          </FieldCyber>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldCyber label="PESO_KG">
            <input type="number" step="0.1" value={tmp.peso} onChange={e => setTmp({...tmp, peso: Number(e.target.value)})} className="cy-input"/>
          </FieldCyber>
          <FieldCyber label="ALTURA_CM">
            <input type="number" value={tmp.altura} onChange={e => setTmp({...tmp, altura: Number(e.target.value)})} className="cy-input"/>
          </FieldCyber>
        </div>
        <FieldCyber label="OBJETIVO">
          <select value={tmp.objetivo} onChange={e => setTmp({...tmp, objetivo: e.target.value})} className="cy-input">
            <option value="hipertrofia">HIPERTROFIA</option>
            <option value="forca">FORÇA</option>
            <option value="cutting">CUTTING</option>
            <option value="bulking">BULKING</option>
            <option value="manutencao">MANUTENÇÃO</option>
          </select>
        </FieldCyber>
        <FieldCyber label="NÍVEL_ATIVIDADE">
          <select value={tmp.atividade} onChange={e => setTmp({...tmp, atividade: Number(e.target.value)})} className="cy-input">
            <option value={1.2}>SEDENTÁRIO</option>
            <option value={1.375}>LEVE (1-3x/sem)</option>
            <option value={1.55}>MODERADO (3-5x/sem)</option>
            <option value={1.725}>INTENSO (6-7x/sem)</option>
            <option value={1.9}>ATLETA (2x/dia)</option>
          </select>
        </FieldCyber>
        <button onClick={salvar} className="w-full bg-gradient-to-r from-cyan-500 to-pink-500 text-black py-3 font-mono text-sm font-bold tracking-wider"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
          ▣ SALVAR
        </button>
      </Card>

      <Card glow="pink" className="p-5">
        <div className="text-[10px] font-mono text-pink-500 tracking-widest mb-2">{'> '}DADOS</div>
        <button onClick={exportar} className="w-full bg-black border border-cyan-900 hover:border-cyan-500 text-cyan-400 py-2 text-xs font-mono mb-2 tracking-wider">▼ EXPORTAR.JSON</button>
        <button onClick={reset} className="w-full bg-black border border-red-900 hover:border-red-500 text-red-400 py-2 text-xs font-mono tracking-wider">✕ APAGAR_TUDO</button>
      </Card>

      <style>{`.cy-input{width:100%;background:#000;border:1px solid #164e63;padding:8px 12px;font-family:monospace;font-size:13px;color:#a5f3fc;outline:none}.cy-input:focus{border-color:#06b6d4}`}</style>
    </>
  );
}

function FieldCyber({ label, children }) {
  return (
    <label className="block">
      <span className="text-[9px] font-mono text-cyan-500 tracking-widest">{'>'} {label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ViewDieta({ perfil, dieta, setDieta }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const tmb = useMemo(() => calcularTMB(perfil.peso, perfil.altura, perfil.idade, perfil.sexo), [perfil]);
  const tdee = useMemo(() => calcularGastoTotal(tmb, perfil.atividade), [tmb, perfil.atividade]);
  const calorias = useMemo(() => {
    if (perfil.objetivo === 'cutting') return Math.round(tdee * 0.8);
    if (perfil.objetivo === 'bulking') return Math.round(tdee * 1.1);
    return tdee;
  }, [tdee, perfil.objetivo]);
  const macros = useMemo(() => calcularMacros(calorias, perfil.peso, perfil.objetivo), [calorias, perfil.peso, perfil.objetivo]);

  const isCustom = !!(dieta && dieta.length);
  const meals = isCustom ? dieta : DEFAULT_MEALS;

  // Compute kcal/macros per meal based on its kcalPct
  const refeicoes = useMemo(() => meals.map((m) => {
    const pct = Number(m.kcalPct) || 0;
    return {
      ...m,
      kcal: Math.round(calorias * pct),
      p: Math.round(macros.proteina * pct),
      c: Math.round(macros.carbo * pct),
      g: Math.round(macros.gordura * pct),
    };
  }), [meals, calorias, macros]);

  const totalPlanned = refeicoes.reduce((a, r) => a + r.kcal, 0);

  return (
    <>
      <HelpBox color="yellow">
        <strong>Como é calculado:</strong> TMB pela fórmula Mifflin-St Jeor. Gasto = TMB × atividade. Cutting -20%, bulking +10%. Proteína {perfil.objetivo === 'cutting' ? '2.4' : perfil.objetivo === 'bulking' ? '2.0' : '1.8'}g/kg, gordura 25-30%, resto carbo.
      </HelpBox>

      <Card glow="green" className="p-5">
        <div className="text-[10px] font-mono text-emerald-500 tracking-widest mb-3">{'> '}NUTRI_PROTOCOL</div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCyber label="KCAL/DIA" value={calorias} cor="#00ff9f"/>
          <StatCyber label="OBJETIVO" value={perfil.objetivo.toUpperCase()} cor="#ff2eaa" textOnly/>
          <StatCyber label="TMB" value={Math.round(tmb)} cor="#00d4ff"/>
          <StatCyber label="TDEE" value={tdee} cor="#00d4ff"/>
        </div>
        <div className="text-[10px] font-mono tracking-widest text-emerald-500 mb-2">{'> '}MACROS</div>
        <div className="grid grid-cols-3 gap-2">
          <MacroCard label="PROT" valor={macros.proteina} cor="#ff2eaa" pct={Math.round((macros.proteina*4/calorias)*100)}/>
          <MacroCard label="CARB" valor={macros.carbo} cor="#ffdd00" pct={Math.round((macros.carbo*4/calorias)*100)}/>
          <MacroCard label="GORD" valor={macros.gordura} cor="#00d4ff" pct={Math.round((macros.gordura*9/calorias)*100)}/>
        </div>
      </Card>

      <Card glow="cyan" className="p-5">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-cyan-500 tracking-widest">
              {'> '}{isCustom ? 'REFEIÇÕES_PERSONALIZADAS' : 'REFEIÇÕES_SUGERIDAS'}
            </div>
            <div className="text-[9px] font-mono text-gray-600 mt-0.5">
              {meals.length} refeições · {totalPlanned} / {calorias} kcal planejadas
              {totalPlanned !== calorias && (
                <span className="ml-1 text-yellow-400">⚠ {totalPlanned > calorias ? '+' : ''}{totalPlanned - calorias}</span>
              )}
            </div>
          </div>
          <button onClick={() => setEditorOpen(true)}
            className="bg-black border border-cyan-700 hover:border-cyan-400 text-cyan-300 px-3 py-1.5 font-mono text-[10px] tracking-widest cy-lift flex-shrink-0">
            <Edit2 size={11} className="inline mr-1"/> EDITAR
          </button>
        </div>
        <div className="space-y-2">
          {refeicoes.map((r, i) => (
            <div key={r.id || i} className="bg-black/50 border-l-2 border-cyan-500/50 px-3 py-2.5">
              <div className="flex justify-between items-start mb-1 gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-cyan-100 text-sm truncate">{r.nome}</div>
                  <div className="text-[10px] font-mono text-gray-500">{r.horario} · {Math.round((r.kcalPct || 0) * 100)}%</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-emerald-400 font-bold font-mono text-sm">{r.kcal}</div>
                  <div className="text-[9px] font-mono text-gray-500">P{r.p}·C{r.c}·G{r.g}</div>
                </div>
              </div>
              {r.itens.length > 0 ? (
                <ul className="text-[11px] text-gray-400 space-y-0.5 font-mono">
                  {r.itens.map((it, idx) => <li key={idx} className="flex"><span className="text-cyan-600 mr-1.5">▸</span>{it}</li>)}
                </ul>
              ) : (
                <div className="text-[10px] text-gray-600 italic font-mono">// sem itens — clique EDITAR</div>
              )}
            </div>
          ))}
        </div>
        {isCustom && (
          <button onClick={() => { if (confirm('Resetar pra refeições padrão?')) setDieta(null); }}
            className="mt-3 w-full bg-black border border-yellow-700/50 hover:border-yellow-500 text-yellow-400 py-2 font-mono text-[10px] tracking-widest"
            data-snd-click="0">
            ↺ VOLTAR_AO_PADRÃO
          </button>
        )}
      </Card>

      <DietEditor open={editorOpen} dieta={dieta || DEFAULT_MEALS} onClose={() => setEditorOpen(false)} onSave={setDieta}/>
    </>
  );
}

function StatCyber({ label, value, cor, textOnly }) {
  return (
    <div className="bg-black/60 border border-gray-800 px-3 py-2.5">
      <div className="text-[9px] font-mono text-gray-500 tracking-widest">{label}</div>
      <div className={`font-bold font-mono mt-0.5 ${textOnly ? 'text-sm' : 'text-lg'}`} style={{ color: cor, textShadow: `0 0 8px ${cor}80` }}>{value}</div>
    </div>
  );
}

function MacroCard({ label, valor, cor, pct }) {
  return (
    <div className="bg-black/60 border border-gray-800 px-2 py-2 text-center">
      <div className="h-0.5 mb-1" style={{ backgroundColor: cor, boxShadow: `0 0 6px ${cor}` }}/>
      <div className="text-[9px] font-mono text-gray-500">{label}</div>
      <div className="text-base font-bold font-mono" style={{ color: cor }}>{valor}g</div>
      <div className="text-[8px] font-mono text-gray-600">{pct}%</div>
    </div>
  );
}

function ViewProgresso({ historico, pesosCorporais, setPesosCorporais }) {
  const [novoPeso, setNovoPeso] = useState('');
  const [exSel, setExSel] = useState('');
  const [periodo, setPeriodo] = useState('30');

  const exsFeitos = useMemo(() => {
    const set = new Set();
    historico.forEach(s => s.exercicios.forEach(ex => set.add(ex.nome)));
    return [...set].sort();
  }, [historico]);

  useEffect(() => { if (!exSel && exsFeitos.length > 0) setExSel(exsFeitos[0]); }, [exsFeitos, exSel]);

  const cutoff = periodo === 'all' ? 0 : Date.now() - Number(periodo) * 24 * 60 * 60 * 1000;

  const evolucao = useMemo(() => {
    if (!exSel) return [];
    return historico
      .filter(s => new Date(s.data).getTime() >= cutoff)
      .map(s => {
        const ex = s.exercicios.find(e => e.nome === exSel);
        if (!ex) return null;
        const oneRM = Math.max(...ex.series.map(sr => calcular1RM(Number(sr.peso) || 0, Number(sr.reps) || 0)));
        return {
          data: new Date(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          oneRM, volume: volumeExercicio(ex), ts: new Date(s.data).getTime(),
        };
      })
      .filter(Boolean).sort((a, b) => a.ts - b.ts);
  }, [historico, exSel, cutoff]);

  const volumePorSessao = historico
    .filter(s => new Date(s.data).getTime() >= cutoff)
    .map(s => ({
      data: new Date(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      volume: volumeSessao(s), ts: new Date(s.data).getTime(),
    })).sort((a, b) => a.ts - b.ts);

  const prsTop = useMemo(() => {
    const prs = {};
    historico.forEach(s => s.exercicios.forEach(ex => ex.series.forEach(sr => {
      if (!sr.peso || !sr.reps) return;
      const o = calcular1RM(sr.peso, sr.reps);
      if (!prs[ex.nome] || o > prs[ex.nome]) prs[ex.nome] = o;
    })));
    return Object.entries(prs).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [historico]);

  const pesosChart = pesosCorporais.slice(-30).map(p => ({
    data: new Date(p.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    peso: p.peso,
  }));

  function addPeso() {
    if (!novoPeso) return;
    setPesosCorporais([...pesosCorporais, { data: new Date().toISOString(), peso: Number(novoPeso) }]);
    setNovoPeso('');
  }

  return (
    <>
      <HelpBox>
        <strong>1RM estimado</strong> é o peso máximo que você conseguiria numa única repetição (calculado pela fórmula de Epley a partir das suas séries). É o melhor indicador de evolução de força.
      </HelpBox>

      <Card glow="cyan" className="p-4">
        <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-2">{'> '}EVOLUÇÃO_POR_EXERCÍCIO</div>
        <select value={exSel} onChange={e => setExSel(e.target.value)}
          className="w-full bg-black border border-cyan-900 focus:border-cyan-500 px-3 py-2 text-xs font-mono text-cyan-100 outline-none mb-2">
          {exsFeitos.length === 0 ? <option>// sem exercícios //</option> : exsFeitos.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[['7','7D'],['30','30D'],['90','90D'],['all','TUDO']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriodo(v)}
              className={`py-1.5 text-[10px] font-mono ${periodo===v ? 'bg-cyan-500 text-black font-bold' : 'bg-black border border-cyan-900 text-cyan-500'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="text-[10px] font-mono text-cyan-500 mb-1">{'> '}1RM_ESTIMADO</div>
        {evolucao.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-gray-600 font-mono">// sem dados //</div>
        ) : (
          <CyberLine data={evolucao} dataKey="oneRM" color="#00d4ff" height={160} unit="kg"/>
        )}
        {evolucao.length > 0 && (
          <>
            <div className="text-[10px] font-mono text-pink-500 mb-1 mt-3">{'> '}VOLUME_POR_SESSÃO</div>
            <CyberBar data={evolucao} dataKey="volume" color="#ff2eaa" height={140} unit="kg"/>
          </>
        )}
      </Card>

      <Card glow="cyan" className="p-4">
        <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-2">{'> '}VOLUME_GERAL</div>
        {volumePorSessao.length === 0 ? (
          <p className="text-xs text-gray-500 font-mono text-center py-6">// sem treinos //</p>
        ) : (
          <CyberLine data={volumePorSessao} dataKey="volume" color="#00d4ff" height={160} unit="kg"/>
        )}
      </Card>

      <Card glow="green" className="p-4">
        <div className="text-[10px] font-mono text-emerald-500 tracking-widest mb-3">{'> '}STREAK_HEATMAP_26W</div>
        <StreakHeatmap historico={historico} color={getAvatar().color}/>
      </Card>

      <Card glow="green" className="p-4">
        <div className="text-[10px] font-mono text-emerald-500 tracking-widest mb-2">{'> '}PESO_CORPORAL</div>
        <div className="flex gap-2 mb-3">
          <input type="number" inputMode="decimal" step="0.1" placeholder="// peso atual" value={novoPeso}
            onChange={e => setNovoPeso(e.target.value)}
            className="flex-1 bg-black border border-emerald-900 focus:border-emerald-500 px-3 py-2 text-xs font-mono text-emerald-100 outline-none"/>
          <button onClick={addPeso} className="bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500 px-4">
            <Plus size={14} className="text-emerald-400"/>
          </button>
        </div>
        {pesosChart.length === 0 ? (
          <p className="text-xs text-gray-500 font-mono text-center py-4">// registre seu peso //</p>
        ) : (
          <CyberLine data={pesosChart} dataKey="peso" color="#00ff9f" height={160} unit="kg"/>
        )}
      </Card>

      <Card glow="pink" className="p-4">
        <div className="text-[10px] font-mono text-pink-500 tracking-widest mb-2">{'> '}TOP_PRS</div>
        {prsTop.length === 0 ? (
          <p className="text-xs font-mono text-center py-4 italic" style={{ color: getAvatar().color, opacity: 0.85 }}>{emptyQuote(getAvatar().ns, 'prs')}</p>
        ) : (
          <div className="space-y-1.5">
            {prsTop.map(([nome, pr], i) => (
              <div key={nome} className="bg-black/50 border border-pink-900/30 px-3 py-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-pink-600">#{String(i+1).padStart(2,'0')}</span>
                  <span className="text-sm text-cyan-100">{nome}</span>
                </div>
                <div className="font-mono text-pink-300 font-bold">{pr}<span className="text-[10px] text-gray-500 ml-1">kg</span></div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* HISTÓRICO — moved here from TREINOS sub-tabs */}
      <Card glow="cyan" className="p-4">
        <div className="text-[10px] font-mono text-cyan-500 tracking-widest mb-2">{'> '}HISTÓRICO_DE_SESSÕES</div>
        <ViewHistorico historico={historico}/>
      </Card>
    </>
  );
}
