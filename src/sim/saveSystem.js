/**
 * ARGONIA: Crown of the Spire
 * 영구 성장 데이터, 업적, 도감, 원정 기록, 중간 저장.
 */

import { SANCTUM_UPGRADES, ACHIEVEMENTS, computeSanctumStats, getSanctumUpgradeCost } from '../data/sanctum.js';
import { HEROES } from '../data/heroes.js';

const STORAGE_KEY = 'argonia_crown_of_the_spire_save_v1';
const CHECKPOINT_KEY = 'argonia_active_run_checkpoint_v1';

export function createDefaultSaveData() {
  return {
    version: 1,
    crowns: 120, // 성소 특성을 바로 하나 사 볼 수 있게 주는 시작 왕관
    totalCrownsEarned: 120,
    unlockedHeroes: ['arthuria', 'kaelen'],
    unlockedRealms: [0, 1, 2, 3, 4], // 다섯 영토를 처음부터 고를 수 있습니다.
    clearedRealms: [],
    highestRealmCleared: -1,
    bestEndlessWave: 0,
    bestScore: 0,
    selectedHeroId: 'arthuria',
    selectedRealmIndex: 0,
    activeSkulls: [],
    sanctumLevels: {},
    unlockedAchievements: [],
    heroesWon: [],
    discoveredRelics: ['solar_tithe', 'ballista_tension_spring', 'permafrost_core'],
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
    if (!upg) return { ok: false, reason: '없는 특성입니다.' };
    const currentLv = this.data.sanctumLevels[upgradeId] || 0;
    if (currentLv >= upg.maxLevel) return { ok: false, reason: '이미 최고 단계입니다.' };
    const cost = getSanctumUpgradeCost(upg, currentLv);
    if (this.data.crowns < cost) return { ok: false, reason: '별빛 왕관이 부족합니다.' };

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
    if (!hero) return { ok: false, reason: '없는 군주입니다.' };
    if (this.data.unlockedHeroes.includes(heroId)) return { ok: true, already: true };
    if (this.data.crowns < hero.unlockCost) {
      return { ok: false, reason: `별빛 왕관이 부족합니다 (${hero.unlockCost}개 필요)` };
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
      if (summary.heroId && !this.data.heroesWon.includes(summary.heroId)) {
        this.data.heroesWon.push(summary.heroId);
      }
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

    // 왕관 지급
    const earnedCrowns = Math.max(15, Math.round(summary.crownsEarned || 0));
    this.data.crowns += earnedCrowns;
    this.data.totalCrownsEarned += earnedCrowns;

    // 업적 확인
    const newlyUnlocked = this.evaluateAchievements(summary);

    // 최근 25건만 남깁니다.
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
    const run = latestRun || {};
    const relics = run.ownedRelics || [];
    const bestSet = (run.activeSets || []).reduce((max, s) => Math.max(max, s.count || 0), 0);
    const legendaries = relics.filter((r) => r.rarity === 'legendary').length;
    const cursed = relics.filter((r) => r.rarity === 'cursed').length;
    const skulls = (run.activeSkulls || []).length;

    // 조건은 업적 id별로 하나씩. 모두 실제로 집계되는 값만 봅니다.
    const conditions = {
      ach_first_dawn: () => st.wavesSurvived >= 1,
      ach_solaria: () => this.data.clearedRealms.includes(0),
      ach_frostpeak: () => this.data.clearedRealms.includes(1),
      ach_crimson: () => this.data.clearedRealms.includes(2),
      ach_ashen: () => this.data.clearedRealms.includes(3),
      ach_astral: () => this.data.clearedRealms.includes(4),
      ach_all_realms: () => this.data.clearedRealms.length >= 5,
      ach_endless_15: () => this.data.bestEndlessWave >= 15,
      ach_endless_30: () => this.data.bestEndlessWave >= 30,
      ach_gold_run: () => (run.goldMined || 0) >= 1000,
      ach_argon_run: () => (run.argonMined || 0) >= 400,
      ach_build_18: () => (run.buildingsConstructed || 0) >= 18,
      ach_evo_5: () => (run.evolutionsCount || 0) >= 5,
      ach_gold_total: () => st.goldMined >= 10000,
      ach_slayer_500: () => st.enemiesSlain >= 500,
      ach_slayer_2500: () => st.enemiesSlain >= 2500,
      ach_boss_10: () => st.bossesSlain >= 10,
      ach_score_50k: () => this.data.bestScore >= 50000,
      ach_victories_5: () => st.victories >= 5,
      ach_hero_all: () => this.data.heroesWon.length >= 4,
      ach_synergy_4: () => bestSet >= 4,
      ach_synergy_6: () => bestSet >= 6,
      ach_relic_legend_3: () => legendaries >= 3,
      ach_cursed_2: () => Boolean(run.victory) && cursed >= 2,
      ach_relic_10: () => relics.length >= 10,
      ach_skull_1: () => Boolean(run.victory) && skulls >= 1,
      ach_skull_3: () => Boolean(run.victory) && skulls >= 3,
      ach_skull_6: () => Boolean(run.victory) && skulls >= 6,
      ach_sanctum_25: () => totalSanctumLevels >= 25,
      ach_runs_10: () => st.runsPlayed >= 10
    };

    for (const ach of ACHIEVEMENTS) {
      if (this.data.unlockedAchievements.includes(ach.id)) continue;
      const check = conditions[ach.id];
      if (!check || !check()) continue;

      this.data.unlockedAchievements.push(ach.id);
      const reward = ach.rewardCrowns || 40;
      this.data.crowns += reward;
      this.data.totalCrownsEarned += reward;
      newly.push(ach);
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
