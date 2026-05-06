/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Custom post-processing shaders.

   • GodRaysShader — radial blur from a screen-space light position.
     Samples the input texture along rays from the user-set light
     position outward, accumulating bright pixels with falloff.
     Produces volumetric "shafts of light" emanating from the heart.

   • VignetteShader — animated edge darkening that breathes with
     the heart. Adds focus and finish.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';

export const GodRaysShader = {
  uniforms: {
    tDiffuse:   { value: null },
    uLightPos:  { value: new THREE.Vector2(0.5, 0.5) },
    uIntensity: { value: 0.85 },
    uDecay:     { value: 0.945 },
    uDensity:   { value: 1.05 },
    uExposure:  { value: 0.22 },
    uThreshold: { value: 0.42 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2  uLightPos;
    uniform float uIntensity;
    uniform float uDecay;
    uniform float uDensity;
    uniform float uExposure;
    uniform float uThreshold;
    varying vec2 vUv;

    const int SAMPLES = 56;

    void main() {
      vec3 base = texture2D(tDiffuse, vUv).rgb;

      vec2 delta = (vUv - uLightPos) * (1.0 / float(SAMPLES) * uDensity);
      vec2 coord = vUv;
      vec3 acc = vec3(0.0);
      float illum = 1.0;

      for (int i = 0; i < SAMPLES; i++) {
        coord -= delta;
        vec3 s = texture2D(tDiffuse, coord).rgb;
        // Threshold — only suprathreshold (= bright) pixels emit rays
        float bright = max(s.r, max(s.g, s.b));
        s *= max(0.0, bright - uThreshold);
        s *= illum * uIntensity;
        acc += s;
        illum *= uDecay;
      }

      gl_FragColor = vec4(base + acc * uExposure, 1.0);
    }
  `,
};

export const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uOffset:  { value: 0.85 },     // size of the clear center
    uDarkness:{ value: 1.25 },     // edge darkness
    uTime:    { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uOffset;
    uniform float uDarkness;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * 2.0;
      float dist = dot(uv, uv);
      // Heart-breath pulse on the vignette
      float pulse = 1.0 + sin(uTime * 0.6) * 0.05;
      float v = 1.0 - dist * uDarkness * pulse;
      v = smoothstep(0.0, uOffset, v);
      gl_FragColor = vec4(base.rgb * v, base.a);
    }
  `,
};
