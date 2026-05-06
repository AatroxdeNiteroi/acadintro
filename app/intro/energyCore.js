/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Energy Heart core.

   Replaces the static dodecahedron+rings with a procedural orb
   that LOOKS LIKE an energy source: domain-warped 3D noise on
   a sphere, fresnel rim, pulsing emissive, color gradient.
   The visual anchor of every "energy flow" in the chamber.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;       // 0..1 — opens/closes the orb
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vNoise;

  // Cheap 3D pseudo-noise — multi-octave with domain warping
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n =
      mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    return n;
  }
  float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int k = 0; k < 4; k++) {
      s += a * noise3(p);
      p *= 2.05;
      a *= 0.5;
    }
    return s;
  }

  void main() {
    vec3 p = position;
    // Domain-warp: feed noise back into itself for organic flow
    vec3 q = vec3(
      fbm(p * 1.4 + vec3(0.0, uTime * 0.18, 0.0)),
      fbm(p * 1.4 + vec3(5.2, uTime * 0.15, 1.3)),
      fbm(p * 1.4 + vec3(2.7, uTime * 0.20, 4.4))
    );
    float n = fbm(p * 1.8 + q * 1.6 + uTime * 0.10);
    vNoise = n;
    // Displace surface along normal with the noise
    vec3 displaced = p + normal * (n - 0.5) * 0.32 * uIntensity;

    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = wp.xyz;
    vLocalPos = displaced;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3  uColorInner;
  uniform vec3  uColorOuter;
  uniform vec3  uColorAccent;
  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying vec3  vLocalPos;
  varying float vNoise;

  void main() {
    vec3 view = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - clamp(dot(view, vNormal), 0.0, 1.0), 2.0);

    // Energy gradient — inner hot, outer cool
    float r = length(vLocalPos);
    float gradT = smoothstep(0.55, 1.05, r);
    vec3 col = mix(uColorInner, uColorOuter, gradT);

    // Accent pulses driven by the noise field
    float pulse = sin(uTime * 0.9 + vNoise * 12.0) * 0.5 + 0.5;
    col = mix(col, uColorAccent, fres * 0.55 + pulse * 0.10);

    // Brighten where the surface bulges outward (high noise) — feels alive
    col += uColorAccent * pow(vNoise, 4.0) * 1.2;

    // Edge glow scaled by intensity
    col *= 0.6 + 1.4 * fres;
    col *= 0.4 + 0.8 * uIntensity;

    // Alpha is fresnel-driven — surface stays luminous on the rim and
    // becomes near-transparent toward the center, revealing the knot inside.
    float a = clamp(pow(fres, 1.4) * 0.95 + 0.05, 0.0, 1.0) * uIntensity;
    gl_FragColor = vec4(col, a);
  }
`;

export function buildEnergyHeart(opts = {}) {
  const radius = opts.radius ?? 0.95;
  // High-detail icosahedron — many vertices for smooth domain-warp displacement
  const geom = new THREE.IcosahedronGeometry(radius, 64);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime:        { value: 0 },
      uIntensity:   { value: 0 },
      uColorInner:  { value: new THREE.Color('#ffffff') },
      uColorOuter:  { value: new THREE.Color('#00d4ff') },
      uColorAccent: { value: new THREE.Color('#ff2eaa') },
    },
    vertexShader:   VERT,
    fragmentShader: FRAG,
    transparent:    true,
    depthWrite:     false,
    side:           THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geom, material);

  // Inner emissive light at center — IBL accent + bloom feeder
  const innerLight = new THREE.PointLight(0xfff0ff, 1.4, 8, 1.2);
  mesh.add(innerLight);

  return { mesh, material, innerLight };
}
