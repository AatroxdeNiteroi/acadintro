// Three.js holographic body engine — refactored from holo3d.js into a reusable class.
// Owns one canvas, exposes setHighlights / gotoView / resetCamera / dispose.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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
uniform float uZoneIntensity[MAX_ZONES];
uniform float uZoneHover[MAX_ZONES];
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
    float w = 1.0 - smoothstep(0.0, 1.0, d);
    w = pow(w, 2.0);
    zoneTint += uZoneColor[i] * w * uZoneIntensity[i] * 0.25;
    zoneEnergy += w * uZoneIntensity[i];
    hoverEnergy += w * uZoneHover[i];
  }
  vec3 dominantColor = vec3(0.0);
  float dominantI = 0.0;
  if (nearest >= 0 && minD < 1.2) {
    dominantColor = uZoneColor[nearest];
    dominantI = uZoneIntensity[nearest];
    float fill = 1.0 - smoothstep(0.85, 1.05, minD);
    zoneTint = mix(zoneTint, dominantColor * dominantI * 1.2, fill);
  }
  float border = 0.0;
  if (second >= 0) {
    float diff = abs(minD2 - minD);
    border = 1.0 - smoothstep(0.0, 0.06, diff);
  }

  float scan = 0.5 + 0.5 * sin(vWorldPos.y * 60.0 - uTime * 1.4);
  scan = pow(scan, 2.0);
  float sweep = smoothstep(0.0, 0.05, abs(fract(vWorldPos.y * 0.18 - uTime * 0.12) - 0.5));
  sweep = 1.0 - sweep * 0.35;
  float sparkle = step(0.994, hash(floor(vWorldPos.xy * 240.0) + floor(uTime * 4.0)));
  float pulse = 0.5 + 0.5 * sin(uTime * 2.5);

  vec3 col = mix(uBaseColor * 0.10, uBaseColor * 0.55 + uHotColor * 0.15, fresnel);
  col *= sweep;
  col += uBaseColor * scan * 0.08 * fresnel;
  col += zoneTint * (0.4 + pulse * 0.25) * (0.3 + fresnel * 0.6);

  float hoverPulse = 0.7 + 0.3 * sin(uTime * 6.0);
  col += vec3(0.4, 1.0, 1.2) * hoverEnergy * hoverPulse * 2.2;
  float hoverRing = smoothstep(0.3, 0.7, hoverEnergy) * smoothstep(0.7, 0.55, hoverEnergy + 0.1);
  col += vec3(1.0, 1.0, 1.2) * hoverRing * 1.5;
  col += vec3(0.6, 0.9, 1.0) * sparkle * 0.3;
  col *= mix(1.0, 0.15, border);
  float borderEdge = smoothstep(0.7, 1.0, border);
  col += vec3(0.3, 0.9, 1.0) * borderEdge * 0.6;

  gl_FragColor = vec4(col, 1.0);
}`;

// Normalized zone positions: [id, ny (0=feet→1=head), nx (-1..1 L/R), nz (-1..1 back/front), radius (in body-height units)]
export const HOLO_ZONES = [
  ['neck',          0.93,  0.0,  0.0, 0.07],
  ['trapezius',     0.85,  0.0, -0.4, 0.10],
  ['deltoid_l',     0.83, -0.55, 0.0, 0.08],
  ['deltoid_r',     0.83,  0.55, 0.0, 0.08],
  ['pectoralis_l',  0.78, -0.20, 0.55, 0.10],
  ['pectoralis_r',  0.78,  0.20, 0.55, 0.10],
  ['biceps_l',      0.72, -0.65, 0.30, 0.08],
  ['biceps_r',      0.72,  0.65, 0.30, 0.08],
  ['triceps_l',     0.72, -0.65,-0.30, 0.08],
  ['triceps_r',     0.72,  0.65,-0.30, 0.08],
  ['forearm_l',     0.60, -0.78, 0.10, 0.09],
  ['forearm_r',     0.60,  0.78, 0.10, 0.09],
  ['lats_l',        0.70, -0.30,-0.45, 0.10],
  ['lats_r',        0.70,  0.30,-0.45, 0.10],
  ['abs',           0.65,  0.0,  0.55, 0.10],
  ['obliques_l',    0.65, -0.35, 0.40, 0.07],
  ['obliques_r',    0.65,  0.35, 0.40, 0.07],
  ['erectors',      0.62,  0.0, -0.55, 0.08],
  ['glutes_l',      0.55, -0.18,-0.50, 0.10],
  ['glutes_r',      0.55,  0.18,-0.50, 0.10],
  ['quad_l',        0.40, -0.16, 0.35, 0.11],
  ['quad_r',        0.40,  0.16, 0.35, 0.11],
  ['adductors_l',   0.42, -0.05, 0.10, 0.08],
  ['adductors_r',   0.42,  0.05, 0.10, 0.08],
  ['hamstring_l',   0.40, -0.16,-0.35, 0.10],
  ['hamstring_r',   0.40,  0.16,-0.35, 0.10],
  ['calf_l',        0.18, -0.16,-0.30, 0.10],
  ['calf_r',        0.18,  0.16,-0.30, 0.10],
];

const VIEWS = {
  front: [0, 1, 15], back: [0, 1, -15], left: [-15, 1, 0], right: [15, 1, 0], top: [0, 14, 0.1],
};
const TARGET = [0, 1, 0];

function makeHoloMaterial() {
  const zoneCenters = [], zoneRadius = [], zoneColor = [], zoneIntensity = [], zoneHover = [];
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

export class HoloEngine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.disposed = false;
    this.highlights = {}; // id → { color, intensity }
    this.labelText = (id) => id;

    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    // Cap DPR aggressively — 4× pixels at DPR 2 was killing perf on retina/high-dpi
    renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);

    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.06);

    const camera = this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1, 15);

    const controls = this.controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4;
    controls.maxDistance = 22;
    controls.target.set(TARGET[0], TARGET[1], TARGET[2]);
    controls.enablePan = false;

    // Floor rings + grid
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 2.6, 64),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = -3.55; scene.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 2.75, 64),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring2.rotation.x = -Math.PI / 2; ring2.position.y = -3.55; scene.add(ring2);
    const grid = new THREE.GridHelper(8, 16, 0x00d4ff, 0x002030);
    grid.material.transparent = true; grid.material.opacity = 0.15;
    grid.position.y = -3.55; scene.add(grid);

    this.holoMat = makeHoloMaterial();
    // Wireframe overlay removed — barely visible at 0.04 opacity but doubles vertex count
    this.bodyGroup = new THREE.Group();
    scene.add(this.bodyGroup);
    this.bodyMeshes = [];
    this.bodyBounds = null;
    this.muscleZones = [];

    // Hover marker
    this.hoverMarkerGroup = new THREE.Group();
    this.hoverMarkerGroup.visible = false;
    scene.add(this.hoverMarkerGroup);
    this.hmRing = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x80ffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false })
    );
    this.hmRing.renderOrder = 999;
    this.hoverMarkerGroup.add(this.hmRing);
    this.hmRing2 = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.21, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false })
    );
    this.hmRing2.renderOrder = 999;
    this.hoverMarkerGroup.add(this.hmRing2);
    const hmLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false });
    const hmLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(-0.22, 0, 0),
      new THREE.Vector3(0.22, 0, 0), new THREE.Vector3(0.5, 0, 0),
      new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, -0.22, 0),
      new THREE.Vector3(0, 0.22, 0), new THREE.Vector3(0, 0.5, 0),
    ]);
    this.hmLines = new THREE.LineSegments(hmLineGeo, hmLineMat);
    this.hmLines.renderOrder = 999;
    this.hoverMarkerGroup.add(this.hmLines);

    // Floating label sprite
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512; labelCanvas.height = 128;
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.minFilter = THREE.LinearFilter;
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false }));
    labelSprite.scale.set(2.0, 0.5, 1);
    labelSprite.renderOrder = 1000;
    this.labelObj = { sprite: labelSprite, canvas: labelCanvas, tex: labelTex };
    this.hoverMarkerGroup.add(labelSprite);

    // Postprocessing
    const composer = this.composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // Lower bloom strength + smaller kernel = less GPU cost without losing the look
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.5, 0.18);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // Interaction state
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hoveredId = null;
    this.lastInteract = performance.now();
    this.idleDelay = 6000;     // ms before auto-rotation kicks in
    this.idleSpeed = 0.0009;   // radians per ms
    this.pendingPointer = null;  // {x,y,clientX,clientY} — processed once per frame

    // Bind handlers so we can remove them on dispose
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onDblClick = this._onDblClick.bind(this);
    this._onResize = this._onResize.bind(this);
    this._markInteract = () => { this.lastInteract = performance.now(); };
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerleave', this._onPointerLeave);
    canvas.addEventListener('click', this._onClick);
    canvas.addEventListener('dblclick', this._onDblClick);
    canvas.addEventListener('pointerdown', this._markInteract);
    canvas.addEventListener('wheel', this._markInteract, { passive: true });
    window.addEventListener('resize', this._onResize);

    this._loadModel(opts.modelUrl || '/models/anatomy.glb');
    this._resize();
    this._animate();
  }

  setLabelResolver(fn) { this.labelText = fn || ((id) => id); }

  setHighlights(map) {
    this.highlights = map || {};
    this._applyHighlights();
  }

  gotoView(name) {
    const p = VIEWS[name];
    if (!p) return;
    this._animateCamera(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Vector3(TARGET[0], TARGET[1], TARGET[2]));
  }

  resetCamera() {
    this._animateCamera(new THREE.Vector3(0, 1, 15), new THREE.Vector3(TARGET[0], TARGET[1], TARGET[2]));
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this._raf);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerleave', this._onPointerLeave);
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('dblclick', this._onDblClick);
    this.canvas.removeEventListener('pointerdown', this._markInteract);
    this.canvas.removeEventListener('wheel', this._markInteract);
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();
    this.renderer.dispose();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }

  // ── internals ──────────────────────────────────────────────
  _loadModel(url) {
    const loader = new GLTFLoader();
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then((buf) => loader.parse(buf, '', (gltf) => this._onModelLoaded(gltf), (err) => this._onError(err)))
      .catch((err) => this._onError(err));
  }

  _onModelLoaded(gltf) {
    const model = gltf.scene;
    let meshCount = 0;
    model.traverse((o) => { if (o.isMesh) meshCount++; });
    if (meshCount === 0) return this._onError(new Error('no meshes in GLB'));

    this.bodyGroup.add(model);
    this.bodyGroup.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    if (isFinite(size.y) && size.y > 0.0001) {
      const scale = 7 / size.y;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      model.position.y += 0.5;
    }

    model.traverse((o) => {
      if (o.isMesh) {
        o.material = this.holoMat;
        o.frustumCulled = false;
        this.bodyMeshes.push(o);
      }
    });

    this.bodyGroup.updateMatrixWorld(true);
    this.bodyBounds = new THREE.Box3().setFromObject(this.bodyGroup);
    this._buildMuscleZones();
    this._applyHighlights();
    this.opts.onLoad && this.opts.onLoad();
  }

  _onError(err) { this.opts.onError && this.opts.onError(err); }

  _buildMuscleZones() {
    if (!this.bodyBounds) return;
    this.muscleZones.length = 0;
    const min = this.bodyBounds.min, max = this.bodyBounds.max;
    const sx = (max.x - min.x) / 2;
    const sy = (max.y - min.y);
    const sz = (max.z - min.z) / 2;
    const cx = (max.x + min.x) / 2;
    const cz = (max.z + min.z) / 2;

    HOLO_ZONES.forEach(([id, ny, nx, nz, nr]) => {
      const wx = cx + nx * sx;
      const wy = min.y + ny * sy;
      const wz = cz + nz * sz;
      const wr = nr * sy;
      this.muscleZones.push({
        id, center: new THREE.Vector3(wx, wy, wz), radius: wr,
      });
    });
  }

  _applyHighlights() {
    if (!this.muscleZones.length) return;
    const u = this.holoMat.uniforms;
    u.uZoneCount.value = this.muscleZones.length;
    for (let i = 0; i < this.muscleZones.length; i++) {
      const z = this.muscleZones[i];
      u.uZoneCenter.value[i].copy(z.center);
      u.uZoneRadius.value[i] = z.radius * 1.1;

      const h = this.highlights[z.id];
      if (h) {
        u.uZoneColor.value[i].set(h.color || 0x00d4ff);
        u.uZoneIntensity.value[i] = h.intensity != null ? h.intensity : 1.0;
      } else {
        u.uZoneColor.value[i].set(0x001520);
        u.uZoneIntensity.value[i] = 0;
      }
    }
  }

  _pickMuscleId(ev) {
    if (!this.muscleZones.length || !this.bodyMeshes.length) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const bodyHits = this.raycaster.intersectObjects(this.bodyMeshes, true);
    if (!bodyHits.length) return null;
    const surfacePoint = bodyHits[0].point;
    let best = null, bestD = Infinity;
    for (const z of this.muscleZones) {
      const d = surfacePoint.distanceTo(z.center) / z.radius;
      if (d < bestD) { bestD = d; best = z; }
    }
    return (best && bestD < 1.6) ? best.id : null;
  }

  _setHover(id) {
    if (id === this.hoveredId) return;
    this.hoveredId = id;
    const u = this.holoMat.uniforms;
    for (let i = 0; i < this.muscleZones.length; i++) {
      u.uZoneHover.value[i] = (this.muscleZones[i].id === id) ? 1.0 : 0.0;
    }
    if (id) {
      const z = this.muscleZones.find((z) => z.id === id);
      if (z) {
        this.hoverMarkerGroup.visible = true;
        this.hoverMarkerGroup.position.copy(z.center);
        const s = z.radius / 0.35;
        this.hmRing.scale.setScalar(s);
        this.hmRing2.scale.setScalar(s);
        this.hmLines.scale.setScalar(s);
        this.labelObj.sprite.position.set(0, z.radius + 0.6, 0);
        this._updateLabel(this.labelText(id));
      }
    } else {
      this.hoverMarkerGroup.visible = false;
    }
    this.opts.onHover && this.opts.onHover(id);
  }

  _updateLabel(text) {
    const c = this.labelObj.canvas;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(0, 20, 30, 0.92)';
    ctx.strokeStyle = '#80ffff';
    ctx.lineWidth = 3;
    const pad = 8, h = 80, y = (c.height - h) / 2;
    ctx.beginPath();
    ctx.moveTo(20, y); ctx.lineTo(c.width - pad, y);
    ctx.lineTo(c.width - pad, y + h); ctx.lineTo(pad, y + h);
    ctx.lineTo(pad, y + 20); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#80ffff';
    ctx.font = 'bold 38px "Orbitron", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text || ''), 24, c.height / 2);
    this.labelObj.tex.needsUpdate = true;
  }

  _onPointerMove(ev) {
    this.lastInteract = performance.now();
    // Defer raycast to the animation frame — avoids running it 200+ times/sec
    this.pendingPointer = { clientX: ev.clientX, clientY: ev.clientY };
  }
  _onPointerLeave() { this.pendingPointer = null; this._setHover(null); }
  _onClick(ev) {
    this.lastInteract = performance.now();
    const id = this._pickMuscleId(ev);
    this.opts.onSelect && this.opts.onSelect(id);
  }
  _onDblClick(ev) {
    this.lastInteract = performance.now();
    const id = this._pickMuscleId(ev);
    if (!id) return;
    const z = this.muscleZones.find((z) => z.id === id);
    if (!z) return;
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    const newPos = z.center.clone().add(dir.multiplyScalar(3));
    this._animateCamera(newPos, z.center.clone());
  }

  _animateCamera(toPos, toTarget, dur = 700) {
    const fromPos = this.camera.position.clone();
    const fromTarget = this.controls.target.clone();
    const t0 = performance.now();
    const step = () => {
      if (this.disposed) return;
      const t = Math.min(1, (performance.now() - t0) / dur);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.camera.position.lerpVectors(fromPos, toPos, e);
      this.controls.target.lerpVectors(fromTarget, toTarget, e);
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  }

  _resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth, h = parent.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _onResize() { this._resize(); }

  _animate() {
    if (this.disposed) return;
    this._raf = requestAnimationFrame(() => this._animate());
    // Skip rendering when tab is hidden — saves CPU/GPU when away
    if (document.hidden) return;
    const now = performance.now();
    const t = now / 1000;
    this.holoMat.uniforms.uTime.value = t;

    // Process the most recent pointer event once per frame
    if (this.pendingPointer) {
      const id = this._pickMuscleId(this.pendingPointer);
      this.pendingPointer = null;
      this._setHover(id);
    }

    if (this.hoverMarkerGroup.visible) {
      this.hoverMarkerGroup.lookAt(this.camera.position);
      const pulse = 1.0 + Math.sin(t * 5.0) * 0.08;
      const baseS = (this.muscleZones.find((z) => z.id === this.hoveredId)?.radius || 0.35) / 0.35;
      this.hmRing.scale.setScalar(baseS * pulse);
      this.hmRing2.scale.setScalar(baseS * (2 - pulse));
    }

    // Idle auto-rotation: orbit camera around target after a few seconds of no input
    const idleTime = now - this.lastInteract;
    if (idleTime > this.idleDelay && !this.hoveredId) {
      const ramp = Math.min(1, (idleTime - this.idleDelay) / 1500); // ease in
      const dx = this.camera.position.x - this.controls.target.x;
      const dz = this.camera.position.z - this.controls.target.z;
      const r = Math.sqrt(dx * dx + dz * dz);
      const a = Math.atan2(dx, dz) + this.idleSpeed * 16 * ramp; // approx per-frame at 60fps
      this.camera.position.x = this.controls.target.x + Math.sin(a) * r;
      this.camera.position.z = this.controls.target.z + Math.cos(a) * r;
      this.camera.lookAt(this.controls.target);
    }

    this.controls.update();
    this.composer.render();
  }
}
