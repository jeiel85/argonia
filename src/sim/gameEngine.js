/**
 * ARGONIA: Crown of the Spire
 * Core Real-Time 3D Tactical Action-Strategy & Relic Synergy Simulation Engine
 */

import * as THREE from 'three';
import { getHeroById } from '../data/heroes.js';
import { BUILDINGS, getBuildingSpec, getBuildingTierSpec } from '../data/buildings.js';
import { getEnemySpec } from '../data/enemies.js';
import { REALMS, generateWaveDescriptor } from '../data/realms.js';
import { RELICS, computeRelicModifiers } from '../data/relics.js';
import { computeSkullModifiers } from '../data/sanctum.js';

export class GameEngine {
  constructor({
    sceneManager = null,
    vfxManager = null,
    meshFactory = null,
    soundEngine = null,
    saveSystem = null,
    onStateChange = null,
    onRelicDraftReady = null,
    onRunFinished = null,
    onNotification = null,
  } = {}) {
    this.sceneManager = sceneManager;
    this.vfxManager = vfxManager;
    this.meshFactory = meshFactory;
    this.soundEngine = soundEngine;
    this.saveSystem = saveSystem;
    this.onStateChange = onStateChange;
    this.onRelicDraftReady = onRelicDraftReady;
    this.onRunFinished = onRunFinished;
    this.onNotification = onNotification;

    this.worldGroup = new THREE.Group();
    this.worldGroup.name = 'GameWorldRoot';
    if (this.sceneManager?.scene) {
      this.sceneManager.scene.add(this.worldGroup);
    }

    this.resetInternalState();
  }

  resetInternalState() {
    this.isRunning = false;
    this.isPaused = false;
    this.gameSpeed = 1.0; // 1x, 1.5x, 2x speed toggle support
    this.elapsedTime = 0;
    this.phase = 'day'; // 'day' | 'night' | 'relic_draft' | 'gameover' | 'victory'
    this.realmIndex = 0;
    this.realm = REALMS[0];
    this.isEndless = false;
    this.wave = 1;
    this.seed = `ARG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    this.gold = 135;
    this.argon = 4;
    this.score = 0;
    this.enemiesSlain = 0;
    this.bossesDefeated = 0;
    this.goldMinedTotal = 0;
    this.argonMinedTotal = 0;
    this.buildingsConstructed = 0;
    this.evolutionsCount = 0;
    this.killCombo = 0;
    this.killComboTimer = 0;
    this.killCounterForBurst = 0;

    this.activeSkulls = [];
    this.skullMods = computeSkullModifiers([]);
    this.sanctumStats = {};
    this.ownedRelicIds = [];
    this.relicState = computeRelicModifiers([], 0);
    this.pendingRelicChoices = [];
    this.relicRerollsLeft = 1;

    this.sockets = [];
    this.buildings = new Map(); // socketId -> building instance
    this.portals = [];
    this.enemies = [];
    this.troops = [];
    this.projectiles = [];
    this.tempSummons = []; // Kaelen's temporary auto-turrets or banners
    this.activeZones = []; // Banner heal zones, bramble snares, stasis domes

    this.selectedSocketId = null;
    this.hoveredSocketId = null;
    this.rallyPoint = null;

    this.hero = null;
    this.currentWaveDesc = null;
    this.spawnQueues = [];
    this.nightElapsed = 0;
    this.hazardTimer = 0;
    this.passiveGoldAccumulator = 0;
  }

  clear3DWorld() {
    if (!this.worldGroup) return;
    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
    }
    this.vfxManager?.clearAll();
  }

  notify(message, tone = 'info') {
    if (this.onNotification) {
      this.onNotification(message, tone);
    }
  }

  emitState() {
    if (this.onStateChange) {
      this.onStateChange(this.getHudSnapshot());
    }
  }

  startRun({
    realmIndex = 0,
    heroId = 'arthuria',
    isEndless = false,
    activeSkulls = [],
    sanctumStats = null,
    seed = null,
  } = {}) {
    this.clear3DWorld();
    this.resetInternalState();

    this.realmIndex = Math.max(0, Math.min(REALMS.length - 1, realmIndex));
    this.realm = REALMS[this.realmIndex];
    this.isEndless = Boolean(isEndless);
    this.activeSkulls = [...activeSkulls];
    this.skullMods = computeSkullModifiers(this.activeSkulls);
    this.sanctumStats = sanctumStats || (this.saveSystem ? this.saveSystem.getSanctumStats() : {});
    this.seed = seed || `ARG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    this.gold = Math.round(this.realm.startGold + (this.sanctumStats.startGoldBonus || 0));
    this.argon = Math.round(this.realm.startArgon + (this.sanctumStats.startArgonBonus || 0));
    this.relicRerollsLeft = 1 + Math.round(this.sanctumStats.relicRerollCount || 0);

    this.recalculateModifiers();

    // 1. Build 3D Environment Diorama
    if (this.sceneManager) {
      this.sceneManager.setRealmPalette(this.realm.palette);
      this.sceneManager.setNightMode(false);
    }
    if (this.meshFactory) {
      const envGroup = this.meshFactory.createEnvironmentDiorama(this.realm);
      this.worldGroup.add(envGroup);
    }

    // 2. Create Spawn Portals
    this.portals = this.realm.spawnPortals.map((pDef, idx) => {
      let mesh = null;
      if (this.meshFactory) {
        mesh = this.meshFactory.createPortalMesh(pDef);
        mesh.position.set(pDef.x, 0, pDef.z);
        mesh.lookAt(0, 0, 0);
        this.worldGroup.add(mesh);
      }
      return { ...pDef, index: idx, mesh };
    });

    // 3. Create Strategic Sockets & Prebuilt Citadel
    this.sockets = this.realm.sockets.map((sDef) => {
      let padMesh = null;
      if (this.meshFactory) {
        padMesh = this.meshFactory.createSocketPadMesh(sDef);
        padMesh.position.set(sDef.x, 0, sDef.z);
        this.worldGroup.add(padMesh);
      }
      return {
        ...sDef,
        padMesh,
        building: null,
      };
    });

    for (const sock of this.sockets) {
      if (sock.prebuiltTier && sock.defaultType) {
        this.constructOnSocketInternal(sock, sock.defaultType, sock.prebuiltTier, null, true);
      }
    }

    // 4. Spawn Monarch Hero
    this.initHero(heroId);

    // 5. Prepare Wave 1 Preview
    this.wave = 1;
    this.phase = 'day';
    this.isRunning = true;
    this.currentWaveDesc = generateWaveDescriptor(this.realmIndex, this.wave, this.isEndless, this.skullMods);
    this.updatePortalThreatIndicators();

    this.soundEngine?.setMusicMode('day', this.realmIndex);
    this.notify(`${this.realm.icon} ${this.realm.name} 원정 개시! 낮 동안 기지를 건설하고 밤을 대비하세요.`, 'gold');

    // Starter Relic if unlocked in Sanctum
    if ((this.sanctumStats.startingRelicChoice || 0) >= 1) {
      this.triggerRelicDraft(false);
    }

    this.emitState();
  }

  initHero(heroId) {
    const def = getHeroById(heroId);
    const maxHp = Math.round(
      def.stats.maxHp *
        (1 + (this.sanctumStats.heroMaxHpMult || 0) + (this.relicState.mods.heroMaxHpMult || 0))
    );
    let mesh = null;
    if (this.meshFactory) {
      mesh = this.meshFactory.createHeroMesh(def);
      mesh.position.set(0, 0, 7.5);
      this.worldGroup.add(mesh);
    }
    this.hero = {
      id: def.id,
      def,
      x: 0,
      z: 7.5,
      targetX: null,
      targetZ: null,
      rotationY: 0,
      hp: maxHp,
      maxHp,
      isDead: false,
      reviveTimer: 0,
      attackCooldown: 0,
      attackAnimTimer: 0,
      dashCooldown: 0,
      dashMaxCooldown: def.skills.dash.cooldown,
      skillCooldowns: { q: 0, e: 0, r: 0 },
      skillMaxCooldowns: {
        q: def.skills.q.cooldown,
        e: def.skills.e.cooldown,
        r: def.skills.r.cooldown,
      },
      hasteBuffTimer: 0,
      mesh,
    };
  }

  recalculateModifiers() {
    const synAmp = this.sanctumStats.synergyAmplifier || 0;
    this.relicState = computeRelicModifiers(this.ownedRelicIds, synAmp);
    if (this.hero) {
      const citadelBonus = this.getCitadelHeroBoost();
      const newMax = Math.round(
        this.hero.def.stats.maxHp *
          (1 +
            citadelBonus +
            (this.sanctumStats.heroMaxHpMult || 0) +
            (this.relicState.mods.heroMaxHpMult || 0))
      );
      const ratio = this.hero.maxHp > 0 ? this.hero.hp / this.hero.maxHp : 1;
      this.hero.maxHp = newMax;
      this.hero.hp = Math.min(newMax, Math.max(1, Math.round(newMax * ratio)));
    }
  }

  getCitadelBuilding() {
    return this.buildings.get('citadel_core') || null;
  }

  getCitadelHeroBoost() {
    const cit = this.getCitadelBuilding();
    return cit?.spec?.heroStatBoost || 0;
  }

  getCostDiscountFactor() {
    let disc = (this.sanctumStats.buildCostDiscount || 0) + (this.relicState.mods.buildDiscount || 0);
    if (this.realm.id === 'solaria_meadows') disc += 0.05;
    return Math.max(0.45, 1 - disc);
  }

  getActionCost(typeId, targetTier = 1, evolutionId = null) {
    const spec = getBuildingTierSpec(typeId, targetTier, evolutionId);
    if (!spec) return { gold: 9999, argon: 9999 };
    const factor = this.getCostDiscountFactor();
    return {
      gold: Math.max(0, Math.round((spec.costGold || 0) * factor)),
      argon: Math.max(0, Math.round((spec.costArgon || 0) * factor)),
    };
  }

  constructOnSocketInternal(socket, typeId, tier = 1, evolutionId = null, isFree = false) {
    const spec = getBuildingTierSpec(typeId, tier, evolutionId);
    const baseDef = getBuildingSpec(typeId);
    if (!spec || !baseDef) return { ok: false, reason: '잘못된 건물 데이터입니다.' };

    if (!isFree) {
      const cost = this.getActionCost(typeId, tier, evolutionId);
      if (this.gold < cost.gold) {
        return { ok: false, reason: `금화가 부족합니다 (${cost.gold}G 필요)` };
      }
      if (this.argon < cost.argon) {
        return { ok: false, reason: `아르곤 결정이 부족합니다 (${cost.argon}💎 필요)` };
      }
      this.gold -= cost.gold;
      this.argon -= cost.argon;
    }

    // Remove previous building mesh if upgrading
    if (socket.building?.mesh) {
      this.worldGroup.remove(socket.building.mesh);
    }

    const hpMult =
      1 +
      (this.sanctumStats.wallMaxHpMult || 0) +
      (this.relicState.mods.buildingHpMult || 0) +
      (typeId === 'citadel' ? this.sanctumStats.citadelMaxHpMult || 0 : 0);

    const maxHp = Math.round(spec.maxHp * hpMult);

    let mesh = null;
    if (this.meshFactory) {
      mesh = this.meshFactory.createBuildingMesh(typeId, tier, evolutionId);
      mesh.position.set(socket.x, 0, socket.z);
      if (socket.rotationY) {
        mesh.rotation.y = socket.rotationY;
      }
      this.worldGroup.add(mesh);
    }

    if (socket.padMesh) {
      socket.padMesh.visible = false;
    }

    const bInstance = {
      socketId: socket.id,
      x: socket.x,
      z: socket.z,
      typeId,
      baseDef,
      tier,
      evolutionId,
      spec,
      hp: maxHp,
      maxHp,
      isDestroyed: false,
      attackCooldown: 0,
      overchargeTimer: 0,
      freezeTimer: 0,
      spawnTimer: 0,
      popScale: 0.25, // Spring pop-in animation
      mesh,
    };

    socket.building = bInstance;
    this.buildings.set(socket.id, bInstance);

    if (!isFree) {
      this.buildingsConstructed += 1;
      if (evolutionId) {
        this.evolutionsCount += 1;
        this.soundEngine?.playSfx('build_evol');
        this.vfxManager?.spawnShockwave(socket.x, socket.z, 5.5, 0xa855f7, 0.65);
        this.vfxManager?.spawnBurst(socket.x, 2.0, socket.z, 0xfbbf24, 20, 9.0, 1.2);
        this.vfxManager?.spawnFloatingText(socket.x, 3.5, socket.z, `★ ${spec.name}!`, '#fde047', true);
      } else if (tier > 1) {
        this.soundEngine?.playSfx('build_upgrade');
        this.vfxManager?.spawnShockwave(socket.x, socket.z, 3.8, 0x38bdf8, 0.45);
        this.vfxManager?.spawnBurst(socket.x, 1.5, socket.z, 0x38bdf8, 12, 6.5, 1.0);
        this.vfxManager?.spawnFloatingText(socket.x, 3.0, socket.z, `▲ Lv.${tier} 강화`, '#38bdf8', false);
      } else {
        this.soundEngine?.playSfx('build_construct');
        this.vfxManager?.spawnShockwave(socket.x, socket.z, 3.2, 0xf59e0b, 0.4);
        this.vfxManager?.spawnBurst(socket.x, 1.2, socket.z, 0xf59e0b, 10, 5.5, 0.9);
        this.vfxManager?.spawnFloatingText(socket.x, 2.8, socket.z, `🛠️ ${baseDef.name}`, '#fbbf24', false);
      }
    }

    // Spawn garrison troops if this is a barracks or militia granary
    if (typeId === 'barracks' || spec.spawnsMilitia) {
      this.syncBarracksTroops(bInstance);
    }

    this.recalculateModifiers();
    this.emitState();
    return { ok: true, building: bInstance };
  }

  buildOrUpgradeSocket(socketId, chosenTypeId = null, chosenEvolutionId = null) {
    if (this.phase !== 'day' && this.phase !== 'night') {
      return { ok: false, reason: '현재 단계에서는 건설할 수 없습니다.' };
    }
    const socket = this.sockets.find((s) => s.id === socketId);
    if (!socket) return { ok: false, reason: '건설 부지를 찾을 수 없습니다.' };

    const existing = socket.building;
    if (!existing) {
      const targetType = chosenTypeId || socket.defaultType || socket.allowed[0];
      if (!socket.allowed.includes(targetType)) {
        return { ok: false, reason: '해당 부지에 건설할 수 없는 건물입니다.' };
      }
      return this.constructOnSocketInternal(socket, targetType, 1, null, false);
    }

    if (existing.isDestroyed) {
      // Repair destroyed building during night for 50% base cost
      existing.isDestroyed = false;
      existing.hp = existing.maxHp;
      if (existing.mesh) existing.mesh.visible = true;
      this.soundEngine?.playSfx('build_construct');
      this.emitState();
      return { ok: true, building: existing };
    }

    if (existing.evolutionId) {
      return { ok: false, reason: '이미 최종 특화 진화를 완료한 건물입니다.' };
    }

    if (existing.tier < 3) {
      return this.constructOnSocketInternal(socket, existing.typeId, existing.tier + 1, null, false);
    }

    // Tier 3 -> Evolution
    const evoList = existing.baseDef.evolutions || [];
    const targetEvo = chosenEvolutionId || evoList[0]?.id;
    if (!targetEvo) return { ok: false, reason: '진화 분기가 없습니다.' };
    return this.constructOnSocketInternal(socket, existing.typeId, 3, targetEvo, false);
  }

  demolishSocketBuilding(socketId) {
    if (this.phase !== 'day') {
      return { ok: false, reason: '건물 철거 및 재설계는 낮(정비 시간)에만 가능합니다.' };
    }
    const socket = this.sockets.find((s) => s.id === socketId);
    if (!socket || !socket.building) return { ok: false, reason: '철거할 건물이 없습니다.' };
    if (socket.building.typeId === 'citadel') {
      return { ok: false, reason: '왕실 본진 성채는 철거할 수 없습니다.' };
    }

    // Refund 70% of Tier 1 cost
    const b = socket.building;
    const refundGold = Math.round((b.spec.costGold || 25) * 0.7);
    this.gold += refundGold;

    if (b.mesh) this.worldGroup.remove(b.mesh);
    // Remove troops belonging to this barracks
    this.troops = this.troops.filter((t) => {
      if (t.parentSocketId === socket.id) {
        if (t.mesh) this.worldGroup.remove(t.mesh);
        return false;
      }
      return true;
    });

    socket.building = null;
    if (socket.padMesh) socket.padMesh.visible = true;
    this.buildings.delete(socket.id);
    this.vfxManager?.spawnFloatingText(socket.x, 2.5, socket.z, `+${refundGold}G 환급`, '#fbbf24', false);
    this.emitState();
    return { ok: true, refundGold };
  }

  /**
   * Smart Auto-Architect (`B` shortcut or HUD button):
   * Automatically builds/upgrades the highest-priority affordable economy or defense structure!
   */
  autoBuildSmart() {
    const builtList = Array.from(this.buildings.values());
    const goldMinesCount = builtList.filter((b) => b.typeId === 'gold_mine').length;
    const defenseCount = builtList.filter((b) => b.baseDef.category === 'defense' || b.typeId === 'barracks').length;

    const candidates = [];
    for (const sock of this.sockets) {
      if (!sock.building) {
        const typeId = sock.defaultType || sock.allowed[0];
        const cost = this.getActionCost(typeId, 1, null);
        if (this.gold >= cost.gold && this.argon >= cost.argon) {
          let priority = 50;
          if (typeId === 'gold_mine') {
            priority = goldMinesCount < 2 ? 105 : defenseCount < 3 ? 72 : 92;
          } else if (typeId === 'archer_tower' || typeId === 'arcane_obelisk') {
            priority = defenseCount < 3 ? 98 : 80;
          } else if (typeId === 'barracks' || typeId === 'flame_mortar' || typeId === 'frost_spire') {
            priority = defenseCount < 4 ? 94 : 76;
          } else if (typeId === 'argon_refinery') {
            priority = defenseCount >= 2 ? 90 : 70;
          } else if (typeId === 'windmill') {
            priority = defenseCount >= 2 ? 84 : 68;
          } else if (typeId === 'stone_wall') {
            priority = 73;
          }
          candidates.push({ sock, action: 'build', typeId, tier: 1, evoId: null, priority });
        }
      } else if (!sock.building.evolutionId) {
        const b = sock.building;
        if (b.tier < 3) {
          const cost = this.engine ? this.getActionCost(b.typeId, b.tier + 1, null) : this.getActionCost(b.typeId, b.tier + 1, null);
          if (this.gold >= cost.gold && this.argon >= cost.argon) {
            const priority = b.typeId === 'citadel' ? 91 : b.baseDef.category === 'economy' ? 85 : 83;
            candidates.push({ sock, action: 'upgrade', typeId: b.typeId, tier: b.tier + 1, evoId: null, priority });
          }
        } else if (b.baseDef.evolutions?.length) {
          const evo = b.baseDef.evolutions[Math.floor(Math.random() * b.baseDef.evolutions.length)];
          const cost = this.getActionCost(b.typeId, 3, evo.id);
          if (this.gold >= cost.gold && this.argon >= cost.argon) {
            candidates.push({ sock, action: 'evolve', typeId: b.typeId, tier: 3, evoId: evo.id, priority: 99 });
          }
        }
      }
    }

    if (candidates.length === 0) {
      this.notify('현재 보유한 자원으로 즉시 건설/강화할 수 있는 부지가 없습니다.', 'warn');
      return { ok: false };
    }
    candidates.sort((a, b) => b.priority - a.priority);
    const pick = candidates[0];
    const res = this.buildOrUpgradeSocket(pick.sock.id, pick.typeId, pick.evoId);
    if (res.ok) {
      this.selectedSocketId = pick.sock.id;
    }
    return res;
  }

  syncBarracksTroops(building) {
    const spec = building.spec;
    const desiredCount = spec.squadSize || spec.spawnsMilitia || 0;
    const unitType = spec.unitType || 'swordsman';
    const existing = this.troops.filter((t) => t.parentSocketId === building.socketId);

    // Upgrade stats of existing troops
    const hpMult =
      1 +
      this.getWindmillTroopHpBuff() +
      (this.sanctumStats.troopPowerMult || 0) +
      (this.relicState.mods.troopHpMult || 0);
    const dmgMult =
      1 +
      (this.sanctumStats.troopPowerMult || 0) +
      (this.relicState.mods.troopDamageMult || 0);

    const maxHp = Math.round((spec.troopHp || 220) * hpMult);
    const damage = Math.round((spec.troopDamage || 24) * dmgMult);

    for (const t of existing) {
      t.maxHp = maxHp;
      t.hp = maxHp;
      t.damage = damage;
      t.unitType = unitType;
      t.canHitFlying = Boolean(spec.canHitFlying);
      t.cleave = Boolean(spec.troopCleave);
      t.selfHeal = spec.troopSelfHeal || 0;
    }

    const toSpawn = desiredCount - existing.length;
    for (let i = 0; i < toSpawn; i++) {
      this.spawnSingleTroop(building, existing.length + i, desiredCount);
    }
  }

  spawnSingleTroop(building, slotIdx = 0, totalSlots = 3) {
    const spec = building.spec;
    const unitType = spec.unitType || 'swordsman';
    const angle = (slotIdx / Math.max(1, totalSlots)) * Math.PI * 2;
    const homeX = building.x + Math.cos(angle) * 2.6;
    const homeZ = building.z + Math.sin(angle) * 2.6;

    const hpMult =
      1 +
      this.getWindmillTroopHpBuff() +
      (this.sanctumStats.troopPowerMult || 0) +
      (this.relicState.mods.troopHpMult || 0);
    const dmgMult =
      1 +
      (this.sanctumStats.troopPowerMult || 0) +
      (this.relicState.mods.troopDamageMult || 0);

    let mesh = null;
    if (this.meshFactory) {
      mesh = this.meshFactory.createTroopMesh(unitType);
      mesh.position.set(homeX, 0, homeZ);
      this.worldGroup.add(mesh);
    }

    this.troops.push({
      id: `troop_${Date.now()}_${Math.random()}`,
      parentSocketId: building.socketId,
      unitType,
      x: homeX,
      z: homeZ,
      homeX,
      homeZ,
      hp: Math.round((spec.troopHp || 220) * hpMult),
      maxHp: Math.round((spec.troopHp || 220) * hpMult),
      damage: Math.round((spec.troopDamage || 24) * dmgMult),
      speed: spec.troopSpeed || 6.5,
      attackCooldown: 0,
      canHitFlying: Boolean(spec.canHitFlying),
      cleave: Boolean(spec.troopCleave),
      selfHeal: spec.troopSelfHeal || 0,
      hitFlash: 0,
      mesh,
    });
  }

  getWindmillTroopHpBuff() {
    let buff = 0;
    for (const b of this.buildings.values()) {
      if (!b.isDestroyed && b.spec.troopHpBuff) {
        buff += b.spec.troopHpBuff;
      }
    }
    return buff;
  }

  commandRally(worldX, worldZ) {
    const clampedX = Math.max(-34, Math.min(34, worldX));
    const clampedZ = Math.max(-34, Math.min(34, worldZ));
    this.rallyPoint = { x: clampedX, z: clampedZ, timer: 18.0 };

    const count = this.troops.length;
    this.troops.forEach((t, idx) => {
      const angle = (idx / Math.max(1, count)) * Math.PI * 2;
      const r = 1.6 + Math.floor(idx / 6) * 1.4;
      t.homeX = clampedX + Math.cos(angle) * r;
      t.homeZ = clampedZ + Math.sin(angle) * r;
    });

    this.soundEngine?.playSfx('troop_rally');
    this.vfxManager?.spawnShockwave(clampedX, clampedZ, 3.8, 0x3b82f6, 0.55);
    this.vfxManager?.spawnFloatingText(clampedX, 2.4, clampedZ, '🚩 전군 집결!', '#60a5fa', true);
    this.notify(`🚩 아군 병력(${count}기) 집결 명령 하달!`, 'info');
  }

  updatePortalThreatIndicators() {
    if (!this.currentWaveDesc) return;
    const activeIds = new Set(this.currentWaveDesc.portalSummaries.map((s) => s.portalId));
    for (const p of this.portals) {
      p.isActiveNextNight = activeIds.has(p.id);
      if (p.mesh) {
        p.mesh.scale.setScalar(p.isActiveNextNight ? 1.15 : 0.78);
      }
    }
  }

  // =========================================================================
  // NIGHT COMBAT PHASE & WAVE SPAWNER
  // =========================================================================
  startNightWave() {
    if (this.phase !== 'day') return false;
    this.phase = 'night';
    this.nightElapsed = 0;
    this.hazardTimer = 0;
    this.selectedSocketId = null;

    if (!this.currentWaveDesc) {
      this.currentWaveDesc = generateWaveDescriptor(this.realmIndex, this.wave, this.isEndless, this.skullMods);
    }

    // Build spawn queues from wave descriptor
    this.spawnQueues = this.currentWaveDesc.groups.map((g) => ({
      ...g,
      remaining: g.count,
      timer: g.delay || 0,
    }));

    if (this.sceneManager) {
      this.sceneManager.setNightMode(true);
      this.sceneManager.addScreenShake(0.45);
    }

    this.soundEngine?.playSfx('horn_night_start');
    this.soundEngine?.setMusicMode(this.currentWaveDesc.isBossWave ? 'boss' : 'night', this.realmIndex);

    // Kaelen passive: overcharge 2 random towers for 10 seconds at night start!
    if (this.hero?.id === 'kaelen') {
      const defTowers = Array.from(this.buildings.values()).filter(
        (b) => b.baseDef.category === 'defense' && !b.isDestroyed
      );
      for (let i = 0; i < Math.min(2, defTowers.length); i++) {
        const pick = defTowers[i];
        pick.overchargeTimer = 10.0;
        this.vfxManager?.spawnFloatingText(pick.x, 3.2, pick.z, '⚡ 아르곤 과충전!', '#38bdf8', false);
      }
    }

    // Cursed relic check: if cursedWallCostHp > 0, sacrifice wall HP at night start
    const wallSacrifice = this.relicState.mods.cursedWallCostHp || 0;
    if (wallSacrifice > 0) {
      for (const b of this.buildings.values()) {
        if (b.typeId === 'stone_wall' && !b.isDestroyed) {
          b.hp = Math.max(1, Math.round(b.hp * (1 - wallSacrifice)));
        }
      }
    }

    this.notify(`${this.currentWaveDesc.title} — 적군이 차원문에서 진격합니다!`, 'danger');
    this.emitState();
    return true;
  }

  spawnEnemyFromGroup(q) {
    const portal = this.portals[q.portalIndex] || this.portals[0];
    const spec = getEnemySpec(q.enemyId);
    if (!portal || !spec) return;

    this.saveSystem?.discoverEnemy(spec.id);

    const jitterX = (Math.random() - 0.5) * 3.6;
    const jitterZ = (Math.random() - 0.5) * 3.6;
    const x = portal.x + jitterX;
    const z = portal.z + jitterZ;

    const maxHp = Math.round(spec.maxHp * (q.hpScale || 1));
    const damage = Math.round(spec.damage * (q.dmgScale || 1));
    const speedMult =
      1 +
      (this.skullMods.enemySpeedBonus || 0) +
      (this.relicState.mods.cursedEnemySpeedMult || 0) +
      (this.realm.hazard?.type === 'magma_surge' ? 0.10 : 0);

    let mesh = null;
    if (this.meshFactory) {
      mesh = this.meshFactory.createEnemyMesh(spec);
      mesh.position.set(x, 0, z);
      this.worldGroup.add(mesh);
    }

    if (spec.isBoss) {
      this.soundEngine?.playSfx('boss_roar');
      this.sceneManager?.addScreenShake(1.1);
      this.vfxManager?.spawnShockwave(x, z, 8.5, 0xf43f5e, 0.9);
      this.vfxManager?.spawnFloatingText(x, 4.5, z, `💀 ${spec.name}`, '#f43f5e', true);
      this.notify(`⚠️ 보스 출현: ${spec.name}!`, 'danger');
    }

    this.enemies.push({
      id: `enemy_${Date.now()}_${Math.random()}`,
      spec,
      x,
      z,
      hp: maxHp,
      maxHp,
      damage,
      speed: spec.speed * speedMult,
      baseSpeed: spec.speed * speedMult,
      attackCooldown: 0,
      specialTimer: spec.abilityCooldown || 5.0,
      slowTimer: 0,
      slowFactor: 0,
      freezeTimer: 0,
      burnTimer: 0,
      burnDps: 0,
      poisonTimer: 0,
      poisonDps: 0,
      vulnStacks: 0,
      hitFlash: 0,
      mesh,
    });
  }

  // =========================================================================
  // HERO SKILLS & CONTROLS
  // =========================================================================
  triggerHeroDash(dirX = 0, dirZ = 0) {
    if (!this.hero || this.hero.isDead || this.hero.dashCooldown > 0) return false;
    const dashSpec = this.hero.def.skills.dash;
    let dx = dirX;
    let dz = dirZ;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) {
      dx = Math.sin(this.hero.rotationY);
      dz = Math.cos(this.hero.rotationY);
    } else {
      dx /= len;
      dz /= len;
    }

    const startX = this.hero.x;
    const startZ = this.hero.z;
    this.hero.x = Math.max(-39, Math.min(39, startX + dx * dashSpec.distance));
    this.hero.z = Math.max(-39, Math.min(39, startZ + dz * dashSpec.distance));
    this.hero.dashCooldown = dashSpec.cooldown * Math.max(0.4, 1 - this.getHeroCooldownReduction());

    this.soundEngine?.playSfx('hero_dash');
    this.vfxManager?.spawnShockwave(startX, startZ, 2.5, this.hero.def.visual.glowColor, 0.3);
    this.vfxManager?.spawnShockwave(this.hero.x, this.hero.z, 3.2, this.hero.def.visual.glowColor, 0.38);

    // Deal impact damage along arrival
    const dmg = Math.round(dashSpec.impactDamage * this.getHeroDamageMultiplier());
    for (const e of this.enemies) {
      if (Math.hypot(e.x - this.hero.x, e.z - this.hero.z) <= 3.2) {
        this.applyDamageToEnemy(e, dmg, 'hero', true);
      }
    }
    return true;
  }

  castHeroSkill(slotKey, targetWorldPoint = null) {
    if (!this.hero || this.hero.isDead) return false;
    const key = slotKey.toLowerCase();
    const skill = this.hero.def.skills[key];
    if (!skill) return false;
    if ((this.hero.skillCooldowns[key] || 0) > 0) return false;

    const cdr = this.getHeroCooldownReduction();
    this.hero.skillCooldowns[key] = skill.cooldown * Math.max(0.35, 1 - cdr);
    this.hero.attackAnimTimer = 0.45;

    const dmgMult = this.getHeroDamageMultiplier();
    const hx = this.hero.x;
    const hz = this.hero.z;
    const aimX = targetWorldPoint ? targetWorldPoint.x : hx + Math.sin(this.hero.rotationY) * 5;
    const aimZ = targetWorldPoint ? targetWorldPoint.z : hz + Math.cos(this.hero.rotationY) * 5;

    if (key === 'q') {
      this.soundEngine?.playSfx('hero_skill_q');
      this.sceneManager?.addScreenShake(0.35);
      const centerX = this.hero.id === 'arthuria' || this.hero.id === 'vespera' ? hx : aimX;
      const centerZ = this.hero.id === 'arthuria' || this.hero.id === 'vespera' ? hz : aimZ;
      const radius = skill.radius || 5.8;
      const dmg = Math.round((skill.damage || 175) * dmgMult);

      this.vfxManager?.spawnShockwave(centerX, centerZ, radius, skill.vfxColor, 0.5);
      this.vfxManager?.spawnBurst(centerX, 1.5, centerZ, skill.vfxColor, 18, 8.5, 1.15);
      this.vfxManager?.spawnFloatingText(centerX, 3.2, centerZ, `${skill.icon} ${skill.name}!`, skill.vfxColor, true);

      for (const e of [...this.enemies]) {
        const dist = Math.hypot(e.x - centerX, e.z - centerZ);
        if (dist <= radius) {
          if (skill.pullStrength) {
            e.x = THREE.MathUtils.lerp(e.x, centerX, 0.45);
            e.z = THREE.MathUtils.lerp(e.z, centerZ, 0.45);
          }
          if (skill.stunDuration) {
            e.freezeTimer = Math.max(e.freezeTimer, skill.stunDuration);
          }
          if (skill.slowDuration) {
            e.slowTimer = Math.max(e.slowTimer, skill.slowDuration);
            e.slowFactor = Math.max(e.slowFactor, 0.45);
          }
          this.applyDamageToEnemy(e, dmg, 'hero_skill', true);
        }
      }

      if (skill.selfHealRatio) {
        const missing = this.hero.maxHp - this.hero.hp;
        const heal = Math.max(45, Math.round(missing * skill.selfHealRatio));
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + heal);
        this.vfxManager?.spawnFloatingText(hx, 3.0, hz, `+${heal} HP`, '#4ade80', false);
      }
    } else if (key === 'e') {
      this.soundEngine?.playSfx('hero_skill_e');
      const radius = skill.radius || 8.0;
      const duration = skill.duration || 6.0;
      const zoneX = this.hero.id === 'sylvanis' ? aimX : hx;
      const zoneZ = this.hero.id === 'sylvanis' ? aimZ : hz;

      this.vfxManager?.spawnGroundZone(zoneX, zoneZ, radius, skill.vfxColor, duration);
      this.vfxManager?.spawnShockwave(zoneX, zoneZ, radius, skill.vfxColor, 0.55);
      this.vfxManager?.spawnFloatingText(zoneX, 3.4, zoneZ, `${skill.icon} ${skill.name}!`, skill.vfxColor, true);

      this.activeZones.push({
        id: skill.id,
        heroId: this.hero.id,
        x: zoneX,
        z: zoneZ,
        radius,
        remaining: duration,
        duration,
        skill,
        tickTimer: 0,
      });
    } else if (key === 'r') {
      this.soundEngine?.playSfx('hero_skill_r');
      this.sceneManager?.addScreenShake(0.95);

      // Find highest-HP enemy or aim point
      let targetX = aimX;
      let targetZ = aimZ;
      if (this.enemies.length > 0) {
        const strongest = [...this.enemies].sort((a, b) => b.hp - a.hp)[0];
        targetX = strongest.x;
        targetZ = strongest.z;
      }

      const radius = skill.radius || 10.0;
      const dmg = Math.round((skill.damage || 500) * dmgMult);
      this.vfxManager?.spawnSkyBeam(targetX, targetZ, radius * 0.55, skill.vfxColor, 0.95);
      this.vfxManager?.spawnBurst(targetX, 2.2, targetZ, skill.vfxColor, 28, 12.0, 1.4);
      this.vfxManager?.spawnFloatingText(targetX, 4.5, targetZ, `👑 ${skill.name}!`, skill.vfxColor, true);

      for (const e of [...this.enemies]) {
        if (Math.hypot(e.x - targetX, e.z - targetZ) <= radius) {
          if (skill.burnDps) {
            e.burnTimer = skill.burnDuration || 5.0;
            e.burnDps = skill.burnDps * dmgMult;
          }
          if (skill.shockDuration) {
            e.freezeTimer = Math.max(e.freezeTimer, 1.8);
            e.vulnStacks = Math.min(5, e.vulnStacks + 2);
          }
          this.applyDamageToEnemy(e, dmg, 'hero_ult', true);
        }
      }

      if (skill.hasteDuration) {
        this.hero.hasteBuffTimer = skill.hasteDuration;
      }

      if (skill.structureHealRatio) {
        for (const b of this.buildings.values()) {
          if (b.isDestroyed) {
            b.isDestroyed = false;
            b.hp = Math.round(b.maxHp * skill.structureHealRatio);
            if (b.mesh) b.mesh.visible = true;
          } else {
            b.hp = Math.min(b.maxHp, b.hp + Math.round(b.maxHp * skill.structureHealRatio));
          }
        }
      }
    }

    this.emitState();
    return true;
  }

  getHeroDamageMultiplier() {
    let mult =
      1 +
      this.getCitadelHeroBoost() +
      (this.sanctumStats.heroDamageMult || 0) +
      (this.relicState.mods.heroDamageMult || 0);

    // Special Relic Trigger: 'gold_scales_hero_dmg' (+1.5% hero damage per 10 gold held)
    if (this.relicState.specialTriggers?.includes('gold_scales_hero_dmg')) {
      mult += Math.min(1.5, Math.floor(this.gold / 10) * 0.015);
    }
    // Special Relic Trigger: 'low_hp_frenzy'
    if (this.hero && this.hero.hp / this.hero.maxHp < 0.45 && this.relicState.specialTriggers?.includes('low_hp_frenzy')) {
      mult += 0.45;
    }
    return mult;
  }

  getHeroCooldownReduction() {
    let cdr = (this.sanctumStats.heroSkillHaste || 0) + (this.relicState.mods.heroCooldownMult || 0);
    if (this.realm.hazard?.type === 'astral_convergence') cdr += 0.20;
    for (const b of this.buildings.values()) {
      if (!b.isDestroyed && b.spec.skillCooldownAura) {
        cdr += b.spec.skillCooldownAura;
      }
    }
    if (this.hero?.id === 'vespera') cdr += 0.08;
    return Math.min(0.65, cdr);
  }

  // =========================================================================
  // MAIN SIMULATION TICK
  // =========================================================================
  update(rawDt, inputState = {}) {
    if (!this.isRunning || this.isPaused) return;
    if (this.phase === 'relic_draft' || this.phase === 'gameover' || this.phase === 'victory') return;

    const dt = Math.min(0.1, rawDt) * this.gameSpeed;
    this.elapsedTime += dt;

    if (this.killComboTimer > 0) {
      this.killComboTimer -= dt;
      if (this.killComboTimer <= 0) this.killCombo = 0;
    }

    // 1. Update Hero
    this.updateHero(dt, inputState);

    // 2. Update Active Ground Skill Zones
    this.updateActiveZones(dt);

    // 3. Update Buildings & Towers
    this.updateBuildings(dt);

    // 4. Update Allied Barracks Troops
    this.updateTroops(dt);

    // 5. Update Projectiles
    this.updateProjectiles(dt);

    // 6. Night Spawner & Enemy AI
    if (this.phase === 'night') {
      this.updateNightWave(dt);
    }
  }

  updateHero(dt, inputState) {
    const h = this.hero;
    if (!h) return;

    // Cooldowns tick even while reviving
    for (const k of ['q', 'e', 'r']) {
      if (h.skillCooldowns[k] > 0) {
        h.skillCooldowns[k] = Math.max(0, h.skillCooldowns[k] - dt);
      }
    }
    if (h.dashCooldown > 0) h.dashCooldown = Math.max(0, h.dashCooldown - dt);
    if (h.attackCooldown > 0) h.attackCooldown = Math.max(0, h.attackCooldown - dt);
    if (h.attackAnimTimer > 0) h.attackAnimTimer = Math.max(0, h.attackAnimTimer - dt);
    if (h.hasteBuffTimer > 0) h.hasteBuffTimer = Math.max(0, h.hasteBuffTimer - dt);

    if (h.isDead) {
      h.reviveTimer -= dt;
      if (h.reviveTimer <= 0) {
        h.isDead = false;
        h.hp = h.maxHp;
        h.x = 0;
        h.z = 6.5;
        if (h.mesh) h.mesh.visible = true;
        this.vfxManager?.spawnShockwave(h.x, h.z, 5.0, 0xfde047, 0.6);
        this.vfxManager?.spawnFloatingText(h.x, 3.2, h.z, '👑 군주 부활!', '#fde047', true);
      }
      return;
    }

    // Passive HP regeneration
    const regen = h.def.stats.hpRegen * (this.phase === 'day' ? 4.0 : 1.0);
    if (h.hp < h.maxHp) {
      h.hp = Math.min(h.maxHp, h.hp + regen * dt);
    }

    // Movement via WASD or Click-to-Move target
    let moveX = inputState.moveX || 0;
    let moveZ = inputState.moveZ || 0;
    if (Math.hypot(moveX, moveZ) > 0.05) {
      h.targetX = null;
      h.targetZ = null;
    } else if (h.targetX !== null && h.targetZ !== null) {
      const dx = h.targetX - h.x;
      const dz = h.targetZ - h.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.4) {
        moveX = dx / dist;
        moveZ = dz / dist;
      } else {
        h.targetX = null;
        h.targetZ = null;
      }
    }

    const moveLen = Math.hypot(moveX, moveZ);
    const isMoving = moveLen > 0.05;
    if (isMoving) {
      const normX = moveX / moveLen;
      const normZ = moveZ / moveLen;
      let speed =
        h.def.stats.moveSpeed *
        (1 +
          (this.sanctumStats.heroMoveSpeedMult || 0) +
          (this.relicState.mods.heroMoveSpeedMult || 0) +
          (h.hasteBuffTimer > 0 ? 0.40 : 0));

      h.x = Math.max(-40, Math.min(40, h.x + normX * speed * dt));
      h.z = Math.max(-40, Math.min(40, h.z + normZ * speed * dt));
      h.rotationY = Math.atan2(normX, normZ);
    }

    // Hero Auto-Attack against nearest enemy in range
    if (h.attackCooldown <= 0 && this.enemies.length > 0) {
      const range = h.def.stats.attackRange;
      let nearest = null;
      let bestDist = range;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - h.x, e.z - h.z);
        if (d <= bestDist) {
          bestDist = d;
          nearest = e;
        }
      }

      if (nearest) {
        h.rotationY = Math.atan2(nearest.x - h.x, nearest.z - h.z);
        const speedMult =
          1 +
          (this.relicState.mods.heroAttackSpeedMult || 0) +
          (h.hasteBuffTimer > 0 ? 0.45 : 0);
        h.attackCooldown = h.def.stats.attackInterval / Math.max(0.3, speedMult);
        h.attackAnimTimer = 0.25;

        const baseDmg = Math.round(h.def.stats.attackDamage * this.getHeroDamageMultiplier());

        if (h.def.stats.isRanged) {
          // Ranged hero fires 1 or multiShot bolts
          const shots = h.def.stats.multiShot || 1;
          const candidates = [...this.enemies]
            .filter((e) => Math.hypot(e.x - h.x, e.z - h.z) <= range * 1.15)
            .sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))
            .slice(0, shots);

          this.soundEngine?.playSfx('bow_shoot');
          for (const target of candidates) {
            this.spawnProjectile({
              x: h.x,
              y: 1.8,
              z: h.z,
              target,
              speed: h.def.stats.projectileSpeed || 26,
              damage: baseDmg,
              splashRadius: h.def.stats.cleaveRadius || 0,
              color: h.def.visual.glowColor,
              sourceType: 'hero',
            });
          }
        } else {
          // Melee Cleave attack
          this.soundEngine?.playSfx('hero_slash');
          this.vfxManager?.spawnShockwave(nearest.x, nearest.z, h.def.stats.cleaveRadius || 2.8, h.def.visual.glowColor, 0.25);
          for (const e of [...this.enemies]) {
            if (Math.hypot(e.x - nearest.x, e.z - nearest.z) <= (h.def.stats.cleaveRadius || 2.8)) {
              this.applyDamageToEnemy(e, baseDmg, 'hero', false);
            }
          }
        }
      }
    }

    if (h.mesh) {
      h.mesh.position.set(h.x, 0, h.z);
      h.mesh.rotation.y = h.rotationY;
      this.meshFactory?.animateHeroMesh(
        h.mesh,
        { isMoving, attackTimer: h.attackAnimTimer, hpRatio: h.hp / h.maxHp },
        this.elapsedTime
      );
    }
  }

  updateActiveZones(dt) {
    for (let i = this.activeZones.length - 1; i >= 0; i--) {
      const z = this.activeZones[i];
      z.remaining -= dt;
      z.tickTimer -= dt;
      if (z.remaining <= 0) {
        this.activeZones.splice(i, 1);
        continue;
      }

      if (z.tickTimer <= 0) {
        z.tickTimer = 0.5;
        // 1. Arthuria's Golden Aegis Banner: heals allies & buildings
        if (z.id === 'aegis_banner') {
          const healTick = Math.round((z.skill.healTotal || 240) / (z.duration * 2));
          if (this.hero && !this.hero.isDead && Math.hypot(this.hero.x - z.x, this.hero.z - z.z) <= z.radius) {
            this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + healTick);
          }
          for (const t of this.troops) {
            if (Math.hypot(t.x - z.x, t.z - z.z) <= z.radius) {
              t.hp = Math.min(t.maxHp, t.hp + healTick);
            }
          }
          for (const b of this.buildings.values()) {
            if (!b.isDestroyed && Math.hypot(b.x - z.x, b.z - z.z) <= z.radius) {
              b.hp = Math.min(b.maxHp, b.hp + healTick);
            }
          }
        }
        // 2. Kaelen's Automaton Turret: zaps enemies inside radius
        else if (z.id === 'overcharge_turret') {
          const targets = this.enemies
            .filter((e) => Math.hypot(e.x - z.x, e.z - z.z) <= z.radius)
            .slice(0, 3);
          if (targets.length > 0) {
            const pts = [{ x: z.x, y: 2.2, z: z.z }, ...targets.map((e) => ({ x: e.x, y: 1.5, z: e.z }))];
            this.vfxManager?.spawnLightningChain(pts, 0x22d3ee, 0.25);
            const dmg = Math.round((z.skill.turretDps || 65) * 0.5 * this.getHeroDamageMultiplier());
            for (const e of targets) {
              this.applyDamageToEnemy(e, dmg, 'hero_skill', true);
            }
          }
        }
        // 3. Sylvanis's Frost-Bramble Snare: roots & poisons enemies
        else if (z.id === 'bramble_snare') {
          const dmg = Math.round((z.skill.poisonDps || 38) * 0.5 * this.getHeroDamageMultiplier());
          for (const e of [...this.enemies]) {
            if (Math.hypot(e.x - z.x, e.z - z.z) <= z.radius) {
              e.slowTimer = Math.max(e.slowTimer, 0.8);
              e.slowFactor = Math.max(e.slowFactor, 0.75);
              this.applyDamageToEnemy(e, dmg, 'hero_skill', true);
            }
          }
        }
        // 4. Vespera's Chrono Stasis Dome: extreme slow + vulnerability
        else if (z.id === 'chrono_stasis') {
          for (const e of this.enemies) {
            if (Math.hypot(e.x - z.x, e.z - z.z) <= z.radius) {
              e.slowTimer = Math.max(e.slowTimer, 0.8);
              e.slowFactor = Math.max(e.slowFactor, z.skill.slowAmount || 0.75);
              e.vulnStacks = Math.max(2, e.vulnStacks);
            }
          }
        }
      }
    }
  }

  updateBuildings(dt) {
    const globalRegen =
      (this.sanctumStats.buildingAutoRepair || 0) +
      (this.relicState.mods.buildingRegenPerSec || 0) +
      (this.getCitadelBuilding()?.spec?.globalBuildingRegen || 0);

    const globalTowerDmgBonus =
      1 +
      (this.sanctumStats.towerDamageMult || 0) +
      (this.relicState.mods.towerDamageMult || 0) +
      (this.getCitadelBuilding()?.spec?.globalTowerDamageBonus || 0) +
      (this.realm.hazard?.type === 'magma_surge' ? 0.10 : 0);

    const globalTowerRangeBonus =
      1 +
      (this.sanctumStats.towerRangeMult || 0) +
      (this.relicState.mods.towerRangeMult || 0) +
      (this.hero?.id === 'kaelen' ? 0.12 : 0);

    for (const b of this.buildings.values()) {
      // Animate spring scale pop-in
      if (b.popScale < 1.0) {
        b.popScale = Math.min(1.0, b.popScale + dt * 4.5);
        if (b.mesh) b.mesh.scale.setScalar(b.popScale);
      }

      if (b.mesh && !b.isDestroyed) {
        this.meshFactory?.animateBuildingMesh(b.mesh, this.elapsedTime, this.phase === 'night');
      }

      if (b.isDestroyed) continue;

      if (b.overchargeTimer > 0) b.overchargeTimer = Math.max(0, b.overchargeTimer - dt);
      if (b.freezeTimer > 0) {
        b.freezeTimer = Math.max(0, b.freezeTimer - dt);
        continue; // Tower is temporarily frozen by Boss Borealis breath
      }

      // Passive HP repair
      const regen = (b.spec.regenPerSec || 0) + globalRegen;
      if (regen > 0 && b.hp < b.maxHp) {
        b.hp = Math.min(b.maxHp, b.hp + regen * dt);
      }

      // Night passive gold generation from Gold Mines
      if (this.phase === 'night' && b.spec.passiveGoldPerSec) {
        this.passiveGoldAccumulator += b.spec.passiveGoldPerSec * dt;
        if (this.passiveGoldAccumulator >= 1.0) {
          const gained = Math.floor(this.passiveGoldAccumulator);
          this.passiveGoldAccumulator -= gained;
          this.gold += gained;
          this.goldMinedTotal += gained;
        }
      }

      // Tectonic Mega-Drill earthquake aura or Spiked Wall shockPulseDps
      const pulseDps = b.spec.shockwaveDps || b.spec.shockPulseDps || 0;
      if (this.phase === 'night' && pulseDps > 0 && this.enemies.length > 0) {
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - b.x, e.z - b.z) <= 6.0) {
            this.applyDamageToEnemy(e, pulseDps * dt, 'tower', true);
          }
        }
      }

      // Barracks respawn dead squad members during Night
      if (this.phase === 'night' && (b.typeId === 'barracks' || b.spec.spawnsMilitia)) {
        const desired = b.spec.squadSize || b.spec.spawnsMilitia || 3;
        const alive = this.troops.filter((t) => t.parentSocketId === b.socketId).length;
        if (alive < desired) {
          b.spawnTimer += dt * (1 + (this.sanctumStats.troopRespawnSpeed || 0) + (this.relicState.mods.troopSpawnSpeedMult || 0));
          const respawnTime = b.spec.respawnTime || 7.0;
          if (b.spawnTimer >= respawnTime) {
            b.spawnTimer = 0;
            this.spawnSingleTroop(b, alive, desired);
          }
        }
      }

      // Tower Attack Logic
      if (!b.spec.attackDamage || this.enemies.length === 0) continue;

      if (b.attackCooldown > 0) {
        b.attackCooldown -= dt;
        continue;
      }

      const range = (b.spec.attackRange || 12) * globalTowerRangeBonus;
      const inRange = this.enemies.filter((e) => Math.hypot(e.x - b.x, e.z - b.z) <= range);
      if (inRange.length === 0) continue;

      // Calculate attack speed including Hero Aura, Capacitor Aura, Overcharge, and Relics
      let speedMult =
        1 +
        (this.sanctumStats.towerSpeedMult || 0) +
        (this.relicState.mods.towerAttackSpeedMult || 0) +
        (b.overchargeTimer > 0 ? 0.45 : 0);

      if (
        this.hero &&
        !this.hero.isDead &&
        Math.hypot(this.hero.x - b.x, this.hero.z - b.z) <= (this.hero.def.passive.auraRadius || 9.5)
      ) {
        speedMult += this.hero.def.passive.towerSpeedBonus || 0.20;
      }

      for (const other of this.buildings.values()) {
        if (!other.isDestroyed && other.spec.nearbyTowerSpeedAura) {
          if (Math.hypot(other.x - b.x, other.z - b.z) <= 12.5) {
            speedMult += other.spec.nearbyTowerSpeedAura;
          }
        }
      }

      for (const z of this.activeZones) {
        if (z.skill?.towerSpeedBuff && Math.hypot(z.x - b.x, z.z - b.z) <= z.radius) {
          speedMult += z.skill.towerSpeedBuff;
        }
      }

      b.attackCooldown = (b.spec.attackInterval || 1.0) / Math.max(0.25, speedMult);
      const dmg = Math.round(b.spec.attackDamage * globalTowerDmgBonus);

      this.fireTowerAttack(b, inRange, dmg);
    }
  }

  fireTowerAttack(b, inRangeEnemies, dmg) {
    const spec = b.spec;
    const pType = spec.projectileType || 'arrow';

    // Rotate turret head toward primary target
    const primary = inRangeEnemies[0];
    if (b.mesh?.userData?.turretHead && primary) {
      b.mesh.userData.turretHead.rotation.y = Math.atan2(primary.x - b.x, primary.z - b.z);
    }

    // 1. Frost Spire AoE Nova
    if (pType === 'frost_nova' || pType === 'blizzard' || pType === 'frost_shatter') {
      this.soundEngine?.playSfx('frost_nova');
      this.vfxManager?.spawnShockwave(b.x, b.z, spec.splashRadius || 10.0, 0x38bdf8, 0.45);
      const slowBonus = this.relicState.mods.frostSlowBonus || 0;
      for (const e of [...inRangeEnemies]) {
        e.slowTimer = Math.max(e.slowTimer, spec.slowDuration || 3.2);
        e.slowFactor = Math.min(0.85, Math.max(e.slowFactor, (spec.slowAmount || 0.35) + slowBonus));
        if (spec.freezeChance && Math.random() < spec.freezeChance) {
          e.freezeTimer = Math.max(e.freezeTimer, 1.4);
        }
        if (spec.vulnDebuff) {
          e.vulnStacks = Math.min(5, e.vulnStacks + 1);
        }
        this.applyDamageToEnemy(e, dmg, 'frost_tower', true, b);
      }
      return;
    }

    // 2. Arcane Obelisk / Chain Lightning / Void Beam
    if (pType === 'arcane' || pType === 'lightning' || pType === 'void_beam') {
      const chainCount = (spec.chainCount || 1) + Math.round(this.relicState.mods.lightningChainBonus || 0);
      const targets = inRangeEnemies.slice(0, Math.max(1, chainCount));
      const points = [{ x: b.x, y: 3.2, z: b.z }, ...targets.map((t) => ({ x: t.x, y: 1.4, z: t.z }))];
      this.soundEngine?.playSfx(pType === 'lightning' ? 'chain_lightning' : 'arcane_beam');
      this.vfxManager?.spawnLightningChain(points, pType === 'void_beam' ? 0xe879f9 : 0xa855f7, 0.24);

      for (const t of targets) {
        if (spec.meltMultiplier) t.vulnStacks = Math.min(6, t.vulnStacks + 1);
        if (spec.stunChance && Math.random() < spec.stunChance) {
          t.freezeTimer = Math.max(t.freezeTimer, 0.8);
        }
        this.applyDamageToEnemy(t, dmg, 'arcane_tower', true, b);
      }
      return;
    }

    // 3. Flame Mortar / Napalm / Dragonbreath Cone
    if (pType === 'mortar' || pType === 'napalm' || pType === 'flame_cone') {
      this.soundEngine?.playSfx('mortar_fire');
      this.spawnProjectile({
        x: b.x,
        y: 2.8,
        z: b.z,
        target: primary,
        speed: pType === 'flame_cone' ? 22 : 16,
        arcHeight: pType === 'flame_cone' ? 0.5 : 5.5,
        damage: dmg,
        splashRadius: spec.splashRadius || 3.6,
        burnDps: (spec.burnDps || 0) * (1 + (this.relicState.mods.burnDamageMult || 0)),
        color: 0xf97316,
        sourceType: 'mortar_tower',
      });
      return;
    }

    // 4. Archer Watchtower / Citadel / Ballista / Hurricane Crossbow
    const shots = spec.multiShot || 1;
    const targets = inRangeEnemies.slice(0, shots);
    this.soundEngine?.playSfx(shots > 1 ? 'crossbow_volley' : 'bow_shoot');
    for (const target of targets) {
      let shotDmg = dmg;
      if (spec.bossDamageBonus && target.spec.isBoss) {
        shotDmg = Math.round(shotDmg * (1 + spec.bossDamageBonus));
      }
      this.spawnProjectile({
        x: b.x,
        y: 3.0,
        z: b.z,
        target,
        speed: pType === 'ballista' ? 32 : 26,
        damage: shotDmg,
        splashRadius: spec.splashRadius || 0,
        color: pType === 'ballista' ? 0xfbbf24 : 0x34d399,
        sourceType: 'archer_tower',
      });
    }
  }

  spawnProjectile({
    x,
    y = 2.0,
    z,
    target,
    speed = 24,
    arcHeight = 0,
    damage = 25,
    splashRadius = 0,
    burnDps = 0,
    color = 0xfbbf24,
    sourceType = 'tower',
  }) {
    let mesh = null;
    if (this.sceneManager?.scene) {
      const geo = new THREE.SphereGeometry(splashRadius > 2 ? 0.34 : 0.18, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.worldGroup.add(mesh);
    }

    this.projectiles.push({
      x,
      y,
      z,
      startX: x,
      startZ: z,
      target,
      targetX: target ? target.x : x,
      targetZ: target ? target.z : z,
      speed,
      arcHeight,
      progress: 0,
      totalDist: Math.max(0.5, Math.hypot((target?.x || x) - x, (target?.z || z) - z)),
      damage,
      splashRadius,
      burnDps,
      color,
      sourceType,
      mesh,
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.target && p.target.hp > 0) {
        p.targetX = p.target.x;
        p.targetZ = p.target.z;
      }

      const dx = p.targetX - p.x;
      const dz = p.targetZ - p.z;
      const dist = Math.hypot(dx, dz);
      const step = p.speed * dt;

      if (dist <= step + 0.35) {
        // Impact!
        if (p.mesh) {
          this.worldGroup.remove(p.mesh);
          p.mesh.geometry?.dispose();
          p.mesh.material?.dispose();
        }

        if (p.splashRadius > 0) {
          if (p.sourceType === 'mortar_tower') {
            this.soundEngine?.playSfx('mortar_explode');
          }
          this.vfxManager?.spawnShockwave(p.targetX, p.targetZ, p.splashRadius, p.color, 0.35);
          this.vfxManager?.spawnBurst(p.targetX, 0.8, p.targetZ, p.color, 10, 6.5, 0.9);
          for (const e of [...this.enemies]) {
            if (Math.hypot(e.x - p.targetX, e.z - p.targetZ) <= p.splashRadius) {
              if (p.burnDps > 0) {
                e.burnTimer = 3.5;
                e.burnDps = Math.max(e.burnDps, p.burnDps);
              }
              this.applyDamageToEnemy(e, p.damage, p.sourceType, false);
            }
          }
        } else if (p.target && p.target.hp > 0) {
          this.applyDamageToEnemy(p.target, p.damage, p.sourceType, false);
        }

        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += (dx / dist) * step;
      p.z += (dz / dist) * step;
      p.progress = Math.min(1, 1 - dist / p.totalDist);
      const arcY = p.arcHeight > 0 ? Math.sin(p.progress * Math.PI) * p.arcHeight : 0;
      p.y = 1.4 + arcY;

      if (p.mesh) {
        p.mesh.position.set(p.x, p.y, p.z);
      }
    }
  }

  updateTroops(dt) {
    for (let i = this.troops.length - 1; i >= 0; i--) {
      const t = this.troops[i];
      if (t.hp <= 0) {
        if (t.mesh) this.worldGroup.remove(t.mesh);
        this.troops.splice(i, 1);
        continue;
      }

      if (t.attackCooldown > 0) t.attackCooldown -= dt;
      if (t.hitFlash > 0) t.hitFlash = Math.max(0, t.hitFlash - dt * 4);
      if (t.selfHeal > 0 && t.hp < t.maxHp) {
        t.hp = Math.min(t.maxHp, t.hp + t.selfHeal * dt);
      }

      // Hero passive ally regen
      if (
        this.hero &&
        !this.hero.isDead &&
        Math.hypot(this.hero.x - t.x, this.hero.z - t.z) <= (this.hero.def.passive.auraRadius || 9.0)
      ) {
        t.hp = Math.min(t.maxHp, t.hp + t.maxHp * (this.hero.def.passive.allyRegenRate || 0.015) * dt);
      }

      // Find nearest engageable enemy within 9.5m of home post or current position
      let target = null;
      let bestDist = 10.0;
      for (const e of this.enemies) {
        if (e.spec.isFlying && !t.canHitFlying) continue;
        const d = Math.hypot(e.x - t.x, e.z - t.z);
        if (d < bestDist) {
          bestDist = d;
          target = e;
        }
      }

      let isMoving = false;
      if (target) {
        if (bestDist > 1.65) {
          isMoving = true;
          const dx = target.x - t.x;
          const dz = target.z - t.z;
          t.x += (dx / bestDist) * t.speed * dt;
          t.z += (dz / bestDist) * t.speed * dt;
          if (t.mesh) t.mesh.rotation.y = Math.atan2(dx, dz);
        } else if (t.attackCooldown <= 0) {
          t.attackCooldown = 0.85;
          let dmg = t.damage;
          if (
            this.hero &&
            !this.hero.isDead &&
            Math.hypot(this.hero.x - t.x, this.hero.z - t.z) <= (this.hero.def.passive.auraRadius || 9.0)
          ) {
            dmg = Math.round(dmg * (1 + (this.hero.def.passive.troopDamageBonus || 0.20)));
          }
          if (t.cleave) {
            for (const e of [...this.enemies]) {
              if (Math.hypot(e.x - target.x, e.z - target.z) <= 2.4) {
                this.applyDamageToEnemy(e, dmg, 'troop', false);
              }
            }
          } else {
            this.applyDamageToEnemy(target, dmg, 'troop', false);
          }
        }
      } else {
        // Return to rally/home position
        const dx = t.homeX - t.x;
        const dz = t.homeZ - t.z;
        const distHome = Math.hypot(dx, dz);
        if (distHome > 0.45) {
          isMoving = true;
          t.x += (dx / distHome) * t.speed * dt;
          t.z += (dz / distHome) * t.speed * dt;
          if (t.mesh) t.mesh.rotation.y = Math.atan2(dx, dz);
        }
      }

      if (t.mesh) {
        t.mesh.position.set(t.x, 0, t.z);
        this.meshFactory?.animateUnitMesh(t.mesh, { isMoving, hitFlash: t.hitFlash }, this.elapsedTime);
      }
    }
  }

  updateNightWave(dt) {
    this.nightElapsed += dt;

    // 1. Process Spawn Queues
    let pendingSpawns = 0;
    for (const q of this.spawnQueues) {
      if (q.remaining <= 0) continue;
      pendingSpawns += q.remaining;
      q.timer -= dt;
      if (q.timer <= 0) {
        this.spawnEnemyFromGroup(q);
        q.remaining -= 1;
        q.timer = q.interval || 1.0;
      }
    }

    // 2. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) continue;

      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
      if (e.attackCooldown > 0) e.attackCooldown -= dt;

      // Burn DoT
      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        this.applyDamageToEnemy(e, e.burnDps * dt, 'burn', true);
        if (e.hp <= 0) continue;
      }

      // Freeze check
      if (e.freezeTimer > 0) {
        e.freezeTimer -= dt;
        if (e.mesh) {
          this.meshFactory?.animateUnitMesh(e.mesh, { isMoving: false, hitFlash: e.hitFlash }, this.elapsedTime);
        }
        continue;
      }

      // Slow check
      let curSpeed = e.baseSpeed;
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        curSpeed *= Math.max(0.15, 1 - e.slowFactor);
      } else {
        e.slowFactor = 0;
      }

      // Boss & Specialist Periodic Abilities
      e.specialTimer -= dt;
      if (e.specialTimer <= 0) {
        this.executeEnemySpecialAbility(e);
      }

      // Target Acquisition:
      // Find nearest blocking Wall, Troop, Hero, or Building along path to Citadel
      const target = this.selectEnemyTarget(e);
      if (!target) continue;

      const dx = target.x - e.x;
      const dz = target.z - e.z;
      const dist = Math.hypot(dx, dz);
      const atkRange = (e.spec.attackRange || 1.6) + (target.isCitadel ? 2.4 : target.isBuilding ? 1.5 : 0.5);

      if (dist > atkRange) {
        e.x += (dx / dist) * curSpeed * dt;
        e.z += (dz / dist) * curSpeed * dt;
        if (e.mesh) {
          e.mesh.position.set(e.x, 0, e.z);
          e.mesh.rotation.y = Math.atan2(dx, dz);
          this.meshFactory?.animateUnitMesh(e.mesh, { isMoving: true, hitFlash: e.hitFlash }, this.elapsedTime);
        }
      } else if (e.attackCooldown <= 0) {
        e.attackCooldown = e.spec.attackInterval || 1.1;
        this.performEnemyAttack(e, target);
      }
    }

    // 3. Check if Wave is Cleared!
    if (pendingSpawns === 0 && this.enemies.length === 0 && this.phase === 'night') {
      this.completeWaveAndTriggerDawn();
    }
  }

  selectEnemyTarget(e) {
    // 1. Check nearby allied troops first (within 5.5m) if not flying
    if (!e.spec.isFlying) {
      let bestTroop = null;
      let bestDist = 5.5;
      for (const t of this.troops) {
        const d = Math.hypot(t.x - e.x, t.z - e.z);
        if (d < bestDist) {
          bestDist = d;
          bestTroop = t;
        }
      }
      if (bestTroop) return { type: 'troop', ref: bestTroop, x: bestTroop.x, z: bestTroop.z };
    }

    // 2. Check Hero if within aggro range (6.5m)
    if (this.hero && !this.hero.isDead) {
      const dHero = Math.hypot(this.hero.x - e.x, this.hero.z - e.z);
      if (dHero <= (e.spec.behavior === 'hunter' ? 11.0 : 6.0)) {
        return { type: 'hero', ref: this.hero, x: this.hero.x, z: this.hero.z };
      }
    }

    // 3. Check blocking Stone Walls (if not flying) or Buildings in path
    let bestBuilding = null;
    let bestScore = Infinity;
    for (const b of this.buildings.values()) {
      if (b.isDestroyed) continue;
      if (e.spec.isFlying && b.typeId === 'stone_wall') continue;

      const d = Math.hypot(b.x - e.x, b.z - e.z);
      let weight = d;
      if (e.spec.behavior === 'sapper' && b.typeId === 'stone_wall') weight *= 0.4;
      else if (b.typeId === 'stone_wall' && d < 7.5) weight *= 0.55;
      else if (b.typeId === 'citadel') weight *= 0.85;

      if (weight < bestScore) {
        bestScore = weight;
        bestBuilding = b;
      }
    }

    if (bestBuilding) {
      return {
        type: 'building',
        isBuilding: true,
        isCitadel: bestBuilding.typeId === 'citadel',
        ref: bestBuilding,
        x: bestBuilding.x,
        z: bestBuilding.z,
      };
    }
    return null;
  }

  performEnemyAttack(e, target) {
    let dmg = e.damage;
    if (target.type === 'troop') {
      const t = target.ref;
      t.hp -= dmg;
      t.hitFlash = 1.0;
      const thorns = this.relicState.mods.thornsReflect || 0;
      if (thorns > 0) this.applyDamageToEnemy(e, dmg * thorns, 'thorns', true);
    } else if (target.type === 'hero') {
      const h = target.ref;
      const reduced = Math.round(dmg * (1 - (h.def.stats.armor || 0.12)));
      h.hp -= reduced;
      this.soundEngine?.playSfx('hero_hurt');
      if (h.hp <= 0) {
        h.isDead = true;
        h.reviveTimer = Math.max(4.0, 9.0 - (this.sanctumStats.reviveGraceSpeed || 0));
        if (h.mesh) h.mesh.visible = false;
        this.notify(`⚠️ 군주가 쓰러졌습니다! ${h.reviveTimer.toFixed(0)}초 후 성채에서 부활합니다.`, 'warn');
      }
    } else if (target.type === 'building') {
      const b = target.ref;
      let bDmg = dmg * (1 + (this.skullMods.buildingDamageTakenBonus || 0));
      if (e.spec.behavior === 'sapper') {
        bDmg *= 2.2;
        e.hp = 0; // Sapper self-destructs on wall impact!
        this.vfxManager?.spawnBurst(e.x, 1.2, e.z, 0xf97316, 14, 7.5, 1.1);
        this.removeDeadEnemy(e, false);
      }
      b.hp -= bDmg;
      this.soundEngine?.playSfx('wall_hit');

      // Wall & Relic thorns reflection
      const thorns = (b.spec.thornsRatio || 0) + (this.relicState.mods.thornsReflect || 0);
      if (thorns > 0 && e.hp > 0) {
        this.applyDamageToEnemy(e, bDmg * thorns, 'thorns', true);
      }

      if (b.hp <= 0) {
        b.hp = 0;
        b.isDestroyed = true;
        if (b.mesh) b.mesh.visible = false;
        this.soundEngine?.playSfx('wall_break');
        this.vfxManager?.spawnBurst(b.x, 1.5, b.z, 0xef4444, 18, 8.0, 1.2);

        if (b.typeId === 'citadel') {
          this.triggerGameOver(false);
        } else {
          this.notify(`💥 ${b.baseDef.name} 파괴됨! (여명 도래 시 자동 재건됩니다)`, 'warn');
        }
      }
    }
  }

  executeEnemySpecialAbility(e) {
    if (e.spec.behavior === 'healer') {
      e.specialTimer = 3.5;
      const healAmt = e.spec.healPulseAmount || 35;
      for (const ally of this.enemies) {
        if (Math.hypot(ally.x - e.x, ally.z - e.z) <= 6.5) {
          ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
        }
      }
      this.vfxManager?.spawnShockwave(e.x, e.z, 5.0, 0x22c55e, 0.4);
    } else if (e.spec.behavior === 'summoner') {
      e.specialTimer = 5.5;
      this.spawnMinionAt(e.x + 1.5, e.z + 1.5, 'skeleton_warrior', 1 + this.wave * 0.12);
      this.spawnMinionAt(e.x - 1.5, e.z - 1.5, 'skeleton_warrior', 1 + this.wave * 0.12);
      this.vfxManager?.spawnShockwave(e.x, e.z, 3.5, 0xa855f7, 0.4);
    } else if (e.spec.isBoss) {
      e.specialTimer = e.spec.abilityCooldown || 7.5;
      this.sceneManager?.addScreenShake(0.8);
      this.vfxManager?.spawnShockwave(e.x, e.z, 9.0, e.spec.accentColor || 0xf43f5e, 0.7);
      this.vfxManager?.spawnFloatingText(e.x, 4.2, e.z, `⚡ ${e.spec.name} 특수기!`, '#f43f5e', true);

      if (e.spec.bossAbility === 'blizzard_breath') {
        // Freeze up to 3 nearby towers for 3.2 seconds
        const nearTowers = Array.from(this.buildings.values())
          .filter((b) => !b.isDestroyed && b.baseDef.category === 'defense')
          .sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))
          .slice(0, 3);
        for (const t of nearTowers) {
          t.freezeTimer = 3.2;
          this.vfxManager?.spawnFloatingText(t.x, 3.0, t.z, '❄️ 빙결됨!', '#38bdf8', false);
        }
      } else if (e.spec.bossAbility === 'royal_legion_arise' || e.spec.bossAbility === 'astral_annihilation') {
        const minionId = e.spec.id === 'boss_malakor' ? 'void_reaver' : 'skeleton_warrior';
        for (let k = 0; k < 3; k++) {
          const angle = (k / 3) * Math.PI * 2;
          this.spawnMinionAt(e.x + Math.cos(angle) * 3.0, e.z + Math.sin(angle) * 3.0, minionId, 1.3);
        }
      }
    } else {
      e.specialTimer = 999;
    }
  }

  spawnMinionAt(x, z, enemyId, hpScale = 1.0) {
    const spec = getEnemySpec(enemyId);
    let mesh = null;
    if (this.meshFactory) {
      mesh = this.meshFactory.createEnemyMesh(spec);
      mesh.position.set(x, 0, z);
      this.worldGroup.add(mesh);
    }
    this.enemies.push({
      id: `minion_${Date.now()}_${Math.random()}`,
      spec,
      x,
      z,
      hp: Math.round(spec.maxHp * hpScale),
      maxHp: Math.round(spec.maxHp * hpScale),
      damage: spec.damage,
      speed: spec.speed,
      baseSpeed: spec.speed,
      attackCooldown: 0.5,
      specialTimer: 99,
      slowTimer: 0,
      slowFactor: 0,
      freezeTimer: 0,
      burnTimer: 0,
      burnDps: 0,
      poisonTimer: 0,
      poisonDps: 0,
      vulnStacks: 0,
      hitFlash: 0,
      mesh,
    });
  }

  applyDamageToEnemy(e, rawDamage, sourceType = 'tower', ignoresArmor = false, sourceBuilding = null) {
    if (!e || e.hp <= 0) return;

    let dmg = rawDamage;
    if (!ignoresArmor && e.spec.armor > 0) {
      dmg *= 1 - e.spec.armor;
    }

    // Vulnerability multiplier
    if (e.vulnStacks > 0) {
      dmg *= 1 + e.vulnStacks * 0.12;
    }

    // Boss damage bonus from Sanctum & Relics
    if (e.spec.isBoss) {
      dmg *= 1 + (this.sanctumStats.bossDamageBonus || 0) + (this.relicState.mods.bossDamageMult || 0);
    }

    // Critical Hit Calculation
    const critChance =
      (this.sanctumStats.critChanceBonus || 0) +
      (this.relicState.mods.critChance || 0) +
      (this.hero?.id === 'sylvanis' && sourceType.startsWith('hero') ? 0.18 : 0);

    let isCrit = false;
    if (sourceType !== 'burn' && sourceType !== 'thorns' && Math.random() < critChance) {
      isCrit = true;
      dmg *= 1.65 + (this.relicState.mods.critDamageMult || 0);
    }

    const finalDmg = Math.max(1, Math.round(dmg));
    e.hp -= finalDmg;
    e.hitFlash = 1.0;

    // Hero lifesteal
    if (sourceType.startsWith('hero') && this.hero && !this.hero.isDead) {
      const ls = (this.hero.def.stats.lifesteal || 0) + (this.relicState.mods.heroLifesteal || 0);
      if (ls > 0) {
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + finalDmg * ls);
      }
    }

    if (sourceType !== 'burn' && Math.random() < (isCrit ? 1.0 : 0.42)) {
      this.vfxManager?.spawnFloatingText(
        e.x,
        e.spec.isBoss ? 3.5 : 2.1,
        e.z,
        isCrit ? `💥${finalDmg}!` : `${finalDmg}`,
        isCrit ? '#fde047' : sourceType.startsWith('hero') ? '#38bdf8' : '#f8fafc',
        isCrit
      );
    }

    if (e.hp <= 0) {
      this.handleEnemyKilled(e, sourceBuilding);
    }
  }

  handleEnemyKilled(e, sourceBuilding = null) {
    this.removeDeadEnemy(e, true);

    this.enemiesSlain += 1;
    this.killCombo += 1;
    this.killComboTimer = 4.0;
    this.killCounterForBurst += 1;

    // Vespera passive: reduce all skill cooldowns by 0.25s on nearby enemy death
    if (this.hero?.id === 'vespera' && !this.hero.isDead) {
      for (const k of ['q', 'e', 'r']) {
        this.hero.skillCooldowns[k] = Math.max(0, this.hero.skillCooldowns[k] - 0.25);
      }
    }

    // Gold & Score reward
    let goldDrop = e.spec.goldReward || 2;
    if (this.relicState.mods.killGoldChance && Math.random() < this.relicState.mods.killGoldChance) {
      goldDrop += this.relicState.mods.killGoldAmount || 2;
    }
    this.gold += goldDrop;
    this.goldMinedTotal += goldDrop;
    this.score += (e.spec.scoreReward || 20) + Math.min(50, this.killCombo * 2);

    if (e.spec.argonReward) {
      this.argon += e.spec.argonReward;
      this.argonMinedTotal += e.spec.argonReward;
    }

    if (e.spec.isBoss) {
      this.bossesDefeated += 1;
      this.sceneManager?.addScreenShake(1.4);
      this.vfxManager?.spawnSkyBeam(e.x, e.z, 4.5, 0xfde047, 1.1);
      this.vfxManager?.spawnFloatingText(e.x, 4.2, e.z, `👑 보스 토벌! +${goldDrop}G`, '#fde047', true);
    }

    // Splitter Golem spawns 2 mini magma hounds on death
    if (e.spec.behavior === 'splitter') {
      this.spawnMinionAt(e.x + 1.0, e.z, 'hellhound', 0.65);
      this.spawnMinionAt(e.x - 1.0, e.z, 'hellhound', 0.65);
    }

    // Cryo-Shatter Prism or 'frost_shatter_aoe' Relic trigger
    if (
      (e.slowTimer > 0 || e.freezeTimer > 0) &&
      (sourceBuilding?.spec?.shatterExplosionDmg || this.relicState.specialTriggers?.includes('frost_shatter_aoe'))
    ) {
      const shatterDmg = sourceBuilding?.spec?.shatterExplosionDmg || 85;
      this.soundEngine?.playSfx('ice_shatter');
      this.vfxManager?.spawnShockwave(e.x, e.z, 3.6, 0x67e8f9, 0.35);
      for (const near of [...this.enemies]) {
        if (near.hp > 0 && Math.hypot(near.x - e.x, near.z - e.z) <= 3.6) {
          this.applyDamageToEnemy(near, shatterDmg, 'shatter', true);
        }
      }
    }

    // Blood Tax / 'kill_gold_burst' every 20 kills
    if (this.killCounterForBurst >= 20 && this.relicState.specialTriggers?.includes('kill_gold_burst')) {
      this.killCounterForBurst = 0;
      const bonus = 18;
      this.gold += bonus;
      this.goldMinedTotal += bonus;
      this.vfxManager?.spawnFloatingText(e.x, 3.0, e.z, `🪙 피의 세금 +${bonus}G!`, '#fbbf24', true);
    }
  }

  removeDeadEnemy(e, playBurst = true) {
    const idx = this.enemies.indexOf(e);
    if (idx !== -1) this.enemies.splice(idx, 1);
    if (e.mesh) {
      this.worldGroup.remove(e.mesh);
    }
    if (playBurst) {
      this.vfxManager?.spawnBurst(e.x, 1.0, e.z, e.spec.color || 0xef4444, e.spec.isBoss ? 28 : 8, 7.0, e.spec.isBoss ? 1.5 : 0.85);
    }
  }

  // =========================================================================
  // DAWN PAYOUT, RELIC DRAFT & VICTORY / DEFEAT
  // =========================================================================
  completeWaveAndTriggerDawn() {
    // Calculate Dawn Economy Income
    let dawnGold = this.currentWaveDesc?.clearGoldBonus || 30;
    let dawnArgon = this.currentWaveDesc?.clearArgonBonus || 2;
    let interestCap = this.relicState.mods.interestRateCap || 0;

    for (const b of this.buildings.values()) {
      // Restore all buildings (even destroyed ones!) at Dawn
      b.isDestroyed = false;
      b.hp = b.maxHp;
      b.freezeTimer = 0;
      if (b.mesh) b.mesh.visible = true;

      if (b.spec.dawnGold) dawnGold += b.spec.dawnGold;
      if (b.spec.dawnArgon) dawnArgon += b.spec.dawnArgon;
      if (b.spec.interestBonus) interestCap += b.spec.interestBonus;

      if (b.typeId === 'barracks' || b.spec.spawnsMilitia) {
        this.syncBarracksTroops(b);
      }
    }

    const goldMult =
      1 +
      (this.sanctumStats.dawnIncomeMult || 0) +
      (this.relicState.mods.goldIncomeMult || 0) -
      (this.skullMods.goldPenalty || 0) +
      (this.realm.hazard?.type === 'sandstorm' ? 0.15 : 0);

    const argonMult =
      1 +
      (this.relicState.mods.argonIncomeMult || 0) +
      (this.realm.hazard?.type === 'magma_surge' ? 0.25 : 0);

    let totalGoldEarned = Math.round(dawnGold * Math.max(0.4, goldMult) + (this.relicState.mods.startingDawnGold || 0));
    if (interestCap > 0) {
      const interest = Math.min(80, Math.round(this.gold * interestCap));
      totalGoldEarned += interest;
    }
    const totalArgonEarned = Math.round(dawnArgon * argonMult);

    this.gold += totalGoldEarned;
    this.argon += totalArgonEarned;
    this.goldMinedTotal += totalGoldEarned;
    this.argonMinedTotal += totalArgonEarned;
    this.score += this.wave * 180;

    // Restore Hero to full HP
    if (this.hero) {
      this.hero.isDead = false;
      this.hero.hp = this.hero.maxHp;
      if (this.hero.mesh) this.hero.mesh.visible = true;
    }

    if (this.sceneManager) {
      this.sceneManager.setNightMode(false);
    }

    this.soundEngine?.playSfx('dawn_fanfare');

    // Check if Campaign Realm is Completed!
    if (!this.isEndless && this.wave >= this.realm.totalWaves) {
      this.triggerGameOver(true);
      return;
    }

    // Advance to next Wave
    this.wave += 1;
    this.phase = 'day';
    this.currentWaveDesc = generateWaveDescriptor(this.realmIndex, this.wave, this.isEndless, this.skullMods);
    this.updatePortalThreatIndicators();
    this.soundEngine?.setMusicMode('day', this.realmIndex);

    this.notify(
      `☀️ 여명이 밝았습니다! 수입: +${totalGoldEarned} 금화, +${totalArgonEarned} 아르곤 결정`,
      'gold'
    );

    // Save Mid-Run Checkpoint
    this.saveMidRunCheckpoint();

    // Open Royal Relic Draft Modal
    this.triggerRelicDraft(false);
    this.emitState();
  }

  triggerRelicDraft(isReroll = false) {
    if (isReroll) {
      if (this.relicRerollsLeft <= 0) return false;
      this.relicRerollsLeft -= 1;
    }

    const unowned = RELICS.filter((r) => !this.ownedRelicIds.includes(r.id));
    const pool = unowned.length >= 3 ? unowned : RELICS;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    this.pendingRelicChoices = shuffled.slice(0, 3);
    this.phase = 'relic_draft';

    if (this.onRelicDraftReady) {
      this.onRelicDraftReady(this.pendingRelicChoices, this.relicRerollsLeft);
    }
    this.emitState();
    return true;
  }

  pickRelic(relicId) {
    const relic = RELICS.find((r) => r.id === relicId) || this.pendingRelicChoices[0];
    if (relic && !this.ownedRelicIds.includes(relic.id)) {
      this.ownedRelicIds.push(relic.id);
      this.saveSystem?.discoverRelic(relic.id);
    }
    this.pendingRelicChoices = [];
    this.phase = 'day';
    this.recalculateModifiers();
    this.soundEngine?.playSfx('relic_pick');
    if (relic) {
      this.notify(`📜 왕실 칙령·유물 획득: [${relic.icon} ${relic.name}]`, 'gold');
    }
    this.saveMidRunCheckpoint();
    this.emitState();
  }

  continueIntoEndlessMode() {
    this.isEndless = true;
    this.wave += 1;
    this.phase = 'day';
    this.isRunning = true;
    this.currentWaveDesc = generateWaveDescriptor(this.realmIndex, this.wave, true, this.skullMods);
    this.updatePortalThreatIndicators();
    this.soundEngine?.setMusicMode('day', this.realmIndex);
    this.notify(`♾️ 무한의 심연(Endless Mode) 제${this.wave}야 돌입! 한계를 시험하세요!`, 'gold');
    this.emitState();
  }

  triggerGameOver(victory = false) {
    this.phase = victory ? 'victory' : 'gameover';
    this.soundEngine?.playSfx(victory ? 'victory' : 'defeat');
    this.soundEngine?.setMusicMode(victory ? 'victory' : 'defeat', this.realmIndex);

    const skullMult = 1 + (this.skullMods.crownBonusMult || 0);
    const sanctumMult = 1 + (this.sanctumStats.crownGainMult || 0);
    const baseCrowns = victory
      ? this.realm.rewardCrowns + this.wave * 12
      : Math.max(20, this.wave * 14 + this.bossesDefeated * 45);
    const crownsEarned = Math.round(baseCrowns * skullMult * sanctumMult);

    const summary = {
      victory,
      isEndless: this.isEndless,
      realmIndex: this.realmIndex,
      realmName: this.realm.name,
      heroId: this.hero?.id || 'arthuria',
      heroName: this.hero?.def?.name || '성군 아르투리아',
      heroIcon: this.hero?.def?.icon || '👑',
      wave: this.wave,
      totalWaves: this.realm.totalWaves,
      score: this.score + (victory ? 3500 : 0),
      enemiesSlain: this.enemiesSlain,
      bossesDefeated: this.bossesDefeated,
      goldMined: this.goldMinedTotal,
      argonMined: this.argonMinedTotal,
      buildingsConstructed: this.buildingsConstructed,
      evolutionsCount: this.evolutionsCount,
      crownsEarned,
      seed: this.seed,
      activeSkulls: this.activeSkulls,
      ownedRelics: this.relicState.ownedRelics || [],
      activeSets: this.relicState.activeSets || [],
    };

    const metaResult = this.saveSystem ? this.saveSystem.recordRunEnd(summary) : { earnedCrowns: crownsEarned, newlyUnlocked: [] };
    summary.crownsEarned = metaResult.earnedCrowns;
    summary.newlyUnlockedAchievements = metaResult.newlyUnlocked;

    if (this.onRunFinished) {
      this.onRunFinished(summary);
    }
    this.emitState();
  }

  saveMidRunCheckpoint() {
    if (!this.saveSystem || this.phase === 'gameover' || this.phase === 'victory') return;
    const builtSockets = [];
    for (const [sockId, b] of this.buildings.entries()) {
      builtSockets.push({
        socketId: sockId,
        typeId: b.typeId,
        tier: b.tier,
        evolutionId: b.evolutionId,
      });
    }
    this.saveSystem.saveCheckpoint({
      realmIndex: this.realmIndex,
      heroId: this.hero?.id || 'arthuria',
      isEndless: this.isEndless,
      wave: this.wave,
      gold: this.gold,
      argon: this.argon,
      score: this.score,
      enemiesSlain: this.enemiesSlain,
      bossesDefeated: this.bossesDefeated,
      goldMinedTotal: this.goldMinedTotal,
      argonMinedTotal: this.argonMinedTotal,
      activeSkulls: this.activeSkulls,
      ownedRelicIds: this.ownedRelicIds,
      builtSockets,
      seed: this.seed,
      savedAt: Date.now(),
    });
  }

  resumeFromCheckpoint(cp) {
    if (!cp) return false;
    this.startRun({
      realmIndex: cp.realmIndex || 0,
      heroId: cp.heroId || 'arthuria',
      isEndless: Boolean(cp.isEndless),
      activeSkulls: cp.activeSkulls || [],
      seed: cp.seed,
    });
    this.wave = cp.wave || 1;
    this.gold = cp.gold ?? 135;
    this.argon = cp.argon ?? 4;
    this.score = cp.score || 0;
    this.enemiesSlain = cp.enemiesSlain || 0;
    this.bossesDefeated = cp.bossesDefeated || 0;
    this.goldMinedTotal = cp.goldMinedTotal || 0;
    this.argonMinedTotal = cp.argonMinedTotal || 0;
    this.ownedRelicIds = [...(cp.ownedRelicIds || [])];
    this.pendingRelicChoices = [];
    this.phase = 'day';

    for (const item of cp.builtSockets || []) {
      const sock = this.sockets.find((s) => s.id === item.socketId);
      if (sock) {
        this.constructOnSocketInternal(sock, item.typeId, item.tier, item.evolutionId, true);
      }
    }

    this.recalculateModifiers();
    this.currentWaveDesc = generateWaveDescriptor(this.realmIndex, this.wave, this.isEndless, this.skullMods);
    this.updatePortalThreatIndicators();
    this.notify(`💾 저장된 원정(제${this.wave}야 정비 단계)을 성공적으로 불러왔습니다!`, 'gold');
    this.emitState();
    return true;
  }

  getHudSnapshot() {
    const cit = this.getCitadelBuilding();
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      gameSpeed: this.gameSpeed,
      phase: this.phase,
      realmIndex: this.realmIndex,
      realm: this.realm,
      isEndless: this.isEndless,
      wave: this.wave,
      totalWaves: this.realm.totalWaves,
      gold: this.gold,
      argon: this.argon,
      score: this.score,
      enemiesSlain: this.enemiesSlain,
      enemiesRemaining:
        this.enemies.length + this.spawnQueues.reduce((acc, q) => acc + Math.max(0, q.remaining), 0),
      killCombo: this.killCombo,
      citadelHp: cit ? Math.round(cit.hp) : 0,
      citadelMaxHp: cit ? cit.maxHp : 1800,
      hero: this.hero
        ? {
            id: this.hero.id,
            name: this.hero.def.name,
            icon: this.hero.def.icon,
            hp: Math.round(this.hero.hp),
            maxHp: this.hero.maxHp,
            isDead: this.hero.isDead,
            reviveTimer: this.hero.reviveTimer,
            dashCooldown: this.hero.dashCooldown,
            dashMaxCooldown: this.hero.dashMaxCooldown,
            skillCooldowns: { ...this.hero.skillCooldowns },
            skillMaxCooldowns: { ...this.hero.skillMaxCooldowns },
            skills: this.hero.def.skills,
          }
        : null,
      troopCount: this.troops.length,
      selectedSocketId: this.selectedSocketId,
      ownedRelics: this.relicState.ownedRelics || [],
      activeSets: this.relicState.activeSets || [],
      currentWaveDesc: this.currentWaveDesc,
      seed: this.seed,
    };
  }
}
