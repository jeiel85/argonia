/**
 * ARGONIA: Crown of the Spire
 * 3D Asset Loader & Blender 5.2 GLB Model Cache Manager
 *
 * Preloads, caches, and instantiates all 27 hierarchical Blender 5.2 GLB models:
 * - 4 Sovereign Champions
 * - 5 Colossal Act Bosses
 * - 10 Kingdom Buildings
 * - 4 Enemy Archetypes (dynamically tinted across all 18 regular enemy species)
 * - 3 Allied Garrison Troop Types
 * - 1 Abyssal Rift Spawn Portal
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const MODEL_SPECS = {
  // 1. 4 Monarch Heroes
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

  // 2. 5 Colossal Act Bosses
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

  // 3. 10 Kingdom Buildings
  bldg_citadel: {
    file: 'bldg_citadel.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: 0,
  },
  bldg_gold_mine: {
    file: 'bldg_gold_mine.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: Math.PI,
  },
  bldg_windmill: {
    file: 'bldg_windmill.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: 0,
  },
  bldg_argon_refinery: {
    file: 'bldg_argon_refinery.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: 0,
  },
  bldg_archer_tower: {
    file: 'bldg_archer_tower.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: Math.PI,
  },
  bldg_arcane_obelisk: {
    file: 'bldg_arcane_obelisk.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: 0,
  },
  bldg_flame_mortar: {
    file: 'bldg_flame_mortar.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: Math.PI,
  },
  bldg_frost_spire: {
    file: 'bldg_frost_spire.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: 0,
  },
  bldg_barracks: {
    file: 'bldg_barracks.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: Math.PI,
  },
  bldg_stone_wall: {
    file: 'bldg_stone_wall.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: 0,
  },

  // 4. 4 Enemy Archetype Models
  enemy_infantry: {
    file: 'enemy_infantry.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: Math.PI,
  },
  enemy_beast: {
    file: 'enemy_beast.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: Math.PI,
  },
  enemy_golem: {
    file: 'enemy_golem.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: Math.PI,
  },
  enemy_flier: {
    file: 'enemy_flier.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: Math.PI,
    isFlying: true,
  },

  // 5. 3 Allied Garrison Troop Models
  troop_swordsman: {
    file: 'troop_swordsman.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: Math.PI,
  },
  troop_paladin: {
    file: 'troop_paladin.glb',
    scale: 1.06,
    yOffset: 0,
    rotY: Math.PI,
  },
  troop_valkyrie: {
    file: 'troop_valkyrie.glb',
    scale: 1.08,
    yOffset: 0,
    rotY: Math.PI,
  },

  // 6. 1 Abyssal Rift Spawn Portal
  prop_portal: {
    file: 'prop_portal.glb',
    scale: 1.0,
    yOffset: 0,
    rotY: 0,
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
   * Preloads all 27 Blender GLB models into memory asynchronously
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
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              for (const mat of mats) {
                if (mat && mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0)) {
                  mat.emissiveIntensity = 0.85;
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
              try {
                cb(scene);
              } catch (e) {
                console.error('Asset callback error:', e);
              }
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
    const spec = MODEL_SPECS[id];
    if (spec) {
      this.loadModel(id, spec.file);
    }
  }

  /**
   * Instantiates a cloned hierarchy of the Blender model with unique cloned materials
   * and automatically binds separated 'Anim_*' hierarchy nodes for animations.
   */
  instantiate(id, options = {}) {
    const template = this.cache.get(id);
    if (!template) return null;

    const spec = MODEL_SPECS[id] || { scale: 1.0, yOffset: 0, rotY: 0 };
    const clone = template.clone(true);
    const hitMeshes = [];
    const wings = [];
    const rotators = [];
    const floaters = [];
    let weaponGroup = null;
    let windmillBlades = null;
    let turretHead = null;
    let leftWing = null;
    let rightWing = null;

    clone.traverse((child) => {
      const name = child.name || '';
      if (name.startsWith('Anim_Weapon')) {
        weaponGroup = child;
      } else if (name.startsWith('Anim_Wing_L')) {
        leftWing = child;
      } else if (name.startsWith('Anim_Wing_R')) {
        rightWing = child;
      } else if (name.startsWith('Anim_Rotor')) {
        rotators.push({ mesh: child, speedY: 1.8, speedZ: 1.4 });
      } else if (name.startsWith('Anim_Floater')) {
        floaters.push({ mesh: child, baseY: child.position.y, amp: 0.15, speed: 2.5 });
      } else if (name.startsWith('Anim_Blades')) {
        windmillBlades = child;
      } else if (name.startsWith('Anim_Turret')) {
        turretHead = child;
      }

      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const cloneMat = (mat) => {
          if (!mat) return mat;
          const m = mat.clone();
          const mName = m.name || '';
          if (options.primaryColor !== undefined && mName.startsWith('PrimaryMat')) {
            m.color.setHex(options.primaryColor);
          } else if (options.accentColor !== undefined && mName.startsWith('AccentMat')) {
            m.color.setHex(options.accentColor);
            if (m.emissive) {
              m.emissive.setHex(options.accentColor);
            }
          }
          hitMeshes.push(m);
          return m;
        };

        if (Array.isArray(child.material)) {
          child.material = child.material.map(cloneMat);
        } else if (child.material) {
          child.material = cloneMat(child.material);
        }
      }
    });

    if (leftWing && rightWing) {
      wings.push({ left: leftWing, right: rightWing });
    }

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
      weaponGroup,
      rotators,
      floaters,
      windmillBlades,
      turretHead,
      spec,
    };
  }
}

export const assetLoader = new AssetLoader();
