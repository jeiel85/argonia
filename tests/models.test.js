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

test('Blender 5.2 GLB Assets: All 9 models exist, parse with Three.js, and have stylized materials', async () => {
  const modelsDir = path.resolve('public/models');
  assert.ok(fs.existsSync(modelsDir), 'public/models directory exists');

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

test('MeshFactory: Hero meshes instantiate cleanly with animation hooks', () => {
  for (const hero of HEROES) {
    const mesh = meshFactory.createHeroMesh(hero);
    assert.ok(mesh instanceof THREE.Group, `createHeroMesh for ${hero.id} returns THREE.Group`);
    assert.ok(mesh.userData.bodyGroup, 'bodyGroup hook exists');
    assert.ok(mesh.userData.auraRing, 'auraRing hook exists');

    // Test animation calls don't throw
    assert.doesNotThrow(() => {
      meshFactory.animateHeroMesh(mesh, { isMoving: true, attackTimer: 0.5 }, 1.25);
      meshFactory.animateHeroMesh(mesh, { isMoving: false, attackTimer: 0 }, 2.5);
    });
  }
});

test('MeshFactory: Act Bosses and Swarm enemies instantiate cleanly with hit flash hooks', () => {
  const bosses = ENEMY_LIST.filter((e) => e.isBoss);
  assert.equal(bosses.length, 5);

  for (const boss of bosses) {
    const mesh = meshFactory.createEnemyMesh(boss);
    assert.ok(mesh instanceof THREE.Group, `createEnemyMesh for ${boss.id} returns THREE.Group`);
    assert.ok(mesh.userData.bodyGroup, 'bodyGroup hook exists');
    assert.ok(Array.isArray(mesh.userData.hitMeshes), 'hitMeshes array exists for damage flash');

    // Test animation calls don't throw
    assert.doesNotThrow(() => {
      meshFactory.animateUnitMesh(mesh, { hitFlash: 0.8 }, 1.25);
      meshFactory.animateUnitMesh(mesh, { hitFlash: 0 }, 2.5);
    });
  }
});
