/**
 * Headless Monte-Carlo Campaign & Economy Balance Simulator for ARGONIA
 */

import { GameEngine } from '../src/sim/gameEngine.js';
import { REALMS } from '../src/data/realms.js';
import { HEROES } from '../src/data/heroes.js';

function simulateCampaignRun(realmIndex = 0, heroId = 'arthuria') {
  const engine = new GameEngine();
  engine.startRun({ realmIndex, heroId });

  while (engine.phase !== 'victory' && engine.phase !== 'gameover') {
    if (engine.phase === 'relic_draft') {
      engine.pickRelic(engine.pendingRelicChoices[0]?.id);
    }
    if (engine.phase === 'day') {
      // Spend all affordable gold/argon using smart architect
      for (let k = 0; k < 15; k++) {
        const res = engine.autoBuildSmart();
        if (!res.ok) break;
      }
      engine.startNightWave();
    }
    let steps = 0;
    while (engine.phase === 'night' && steps < 3000) {
      engine.update(0.1, { moveX: 0, moveZ: 0 });
      if (engine.enemies.length > 0 && !engine.hero.isDead) {
        const e = engine.enemies[0];
        engine.hero.targetX = e.x;
        engine.hero.targetZ = e.z;
        if (engine.hero.skillCooldowns.q <= 0) engine.castHeroSkill('q', e);
        if (engine.hero.skillCooldowns.e <= 0) engine.castHeroSkill('e', e);
        if (engine.hero.skillCooldowns.r <= 0) engine.castHeroSkill('r', e);
      }
      steps++;
    }
    if (steps >= 3000) break;
  }

  return {
    realm: REALMS[realmIndex].name,
    hero: heroId,
    victory: engine.phase === 'victory',
    waveReached: engine.wave,
    score: engine.score,
    slain: engine.enemiesSlain,
    goldMined: engine.goldMinedTotal,
  };
}

console.log('=== ARGONIA HEADLESS BALANCE SIMULATION ===');
for (let r = 0; r < REALMS.length; r++) {
  const hero = HEROES[r % HEROES.length].id;
  const res = simulateCampaignRun(r, hero);
  console.log(
    `[Realm ${r + 1}] ${res.realm} | Hero: ${res.hero} | Outcome: ${res.victory ? 'VICTORY' : 'DEFEAT'} (Wave ${res.waveReached}) | Slain: ${res.slain} | Gold: ${res.goldMined} | Score: ${res.score}`
  );
}
