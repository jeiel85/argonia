import * as THREE from 'three';
import { assetLoader, MODEL_SPECS } from './assetLoader.js';

// Preload Blender 5.2 GLB models automatically in browser environment
if (typeof window !== 'undefined') {
  assetLoader.preloadAll();
}

// SHARED GEOMETRY & MATERIAL CACHE
// ============================================================================
const GEO_CACHE = new Map();
const MAT_CACHE = new Map();

function getGeo(key, factory) {
  if (!GEO_CACHE.has(key)) {
    GEO_CACHE.set(key, factory());
  }
  return GEO_CACHE.get(key);
}

function getStdMat(color, roughness = 0.48, metalness = 0.18, emissive = 0x000000, emissiveIntensity = 0, flatShading = false, opacity = 1.0) {
  const key = `${color}_${roughness}_${metalness}_${emissive}_${emissiveIntensity}_${flatShading}_${opacity}`;
  if (!MAT_CACHE.has(key)) {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness,
      emissive: new THREE.Color(emissive),
      emissiveIntensity,
      flatShading,
      transparent: opacity < 1.0,
      opacity,
    });
    MAT_CACHE.set(key, mat);
  }
  return MAT_CACHE.get(key);
}

function getBasicRingMat(color, opacity = 0.75) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function enableShadows(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function makeMesh(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, cast = true, receive = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/**
 * Generates a crease-free, smoothly filleted Rounded Box Geometry with analytic vertex normals.
 */
function createRoundedBoxGeometry(width = 1, height = 1, depth = 1, radius = 0.16, smoothness = 5) {
  const segs = smoothness * 2;
  const geo = new THREE.BoxGeometry(width, height, depth, segs, segs, segs);
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;

  const hx = Math.max(0.01, width * 0.5 - radius);
  const hy = Math.max(0.01, height * 0.5 - radius);
  const hz = Math.max(0.01, depth * 0.5 - radius);
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    c.set(
      Math.max(-hx, Math.min(hx, v.x)),
      Math.max(-hy, Math.min(hy, v.y)),
      Math.max(-hz, Math.min(hz, v.z))
    );
    n.subVectors(v, c);
    if (n.lengthSq() > 1e-6) {
      n.normalize();
    } else {
      n.fromBufferAttribute(norm, i).normalize();
    }
    pos.setXYZ(i, c.x + n.x * radius, c.y + n.y * radius, c.z + n.z * radius);
    norm.setXYZ(i, n.x, n.y, n.z);
  }
  pos.needsUpdate = true;
  norm.needsUpdate = true;
  return geo;
}

/**
 * Generates a smooth, organically sculpted pebble/boulder geometry with soft shared vertex normals.
 */
function createSmoothBoulderGeometry(radius = 1) {
  const geo = new THREE.SphereGeometry(radius, 32, 24);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const wave =
      1.0 +
      0.07 * Math.sin(v.x * 2.6 + v.y * 1.9) +
      0.05 * Math.cos(v.z * 2.9 - v.x * 1.7);
    v.multiplyScalar(wave);
    // Slightly flatten bottom for natural resting look
    if (v.y < 0) v.y *= 0.84;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Smooth, high-segment reusable primitive geometries
const COMMON_GEOS = {
  box: () => getGeo('smooth_rbox_1', () => createRoundedBoxGeometry(1, 1, 1, 0.16, 5)),
  cyl8: () => getGeo('smooth_cyl_32', () => new THREE.CylinderGeometry(1, 1, 1, 32)),
  cyl6: () => getGeo('smooth_cyl_24', () => new THREE.CylinderGeometry(1, 1, 1, 24)),
  cone6: () => getGeo('smooth_cone_32', () => new THREE.ConeGeometry(1, 1, 32)),
  cone4: () => getGeo('smooth_cone_20', () => new THREE.ConeGeometry(1, 1, 20)),
  octa: () => getGeo('smooth_gem', () => new THREE.SphereGeometry(1, 16, 12)),
  dodeca: () => getGeo('smooth_boulder', () => createSmoothBoulderGeometry(1)),
  icosa: () => getGeo('smooth_icosa', () => new THREE.SphereGeometry(1, 24, 18)),
  sphereLow: () => getGeo('smooth_sphere_32', () => new THREE.SphereGeometry(1, 32, 24)),
  torusLow: () => getGeo('smooth_torus_48', () => new THREE.TorusGeometry(1, 0.12, 20, 48)),
  ringFlat: () => getGeo('smooth_ring_56', () => new THREE.RingGeometry(0.76, 1.0, 56)),
  discFlat: () => getGeo('smooth_disc_48', () => new THREE.CircleGeometry(1, 48)),
};

// ============================================================================
// 1. HERO MESHES & ANIMATION
// ============================================================================

/**
 * Builds one of the 4 Sovereign Champions with distinct mounts, silhouettes,
 * weapons, capes/rings, and selection aura ring.
 * @param {Object|string} heroDef
 * @returns {THREE.Group}
 */
export function createHeroMesh(heroDef) {
  const heroId = typeof heroDef === 'string' ? heroDef : (heroDef?.id || 'arthuria');
  const group = new THREE.Group();
  group.name = `Hero_${heroId}`;

  const bodyGroup = new THREE.Group();
  const weaponGroup = new THREE.Group();
  const rotators = [];

  // Selection / Aura Ring on ground
  const auraColorMap = {
    arthuria: 0xfbbf24,
    kaelen: 0x38bdf8,
    sylvanis: 0x34d399,
    vespera: 0xc084fc,
  };
  const auraColor = heroDef?.accentColor || auraColorMap[heroId] || 0xfbbf24;

  const auraRing = new THREE.Mesh(
    COMMON_GEOS.ringFlat(),
    getBasicRingMat(auraColor, 0.65)
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.08;
  auraRing.scale.setScalar(1.35);
  group.add(auraRing);

  // Subtle inner glow disc
  const innerDisc = new THREE.Mesh(
    COMMON_GEOS.discFlat(),
    getBasicRingMat(auraColor, 0.16)
  );
  innerDisc.rotation.x = -Math.PI / 2;
  innerDisc.position.y = 0.06;
  innerDisc.scale.setScalar(1.1);
  group.add(innerDisc);

  const modelKey = `hero_${heroId}`;
  const blenderInst = assetLoader.instantiate(modelKey);
  if (blenderInst) {
    bodyGroup.add(blenderInst.wrapper);
    group.add(bodyGroup);
    group.userData = {
      heroId,
      bodyGroup,
      weaponGroup,
      auraRing,
      innerDisc,
      rotators,
      baseY: 0,
      isBlenderModel: true,
    };
    return group;
  }

  if (heroId === 'arthuria') {
    // ------------------------------------------------------------------------
    // KING ARTHURIA — Armored Barded Warhorse + Solar Greatsword + Royal Cape
    // ------------------------------------------------------------------------
    const horseMat = getStdMat(0xf8fafc, 0.55, 0.1);
    const bardingMat = getStdMat(0xd97706, 0.35, 0.75, 0x78350f, 0.15);
    const steelMat = getStdMat(0xe2e8f0, 0.25, 0.85);
    const capeMat = getStdMat(0xdc2626, 0.6, 0.1, 0x7f1d1d, 0.15);
    const solarMat = getStdMat(0xfef08a, 0.2, 0.5, 0xf59e0b, 0.9);

    // Horse torso & barding
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), horseMat, 0, 0.72, 0, 0, 0, 0, 0.72, 0.62, 1.45));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), bardingMat, 0, 0.78, 0.04, 0, 0, 0, 0.78, 0.42, 1.52));
    // Horse legs (4)
    const legOffsets = [[-0.25, 0.48], [0.25, 0.48], [-0.25, -0.48], [0.25, -0.48]];
    legOffsets.forEach(([lx, lz]) => {
      bodyGroup.add(makeMesh(COMMON_GEOS.box(), horseMat, lx, 0.28, lz, 0, 0, 0, 0.18, 0.56, 0.18));
      bodyGroup.add(makeMesh(COMMON_GEOS.box(), bardingMat, lx, 0.08, lz, 0, 0, 0, 0.2, 0.15, 0.22));
    });
    // Horse neck & head
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), horseMat, 0, 1.15, 0.62, 0.42, 0, 0, 0.36, 0.65, 0.42));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), horseMat, 0, 1.4, 0.88, 0.2, 0, 0, 0.32, 0.32, 0.52));
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), bardingMat, 0, 1.58, 0.98, 0.5, 0, 0, 0.18, 0.38, 0.18));
    // Tail
    bodyGroup.add(makeMesh(COMMON_GEOS.cone6(), horseMat, 0, 0.65, -0.88, -0.5, 0, 0, 0.2, 0.65, 0.2));

    // Rider Torso & Pauldrons
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), steelMat, 0, 1.38, -0.05, 0, 0, 0, 0.58, 0.68, 0.44));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), bardingMat, -0.38, 1.55, -0.05, 0, 0, 0.2, 0.28, 0.28, 0.38));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), bardingMat, 0.38, 1.55, -0.05, 0, 0, -0.2, 0.28, 0.28, 0.38));
    // Helmet & Golden Crown
    bodyGroup.add(makeMesh(COMMON_GEOS.sphereLow(), steelMat, 0, 1.88, -0.05, 0, 0, 0, 0.26, 0.28, 0.26));
    bodyGroup.add(makeMesh(COMMON_GEOS.cyl6(), solarMat, 0, 2.08, -0.05, 0, 0, 0, 0.22, 0.16, 0.22));
    // Flowing Crimson Cape
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), capeMat, 0, 1.25, -0.45, 0.38, 0, 0, 0.64, 0.95, 0.1));
    // Lion Shield on left
    bodyGroup.add(makeMesh(COMMON_GEOS.cyl6(), bardingMat, -0.48, 1.32, 0.1, 0, 0, Math.PI / 2, 0.38, 0.1, 0.46));

    // Weapon: Excalibur Solar Greatsword on right
    weaponGroup.position.set(0.45, 1.4, 0.15);
    weaponGroup.add(makeMesh(COMMON_GEOS.box(), bardingMat, 0, 0, 0, 0, 0, 0, 0.42, 0.1, 0.12)); // Crossguard
    weaponGroup.add(makeMesh(COMMON_GEOS.box(), solarMat, 0, 0.72, 0.1, 0.2, 0, 0, 0.14, 1.35, 0.06)); // Glowing Blade
    weaponGroup.add(makeMesh(COMMON_GEOS.octa(), solarMat, 0, -0.18, 0, 0, 0, 0, 0.1, 0.1, 0.1)); // Pommel
    bodyGroup.add(weaponGroup);

  } else if (heroId === 'kaelen') {
    // ------------------------------------------------------------------------
    // ARCH-ARTIFICER KAELEN — Arcane Hover-Construct + Railstaff + Gyro Rings
    // ------------------------------------------------------------------------
    const robeMat = getStdMat(0x1e3a8a, 0.55, 0.25);
    const bronzeMat = getStdMat(0xb45309, 0.35, 0.75);
    const argonMat = getStdMat(0x38bdf8, 0.15, 0.3, 0x0284c7, 1.15);
    const darkMetal = getStdMat(0x334155, 0.4, 0.7);

    // Floating Clockwork Platform
    const baseDisc = makeMesh(COMMON_GEOS.cyl8(), bronzeMat, 0, 0.42, 0, 0, 0, 0, 0.78, 0.18, 0.78);
    bodyGroup.add(baseDisc);
    const coreCrystal = makeMesh(COMMON_GEOS.octa(), argonMat, 0, 0.24, 0, 0, 0, 0, 0.32, 0.38, 0.32);
    bodyGroup.add(coreCrystal);

    // Orbiting Gyro Ring
    const gyroRing = makeMesh(COMMON_GEOS.torusLow(), argonMat, 0, 0.55, 0, Math.PI / 2.3, 0, 0, 0.92, 0.92, 0.92);
    bodyGroup.add(gyroRing);
    rotators.push({ mesh: gyroRing, speedY: 2.2, speedZ: 1.1 });

    // Artificer Robed Body
    bodyGroup.add(makeMesh(COMMON_GEOS.cone6(), robeMat, 0, 1.08, 0, 0, 0, 0, 0.48, 1.15, 0.44));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), bronzeMat, 0, 1.42, 0, 0, 0, 0, 0.68, 0.22, 0.42)); // Mantle
    // Head + Glowing Visor Hood
    bodyGroup.add(makeMesh(COMMON_GEOS.sphereLow(), darkMetal, 0, 1.75, 0, 0, 0, 0, 0.24, 0.26, 0.24));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), argonMat, 0, 1.76, 0.18, 0, 0, 0, 0.24, 0.09, 0.12)); // Visor
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), robeMat, 0, 1.98, -0.04, -0.2, 0, 0, 0.28, 0.36, 0.28));

    // Floating Sentinel Orb companion
    const orbCompanion = makeMesh(COMMON_GEOS.octa(), argonMat, -0.62, 1.75, 0.15, 0, 0, 0, 0.2, 0.28, 0.2);
    bodyGroup.add(orbCompanion);
    rotators.push({ mesh: orbCompanion, speedY: 3.5, speedX: 1.5 });

    // Weapon: Argon Rail-Staff
    weaponGroup.position.set(0.46, 1.25, 0.22);
    weaponGroup.add(makeMesh(COMMON_GEOS.cyl6(), darkMetal, 0, 0.15, 0, 0.2, 0, 0, 0.06, 1.65, 0.06));
    weaponGroup.add(makeMesh(COMMON_GEOS.torusLow(), bronzeMat, 0, 0.95, 0.16, 0, Math.PI / 2, 0, 0.24, 0.24, 0.24));
    weaponGroup.add(makeMesh(COMMON_GEOS.octa(), argonMat, 0, 0.95, 0.16, 0, 0, 0, 0.16, 0.26, 0.16));
    bodyGroup.add(weaponGroup);

  } else if (heroId === 'sylvanis') {
    // ------------------------------------------------------------------------
    // SYLVANIS — Emerald Shadow-Stag + Astral Longbow + Crowned Antlers
    // ------------------------------------------------------------------------
    const stagMat = getStdMat(0x064e3b, 0.6, 0.15, 0x022c22, 0.2);
    const antlerMat = getStdMat(0x6ee7b7, 0.3, 0.3, 0x10b981, 0.65);
    const cloakMat = getStdMat(0x047857, 0.65, 0.1);
    const bowMat = getStdMat(0xa7f3d0, 0.2, 0.4, 0x34d399, 0.95);
    const leatherMat = getStdMat(0x78350f, 0.7, 0.1);

    // Agile Stag Body
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), stagMat, 0, 0.76, 0, 0, 0, 0, 0.56, 0.52, 1.38));
    const legCoords = [[-0.2, 0.46], [0.2, 0.46], [-0.2, -0.46], [0.2, -0.46]];
    legCoords.forEach(([lx, lz]) => {
      bodyGroup.add(makeMesh(COMMON_GEOS.cyl6(), stagMat, lx, 0.32, lz, 0, 0, 0, 0.08, 0.64, 0.08));
    });
    // Stag Neck, Head & Majestic Antlers
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), stagMat, 0, 1.18, 0.58, 0.35, 0, 0, 0.28, 0.68, 0.3));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), stagMat, 0, 1.46, 0.8, 0.15, 0, 0, 0.24, 0.24, 0.46));
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), antlerMat, -0.26, 1.82, 0.68, -0.2, 0, 0.42, 0.08, 0.62, 0.08));
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), antlerMat, 0.26, 1.82, 0.68, -0.2, 0, -0.42, 0.08, 0.62, 0.08));
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), antlerMat, -0.42, 1.92, 0.58, -0.3, 0, 0.75, 0.06, 0.38, 0.06));
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), antlerMat, 0.42, 1.92, 0.58, -0.3, 0, -0.75, 0.06, 0.38, 0.06));

    // Rider Ranger Body
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), leatherMat, 0, 1.35, -0.05, 0.1, 0, 0, 0.46, 0.62, 0.36));
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), cloakMat, 0, 1.86, -0.05, 0.15, 0, 0, 0.28, 0.48, 0.3));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), cloakMat, 0, 1.24, -0.36, 0.45, 0, 0, 0.52, 0.85, 0.08));

    // Weapon: Starlight Greatbow
    weaponGroup.position.set(0.38, 1.38, 0.32);
    weaponGroup.add(makeMesh(COMMON_GEOS.torusLow(), bowMat, 0, 0, 0.12, 0, Math.PI / 2, 0, 0.58, 0.68, 0.45));
    weaponGroup.add(makeMesh(COMMON_GEOS.box(), antlerMat, 0, 0, 0.35, Math.PI / 2, 0, 0, 0.05, 0.85, 0.05)); // Glowing arrow
    bodyGroup.add(weaponGroup);

  } else {
    // ------------------------------------------------------------------------
    // VESPERA — Astral Disc + Crescent Void Scythe + Floating Runic Shards
    // ------------------------------------------------------------------------
    const voidMat = getStdMat(0x2e1065, 0.45, 0.35, 0x1e1b4b, 0.25);
    const amethystMat = getStdMat(0xd8b4fe, 0.15, 0.4, 0x9333ea, 1.1);
    const silverMat = getStdMat(0xf1f5f9, 0.2, 0.85);

    // Floating Astral Disc
    const astralDisc = makeMesh(COMMON_GEOS.cyl8(), voidMat, 0, 0.36, 0, 0, 0, 0, 0.85, 0.12, 0.85);
    bodyGroup.add(astralDisc);
    const outerHalo = makeMesh(COMMON_GEOS.torusLow(), amethystMat, 0, 0.38, 0, Math.PI / 2, 0, 0, 1.02, 1.02, 0.8);
    bodyGroup.add(outerHalo);
    rotators.push({ mesh: outerHalo, speedZ: -2.0 });

    // Ethereal Robed Silhouette
    bodyGroup.add(makeMesh(COMMON_GEOS.cone6(), voidMat, 0, 1.12, 0, 0, 0, 0, 0.46, 1.28, 0.42));
    bodyGroup.add(makeMesh(COMMON_GEOS.sphereLow(), silverMat, 0, 1.82, 0, 0, 0, 0, 0.22, 0.24, 0.22));
    // Crescent Crown behind head
    bodyGroup.add(makeMesh(COMMON_GEOS.torusLow(), amethystMat, 0, 1.95, -0.1, 0, 0, 0, 0.38, 0.38, 0.38));

    // Weapon: Crescent Void Scythe
    weaponGroup.position.set(0.46, 1.32, 0.15);
    weaponGroup.add(makeMesh(COMMON_GEOS.cyl6(), silverMat, 0, 0.15, 0, 0.25, 0, -0.15, 0.05, 1.85, 0.05)); // Shaft
    weaponGroup.add(makeMesh(COMMON_GEOS.cone4(), amethystMat, 0.1, 0.98, 0.35, 1.35, 0, 0, 0.18, 0.88, 0.08)); // Crescent Scythe blade
    bodyGroup.add(weaponGroup);
  }

  group.add(bodyGroup);
  group.userData = {
    heroId,
    bodyGroup,
    weaponGroup,
    auraRing,
    innerDisc,
    rotators,
    baseY: 0,
  };

  // Seamless hot-swap callback once Blender model finishes loading in background
  if (MODEL_SPECS[modelKey]) {
    assetLoader.onReady(modelKey, () => {
      if (group.parent) {
        while (bodyGroup.children.length > 0) {
          bodyGroup.remove(bodyGroup.children[0]);
        }
        const newInst = assetLoader.instantiate(modelKey);
        if (newInst) {
          bodyGroup.add(newInst.wrapper);
          group.userData.isBlenderModel = true;
        }
      }
    });
  }

  return group;
}

/**
 * Animates a hero mesh (galloping/hovering, weapon swing, and idle breathing).
 * @param {THREE.Group} group
 * @param {Object} animState
 * @param {number} elapsedTime
 */
export function animateHeroMesh(group, animState = {}, elapsedTime = 0) {
  if (!group || !group.userData) return;
  const { heroId, bodyGroup, weaponGroup, auraRing, rotators } = group.userData;
  const isMoving = Boolean(animState.isMoving);
  const attackTimer = animState.attackTimer || 0;

  if (bodyGroup) {
    if (heroId === 'kaelen' || heroId === 'vespera') {
      // Smooth levitation hover
      const hoverAmp = isMoving ? 0.14 : 0.08;
      const hoverFreq = isMoving ? 6.5 : 2.8;
      bodyGroup.position.y = Math.sin(elapsedTime * hoverFreq) * hoverAmp;
      bodyGroup.rotation.x = isMoving ? 0.14 : Math.sin(elapsedTime * 1.8) * 0.03;
      bodyGroup.rotation.z = Math.cos(elapsedTime * 2.2) * 0.04;
    } else {
      // Galloping / stride cadence for mounted Arthuria & Sylvanis
      if (isMoving) {
        const stride = elapsedTime * 13.5;
        bodyGroup.position.y = Math.abs(Math.sin(stride)) * 0.22;
        bodyGroup.rotation.x = Math.cos(stride) * 0.11;
        bodyGroup.rotation.z = Math.sin(stride * 0.5) * 0.04;
      } else {
        bodyGroup.position.y = Math.sin(elapsedTime * 2.6) * 0.04;
        bodyGroup.rotation.x = 0;
        bodyGroup.rotation.z = 0;
      }
    }
  }

  // Weapon swing / spell cast pulse
  if (weaponGroup) {
    if (attackTimer > 0) {
      const phase = Math.min(1, attackTimer * 4.5);
      weaponGroup.rotation.x = Math.sin(phase * Math.PI) * 1.35;
      weaponGroup.rotation.z = -Math.sin(phase * Math.PI) * 0.45;
    } else {
      weaponGroup.rotation.x = Math.sin(elapsedTime * 2.4) * 0.06;
      weaponGroup.rotation.z = 0;
    }
  }

  // Rotate sub-rings / gyro parts
  if (rotators && rotators.length > 0) {
    for (let i = 0; i < rotators.length; i++) {
      const r = rotators[i];
      if (r.speedX) r.mesh.rotation.x = elapsedTime * r.speedX;
      if (r.speedY) r.mesh.rotation.y = elapsedTime * r.speedY;
      if (r.speedZ) r.mesh.rotation.z = elapsedTime * r.speedZ;
    }
  }

  // Subtle aura pulse
  if (auraRing) {
    const s = 1.32 + Math.sin(elapsedTime * 3.2) * 0.06;
    auraRing.scale.set(s, s, 1);
  }
}

// ============================================================================
// 2. BUILDING MESHES & ANIMATION
// ============================================================================

/**
 * Creates a stylized 3D building mesh for all 10 building types across Tiers 1-3
 * and specialized Tier-3 Evolutions.
 * @param {string} typeId
 * @param {number} tier
 * @param {string|null} evolutionId
 * @returns {THREE.Group}
 */
export function createBuildingMesh(typeId, tier = 1, evolutionId = null) {
  const group = new THREE.Group();
  group.name = `Building_${typeId}_T${tier}`;

  const rotators = [];
  const floaters = [];
  let windmillBlades = null;
  let turretHead = null;

  const clampedTier = Math.max(1, Math.min(3, tier || 1));
  const tierScale = 1 + (clampedTier - 1) * 0.14;

  // Shared materials
  const stoneLight = getStdMat(0xcbd5e1, 0.72, 0.1);
  const stoneDark = getStdMat(0x64748b, 0.8, 0.15);
  const woodMat = getStdMat(0x78350f, 0.75, 0.08);
  const roofRoyal = getStdMat(0x1d4ed8, 0.5, 0.25);
  const roofCrimson = getStdMat(0xb91c1c, 0.55, 0.2);
  const goldMat = getStdMat(0xf59e0b, 0.3, 0.8, 0xb45309, 0.35);
  const argonGlow = getStdMat(0x38bdf8, 0.15, 0.3, 0x0284c7, 1.15);
  const fireGlow = getStdMat(0xfb923c, 0.2, 0.2, 0xea580c, 1.2);
  const frostGlow = getStdMat(0x7dd3fc, 0.15, 0.4, 0x0284c7, 1.0);
  const arcaneGlow = getStdMat(0xc084fc, 0.15, 0.35, 0x9333ea, 1.2);

  switch (typeId) {
    case 'citadel': {
      // Grand Sovereign Citadel Spire
      const baseRadius = 2.45;
      group.add(makeMesh(COMMON_GEOS.cyl8(), stoneDark, 0, 0.35, 0, 0, 0, 0, baseRadius, 0.7, baseRadius));
      group.add(makeMesh(COMMON_GEOS.box(), stoneLight, 0, 1.45, 0, 0, 0, 0, 2.5, 1.8, 2.5));

      // 4 Corner Bastions
      const corners = [[-1.25, -1.25], [1.25, -1.25], [-1.25, 1.25], [1.25, 1.25]];
      corners.forEach(([cx, cz]) => {
        group.add(makeMesh(COMMON_GEOS.cyl8(), stoneLight, cx, 1.45, cz, 0, 0, 0, 0.52, 2.2, 0.52));
        group.add(makeMesh(COMMON_GEOS.cone6(), roofRoyal, cx, 2.9, cz, 0, 0, 0, 0.65, 0.85, 0.65));
        if (clampedTier >= 2) {
          group.add(makeMesh(COMMON_GEOS.octa(), goldMat, cx, 3.42, cz, 0, 0, 0, 0.16, 0.24, 0.16));
        }
      });

      // Central Keep Spire
      const spireH = 2.6 + clampedTier * 0.65;
      group.add(makeMesh(COMMON_GEOS.cyl8(), stoneLight, 0, 1.8 + spireH * 0.35, 0, 0, 0, 0, 0.95, spireH, 0.95));
      group.add(makeMesh(COMMON_GEOS.cone6(), roofRoyal, 0, 1.8 + spireH * 0.75 + 0.5, 0, 0, 0, 0, 1.2, 1.4, 1.2));

      // Floating Crown of the Spire crystal
      const crownY = 2.8 + spireH;
      const crownCrystal = makeMesh(COMMON_GEOS.octa(), argonGlow, 0, crownY, 0, 0, 0, 0, 0.52, 0.85, 0.52);
      group.add(crownCrystal);
      floaters.push({ mesh: crownCrystal, baseY: crownY, amp: 0.16, speed: 2.2 });
      rotators.push({ mesh: crownCrystal, speedY: 1.4 });

      const halo = makeMesh(COMMON_GEOS.torusLow(), goldMat, 0, crownY, 0, Math.PI / 2.2, 0, 0, 0.95, 0.95, 0.95);
      group.add(halo);
      rotators.push({ mesh: halo, speedZ: 1.8, speedX: 0.7 });

      // Evolution visuals for Citadel (Solar Aegis / Chrono Nexus / Royal Guard Keep)
      if (evolutionId) {
        const evoRing = makeMesh(COMMON_GEOS.torusLow(), evolutionId.includes('solar') ? fireGlow : arcaneGlow, 0, crownY + 0.2, 0, 0, 0, 0, 1.35, 1.35, 1.35);
        group.add(evoRing);
        rotators.push({ mesh: evoRing, speedY: -2.2, speedX: 1.2 });
      }
      break;
    }

    case 'gold_mine': {
      // Rocky Quarry Mound + Timber Derrick + Glowing Gold Ore Cart
      group.add(makeMesh(COMMON_GEOS.dodeca(), stoneDark, 0, 0.65, -0.15, 0, 0.4, 0, 1.25, 0.95, 1.15));
      // Mine tunnel frame
      group.add(makeMesh(COMMON_GEOS.box(), woodMat, -0.42, 0.55, 0.65, 0, 0, 0, 0.16, 1.1, 0.18));
      group.add(makeMesh(COMMON_GEOS.box(), woodMat, 0.42, 0.55, 0.65, 0, 0, 0, 0.16, 1.1, 0.18));
      group.add(makeMesh(COMMON_GEOS.box(), woodMat, 0, 1.08, 0.65, 0, 0, 0, 1.05, 0.18, 0.24));

      // Gold nuggets embedded in rock
      const nuggetPositions = [[-0.55, 0.7, 0.3], [0.52, 0.85, 0.2], [0.1, 1.25, -0.2], [-0.3, 1.1, -0.4]];
      nuggetPositions.forEach(([nx, ny, nz], idx) => {
        if (idx <= clampedTier + 1) {
          group.add(makeMesh(COMMON_GEOS.octa(), goldMat, nx, ny, nz, idx, idx, 0, 0.24, 0.24, 0.24));
        }
      });

      // Ore Cart
      group.add(makeMesh(COMMON_GEOS.box(), stoneDark, 0, 0.32, 1.05, 0, 0, 0, 0.55, 0.36, 0.65));
      group.add(makeMesh(COMMON_GEOS.dodeca(), goldMat, 0, 0.56, 1.05, 0, 0, 0, 0.26, 0.22, 0.26));

      if (clampedTier >= 2 || evolutionId) {
        // Crane / Smelter chimney
        group.add(makeMesh(COMMON_GEOS.cyl6(), stoneDark, 0.65, 1.25, -0.35, 0, 0, 0, 0.28, 1.8, 0.28));
        const crown = makeMesh(COMMON_GEOS.octa(), goldMat, 0, 1.78, -0.1, 0, 0, 0, 0.32, 0.45, 0.32);
        group.add(crown);
        floaters.push({ mesh: crown, baseY: 1.78, amp: 0.1, speed: 2.5 });
        rotators.push({ mesh: crown, speedY: 1.8 });
      }
      break;
    }

    case 'windmill': {
      // Golden Wheat Mill + Rotating 4-Sail Hub
      group.add(makeMesh(COMMON_GEOS.cyl8(), stoneDark, 0, 0.3, 0, 0, 0, 0, 1.05, 0.6, 1.05));
      group.add(makeMesh(COMMON_GEOS.cyl8(), stoneLight, 0, 1.25, 0, 0, 0, 0, 0.72, 1.7, 0.88));
      group.add(makeMesh(COMMON_GEOS.cone6(), roofCrimson, 0, 2.38, 0, 0, 0, 0, 0.92, 0.85, 0.92));

      // Golden crop patches around base
      for (let i = 0; i < 4 + clampedTier; i++) {
        const ang = (i / (4 + clampedTier)) * Math.PI * 2;
        group.add(makeMesh(
          COMMON_GEOS.box(),
          goldMat,
          Math.cos(ang) * 1.15,
          0.16,
          Math.sin(ang) * 1.15,
          0,
          ang,
          0,
          0.42,
          0.26,
          0.32
        ));
      }

      // Windmill Blades Group
      windmillBlades = new THREE.Group();
      windmillBlades.position.set(0, 1.78, 0.82);
      windmillBlades.add(makeMesh(COMMON_GEOS.cyl6(), woodMat, 0, 0, 0, Math.PI / 2, 0, 0, 0.18, 0.35, 0.18));
      const sailMat = evolutionId ? goldMat : getStdMat(0xfef3c7, 0.6, 0.05);
      for (let b = 0; b < 4; b++) {
        const bladePivot = new THREE.Group();
        bladePivot.rotation.z = (b * Math.PI) / 2;
        bladePivot.add(makeMesh(COMMON_GEOS.box(), woodMat, 0, 0.68, 0.05, 0, 0, 0, 0.08, 1.32, 0.06));
        bladePivot.add(makeMesh(COMMON_GEOS.box(), sailMat, 0.16, 0.76, 0.08, 0, 0.15, 0, 0.28, 1.05, 0.03));
        windmillBlades.add(bladePivot);
      }
      group.add(windmillBlades);
      break;
    }

    case 'argon_refinery': {
      // Hexagonal Collector Pad + Glowing Argon Siphon Pylons + Levitating Crystal
      group.add(makeMesh(COMMON_GEOS.cyl6(), stoneDark, 0, 0.28, 0, 0, 0, 0, 1.25, 0.56, 1.25));
      group.add(makeMesh(COMMON_GEOS.cyl6(), getStdMat(0x1e293b, 0.4, 0.7), 0, 0.65, 0, 0, 0, 0, 0.92, 0.35, 0.92));

      // 3 Angled Collector Pylons
      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI * 2) / 3;
        const px = Math.cos(ang) * 0.82;
        const pz = Math.sin(ang) * 0.82;
        group.add(makeMesh(COMMON_GEOS.box(), stoneLight, px, 1.15, pz, 0, -ang, 0.22, 0.22, 1.45, 0.28));
        group.add(makeMesh(COMMON_GEOS.octa(), argonGlow, px * 0.85, 1.88, pz * 0.85, 0, 0, 0, 0.16, 0.24, 0.16));
      }

      // Levitating central Argon Core
      const core = makeMesh(COMMON_GEOS.octa(), argonGlow, 0, 1.65, 0, 0, 0, 0, 0.44, 0.78, 0.44);
      group.add(core);
      floaters.push({ mesh: core, baseY: 1.65, amp: 0.15, speed: 2.6 });
      rotators.push({ mesh: core, speedY: 2.0 });

      if (clampedTier >= 2 || evolutionId) {
        const ring = makeMesh(COMMON_GEOS.torusLow(), argonGlow, 0, 1.65, 0, Math.PI / 2, 0, 0, 0.78, 0.78, 0.78);
        group.add(ring);
        rotators.push({ mesh: ring, speedZ: 2.4, speedX: 1.1 });
      }
      break;
    }

    case 'archer_tower': {
      // Tall Crenellated Watchtower + Ballista/Crossbow Turret Head
      const towerH = 1.85 + clampedTier * 0.38;
      group.add(makeMesh(COMMON_GEOS.box(), stoneDark, 0, 0.35, 0, 0, 0, 0, 1.35, 0.7, 1.35));
      group.add(makeMesh(COMMON_GEOS.box(), stoneLight, 0, 0.5 + towerH * 0.5, 0, 0, 0, 0, 0.98, towerH, 0.98));

      const topY = 0.5 + towerH;
      group.add(makeMesh(COMMON_GEOS.box(), stoneDark, 0, topY + 0.15, 0, 0, 0, 0, 1.24, 0.32, 1.24));

      // Turret Head (rotatable towards target or idle scan)
      turretHead = new THREE.Group();
      turretHead.position.set(0, topY + 0.48, 0);

      if (evolutionId && evolutionId.includes('sniper')) {
        // Long-barrel Rail-Ballista
        turretHead.add(makeMesh(COMMON_GEOS.box(), goldMat, 0, 0.12, 0.25, 0, 0, 0, 0.24, 0.22, 1.45));
        turretHead.add(makeMesh(COMMON_GEOS.box(), argonGlow, 0, 0.18, 0.35, 0, 0, 0, 0.1, 0.12, 1.35));
      } else if (evolutionId && evolutionId.includes('volley')) {
        // Multi-barrel Hurricane Repeater
        turretHead.add(makeMesh(COMMON_GEOS.box(), woodMat, -0.22, 0.12, 0.2, 0, 0, 0, 0.16, 0.2, 0.95));
        turretHead.add(makeMesh(COMMON_GEOS.box(), woodMat, 0, 0.18, 0.25, 0, 0, 0, 0.16, 0.2, 1.05));
        turretHead.add(makeMesh(COMMON_GEOS.box(), woodMat, 0.22, 0.12, 0.2, 0, 0, 0, 0.16, 0.2, 0.95));
      } else {
        // Standard Crossbow/Ballista + pointed roof cap
        turretHead.add(makeMesh(COMMON_GEOS.box(), woodMat, 0, 0.1, 0.18, 0, 0, 0, 0.22, 0.18, 0.92));
        turretHead.add(makeMesh(COMMON_GEOS.box(), goldMat, 0, 0.12, 0.45, 0, 0, 0, 0.88, 0.08, 0.14));
        group.add(makeMesh(COMMON_GEOS.cone4(), roofRoyal, 0, topY + 1.05, 0, 0, Math.PI / 4, 0, 0.88, 0.82, 0.88));
      }
      group.add(turretHead);
      break;
    }

    case 'arcane_obelisk': {
      // Tapered Obsidian Monolith + Levitating Spire Tip + Orbiting Rings
      const obsidianMat = getStdMat(0x1e1b4b, 0.35, 0.55);
      group.add(makeMesh(COMMON_GEOS.cyl6(), stoneDark, 0, 0.28, 0, 0, 0, 0, 1.15, 0.56, 1.15));
      group.add(makeMesh(COMMON_GEOS.cyl4 ? COMMON_GEOS.cyl6() : COMMON_GEOS.cyl6(), obsidianMat, 0, 1.35, 0, 0, 0, 0, 0.52, 1.95, 0.52));

      const crystalMat = evolutionId && evolutionId.includes('solar') ? fireGlow : arcaneGlow;
      const tipY = 2.75 + (clampedTier - 1) * 0.22;
      const floatingTip = makeMesh(COMMON_GEOS.octa(), crystalMat, 0, tipY, 0, 0, 0, 0, 0.42, 0.78, 0.42);
      group.add(floatingTip);
      floaters.push({ mesh: floatingTip, baseY: tipY, amp: 0.18, speed: 2.8 });
      rotators.push({ mesh: floatingTip, speedY: 2.2 });

      for (let r = 0; r < clampedTier; r++) {
        const ring = makeMesh(
          COMMON_GEOS.torusLow(),
          crystalMat,
          0,
          1.7 + r * 0.45,
          0,
          Math.PI / 2 + (r * 0.25),
          0,
          0,
          0.76 - r * 0.08,
          0.76 - r * 0.08,
          0.76 - r * 0.08
        );
        group.add(ring);
        rotators.push({ mesh: ring, speedZ: (r % 2 === 0 ? 1 : -1) * (1.8 + r * 0.5) });
      }
      break;
    }

    case 'flame_mortar': {
      // Heavy Dwarven Iron Foundry Base + Angled Magma Bombard Cannon
      const ironMat = getStdMat(0x334155, 0.45, 0.75);
      group.add(makeMesh(COMMON_GEOS.cyl8(), stoneDark, 0, 0.32, 0, 0, 0, 0, 1.28, 0.64, 1.28));
      group.add(makeMesh(COMMON_GEOS.cyl8(), ironMat, 0, 0.75, 0, 0, 0, 0, 0.96, 0.45, 0.96));

      turretHead = new THREE.Group();
      turretHead.position.set(0, 1.05, 0);
      // Side trunnion mounts
      turretHead.add(makeMesh(COMMON_GEOS.box(), goldMat, -0.52, 0.15, 0, 0, 0, 0, 0.18, 0.52, 0.58));
      turretHead.add(makeMesh(COMMON_GEOS.box(), goldMat, 0.52, 0.15, 0, 0, 0, 0, 0.18, 0.52, 0.58));
      // Thick angled mortar barrel
      turretHead.add(makeMesh(COMMON_GEOS.cyl8(), ironMat, 0, 0.42, 0.15, Math.PI / 4, 0, 0, 0.44, 1.18, 0.44));
      // Glowing magma bore inside barrel
      turretHead.add(makeMesh(COMMON_GEOS.sphereLow(), fireGlow, 0, 0.75, 0.48, 0, 0, 0, 0.34, 0.25, 0.34));

      if (evolutionId) {
        const magmaOrb = makeMesh(COMMON_GEOS.octa(), fireGlow, 0, 1.35, -0.25, 0, 0, 0, 0.28, 0.36, 0.28);
        turretHead.add(magmaOrb);
        rotators.push({ mesh: magmaOrb, speedY: 2.8 });
      }
      group.add(turretHead);
      break;
    }

    case 'frost_spire': {
      // Crystalline Glacial Spire + Orbiting Ice Shards
      group.add(makeMesh(COMMON_GEOS.cyl6(), stoneLight, 0, 0.28, 0, 0, 0, 0, 1.15, 0.56, 1.15));
      group.add(makeMesh(COMMON_GEOS.cone6(), frostGlow, 0, 1.55, 0, 0, 0, 0, 0.58, 2.35, 0.58));

      // Surrounding ice crystal clusters
      const shardCount = 3 + clampedTier;
      const orbitGroup = new THREE.Group();
      orbitGroup.position.set(0, 1.45, 0);
      for (let i = 0; i < shardCount; i++) {
        const ang = (i / shardCount) * Math.PI * 2;
        const shard = makeMesh(
          COMMON_GEOS.octa(),
          frostGlow,
          Math.cos(ang) * 0.78,
          (i % 2) * 0.28,
          Math.sin(ang) * 0.78,
          0.2,
          ang,
          0,
          0.18,
          0.48,
          0.18
        );
        orbitGroup.add(shard);
      }
      group.add(orbitGroup);
      rotators.push({ mesh: orbitGroup, speedY: 1.5 });
      break;
    }

    case 'barracks': {
      // Fortified Garrison Hall + Pitched Roof + Banner Poles + Shield Rack
      group.add(makeMesh(COMMON_GEOS.box(), stoneDark, 0, 0.25, 0, 0, 0, 0, 2.1, 0.5, 1.65));
      group.add(makeMesh(COMMON_GEOS.box(), stoneLight, 0, 0.95, 0, 0, 0, 0, 1.85, 1.1, 1.38));

      const roofMat = evolutionId && evolutionId.includes('valkyrie') ? goldMat : roofRoyal;
      group.add(makeMesh(COMMON_GEOS.cone4(), roofMat, 0, 1.88, 0, 0, Math.PI / 4, 0, 1.55, 0.92, 1.25));

      // Archway door
      group.add(makeMesh(COMMON_GEOS.box(), woodMat, 0, 0.72, 0.68, 0, 0, 0, 0.52, 0.76, 0.12));
      // Twin Heraldic Banners
      group.add(makeMesh(COMMON_GEOS.cyl6(), woodMat, -0.75, 1.35, 0.78, 0, 0, 0, 0.05, 1.8, 0.05));
      group.add(makeMesh(COMMON_GEOS.box(), goldMat, -0.75, 1.65, 0.84, 0, 0, 0, 0.28, 0.52, 0.04));
      group.add(makeMesh(COMMON_GEOS.cyl6(), woodMat, 0.75, 1.35, 0.78, 0, 0, 0, 0.05, 1.8, 0.05));
      group.add(makeMesh(COMMON_GEOS.box(), goldMat, 0.75, 1.65, 0.84, 0, 0, 0, 0.28, 0.52, 0.04));
      break;
    }

    case 'stone_wall':
    default: {
      // Heavy Crenellated Rampart Bastion Segment
      group.add(makeMesh(COMMON_GEOS.box(), stoneDark, 0, 0.35, 0, 0, 0, 0, 1.85, 0.7, 0.95));
      group.add(makeMesh(COMMON_GEOS.box(), stoneLight, 0, 1.05, 0, 0, 0, 0, 1.72, 0.95, 0.82));
      // Merlons
      for (let m = -0.6; m <= 0.61; m += 0.6) {
        group.add(makeMesh(COMMON_GEOS.box(), stoneDark, m, 1.68, 0, 0, 0, 0, 0.36, 0.35, 0.88));
      }
      if (clampedTier >= 2 || evolutionId) {
        const crystalMat = evolutionId && evolutionId.includes('rune') ? argonGlow : goldMat;
        const rune = makeMesh(COMMON_GEOS.octa(), crystalMat, 0, 2.08, 0, 0, 0, 0, 0.24, 0.38, 0.24);
        group.add(rune);
        floaters.push({ mesh: rune, baseY: 2.08, amp: 0.08, speed: 2.4 });
        rotators.push({ mesh: rune, speedY: 1.6 });
      }
      break;
    }
  }

  group.scale.setScalar(tierScale);
  group.userData = {
    typeId,
    tier: clampedTier,
    evolutionId,
    rotators,
    floaters,
    windmillBlades,
    turretHead,
  };

  return group;
}

/**
 * Animates a building mesh (windmill blades, crystal rings, floating obelisks).
 * @param {THREE.Group} group
 * @param {number} elapsedTime
 * @param {boolean} isNight
 */
export function animateBuildingMesh(group, elapsedTime = 0, isNight = false) {
  if (!group || !group.userData) return;
  const { rotators, floaters, windmillBlades } = group.userData;
  const speedMult = isNight ? 1.35 : 1.0;

  if (windmillBlades) {
    windmillBlades.rotation.z = -elapsedTime * 1.45 * speedMult;
  }

  if (rotators) {
    for (let i = 0; i < rotators.length; i++) {
      const r = rotators[i];
      if (r.speedX) r.mesh.rotation.x = elapsedTime * r.speedX * speedMult;
      if (r.speedY) r.mesh.rotation.y = elapsedTime * r.speedY * speedMult;
      if (r.speedZ) r.mesh.rotation.z = elapsedTime * r.speedZ * speedMult;
    }
  }

  if (floaters) {
    for (let i = 0; i < floaters.length; i++) {
      const f = floaters[i];
      f.mesh.position.y = f.baseY + Math.sin(elapsedTime * f.speed) * f.amp;
    }
  }
}

// ============================================================================
// 3. BUILD SOCKET PADS
// ============================================================================

/**
 * Creates a tactile 3D build socket node on the terrain.
 * @param {Object} socketDef
 * @returns {THREE.Group}
 */
export function createSocketPadMesh(socketDef = {}) {
  const socketType = socketDef.slotType || socketDef.type || 'tactical';
  const group = new THREE.Group();
  group.name = `SocketPad_${socketDef.id || socketType}`;

  const colorMap = {
    citadel: 0xd4a349,
    gold_vein: 0xeab308,
    argon_vein: 0x38bdf8,
    fertile_land: 0xa3e635,
    wall: 0x9ca3af,
    tactical: 0xc8a45d,
  };
  const accentColor = colorMap[socketType] || 0xc8a45d;

  // Natural Carved Stone Foundation Plinth
  const plinthMat = getStdMat(0x57534e, 0.82, 0.12);
  const innerStoneMat = getStdMat(0x44403c, 0.86, 0.08);
  const padRadius = socketType === 'citadel' ? 2.1 : 1.18;
  group.add(makeMesh(COMMON_GEOS.cyl8(), plinthMat, 0, 0.05, 0, 0, 0, 0, padRadius, 0.10, padRadius, false, true));
  group.add(makeMesh(COMMON_GEOS.cyl8(), innerStoneMat, 0, 0.08, 0, 0, 0, 0, padRadius * 0.82, 0.06, padRadius * 0.82, false, true));

  // Subtle Engraved Brass/Rune Ring stored in userData.ringMesh
  const ringMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.22,
    roughness: 0.45,
    metalness: 0.65,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(COMMON_GEOS.ringFlat(), ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.12;
  ringMesh.scale.setScalar(padRadius * 0.96);
  group.add(ringMesh);

  // Resource-specific 3D surface markers (Gold Vein, Argon Crystal Vein, Fertile Soil, Wall Foundation, Tactical Cairn)
  if (socketType === 'gold_vein') {
    const goldMat = getStdMat(0xfbbf24, 0.22, 0.88, 0xd97706, 0.35);
    const rockMat = getStdMat(0x57534e, 0.78, 0.12);
    group.add(makeMesh(COMMON_GEOS.dodeca(), rockMat, -0.22, 0.24, -0.12, 0, 0, 0, 0.42, 0.32, 0.42));
    group.add(makeMesh(COMMON_GEOS.octa(), goldMat, 0.20, 0.28, 0.14, 0.3, 0.5, 0, 0.28, 0.34, 0.28));
    group.add(makeMesh(COMMON_GEOS.octa(), goldMat, -0.08, 0.36, -0.08, 0.1, 0.2, 0, 0.20, 0.24, 0.20));
  } else if (socketType === 'argon_vein') {
    const argonMat = getStdMat(0x38bdf8, 0.15, 0.35, 0x0284c7, 0.85);
    group.add(makeMesh(COMMON_GEOS.cone4(), argonMat, 0, 0.42, 0, 0.08, 0.2, 0, 0.22, 0.62, 0.22));
    group.add(makeMesh(COMMON_GEOS.cone4(), argonMat, -0.26, 0.30, 0.16, -0.25, 0, 0.25, 0.16, 0.42, 0.16));
    group.add(makeMesh(COMMON_GEOS.cone4(), argonMat, 0.26, 0.30, -0.14, 0.22, 0, -0.25, 0.16, 0.42, 0.16));
  } else if (socketType === 'fertile_land') {
    const soilMat = getStdMat(0x5c4033, 0.88, 0.05);
    const wheatMat = getStdMat(0xeab308, 0.55, 0.1, 0xca8a04, 0.15);
    group.add(makeMesh(COMMON_GEOS.cyl8(), soilMat, 0, 0.12, 0, 0, 0, 0, 0.85, 0.06, 0.85));
    for (let i = -0.28; i <= 0.29; i += 0.28) {
      group.add(makeMesh(COMMON_GEOS.cone4(), wheatMat, i, 0.26, -0.16, 0, 0, 0, 0.11, 0.28, 0.11));
      group.add(makeMesh(COMMON_GEOS.cone4(), wheatMat, i, 0.26, 0.16, 0, 0, 0, 0.11, 0.28, 0.11));
    }
  } else if (socketType === 'wall') {
    const stoneMat = getStdMat(0x78716c, 0.78, 0.12);
    group.add(makeMesh(COMMON_GEOS.box(), stoneMat, -0.38, 0.18, 0, 0, 0, 0, 0.32, 0.18, 0.40));
    group.add(makeMesh(COMMON_GEOS.box(), stoneMat, 0.38, 0.18, 0, 0, 0, 0, 0.32, 0.18, 0.40));
  } else {
    // Subtle Carved Stone Corner Cairns
    const cairnMat = getStdMat(0x78716c, 0.72, 0.18);
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      group.add(makeMesh(
        COMMON_GEOS.box(),
        cairnMat,
        Math.cos(ang) * 0.72,
        0.16,
        Math.sin(ang) * 0.72,
        0,
        -ang,
        0,
        0.15,
        0.16,
        0.15
      ));
    }
  }

  group.userData = {
    socketId: socketDef.id,
    socketType,
    ringMesh,
    baseColor: accentColor,
  };

  return group;
}

// ============================================================================
// 4. ENEMY MESHES (18 ENEMIES + 5 ACT BOSSES) & TROOP MESHES
// ============================================================================

/**
 * Creates distinct 3D procedural meshes for all 18 enemy types and 5 Act Bosses.
 * Flying units are elevated at y = 2.6 inside the group with a ground shadow disc at y = 0.08.
 * @param {Object} enemyDef
 * @returns {THREE.Group}
 */
export function createEnemyMesh(enemyDef = {}) {
  const id = enemyDef.id || 'goblin_scavenger';
  const isFlying = Boolean(enemyDef.isFlying);
  const isBoss = Boolean(enemyDef.isBoss || id.startsWith('boss_'));
  const baseScale = enemyDef.scale || (isBoss ? 1.85 : 1.0);

  const group = new THREE.Group();
  group.name = `Enemy_${id}`;

  const bodyGroup = new THREE.Group();
  const wings = [];
  const hitMeshes = [];

  const primaryHex = enemyDef.color || (isBoss ? 0xdc2626 : 0x65a30d);
  const accentHex = enemyDef.accentColor || (isBoss ? 0xfbbf24 : 0xef4444);

  // Clone material per enemy so hitFlash can tint individual units cleanly
  const primaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(primaryHex),
    roughness: 0.44,
    metalness: 0.25,
    flatShading: false,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: isBoss ? 0.85 : 0.45,
    roughness: 0.28,
    metalness: 0.4,
    flatShading: false,
  });
  const darkArmorMat = getStdMat(0x1e293b, 0.45, 0.7);
  hitMeshes.push(primaryMat, accentMat);

  // Ground indicator: Boss Menace Ring or Flying Ground Shadow Disc
  if (isFlying) {
    const shadowDisc = new THREE.Mesh(
      COMMON_GEOS.discFlat(),
      getBasicRingMat(0x020617, 0.58)
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.08;
    shadowDisc.scale.setScalar(0.75 * baseScale);
    group.add(shadowDisc);

    const airTargetRing = new THREE.Mesh(
      COMMON_GEOS.ringFlat(),
      getBasicRingMat(0x38bdf8, 0.42)
    );
    airTargetRing.rotation.x = -Math.PI / 2;
    airTargetRing.position.y = 0.09;
    airTargetRing.scale.setScalar(0.82 * baseScale);
    group.add(airTargetRing);
  }

  if (isBoss) {
    const menaceRing = new THREE.Mesh(
      COMMON_GEOS.ringFlat(),
      getBasicRingMat(accentHex, 0.78)
    );
    menaceRing.rotation.x = -Math.PI / 2;
    menaceRing.position.y = 0.09;
    menaceRing.scale.setScalar(1.95);
    group.add(menaceRing);
  }

  // If this is a colossal Act Boss and Blender model is loaded
  if (isBoss && MODEL_SPECS[id]) {
    const blenderInst = assetLoader.instantiate(id);
    if (blenderInst) {
      bodyGroup.add(blenderInst.wrapper);
      if (blenderInst.hitMeshes?.length > 0) {
        hitMeshes.push(...blenderInst.hitMeshes);
      }
      bodyGroup.scale.setScalar(baseScale);
      group.add(bodyGroup);

      group.userData = {
        enemyId: id,
        isFlying,
        isBoss,
        baseY: isFlying ? 2.6 : 0,
        bodyGroup,
        wings,
        hitMeshes,
        originalColors: hitMeshes.map((m) => m.color.getHex()),
        isBlenderModel: true,
      };
      return group;
    }
  }

  // Build silhouette by specific enemy ID or archetype
  if (isBoss) {
    // ------------------------------------------------------------------------
    // 5 COLOSSAL ACT BOSSES
    // ------------------------------------------------------------------------
    // Broad Armored Torso + Horned Crown + Glowing Core + Massive Weapon
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), primaryMat, 0, 1.15, 0, 0, 0, 0, 1.15, 1.35, 0.82));
    bodyGroup.add(makeMesh(COMMON_GEOS.octa(), accentMat, 0, 1.25, 0.42, 0, 0, 0, 0.32, 0.42, 0.22)); // Glowing chest core
    // Legs
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), darkArmorMat, -0.36, 0.38, 0, 0, 0, 0, 0.36, 0.76, 0.38));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), darkArmorMat, 0.36, 0.38, 0, 0, 0, 0, 0.36, 0.76, 0.38));
    // Massive Pauldrons
    bodyGroup.add(makeMesh(COMMON_GEOS.dodeca(), darkArmorMat, -0.78, 1.62, 0, 0, 0, 0, 0.42, 0.38, 0.42));
    bodyGroup.add(makeMesh(COMMON_GEOS.dodeca(), darkArmorMat, 0.78, 1.62, 0, 0, 0, 0, 0.42, 0.38, 0.42));
    // Head + Twin Curved Horns
    bodyGroup.add(makeMesh(COMMON_GEOS.sphereLow(), primaryMat, 0, 2.05, 0.08, 0, 0, 0, 0.38, 0.4, 0.38));
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), accentMat, -0.34, 2.42, 0.05, 0.2, 0, 0.45, 0.14, 0.65, 0.14));
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), accentMat, 0.34, 2.42, 0.05, 0.2, 0, -0.45, 0.14, 0.65, 0.14));

    if (id === 'boss_malakor' || id === 'boss_ignis_valkor' || isFlying) {
      // Colossal Dragon/Void Wings
      const leftWing = makeMesh(COMMON_GEOS.box(), accentMat, -0.95, 1.65, -0.35, 0.2, 0.3, 0.3, 1.35, 0.75, 0.1);
      const rightWing = makeMesh(COMMON_GEOS.box(), accentMat, 0.95, 1.65, -0.35, 0.2, -0.3, -0.3, 1.35, 0.75, 0.1);
      bodyGroup.add(leftWing, rightWing);
      wings.push({ left: leftWing, right: rightWing });
    }

    // Boss Cleaver / Greatmaul
    bodyGroup.add(makeMesh(COMMON_GEOS.cyl6(), darkArmorMat, 0.88, 1.25, 0.45, 0.4, 0, 0, 0.1, 1.85, 0.1));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), accentMat, 0.88, 1.95, 0.82, 0.4, 0, 0, 0.55, 0.68, 0.32));

  } else if (isFlying) {
    // ------------------------------------------------------------------------
    // FLYING ENEMIES (Harpy, Frost Wyrmling, Solar Phoenix, Magma Gargoyle, Void Seraph)
    // Elevated at y = 2.6 so their air layer is unmistakable!
    // ------------------------------------------------------------------------
    bodyGroup.position.y = 2.6;
    bodyGroup.add(makeMesh(COMMON_GEOS.octa(), primaryMat, 0, 0, 0, Math.PI / 2.4, 0, 0, 0.38, 0.72, 0.34));
    bodyGroup.add(makeMesh(COMMON_GEOS.sphereLow(), accentMat, 0, 0.18, 0.42, 0, 0, 0, 0.22, 0.22, 0.26));
    bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), primaryMat, 0, -0.1, -0.58, -Math.PI / 2, 0, 0, 0.16, 0.55, 0.16));

    const leftWing = makeMesh(COMMON_GEOS.box(), accentMat, -0.62, 0.1, 0, 0, 0.15, 0.15, 0.92, 0.08, 0.44);
    const rightWing = makeMesh(COMMON_GEOS.box(), accentMat, 0.62, 0.1, 0, 0, -0.15, -0.15, 0.92, 0.08, 0.44);
    bodyGroup.add(leftWing, rightWing);
    wings.push({ left: leftWing, right: rightWing });

  } else if (id.includes('spider') || id.includes('scorpion') || id.includes('scarab') || id.includes('hound') || id.includes('boar')) {
    // ------------------------------------------------------------------------
    // BEASTS / ARACHNIDS / SWARMERS
    // ------------------------------------------------------------------------
    bodyGroup.add(makeMesh(COMMON_GEOS.sphereLow(), primaryMat, 0, 0.42, -0.12, 0, 0, 0, 0.46, 0.36, 0.58));
    bodyGroup.add(makeMesh(COMMON_GEOS.sphereLow(), accentMat, 0, 0.46, 0.42, 0, 0, 0, 0.28, 0.26, 0.28));
    for (let s = -1; s <= 1; s += 2) {
      bodyGroup.add(makeMesh(COMMON_GEOS.box(), darkArmorMat, s * 0.48, 0.25, 0.2, 0, 0, s * -0.4, 0.35, 0.1, 0.1));
      bodyGroup.add(makeMesh(COMMON_GEOS.box(), darkArmorMat, s * 0.52, 0.25, -0.15, 0, 0, s * -0.4, 0.35, 0.1, 0.1));
    }

  } else if (id.includes('golem') || id.includes('juggernaut') || id.includes('colossus') || id.includes('troll') || id.includes('behemoth')) {
    // ------------------------------------------------------------------------
    // HEAVY SIEGE GOLEMS & JUGGERNAUTS
    // ------------------------------------------------------------------------
    bodyGroup.add(makeMesh(COMMON_GEOS.dodeca(), primaryMat, 0, 0.92, 0, 0, 0, 0, 0.68, 0.78, 0.58));
    bodyGroup.add(makeMesh(COMMON_GEOS.octa(), accentMat, 0, 0.98, 0.35, 0, 0, 0, 0.24, 0.32, 0.2));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), darkArmorMat, -0.28, 0.3, 0, 0, 0, 0, 0.28, 0.6, 0.3));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), darkArmorMat, 0.28, 0.3, 0, 0, 0, 0, 0.28, 0.6, 0.3));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), primaryMat, -0.62, 0.85, 0.15, 0.2, 0, 0, 0.28, 0.72, 0.28));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), primaryMat, 0.62, 0.85, 0.15, -0.3, 0, 0, 0.28, 0.72, 0.28));

  } else {
    // ------------------------------------------------------------------------
    // HUMANOID INFANTRY / CASTERS / RAIDERS
    // ------------------------------------------------------------------------
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), primaryMat, 0, 0.68, 0, 0, 0, 0, 0.48, 0.65, 0.34));
    bodyGroup.add(makeMesh(COMMON_GEOS.sphereLow(), primaryMat, 0, 1.18, 0, 0, 0, 0, 0.22, 0.24, 0.22));
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), accentMat, 0, 1.2, 0.16, 0, 0, 0, 0.18, 0.08, 0.1)); // Glowing eyes
    bodyGroup.add(makeMesh(COMMON_GEOS.box(), darkArmorMat, 0.34, 0.72, 0.25, 0.45, 0, 0, 0.1, 0.62, 0.12)); // Weapon
  }

  bodyGroup.scale.setScalar(baseScale);
  group.add(bodyGroup);

  group.userData = {
    enemyId: id,
    isFlying,
    isBoss,
    baseY: isFlying ? 2.6 : 0,
    bodyGroup,
    wings,
    hitMeshes,
    originalColors: hitMeshes.map((m) => m.color.getHex()),
  };

  // Seamless hot-swap callback once Blender boss model finishes loading in background
  if (isBoss && MODEL_SPECS[id]) {
    assetLoader.onReady(id, () => {
      if (group.parent) {
        while (bodyGroup.children.length > 0) {
          bodyGroup.remove(bodyGroup.children[0]);
        }
        const newInst = assetLoader.instantiate(id);
        if (newInst) {
          bodyGroup.add(newInst.wrapper);
          hitMeshes.length = 0;
          if (newInst.hitMeshes?.length > 0) {
            hitMeshes.push(...newInst.hitMeshes);
          }
          group.userData.originalColors = hitMeshes.map((m) => m.color.getHex());
          group.userData.isBlenderModel = true;
        }
      }
    });
  }

  return group;
}

/**
 * Animates an enemy or allied troop unit mesh (walking cadence, wing flap, hit flash).
 * @param {THREE.Group} group
 * @param {Object} animState
 * @param {number} elapsedTime
 */
export function animateUnitMesh(group, animState = {}, elapsedTime = 0) {
  if (!group || !group.userData) return;
  const { isFlying, baseY, bodyGroup, wings, hitMeshes, originalColors } = group.userData;
  const hitFlash = animState.hitFlash || 0;

  if (bodyGroup) {
    if (isFlying) {
      bodyGroup.position.y = (baseY || 2.6) + Math.sin(elapsedTime * 5.2) * 0.18;
      bodyGroup.rotation.z = Math.cos(elapsedTime * 2.6) * 0.06;
    } else {
      const walkPhase = elapsedTime * 10.5;
      bodyGroup.position.y = Math.abs(Math.sin(walkPhase)) * 0.10;
      bodyGroup.rotation.z = Math.sin(walkPhase) * 0.04;
    }
  }

  if (wings && wings.length > 0) {
    const flap = Math.sin(elapsedTime * 14.0) * 0.48;
    for (let i = 0; i < wings.length; i++) {
      wings[i].left.rotation.z = 0.2 + flap;
      wings[i].right.rotation.z = -0.2 - flap;
    }
  }

  if (hitMeshes && originalColors) {
    for (let i = 0; i < hitMeshes.length; i++) {
      if (hitFlash > 0) {
        hitMeshes[i].color.setHex(0xffffff);
      } else {
        hitMeshes[i].color.setHex(originalColors[i]);
      }
    }
  }
}

/**
 * Creates allied garrison troop meshes ('swordsman', 'knight', 'paladin', 'holy_paladin', 'valkyrie').
 * @param {string} unitType
 * @returns {THREE.Group}
 */
export function createTroopMesh(unitType = 'swordsman') {
  const group = new THREE.Group();
  group.name = `Troop_${unitType}`;

  const bodyGroup = new THREE.Group();
  const wings = [];
  const isValkyrie = unitType === 'valkyrie';
  const isPaladin = unitType.includes('paladin');

  const armorMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(isPaladin || isValkyrie ? 0xfef08a : 0xe2e8f0),
    roughness: 0.28,
    metalness: 0.78,
    flatShading: false,
  });
  const tabardMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(isValkyrie ? 0x38bdf8 : isPaladin ? 0xf59e0b : 0x2563eb),
    roughness: 0.48,
    metalness: 0.2,
    flatShading: false,
  });
  const goldMat = getStdMat(0xf59e0b, 0.25, 0.85, 0xd97706, 0.35);

  // Allied Selection Ring
  const ring = new THREE.Mesh(COMMON_GEOS.ringFlat(), getBasicRingMat(0x38bdf8, 0.45));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.07;
  ring.scale.setScalar(0.62);
  group.add(ring);

  // Torso & Helmet
  bodyGroup.add(makeMesh(COMMON_GEOS.box(), tabardMat, 0, 0.58, 0, 0, 0, 0, 0.42, 0.58, 0.32));
  bodyGroup.add(makeMesh(COMMON_GEOS.sphereLow(), armorMat, 0, 1.04, 0, 0, 0, 0, 0.2, 0.22, 0.2));
  bodyGroup.add(makeMesh(COMMON_GEOS.cone4(), goldMat, 0, 1.28, -0.04, -0.2, 0, 0, 0.08, 0.25, 0.14)); // Plume

  // Kite Shield on left
  bodyGroup.add(makeMesh(COMMON_GEOS.box(), goldMat, -0.28, 0.62, 0.12, 0, 0.2, 0, 0.08, 0.48, 0.34));
  // Sword / Spear on right
  bodyGroup.add(makeMesh(COMMON_GEOS.box(), armorMat, 0.28, 0.78, 0.22, 0.4, 0, 0, 0.08, 0.68, 0.08));

  if (isValkyrie) {
    const leftWing = makeMesh(COMMON_GEOS.box(), goldMat, -0.38, 0.78, -0.18, 0, 0.2, 0.3, 0.55, 0.26, 0.06);
    const rightWing = makeMesh(COMMON_GEOS.box(), goldMat, 0.38, 0.78, -0.18, 0, -0.2, -0.3, 0.55, 0.26, 0.06);
    bodyGroup.add(leftWing, rightWing);
    wings.push({ left: leftWing, right: rightWing });
  }

  group.add(bodyGroup);
  group.userData = {
    unitType,
    isFlying: false,
    baseY: 0,
    bodyGroup,
    wings,
    hitMeshes: [armorMat, tabardMat],
    originalColors: [armorMat.color.getHex(), tabardMat.color.getHex()],
  };

  return group;
}

// ============================================================================
// 5. ABYSSAL RIFT SPAWN PORTALS
// ============================================================================

/**
 * Creates an Abyssal Rift Spawn Portal with sculpted obsidian pillars and rotating vortex rings.
 * @param {Object} portalDef
 * @returns {THREE.Group}
 */
export function createPortalMesh(portalDef = {}) {
  const group = new THREE.Group();
  group.name = `Portal_${portalDef.id || 'rift'}`;

  const obsidianMat = getStdMat(0x1e1b4b, 0.38, 0.55);
  const riftGlow = getStdMat(0xe879f9, 0.15, 0.3, 0xa21caf, 1.35);
  const crimsonGlow = getStdMat(0xf43f5e, 0.2, 0.3, 0xbe123c, 1.15);

  // Smooth Runic Platform
  group.add(makeMesh(COMMON_GEOS.cyl8(), obsidianMat, 0, 0.16, 0, 0, 0, 0, 2.35, 0.32, 2.35));

  // Twin Sculpted Obsidian Arch Pillars
  group.add(makeMesh(COMMON_GEOS.cone4(), obsidianMat, -1.45, 1.65, 0, 0, 0, -0.16, 0.48, 3.2, 0.48));
  group.add(makeMesh(COMMON_GEOS.cone4(), obsidianMat, 1.45, 1.65, 0, 0, 0, 0.16, 0.48, 3.2, 0.48));

  // Rotating Vortex Rings
  const ringOuter = makeMesh(COMMON_GEOS.torusLow(), riftGlow, 0, 1.85, 0, 0, 0, 0, 1.25, 1.25, 1.25);
  const ringInner = makeMesh(COMMON_GEOS.torusLow(), crimsonGlow, 0, 1.85, 0, 0.3, 0.3, 0, 0.82, 0.82, 0.82);
  group.add(ringOuter, ringInner);

  // Glowing Portal Core Disc
  const vortexCore = new THREE.Mesh(COMMON_GEOS.discFlat(), getBasicRingMat(0xc026d3, 0.52));
  vortexCore.position.set(0, 1.85, 0);
  vortexCore.scale.setScalar(1.1);
  group.add(vortexCore);

  group.userData = {
    portalId: portalDef.id,
    rotators: [
      { mesh: ringOuter, speedZ: 1.6 },
      { mesh: ringInner, speedZ: -2.4, speedX: 1.1 },
    ],
  };

  return group;
}

// ============================================================================
// 6. FULL 3D ENVIRONMENT DIORAMA
// ============================================================================

/**
 * Builds the complete 3D island diorama for a Realm: smooth multi-tiered terrain plateau,
 * Royal Citadel Courtyard Plaza, continuous paved highways connecting spawn portals to the Citadel,
 * moat/river accents, and 80+ smooth organic biome trees/pines/crystals/boulders.
 * @param {Object} realmDef
 * @returns {THREE.Group}
 */
export function createEnvironmentDiorama(realmDef = {}) {
  const group = new THREE.Group();
  group.name = `Environment_${realmDef.id || 'realm'}`;

  const palette = realmDef.palette || {};
  const groundColor = palette.groundPrimary || palette.groundColor || 0x2d5a27;
  const subGroundColor = palette.groundSecondary || 0x1e3f20;
  const cliffColor = palette.cliffColor || 0x475569;
  const roadColor = palette.pathColor || palette.roadColor || 0x9ca3af;
  const waterColor = palette.waterColor || 0x0284c7;
  const foliageColor = palette.foliageColor || 0x16a34a;
  const foliageAltColor = palette.foliageAltColor || 0x22c55e;
  const crystalColor = palette.crystalColor || palette.accentGlow || 0x38bdf8;

  const groundMat = getStdMat(groundColor, 0.72, 0.06);
  const subGroundMat = getStdMat(subGroundColor, 0.78, 0.05);
  const cliffMat = getStdMat(cliffColor, 0.75, 0.14);
  const roadMat = getStdMat(roadColor, 0.62, 0.08);
  const roadBorderMat = getStdMat(0x64748b, 0.58, 0.18);
  const waterMat = getStdMat(waterColor, 0.16, 0.38, waterColor, 0.25, true, 0.88);
  const foliageMat = getStdMat(foliageColor, 0.62, 0.06);
  const foliageAltMat = getStdMat(foliageAltColor, 0.58, 0.06);
  const trunkMat = getStdMat(0x5c4033, 0.78, 0.05);
  const crystalMat = getStdMat(crystalColor, 0.18, 0.45, crystalColor, 0.85);

  // 1. Main Smooth Island Plateau (64 radial segments for silky circular silhouette)
  const mainPlateau = makeMesh(
    getGeo('island_top_smooth', () => new THREE.CylinderGeometry(46.5, 48.2, 2.4, 64)),
    groundMat,
    0, -1.2, 0, 0, 0, 0, 1, 1, 1, false, true
  );
  group.add(mainPlateau);

  // Soft Beveled Upper Turf Rim
  const turfRim = makeMesh(
    getGeo('island_turf_rim', () => new THREE.TorusGeometry(46.2, 0.65, 16, 64)),
    subGroundMat,
    0, -0.35, 0, Math.PI / 2, 0, 0, 1, 1, 0.6, false, true
  );
  group.add(turfRim);

  const deepPedestal = makeMesh(
    getGeo('island_cliff_smooth', () => new THREE.CylinderGeometry(48.2, 36, 12, 48)),
    cliffMat,
    0, -8.2, 0, 0, 0, 0, 1, 1, 1, false, true
  );
  group.add(deepPedestal);

  // Subtle decorative moat/water ring outside the island
  const outerWater = new THREE.Mesh(
    getGeo('water_ring_smooth', () => new THREE.RingGeometry(47, 92, 64)),
    waterMat
  );
  outerWater.rotation.x = -Math.PI / 2;
  outerWater.position.y = -1.6;
  group.add(outerWater);

  // 2. Royal Citadel Central Courtyard Plaza
  const plazaDisc = makeMesh(
    COMMON_GEOS.cyl8(),
    roadMat,
    0, 0.025, 0,
    0, 0, 0,
    7.8, 0.05, 7.8,
    false, true
  );
  group.add(plazaDisc);

  const plazaRim = makeMesh(
    COMMON_GEOS.torusLow(),
    roadBorderMat,
    0, 0.04, 0,
    Math.PI / 2, 0, 0,
    7.85, 7.85, 0.35,
    false, true
  );
  group.add(plazaRim);

  // 3. Smooth Continuous Paved Highways from Spawn Portals toward the Citadel (0, 0)
  const portals = realmDef.spawnPortals || [
    { x: 0, z: -32 },
    { x: -28, z: 16 },
    { x: 28, z: 16 },
  ];

  const roadWaypoints = [];
  portals.forEach((p) => {
    const px = p.x || 0;
    const pz = p.z || -30;
    const dist = Math.hypot(px, pz);
    const angleY = Math.atan2(px, pz);

    // Continuous smooth road ribbon from portal to central plaza
    const roadRibbon = makeMesh(
      COMMON_GEOS.box(),
      roadMat,
      px * 0.5, 0.018, pz * 0.5,
      0, angleY, 0,
      3.1, 0.045, dist,
      false, true
    );
    group.add(roadRibbon);

    // Subtle stone curbing strips along the highway edges
    const steps = Math.max(6, Math.floor(dist / 2.6));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const rx = px * (1 - t);
      const rz = pz * (1 - t);
      roadWaypoints.push({ x: rx, z: rz });

      // Smooth inlaid medallion stone along road center
      if (s % 2 === 0) {
        const paver = makeMesh(
          COMMON_GEOS.cyl8(),
          roadBorderMat,
          rx, 0.028, rz,
          0, angleY, 0,
          1.15, 0.04, 1.15,
          false, true
        );
        group.add(paver);
      }
    }
  });

  // Collect keep-out zones (sockets, portals, citadel center, and road tiles)
  const sockets = realmDef.sockets || [];
  function isClearOfGameplay(x, z) {
    if (Math.hypot(x, z) < 8.4) return false; // Keep Citadel plaza clear
    for (let i = 0; i < sockets.length; i++) {
      if (Math.hypot(x - sockets[i].x, z - sockets[i].z) < 4.4) return false;
    }
    for (let i = 0; i < portals.length; i++) {
      if (Math.hypot(x - portals[i].x, z - portals[i].z) < 5.2) return false;
    }
    for (let i = 0; i < roadWaypoints.length; i++) {
      if (Math.hypot(x - roadWaypoints[i].x, z - roadWaypoints[i].z) < 3.1) return false;
    }
    return true;
  }

  // Deterministic pseudo-random helper seeded by realm ID
  const realmIdStr = String(realmDef.id || 'solaria_meadows');
  let seed = 1337;
  for (let i = 0; i < realmIdStr.length; i++) {
    seed = (seed * 31 + realmIdStr.charCodeAt(i)) % 100000;
  }
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 4. Perimeter Cliffs & 82+ Smooth Organic Biome Props
  const isFrost = realmIdStr.includes('frost') || realmIdStr.includes('glacier') || realmIdStr.includes('boreal');
  const isDesert = realmIdStr.includes('sun') || realmIdStr.includes('sand') || realmIdStr.includes('desert');
  const isVolcanic = realmIdStr.includes('cinder') || realmIdStr.includes('magma') || realmIdStr.includes('rift') || realmIdStr.includes('void') || realmIdStr.includes('caldera');

  let placedProps = 0;
  let attempts = 0;
  while (placedProps < 84 && attempts < 380) {
    attempts++;
    const radius = 14 + nextRand() * 29.5;
    const angle = nextRand() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (!isClearOfGameplay(x, z)) continue;
    placedProps++;

    const propScale = 0.82 + nextRand() * 0.65;
    const propRoll = nextRand();

    if (propRoll < 0.18) {
      // Smooth River Boulder & Crystal Cluster
      group.add(makeMesh(COMMON_GEOS.dodeca(), cliffMat, x, 0.42 * propScale, z, 0, angle, 0, 1.15 * propScale, 0.78 * propScale, 1.05 * propScale));
      group.add(makeMesh(COMMON_GEOS.dodeca(), cliffMat, x - 0.45 * propScale, 0.28 * propScale, z + 0.35 * propScale, 0, -angle, 0, 0.68 * propScale, 0.52 * propScale, 0.65 * propScale));
      if (propRoll < 0.09) {
        group.add(makeMesh(COMMON_GEOS.octa(), crystalMat, x + 0.25 * propScale, 0.88 * propScale, z, 0.18, angle, 0, 0.32 * propScale, 0.92 * propScale, 0.32 * propScale));
      }
    } else if (isDesert) {
      // Smooth Rounded Saguaro Cactus / Oasis Palm
      group.add(makeMesh(COMMON_GEOS.cyl6(), foliageMat, x, 0.85 * propScale, z, 0, 0, 0, 0.24 * propScale, 1.7 * propScale, 0.24 * propScale));
      group.add(makeMesh(COMMON_GEOS.sphereLow(), foliageMat, x, 1.7 * propScale, z, 0, 0, 0, 0.24 * propScale, 0.24 * propScale, 0.24 * propScale));
      group.add(makeMesh(COMMON_GEOS.box(), foliageMat, x + 0.32 * propScale, 1.05 * propScale, z, 0, 0, 0.25, 0.42 * propScale, 0.2 * propScale, 0.2 * propScale));
    } else if (isVolcanic) {
      // Sculpted Obsidian Monolith & Glowing Magma Vent
      group.add(makeMesh(COMMON_GEOS.cone6(), cliffMat, x, 1.15 * propScale, z, 0, angle, 0, 0.58 * propScale, 2.3 * propScale, 0.58 * propScale));
      if (propRoll > 0.65) {
        group.add(makeMesh(COMMON_GEOS.octa(), crystalMat, x + 0.35 * propScale, 0.65 * propScale, z, 0, 0, -0.2, 0.28 * propScale, 0.75 * propScale, 0.28 * propScale));
      }
    } else if (propRoll < 0.56 && !isFrost) {
      // Lush Multi-Sphere Broadleaf Canopy Tree (Thronefall / Toy Diorama style)
      const leafMat = propRoll < 0.36 ? foliageMat : foliageAltMat;
      group.add(makeMesh(COMMON_GEOS.cyl6(), trunkMat, x, 0.55 * propScale, z, 0, 0, 0, 0.20 * propScale, 1.1 * propScale, 0.20 * propScale));
      group.add(makeMesh(COMMON_GEOS.sphereLow(), leafMat, x, 1.42 * propScale, z, 0, 0, 0, 0.86 * propScale, 0.78 * propScale, 0.86 * propScale));
      group.add(makeMesh(COMMON_GEOS.sphereLow(), leafMat, x + 0.42 * propScale, 1.22 * propScale, z + 0.25 * propScale, 0, 0, 0, 0.58 * propScale, 0.54 * propScale, 0.58 * propScale));
      group.add(makeMesh(COMMON_GEOS.sphereLow(), leafMat, x - 0.38 * propScale, 1.26 * propScale, z - 0.28 * propScale, 0, 0, 0, 0.62 * propScale, 0.56 * propScale, 0.62 * propScale));
      group.add(makeMesh(COMMON_GEOS.sphereLow(), foliageAltMat, x, 1.88 * propScale, z, 0, 0, 0, 0.55 * propScale, 0.50 * propScale, 0.55 * propScale));
    } else {
      // Smooth Conical Alpine Pine Tree
      group.add(makeMesh(COMMON_GEOS.cyl6(), trunkMat, x, 0.45 * propScale, z, 0, 0, 0, 0.18 * propScale, 0.9 * propScale, 0.18 * propScale));
      group.add(makeMesh(COMMON_GEOS.cone6(), foliageMat, x, 1.22 * propScale, z, 0, angle, 0, 0.88 * propScale, 1.25 * propScale, 0.88 * propScale));
      group.add(makeMesh(COMMON_GEOS.cone6(), foliageAltMat, x, 1.82 * propScale, z, 0, -angle, 0, 0.68 * propScale, 1.08 * propScale, 0.68 * propScale));
      if (isFrost) {
        const snowCapMat = getStdMat(0xf8fafc, 0.5, 0.08);
        group.add(makeMesh(COMMON_GEOS.cone6(), snowCapMat, x, 2.18 * propScale, z, 0, 0, 0, 0.46 * propScale, 0.58 * propScale, 0.46 * propScale));
      }
    }
  }

  return group;
}

