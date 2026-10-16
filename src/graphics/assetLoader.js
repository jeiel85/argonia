/**
 * ARGONIA: Crown of the Spire
 * 3D Asset Loader & Blender GLB Model Cache Manager
 *
 * Preloads and manages high-fidelity stylized 3D assets generated in Blender 5.2 LTS
 * for the 4 Sovereign Champions and 5 Colossal Act Bosses.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const MODEL_SPECS = {
  hero_arthuria: {
    file: 'hero_arthuria.glb',
    scale: 0.62,
    yOffset: 0,
    rotY: Math.PI,
    auraColor: 0xfbbf24,
  },
  hero_kaelen: {
    file: 'hero_kaelen.glb',
    scale: 0.65,
    yOffset: 0.08,
    rotY: Math.PI,
    auraColor: 0x38bdf8,
  },
  hero_sylvanis: {
    file: 'hero_sylvanis.glb',
    scale: 0.65,
    yOffset: 0,
    rotY: Math.PI,
    auraColor: 0x34d399,
  },
  hero_vespera: {
    file: 'hero_vespera.glb',
    scale: 0.60,
    yOffset: 0.46,
    rotY: Math.PI,
    auraColor: 0xc084fc,
  },
  boss_kragasha: {
    file: 'boss_kragasha.glb',
    scale: 0.95,
    yOffset: 0,
    rotY: Math.PI,
    menaceColor: 0xdc2626,
  },
  boss_borealis: {
    file: 'boss_borealis.glb',
    scale: 0.82,
    yOffset: 1.6,
    rotY: Math.PI,
    isFlying: true,
    menaceColor: 0x38bdf8,
  },
  boss_akhen_ra: {
    file: 'boss_akhen_ra.glb',
    scale: 0.95,
    yOffset: 0,
    rotY: Math.PI,
    menaceColor: 0xf59e0b,
  },
  boss_ignis_valkor: {
    file: 'boss_ignis_valkor.glb',
    scale: 0.85,
    yOffset: 0.2,
    rotY: Math.PI,
    menaceColor: 0xef4444,
  },
  boss_malakor: {
    file: 'boss_malakor.glb',
    scale: 0.90,
    yOffset: 0.2,
    rotY: Math.PI,
    menaceColor: 0xec4899,
  },
};

class AssetLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map(); // id -> THREE.Group template
    this.loading = new Map(); // id -> Promise
    this.listeners = new Map(); // id -> Set<function>
  }

  /**
   * Resolves the correct asset URL across both local dev server and GitHub Pages subpath
   */
  resolveModelUrl(file) {
    const base = import.meta.env?.BASE_URL || './';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    return `${cleanBase}models/${file}`;
  }

  /**
   * Preloads all 9 Blender GLB models into memory asynchronously
   */
  preloadAll() {
    const promises = [];
    for (const [id, spec] of Object.entries(MODEL_SPECS)) {
      promises.push(this.loadModel(id, spec.file));
    }
    return Promise.allSettled(promises);
  }

  /**
   * Loads a single model by key
   */
  loadModel(id, file) {
    if (this.cache.has(id)) {
      return Promise.resolve(this.cache.get(id));
    }
    if (this.loading.has(id)) {
      return this.loading.get(id);
    }

    // In non-browser environments (headless Node tests / CLI), don't trigger fetch
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }

    const url = this.resolveModelUrl(file || `${id}.glb`);
    const promise = new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          const scene = gltf.scene;
          scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                // Enhance metallic and emissive properties of stylized Blender models
                if (child.material.emissive && (child.material.emissive.r > 0 || child.material.emissive.g > 0 || child.material.emissive.b > 0)) {
                  child.material.emissiveIntensity = 0.85;
                }
              }
            }
          });

          this.cache.set(id, scene);
          this.loading.delete(id);

          // Notify any queued listeners
          const cbs = this.listeners.get(id);
          if (cbs) {
            for (const cb of cbs) {
              try { cb(scene); } catch (e) { console.error('Asset callback error:', e); }
            }
            this.listeners.delete(id);
          }

          resolve(scene);
        },
        undefined,
        (err) => {
          console.warn(`[Argonia AssetLoader] Could not load model ${url}, procedural fallback active.`, err);
          this.loading.delete(id);
          resolve(null);
        }
      );
    });

    this.loading.set(id, promise);
    return promise;
  }

  /**
   * Checks whether a Blender model is ready
   */
  isReady(id) {
    return this.cache.has(id);
  }

  /**
   * Subscribes to model ready event
   */
  onReady(id, callback) {
    if (this.cache.has(id)) {
      callback(this.cache.get(id));
      return;
    }
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id).add(callback);
    // Trigger load if not yet started
    const spec = MODEL_SPECS[id];
    if (spec) {
      this.loadModel(id, spec.file);
    }
  }

  /**
   * Instantiates a cloned hierarchy of the Blender model with unique cloned materials
   * for independent hit-flash / lighting effects.
   */
  instantiate(id) {
    const template = this.cache.get(id);
    if (!template) return null;

    const spec = MODEL_SPECS[id] || { scale: 1.0, yOffset: 0, rotY: 0 };
    const clone = template.clone(true);
    const hitMeshes = [];
    const wings = [];

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();
          hitMeshes.push(child.material);
        }
      }
    });

    const wrapper = new THREE.Group();
    wrapper.name = `BlenderInstance_${id}`;
    clone.scale.setScalar(spec.scale || 1.0);
    clone.position.y = spec.yOffset || 0;
    clone.rotation.y = spec.rotY || 0;
    wrapper.add(clone);

    return {
      wrapper,
      innerScene: clone,
      hitMeshes,
      wings,
      spec,
    };
  }
}

export const assetLoader = new AssetLoader();
