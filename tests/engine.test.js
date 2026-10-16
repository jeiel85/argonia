import test from 'node:test';
import assert from 'node:assert/strict';

import { HEROES, getHeroById } from '../src/data/heroes.js';
import { BUILDINGS, BUILDING_LIST, getBuildingTierSpec } from '../src/data/buildings.js';
import { ENEMIES, ENEMY_LIST } from '../src/data/enemies.js';
import { REALMS, generateWaveDescriptor } from '../src/data/realms.js';
import { RELICS, SYNERGY_SETS, computeRelicModifiers } from '../src/data/relics.js';
import { SANCTUM_UPGRADES, MUTATOR_SKULLS, ACHIEVEMENTS, computeSanctumStats, computeSkullModifiers } from '../src/data/sanctum.js';
import { GameEngine } from '../src/sim/gameEngine.js';
import { SaveSystem } from '../src/sim/saveSystem.js';

test('Data integrity: 4 Heroes, 10 Buildings (with 20 Evolutions), 23 Enemies/Bosses, 5 Realms, 48 Relics, 24 Sanctum upgrades', () => {
  assert.equal(HEROES.length, 4);
  for (const h of HEROES) {
    assert.ok(h.skills.q && h.skills.e && h.skills.r && h.skills.dash);
  }

  assert.equal(BUILDING_LIST.length, 10);
  let totalEvolutions = 0;
  for (const b of BUILDING_LIST) {
    assert.equal(b.tiers.length, 3, `${b.id} must have 3 tiers`);
    assert.equal(b.evolutions.length, 2, `${b.id} must have 2 branching evolutions`);
    totalEvolutions += b.evolutions.length;
  }
  assert.equal(totalEvolutions, 20);

  assert.ok(ENEMY_LIST.length >= 23);
  const bosses = ENEMY_LIST.filter((e) => e.isBoss);
  assert.equal(bosses.length, 5);

  assert.equal(REALMS.length, 5);
  for (let i = 0; i < REALMS.length; i++) {
    const r = REALMS[i];
    assert.ok(r.sockets.length >= 20, `Realm ${r.id} has strategic sockets`);
    assert.ok(r.spawnPortals.length >= 3, `Realm ${r.id} has spawn portals`);
    const wave1 = generateWaveDescriptor(i, 1, false);
    const waveFinal = generateWaveDescriptor(i, r.totalWaves, false);
    assert.equal(wave1.isBossWave, false);
    assert.equal(waveFinal.isBossWave, true);
  }

  assert.ok(RELICS.length >= 48);
  assert.equal(Object.keys(SYNERGY_SETS).length, 6);
  assert.equal(SANCTUM_UPGRADES.length, 24);
  assert.equal(MUTATOR_SKULLS.length, 6);
  assert.equal(ACHIEVEMENTS.length, 30);
});

test('Relic Synergy Engine aggregates modifiers and activates 2/4/6 piece set bonuses', () => {
  const solarRelics = RELICS.filter((r) =>
    Array.isArray(r.synergy) ? r.synergy.includes('solar_crown') : r.synergy === 'solar_crown'
  ).map((r) => r.id);

  assert.ok(solarRelics.length >= 4, 'At least 4 Solar Crown relics exist');
  const res = computeRelicModifiers(solarRelics.slice(0, 4), 0);
  assert.ok(res.mods.goldIncomeMult > 0);
  const solarSet = res.activeSets.find((s) => s.id === 'solar_crown');
  assert.ok(solarSet, 'Solar Crown synergy set should be active');
  assert.ok(solarSet.count >= 4);
});

test('GameEngine headless simulation: Building, Upgrading, Evolution, Hero Skills, Night Combat & Dawn Transition', () => {
  const save = new SaveSystem();
  const engine = new GameEngine({ saveSystem: save });

  engine.startRun({
    realmIndex: 0,
    heroId: 'arthuria',
    isEndless: false,
    activeSkulls: ['skull_horde'],
  });

  assert.equal(engine.phase, 'day');
  assert.ok(engine.buildings.has('citadel_core'));

  // Grant extra test resources to verify Tier 1 -> 2 -> 3 -> Evolution pipeline
  engine.gold = 1000;
  engine.argon = 100;

  // Build Gold Mine on gold_1 and upgrade to Evolution
  assert.equal(engine.buildOrUpgradeSocket('gold_1', 'gold_mine').ok, true);
  assert.equal(engine.buildings.get('gold_1').tier, 1);

  assert.equal(engine.buildOrUpgradeSocket('gold_1').ok, true);
  assert.equal(engine.buildings.get('gold_1').tier, 2);

  assert.equal(engine.buildOrUpgradeSocket('gold_1').ok, true);
  assert.equal(engine.buildings.get('gold_1').tier, 3);

  assert.equal(engine.buildOrUpgradeSocket('gold_1', null, 'mine_alchemical_mint').ok, true);
  assert.equal(engine.buildings.get('gold_1').evolutionId, 'mine_alchemical_mint');

  // Build Barracks and verify allied troops spawn
  assert.equal(engine.buildOrUpgradeSocket('tac_n2', 'barracks').ok, true);
  assert.ok(engine.troops.length >= 3, 'Barracks should spawn squad troops');

  // Build Archer Tower & Arcane Obelisk
  assert.equal(engine.buildOrUpgradeSocket('tac_n1', 'archer_tower').ok, true);
  assert.equal(engine.buildOrUpgradeSocket('tac_c2', 'arcane_obelisk').ok, true);

  // Start Night 1
  assert.equal(engine.startNightWave(), true);
  assert.equal(engine.phase, 'night');

  // Cast Hero Q, E, R skills and Dash
  assert.equal(engine.castHeroSkill('q'), true);
  assert.equal(engine.castHeroSkill('e'), true);
  assert.equal(engine.castHeroSkill('r'), true);
  assert.equal(engine.triggerHeroDash(0, -1), true);

  // Step simulation until Wave 1 completes
  let ticks = 0;
  while (engine.phase === 'night' && ticks < 1200) {
    engine.update(0.1, { moveX: 0, moveZ: 0 });
    // Periodically recast Q when off cooldown
    if (engine.hero.skillCooldowns.q <= 0 && engine.enemies.length > 0) {
      engine.castHeroSkill('q');
    }
    ticks++;
  }

  assert.equal(engine.phase, 'relic_draft', 'Surviving Night 1 should trigger Dawn and open Relic Draft');
  assert.equal(engine.wave, 2);
  assert.equal(engine.pendingRelicChoices.length, 3);

  // Pick a relic and return to Day 2
  engine.pickRelic(engine.pendingRelicChoices[0].id);
  assert.equal(engine.phase, 'day');
  assert.equal(engine.ownedRelicIds.length, 1);
});
