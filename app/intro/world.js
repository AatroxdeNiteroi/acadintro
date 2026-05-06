/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Resonance Chamber 3D world
   Soul core, 5 avatar sigils, particle field, starfield, post-FX.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { buildEnergyHeart } from './energyCore.js';
import { buildSigil3D } from './sigils3d.js';
import { buildTendril } from './tendrils.js';
import { prepareModel } from './modelLoader.js';
import { buildLivingNebula } from './livingNebula.js';
import { VignetteShader } from './postFX.js';
import * as audio from './audio.js';

// ── Avatar definitions ─────────────────────────────────────────────
// Each avatar has: identity, palette, the icon-key (canvas drawer), and an
// `env` object describing how the chamber transforms when this avatar binds.
export const AVATARS = [
  {
    // Darkin Aatrox — strong dark red (blood under steel, demonic)
    ns: 'aatrox', fn: 'darkin_protocol', label: 'DARKIN',
    color:  new THREE.Color('#8b0a14'),
    color2: new THREE.Color('#c8252a'),
    icon: 'aatrox',
    env: {
      fog:      new THREE.Color('#0c0102'),
      particleA:new THREE.Color('#7a0a14'),
      particleB:new THREE.Color('#3a0204'),
      ambient:  new THREE.Color('#5a0a14'),
      rim:      new THREE.Color('#a01a24'),
      coreDistort: 0.22,
    },
  },
  {
    ns: 'druid', fn: 'wildshape_kernel', label: 'WILD',
    color:  new THREE.Color('#3ddc84'),
    color2: new THREE.Color('#c5ffd5'),
    icon: 'druid',
    env: {
      fog:      new THREE.Color('#061812'),
      particleA:new THREE.Color('#3ddc84'),
      particleB:new THREE.Color('#cfff7a'),
      ambient:  new THREE.Color('#3ddc84'),
      rim:      new THREE.Color('#2a8055'),
      coreDistort: 0.14,
    },
  },
  {
    ns: 'kratos', fn: 'spartan_rage', label: 'SPARTAN',
    color:  new THREE.Color('#ffaa1a'),
    color2: new THREE.Color('#fff0a0'),
    icon: 'kratos',
    env: {
      fog:      new THREE.Color('#180806'),
      particleA:new THREE.Color('#ff8a22'),
      particleB:new THREE.Color('#ffd44a'),
      ambient:  new THREE.Color('#ff7722'),
      rim:      new THREE.Color('#ff4422'),
      coreDistort: 0.20,
    },
  },
  {
    // Berserk's Guts — Black Swordsman, Berserker Armor consuming him.
    // New language: cold pitch + dark steel gray (the armor's iron, the
    // void of Beast of Darkness — emotion drained out).
    ns: 'guts', fn: 'brand_of_sacrifice', label: 'BERSERKER',
    color:  new THREE.Color('#5e6068'),     // mid steel gray (more legible)
    color2: new THREE.Color('#9296a0'),     // bright brushed iron highlight
    icon: 'guts',
    env: {
      fog:      new THREE.Color('#06070a'),   // void with cold steel undertone
      particleA:new THREE.Color('#5a5a64'),
      particleB:new THREE.Color('#1c1c20'),
      ambient:  new THREE.Color('#2a2a32'),
      rim:      new THREE.Color('#5a5a64'),
      coreDistort: 0.16,
    },
  },
  {
    // Hollow Ichigo — the mask, white emptiness with subtle silver undertones.
    // New palette: pure white + pale ash. Hollows are unstained.
    ns: 'ichigo', fn: 'vasto_lorde', label: 'HOLLOW',
    color:  new THREE.Color('#f5f5f8'),     // off-white (slight cool)
    color2: new THREE.Color('#ffffff'),     // pure white
    icon: 'ichigo',
    env: {
      fog:      new THREE.Color('#0c0e12'),
      particleA:new THREE.Color('#dcdce0'),  // pale ash
      particleB:new THREE.Color('#8e8e94'),  // smoke
      ambient:  new THREE.Color('#aaaab0'),
      rim:      new THREE.Color('#dcdce0'),
      coreDistort: 0.10,                     // hollows are calm/empty, not chaotic
    },
  },
];

// ── Shared holographic shader (for sigils + soul core) ─────────────
const HOLO_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  uniform float uDistort;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vDisp;

  // Cheap pseudo-noise (one octave is enough for visual flow)
  float n31(vec3 p) {
    return sin(p.x * 1.7 + p.y * 2.3 + p.z * 1.9);
  }

  void main() {
    vec3 pos = position;
    float n =
      sin(pos.x * 3.0 + uTime * 0.7) * 0.5 +
      sin(pos.y * 2.5 + uTime * 0.9) * 0.5 +
      sin(pos.z * 4.0 + uTime * 0.6) * 0.5 +
      n31(pos * 2.0 + uTime * 0.4) * 0.4;
    n /= 1.9;
    vec3 disp = normal * n * uDistort * uPulse;
    pos += disp;

    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    vLocalPos = pos;
    vDisp = n;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const HOLO_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uIntensity;
  uniform float uHover;
  uniform float uAlpha;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vDisp;

  void main() {
    vec3 view = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - clamp(dot(view, vNormal), 0.0, 1.0), 2.4);

    // Concentric scanlines on local Y (rotates with object)
    float scan = sin(vLocalPos.y * 28.0 - uTime * 3.0) * 0.5 + 0.5;
    // Striations cross-axis
    float stri = sin(vLocalPos.x * 60.0 + uTime * 1.4) * 0.5 + 0.5;
    // Sparkle from displacement value
    float spark = pow(abs(vDisp), 3.0) * 1.2;

    vec3 col = mix(uColor * 0.4, uColor2, fres);
    col += stri * fres * 0.4;
    col += scan * 0.08;
    col += spark * uColor2;
    col *= uIntensity * (1.0 + uHover * 0.6);

    // Edge glow boost
    float edge = pow(fres, 0.7);
    float a = clamp(edge * 0.95 + 0.18 + uHover * 0.2, 0.0, 1.0) * uAlpha;
    gl_FragColor = vec4(col, a);
  }
`;

function makeHoloMaterial({ color, color2, distort = 0.04, intensity = 1.4 }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0 },
      uPulse:     { value: 1 },
      uDistort:   { value: distort },
      uColor:     { value: color },
      uColor2:    { value: color2 },
      uIntensity: { value: intensity },
      uHover:     { value: 0 },
      uAlpha:     { value: 1 },
    },
    vertexShader:   HOLO_VERT,
    fragmentShader: HOLO_FRAG,
    transparent:    true,
    depthWrite:     false,
    blending:       THREE.AdditiveBlending,
    side:           THREE.DoubleSide,
  });
}

// ── Particle field (drifting points around chamber) ────────────────
function buildParticleField(count = 90, radius = 14) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Sphere distribution, biased OUTWARD — keep particles away from the
    // central orb so they don't obscure the quantum knot.
    const t = Math.random();
    const r = 3.5 + Math.pow(t, 0.6) * radius;   // min radius 3.5 (well beyond orb)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i * 3 + 2] = r * Math.cos(phi);
    seeds[i] = Math.random();
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color('#7ad9f0') },
      uColor2:{ value: new THREE.Color('#ff5f8a') },
      uSize:  { value: 0.9 },
      uOpacity: { value: 0.55 },
      uConverge: { value: 0 },           // 0..1, pulls particles toward target
      uTarget: { value: new THREE.Vector3() },
    },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime;
      uniform float uSize;
      uniform float uConverge;
      uniform vec3  uTarget;
      varying float vSeed;

      void main() {
        vSeed = seed;
        vec3 p = position;
        // Drift along noisy circular flow
        float t = uTime * (0.15 + seed * 0.4) + seed * 6.28;
        p.x += sin(t)            * 0.4 * (0.6 + seed);
        p.y += cos(t * 0.7)      * 0.3 * (0.5 + seed);
        p.z += sin(t * 0.5 + 1.2)* 0.4 * (0.6 + seed);

        // Converge toward target when uConverge > 0
        p = mix(p, uTarget, uConverge * (0.55 + seed * 0.45));

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (260.0 / -mv.z) * (0.6 + seed * 0.8);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uColor2;
      uniform float uOpacity;
      varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColor, uColor2, vSeed);
        gl_FragColor = vec4(col, a * uOpacity);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });

  return new THREE.Points(geom, mat);
}

// ── Starfield ──────────────────────────────────────────────────────
function buildStarfield(count = 400, radius = 80) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random(), v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.7 + Math.random() * 0.3);
    positions[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);
    sizes[i] = 0.35 + Math.random() * 0.9;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      uniform float uTime;
      varying float vTwinkle;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (160.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
        vTwinkle = 0.6 + 0.4 * sin(uTime * (0.6 + aSize) + position.x);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vTwinkle;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vTwinkle;
        gl_FragColor = vec4(0.65, 0.78, 0.95, a * 0.45);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });
  return new THREE.Points(g, m);
}

// ── Floor grid (subtle, fades to fog) ──────────────────────────────
function buildFloorGrid() {
  const size = 50, divisions = 25;
  const grid = new THREE.GridHelper(size, divisions, 0x00aacc, 0x002233);
  grid.material.transparent = true;
  grid.material.opacity = 0.12;
  grid.material.depthWrite = false;
  grid.position.y = -3.4;
  return grid;
}

// ── Concentric chamber rings on the floor (architectural, not noisy) ──
function buildChamberRings() {
  const group = new THREE.Group();
  const radii = [3.4, 4.2, 5.4, 7.2];
  radii.forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.012, r + 0.012, 128),
      new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.22 - i * 0.04,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -3.39;
    group.add(ring);
  });
  // Cardinal markers (small dashed segments at four points on outer ring)
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2;
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.02, 0.06),
      new THREE.MeshBasicMaterial({
        color: 0xff2eaa,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    mark.position.set(Math.cos(ang) * 5.4, -3.38, Math.sin(ang) * 5.4);
    mark.rotation.y = -ang;
    group.add(mark);
  }
  return group;
}

// ── Per-sigil floor anchor (small platform under each effigy) ──────
function buildSigilAnchor(color) {
  const group = new THREE.Group();
  // outer ring
  const outer = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 0.92, 64),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.55,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  outer.rotation.x = -Math.PI / 2;
  group.add(outer);
  // inner ring
  const inner = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.57, 48),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  inner.rotation.x = -Math.PI / 2;
  group.add(inner);
  // 4 dashes around outer
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.012, 0.04),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.7, depthWrite: false,
      }),
    );
    dash.position.set(Math.cos(ang) * 1.05, 0, Math.sin(ang) * 1.05);
    dash.rotation.y = -ang;
    group.add(dash);
  }
  return group;
}

// ── Tether: animated dashed line from sigil → soul core ────────────
function buildTether(color) {
  const positions = new Float32Array(2 * 3);  // 2 points
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineDashedMaterial({
    color,
    dashSize: 0.18,
    gapSize: 0.22,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  return line;
}

// ── Custom RGB-shift / chromatic-aberration shader (for transitions) ──
const CHROMA_SHIFT = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount:  { value: 0.0 },
    uTime:    { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      float jitter = sin(vUv.y * 800.0 + uTime * 30.0) * 0.5 + 0.5;
      float shift = uAmount * (0.5 + jitter * 0.5);
      float r = texture2D(tDiffuse, vUv - dir * shift * dist).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + dir * shift * dist).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

// ── World factory ──────────────────────────────────────────────────
// Yield to the browser so the loading UI keeps animating + paint happens.
// Two frames of raf gives the layout/paint pipeline real time to flush.
function yieldFrame() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

export async function createWorld(canvas, models = {}, onStage) {
  const stage = (label) => onStage && onStage(label);
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
  });
  // Cap pixel ratio at 1.5 (huge perf gain on retina/4K, no visual loss with bloom)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000308, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020812, 0.038);

  const camera = new THREE.PerspectiveCamera(
    52, window.innerWidth / window.innerHeight, 0.1, 200,
  );
  camera.position.set(0, 1.4, 9);
  camera.lookAt(0, 0.4, 0);

  // ── Cinematic lighting (HDR env handles ambient/IBL) ──────────────
  // Brighter ambient + slight cyan tint — futuristic chamber light.
  const ambient = new THREE.AmbientLight(0x4a5a6e, 0.55);
  scene.add(ambient);

  // Key light — soft directional, casts shadows on the floor only.
  const key = new THREE.DirectionalLight(0xfbeac9, 1.1);
  key.position.set(-6, 9, 5);
  key.castShadow = true;
  // 512px shadow map — visually fine for soft floor shadow, much faster
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left   = -10;
  key.shadow.camera.right  =  10;
  key.shadow.camera.top    =  10;
  key.shadow.camera.bottom = -10;
  key.shadow.camera.near   = 1;
  key.shadow.camera.far    = 30;
  key.shadow.bias          = -0.0005;
  scene.add(key);

  // Two atmospheric rims (cyan + magenta) — kept for color presence.
  const rim = new THREE.PointLight(0x00d4ff, 1.4, 40);
  rim.position.set(-7, 6, 7);
  scene.add(rim);
  const rim2 = new THREE.PointLight(0xff2eaa, 1.0, 32);
  rim2.position.set(8, -2, -5);
  scene.add(rim2);

  // Subtle floor grid (kept) — but chamber rings are out (HDR + soft
  // shadow do that job better).
  const floorGrid = buildFloorGrid();
  scene.add(floorGrid);

  // Real shadow-receiving floor plane — large, dark, slightly reflective
  const floorMat = new THREE.MeshStandardMaterial({
    color:     0x080d14,
    metalness: 0.65,
    roughness: 0.55,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.4;
  floor.receiveShadow = true;
  scene.add(floor);

  // (Chamber rings removed — were competing with HDR reflections)
  const chamber = new THREE.Group();      // empty placeholder for env tinting
  scene.add(chamber);

  stage('LIGHTING');
  await yieldFrame();

  // ── Living nebula: animated procedural energy clouds, behind everything
  const nebula = buildLivingNebula({ radius: 45 });
  scene.add(nebula.mesh);

  stage('NEBULA');
  await yieldFrame();

  // ── Skybox: Sky/Universe model as the chamber's surrounding void ──
  // Strip out any "planet"-like meshes (heuristic: discard meshes whose
  // bounding sphere is small relative to the largest mesh — those are
  // celestial bodies. Keep only the dome of stars/dust.)
  let skyGroup = null;
  let stars = null;
  if (models.skybox) {
    const sky = models.skybox.scene.clone(true);
    // Compute volume per mesh, keep only meshes with bounding-sphere radius
    // greater than 30% of the largest mesh's radius. Removes planets/orbs.
    const meshes = [];
    sky.traverse((o) => {
      if (o.isMesh && o.geometry) {
        o.geometry.computeBoundingSphere();
        meshes.push({ mesh: o, r: o.geometry.boundingSphere?.radius || 0 });
      }
    });
    if (meshes.length) {
      const maxR = Math.max(...meshes.map((m) => m.r));
      const keepThreshold = maxR * 0.30;
      meshes.forEach(({ mesh, r }) => {
        if (r < keepThreshold) {
          mesh.parent && mesh.parent.remove(mesh);
        } else {
          // Lock this material onto the BackSide so we render the inside of
          // the dome — and ensure it ignores tone-mapping effects.
          if (mesh.material) {
            mesh.material = mesh.material.clone();
            mesh.material.side = THREE.BackSide;
            mesh.material.depthWrite = false;
            mesh.material.fog = false;
            mesh.material.toneMapped = false;
            // Boost emissive if present so stars are visible
            if (!mesh.material.emissive) mesh.material.emissive = new THREE.Color();
            mesh.material.emissive.setHex(0xffffff);
            mesh.material.emissiveIntensity = 0.45;
          }
          mesh.renderOrder = -1;
          mesh.frustumCulled = false;
        }
      });
      console.log('[skybox] kept', meshes.filter((m) => m.r >= keepThreshold).length, 'of', meshes.length, 'meshes');
    }
    // Scale the surviving dome huge so the camera is well inside it
    sky.scale.setScalar(60);
    skyGroup = sky;
    scene.add(skyGroup);
    // Use a black scene background so anything outside the dome shows black
    scene.background = new THREE.Color(0x00010a);
  } else {
    // Fallback: no skybox loaded — keep procedural starfield
    stars = buildStarfield();
    scene.add(stars);
  }

  stage('SKYBOX');
  await yieldFrame();

  // Particle field — minimal, pushed to the chamber edges (away from orb)
  const particles = buildParticleField(80, 12);
  scene.add(particles);

  // ── HDR environment (RGBELoader) — awaitable promise ──────────────
  // We RESOLVE this before the warm-up renders so scene.environment is
  // set in time. If HDR arrived AFTER warm-up, every PBR material would
  // dirty + recompile their env-map permutations on first interactive
  // frame — a guaranteed stutter.
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const hdrPromise = new Promise((resolve) => {
    new RGBELoader().setPath('/hdr/').load(
      'moonless_golf_1k.hdr',
      (hdr) => {
        const envMap = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = envMap;
        hdr.dispose();
        pmrem.dispose();
        resolve();
      },
      undefined,
      (err) => {
        console.warn('[hdr] failed to load — falling back to lights', err);
        resolve();
      },
    );
  });

  // Renderer must produce shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Energy Heart core ────────────────────────────────────────────
  // Procedural translucent orb (domain-warp noise + fresnel) with the
  // quantum_knot mesh CHURNING INSIDE — like a brain in a jar of light.
  const coreGroup = new THREE.Group();
  scene.add(coreGroup);
  const heart = buildEnergyHeart({ radius: 1.65 });
  coreGroup.add(heart.mesh);

  // Quantum knot at the heart's center — visible through the translucent shell.
  // GLBs often ship with extra meshes (base, decoration, frame). We prune
  // everything except the highest-vertex-count mesh so the orb reads clean.
  let knot = null;
  if (models.knot) {
    const prepared = prepareModel(models.knot, { targetSize: 1.6 });
    if (prepared.root) {
      // Find heaviest mesh in the cloned tree
      let topMesh = null, topCount = 0;
      prepared.root.traverse((o) => {
        if (o.isMesh) {
          const c = o.geometry.attributes.position?.count || 0;
          if (c > topCount) { topCount = c; topMesh = o; }
        }
      });
      // Remove every other mesh
      const toRemove = [];
      prepared.root.traverse((o) => {
        if (o.isMesh && o !== topMesh) toRemove.push(o);
      });
      toRemove.forEach((m) => m.parent && m.parent.remove(m));
      console.log('[knot] kept', topMesh?.name || '(unnamed)', 'verts=', topCount, 'removed', toRemove.length);
    }
    knot = prepared.root;
    // Plasma knot — translucent, heavily emissive, refractive.
    // Reads as "energy condensed into a knot of geometry" rather than metal.
    const knotMat = new THREE.MeshPhysicalMaterial({
      color:              0x0a2030,
      metalness:          0.0,
      roughness:          0.15,
      transmission:       0.75,         // see-through plasma
      thickness:          0.6,
      ior:                1.42,
      attenuationColor:   new THREE.Color(0x004060),
      attenuationDistance: 0.8,
      emissive:           new THREE.Color(0x40e0ff),
      emissiveIntensity:  1.4,          // strong plasma glow
      envMapIntensity:    2.2,
      clearcoat:          0.6,
      clearcoatRoughness: 0.20,
    });
    prepared.root.traverse((obj) => {
      if (obj.isMesh) obj.material = knotMat;
    });
    knot.userData.material = knotMat;
    coreGroup.add(knot);
  }

  // Single thin orbital ring — clean architectural accent
  const orbitMat = new THREE.MeshBasicMaterial({
    color: 0x9ee8ff, transparent: true, opacity: 0.55,
    depthWrite: false,
  });
  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.15, 0.008, 6, 128),
    orbitMat,
  );
  orbitRing.rotation.x = Math.PI * 0.45;
  coreGroup.add(orbitRing);

  // For the env-transition tween: list of materials whose color shifts
  // when an avatar binds — the orbit ring + the knot's emissive.
  const coreColorTargets = [orbitMat];
  if (knot) {
    // We use a separate color object since knot material has its own emissive
    coreColorTargets.push({ color: knot.userData.material.emissive });
  }

  // Compatibility aliases (consumed by older director code paths)
  const coreMesh    = heart.mesh;
  const nucleus     = heart.mesh;       // no separate nucleus anymore
  const shellWire   = orbitRing;
  const coreRings   = [{ mesh: orbitRing, speed: 0.0010, def: { axis: 'y' } }];

  stage('CORE');
  await yieldFrame();

  // ── 5 Avatar Sigils orbiting the core ────────────────────────────
  const sigilGroup = new THREE.Group();
  scene.add(sigilGroup);

  const ORBIT_RADIUS = 4.2;
  const SIGIL_Y = 0.4;
  const TAU = Math.PI * 2;

  const sigils = [];
  for (let i = 0; i < AVATARS.length; i++) {
    const avatar = AVATARS[i];
    sigils.push(await (async () => {
    const group = new THREE.Group();
    const angle = (i / AVATARS.length) * TAU - Math.PI / 2;
    group.position.set(
      Math.cos(angle) * ORBIT_RADIUS,
      SIGIL_Y + Math.sin(i * 1.7) * 0.25,
      Math.sin(angle) * ORBIT_RADIUS,
    );

    // ── Refined futuristic podium (reactor-pad style) ─────────────
    // Layered: thin reflective base disc + 2 emissive rings + hex ticks +
    // 4 cardinal markers + 1 orbiting tracer node. Reads as architectural
    // tech, not just a glow ring.
    const PY = -1.0;       // base Y for the podium

    // 1. Base disc — slim, reflective dark glass
    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(1.10, 1.15, 0.05, 64),
      new THREE.MeshStandardMaterial({
        color:     0x0a0e14,
        metalness: 0.95,
        roughness: 0.18,
      }),
    );
    podium.position.y = PY;
    podium.receiveShadow = true;
    podium.castShadow = false;
    group.add(podium);

    // Bright emissive color used by the rings — multiplied past 1.0 so
    // bloom catches them strongly while the lines themselves stay crisp.
    const ringEmissive = avatar.color.clone().multiplyScalar(2.2);

    // 2. Outer emissive ring (avatar color)
    const podiumRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.014, 10, 160),
      new THREE.MeshBasicMaterial({
        color: ringEmissive, transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending, depthWrite: false,
        toneMapped: false,    // keep the line crisp — ignore tone mapping
      }),
    );
    podiumRing.rotation.x = Math.PI / 2;
    podiumRing.position.y = PY + 0.052;
    group.add(podiumRing);

    // 3. Inner concentric ring (smaller, even thinner — tech feel)
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.005, 8, 128),
      new THREE.MeshBasicMaterial({
        color: ringEmissive, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
        toneMapped: false,
      }),
    );
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = PY + 0.053;
    group.add(innerRing);

    // 4. Outer halo (very soft, large) — atmospheric
    const haloRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.004, 6, 160),
      new THREE.MeshBasicMaterial({
        color: avatar.color, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false,
        toneMapped: false,
      }),
    );
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.y = PY + 0.054;
    group.add(haloRing);

    // 5. Hex tick marks — 12 evenly-spaced short dashes around outer ring
    const tickGroup = new THREE.Group();
    tickGroup.position.y = PY + 0.057;
    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2;
      const isCardinal = k % 3 === 0;     // every 4th = cardinal (longer)
      const tickW = isCardinal ? 0.18 : 0.07;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(tickW, 0.008, 0.020),
        new THREE.MeshBasicMaterial({
          color: ringEmissive,
          transparent: true,
          opacity: isCardinal ? 1.0 : 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      const r = 1.22;
      tick.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
      tick.rotation.y = -ang;
      tickGroup.add(tick);
    }
    group.add(tickGroup);

    // 6. Orbiting tracer — single bright dot moving around the outer ring
    const tracer = new THREE.Mesh(
      new THREE.SphereGeometry(0.030, 12, 12),
      new THREE.MeshBasicMaterial({
        color: (avatar.color2 || avatar.color).clone().multiplyScalar(2.5),
        transparent: true, opacity: 1.0, depthWrite: false,
        toneMapped: false,
      }),
    );
    tracer.userData.angle = Math.random() * Math.PI * 2;
    tracer.userData.radius = 1.12;
    tracer.userData.yLevel = PY + 0.055;
    tracer.userData.speed = 0.35 + Math.random() * 0.15;
    group.add(tracer);

    // 7. Floor glow disc (subtle lift under the model — additive)
    const glowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.00, 64),
      new THREE.MeshBasicMaterial({
        color: avatar.color, transparent: true, opacity: 0.45,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.y = PY + 0.051;
    group.add(glowDisc);

    // Ichigo's hollow mask reflects light very aggressively — keep it
    // very dim so only a HINT of glow accentuates the silhouette.
    const lightScale = avatar.icon === 'ichigo' ? 0.18 : 1.0;

    // 8. Uplight spotlight — paints the model from below
    const upLight = new THREE.SpotLight(
      avatar.color.getHex(), 5.5 * lightScale, 4.5, Math.PI * 0.45, 0.6, 1.4,
    );
    upLight.position.set(0, PY + 0.3, 0);
    upLight.target.position.set(0, 1.0, 0);
    group.add(upLight);
    group.add(upLight.target);

    // 9. KEY LIGHT — neutral white front-fill so the model's geometric
    // detail reads against the dark void. Positioned in front of the
    // model facing inward.
    const keyLight = new THREE.PointLight(0xfff4dd, 8.0 * lightScale, 4.0, 1.4);
    keyLight.position.set(0, 0.5, 1.6);
    group.add(keyLight);

    // 10. BACK RIM — tinted highlight from behind to separate silhouette
    const rimSigil = new THREE.PointLight(avatar.color.getHex(), 3.0 * lightScale, 3.5, 1.6);
    rimSigil.position.set(0, 0.4, -1.6);
    group.add(rimSigil);

    // 2. The sigil itself — real GLB model when available, SVG-extrude fallback
    let mesh, builtMaterial;
    const allMaterials = [];   // every material we should hover-update on this sigil
    const modelGltf = models[avatar.icon];
    if (modelGltf) {
      const SIZE_BY_AVATAR = {
        aatrox: 3.30,    // bigger sword
        druid:  1.95,
        kratos: 2.05,
        ichigo: 1.90,
        guts:   1.85,
      };
      const target = SIZE_BY_AVATAR[avatar.icon] ?? 1.85;

      // Aatrox is plunged blade-down (the canonical Darkin pose).
      // We center-align, then flip 180°, then snap the lowest visible point
      // (now the blade tip) to just above the podium top.
      const isAatrox = avatar.icon === 'aatrox';
      const useBottomAlign =
        avatar.icon === 'druid' || avatar.icon === 'kratos';
      const Y_NUDGE = {
        druid:  -0.93,
        kratos: -0.93,
        ichigo: -0.10,
        guts:    0.10,
      };

      const prepared = prepareModel(modelGltf, {
        targetSize: target,
        bottomAlign: useBottomAlign,
      });
      mesh = prepared.root;

      if (isAatrox) {
        // Vertical flip — rotation.x flips Y axis (top ↔ bottom). Blade
        // points DOWN at the podium afterwards.
        mesh.rotation.x = Math.PI;
        // Snap so the lowest point (blade tip) hovers just above podium
        mesh.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(mesh);
        const TIP_FLOAT_Y = -0.85;
        mesh.position.y += TIP_FLOAT_Y - bbox.min.y;
      } else {
        mesh.position.y = Y_NUDGE[avatar.icon] ?? -0.93;
      }

      // Druid model is shipped untextured — fully replace its material with
      // a wild/woodland PBR recipe so the werewolf doesn't read as plastic.
      const isDruid = avatar.icon === 'druid';
      // Guts' Brand of Sacrifice — pitch black with violently bleeding emissive
      // red. The Brand BLEEDS in canon — we lean into that.
      const isGuts = avatar.icon === 'guts';

      prepared.root.traverse((c) => {
        if (c.isMesh) {
          if (isDruid) {
            // Wild/feral wolf material — dark fur with green sheen + emissive
            c.material = new THREE.MeshPhysicalMaterial({
              color:              0x2a1f15,
              metalness:          0.05,
              roughness:          0.78,
              sheen:              1.0,
              sheenColor:         new THREE.Color(0x6cffa6),
              sheenRoughness:     0.55,
              emissive:           avatar.color.clone().multiplyScalar(0.18),
              emissiveIntensity:  0.40,
              envMapIntensity:    0.85,
            });
          } else if (isGuts) {
            // Brand of Sacrifice as cold, etched steel — the Berserker
            // Armor's iron. Mid gray (was too dark to read against the void).
            c.material = new THREE.MeshPhysicalMaterial({
              color:              0x3e4046,
              metalness:          0.78,
              roughness:          0.38,
              clearcoat:          0.55,
              clearcoatRoughness: 0.28,
              emissive:           new THREE.Color(0x8a8e98),
              emissiveIntensity:  0.65,
              envMapIntensity:    1.6,
            });
          } else if (avatar.icon === 'ichigo') {
            // Hollow mask — preserve the GLB's original textures verbatim.
            // Just clone the material so per-instance state isn't shared.
            c.material = c.material ? c.material.clone() : c.material;
            // Mark this sigil's materials so the loop skips emissive boosts.
            // (User wants the painted texture untouched.)
          } else if (c.material) {
            // Other characters: clone the textured GLB material + add emissive
            c.material = c.material.clone();
            if (!c.material.emissive) c.material.emissive = new THREE.Color();
            c.material.emissive.copy(avatar.color).multiplyScalar(0.20);
            c.material.emissiveIntensity = 0.30;
          } else {
            // Untextured fallback for other models with no material at all
            c.material = new THREE.MeshStandardMaterial({
              color: avatar.color.clone().multiplyScalar(0.4),
              metalness: 0.5,
              roughness: 0.5,
              emissive: avatar.color.clone().multiplyScalar(0.2),
              emissiveIntensity: 0.4,
            });
          }
          // Skip shadow casting on the spinning model — costly per-frame
          // and visually negligible (uplight + halo handle silhouette).
          c.castShadow = false;
          allMaterials.push(c.material);
        }
      });
      builtMaterial = allMaterials[0] ?? new THREE.MeshStandardMaterial({ color: 0x666 });
      group.add(mesh);
    } else {
      // SVG-extrude fallback (Gun Park)
      const built = buildSigil3D(avatar.icon, { depth: 24, bevelSize: 3, targetSize: 1.7 });
      mesh = built.mesh;
      mesh.castShadow = true;
      mesh.position.y = 0.15;
      builtMaterial = built.material;
      allMaterials.push(built.material);
      group.add(mesh);
    }

    // Hover hit-box (covers the sigil + small margin)
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.userData.avatarIndex = i;
    group.add(hit);

    // Per-sigil colored point light — paints the chamber with avatar hue
    const light = new THREE.PointLight(avatar.color.getHex(), 0.0, 7, 1.6);
    light.position.set(0, 0.4, -0.4);
    group.add(light);

    // Procedural shader tendril (TubeGeometry + flowing comet shader)
    // — connecting the energy heart to this shrine's anchor.
    const tendril = buildTendril(
      new THREE.Vector3(0, 0.4, 0),
      group.position.clone(),
      avatar.color,
    );
    sigilGroup.add(tendril.mesh);
    tendril.materials = null;   // no GLB-material list — shader-only path

    sigilGroup.add(group);
    return {
      avatar, group, mesh, hit, light, upLight, keyLight, rimSigil,
      podium, podiumRing, innerRing, haloRing, glowDisc, tickGroup, tracer,
      tendril,
      material: builtMaterial,
      allMaterials,
      // Ichigo's hollow mask should keep its painted texture intact —
      // skip the loop's emissive intensity rewrite for this sigil.
      preserveTexture: avatar.icon === 'ichigo',
      baseAngle: angle,
      basePos: group.position.clone(),
      hovered: false, dimmed: false,
      revealAmount: 0,
      uniformProxy: {
        uIntensity: { value: 1.0 },
        uHover:     { value: 0 },
        uAlpha:     { value: 1 },
      },
    };
    })());
    // Yield to the browser between heavy sigil builds — gives the loader
    // bar a chance to repaint and avoids visible freezing on slow GLBs.
    stage(`SIGIL ${i + 1}/${AVATARS.length}`);
    await yieldFrame();
  }

  // ── Postprocessing pipeline (Phase B, god-rays disabled) ──────
  // Order: render → DOF → bloom → chroma → vignette → film grain
  // (God rays removed per feedback — they overpowered the heart.)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // DOF kept very gentle — wide depth of field, minimal blur. Adds depth
  // perception without eating geometric detail.
  const bokehPass = new BokehPass(scene, camera, {
    focus:    8.5,
    aperture: 0.00003,
    maxblur:  0.0025,
  });
  composer.addPass(bokehPass);

  // Bloom: stronger glow but TIGHTER radius — keeps bright details crisp
  // (large radius bleeds light across the image and softens edges).
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.75, 0.32, 0.55,
  );
  composer.addPass(bloomPass);

  // Motion blur — disabled by default, the director enables it during the
  // selection-arc camera move (and disables once the camera settles).
  const afterimagePass = new AfterimagePass(0.86);
  afterimagePass.enabled = false;
  composer.addPass(afterimagePass);

  const chromaPass = new ShaderPass(CHROMA_SHIFT);
  composer.addPass(chromaPass);

  const vignettePass = new ShaderPass(VignetteShader);
  composer.addPass(vignettePass);

  // Subtle grain — was 0.16 (visible texture), now barely there
  const filmPass = new FilmPass(0.05, false);
  composer.addPass(filmPass);

  // Wait for HDR before compile — scene.environment must be present so
  // PBR materials register their envMap permutations during compile.
  stage('ENV_MAP');
  await hdrPromise;
  await yieldFrame();

  // Pre-compile shaders + upload textures BEFORE the boot timeline runs.
  stage('COMPILING');
  await yieldFrame();
  renderer.compile(scene, camera);
  await yieldFrame();

  // ── Two-stage warm-up ────────────────────────────────────────────
  // Drive the full composer pipeline at MULTIPLE camera positions so
  // every depth-state + frustum permutation gets exercised before the
  // user sees anything. Curtain + loader cover the canvas throughout.
  stage('WARMING');

  // Save current camera state so we can restore it.
  const _camStart = camera.position.clone();
  const _camTarget = new THREE.Vector3(0, 0.4, 0);

  // Pose A — boot start camera (close to heart)
  camera.position.set(0, 0.5, 3.2);
  camera.lookAt(_camTarget);
  for (let i = 0; i < 6; i++) {
    composer.render();
    await yieldFrame();
  }

  // Pose B — boot end camera (settled, far back)
  camera.position.set(0, 1.4, 9);
  camera.lookAt(_camTarget);
  for (let i = 0; i < 6; i++) {
    composer.render();
    await yieldFrame();
  }

  // Restore for the boot timeline (director resets this anyway, but we
  // keep things tidy).
  camera.position.copy(_camStart);

  // Final settle hold — pipeline stable, no last-second compile spikes.
  stage('READY');
  await new Promise((r) => setTimeout(r, 600));

  // ── Resize handling ──────────────────────────────────────────────
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
    if (bokehPass.setSize) bokehPass.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // ── Mouse for parallax + raycasting ──────────────────────────────
  const mouseNDC = new THREE.Vector2();   // normalized device coords (raycaster)
  const mouseSmooth = new THREE.Vector2(); // 0..1 smoothed
  window.addEventListener('pointermove', (e) => {
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -((e.clientY / window.innerHeight) * 2 - 1);
  });

  // Scroll-wheel rotation accumulator. Each wheel event nudges the
  // carousel angle; the loop lerps `state.angleScroll` toward it for
  // a weighty, smoothed feel.
  let wheelTarget = 0;
  window.addEventListener('wheel', (e) => {
    // Each notch rotates ~10° (Math.PI/18). normalize across deltaModes.
    const lineFactor = e.deltaMode === 1 ? 16 : 1;
    const dy = e.deltaY * lineFactor;
    wheelTarget += dy * 0.0024;
    audio.wheelTick();
  }, { passive: true });

  const raycaster = new THREE.Raycaster();

  // ── Mutable state bag (animatable directly via GSAP) ─────────────
  const state = {
    bloom: 0.55,            // bloom strength (settled value)
    chroma: 0.0,            // chromatic aberration amount
    exposure: 1.0,          // tone mapping exposure
    orbitSpeed: 0.012,      // sigil ambient drift (very slow)
    mouseInfluence: 0.0,    // 0..1 — parallax intensity
    mouseRotateInfluence:0, // 0..1 — how strongly mouse drives rotation
    angleOffset: 0,         // current rotational offset of the carousel
    angleScroll: 0,         // accumulated wheel-driven rotation (lerps to target)
    heartIntensity: 0,      // 0..1 — drives energy-heart shader uIntensity
  };

  // ── Render loop ──────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let coreSpin = 0;
  let running = true;

  // Scratch vector reused for per-frame focus distance math
  const _focusVec = new THREE.Vector3();

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);

    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    // Apply animatable state to the engine each frame
    bloomPass.strength = state.bloom;
    chromaPass.uniforms.uAmount.value = state.chroma;
    renderer.toneMappingExposure = state.exposure;

    // Update shader times (core no longer uses a time-based shader)
    particles.material.uniforms.uTime.value = t;
    if (stars) stars.material.uniforms.uTime.value = t;
    if (nebula) nebula.material.uniforms.uTime.value = t;
    chromaPass.uniforms.uTime.value = t;
    vignettePass.uniforms.uTime.value = t;

    // DOF: focus distance auto-tracks the lookAt target (heart by default,
    // chosen sigil during selection, hovered sigil if any).
    let focusTarget = _focusVec;
    focusTarget.set(0, 0.4, 0);
    let hovered = null;
    for (let h = 0; h < sigils.length; h++) {
      if (sigils[h].hovered) { hovered = sigils[h]; break; }
    }
    if (hovered) {
      hovered.group.getWorldPosition(focusTarget);
    }
    const focusDist = camera.position.distanceTo(focusTarget);
    bokehPass.uniforms.focus.value = focusDist;
    // Sigil materials are now MeshPhysicalMaterial (no uTime — PBR doesn't need it)

    // Smooth mouse for parallax (independent of raf rate)
    mouseSmooth.x += (mouseNDC.x - mouseSmooth.x) * Math.min(1, dt * 4);
    mouseSmooth.y += (mouseNDC.y - mouseSmooth.y) * Math.min(1, dt * 4);

    // Camera parallax — only override lookAt when influence is non-zero.
    // This lets GSAP-driven sequences (dolly, selection, warp) own the camera.
    if (state.mouseInfluence > 0.01) {
      const lookY = 0.4 + mouseSmooth.y * 0.45 * state.mouseInfluence;
      const lookX = mouseSmooth.x * 0.9 * state.mouseInfluence;
      camera.lookAt(lookX, lookY, 0);
    }

    // Energy Heart: feed time + intensity to the procedural shader
    coreSpin += dt * 0.10;
    coreGroup.rotation.y = coreSpin * 0.18;
    heart.material.uniforms.uTime.value = t;
    heart.material.uniforms.uIntensity.value = state.heartIntensity;
    // The orbit ring spins slowly
    orbitRing.rotation.z += 0.0010;
    orbitMat.opacity = 0.55 * state.heartIntensity;
    // Heart inner light pulses with breath
    heart.innerLight.intensity = (1.1 + Math.sin(t * 1.8) * 0.5) * state.heartIntensity;
    // Quantum knot — plasma core: tumbles on multiple axes, emissive
    // breathes between cyan and magenta over time so it reads as alive.
    if (knot) {
      knot.rotation.y += 0.004;
      knot.rotation.x = Math.sin(t * 0.3) * 0.4;
      knot.rotation.z = Math.cos(t * 0.25) * 0.3;
      const km = knot.userData.material;
      // HSL drift in the violet-cyan range — feels like contained lightning
      const hue = 0.52 + Math.sin(t * 0.18) * 0.06;
      km.emissive.setHSL(hue, 1.0, 0.55);
      km.emissiveIntensity = (1.2 + Math.sin(t * 1.6) * 0.4) * state.heartIntensity;
    }

    // Mouse-driven angular offset (mouse X) + wheel-driven absolute angle.
    // Both smoothed toward their targets for weight.
    const targetOffset = mouseSmooth.x * Math.PI * 1.1 * state.mouseRotateInfluence;
    state.angleOffset += (targetOffset - state.angleOffset) * Math.min(1, dt * 2.4);
    state.angleScroll += (wheelTarget - state.angleScroll) * Math.min(1, dt * 3.2);

    // Rotate the entire carousel — wheel + mouse + ambient drift compose
    sigilGroup.rotation.y = t * state.orbitSpeed + state.angleOffset + state.angleScroll;

    // Sigils: refined sigil rotation + emissive sync
    sigils.forEach((s, i) => {

      // The sigil mesh continuously rotates on Y, showing depth + bevel.
      // It also tilts slightly with idle motion for a breathing feel.
      const baseSpin = t * 0.35 + i * 1.1;
      s.mesh.rotation.y = baseSpin;
      s.mesh.rotation.x = Math.sin(t * 0.5 + i * 0.7) * 0.10;

      // Hover lerp on the proxy uniform
      const hoverTarget = s.hovered ? 1 : 0;
      const proxy = s.uniformProxy.uHover;
      proxy.value += (hoverTarget - proxy.value) * 0.12;

      // Mirror proxy values to ALL the model's materials (multi-mesh GLBs).
      // Higher baseline so models pop with futuristic emissive shine.
      const intensity = s.uniformProxy.uIntensity.value;
      const alphaValue = s.uniformProxy.uAlpha.value;
      const isTransparent = alphaValue < 0.999;
      const baseEmissive = 0.95;
      const emissiveValue = baseEmissive * intensity * (1 + proxy.value * 1.8);
      for (let m = 0; m < s.allMaterials.length; m++) {
        const mat = s.allMaterials[m];
        mat.opacity = alphaValue;
        if (isTransparent) {
          // Boot fade — transparency on, depth-write off so sub-meshes
          // blend correctly during reveal.
          mat.transparent = true;
          mat.depthWrite  = false;
        } else {
          // Settled — fully opaque + write to depth buffer so closer
          // models occlude farther ones in the carousel rotation.
          // (Some GLBs ship with transparent:true even at full alpha,
          // which lets background sigils draw on top of foreground ones.
          // Forcing opaque here defeats that.)
          mat.transparent = false;
          mat.depthWrite  = true;
        }
        // Skip emissive rewrite for sigils marked preserveTexture (e.g. ichigo —
        // painted texture should not be flooded by our boost).
        if (!s.preserveTexture) mat.emissiveIntensity = emissiveValue;
      }

      // Podium accents — preserve-texture sigils (ichigo) get a much subtler
      // hover boost AND a reduced baseline since their white material reads
      // very bright additively.
      const isPT = s.preserveTexture;
      const hoverScale = isPT ? 0.30 : 1.0;
      const baseScale  = isPT ? 0.50 : 1.0;
      const hov = proxy.value * hoverScale;
      s.podiumRing.material.opacity = (1.05 + hov * 0.55) * baseScale;
      s.innerRing.material.opacity  = (0.75 + hov * 0.40) * baseScale;
      s.haloRing.material.opacity   = (0.55 + hov * 0.55) * baseScale;
      s.glowDisc.material.opacity   = (0.65 + hov * 0.45) * baseScale;
      // Per-sigil lights — ichigo gets a deeper cut (white amplifies any input)
      const lightK = isPT ? 0.18 : 1.0;
      s.upLight.intensity = (5.5 + proxy.value * 6.0) * lightK;

      // Orbiting tracer — slow ring spin, +slight speed-up on hover
      s.tracer.userData.angle += dt * (s.tracer.userData.speed + proxy.value * 0.6);
      const tA = s.tracer.userData.angle;
      const tR = s.tracer.userData.radius;
      s.tracer.position.set(Math.cos(tA) * tR, s.tracer.userData.yLevel, Math.sin(tA) * tR);

      // Inner ring counter-rotates slowly for tech feel
      s.innerRing.rotation.z += 0.004;
      s.tickGroup.rotation.y -= 0.002;

      // Per-sigil light tracks hover for chamber color paint
      s.light.intensity = proxy.value * 2.4;

      // Tendril intensity — works for both GLB connection and shader fallback
      const tendrilIntensity = (0.6 + proxy.value * 0.6) * s.revealAmount;
      if (s.tendril.materials) {
        // GLB tendril — animate opacity + emissive pulse
        const opacityVal = Math.min(1.0, s.revealAmount * 0.95);
        const emissivePulse = 1.4 + Math.sin(t * 1.2 + i * 0.7) * 0.3 + proxy.value * 0.8;
        for (let m = 0; m < s.tendril.materials.length; m++) {
          s.tendril.materials[m].opacity = opacityVal;
          s.tendril.materials[m].emissiveIntensity = emissivePulse * s.revealAmount;
        }
      } else if (s.tendril.material?.uniforms) {
        // Procedural shader path (current)
        s.tendril.material.uniforms.uTime.value = t;
        s.tendril.material.uniforms.uReveal.value = s.revealAmount;
        // Tendril intensity — preserve-texture sigils (ichigo) get reduced
        // since their tendril is also white and reads very luminous.
        const tendrilScale = s.preserveTexture ? 0.45 : 1.0;
        s.tendril.material.uniforms.uIntensity.value =
          (1.20 + proxy.value * 0.9) * s.revealAmount * tendrilScale;
      }
    });

    // Particles drift speed already in shader (uTime)

    composer.render();
  }
  loop();

  // ── Public API ────────────────────────────────────────────────────
  function pickSigil() {
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = sigils.map((s) => s.hit);
    const isect = raycaster.intersectObjects(hits, false);
    if (!isect.length) return null;
    const idx = isect[0].object.userData.avatarIndex;
    return sigils[idx];
  }
  function projectToScreen(vec3) {
    const v = vec3.clone().project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
      visible: v.z < 1,
    };
  }
  function dispose() {
    running = false;
    window.removeEventListener('resize', onResize);
    renderer.dispose();
  }

  return {
    THREE,
    renderer, scene, camera, composer,
    sigils, coreGroup, coreMesh, nucleus, shellWire, particles, stars,
    heart, orbitRing,
    coreColorTargets, coreRings,
    raycaster, mouseNDC,
    chamber, floorGrid, ambient, rim, rim2,
    afterimagePass,
    state,
    pickSigil, projectToScreen, dispose,
  };
}
