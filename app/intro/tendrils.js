/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Energy tendrils (core ↔ shrines).

   Animated tube meshes connecting the energy heart at origin
   to each shrine's anchor point. Custom shader scrolls a
   pulse-pattern along the tube + ramps from core's accent
   color into the shrine's avatar color.

   The tendrils are the ANSWER to the user's "fluxo de energia
   constante" — a tendril is always alive, even idle.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vAlongTube;     // 0 at core end → 1 at shrine end
  void main() {
    vUv = uv;
    vAlongTube = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;     // 0..1 — fades in/out
  uniform float uReveal;        // 0..1 — how far down the tube has reached
  uniform vec3  uColorCore;     // accent at core end
  uniform vec3  uColorShrine;   // avatar color at shrine end
  varying vec2 vUv;
  varying float vAlongTube;

  // Smooth Gaussian-style packet
  float packet(float x, float center, float width) {
    float d = (x - center) / width;
    return exp(-d * d);
  }

  void main() {
    // Hard reveal cutoff so tendrils "shoot out" from the core
    if (vAlongTube > uReveal) discard;

    // Soft cross-section fall-off — tube edges feather to transparent
    float radial = abs(vUv.y - 0.5) * 2.0;
    float crossSection = pow(1.0 - smoothstep(0.0, 1.0, radial), 1.4);

    // Continuous color gradient along the tube
    vec3 base = mix(uColorCore, uColorShrine, vAlongTube);

    // Two slow comet heads moving from core → shrine, smooth gaussians
    float h1 = fract(uTime * 0.32);
    float h2 = fract(uTime * 0.32 + 0.5);
    float pulse = packet(vAlongTube, h1, 0.10) + packet(vAlongTube, h2, 0.10) * 0.6;

    // Stronger ambient brightness — tube reads as a confident energy line
    float ambient = 0.55 + 0.55 * (1.0 - abs(vAlongTube - 0.5) * 2.0);

    vec3 col = base * ambient + base * pulse * 3.2;
    float a = (ambient * 1.10 + pulse * 1.8) * crossSection * uIntensity;

    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;

// Build a curved tube from `from` (core) to `to` (shrine anchor).
// Slight midpoint offset so the tendril arcs gently, not a straight stick.
export function buildTendril(from, to, avatarColor) {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  // Lift the midpoint upward and inward — gives the curve drama
  const upBias = 0.45;
  const inBias = 0.18;
  mid.y += upBias;
  mid.x *= 1 - inBias;
  mid.z *= 1 - inBias;

  const curve = new THREE.CatmullRomCurve3([from.clone(), mid, to.clone()], false, 'catmullrom', 0.5);
  const tubeGeom = new THREE.TubeGeometry(curve, 80, 0.085, 8, false);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime:        { value: 0 },
      uIntensity:   { value: 0 },
      uReveal:      { value: 0 },
      uColorCore:   { value: new THREE.Color('#aaeeff') },
      uColorShrine: { value: avatarColor.clone() },
    },
    vertexShader:   VERT,
    fragmentShader: FRAG,
    transparent:    true,
    depthWrite:     false,
    blending:       THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(tubeGeom, material);
  return { mesh, material, curve };
}
