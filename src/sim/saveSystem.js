/**
 * ARGONIA: Crown of the Spire
 * Persistent Meta-Progression, Achievements, Codex, Run History & Mid-Run Checkpoint System
 */

import { SANCTUM_UPGRADES, ACHIEVEMENTS, computeSanctumStats, getSanctumUpgradeCost } from '../data/sanctum.js';
import { HEROES } from '../data/heroes.js';

const STORAGE_KEY = 'argonia_crown_of_the_spire_save_v1';
const CHECKPOINT_KEY = 'argonia_active_run_checkpoint_v1';

export function createDefaultSaveData() {
  return {
    version: 1,
    crowns: 120, // Starter Royal Treasury grant so players can immediately experience Sanctum upgrades
    totalCrownsEarned: 120,
    unlockedHeroes: ['arthuria', 'kaelen'],
    unlockedRealms: [0, 1, 2, 3, 4], // All 5 realms selectable from the war-map (recommended order 1->5)
    clearedRealms: [],
    highestRealmCleared: -1,
    bestEndlessWave: 0,
    bestScore: 0,
    selectedHeroId: 'arthuria',
    selectedRealmIndex: 0,
    activeSkulls: [],
    sanctumLevels: {},
    unlockedAchievements: [],
    discoveredRelics: ['solar_tithe', 'iron_ram_banner', 'argon_condenser'],
    discoveredEnemies: ['goblin_raider', 'shield_orc', 'kobold_sapper', 'boss_kragasha'],
    lifetimeStats: {
      runsPlayed: 0,
      victories: 0,
      wavesSurvived: 0,
      enemiesSlain: 0,
      bossesSlain: 0,
      goldMined: 0,
      argonMined: 0,
      buildingsConstructed: 0,
      evolutionsUnlocked: 0,
      relicsDrafted: 0,
      maxSkullsCleared: 0,
    },
    runHistory: [],
  };
}

export class SaveSystem {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (typeof localStorage === 'undefined') return createDefaultSaveData();
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultSaveData();
      const parsed = JSON.parse(raw);
      const def = createDefaultSaveData();
      return {
        ...def,
        ...parsed,
        lifetimeStats: { ...def.lifetimeStats, ...(parsed.lifetimeStats || {}) },
        sanctumLevels: { ...(parsed.sanctumLevels || {}) },
        unlockedHeroes: Array.from(new Set([...def.unlockedHeroes, ...(parsed.unlockedHeroes || [])])),
        unlockedRealms: [0, 1, 2, 3, 4],
      };
    } catch {
      return createDefaultSaveData();
    }
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      }
    } catch {
      // Ignore storage quota errors in private mode
    }
  }

  resetAll() {
    this.data = createDefaultSaveData();
    this.clearCheckpoint();
    this.save();
    return this.data;
  }

  exportJson() {
    return JSON.stringify(this.data, null, 2);
  }

  importJson(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid save JSON');
    const def = createDefaultSaveData();
    this.data = {
      ...def,
      ...parsed,
      lifetimeStats: { ...def.lifetimeStats, ...(parsed.lifetimeStats || {}) },
      sanctumLevels: { ...(parsed.sanctumLevels || {}) },
    };
    this.save();
    return this.data;
  }

  getSanctumStats() {
    return computeSanctumStats(this.data.sanctumLevels);
  }

  buySanctumUpgrade(upgradeId) {
    const upg = SANCTUM_UPGRADES.find((u) => u.id === upgradeId);
    if (!upg) return { ok: false, reason: '존재하지 않는 성소 특성입니다.' };
    const currentLv = this.data.sanctumLevels[upgradeId] || 0;
    if (currentLv >= upg.maxLevel) return { ok: false, reason: '이미 최고 단계에 도달했습니다.' };
    const cost = getSanctumUpgradeCost(upg, currentLv);
    if (this.data.crowns < cost) return { ok: false, reason: '별빛 왕관(👑)이 부족합니다.' };

    this.data.crowns -= cost;
    this.data.sanctumLevels[upgradeId] = currentLv + 1;
    this.save();
    return { ok: true, newLevel: currentLv + 1, cost };
  }

  refundSanctumUpgrades() {
    let refunded = 0;
    for (const upg of SANCTUM_UPGRADES) {
      const lv = this.data.sanctumLevels[upg.id] || 0;
      for (let i = 0; i < lv; i++) {
        refunded += getSanctumUpgradeCost(upg, i);
      }
    }
    this.data.sanctumLevels = {};
    this.data.crowns += refunded;
    this.save();
    return refunded;
  }

  unlockHero(heroId) {
    const hero = HEROES.find((h) => h.id === heroId);
    if (!hero) return { ok: false, reason: '영웅을 찾을 수 없습니다.' };
    if (this.data.unlockedHeroes.includes(heroId)) return { ok: true, already: true };
    if (this.data.crowns < hero.unlockCost) {
      return { ok: false, reason: `별빛 왕관이 부족합니다 (${hero.unlockCost} 👑 필요)` };
    }
    this.data.crowns -= hero.unlockCost;
    this.data.unlockedHeroes.push(heroId);
    this.save();
    return { ok: true };
  }

  discoverEnemy(enemyId) {
    if (!this.data.discoveredEnemies.includes(enemyId)) {
      this.data.discoveredEnemies.push(enemyId);
      this.save();
    }
  }

  discoverRelic(relicId) {
    if (!this.data.discoveredRelics.includes(relicId)) {
      this.data.discoveredRelics.push(relicId);
      this.save();
    }
  }

  recordRunEnd(summary) {
    const st = this.data.lifetimeStats;
    st.runsPlayed += 1;
    if (summary.victory) {
      st.victories += 1;
      if (!this.data.clearedRealms.includes(summary.realmIndex)) {
        this.data.clearedRealms.push(summary.realmIndex);
      }
      this.data.highestRealmCleared = Math.max(this.data.highestRealmCleared, summary.realmIndex);
      st.maxSkullsCleared = Math.max(st.maxSkullsCleared, (summary.activeSkulls || []).length);
    }
    st.wavesSurvived += summary.wave || 0;
    st.enemiesSlain += summary.enemiesSlain || 0;
    st.bossesSlain += summary.bossesDefeated || 0;
    st.goldMined += summary.goldMined || 0;
    st.argonMined += summary.argonMined || 0;
    st.buildingsConstructed += summary.buildingsConstructed || 0;
    st.evolutionsUnlocked += summary.evolutionsCount || 0;
    st.relicsDrafted += (summary.ownedRelics || []).length;

    if (summary.isEndless) {
      this.data.bestEndlessWave = Math.max(this.data.bestEndlessWave, summary.wave || 0);
    }
    this.data.bestScore = Math.max(this.data.bestScore, summary.score || 0);

    // Award Crowns
    const earnedCrowns = Math.max(15, Math.round(summary.crownsEarned || 0));
    this.data.crowns += earnedCrowns;
    this.data.totalCrownsEarned += earnedCrowns;

    // Evaluate new achievements
    const newlyUnlocked = this.evaluateAchievements(summary);

    // Record history entry (keep top/recent 25)
    this.data.runHistory.unshift({
      id: `run_${Date.now()}`,
      date: new Date().toISOString(),
      realmIndex: summary.realmIndex,
      realmName: summary.realmName,
      heroId: summary.heroId,
      heroName: summary.heroName,
      victory: summary.victory,
      isEndless: summary.isEndless,
      wave: summary.wave,
      score: summary.score,
      enemiesSlain: summary.enemiesSlain,
      goldMined: summary.goldMined,
      bossesDefeated: summary.bossesDefeated,
      crownsEarned: earnedCrowns,
      seed: summary.seed,
      activeSkulls: summary.activeSkulls || [],
      ownedRelics: (summary.ownedRelics || []).slice(0, 8),
    });
    if (this.data.runHistory.length > 25) {
      this.data.runHistory.length = 25;
    }

    this.clearCheckpoint();
    this.save();
    return { earnedCrowns, newlyUnlocked };
  }

  evaluateAchievements(latestRun = null) {
    const newly = [];
    const st = this.data.lifetimeStats;
    const totalSanctumLevels = Object.values(this.data.sanctumLevels).reduce((a, b) => a + b, 0);

    for (const ach of ACHIEVEMENTS) {
      if (this.data.unlockedAchievements.includes(ach.id)) continue;
      let passed = false;

      // Flexible condition checks across all 30 achievements
      const id = ach.id;
      if (id.includes('first_blood') || id.includes('slayer_1')) passed = st.enemiesSlain >= 50;
      else if (id.includes('slayer_2') || id.includes('centurion')) passed = st.enemiesSlain >= 300;
      else if (id.includes('slayer_3') || id.includes('thousand')) passed = st.enemiesSlain >= 1000;
      else if (id.includes('slayer_4') || id.includes('legion')) passed = st.enemiesSlain >= 3000;
      else if (id.includes('realm_1') || id.includes('solaria')) passed = this.data.clearedRealms.includes(0);
      else if (id.includes('realm_2') || id.includes('frostpeak')) passed = this.data.clearedRealms.includes(1);
      else if (id.includes('realm_3') || id.includes('crimson') || id.includes('oasis')) passed = this.data.clearedRealms.includes(2);
      else if (id.includes('realm_4') || id.includes('ashen') || id.includes('forge')) passed = this.data.clearedRealms.includes(3);
      else if (id.includes('realm_5') || id.includes('astral') || id.includes('malakor')) passed = this.data.clearedRealms.includes(4);
      else if (id.includes('all_realms') || id.includes('emperor')) passed = this.data.clearedRealms.length >= 5;
      else if (id.includes('gold_1') || id.includes('merchant')) passed = st.goldMined >= 500;
      else if (id.includes('gold_2') || id.includes('tycoon')) passed = st.goldMined >= 2500;
      else if (id.includes('gold_3') || id.includes('midas')) passed = st.goldMined >= 10000;
      else if (id.includes('evol') || id.includes('architect')) passed = st.evolutionsUnlocked >= 3;
      else if (id.includes('relic') || id.includes('collector')) passed = this.data.discoveredRelics.length >= 10;
      else if (id.includes('skull_1') || id.includes('challenger')) passed = st.maxSkullsCleared >= 1;
      else if (id.includes('skull_3') || id.includes('hell')) passed = st.maxSkullsCleared >= 3;
      else if (id.includes('skull_6') || id.includes('deity')) passed = st.maxSkullsCleared >= 6;
      else if (id.includes('endless_15')) passed = this.data.bestEndlessWave >= 15;
      else if (id.includes('endless_25')) passed = this.data.bestEndlessWave >= 25;
      else if (id.includes('sanctum')) passed = totalSanctumLevels >= 5;
      else if (id.includes('boss')) passed = st.bossesSlain >= 1;
      else if (latestRun && latestRun.victory && st.victories >= 1) passed = true;

      if (passed) {
        this.data.unlockedAchievements.push(ach.id);
        const reward = ach.rewardCrowns || 40;
        this.data.crowns += reward;
        this.data.totalCrownsEarned += reward;
        newly.push(ach);
      }
    }
    return newly;
  }

  saveCheckpoint(checkpointState) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpointState));
      }
    } catch {
      // Ignore
    }
  }

  loadCheckpoint() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  clearCheckpoint() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(CHECKPOINT_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

export const saveSystem = new SaveSystem();
export default saveSystem;
