/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Async GLB loader.

   Loads every glb the intro depends on in parallel and reports
   progress so the boot curtain can show a loading state.

   Usage:
     const models = await loadAllModels(onProgress);
     // models.aatrox, models.druid, models.kratos, models.ichigo,
     // models.knot, models.connection
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MANIFEST = [
  { key: 'aatrox',     url: '/models/aatrox.glb' },
  { key: 'druid',      url: '/models/druid.glb' },
  { key: 'kratos',     url: '/models/kratos.glb' },
  { key: 'ichigo',     url: '/models/ichigo.glb' },
  { key: 'guts',       url: '/models/guts.glb' },
  { key: 'knot',       url: '/models/quantum_knot.glb' },
  { key: 'skybox',     url: '/models/skybox.glb' },
];

function loadOne(loader, url, onProgress) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      (xhr) => onProgress?.(url, xhr.loaded, xhr.total || 0),
      (err) => reject(err),
    );
  });
}

export async function loadAllModels(onProgress) {
  const loader = new GLTFLoader();
  const totals = {};
  const loaded = {};

  // Aggregate progress reporter — sums bytes across all files
  function report(url, bytes, total) {
    totals[url] = total;
    loaded[url] = bytes;
    let totalAll = 0, loadedAll = 0;
    for (const k of Object.keys(totals)) {
      totalAll += totals[k];
      loadedAll += loaded[k];
    }
    if (onProgress) onProgress({ url, bytes, total, totalAll, loadedAll });
  }

  const results = await Promise.all(
    MANIFEST.map(({ key, url }) =>
      loadOne(loader, url, report).then((gltf) => [key, gltf]),
    ),
  );
  const map = Object.fromEntries(results);
  return map;
}

// Inspect a loaded GLTF — logs the mesh hierarchy so we can target by name
export function describeModel(gltf, label = 'model') {
  const lines = [];
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      lines.push(`  mesh: "${o.name}" verts=${o.geometry.attributes.position.count}`);
    } else if (o.isGroup || o.isObject3D) {
      if (o.name) lines.push(`  group: "${o.name}"`);
    }
  });
  console.log(`[gltf:${label}]\n` + lines.join('\n'));
}

// Helper: extract the primary mesh from a GLTF and prepare it.
// Options:
//   targetSize: longest-axis size in world units (default 1.7)
//   rotation:   { x, y, z } applied to the root group
//   filter:     (mesh) => boolean — keep only meshes that pass
//   keepName:   case-insensitive substring; only meshes whose name contains
//               this are kept (everything else is removed from the scene)
// Returns { root, mainMesh, materials }
export function prepareModel(gltf, opts = {}) {
  const targetSize = opts.targetSize ?? 1.7;
  const root = gltf.scene.clone(true);

  if (opts.rotation) {
    root.rotation.set(opts.rotation.x || 0, opts.rotation.y || 0, opts.rotation.z || 0);
  }

  // Optional name-based filtering — strip out unwanted parts before centering
  if (opts.keepName) {
    const want = opts.keepName.toLowerCase();
    const removeList = [];
    root.traverse((o) => {
      if (o.isMesh && !o.name.toLowerCase().includes(want)) removeList.push(o);
    });
    removeList.forEach((m) => m.parent && m.parent.remove(m));
  }
  if (opts.filter) {
    const removeList = [];
    root.traverse((o) => {
      if (o.isMesh && !opts.filter(o)) removeList.push(o);
    });
    removeList.forEach((m) => m.parent && m.parent.remove(m));
  }

  // If no meshes survived filtering, log and bail — caller should fall back
  let surviving = 0;
  root.traverse((o) => { if (o.isMesh) surviving++; });
  if (surviving === 0) return { root: null, mainMesh: null, materials: [] };

  const bbox = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  const longSide = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / longSide;

  const wrapper = new THREE.Group();
  if (opts.bottomAlign) {
    // Center X/Z but anchor Y so the model's BOTTOM sits at local y=0.
    // This eliminates overlap when several models with different extents
    // orbit in a carousel — they all share the ground plane.
    root.position.set(-center.x, -bbox.min.y, -center.z);
  } else {
    root.position.sub(center);
  }
  root.scale.setScalar(scale);
  wrapper.add(root);

  let mainMesh = null;
  const materials = [];
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = false;
      if (!mainMesh) mainMesh = obj;
      if (obj.material) materials.push(obj.material);
    }
  });

  return { root: wrapper, mainMesh, materials };
}
