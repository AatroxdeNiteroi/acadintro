/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Narrative shrines (per-character composite 3D).

   Each shrine is a small tableau — base + central element +
   atmospheric details — that conveys the character's essence
   in 3D space. Not just an icon. A scene.

   Concepts:
   • aatrox  — "The Bound Prison":  vertical obsidian shard with
              orbiting jagged splinters, crimson interior light.
   • druid   — "The Wild Totem":   gnarled twisted trunk on a stone
              base, with floating leaf-petals.
   • kratos  — "The Forge of Rage": Spartan helm tilted on a stone
              altar, with chains hanging beneath.
   • gun     — "The Watcher":      monolithic obsidian pillar with
              a single carved eye watching from its face.
   • ichigo  — "The Cracked Mask": hollow mask suspended in front
              of a vertical crescent slash (Getsuga).
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { SVG_PATHS } from './iconPaths.js';

// ── Helpers ────────────────────────────────────────────────────────
function svgTo3D(pathStr, opts = {}) {
  const depth = opts.depth ?? 18;
  const bevel = opts.bevel ?? 2.5;
  const target = opts.targetSize ?? 1.4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
              `<path d="${pathStr}" fill="#fff"/></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = [];
  data.paths.forEach((p) => SVGLoader.createShapes(p).forEach((s) => shapes.push(s)));
  const geom = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel * 0.7,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 16,
  });
  geom.computeBoundingBox();
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  geom.boundingBox.getSize(size);
  geom.boundingBox.getCenter(center);
  geom.translate(-center.x, -center.y, -center.z);
  const longSide = Math.max(size.x, size.y);
  geom.scale(target / longSide, target / longSide, target / longSide);
  geom.scale(1, -1, 1);
  geom.computeVertexNormals();
  return geom;
}

// Common dark stone material for bases
function darkStone() {
  return new THREE.MeshStandardMaterial({
    color:     0x141820,
    roughness: 0.85,
    metalness: 0.18,
  });
}

// ── 1. AATROX — The Bound Prison ──────────────────────────────────
function buildAatrox(avatar) {
  const group = new THREE.Group();

  // Central obsidian shard — tetrahedron stretched on Y, sharp edges
  const shardGeom = new THREE.TetrahedronGeometry(0.85, 0);
  shardGeom.scale(0.7, 1.6, 0.7);
  shardGeom.translate(0, 0.3, 0);
  const shardMat = new THREE.MeshPhysicalMaterial({
    color:              0x12060a,
    metalness:          0.85,
    roughness:          0.22,
    clearcoat:          1.0,
    clearcoatRoughness: 0.10,
    emissive:           0xff2056,
    emissiveIntensity:  0.65,
    envMapIntensity:    1.5,
  });
  const shard = new THREE.Mesh(shardGeom, shardMat);
  shard.castShadow = true;
  group.add(shard);

  // Crimson core inside the shard — visible through transparency-ish via emissive
  const innerCore = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.18, 1),
    new THREE.MeshBasicMaterial({
      color: 0xff4470, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  innerCore.position.y = 0.3;
  group.add(innerCore);

  // 3 jagged orbiting splinters
  const splinters = [];
  for (let i = 0; i < 3; i++) {
    const sg = new THREE.TetrahedronGeometry(0.18, 0);
    sg.scale(0.5, 1.5, 0.5);
    const sp = new THREE.Mesh(sg, shardMat);
    sp.userData.angle = (i / 3) * Math.PI * 2;
    sp.userData.radius = 0.95 + i * 0.15;
    sp.userData.yOffset = -0.2 + i * 0.4;
    sp.castShadow = true;
    group.add(sp);
    splinters.push(sp);
  }

  // Stone base
  const baseGeom = new THREE.CylinderGeometry(0.7, 0.85, 0.18, 8);
  const base = new THREE.Mesh(baseGeom, darkStone());
  base.position.y = -0.95;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  return { group, mainMesh: shard, mainMaterial: shardMat, splinters, innerCore };
}

// ── 2. DRUID — The Wild Totem ─────────────────────────────────────
function buildDruid(avatar) {
  const group = new THREE.Group();

  // Twisted trunk via TubeGeometry along a curved spine
  const spinePoints = [
    new THREE.Vector3( 0.05, -0.95, 0),
    new THREE.Vector3(-0.10, -0.50, 0.08),
    new THREE.Vector3( 0.08, -0.05, -0.05),
    new THREE.Vector3(-0.05,  0.40, 0.10),
    new THREE.Vector3( 0.10,  0.85, -0.05),
    new THREE.Vector3( 0.00,  1.10, 0.00),
  ];
  const spine = new THREE.CatmullRomCurve3(spinePoints, false, 'catmullrom', 0.5);
  const trunkGeom = new THREE.TubeGeometry(spine, 48, 0.14, 12, false);
  // Taper the tube manually by scaling vertices
  {
    const pos = trunkGeom.attributes.position;
    const totalSegments = 48;
    for (let i = 0; i <= totalSegments; i++) {
      const t = i / totalSegments;
      const taper = 1 - t * 0.5;          // 1 at base → 0.5 at top
      // Tube vertices are stored in segments × radial groups
      for (let r = 0; r < 12; r++) {
        const idx = i * 12 + r;
        if (idx * 3 + 2 < pos.array.length) {
          // We need to scale around the spine, so use the spine point
          const sp = spine.getPoint(t);
          const x = pos.array[idx * 3 + 0] - sp.x;
          const y = pos.array[idx * 3 + 1] - sp.y;
          const z = pos.array[idx * 3 + 2] - sp.z;
          pos.array[idx * 3 + 0] = sp.x + x * taper;
          pos.array[idx * 3 + 1] = sp.y + y * taper;
          pos.array[idx * 3 + 2] = sp.z + z * taper;
        }
      }
    }
    pos.needsUpdate = true;
    trunkGeom.computeVertexNormals();
  }
  const trunkMat = new THREE.MeshPhysicalMaterial({
    color:              0x2a1a10,
    metalness:          0.05,
    roughness:          0.95,
    sheen:              1.0,
    sheenColor:         new THREE.Color(0x6cffa6),
    sheenRoughness:     0.65,
    emissive:           0x0e3a1c,
    emissiveIntensity:  0.30,
  });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.castShadow = true;
  group.add(trunk);

  // Crown of leaves — small icosahedron cluster
  const crownGeom = new THREE.IcosahedronGeometry(0.32, 1);
  const crownMat = new THREE.MeshPhysicalMaterial({
    color: 0x2e7a3c,
    metalness: 0.0,
    roughness: 0.55,
    emissive: 0x3ddc84,
    emissiveIntensity: 0.6,
    sheen: 1.0,
    sheenColor: new THREE.Color(0xa8ff8c),
    transparent: true,
    opacity: 0.92,
  });
  const crown = new THREE.Mesh(crownGeom, crownMat);
  crown.position.y = 1.15;
  crown.castShadow = true;
  group.add(crown);

  // 4 floating leaves orbiting the crown
  const leaves = [];
  for (let i = 0; i < 4; i++) {
    const lg = new THREE.PlaneGeometry(0.16, 0.10);
    const lm = new THREE.MeshBasicMaterial({
      color: 0x6cffa6, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const leaf = new THREE.Mesh(lg, lm);
    leaf.userData.angle = (i / 4) * Math.PI * 2;
    leaf.userData.radius = 0.5 + (i % 2) * 0.15;
    leaf.userData.yBase = 0.95 + Math.sin(i) * 0.15;
    group.add(leaf);
    leaves.push(leaf);
  }

  // Stone base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.7, 0.16, 12),
    darkStone(),
  );
  base.position.y = -1.0;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  return { group, mainMesh: crown, mainMaterial: crownMat, leaves };
}

// ── 3. KRATOS — The Forge of Rage ─────────────────────────────────
function buildKratos(avatar) {
  const group = new THREE.Group();

  // Spartan helmet — extruded SVG, tilted forward slightly
  const helmGeom = svgTo3D(SVG_PATHS.kratos, { depth: 14, bevel: 2.5, targetSize: 1.3 });
  const helmMat = new THREE.MeshPhysicalMaterial({
    color:              0x6b3818,
    metalness:          1.0,
    roughness:          0.28,
    clearcoat:          0.85,
    clearcoatRoughness: 0.14,
    emissive:           0xff7a14,
    emissiveIntensity:  0.30,
    envMapIntensity:    1.6,
  });
  const helm = new THREE.Mesh(helmGeom, helmMat);
  helm.position.y = 0.35;
  helm.rotation.x = -0.25;
  helm.castShadow = true;
  group.add(helm);

  // 3 chain links hanging down from the helm
  const links = [];
  for (let i = 0; i < 4; i++) {
    const lg = new THREE.TorusGeometry(0.08, 0.022, 6, 16);
    const lm = new THREE.MeshPhysicalMaterial({
      color: 0x3a2418, metalness: 1.0, roughness: 0.45,
      emissive: 0xff4400, emissiveIntensity: 0.18,
    });
    const link = new THREE.Mesh(lg, lm);
    link.position.set(0.3, -0.25 - i * 0.16, 0);
    link.rotation.x = (i % 2) * Math.PI / 2;
    link.castShadow = true;
    group.add(link);
    links.push(link);
  }

  // Stone altar
  const altar = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.22, 0.9),
    darkStone(),
  );
  altar.position.y = -0.95;
  altar.receiveShadow = true;
  altar.castShadow = true;
  group.add(altar);

  // Embers point cloud — tiny rising orange points
  const emberCount = 14;
  const emberPos = new Float32Array(emberCount * 3);
  const emberSeed = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3]     = (Math.random() - 0.5) * 0.7;
    emberPos[i * 3 + 1] = -0.5 + Math.random() * 0.5;
    emberPos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    emberSeed[i] = Math.random();
  }
  const emberGeom = new THREE.BufferGeometry();
  emberGeom.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  emberGeom.setAttribute('seed',     new THREE.BufferAttribute(emberSeed, 1));
  const emberMat = new THREE.PointsMaterial({
    color: 0xff8a22,
    size: 0.045,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const embers = new THREE.Points(emberGeom, emberMat);
  group.add(embers);

  return { group, mainMesh: helm, mainMaterial: helmMat, links, embers };
}

// ── 4. GUN PARK — The Watcher ─────────────────────────────────────
function buildGunPark(avatar) {
  const group = new THREE.Group();

  // Brutalist monolith — tall narrow obsidian pillar
  const pillarGeom = new THREE.BoxGeometry(0.95, 2.0, 0.45);
  const pillarMat = new THREE.MeshPhysicalMaterial({
    color:              0x16191e,
    metalness:          0.92,
    roughness:          0.42,
    clearcoat:          0.45,
    clearcoatRoughness: 0.30,
    envMapIntensity:    1.4,
  });
  const pillar = new THREE.Mesh(pillarGeom, pillarMat);
  pillar.position.y = 0;
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  group.add(pillar);

  // Carved eye on the front face — extruded SVG, smaller, pressed against pillar front
  const eyeGeom = svgTo3D(SVG_PATHS.gun, { depth: 8, bevel: 1.2, targetSize: 0.7 });
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color:              0x2a3340,
    metalness:          0.95,
    roughness:          0.30,
    emissive:           0x9ee8ff,
    emissiveIntensity:  0.18,
    envMapIntensity:    1.6,
  });
  const eye = new THREE.Mesh(eyeGeom, eyeMat);
  eye.position.set(0, 0.15, 0.23);
  group.add(eye);

  // White pupil — single emissive point inside the eye motif
  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  pupil.position.set(0, 0.10, 0.29);
  group.add(pupil);

  // Stone base — slightly wider than the pillar
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.18, 0.7),
    darkStone(),
  );
  base.position.y = -1.05;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  return { group, mainMesh: pillar, mainMaterial: pillarMat, eye, pupil };
}

// ── 5. ICHIGO — The Cracked Mask ──────────────────────────────────
function buildIchigo(avatar) {
  const group = new THREE.Group();

  // Vertical crescent slash behind the mask — references Getsuga Tenshou
  const slashGeom = svgTo3D(SVG_PATHS.ichigo, { depth: 6, bevel: 1.0, targetSize: 1.85 });
  const slashMat = new THREE.MeshPhysicalMaterial({
    color:              0x40000c,
    metalness:          0.0,
    roughness:          0.30,
    emissive:           0xff2a66,
    emissiveIntensity:  0.95,
    transparent:        true,
    opacity:            0.85,
  });
  const slash = new THREE.Mesh(slashGeom, slashMat);
  slash.position.set(0, 0.30, -0.3);
  slash.rotation.z = Math.PI / 2;
  group.add(slash);

  // Hollow mask — extruded skull, in front of the slash
  // Reuse the skull-mask from the previous icon set — but we don't have it.
  // Build a simple oval mask shape from Three.js primitives.
  const maskGroup = new THREE.Group();
  const skullGeom = new THREE.SphereGeometry(0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.8);
  const maskMat = new THREE.MeshPhysicalMaterial({
    color:              0xfff0f5,
    metalness:          0.0,
    roughness:          0.18,
    transmission:       0.30,
    thickness:          0.4,
    ior:                1.45,
    clearcoat:          0.7,
    clearcoatRoughness: 0.10,
    emissive:           0xff4d8a,
    emissiveIntensity:  0.30,
    envMapIntensity:    1.3,
    side:               THREE.DoubleSide,
  });
  const skull = new THREE.Mesh(skullGeom, maskMat);
  skull.scale.set(1, 1.15, 0.55);
  skull.castShadow = true;
  maskGroup.add(skull);

  // Eye sockets — two black slits
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.05, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    eye.position.set(side * 0.13, 0.05, 0.34);
    eye.rotation.z = side * 0.1;
    maskGroup.add(eye);
    // Tiny crimson pupil
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2a66 }),
    );
    pupil.position.set(side * 0.13, 0.05, 0.36);
    maskGroup.add(pupil);
  }

  // Two horns sweeping back from the top
  for (const side of [-1, 1]) {
    const hornGeom = new THREE.ConeGeometry(0.04, 0.32, 8);
    const horn = new THREE.Mesh(hornGeom, maskMat);
    horn.position.set(side * 0.18, 0.34, 0.08);
    horn.rotation.z = side * -0.4;
    horn.rotation.x = -0.3;
    horn.castShadow = true;
    maskGroup.add(horn);
  }

  // Jagged teeth — small zigzag
  for (let i = -3; i <= 3; i++) {
    const tooth = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, 0.08, 4),
      new THREE.MeshBasicMaterial({ color: 0xfff0f5 }),
    );
    tooth.position.set(i * 0.04, -0.30, 0.30);
    tooth.rotation.x = Math.PI;
    if (i % 2) tooth.position.y -= 0.02;
    maskGroup.add(tooth);
  }

  maskGroup.position.set(0, 0.20, 0.05);
  group.add(maskGroup);

  // Stone base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.7, 0.16, 12),
    darkStone(),
  );
  base.position.y = -1.0;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  return { group, mainMesh: skull, mainMaterial: maskMat, slash, slashMaterial: slashMat };
}

// ── Public ─────────────────────────────────────────────────────────
const BUILDERS = {
  aatrox: buildAatrox,
  druid:  buildDruid,
  kratos: buildKratos,
  gun:    buildGunPark,
  ichigo: buildIchigo,
};

export function buildShrine(avatarKey, avatar) {
  const builder = BUILDERS[avatarKey];
  if (!builder) throw new Error(`No shrine builder for ${avatarKey}`);
  return builder(avatar);
}

// Per-frame update for atmospheric details (orbiting splinters, leaves, embers)
export function updateShrine(shrine, t, hover) {
  if (!shrine) return;

  // Aatrox splinters orbit
  if (shrine.splinters) {
    shrine.splinters.forEach((sp) => {
      const a = sp.userData.angle + t * 0.6;
      sp.position.x = Math.cos(a) * sp.userData.radius;
      sp.position.z = Math.sin(a) * sp.userData.radius;
      sp.position.y = sp.userData.yOffset + Math.sin(t * 1.2 + a) * 0.08;
      sp.rotation.x += 0.012;
      sp.rotation.y += 0.008;
    });
    if (shrine.innerCore) {
      shrine.innerCore.scale.setScalar(0.85 + Math.sin(t * 2.4) * 0.18 + hover * 0.4);
    }
  }

  // Druid leaves drift
  if (shrine.leaves) {
    shrine.leaves.forEach((leaf, i) => {
      const a = leaf.userData.angle + t * 0.35;
      leaf.position.x = Math.cos(a) * leaf.userData.radius;
      leaf.position.z = Math.sin(a) * leaf.userData.radius;
      leaf.position.y = leaf.userData.yBase + Math.sin(t * 0.8 + i) * 0.10;
      leaf.rotation.y = a;
      leaf.rotation.x = Math.sin(t * 0.6 + i) * 0.4;
    });
  }

  // Kratos embers rise
  if (shrine.embers) {
    const pos = shrine.embers.geometry.attributes.position;
    const seeds = shrine.embers.geometry.attributes.seed;
    for (let i = 0; i < seeds.count; i++) {
      pos.array[i * 3 + 1] += 0.012 * (0.5 + seeds.array[i]);
      if (pos.array[i * 3 + 1] > 0.6) {
        pos.array[i * 3 + 1] = -0.55;
        pos.array[i * 3]     = (Math.random() - 0.5) * 0.7;
        pos.array[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      }
    }
    pos.needsUpdate = true;
  }

  // Ichigo slash pulse
  if (shrine.slashMaterial) {
    shrine.slashMaterial.emissiveIntensity = 0.7 + Math.sin(t * 1.6) * 0.35 + hover * 0.6;
  }
}
