// The avatar chosen in the boot intro. Persisted to localStorage by /index.html.
// Falls back to ichigo.vasto_lorde if the user bookmarked /app.html and never saw the intro.

const AVATARS = {
  aatrox:  { ns: 'aatrox', fn: 'darkin_protocol',   label: 'DARKIN',    color: '#ff2056' },
  druid:   { ns: 'druid',  fn: 'wildshape_kernel',  label: 'WILD',      color: '#3ddc84' },
  kratos:  { ns: 'kratos', fn: 'spartan_rage',      label: 'SPARTAN',   color: '#ffd60a' },
  gun:     { ns: 'gun',    fn: 'park_directive',    label: 'BIG_DEAL',  color: '#7ad9f0' },
  ichigo:  { ns: 'ichigo', fn: 'vasto_lorde',       label: 'HOLLOW',    color: '#ff5f8a' },
};

export function getAvatar() {
  let ns = 'ichigo', fn = 'vasto_lorde';
  try {
    ns = localStorage.getItem('avatar_ns') || ns;
    fn = localStorage.getItem('avatar_fn') || fn;
  } catch {}
  const meta = AVATARS[ns] || AVATARS.ichigo;
  return { ns, fn, label: meta.label, color: meta.color };
}

export const ALL_AVATARS = AVATARS;

// Persona-flavored telemetry strings used throughout the app.
// Mix of generic system events + avatar-specific lines that get a chance to fire more often
// when that avatar is bound.
export const PERSONA_EVENTS = {
  generic: [
    { msg: 'NEURAL_LINK_STABLE',           kind: 'info' },
    { msg: 'BIOMETRIC_SYNC ........ OK',   kind: 'success' },
    { msg: 'STRENGTH_DB_REINDEXED',        kind: 'info' },
    { msg: 'HOLO_PROJECTOR_OK',            kind: 'success' },
    { msg: 'GPU_SHADER_RECOMPILED',        kind: 'info' },
    { msg: 'TELEMETRY_HEARTBEAT',          kind: 'info' },
    { msg: 'ANATOMICAL_DRIFT 0.04%',       kind: 'info' },
    { msg: 'INDEX_INTEGRITY_PASS',         kind: 'success' },
  ],
  aatrox: [
    { msg: 'darkin.blade_pulse',           kind: 'info' },
    { msg: 'darkin.shard_count: 3',        kind: 'info' },
    { msg: 'aatrox.world_ender: dormant',  kind: 'info' },
    { msg: 'aatrox.bloodwell: 67%',        kind: 'warn' },
  ],
  druid: [
    { msg: 'druid.wildshape: form_locked',  kind: 'success' },
    { msg: 'druid.totem_pulse 5.2hz',       kind: 'info' },
    { msg: 'druid.moonfire: ready',         kind: 'info' },
    { msg: 'wildshape.bear_form: cached',   kind: 'info' },
  ],
  kratos: [
    { msg: 'kratos.spartan_rage: idle',     kind: 'info' },
    { msg: 'kratos.leviathan_axe: returned',kind: 'success' },
    { msg: 'spartan.kill_count: 0xFFFF',    kind: 'warn' },
    { msg: 'blades_of_chaos: chained',      kind: 'info' },
  ],
  gun: [
    { msg: 'gun.park: directive_received',  kind: 'info' },
    { msg: 'big_deal: handshake_ack',       kind: 'success' },
    { msg: 'gun.park: scan complete',       kind: 'info' },
    { msg: 'big_deal.protocol: enforced',   kind: 'info' },
    { msg: 'gun.park: target locked',       kind: 'warn' },
  ],
  ichigo: [
    { msg: 'ichigo.cero_charge: 7%',        kind: 'info' },
    { msg: 'hollow_mask: integrity_OK',     kind: 'success' },
    { msg: 'reiatsu_flow: nominal',         kind: 'info' },
    { msg: 'vasto_lorde: contained',        kind: 'warn' },
    { msg: 'getsuga_tensho: armed',         kind: 'info' },
  ],
};

// Persona-themed flavor text for empty states. Maps avatar.ns → { ctx: text }.
export const EMPTY_QUOTES = {
  aatrox: {
    planos:    '// the darkin slumbers. forge a routine to wake the blade.',
    historico: '// no kills logged. the bloodwell hungers.',
    prs:       '// no marks etched. the World Ender remembers nothing yet.',
    streak:    '// the blade rusts in stillness. swing.',
  },
  druid: {
    planos:    '// the grove is silent. plant a routine and let it grow.',
    historico: '// no shape taken yet. the wild waits.',
    prs:       '// no totem raised. record a feat.',
    streak:    '// the cycle has not begun. one moon at a time.',
  },
  kratos: {
    planos:    '// no oath sworn. the Spartan stands idle.',
    historico: '// no battle recorded. ΟΜΕΓΑ awaits.',
    prs:       '// no enemy fell. the leviathan axe sleeps.',
    streak:    '// rage cools. resume the campaign.',
  },
  gun: {
    planos:    '// no directive issued. big_deal handshake idle.',
    historico: '// no targets eliminated. log a session.',
    prs:       '// no records on file. break the silence.',
    streak:    '// no signal. the boss is watching.',
  },
  ichigo: {
    planos:    '// reiatsu unfocused. bind a routine.',
    historico: '// no resonance. cero unspent.',
    prs:       '// the hollow_mask is blank. forge a memory.',
    streak:    '// vasto_lorde dormant. break the chain to feed it.',
  },
};

export function emptyQuote(avatarNs, ctx) {
  return (EMPTY_QUOTES[avatarNs] || EMPTY_QUOTES.ichigo)[ctx] || '';
}

// Per-persona flavor strings used in toasts, greetings, and labels.
export const FLAVOR = {
  aatrox: {
    greet:    'awaken, mortal',
    save:     'kill logged · darkin satisfied',
    pr:       '▲ NEW MARK · the World Ender remembers',
    finalize: 'session_purged · bloodwell +1',
    cancel:   'session_aborted · darkin slumbers',
    workout:  'campaign_active',
    routine:  'darkin_protocol',
    section:  'aatrox.audit',
  },
  druid: {
    greet:    'the wild calls',
    save:     'form_anchored · grove remembers',
    pr:       '▲ NEW TOTEM · the cycle deepens',
    finalize: 'shape_released · roots stable',
    cancel:   'form_lost · regrowth pending',
    workout:  'wildshape_active',
    routine:  'wildshape_kernel',
    section:  'druid.grove',
  },
  kratos: {
    greet:    'BOY.',
    save:     'battle logged · ΟΜΕΓΑ acknowledges',
    pr:       '▲ NEW CONQUEST · the leviathan watches',
    finalize: 'session_ended · spartan endures',
    cancel:   'retreat · the gods will know',
    workout:  'campaign_active',
    routine:  'spartan_rage',
    section:  'kratos.audit',
  },
  gun: {
    greet:    'directive received',
    save:     'target eliminated · big_deal acknowledges',
    pr:       '▲ NEW RECORD · scope confirms',
    finalize: 'mission complete · returning to base',
    cancel:   'mission aborted · standby',
    workout:  'mission_active',
    routine:  'park_directive',
    section:  'gun.park.audit',
  },
  ichigo: {
    greet:    'reiatsu rising',
    save:     'cero spent · hollow satisfied',
    pr:       '▲ NEW LIMIT · vasto_lorde stirs',
    finalize: 'release_canceled · sealed',
    cancel:   'reiatsu retracted · sealed',
    workout:  'release_active',
    routine:  'vasto_lorde',
    section:  'ichigo.hollow',
  },
};

export function flavor(avatarNs, key) {
  return (FLAVOR[avatarNs] || FLAVOR.ichigo)[key] || '';
}

// Persona-flavored force level names. Default = generic Portuguese.
export const NIVEL_FLAVOR = {
  default: { iniciante: 'Iniciante', novato: 'Novato', intermediario: 'Intermediário', avancado: 'Avançado', elite: 'Elite' },
  aatrox:  { iniciante: 'Mortal',     novato: 'Acolyte',  intermediario: 'Blade-Bearer', avancado: 'Reaver',   elite: 'World Ender' },
  druid:   { iniciante: 'Sapling',    novato: 'Acolyte',  intermediario: 'Shapeshifter', avancado: 'Archdruid', elite: 'Avatar' },
  kratos:  { iniciante: 'Boy',        novato: 'Warrior',  intermediario: 'Champion',     avancado: 'Demigod',  elite: 'God-Slayer' },
  gun:     { iniciante: 'Civilian',   novato: 'Recruit',  intermediario: 'Operator',     avancado: 'S-Class',  elite: 'Big Deal' },
  ichigo:  { iniciante: 'Hollow',     novato: 'Shinigami','intermediario:': 'Bankai',    avancado: 'Vasto',    elite: 'Vasto Lorde' },
};
// Fix typo above (intermediario)
NIVEL_FLAVOR.ichigo.intermediario = 'Bankai';
delete NIVEL_FLAVOR.ichigo['intermediario:'];

export function nivelLabel(avatarNs, level) {
  return (NIVEL_FLAVOR[avatarNs] || NIVEL_FLAVOR.default)[level] || NIVEL_FLAVOR.default[level] || level;
}

// Persona-flavored hologram zone label. Falls back to default anatomical name.
const HOLO_ZONE_FLAVOR = {
  aatrox: {
    pectoralis_l: 'BLADE_ANCHOR_L',  pectoralis_r: 'BLADE_ANCHOR_R',
    biceps_l:     'REAVER_L',        biceps_r:     'REAVER_R',
    triceps_l:    'EXECUTOR_L',      triceps_r:    'EXECUTOR_R',
    lats_l:       'WING_L',          lats_r:       'WING_R',
    quad_l:       'FOOTHOLD_L',      quad_r:       'FOOTHOLD_R',
    abs:          'CORE_DARKIN',
  },
  druid: {
    pectoralis_l: 'OAK_BARK_L',      pectoralis_r: 'OAK_BARK_R',
    lats_l:       'WILD_WING_L',     lats_r:       'WILD_WING_R',
    quad_l:       'ROOT_L',          quad_r:       'ROOT_R',
    glutes_l:     'STRIDE_L',        glutes_r:     'STRIDE_R',
    abs:          'CORE_GROVE',
  },
  kratos: {
    pectoralis_l: 'AEGIS_L',         pectoralis_r: 'AEGIS_R',
    biceps_l:     'BLADE_ARM_L',     biceps_r:     'BLADE_ARM_R',
    triceps_l:    'AXE_GRIP_L',      triceps_r:    'AXE_GRIP_R',
    quad_l:       'STRIDE_L',        quad_r:       'STRIDE_R',
    abs:          'OMEGA_CORE',
  },
  gun: {
    pectoralis_l: 'PLATE_L',         pectoralis_r: 'PLATE_R',
    biceps_l:     'TRIGGER_L',       biceps_r:     'TRIGGER_R',
    triceps_l:    'BARREL_L',        triceps_r:    'BARREL_R',
    quad_l:       'STANCE_L',        quad_r:       'STANCE_R',
    abs:          'CORE_DIRECTIVE',
  },
  ichigo: {
    pectoralis_l: 'CERO_ORIGIN_L',   pectoralis_r: 'CERO_ORIGIN_R',
    biceps_l:     'ZANGETSU_GRIP_L', biceps_r:     'ZANGETSU_GRIP_R',
    triceps_l:    'GETSUGA_L',       triceps_r:    'GETSUGA_R',
    lats_l:       'HOLLOW_WING_L',   lats_r:       'HOLLOW_WING_R',
    quad_l:       'SHUNPO_L',        quad_r:       'SHUNPO_R',
    abs:          'HOLLOW_CORE',
  },
};

export function holoLabel(avatarNs, zoneId, fallback) {
  const map = HOLO_ZONE_FLAVOR[avatarNs];
  if (map && map[zoneId]) return map[zoneId];
  return fallback || zoneId.toUpperCase();
}

// Build a weighted event pool — bound avatar's events get extra weight.
export function eventPool(avatarNs) {
  const pool = [...PERSONA_EVENTS.generic];
  for (const key of Object.keys(PERSONA_EVENTS)) {
    if (key === 'generic') continue;
    const events = PERSONA_EVENTS[key];
    // Bound avatar gets 3x weight; others get 1x
    const weight = key === avatarNs ? 3 : 1;
    for (let i = 0; i < weight; i++) pool.push(...events);
  }
  return pool;
}
