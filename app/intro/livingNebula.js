/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Living nebula background.

   A procedural inner-skybox layer rendered with a custom shader
   that paints multi-octave domain-warped noise drifting in time.
   Color slowly cycles between violet, cyan, and dim crimson.
   Sits BEHIND the static skybox dome, gives the chamber a sense
   of cosmic energy that's actively alive (not a still backdrop).
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  void main() {
    vLocalPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  // Hash + value noise for organic drift
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
          mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
          mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int k = 0; k < 5; k++) {
      s += a * noise3(p);
      p *= 2.07;
      a *= 0.5;
    }
    return s;
  }

  void main() {
    // Direction-based sampling — feels like clouds at infinity
    vec3 dir = normalize(vLocalPos);

    // Domain warp: feed noise back into itself for swirling currents
    vec3 warp1 = vec3(
      fbm(dir * 1.6 + vec3(0.0, uTime * 0.020, 0.0)),
      fbm(dir * 1.6 + vec3(5.2, uTime * 0.015, 1.3)),
      fbm(dir * 1.6 + vec3(2.7, uTime * 0.022, 4.4))
    );
    float n = fbm(dir * 2.4 + warp1 * 1.8 + vec3(0.0, uTime * 0.012, 0.0));

    // Map noise to a color triad — slow temporal mix between A/B/C
    float t1 = sin(uTime * 0.06) * 0.5 + 0.5;
    float t2 = sin(uTime * 0.04 + 1.7) * 0.5 + 0.5;
    vec3 baseA = mix(uColorA, uColorB, t1);
    vec3 baseB = mix(uColorB, uColorC, t2);
    vec3 col = mix(baseA, baseB, smoothstep(0.35, 0.85, n));

    // Add brighter "energy currents" where noise is high
    float currents = pow(smoothstep(0.55, 0.9, n), 2.0);
    col += currents * uColorB * 0.7;

    // Subtle pulsing hot spots
    float hot = pow(smoothstep(0.78, 0.95, n + 0.05 * sin(uTime * 0.5)), 4.0);
    col += hot * uColorC * 1.6;

    // Fade out at the bottom of the dome (chamber floor is below)
    float yMask = smoothstep(-0.6, 0.05, dir.y);

    col *= uIntensity * yMask;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function buildLivingNebula(opts = {}) {
  const radius = opts.radius ?? 45;
  const geom = new THREE.SphereGeometry(radius, 64, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0 },
      uIntensity: { value: 1.0 },
      uColorA:    { value: new THREE.Color(0x0a0420) },   // deep violet
      uColorB:    { value: new THREE.Color(0x14243a) },   // cool steel-cyan
      uColorC:    { value: new THREE.Color(0x441a3a) },   // dim plum-crimson
    },
    vertexShader:   VERT,
    fragmentShader: FRAG,
    side:           THREE.BackSide,    // we're inside the sphere
    depthWrite:     false,
    fog:            false,
    toneMapped:     false,
  });
  const mesh = new THREE.Mesh(geom, material);
  mesh.renderOrder = -2;             // behind the static skybox dome
  mesh.frustumCulled = false;
  return { mesh, material };
}
