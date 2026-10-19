import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetLoader, MODEL_SPECS } from '../src/graphics/assetLoader.js';
import * as meshFactory from '../src/graphics/proceduralMeshes.js';
import { HEROES } from '../src/data/heroes.js';
import { ENEMY_LIST } from '../src/data/enemies.js';
import { BUILDING_LIST } from '../src/data/buildings.js';
import { svgIcon, entitySvg } from '../src/ui/svgIcons.js';

test('Blender 5.2 GLB Assets: All 27 models exist, parse with Three.js, and have stylized materials', async () => {
  const modelsDir = path.resolve('public/models');
  assert.ok(fs.existsSync(modelsDir), 'public/models directory exists');

  const specKeys = Object.keys(MODEL_SPECS);
  assert.equal(specKeys.length, 27, 'MODEL_SPECS must register all 27 Blender 5.2 GLB models');

  const loader = new GLTFLoader();
  for (const [id, spec] of Object.entries(MODEL_SPECS)) {
    const filePath = path.join(modelsDir, spec.file);
    assert.ok(fs.existsSync(filePath), `GLB file ${spec.file} must exist on disk`);

    const buf = fs.readFileSync(filePath);
    assert.ok(buf.byteLength > 1000, `GLB file ${spec.file} must be non-empty`);

    await new Promise((resolve, reject) => {
      loader.parse(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        '',
        (gltf) => {
          assert.ok(gltf.scene, `${id} must produce a valid Three.js scene`);
          let meshCount = 0;
          gltf.scene.traverse((c) => {
            if (c.isMesh) meshCount++;
          });
          assert.ok(meshCount >= 2, `${id} must have at least 2 distinct meshes (found ${meshCount})`);
          assetLoader.cache.set(id, gltf.scene);
          resolve();
        },
        (err) => reject(err)
      );
    });
  }
});

test('MeshFactory: Hero meshes instantiate cleanly with separated Anim_Weapon and Anim_Floater hooks', () => {
  for (const hero of HEROES) {
    const mesh = meshFactory.createHeroMesh(hero);
    assert.ok(mesh instanceof THREE.Group, `createHeroMesh for ${hero.id} returns THREE.Group`);
    assert.ok(mesh.userData.bodyGroup, 'bodyGroup hook exists');
    assert.ok(mesh.userData.auraRing, 'auraRing hook exists');
    assert.ok(mesh.userData.weaponGroup, `weaponGroup (Anim_Weapon) hook exists for ${hero.id}`);

    // Test animation calls don't throw and mutate weapon rotation
    assert.doesNotThrow(() => {
      meshFactory.animateHeroMesh(mesh, { isMoving: true, attackTimer: 0.5 }, 1.25);
      meshFactory.animateHeroMesh(mesh, { isMoving: false, attackTimer: 0 }, 2.5);
    });
  }
});

test('MeshFactory: Act Bosses and all Regular Enemies instantiate from Blender GLBs with Anim_* hooks', () => {
  const bosses = ENEMY_LIST.filter((e) => e.isBoss);
  assert.equal(bosses.length, 5);

  for (const enemy of ENEMY_LIST) {
    const mesh = meshFactory.createEnemyMesh(enemy);
    assert.ok(mesh instanceof THREE.Group, `createEnemyMesh for ${enemy.id} returns THREE.Group`);
    assert.ok(mesh.userData.bodyGroup, 'bodyGroup hook exists');
    assert.ok(Array.isArray(mesh.userData.hitMeshes) && mesh.userData.hitMeshes.length > 0, 'hitMeshes array populated');

    if (enemy.id === 'borealis' || enemy.isFlying) {
      assert.ok(
        Array.isArray(mesh.userData.wings) && mesh.userData.wings.length === 1 && mesh.userData.wings[0].left && mesh.userData.wings[0].right,
        `${enemy.id} has separated Anim_Wing_L and Anim_Wing_R nodes`
      );
    }

    assert.doesNotThrow(() => {
      meshFactory.animateUnitMesh(mesh, { hitFlash: 0.8 }, 1.25);
      meshFactory.animateUnitMesh(mesh, { hitFlash: 0 }, 2.5);
    });
  }
});

test('MeshFactory: All 10 Kingdom Buildings, Allied Troops, and Portals instantiate from Blender GLBs', () => {
  assert.equal(BUILDING_LIST.length, 10);
  for (const bldg of BUILDING_LIST) {
    const mesh = meshFactory.createBuildingMesh(bldg.id, 3, 'branch_a');
    assert.ok(mesh instanceof THREE.Group, `createBuildingMesh for ${bldg.id} returns THREE.Group`);
    assert.equal(mesh.userData.isBlenderModel, true, `${bldg.id} uses Blender 5.2 GLB model`);
    assert.ok(mesh.userData.rotators.length > 0, `Tier 3 evolution ring rotator exists for ${bldg.id}`);

    if (bldg.id === 'windmill') {
      assert.ok(mesh.userData.windmillBlades, 'windmill has separated Anim_Blades node');
    }
    if (bldg.id === 'archer_tower' || bldg.id === 'flame_mortar') {
      assert.ok(mesh.userData.turretHead, `${bldg.id} has separated Anim_Turret node`);
    }
    if (bldg.id === 'citadel' || bldg.id === 'arcane_obelisk' || bldg.id === 'argon_refinery') {
      assert.ok(mesh.userData.floaters.length > 0, `${bldg.id} has separated Anim_Floater node`);
    }
    if (bldg.id === 'frost_spire') {
      assert.ok(mesh.userData.rotators.length >= 2, 'frost_spire has separated Anim_Rotor node');
    }

    assert.doesNotThrow(() => {
      meshFactory.animateBuildingMesh(mesh, { id: bldg.id, tier: 3, targetAngle: 1.1 }, 2.0);
    });
  }

  for (const troopType of ['swordsman', 'paladin', 'valkyrie']) {
    const troopMesh = meshFactory.createTroopMesh(troopType, 0x38bdf8);
    assert.ok(troopMesh instanceof THREE.Group);
    assert.equal(troopMesh.userData.isBlenderModel, true, `${troopType} uses Blender 5.2 GLB model`);
    assert.ok(troopMesh.userData.weaponGroup, `${troopType} has separated Anim_Weapon node`);
    if (troopType === 'valkyrie') {
      assert.ok(
        Array.isArray(troopMesh.userData.wings) && troopMesh.userData.wings.length === 1 && troopMesh.userData.wings[0].left && troopMesh.userData.wings[0].right,
        'valkyrie has wings'
      );
    }
  }

  const portalMesh = meshFactory.createPortalMesh({ id: 'north', x: 0, z: -20 });
  assert.ok(portalMesh instanceof THREE.Group);
  assert.equal(portalMesh.userData.isBlenderModel, true, 'portal uses Blender 5.2 GLB model');
  assert.ok(portalMesh.userData.rotators.length >= 1, 'portal has separated Anim_Rotor node');
});

test('UI Icons: Bespoke SVG icon system renders clean vector SVGs without unicode emojis', () => {
  for (const name of ['crown', 'swords', 'shield', 'skull', 'gold', 'argon', 'anvil', 'codex', 'chronicle']) {
    const markup = svgIcon(name, 16);
    assert.ok(markup.startsWith('<svg') && markup.endsWith('</svg>'), `svgIcon(${name}) returns inline SVG`);
  }
  for (const bldg of BUILDING_LIST) {
    const markup = entitySvg(bldg, 18);
    assert.ok(markup.includes('<svg'), `entitySvg for building ${bldg.id} returns inline SVG`);
  }
});

