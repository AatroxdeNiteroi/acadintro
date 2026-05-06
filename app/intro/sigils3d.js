/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — 3D character sigils via SVG extrusion + PBR.

   Takes the existing game-icons.net path strings and turns each
   into a real volumetric mesh with bevel + per-character physical
   material. Replaces the old canvas-billboard planes.

   Each character has a "recipe" describing how its essence reads
   in PBR space:
     • aatrox  — black obsidian + crimson emissive edges + clearcoat
     • druid   — matte mossy stone + green sheen
     • kratos  — polished bronze + warm emissive + clearcoat
     • gun     — brushed steel (anisotropic) + subtle cyan emissive
     • ichigo  — translucent porcelain + pink emissive transmission
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// Reuse SVG path strings from icons.js (single source of truth).
import { SVG_PATHS } from './iconPaths.js';

// ── PBR recipes per character ──────────────────────────────────────
// Each function returns a fresh THREE.MeshPhysicalMaterial.
const RECIPES = {
  aatrox: () => new THREE.MeshPhysicalMaterial({
    color:              0x1a0408,
    metalness:          0.85,
    roughness:          0.32,
    clearcoat:          1.0,
    clearcoatRoughness: 0.18,
    emissive:           0xff2056,
    emissiveIntensity:  0.55,
    envMapIntensity:    1.4,
  }),
  druid: () => new THREE.MeshPhysicalMaterial({
    color:              0x1a3a25,
    metalness:          0.0,
    roughness:          0.85,
    sheen:              1.0,
    sheenColor:         new THREE.Color(0x6cffa6),
    sheenRoughness:     0.5,
    emissive:           0x1a5532,
    emissiveIntensity:  0.25,
    envMapIntensity:    0.8,
  }),
  kratos: () => new THREE.MeshPhysicalMaterial({
    color:              0x6b3818,
    metalness:          1.0,
    roughness:          0.30,
    clearcoat:          0.85,
    clearcoatRoughness: 0.14,
    emissive:           0xff7a14,
    emissiveIntensity:  0.30,
    envMapIntensity:    1.6,
  }),
  gun: () => new THREE.MeshPhysicalMaterial({
    color:              0x4a5560,
    metalness:          0.95,
    roughness:          0.35,
    anisotropy:         0.85,
    anisotropyRotation: Math.PI / 2,
    clearcoat:          0.4,
    clearcoatRoughness: 0.30,
    emissive:           0x4d8aa0,
    emissiveIntensity:  0.18,
    envMapIntensity:    1.5,
  }),
  ichigo: () => new THREE.MeshPhysicalMaterial({
    color:              0xffe6f0,
    metalness:          0.0,
    roughness:          0.18,
    transmission:       0.45,
    thickness:          0.7,
    ior:                1.45,
    clearcoat:          0.7,
    clearcoatRoughness: 0.10,
    emissive:           0xff4d8a,
    emissiveIntensity:  0.40,
    envMapIntensity:    1.3,
  }),
};

// ── SVG path → 3D ExtrudeGeometry ──────────────────────────────────
// game-icons.net SVGs use a 512×512 viewBox. We parse via SVGLoader,
// extrude with bevel, center, scale to ~1.8 unit width, and flip Y
// (SVG Y axis is inverted relative to Three.js).
function pathStringTo3D(pathStr, opts = {}) {
  const depth = opts.depth ?? 28;
  const bevelSize = opts.bevelSize ?? 4;
  const targetSize = opts.targetSize ?? 1.85;

  // Wrap the path in a minimal SVG document for the loader
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
              `<path d="${pathStr}" fill="#fff"/></svg>`;

  const loader = new SVGLoader();
  const data = loader.parse(svg);
  if (!data.paths.length) throw new Error('SVGLoader: no paths parsed');

  const shapes = [];
  data.paths.forEach((p) => {
    SVGLoader.createShapes(p).forEach((s) => shapes.push(s));
  });
  if (!shapes.length) throw new Error('SVGLoader: no shapes generated');

  const extrudeSettings = {
    depth,
    bevelEnabled:   true,
    bevelThickness: bevelSize * 0.7,
    bevelSize:      bevelSize,
    bevelSegments:  4,
    curveSegments:  16,
  };
  const geom = new THREE.ExtrudeGeometry(shapes, extrudeSettings);

  // Center to origin
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const center = new THREE.Vector3();
  bb.getCenter(center);
  geom.translate(-center.x, -center.y, -center.z);

  // Scale uniformly so the larger XY dimension matches targetSize
  const longSide = Math.max(size.x, size.y);
  const scale = targetSize / longSide;
  geom.scale(scale, scale, scale);

  // Flip Y so the icon reads upright (SVG +Y is downward)
  geom.scale(1, -1, 1);

  // Recompute normals for proper PBR shading
  geom.computeVertexNormals();
  return geom;
}

// ── Public: build a sigil mesh given an avatar key ─────────────────
// Returns { mesh, material }. Mesh is a single THREE.Mesh with the
// extruded geometry and the character's PBR material.
export function buildSigil3D(avatarNs, opts) {
  const path = SVG_PATHS[avatarNs];
  if (!path) throw new Error(`No SVG path for ${avatarNs}`);
  const recipe = RECIPES[avatarNs];
  if (!recipe) throw new Error(`No PBR recipe for ${avatarNs}`);

  const geom = pathStringTo3D(path, opts);
  const material = recipe();
  const mesh = new THREE.Mesh(geom, material);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  return { mesh, material, geometry: geom };
}
