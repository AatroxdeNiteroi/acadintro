// HOLO BODY 3D — GLB-based anatomical hologram
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ═══════════════════════════════════════════════════════════════
// MUSCLE DATABASE
// ═══════════════════════════════════════════════════════════════
const MUSCLES = {
  trapezius:        { name:'TRAPÉZIO',         latin:'m. trapezius',           group:'BACK',     force:4, vol7d:1800 },
  deltoid_l:        { name:'DELTÓIDE_E',       latin:'m. deltoideus',          group:'SHOULDER', force:5, vol7d:1800 },
  deltoid_r:        { name:'DELTÓIDE_D',       latin:'m. deltoideus',          group:'SHOULDER', force:5, vol7d:1800 },
  pectoralis_l:     { name:'PEITORAL_E',       latin:'m. pectoralis major',    group:'CHEST',    force:5, vol7d:2200 },
  pectoralis_r:     { name:'PEITORAL_D',       latin:'m. pectoralis major',    group:'CHEST',    force:5, vol7d:2200 },
  biceps_l:         { name:'BÍCEPS_BRAQUIAL_E',latin:'m. biceps brachii',      group:'ARM',      force:4, vol7d:1300 },
  biceps_r:         { name:'BÍCEPS_BRAQUIAL_D',latin:'m. biceps brachii',      group:'ARM',      force:4, vol7d:1300 },
  triceps_l:        { name:'TRÍCEPS_E',        latin:'m. triceps brachii',     group:'ARM',      force:4, vol7d:1500 },
  triceps_r:        { name:'TRÍCEPS_D',        latin:'m. triceps brachii',     group:'ARM',      force:4, vol7d:1500 },
  forearm_l:        { name:'ANTEBRAÇO_E',      latin:'mm. antebrachii',        group:'ARM',      force:3, vol7d:400 },
  forearm_r:        { name:'ANTEBRAÇO_D',      latin:'mm. antebrachii',        group:'ARM',      force:3, vol7d:400 },
  lats_l:           { name:'LATÍSSIMO_E',      latin:'m. latissimus dorsi',    group:'BACK',     force:5, vol7d:2400 },
  lats_r:           { name:'LATÍSSIMO_D',      latin:'m. latissimus dorsi',    group:'BACK',     force:5, vol7d:2400 },
  abs:              { name:'RETO_ABDOMINAL',   latin:'m. rectus abdominis',    group:'CORE',     force:3, vol7d:600 },
  obliques_l:       { name:'OBLÍQUO_E',        latin:'m. obliquus externus',   group:'CORE',     force:3, vol7d:400 },
  obliques_r:       { name:'OBLÍQUO_D',        latin:'m. obliquus externus',   group:'CORE',     force:3, vol7d:400 },
  erectors:         { name:'ERETOR_DA_ESPINHA',latin:'m. erector spinae',      group:'BACK',     force:4, vol7d:1400 },
  glutes_l:         { name:'GLÚTEO_E',         latin:'m. gluteus maximus',     group:'GLUTE',    force:5, vol7d:2800 },
  glutes_r:         { name:'GLÚTEO_D',         latin:'m. gluteus maximus',     group:'GLUTE',    force:5, vol7d:2800 },
  quad_l:           { name:'QUADRÍCEPS_E',     latin:'m. quadriceps femoris',  group:'LEG',      force:5, vol7d:2600 },
  quad_r:           { name:'QUADRÍCEPS_D',     latin:'m. quadriceps femoris',  group:'LEG',      force:5, vol7d:2600 },
  adductors_l:      { name:'ADUTORES_E',       latin:'mm. adductores',         group:'LEG',      force:3, vol7d:600 },
  adductors_r:      { name:'ADUTORES_D',       latin:'mm. adductores',         group:'LEG',      force:3, vol7d:600 },
  hamstring_l:      { name:'POSTERIOR_COXA_E', latin:'mm. ischiocrurales',     group:'LEG',      force:4, vol7d:1700 },
  hamstring_r:      { name:'POSTERIOR_COXA_D', latin:'mm. ischiocrurales',     group:'LEG',      force:4, vol7d:1700 },
  calf_l:           { name:'PANTURRILHA_E',    latin:'m. gastrocnemius',       group:'LEG',      force:4, vol7d:1100 },
  calf_r:           { name:'PANTURRILHA_D',    latin:'m. gastrocnemius',       group:'LEG',      force:4, vol7d:1100 },
  neck:             { name:'CERVICAL',         latin:'mm. colli',              group:'NECK',     force:3, vol7d:200 },
};

const WEEK = [
  { day:'SEG', focus:'PEITO+TRÍCEPS', muscles:['pectoralis_l','pectoralis_r','triceps_l','triceps_r','deltoid_l','deltoid_r'] },
  { day:'TER', focus:'COSTAS+BÍCEPS', muscles:['lats_l','lats_r','trapezius','biceps_l','biceps_r','forearm_l','forearm_r'] },
  { day:'QUA', focus:'PERNAS',        muscles:['quad_l','quad_r','glutes_l','glutes_r','adductors_l','adductors_r','hamstring_l','hamstring_r','calf_l','calf_r'] },
  { day:'QUI', focus:'OMBROS+ABS',    muscles:['deltoid_l','deltoid_r','trapezius','abs','obliques_l','obliques_r'] },
  { day:'SEX', focus:'BRAÇOS+CORE',   muscles:['biceps_l','biceps_r','triceps_l','triceps_r','forearm_l','forearm_r','abs','obliques_l','obliques_r'] },
  { day:'SAB', focus:'POSTERIOR',     muscles:['glutes_l','glutes_r','hamstring_l','hamstring_r','erectors','calf_l','calf_r'] },
  { day:'DOM', focus:'DESCANSO',      muscles:[] },
];
const TODAY = 4;

// ═══════════════════════════════════════════════════════════════
// HOLOGRAPHIC SHADER WITH MULTI-ZONE HIGHLIGHTING
// ═══════════════════════════════════════════════════════════════
const MAX_ZONES = 32;

const HOLO_VERT = `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec3 vPosition;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 viewPos = viewMatrix * worldPos;
  vViewDir = -viewPos.xyz;
  gl_Position = projectionMatrix * viewPos;
}`;

const HOLO_FRAG = `
#define MAX_ZONES ${MAX_ZONES}
uniform vec3  uBaseColor;
uniform vec3  uHotColor;
uniform float uTime;
uniform float uRimPower;
uniform float uOpacity;
uniform int   uZoneCount;
uniform vec3  uZoneCenter[MAX_ZONES];
uniform float uZoneRadius[MAX_ZONES];
uniform vec3  uZoneColor[MAX_ZONES];
uniform float uZoneIntensity[MAX_ZONES];   // 0..2  glow strength
uniform float uZoneHover[MAX_ZONES];       // 0..1
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec3 vPosition;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  float NdotV = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = pow(1.0 - NdotV, uRimPower);

  // Find the TWO nearest zones for crisp Voronoi-like borders
  vec3 zoneTint = vec3(0.0);
  float zoneEnergy = 0.0;
  float hoverEnergy = 0.0;
  int nearest = -1;
  int second = -1;
  float minD = 1e9;
  float minD2 = 1e9;
  for (int i = 0; i < MAX_ZONES; i++) {
    if (i >= uZoneCount) break;
    float d = distance(vWorldPos, uZoneCenter[i]) / max(uZoneRadius[i], 0.001);
    if (d < minD) {
      minD2 = minD; second = nearest;
      minD = d; nearest = i;
    } else if (d < minD2) {
      minD2 = d; second = i;
    }
    // soft accumulate (for gentle base tint outside the dominant zone)
    float w = 1.0 - smoothstep(0.0, 1.0, d);
    w = pow(w, 2.0);
    zoneTint += uZoneColor[i] * w * uZoneIntensity[i] * 0.25;
    zoneEnergy += w * uZoneIntensity[i];
    hoverEnergy += w * uZoneHover[i];
  }
  // Dominant zone color — sharp assignment within its radius
  vec3 dominantColor = vec3(0.0);
  float dominantI = 0.0;
  float dominantHover = 0.0;
  if (nearest >= 0 && minD < 1.2) {
    dominantColor = uZoneColor[nearest];
    dominantI = uZoneIntensity[nearest];
    dominantHover = uZoneHover[nearest];
    // Hard tint inside dominant zone
    float fill = 1.0 - smoothstep(0.85, 1.05, minD);
    zoneTint = mix(zoneTint, dominantColor * dominantI * 1.2, fill);
  }
  // Border line: where minD ~= minD2, draw dark seam
  float border = 0.0;
  if (second >= 0) {
    float diff = abs(minD2 - minD);
    border = 1.0 - smoothstep(0.0, 0.06, diff);
  }

  // Scanlines
  float scan = 0.5 + 0.5 * sin(vWorldPos.y * 60.0 - uTime * 1.4);
  scan = pow(scan, 2.0);

  // Slow vertical sweep
  float sweep = smoothstep(0.0, 0.05, abs(fract(vWorldPos.y * 0.18 - uTime * 0.12) - 0.5));
  sweep = 1.0 - sweep * 0.35;

  // Sparkle
  float sparkle = step(0.994, hash(floor(vWorldPos.xy * 240.0) + floor(uTime * 4.0)));

  // Pulse
  float pulse = 0.5 + 0.5 * sin(uTime * 2.5);

  // Base look — solid dark cyan body with rim accent
  vec3 col = mix(uBaseColor * 0.10, uBaseColor * 0.55 + uHotColor * 0.15, fresnel);
  col *= sweep;
  col += uBaseColor * scan * 0.08 * fresnel;

  // Mix in zone glow (additive on top of base)
  col += zoneTint * (0.4 + pulse * 0.25) * (0.3 + fresnel * 0.6);

  // Hover bright — MUCH more obvious, hot white-cyan with strong pulse
  float hoverPulse = 0.7 + 0.3 * sin(uTime * 6.0);
  col += vec3(0.4, 1.0, 1.2) * hoverEnergy * hoverPulse * 2.2;
  // Hover ring effect — bright contour on the surface
  float hoverRing = smoothstep(0.3, 0.7, hoverEnergy) * smoothstep(0.7, 0.55, hoverEnergy + 0.1);
  col += vec3(1.0, 1.0, 1.2) * hoverRing * 1.5;

  // Sparkle
  col += vec3(0.6, 0.9, 1.0) * sparkle * 0.3;

  // Border seam — dark cyan line between zones
  col *= mix(1.0, 0.15, border);
  // Bright edge pop on the border (thin cyan rim)
  float borderEdge = smoothstep(0.7, 1.0, border);
  col += vec3(0.3, 0.9, 1.0) * borderEdge * 0.6;

  // Opaque body — proper occlusion
  gl_FragColor = vec4(col, 1.0);
}`;

function makeHoloMaterial() {
  const zoneCenters = []; const zoneRadius = []; const zoneColor = []; const zoneIntensity = []; const zoneHover = [];
  for (let i = 0; i < MAX_ZONES; i++) {
    zoneCenters.push(new THREE.Vector3());
    zoneRadius.push(0.0001);
    zoneColor.push(new THREE.Color(0x000000));
    zoneIntensity.push(0);
    zoneHover.push(0);
  }
  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color(0x00d4ff) },
      uHotColor:  { value: new THREE.Color(0x80ffff) },
      uTime:      { value: 0 },
      uRimPower:  { value: 2.0 },
      uOpacity:   { value: 1.0 },
      uZoneCount: { value: 0 },
      uZoneCenter: { value: zoneCenters },
      uZoneRadius: { value: zoneRadius },
      uZoneColor:  { value: zoneColor },
      uZoneIntensity: { value: zoneIntensity },
      uZoneHover:  { value: zoneHover },
    },
    vertexShader: HOLO_VERT,
    fragmentShader: HOLO_FRAG,
    transparent: false,
    side: THREE.FrontSide,
    depthWrite: true,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
const canvas = document.getElementById('threecanvas');
const stage = canvas.parentElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.06);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 4, 12);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 18;
controls.target.set(0, 4, 0);
controls.enablePan = false;

// Floor rings + grid
const ring = new THREE.Mesh(
  new THREE.RingGeometry(2.0, 2.6, 64),
  new THREE.MeshBasicMaterial({ color:0x00d4ff, transparent:true, opacity:0.15, side:THREE.DoubleSide })
);
ring.rotation.x = -Math.PI/2; ring.position.y = -3.55; scene.add(ring);
const ring2 = new THREE.Mesh(
  new THREE.RingGeometry(2.7, 2.75, 64),
  new THREE.MeshBasicMaterial({ color:0x00d4ff, transparent:true, opacity:0.35, side:THREE.DoubleSide })
);
ring2.rotation.x = -Math.PI/2; ring2.position.y = -3.55; scene.add(ring2);

const grid = new THREE.GridHelper(8, 16, 0x00d4ff, 0x002030);
grid.material.transparent = true; grid.material.opacity = 0.15;
grid.position.y = -3.55; scene.add(grid);

// ═══════════════════════════════════════════════════════════════
// LOAD GLB
// ═══════════════════════════════════════════════════════════════
const holoMat = makeHoloMaterial();
const wireMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent:true, opacity:0.04, blending: THREE.NormalBlending });
const bodyGroup = new THREE.Group();
scene.add(bodyGroup);

// 3D hover marker — pulsing ring + crosshair that floats AT the hovered muscle
const hoverMarkerGroup = new THREE.Group();
hoverMarkerGroup.visible = false;
scene.add(hoverMarkerGroup);
// Outer ring
const hmRing = new THREE.Mesh(
  new THREE.RingGeometry(0.32, 0.38, 48),
  new THREE.MeshBasicMaterial({ color: 0x80ffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false })
);
hmRing.renderOrder = 999;
hoverMarkerGroup.add(hmRing);
// Inner ring
const hmRing2 = new THREE.Mesh(
  new THREE.RingGeometry(0.18, 0.21, 48),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false })
);
hmRing2.renderOrder = 999;
hoverMarkerGroup.add(hmRing2);
// Crosshair lines
const hmLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false });
const hmLineGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(-0.22, 0, 0),
  new THREE.Vector3(0.22, 0, 0), new THREE.Vector3(0.5, 0, 0),
  new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, -0.22, 0),
  new THREE.Vector3(0, 0.22, 0), new THREE.Vector3(0, 0.5, 0),
]);
const hmLines = new THREE.LineSegments(hmLineGeo, hmLineMat);
hmLines.renderOrder = 999;
hoverMarkerGroup.add(hmLines);

// 3D floating label sprite (canvas texture)
function makeLabelSprite() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.0, 0.5, 1);
  sprite.renderOrder = 1000;
  return { sprite, canvas: c, tex };
}
const labelObj = makeLabelSprite();
hoverMarkerGroup.add(labelObj.sprite);

function updateLabel(text) {
  const c = labelObj.canvas;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  // background pill
  ctx.fillStyle = 'rgba(0, 20, 30, 0.92)';
  ctx.strokeStyle = '#80ffff';
  ctx.lineWidth = 3;
  const pad = 8, h = 80, y = (c.height - h)/2;
  ctx.beginPath();
  ctx.moveTo(20, y); ctx.lineTo(c.width - pad, y);
  ctx.lineTo(c.width - pad, y + h); ctx.lineTo(pad, y + h);
  ctx.lineTo(pad, y + 20); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // text
  ctx.fillStyle = '#80ffff';
  ctx.font = 'bold 38px "Orbitron", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 24, c.height / 2);
  labelObj.tex.needsUpdate = true;
}

const bodyMeshes = [];
let bodyBounds = null;
let bodyHeight = 1;

const loader = new GLTFLoader();

function onModelLoaded(gltf) {
  const model = gltf.scene;
  console.log('[GLB] loaded; root children:', model.children.length);

  // First, count meshes via raw geometry (no scene-graph dependency)
  let meshCount = 0;
  model.traverse(o => { if (o.isMesh) meshCount++; });
  console.log('[GLB] mesh count:', meshCount);
  if (meshCount === 0) {
    console.warn('[GLB] no meshes found in scene');
    document.querySelector('.loading > div').innerHTML = 'MODELO_VAZIO<br/><small>nenhuma malha encontrada</small>';
    return;
  }

  // Add to scene FIRST so world matrices are valid for bounds calc
  bodyGroup.add(model);
  bodyGroup.updateMatrixWorld(true);

  // Compute bounds AFTER scene-graph attachment
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  console.log('[GLB] raw size:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
  console.log('[GLB] raw center:', center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2));

  if (!isFinite(size.y) || size.y < 0.0001) {
    console.warn('[GLB] invalid bounds; using scale=1');
    model.scale.set(1, 1, 1);
  } else {
    const scale = 7 / size.y;
    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    model.position.y += 0.5;
  }

  // Replace materials with holo shader (wireframe overlay too)
  model.traverse(o => {
    if (o.isMesh) {
      o.material = holoMat;
      o.frustumCulled = false;
      bodyMeshes.push(o);
      const wire = new THREE.LineSegments(new THREE.WireframeGeometry(o.geometry), wireMat);
      o.add(wire);
    }
  });

  bodyGroup.updateMatrixWorld(true);
  bodyBounds = new THREE.Box3().setFromObject(bodyGroup);
  const bsize = new THREE.Vector3(); bodyBounds.getSize(bsize);
  bodyHeight = bsize.y;
  console.log('[GLB] final bounds size:', bsize.x.toFixed(2), bsize.y.toFixed(2), bsize.z.toFixed(2));
  console.log('[GLB] bodyMeshes:', bodyMeshes.length);

  buildMuscleZones();
  applyMode(currentMode, currentDay);
  document.getElementById('loading').classList.add('hidden');
}

function onModelError(err) {
  console.error('[GLB] load error', err);
  const lbl = document.querySelector('.loading > div');
  if (lbl) lbl.innerHTML = 'ERRO_AO_CARREGAR_MODELO<br/><small>'+(err && err.message || err)+'</small>';
}

// Use fetch + parse to bypass dev-server content-type quirks
fetch('models/anatomy.glb')
  .then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    console.log('[GLB] fetch ok; content-type:', r.headers.get('content-type'));
    return r.arrayBuffer();
  })
  .then(buf => {
    console.log('[GLB] arrayBuffer bytes:', buf.byteLength);
    loader.parse(buf, '', onModelLoaded, onModelError);
  })
  .catch(onModelError);

// ═══════════════════════════════════════════════════════════════
// MUSCLE ZONES (positions in WORLD space, anchored to body bounds)
// ═══════════════════════════════════════════════════════════════
// Use normalized coords (0..1 from feet to head, -1..1 left/right & front/back),
// then map to world via bodyBounds.
const ZONES = [
  // id, ny (height fraction 0=feet, 1=head), nx (-1..1), nz (-1..1 front+/back-), radius (in body-height units)
  ['neck',          0.93,  0.0,  0.0, 0.07 ],
  ['trapezius',     0.85,  0.0, -0.4, 0.10 ],
  ['deltoid_l',     0.83, -0.55, 0.0, 0.08 ],
  ['deltoid_r',     0.83,  0.55, 0.0, 0.08 ],
  ['pectoralis_l',  0.78, -0.20, 0.55,0.10 ],
  ['pectoralis_r',  0.78,  0.20, 0.55,0.10 ],
  ['biceps_l',      0.72, -0.65, 0.30,0.08 ],
  ['biceps_r',      0.72,  0.65, 0.30,0.08 ],
  ['triceps_l',     0.72, -0.65,-0.30,0.08 ],
  ['triceps_r',     0.72,  0.65,-0.30,0.08 ],
  ['forearm_l',     0.60, -0.78, 0.10,0.09 ],
  ['forearm_r',     0.60,  0.78, 0.10,0.09 ],
  ['lats_l',        0.70, -0.30,-0.45,0.10 ],
  ['lats_r',        0.70,  0.30,-0.45,0.10 ],
  ['abs',           0.65,  0.0,  0.55,0.10 ],
  ['obliques_l',    0.65, -0.35, 0.40,0.07 ],
  ['obliques_r',    0.65,  0.35, 0.40,0.07 ],
  ['erectors',      0.62,  0.0, -0.55,0.08 ],
  ['glutes_l',      0.55, -0.18,-0.50,0.10 ],
  ['glutes_r',      0.55,  0.18,-0.50,0.10 ],
  ['quad_l',        0.40, -0.16, 0.35,0.11 ],
  ['quad_r',        0.40,  0.16, 0.35,0.11 ],
  ['adductors_l',   0.42, -0.05, 0.10,0.08 ],
  ['adductors_r',   0.42,  0.05, 0.10,0.08 ],
  ['hamstring_l',   0.40, -0.16,-0.35,0.10 ],
  ['hamstring_r',   0.40,  0.16,-0.35,0.10 ],
  ['calf_l',        0.18, -0.16,-0.30,0.10 ],
  ['calf_r',        0.18,  0.16,-0.30,0.10 ],
];

const muscleZones = []; // { id, mesh (invisible picker), worldCenter, worldRadius }

function buildMuscleZones() {
  if (!bodyBounds) return;
  muscleZones.length = 0;
  const min = bodyBounds.min, max = bodyBounds.max;
  const sx = (max.x - min.x) / 2;
  const sy = (max.y - min.y);
  const sz = (max.z - min.z) / 2;
  const cx = (max.x + min.x) / 2;
  const cz = (max.z + min.z) / 2;

  ZONES.forEach(([id, ny, nx, nz, nr]) => {
    const wx = cx + nx * sx;
    const wy = min.y + ny * sy;
    const wz = cz + nz * sz;
    const wr = nr * sy;

    // Invisible picker sphere for raycasting
    const picker = new THREE.Mesh(
      new THREE.SphereGeometry(wr, 16, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    picker.position.set(wx, wy, wz);
    picker.userData.id = id;
    scene.add(picker);

    muscleZones.push({
      id,
      mesh: picker,
      center: new THREE.Vector3(wx, wy, wz),
      radius: wr,
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// MODE / COLOR APPLICATION → write to shader uniforms
// ═══════════════════════════════════════════════════════════════
const FORCE_COLORS = {
  1: new THREE.Color(0xff3030),
  2: new THREE.Color(0xff8030),
  3: new THREE.Color(0xffd030),
  4: new THREE.Color(0x40ffaa),
  5: new THREE.Color(0x00d4ff),
};

function applyMode(mode, dayIdx) {
  if (!muscleZones.length) return;
  const todayMs = new Set(WEEK[dayIdx]?.muscles || []);
  const weekMs = new Set(); WEEK.forEach(d => d.muscles.forEach(m => weekMs.add(m)));
  const maxVol = Math.max(...Object.values(MUSCLES).map(m => m.vol7d));

  // Reset zones
  const u = holoMat.uniforms;
  u.uZoneCount.value = muscleZones.length;
  for (let i = 0; i < muscleZones.length; i++) {
    const z = muscleZones[i];
    const m = MUSCLES[z.id];
    u.uZoneCenter.value[i].copy(z.center);
    u.uZoneRadius.value[i] = z.radius * 1.1;

    let color = new THREE.Color(0x002030);
    let intensity = 0;

    if (mode === 'semana') {
      if (todayMs.has(z.id)) { color = new THREE.Color(0x00d4ff); intensity = 1.6; }
      else if (weekMs.has(z.id)) { color = new THREE.Color(0x006080); intensity = 0.4; }
      else { color = new THREE.Color(0x001520); intensity = 0; }
    } else if (mode === 'forca') {
      color = FORCE_COLORS[m?.force || 3].clone();
      intensity = 0.5 + (m?.force || 3) * 0.18;
    } else if (mode === 'volume') {
      const vol = (m?.vol7d || 0) / maxVol;
      // Heatmap: deep blue → cyan → green → yellow → red
      let hue;
      if (vol < 0.25) hue = 0.66 - vol * 0.4;       // blue → cyan
      else if (vol < 0.5) hue = 0.5 - (vol-0.25) * 0.6; // cyan → green
      else if (vol < 0.75) hue = 0.33 - (vol-0.5) * 0.5; // green → yellow
      else hue = 0.16 - (vol-0.75) * 0.64;            // yellow → red
      color = new THREE.Color().setHSL(Math.max(0, hue), 0.95, 0.45 + vol*0.15);
      intensity = 0.4 + vol * 1.6;
    }

    u.uZoneColor.value[i].copy(color);
    u.uZoneIntensity.value[i] = intensity;
  }
}

// ═══════════════════════════════════════════════════════════════
// POSTPROCESSING
// ═══════════════════════════════════════════════════════════════
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.7, 0.15);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

// ═══════════════════════════════════════════════════════════════
// INTERACTION
// ═══════════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredId = null;
let selected = null;
const tooltip = document.getElementById('tooltip');

function pickMuscleId(ev) {
  if (!muscleZones.length || !bodyMeshes.length) return null;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  // First hit body — that's the surface point
  const bodyHits = raycaster.intersectObjects(bodyMeshes, true);
  if (!bodyHits.length) return null;
  const surfacePoint = bodyHits[0].point;
  // Find closest zone center to the surface hit (in normalized radius space)
  let best = null, bestD = Infinity;
  for (const z of muscleZones) {
    const d = surfacePoint.distanceTo(z.center) / z.radius;
    if (d < bestD) { bestD = d; best = z; }
  }
  return (best && bestD < 1.6) ? best.id : null;
}

function setHover(id) {
  if (id === hoveredId) return;
  hoveredId = id;
  const u = holoMat.uniforms;
  for (let i = 0; i < muscleZones.length; i++) {
    u.uZoneHover.value[i] = (muscleZones[i].id === id) ? 1.0 : 0.0;
  }
  if (id) {
    const z = muscleZones.find(z => z.id === id);
    const m = MUSCLES[id];
    if (z && m) {
      hoverMarkerGroup.visible = true;
      hoverMarkerGroup.position.copy(z.center);
      // scale marker rings to muscle radius
      const s = z.radius / 0.35;
      hmRing.scale.setScalar(s);
      hmRing2.scale.setScalar(s);
      hmLines.scale.setScalar(s);
      // place label above muscle
      labelObj.sprite.position.set(0, z.radius + 0.6, 0);
      updateLabel(m.name);
      // dim the body so highlight pops
      holoMat.uniforms.uOpacity.value = 0.55;
    }
  } else {
    hoverMarkerGroup.visible = false;
    holoMat.uniforms.uOpacity.value = 1.0;
  }
}

canvas.addEventListener('pointermove', (ev) => {
  const id = pickMuscleId(ev);
  setHover(id);
  if (id) {
    const m = MUSCLES[id];
    const rect = stage.getBoundingClientRect();
    const todaySet = new Set(WEEK[currentDay].muscles);
    tooltip.innerHTML = `
      <div class="name">${m.name}</div>
      <div class="latin">${m.latin}</div>
      <div class="row"><span class="k">GRUPO</span><span class="v">${m.group}</span></div>
      <div class="row"><span class="k">FORÇA</span><span class="v">${'█'.repeat(m.force)}${'░'.repeat(5-m.force)} ${m.force}/5</span></div>
      <div class="row"><span class="k">VOL_7D</span><span class="v">${m.vol7d.toLocaleString()} kg</span></div>
      <div class="row"><span class="k">STATUS</span><span class="v" style="color:${todaySet.has(id) ? 'var(--cyan)' : 'var(--cyan-dim)'}">${todaySet.has(id) ? 'ATIVO_HOJE' : 'INATIVO'}</span></div>
    `;
    tooltip.classList.add('visible');
    let tx = ev.clientX - rect.left + 14, ty = ev.clientY - rect.top + 14;
    if (tx > rect.width - 240) tx = ev.clientX - rect.left - 240;
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
  } else tooltip.classList.remove('visible');
});

canvas.addEventListener('pointerleave', () => { setHover(null); tooltip.classList.remove('visible'); });

canvas.addEventListener('click', (ev) => {
  const id = pickMuscleId(ev);
  selected = id;
  renderInspector();
});

canvas.addEventListener('dblclick', (ev) => {
  const id = pickMuscleId(ev);
  if (!id) return;
  const z = muscleZones.find(z => z.id === id);
  if (!z) return;
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  const newPos = z.center.clone().add(dir.multiplyScalar(3));
  animateCamera(newPos, z.center.clone());
});

function animateCamera(toPos, toTarget, dur = 700) {
  const fromPos = camera.position.clone(), fromTarget = controls.target.clone();
  const t0 = performance.now();
  function step() {
    const t = Math.min(1, (performance.now() - t0) / dur);
    const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
    camera.position.lerpVectors(fromPos, toPos, e);
    controls.target.lerpVectors(fromTarget, toTarget, e);
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}
document.getElementById('reset-cam').addEventListener('click', () => {
  animateCamera(new THREE.Vector3(0, 4, 12), new THREE.Vector3(0, 4, 0));
});

// Preset view buttons
const VIEWS = {
  front: [0, 4, 12], back: [0, 4, -12], left: [-12, 4, 0], right: [12, 4, 0], top: [0, 14, 0.1],
};
function gotoView(name) {
  const p = VIEWS[name];
  animateCamera(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Vector3(0, 4, 0));
}
// Wire axis labels as clickable view buttons
['front','back','left','right'].forEach(v => {
  const el = document.getElementById('ax-'+v);
  if (el) { el.style.cursor = 'pointer'; el.style.pointerEvents = 'auto'; el.addEventListener('click', () => gotoView(v)); }
});

// ═══════════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════════
let currentMode = 'semana';
let currentDay = TODAY;

function i_volForDay(d) {
  return WEEK[d].muscles.reduce((s, id) => s + (MUSCLES[id]?.vol7d || 0)/7, 0) | 0;
}

function renderModeContent() {
  const el = document.getElementById('mode-content');
  if (currentMode === 'semana') {
    el.innerHTML = `
      <div class="days">${WEEK.map((d,i)=>`<div class="day-pill ${d.muscles.length?'has-workout':''} ${i===currentDay?'active':''}" data-d="${i}">${d.day}</div>`).join('')}</div>
      <div class="day-info">FOCO_HOJE: <span class="focus">${WEEK[currentDay].focus}</span></div>
      <div class="day-info">${WEEK[currentDay].muscles.length} grupos · ${i_volForDay(currentDay).toLocaleString()} kg projetados</div>
    `;
    el.querySelectorAll('.day-pill').forEach(p => p.addEventListener('click', () => {
      currentDay = +p.dataset.d;
      applyMode(currentMode, currentDay);
      renderModeContent();
    }));
  } else if (currentMode === 'forca') {
    el.innerHTML = `
      <div class="day-info" style="margin-bottom:8px">Mapa de força relativa por músculo</div>
      <div class="legend">
        <div class="legend-row"><div class="legend-swatch" style="background:#ff3030;box-shadow:0 0 4px #ff3030"></div>NÍVEL_1 · iniciante</div>
        <div class="legend-row"><div class="legend-swatch" style="background:#ff8030;box-shadow:0 0 4px #ff8030"></div>NÍVEL_2 · novato</div>
        <div class="legend-row"><div class="legend-swatch" style="background:#ffd030;box-shadow:0 0 4px #ffd030"></div>NÍVEL_3 · intermediário</div>
        <div class="legend-row"><div class="legend-swatch" style="background:#40ffaa;box-shadow:0 0 4px #40ffaa"></div>NÍVEL_4 · avançado</div>
        <div class="legend-row"><div class="legend-swatch" style="background:#00d4ff;box-shadow:0 0 4px #00d4ff"></div>NÍVEL_5 · elite</div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="day-info" style="margin-bottom:8px">Volume agregado dos últimos 7 dias</div>
      <div class="legend">
        <div class="legend-row"><div class="legend-swatch" style="background:#003848"></div>BAIXO</div>
        <div class="legend-row"><div class="legend-swatch" style="background:#0080a0"></div>MÉDIO</div>
        <div class="legend-row"><div class="legend-swatch" style="background:#00d4ff;box-shadow:0 0 4px #00d4ff"></div>ALTO</div>
      </div>`;
  }
}

function renderInspector() {
  const ins = document.getElementById('inspector');
  if (!selected) {
    ins.innerHTML = `<h3>INSPETOR_MUSCULAR</h3><div class="empty">SELECIONE UM MÚSCULO<br/>NO HOLOGRAMA</div>`;
    return;
  }
  const m = MUSCLES[selected];
  if (!m) return;
  const hitDays = WEEK.map(d => d.muscles.includes(selected));
  ins.innerHTML = `
    <h3>INSPETOR_MUSCULAR</h3>
    <div class="name">${m.name}</div>
    <div class="latin">${m.latin}</div>
    <div class="stat-row"><span class="k">ID</span><span class="v">${selected}</span></div>
    <div class="stat-row"><span class="k">GRUPO</span><span class="v">${m.group}</span></div>
    <div class="stat-row"><span class="k">NÍVEL_FORÇA</span><span class="v">${'█'.repeat(m.force)}${'░'.repeat(5-m.force)} ${m.force}/5</span></div>
    <div class="stat-row"><span class="k">VOL_7D</span><span class="v">${m.vol7d.toLocaleString()} kg</span></div>
    <div class="stat-row"><span class="k">STATUS</span><span class="v" style="color:${hitDays[currentDay]?'var(--cyan)':'var(--cyan-dim)'}">${hitDays[currentDay]?'ATIVO_HOJE':'AGENDADO'}</span></div>
    <div class="desc-block"><b style="color:var(--cyan)">SEMANA</b><div class="week-grid">${hitDays.map((h,i)=>`<div class="${h?'hit':''}">${WEEK[i].day}</div>`).join('')}</div></div>
    <div class="desc-block">Recomendação: ${m.force>=4 && m.vol7d>1500 ? 'manter intensidade, deload em 2 sem' : (m.force<=2 ? 'priorizar progressão de carga' : 'volume adequado')}.</div>
  `;
}

document.querySelectorAll('.mode-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentMode = b.dataset.mode;
    applyMode(currentMode, currentDay);
    renderModeContent();
  });
});

function renderStrengthBars() {
  const groups = {};
  Object.values(MUSCLES).forEach(m => { groups[m.group] = (groups[m.group] || 0) + m.force; });
  const max = Math.max(...Object.values(groups));
  document.getElementById('strength-bars').innerHTML = Object.entries(groups).map(([g,v]) => {
    const pct = (v/max*100).toFixed(0);
    return `<div class="bar-row"><div class="lbl"><span class="name">${g}</span><span class="val">${v}</span></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>`;
  }).join('');
}

renderModeContent();
renderInspector();
renderStrengthBars();

// ═══════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════
const axEls = {
  front: document.getElementById('ax-front'),
  right: document.getElementById('ax-right'),
  back:  document.getElementById('ax-back'),
  left:  document.getElementById('ax-left'),
};
const rotDeg = document.getElementById('rot-deg');
const lblFps = document.getElementById('lbl-fps');
let lastT = performance.now(), frames = 0, fpsT = 0;

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() / 1000;
  const dt = performance.now() - lastT; lastT = performance.now();
  frames++; fpsT += dt;
  if (fpsT > 500) { lblFps.textContent = (frames/(fpsT/1000)).toFixed(0)+' FPS'; frames = 0; fpsT = 0; }

  holoMat.uniforms.uTime.value = t;

  // Billboard the hover marker rings + crosshair to camera, pulse scale
  if (hoverMarkerGroup.visible) {
    hoverMarkerGroup.lookAt(camera.position);
    const pulse = 1.0 + Math.sin(t * 5.0) * 0.08;
    hmRing.scale.setScalar((muscleZones.find(z=>z.id===hoveredId)?.radius || 0.35) / 0.35 * pulse);
    hmRing2.scale.setScalar((muscleZones.find(z=>z.id===hoveredId)?.radius || 0.35) / 0.35 * (2 - pulse));
    // sprite always faces camera natively
  }

  controls.update();

  const dx = camera.position.x - controls.target.x;
  const dz = camera.position.z - controls.target.z;
  let az = Math.atan2(dx, dz) * 180 / Math.PI;
  if (az < 0) az += 360;
  rotDeg.textContent = String(Math.round(az)).padStart(3, '0') + '°';
  const norm = ((az % 360) + 360) % 360;
  Object.values(axEls).forEach(e => e.classList.remove('active'));
  if (norm < 45 || norm >= 315) axEls.front.classList.add('active');
  else if (norm < 135) axEls.right.classList.add('active');
  else if (norm < 225) axEls.back.classList.add('active');
  else axEls.left.classList.add('active');

  composer.render();
}
animate();
