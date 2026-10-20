/**
 * ARGONIA: Crown of the Spire
 * 앱 진입점. 3D 뷰포트, HUD, 사령부 화면을 연결합니다.
 */

import * as THREE from 'three';
import { HEROES, getHeroById } from './data/heroes.js';
import { BUILDINGS, BUILDING_LIST, getBuildingSpec, getBuildingTierSpec } from './data/buildings.js';
import { ENEMIES, ENEMY_LIST, getEnemySpec } from './data/enemies.js';
import { REALMS } from './data/realms.js';
import { RELICS, SYNERGY_SETS } from './data/relics.js';
import {
  SANCTUM_UPGRADES,
  SANCTUM_BRANCHES,
  MUTATOR_SKULLS,
  ACHIEVEMENTS,
  getSanctumUpgradeCost,
  computeSkullModifiers,
} from './data/sanctum.js';
import { SceneManager } from './graphics/sceneManager.js';
import { VfxManager } from './graphics/vfxManager.js';
import * as meshFactory from './graphics/proceduralMeshes.js';
import { soundEngine } from './audio/soundEngine.js';
import { saveSystem } from './sim/saveSystem.js';
import { GameEngine } from './sim/gameEngine.js';
import {
  generateChroniclePoster,
  downloadChroniclePoster,
  buildShareText,
  BattleClipRecorder,
} from './share/viralExporter.js';
import { PwaManager } from './pwa/pwaManager.js';

// 도감 카드와 유물 카드에 쓰는 한글 표기
const CATEGORY_KO = { core: '본진', economy: '경제', defense: '방어', army: '병력', fortress: '성벽' };
const RARITY_KO = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설', cursed: '저주' };

class ArgoniaApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.worldMarkersLayer = document.getElementById('world-markers-layer');
    this.floatingTextLayer = document.getElementById('floating-text-layer');
    this.toastContainer = document.getElementById('toast-container');

    this.sceneManager = new SceneManager(this.canvas);
    this.vfxManager = new VfxManager(this.sceneManager.scene, this.floatingTextLayer);

    this.selectedRealmIndex = saveSystem.data.selectedRealmIndex || 0;
    this.selectedHeroId = saveSystem.data.selectedHeroId || 'arthuria';
    this.activeSkulls = new Set(saveSystem.data.activeSkulls || []);
    this.isEndlessMode = false;
    this.currentCodexCategory = 'buildings';
    this.lastRunSummary = null;

    this.keysDown = new Set();
    this.isLeftMoving = false;
    this.socketBadgeElements = new Map();

    // 쓰론폴식 건설: 군주가 부지 앞에 서야 지을 수 있습니다.
    this.nearSocketId = null;
    this.buildMenuSocketId = null;
    this.pendingSocketId = null;
    this.isAltDown = false;
    this.buildMenuSize = null;
    this.isTitleScreen = true;

    this.clipRecorder = new BattleClipRecorder((isRecording, sec) => {
      const btn = document.getElementById('btn-rec-clip');
      if (!btn) return;
      if (isRecording) {
        btn.classList.add('recording');
        btn.textContent = `● ${sec}s`;
      } else {
        btn.classList.remove('recording');
        btn.textContent = 'REC';
        this.showToast('전투 영상을 저장했습니다.', 'info');
      }
    });

    this.engine = new GameEngine({
      sceneManager: this.sceneManager,
      vfxManager: this.vfxManager,
      meshFactory,
      soundEngine,
      saveSystem,
      onStateChange: (snap) => this.syncHud(snap),
      onRelicDraftReady: (choices, rerolls) => this.openRelicDraftModal(choices, rerolls),
      onRunFinished: (summary) => this.openRunEndModal(summary),
      onNotification: (msg, tone) => this.showToast(msg, tone),
    });

    this.bindEvents();
    this.renderHubAll();

    this.pwaManager = new PwaManager({
      onNotify: (msg, tone) => this.showToast(msg, tone),
    });
    this.pwaManager.init();

    // Load a live 3D background preview of the selected realm & hero right on startup!
    this.engine.startRun({
      realmIndex: this.selectedRealmIndex,
      heroId: this.selectedHeroId,
      isEndless: false,
      activeSkulls: Array.from(this.activeSkulls),
    });
    this.rebuildSocketBadges();

    // 타이틀 뒤로 3D 배경을 먼저 띄웁니다.
    this.engine.isPaused = true;
    document.getElementById('ingame-hud')?.classList.add('hidden');
    this.worldMarkersLayer?.classList.add('hidden');
    document.getElementById('command-hub-modal')?.classList.add('hidden');
    document.getElementById('title-overlay')?.classList.remove('hidden');

    if (new URLSearchParams(window.location.search).get('autostart') === '1') {
      this.startGameFromTitle();
    }

    this.lastFrameTime = performance.now();
    requestAnimationFrame((now) => this.loop(now));
  }

  startGameFromTitle() {
    const titleOverlay = document.getElementById('title-overlay');
    if (titleOverlay) {
      titleOverlay.classList.add('fade-out');
      setTimeout(() => {
        titleOverlay.classList.add('hidden');
        titleOverlay.classList.remove('fade-out');
      }, 400);
    }
    document.getElementById('ingame-hud')?.classList.remove('hidden');
    this.worldMarkersLayer?.classList.remove('hidden');
    this.engine.isPaused = false;
    soundEngine.unlock();
    soundEngine.playSfx('ui_click');

    const guide = document.getElementById('tactical-guide-banner');
    if (guide) {
      guide.classList.remove('hidden');
      setTimeout(() => {
        guide.classList.add('fade-out');
        setTimeout(() => guide.classList.add('hidden'), 450);
      }, 4500);
    }

    this.syncHud(this.engine.getHudSnapshot());
    // 타이틀 화면에서 돌던 카메라를 정면으로 되돌립니다.
    this.isTitleScreen = false;
    this.sceneManager.cameraYaw = 0;
  }

  showToast(message, tone = 'gold') {
    if (!this.toastContainer) return;
    const item = document.createElement('div');
    item.className = `toast-item ${tone}`;
    item.textContent = message;
    this.toastContainer.appendChild(item);
    setTimeout(() => {
      item.remove();
    }, 3400);
  }

  // =========================================================================
  // 입력 처리
  // =========================================================================
  bindEvents() {
    const unlockAudioOnce = () => {
      soundEngine.unlock();
    };
    window.addEventListener('pointerdown', unlockAudioOnce, { once: true });
    window.addEventListener('keydown', unlockAudioOnce, { once: true });

    // Hub Navigation Tabs
    document.querySelectorAll('.hub-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playSfx('ui_click');
        document.querySelectorAll('.hub-tab').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.hub-tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add('active');
        this.renderHubAll();
      });
    });

    // Codex Category Tabs
    document.querySelectorAll('.codex-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playSfx('ui_click');
        document.querySelectorAll('.codex-cat-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCodexCategory = btn.dataset.cat;
        this.renderCodexTab();
      });
    });

    // Endless checkbox
    document.getElementById('chk-endless-mode')?.addEventListener('change', (e) => {
      this.isEndlessMode = e.target.checked;
      this.updateLaunchButtonLabel();
    });

    // Start Expedition CTA
    document.getElementById('btn-start-expedition')?.addEventListener('click', () => {
      soundEngine.playSfx('horn_night_start');
      this.launchNewExpedition();
    });

    // Resume Saved Checkpoint CTA
    document.getElementById('btn-resume-checkpoint')?.addEventListener('click', () => {
      const cp = saveSystem.loadCheckpoint();
      if (cp) {
        soundEngine.playSfx('ui_click');
        this.engine.resumeFromCheckpoint(cp);
        this.rebuildSocketBadges();
        this.closeCommandHub();
      }
    });

    // Close Hub & Resume Battle
    document.getElementById('btn-close-hub-resume')?.addEventListener('click', () => {
      soundEngine.playSfx('ui_click');
      this.closeCommandHub();
    });

    document.getElementById('btn-open-hub')?.addEventListener('click', () => {
      soundEngine.playSfx('ui_click');
      this.openCommandHub(false);
    });

    // Sanctum Refund
    document.getElementById('btn-refund-sanctum')?.addEventListener('click', () => {
      const refunded = saveSystem.refundSanctumUpgrades();
      soundEngine.playSfx('gold_collect');
      this.showToast(`성소 특성을 초기화했습니다. 별빛 왕관 ${refunded}개를 돌려받았습니다.`, 'gold');
      this.renderHubAll();
    });

    // Save Export / Import
    document.getElementById('btn-export-save')?.addEventListener('click', () => {
      const json = saveSystem.exportJson();
      navigator.clipboard?.writeText(json);
      this.showToast('세이브 데이터를 클립보드에 복사했습니다.', 'info');
    });

    document.getElementById('btn-import-save')?.addEventListener('click', () => {
      const raw = window.prompt('백업한 세이브 데이터를 붙여넣으세요.');
      if (!raw) return;
      try {
        saveSystem.importJson(raw);
        this.showToast('세이브 데이터를 복원했습니다.', 'gold');
        this.renderHubAll();
      } catch {
        this.showToast('JSON 형식이 올바르지 않습니다.', 'danger');
      }
    });

    // Title Screen Quick Actions
    document.getElementById('btn-quick-play')?.addEventListener('click', () => {
      this.startGameFromTitle();
    });

    document.getElementById('btn-title-expedition')?.addEventListener('click', () => {
      soundEngine.playSfx('ui_click');
      document.getElementById('title-overlay')?.classList.add('hidden');
      this.openCommandHub(false);
      document.querySelector('[data-tab="tab-expedition"]')?.click();
    });

    document.getElementById('btn-title-codex')?.addEventListener('click', () => {
      soundEngine.playSfx('ui_click');
      document.getElementById('title-overlay')?.classList.add('hidden');
      this.openCommandHub(false);
      document.querySelector('[data-tab="tab-codex"]')?.click();
    });

    // In-Game Top Utility Buttons
    document.getElementById('btn-audio-mute')?.addEventListener('click', (e) => {
      const muted = soundEngine.toggleMute();
      const textSpan = e.currentTarget.querySelector('span');
      if (textSpan) textSpan.textContent = muted ? '소리 끔' : '소리 켬';
    });

    document.getElementById('btn-rec-clip')?.addEventListener('click', () => {
      if (this.clipRecorder.isRecording()) {
        this.clipRecorder.stop();
      } else {
        this.clipRecorder.start(this.canvas, 15000);
        this.showToast('녹화를 시작했습니다. 최대 15초, 다시 누르면 저장됩니다.', 'info');
      }
    });

    document.getElementById('btn-snap-poster')?.addEventListener('click', () => {
      soundEngine.playSfx('ui_click');
      const snap = this.engine.getHudSnapshot();
      downloadChroniclePoster(
        {
          victory: snap.phase === 'victory',
          isEndless: snap.isEndless,
          realmName: snap.realm.name,
          heroName: snap.hero?.name || '성군 아르투리아',
          heroIcon: snap.hero?.icon || '👑',
          wave: snap.wave,
          score: snap.score,
          enemiesSlain: snap.enemiesSlain,
          goldMined: this.engine.goldMinedTotal,
          bossesDefeated: this.engine.bossesDefeated,
          seed: snap.seed,
          activeSkulls: this.engine.activeSkulls,
          ownedRelics: snap.ownedRelics,
          activeSets: snap.activeSets,
        },
        this.canvas
      );
      this.showToast('연대기 포스터를 저장했습니다.', 'gold');
    });

    document.getElementById('btn-zen-mode')?.addEventListener('click', () => {
      document.getElementById('ingame-hud')?.classList.toggle('zen-hidden');
      this.worldMarkersLayer?.classList.toggle('hidden');
    });

    // Skill Buttons
    ['q', 'e', 'r'].forEach((slot) => {
      document.getElementById(`btn-skill-${slot}`)?.addEventListener('click', () => {
        this.engine.castHeroSkill(slot, this.sceneManager.mouseWorld);
      });
    });

    document.getElementById('btn-skill-dash')?.addEventListener('click', () => {
      this.engine.triggerHeroDash(0, 0);
    });

    document.getElementById('btn-skill-rally')?.addEventListener('click', () => {
      if (this.engine.hero) {
        this.engine.commandRally(this.engine.hero.x, this.engine.hero.z);
      }
    });

    // Call Night Button
    document.getElementById('btn-call-night')?.addEventListener('click', () => {
      if (this.engine.phase === 'day') {
        this.engine.startNightWave();
      }
    });

    // Relic Reroll Button
    document.getElementById('btn-reroll-relics')?.addEventListener('click', () => {
      soundEngine.playSfx('ui_click');
      this.engine.triggerRelicDraft(true);
    });

    // Run End Modal Actions
    document.getElementById('btn-endless-continue')?.addEventListener('click', () => {
      document.getElementById('run-end-modal')?.classList.add('hidden');
      this.engine.continueIntoEndlessMode();
    });

    document.getElementById('btn-download-poster')?.addEventListener('click', () => {
      if (this.lastRunSummary) {
        downloadChroniclePoster(this.lastRunSummary, this.canvas);
        this.showToast('연대기 포스터를 저장했습니다.', 'gold');
      }
    });

    document.getElementById('btn-copy-threads')?.addEventListener('click', () => {
      if (this.lastRunSummary) {
        const text = buildShareText(this.lastRunSummary);
        navigator.clipboard?.writeText(text);
        this.showToast('공유 문구를 클립보드에 복사했습니다.', 'gold');
      }
    });

    document.getElementById('btn-return-hub')?.addEventListener('click', () => {
      document.getElementById('run-end-modal')?.classList.add('hidden');
      this.openCommandHub(false);
    });

    // 왼쪽 버튼을 누른 채 끌면 군주가 마우스를 따라갑니다.
    this.canvas.addEventListener('pointermove', (e) => {
      const worldPt = this.sceneManager.updateMouseRay(e.clientX, e.clientY);
      if (this.isLeftMoving && this.engine.hero && !this.engine.hero.isDead) {
        this.pendingSocketId = null;
        this.engine.hero.targetX = Math.max(-39, Math.min(39, worldPt.x));
        this.engine.hero.targetZ = Math.max(-39, Math.min(39, worldPt.z));
      }
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const worldPt = this.sceneManager.updateMouseRay(e.clientX, e.clientY);
      const hero = this.engine.hero;
      if (!hero || hero.isDead) return;

      // 부지를 누르면 그 앞까지 걸어갑니다. 도착하면 건설 메뉴가 열립니다.
      let closestSock = null;
      let bestDist = 3.5;
      for (const s of this.engine.sockets) {
        const d = Math.hypot(s.x - worldPt.x, s.z - worldPt.z);
        if (d < bestDist) {
          bestDist = d;
          closestSock = s;
        }
      }

      this.isLeftMoving = true;
      if (closestSock) {
        soundEngine.playSfx('ui_click');
        // 도착했을 때 메뉴를 열어 두도록 예약합니다. 밤에는 예약하지 않습니다.
        this.pendingSocketId = this.engine.phase === 'day' ? closestSock.id : null;
        hero.targetX = closestSock.x;
        hero.targetZ = closestSock.z;
      } else {
        this.pendingSocketId = null;
        hero.targetX = Math.max(-39, Math.min(39, worldPt.x));
        hero.targetZ = Math.max(-39, Math.min(39, worldPt.z));
        this.vfxManager.spawnShockwave(worldPt.x, worldPt.z, 1.1, 0xfde047, 0.22);
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.isLeftMoving = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const code = e.code;
      this.keysDown.add(code);

      // 직접 걸어가기 시작하면 '걸어서 도착하면 메뉴 열기' 예약은 취소합니다.
      if (/^(KeyW|KeyA|KeyS|KeyD|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(code)) {
        this.pendingSocketId = null;
      }

      // 키를 누르고 있을 때 메뉴가 여러 번 열리고 닫히거나, 연속 건설되지 않게 합니다.
      if (e.repeat) return;

      const titleOverlay = document.getElementById('title-overlay');
      if (titleOverlay && !titleOverlay.classList.contains('hidden')) {
        if (code === 'Space' || code === 'Enter') {
          e.preventDefault();
          this.startGameFromTitle();
          return;
        }
      }

      if (code === 'Escape') {
        if (this.buildMenuSocketId) {
          this.closeBuildMenu();
          return;
        }
        const hub = document.getElementById('command-hub-modal');
        if (hub?.classList.contains('hidden')) {
          this.openCommandHub(false);
        } else {
          this.closeCommandHub();
        }
        return;
      }

      // 사령부가 열려 있으면 전장 단축키는 듣지 않습니다.
      if (!document.getElementById('command-hub-modal')?.classList.contains('hidden')) return;

      // Alt를 누르고 있는 동안 모든 부지가 보입니다.
      if (code === 'AltLeft' || code === 'AltRight') {
        e.preventDefault();
        this.isAltDown = true;
        return;
      }

      // 건설 메뉴가 열려 있으면 숫자키로 고릅니다.
      if (this.buildMenuSocketId && /^Digit[1-9]$/.test(code)) {
        e.preventDefault();
        this.chooseBuildOption(Number(code.slice(5)) - 1);
        return;
      }

      if (code === 'KeyQ') this.engine.castHeroSkill('q', this.sceneManager.mouseWorld);
      else if (code === 'KeyE') this.engine.castHeroSkill('e', this.sceneManager.mouseWorld);
      else if (code === 'KeyR') this.engine.castHeroSkill('r', this.sceneManager.mouseWorld);
      else if (code === 'Space') {
        e.preventDefault();
        if (this.engine.phase === 'night') {
          this.engine.triggerHeroDash(0, 0);
        } else if (this.buildMenuSocketId) {
          this.closeBuildMenu();
        } else if (this.nearSocketId) {
          this.interactWithNearbyPlot();
        } else {
          this.showToast('건설 부지 앞에서 Space를 누르세요.', 'info');
        }
      } else if (code === 'KeyT') {
        if (this.engine.hero) {
          this.engine.commandRally(this.engine.hero.x, this.engine.hero.z);
        }
      } else if (code === 'Enter') {
        if (this.engine.phase === 'day') {
          this.engine.startNightWave();
        }
      } else if (code === 'KeyM') {
        document.getElementById('btn-audio-mute')?.click();
      } else if (code === 'KeyP') {
        document.getElementById('btn-snap-poster')?.click();
      } else if (code === 'KeyH') {
        document.getElementById('btn-zen-mode')?.click();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        this.isAltDown = false;
      }
    });

    // Alt를 누른 채 다른 곳을 눌러도 브라우저 메뉴가 뜨지 않게 합니다.
    window.addEventListener('blur', () => {
      this.isAltDown = false;
    });
  }

  // =========================================================================
  // 사령부 화면
  // =========================================================================
  openCommandHub(isInitialStartup = false) {
    this.engine.isPaused = true;
    this.pendingSocketId = null;
    this.closeBuildMenu();
    document.getElementById('tactical-guide-banner')?.classList.add('hidden');
    document.getElementById('command-hub-modal')?.classList.remove('hidden');
    document.getElementById('ingame-hud')?.classList.add('hidden');
    this.worldMarkersLayer?.classList.add('hidden');
    const resumeBtn = document.getElementById('btn-close-hub-resume');
    if (resumeBtn) {
      resumeBtn.classList.toggle('hidden', isInitialStartup);
    }
    this.renderHubAll();
  }

  closeCommandHub() {
    this.engine.isPaused = false;
    document.getElementById('command-hub-modal')?.classList.add('hidden');
    document.getElementById('ingame-hud')?.classList.remove('hidden');
    this.worldMarkersLayer?.classList.remove('hidden');
    this.syncHud(this.engine.getHudSnapshot());
  }

  launchNewExpedition() {
    saveSystem.data.selectedRealmIndex = this.selectedRealmIndex;
    saveSystem.data.selectedHeroId = this.selectedHeroId;
    saveSystem.data.activeSkulls = Array.from(this.activeSkulls);
    saveSystem.save();

    this.engine.startRun({
      realmIndex: this.selectedRealmIndex,
      heroId: this.selectedHeroId,
      isEndless: this.isEndlessMode,
      activeSkulls: Array.from(this.activeSkulls),
    });

    this.rebuildSocketBadges();
    this.pendingSocketId = null;
    this.sceneManager.cameraYaw = 0;
    this.closeCommandHub();
  }

  renderHubAll() {
    const crownsEl = document.getElementById('hub-crowns-val');
    if (crownsEl) crownsEl.textContent = saveSystem.data.crowns.toLocaleString();

    this.renderExpeditionTab();
    this.renderSanctumTab();
    this.renderCodexTab();
    this.renderChronicleTab();
  }

  renderExpeditionTab() {
    // 1. Realms List
    const realmListEl = document.getElementById('hub-realm-list');
    if (realmListEl) {
      realmListEl.innerHTML = REALMS.map((r) => {
        const isSelected = r.index === this.selectedRealmIndex;
        const isCleared = saveSystem.data.clearedRealms.includes(r.index);
        return `
          <div class="select-card ${isSelected ? 'selected' : ''}" data-realm-idx="${r.index}">
            <div class="select-card-top">
              <span class="select-card-title">${r.icon} ${r.name}</span>
              <span class="badge-pill ${isCleared ? 'gold-badge' : ''}">
                ${isCleared ? '정복 완료' : `${r.totalWaves}일`}
              </span>
            </div>
            <div class="select-card-desc">${r.desc}</div>
            <div class="hero-skills-mini">
              <span class="hero-skill-tag">${r.difficultyLabel}</span>
              <span class="hero-skill-tag">보상 ${r.rewardCrowns} 👑</span>
              <span class="hero-skill-tag">환경: ${r.hazard.name}</span>
            </div>
          </div>
        `;
      }).join('');

      realmListEl.querySelectorAll('.select-card').forEach((card) => {
        card.addEventListener('click', () => {
          soundEngine.playSfx('ui_click');
          this.selectedRealmIndex = Number(card.dataset.realmIdx);
          this.renderExpeditionTab();
          this.updateLaunchButtonLabel();
        });
      });
    }

    // 2. Heroes List
    const heroListEl = document.getElementById('hub-hero-list');
    if (heroListEl) {
      heroListEl.innerHTML = HEROES.map((h) => {
        const unlocked = saveSystem.data.unlockedHeroes.includes(h.id) || h.unlockCost === 0;
        const isSelected = h.id === this.selectedHeroId;
        return `
          <div class="select-card ${isSelected ? 'selected' : ''}" data-hero-id="${h.id}">
            <div class="select-card-top">
              <span class="select-card-title">${h.icon} ${h.name} <small style="color:#94a3b8">(${h.title})</small></span>
              <span class="badge-pill ${unlocked ? 'gold-badge' : ''}">
                ${unlocked ? (isSelected ? '선택됨' : '사용 가능') : `잠김 · ${h.unlockCost} 👑`}
              </span>
            </div>
            <div class="select-card-desc">${h.passive.name}: ${h.passive.desc}</div>
            <div class="hero-skills-mini">
              <span class="hero-skill-tag">[Q] ${h.skills.q.icon} ${h.skills.q.name}</span>
              <span class="hero-skill-tag">[E] ${h.skills.e.icon} ${h.skills.e.name}</span>
              <span class="hero-skill-tag">[R] ${h.skills.r.icon} ${h.skills.r.name}</span>
            </div>
          </div>
        `;
      }).join('');

      heroListEl.querySelectorAll('.select-card').forEach((card) => {
        card.addEventListener('click', () => {
          const heroId = card.dataset.heroId;
          const unlocked = saveSystem.data.unlockedHeroes.includes(heroId);
          if (!unlocked) {
            const res = saveSystem.unlockHero(heroId);
            if (!res.ok) {
              this.showToast(res.reason, 'danger');
              return;
            }
            soundEngine.playSfx('relic_pick');
            this.showToast(`군주를 해금했습니다: ${getHeroById(heroId).name}`, 'gold');
          } else {
            soundEngine.playSfx('ui_click');
          }
          this.selectedHeroId = heroId;
          this.renderHubAll();
          this.updateLaunchButtonLabel();
        });
      });
    }

    // 3. Mutator Skulls
    const skullListEl = document.getElementById('hub-skull-list');
    if (skullListEl) {
      const skullMods = computeSkullModifiers(Array.from(this.activeSkulls));
      const bonusPct = Math.round((skullMods.crownBonusMult || 0) * 100);
      const badge = document.getElementById('skull-bonus-badge');
      if (badge) badge.textContent = `왕관 보상 +${bonusPct}%`;

      skullListEl.innerHTML = MUTATOR_SKULLS.map((sk) => {
        const active = this.activeSkulls.has(sk.id);
        return `
          <div class="select-card ${active ? 'selected' : ''}" data-skull-id="${sk.id}">
            <div class="select-card-top">
              <span class="select-card-title">${sk.icon} ${sk.name}</span>
              <span class="badge-pill ${active ? 'gold-badge' : ''}">+${Math.round((sk.crownBonusMult || sk.crownBonus || 0.25) * 100)}% 👑</span>
            </div>
            <div class="select-card-desc">${sk.desc}</div>
          </div>
        `;
      }).join('');

      skullListEl.querySelectorAll('.select-card').forEach((card) => {
        card.addEventListener('click', () => {
          soundEngine.playSfx('ui_click');
          const id = card.dataset.skullId;
          if (this.activeSkulls.has(id)) this.activeSkulls.delete(id);
          else this.activeSkulls.add(id);
          this.renderExpeditionTab();
        });
      });
    }

    // 4. Checkpoint Banner
    const cp = saveSystem.loadCheckpoint();
    const cpBanner = document.getElementById('checkpoint-resume-banner');
    if (cpBanner) {
      if (cp) {
        cpBanner.classList.remove('hidden');
        const rName = REALMS[cp.realmIndex]?.name || '솔라리아';
        const hName = getHeroById(cp.heroId)?.name || '아르투리아';
        document.getElementById('checkpoint-desc').textContent = `${rName} · ${cp.wave}일차 · ${hName}`;
      } else {
        cpBanner.classList.add('hidden');
      }
    }

    this.updateLaunchButtonLabel();
  }

  updateLaunchButtonLabel() {
    const sub = document.getElementById('launch-sub-label');
    if (!sub) return;
    const r = REALMS[this.selectedRealmIndex];
    const h = getHeroById(this.selectedHeroId);
    const modeStr = this.isEndlessMode ? '무한의 심연' : `${r.totalWaves}일 캠페인`;
    sub.textContent = `${modeStr} · ${h.name}`;
  }

  renderSanctumTab() {
    const grid = document.getElementById('sanctum-branches-grid');
    if (!grid) return;

    const branches = Array.isArray(SANCTUM_BRANCHES)
      ? SANCTUM_BRANCHES
      : Object.values(SANCTUM_BRANCHES || {});

    grid.innerHTML = branches
      .map((br) => {
        const items = SANCTUM_UPGRADES.filter((u) => u.branch === br.id);
        return `
          <div class="sanctum-branch-col">
            <h3 style="font-size:14px;color:#fde047;margin-bottom:4px;">${br.name}</h3>
            ${items
              .map((upg) => {
                const lv = saveSystem.data.sanctumLevels[upg.id] || 0;
                const isMax = lv >= upg.maxLevel;
                const cost = getSanctumUpgradeCost(upg, lv);
                const canAfford = saveSystem.data.crowns >= cost && !isMax;
                return `
                  <div class="sanctum-node-card">
                    <div>
                      <div style="font-size:12px;font-weight:800;color:#f8fafc;">
                        ${upg.icon} ${upg.name} <span style="color:#38bdf8;">Lv.${lv}/${upg.maxLevel}</span>
                      </div>
                      <div style="font-size:11px;color:#94a3b8;">${upg.descPerLevel}</div>
                    </div>
                    <button class="btn-mini sanctum-buy-btn" data-upg-id="${upg.id}" ${
                  !canAfford ? 'disabled' : ''
                } style="border-color:${canAfford ? '#f59e0b' : '#334155'};color:${
                  canAfford ? '#fde047' : '#64748b'
                }">
                      ${isMax ? 'MAX' : `👑 ${cost}`}
                    </button>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;
      })
      .join('');

    grid.querySelectorAll('.sanctum-buy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = saveSystem.buySanctumUpgrade(btn.dataset.upgId);
        if (res.ok) {
          soundEngine.playSfx('build_upgrade');
          this.renderHubAll();
        } else {
          this.showToast(res.reason, 'danger');
        }
      });
    });
  }

  renderCodexTab() {
    const grid = document.getElementById('codex-content-grid');
    if (!grid) return;

    if (this.currentCodexCategory === 'buildings') {
      grid.innerHTML = BUILDING_LIST.map((b) => {
        const evoHtml = (b.evolutions || [])
          .map(
            (ev) =>
              `<div style="font-size:11px;color:#e9d5ff;background:rgba(168,85,247,0.14);padding:5px 7px;border-radius:6px;margin-top:4px;">
                <strong>특화 진화 · ${ev.name}</strong><br/>${ev.desc}
              </div>`
          )
          .join('');
        return `
          <div class="codex-item-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:14px;color:#fde047;">${b.icon} ${b.name}</strong>
              <span class="badge-pill">${CATEGORY_KO[b.category] || b.category}</span>
            </div>
            <p style="font-size:11px;color:#cbd5e1;">${b.desc}</p>
            <div style="font-size:11px;color:#94a3b8;">Lv.1 · ${b.tiers[0].costGold}G · 내구도 ${b.tiers[0].maxHp.toLocaleString()}</div>
            ${evoHtml}
          </div>
        `;
      }).join('');
    } else if (this.currentCodexCategory === 'enemies') {
      grid.innerHTML = ENEMY_LIST.map((e) => {
        return `
          <div class="codex-item-card" style="border-color:${e.isBoss ? '#f43f5e' : 'rgba(148,163,184,0.22)'}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:14px;color:${e.isBoss ? '#fda4af' : '#f8fafc'};">${e.icon} ${e.name}</strong>
              <span class="badge-pill">${e.isBoss ? '보스' : e.isFlying ? '공중' : '지상'}</span>
            </div>
            <p style="font-size:11px;color:#cbd5e1;">${e.desc}</p>
            <div style="font-size:11px;color:#94a3b8;">
              체력 ${e.maxHp} · 공격 ${e.damage} · 방어 ${Math.round((e.armor || 0) * 100)}% · 처치 ${e.goldReward}G
            </div>
          </div>
        `;
      }).join('');
    } else if (this.currentCodexCategory === 'relics') {
      const setHtml = Object.values(SYNERGY_SETS)
        .map(
          (s) => `
          <div class="codex-item-card" style="border-color:#a855f7;">
            <strong style="font-size:14px;color:#e9d5ff;">${s.icon} ${s.name} 세트</strong>
            <p style="font-size:11px;color:#cbd5e1;">${s.description || ''}</p>
            ${(s.tiers || [])
              .map((t) => `<div style="font-size:11px;color:#fde047;">${t.count}세트 · ${t.label}</div>`)
              .join('')}
          </div>
        `
        )
        .join('');

      const relicHtml = RELICS.map(
        (r) => `
        <div class="codex-item-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:13px;color:#fde047;">${r.icon} ${r.name}</strong>
            <span class="badge-pill">${RARITY_KO[r.rarity] || r.rarity}</span>
          </div>
          <p style="font-size:11px;color:#cbd5e1;">${r.desc}</p>
        </div>
      `
      ).join('');

      grid.innerHTML = setHtml + relicHtml;
    } else {
      grid.innerHTML = `
        <div class="codex-item-card">
          <strong style="color:#fde047;">낮: 부지에 서서 짓기</strong>
          <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
            군주를 부지 앞으로 옮기고 Space를 누르면 지을 수 있는 건물이 나옵니다. Alt를 누르고 있으면 전장의 모든 부지가 보입니다. 수입은 다음 날 아침에 들어오고, 부서진 성벽과 포탑도 그때 무료로 다시 세워집니다.
          </p>
        </div>
        <div class="codex-item-card">
          <strong style="color:#38bdf8;">건물 3단계와 특화 진화</strong>
          <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
            건물은 Lv.3까지 올린 뒤 두 갈래 특화 진화 가운데 하나를 고릅니다. 궁수탑이라면 보스용 발리스타와 다수 처리용 개틀링 석궁으로 갈립니다. 같은 부지에서 Space를 다시 누르면 다음 단계가 나옵니다.
          </p>
        </div>
        <div class="codex-item-card">
          <strong style="color:#a855f7;">밤: 군주로 직접 싸우기</strong>
          <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
            Enter로 밤을 시작하면 군주가 가까운 적을 알아서 칩니다. Q, E, R 스킬과 Space 돌진을 쓰고, 차원문이 밀리면 T로 병영 병력을 불러 모으세요.
          </p>
        </div>
      `;
    }
  }

  renderChronicleTab() {
    const achList = document.getElementById('achievements-list');
    const unlockedSet = new Set(saveSystem.data.unlockedAchievements);
    const badge = document.getElementById('ach-progress-badge');
    if (badge) badge.textContent = `${unlockedSet.size} / ${ACHIEVEMENTS.length} 달성`;

    if (achList) {
      achList.innerHTML = ACHIEVEMENTS.map((a) => {
        const done = unlockedSet.has(a.id);
        return `
          <div class="ach-card ${done ? 'unlocked' : ''}">
            <div>
              <div style="font-size:13px;font-weight:800;color:${done ? '#fde047' : '#cbd5e1'}">
                ${a.icon} ${a.name} ${done ? '✓' : ''}
              </div>
              <div style="font-size:11px;color:#94a3b8;">${a.desc}</div>
            </div>
            <span class="badge-pill gold-badge">+${a.rewardCrowns || 40} 👑</span>
          </div>
        `;
      }).join('');
    }

    const st = saveSystem.data.lifetimeStats;
    const statsBox = document.getElementById('lifetime-stats-box');
    if (statsBox) {
      statsBox.innerHTML = `
        <div class="stat-mini-box"><span>정복 횟수</span><strong>${st.victories} / ${st.runsPlayed}</strong></div>
        <div class="stat-mini-box"><span>누적 적 처치</span><strong>${st.enemiesSlain.toLocaleString()}</strong></div>
        <div class="stat-mini-box"><span>보스 토벌</span><strong>${st.bossesSlain}</strong></div>
        <div class="stat-mini-box"><span>누적 채굴 금화</span><strong>${st.goldMined.toLocaleString()}</strong></div>
        <div class="stat-mini-box"><span>무한 최고 기록</span><strong>${saveSystem.data.bestEndlessWave}일차</strong></div>
        <div class="stat-mini-box"><span>최고 점수</span><strong>${saveSystem.data.bestScore.toLocaleString()}</strong></div>
      `;
    }

    const histEl = document.getElementById('run-history-list');
    if (histEl) {
      const history = saveSystem.data.runHistory || [];
      if (history.length === 0) {
        histEl.innerHTML = `<div style="font-size:12px;color:#64748b;padding:12px;">아직 기록이 없습니다.</div>`;
      } else {
        histEl.innerHTML = history
          .map(
            (h) => `
          <div class="ach-card">
            <div>
              <div style="font-size:12px;font-weight:800;color:${h.victory ? '#fde047' : '#f8fafc'}">
                ${h.victory ? '승리' : '패배'} · ${h.realmName} (${h.wave}일차)
              </div>
              <div style="font-size:11px;color:#94a3b8;">
                ${h.heroName} · 점수 ${h.score.toLocaleString()} · 처치 ${h.enemiesSlain} · 시드 ${h.seed}
              </div>
            </div>
            <span class="badge-pill gold-badge">+${h.crownsEarned} 👑</span>
          </div>
        `
          )
          .join('');
      }
    }
  }

  // =========================================================================
  // 인게임 HUD
  // =========================================================================
  syncHud(snap) {
    if (!snap) return;

    const phaseEl = document.getElementById('hud-phase-icon');
    if (phaseEl) {
      phaseEl.textContent = snap.phase === 'night' ? '밤' : '낮';
      phaseEl.classList.toggle('night', snap.phase === 'night');
      phaseEl.classList.toggle('day', snap.phase !== 'night');
    }
    document.getElementById('hud-realm-title').textContent = snap.realm.shortName || snap.realm.name;
    document.getElementById('hud-wave-subtitle').textContent =
      snap.phase === 'night'
        ? `${snap.wave}일차${snap.isEndless ? ' · 무한' : ''} · 남은 적 ${snap.enemiesRemaining}`
        : `${snap.wave}일차${snap.isEndless ? ' · 무한' : ''} · 정비 중`;

    // Citadel HP
    const citPct = Math.max(0, Math.min(100, (snap.citadelHp / Math.max(1, snap.citadelMaxHp)) * 100));
    document.getElementById('hud-citadel-hp-text').textContent = `${snap.citadelHp} / ${snap.citadelMaxHp}`;
    document.getElementById('hud-citadel-hp-fill').style.width = `${citPct}%`;

    // Resources
    document.getElementById('hud-gold-val').textContent = snap.gold.toLocaleString();
    document.getElementById('hud-argon-val').textContent = snap.argon.toLocaleString();
    document.getElementById('hud-troop-val').textContent = snap.troopCount;
    document.getElementById('hud-score-val').textContent = snap.score.toLocaleString();

    // Hero Bar
    if (snap.hero) {
      document.getElementById('hud-hero-name').textContent = snap.hero.name;
      const stateEl = document.getElementById('hud-hero-state');
      if (snap.hero.isDead) {
        stateEl.textContent = `부활까지 ${snap.hero.reviveTimer.toFixed(1)}초`;
        stateEl.style.color = '#ef5350';
      } else {
        stateEl.textContent = '지휘 중';
        stateEl.style.color = '#52cc8a';
      }
      const hPct = Math.max(0, Math.min(100, (snap.hero.hp / Math.max(1, snap.hero.maxHp)) * 100));
      document.getElementById('hud-hero-hp-fill').style.width = `${hPct}%`;
      document.getElementById('hud-hero-hp-text').textContent = `${snap.hero.hp} / ${snap.hero.maxHp} HP`;

      // 스킬 이름과 재사용 대기시간
      for (const k of ['q', 'e', 'r']) {
        const sk = snap.hero.skills[k];
        const nameEl = document.getElementById(`skill-${k}-name`);
        if (nameEl) nameEl.textContent = sk.short || sk.name;
        const cdEl = document.getElementById(`skill-${k}-cd`);
        const cdVal = snap.hero.skillCooldowns[k] || 0;
        if (cdVal > 0.05) {
          cdEl.classList.remove('hidden');
          cdEl.textContent = cdVal.toFixed(1);
        } else {
          cdEl.classList.add('hidden');
        }
      }
      const dashCdEl = document.getElementById('skill-dash-cd');
      if (snap.hero.dashCooldown > 0.05) {
        dashCdEl.classList.remove('hidden');
        dashCdEl.textContent = snap.hero.dashCooldown.toFixed(1);
      } else {
        dashCdEl.classList.add('hidden');
      }
    }

    // Call Night CTA Button
    const callBtn = document.getElementById('btn-call-night');
    if (callBtn) {
      if (snap.phase === 'night') {
        callBtn.classList.add('night-active');
        callBtn.innerHTML = `
          <svg viewBox="0 0 24 24" class="bell-svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <div class="call-night-text">
            <strong>방어 중</strong>
            <small>남은 적 ${snap.enemiesRemaining} · 콤보 ${snap.killCombo}x</small>
          </div>
        `;
      } else {
        callBtn.classList.remove('night-active');
        callBtn.innerHTML = `
          <svg viewBox="0 0 24 24" class="bell-svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 22,8.5 12,22 2,8.5"/>
          </svg>
          <div class="call-night-text">
            <strong>밤 맞이하기</strong>
            <small>Enter · ${snap.wave}일차 출정</small>
          </div>
        `;
      }
    }

    // Boss Banner Bar
    const activeBoss = this.engine.enemies.find((e) => e.spec.isBoss && e.hp > 0);
    const bossBar = document.getElementById('boss-banner-bar');
    if (bossBar) {
      if (activeBoss) {
        bossBar.classList.remove('hidden');
        document.getElementById('boss-banner-name').textContent = `${activeBoss.spec.name}`;
        document.getElementById('boss-banner-hp').textContent = `${Math.round(activeBoss.hp)} / ${activeBoss.maxHp}`;
        const pct = Math.max(0, Math.min(100, (activeBoss.hp / activeBoss.maxHp) * 100));
        document.getElementById('boss-banner-fill').style.width = `${pct}%`;
      } else {
        bossBar.classList.add('hidden');
      }
    }

    // 밤에는 정찰 카드를 접어 전장을 가리지 않습니다.
    const threatCard = document.getElementById('threat-forecast-card');
    if (threatCard) {
      threatCard.classList.toggle('hidden', snap.phase === 'night');
    }
    const waveBadge = document.getElementById('threat-wave-badge');
    if (waveBadge) waveBadge.textContent = `${snap.wave}일차`;
    const portalListEl = document.getElementById('threat-portal-list');
    if (portalListEl && snap.currentWaveDesc) {
      portalListEl.innerHTML = snap.currentWaveDesc.portalSummaries
        .map((ps) => {
          const chips = Object.entries(ps.enemies)
            .map(([eId, cnt]) => {
              const eSpec = getEnemySpec(eId);
              return `<span class="threat-chip">${eSpec.name} ×${cnt}</span>`;
            })
            .join('');
          return `
            <div class="threat-portal-row">
              <div class="threat-portal-title">${ps.portalName}</div>
              <div class="threat-enemy-chips">${chips}</div>
            </div>
          `;
        })
        .join('');
    }
    const hazardEl = document.getElementById('realm-hazard-note');
    if (hazardEl && snap.realm.hazard) {
      hazardEl.textContent = `${snap.realm.hazard.name}. ${snap.realm.hazard.desc}`;
    }

    // 유물을 하나라도 얻은 뒤에만 카드를 보여 줍니다.
    const relicCard = document.getElementById('relic-sidebar-card');
    if (relicCard) {
      relicCard.classList.toggle('hidden', snap.ownedRelics.length === 0);
    }
    document.getElementById('hud-relic-count').textContent = `${snap.ownedRelics.length}`;
    const synListEl = document.getElementById('hud-synergy-list');
    if (synListEl) {
      synListEl.innerHTML = snap.activeSets
        .map((s) => `<span class="synergy-chip" title="${s.activeTierLabel || ''}">${s.name} (${s.count})</span>`)
        .join('');
    }
    const relicGridEl = document.getElementById('hud-relic-grid');
    if (relicGridEl) {
      relicGridEl.innerHTML = snap.ownedRelics
        .map((r) => `<div class="relic-mini-icon" title="${r.name}: ${r.desc}">${r.icon}</div>`)
        .join('');
    }
  }

  // =========================================================================
  // 건설: 군주가 부지 앞에 서면 열립니다 (쓰론폴 방식)
  // =========================================================================
  findSocketNearHero(range = 4.2) {
    const hero = this.engine.hero;
    if (!hero || hero.isDead) return null;
    let best = null;
    let bestDist = range;
    for (const sock of this.engine.sockets) {
      const d = Math.hypot(sock.x - hero.x, sock.z - hero.z);
      if (d < bestDist) {
        bestDist = d;
        best = sock;
      }
    }
    return best;
  }

  openBuildMenu(socketId) {
    const sock = this.engine.sockets.find((s) => s.id === socketId);
    if (!sock) return;
    this.buildMenuSocketId = socketId;
    this.engine.selectedSocketId = socketId;
    document.getElementById('build-menu')?.classList.remove('hidden');
    this.renderBuildMenu();
    this.positionBuildMenu(true);
    soundEngine.playSfx('ui_click');
  }

  closeBuildMenu() {
    this.buildMenuSocketId = null;
    this.engine.selectedSocketId = null;
    document.getElementById('build-menu')?.classList.add('hidden');
  }

  getBuildOptions(sock) {
    const b = sock.building;

    if (!b) {
      return sock.allowed.map((typeId) => {
        const def = getBuildingSpec(typeId);
        const tier1 = getBuildingTierSpec(typeId, 1, null);
        return {
          type: 'build',
          key: typeId,
          icon: def.icon,
          name: def.name,
          desc: tier1 ? tier1.desc : def.desc,
          cost: this.engine.getActionCost(typeId, 1, null),
        };
      });
    }

    if (!b.evolutionId && b.tier < 3) {
      const next = getBuildingTierSpec(b.typeId, b.tier + 1, null);
      return [
        {
          type: 'upgrade',
          key: null,
          icon: b.baseDef.icon,
          name: next.name,
          desc: next.desc,
          cost: this.engine.getActionCost(b.typeId, b.tier + 1, null),
        },
      ];
    }

    if (!b.evolutionId && b.tier === 3) {
      return (b.baseDef.evolutions || []).map((evo) => ({
        type: 'evolution',
        key: evo.id,
        icon: evo.icon,
        name: evo.name,
        desc: evo.desc,
        cost: this.engine.getActionCost(b.typeId, 3, evo.id),
      }));
    }

    return [];
  }

  renderBuildMenu() {
    const sock = this.engine.sockets.find((s) => s.id === this.buildMenuSocketId);
    const titleEl = document.getElementById('build-menu-title');
    const listEl = document.getElementById('build-menu-options');
    if (!sock || !titleEl || !listEl) return;

    const b = sock.building;
    titleEl.textContent = b ? `${b.spec.name} · ${sock.label}` : sock.label;

    const options = this.getBuildOptions(sock);
    this.buildOptions = options;

    if (options.length === 0) {
      listEl.innerHTML = `<div class="build-menu-note">${b ? b.spec.desc : '지을 수 있는 건물이 없습니다.'}</div>`;
      return;
    }

    listEl.innerHTML = options
      .map((opt, i) => {
        const affordable = this.engine.gold >= opt.cost.gold && this.engine.argon >= opt.cost.argon;
        const costText = [opt.cost.gold > 0 ? `${opt.cost.gold}G` : '', opt.cost.argon > 0 ? `${opt.cost.argon}A` : '']
          .filter(Boolean)
          .join(' · ');
        return `
          <button class="build-option ${affordable ? '' : 'unaffordable'}" data-opt-index="${i}">
            <span class="build-option-key">${i + 1}</span>
            <span class="build-option-icon">${opt.icon}</span>
            <span class="build-option-body">
              <span class="build-option-name">${opt.name}</span>
              <span class="build-option-desc">${opt.desc}</span>
            </span>
            <span class="build-option-cost">${costText}</span>
          </button>
        `;
      })
      .join('');

    if (b && b.typeId !== 'citadel') {
      listEl.insertAdjacentHTML(
        'beforeend',
        '<button class="build-menu-demolish" data-demolish="1">철거 · 70% 환급</button>'
      );
      listEl.querySelector('[data-demolish]')?.addEventListener('click', () => {
        const res = this.engine.demolishSocketBuilding(sock.id);
        if (!res.ok) {
          this.showToast(res.reason, 'danger');
          return;
        }
        this.renderBuildMenu();
        this.positionBuildMenu(true);
      });
    }

    listEl.querySelectorAll('[data-opt-index]').forEach((btn) => {
      btn.addEventListener('click', () => this.chooseBuildOption(Number(btn.dataset.optIndex)));
    });
  }

  chooseBuildOption(index, socketId = this.buildMenuSocketId) {
    const opt = (this.buildOptions || [])[index];
    const sock = this.engine.sockets.find((s) => s.id === socketId);
    if (!opt || !sock) return;

    const res = this.engine.buildOrUpgradeSocket(
      sock.id,
      opt.type === 'build' ? opt.key : null,
      opt.type === 'evolution' ? opt.key : null
    );

    if (!res.ok) {
      this.showToast(res.reason, 'danger');
      return;
    }

    soundEngine.playSfx('build_upgrade');
    if (this.buildMenuSocketId === socketId) {
      this.renderBuildMenu();
      this.positionBuildMenu(true);
    }
  }

  // Space: 고를 것이 하나뿐이면 바로 실행하고, 여러 개면 메뉴를 엽니다.
  interactWithNearbyPlot() {
    const sock = this.engine.sockets.find((s) => s.id === this.nearSocketId);
    if (!sock) return;
    const options = this.getBuildOptions(sock);
    this.buildOptions = options;
    if (options.length === 1) {
      this.chooseBuildOption(0, sock.id);
      return;
    }
    this.openBuildMenu(sock.id);
  }

  positionBuildMenu(remeasure = false) {
    const menu = document.getElementById('build-menu');
    const sock = this.engine.sockets.find((s) => s.id === this.buildMenuSocketId);
    if (!menu || !sock || menu.classList.contains('hidden')) return;

    if (remeasure || !this.buildMenuSize) {
      this.buildMenuSize = { w: menu.offsetWidth, h: menu.offsetHeight };
    }

    const v = new THREE.Vector3(sock.x, sock.building ? 3.4 : 1.4, sock.z).project(this.sceneManager.camera);
    if (v.z > 1) {
      menu.style.display = 'none';
      return;
    }
    menu.style.display = '';

    const w = this.sceneManager.width;
    const h = this.sceneManager.height;
    const sx = (v.x * 0.5 + 0.5) * w;
    const sy = (-v.y * 0.5 + 0.5) * h;
    const halfW = this.buildMenuSize.w / 2;

    // 건물을 가리지 않도록 부지 옆에 붙입니다. 오른쪽이 좁으면 왼쪽으로 뒤집습니다.
    let x = sx + 46 + halfW;
    if (x + halfW > w - 16) x = sx - 46 - halfW;
    x = Math.max(halfW + 12, Math.min(w - halfW - 12, x));
    const y = Math.max(96, Math.min(h - 120 - this.buildMenuSize.h, sy - this.buildMenuSize.h / 2));
    const transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`;
    if (menu.style.transform !== transform) menu.style.transform = transform;
  }

  // =========================================================================
  // 건설 부지 배지
  // =========================================================================
  rebuildSocketBadges() {
    if (!this.worldMarkersLayer) return;
    this.worldMarkersLayer.innerHTML = '';
    this.socketBadgeElements.clear();

    for (const sock of this.engine.sockets) {
      const el = document.createElement('div');
      el.className = 'world-socket-badge';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const hero = this.engine.hero;
        if (!hero || hero.isDead) return;
        soundEngine.playSfx('ui_click');
        // 배지를 눌러도 부지 앞까지 걸어갑니다. 도착하면 건설 메뉴가 열립니다.
        this.pendingSocketId = sock.id;
        hero.targetX = sock.x;
        hero.targetZ = sock.z;
      });
      this.worldMarkersLayer.appendChild(el);
      this.socketBadgeElements.set(sock.id, el);
    }
  }

  updateSocketBadgesProjection() {
    if (!this.worldMarkersLayer || this.worldMarkersLayer.classList.contains('hidden')) return;
    const cam = this.sceneManager.camera;
    const w = this.sceneManager.width;
    const h = this.sceneManager.height;
    const tempV = new THREE.Vector3();

    const shortNames = {
      citadel: '성채',
      gold_mine: '금광',
      windmill: '풍차',
      argon_refinery: '정제소',
      archer_tower: '감시탑',
      arcane_obelisk: '비전탑',
      flame_mortar: '박격포',
      frost_spire: '빙결탑',
      barracks: '병영',
      stone_wall: '성벽',
    };

    for (const sock of this.engine.sockets) {
      const el = this.socketBadgeElements.get(sock.id);
      if (!el) continue;

      const b = sock.building;
      const isNear = sock.id === this.nearSocketId;
      const isMenu = sock.id === this.buildMenuSocketId;
      // 낮에만, 그리고 Alt를 누르거나 군주가 부지 앞에 있을 때만 보입니다.
      const visible = this.engine.phase === 'day' && (this.isAltDown || isNear || isMenu);
      if (!visible) {
        el.style.display = 'none';
        continue;
      }

      tempV.set(sock.x, b ? 3.2 : 1.15, sock.z).project(cam);
      if (tempV.z > 1) {
        el.style.display = 'none';
        continue;
      }

      const sx = (tempV.x * 0.5 + 0.5) * w;
      const sy = (-tempV.y * 0.5 + 0.5) * h;

      let label = '';
      let canAfford = false;
      if (!b) {
        const defType = sock.defaultType || sock.allowed[0];
        const cost = this.engine.getActionCost(defType, 1, null);
        canAfford = this.engine.gold >= cost.gold && this.engine.argon >= cost.argon;
        label = isNear || isMenu ? 'SPACE · 건설' : `${shortNames[defType] || '부지'} ${cost.gold}G`;
      } else if (!b.evolutionId && b.tier < 3) {
        const cost = this.engine.getActionCost(b.typeId, b.tier + 1, null);
        canAfford = this.engine.gold >= cost.gold && this.engine.argon >= cost.argon;
        label = isNear || isMenu ? 'SPACE · 강화' : `${shortNames[b.typeId] || b.baseDef.name} Lv.${b.tier}`;
      } else if (!b.evolutionId && b.tier === 3) {
        const firstEvo = b.baseDef.evolutions?.[0];
        const cost = this.engine.getActionCost(b.typeId, 3, firstEvo?.id);
        canAfford = this.engine.gold >= cost.gold && this.engine.argon >= cost.argon;
        label = isNear || isMenu ? 'SPACE · 진화' : `${shortNames[b.typeId] || b.baseDef.name} Lv.3`;
      } else {
        label = `${shortNames[b.typeId] || b.baseDef.name} 완성`;
      }

      const nearState = isNear || isMenu;
      if (el.dataset.label !== label) {
        el.innerHTML = label;
        el.dataset.label = label;
      }
      if (el.dataset.near !== String(nearState)) {
        el.classList.toggle('near', nearState);
        el.dataset.near = String(nearState);
      }
      if (el.dataset.affordable !== String(canAfford)) {
        el.classList.toggle('affordable', canAfford);
        el.dataset.affordable = String(canAfford);
      }
      if (el.style.display !== 'block') el.style.display = 'block';
      const transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      if (el.dataset.transform !== transform) {
        el.style.transform = transform;
        el.dataset.transform = transform;
      }
    }
  }

  // 부지 접근 상태와 건설 메뉴를 매 프레임 갱신합니다.
  updateSocketInteractions() {
    const near = this.engine.phase === 'day' ? this.findSocketNearHero() : null;
    this.nearSocketId = near ? near.id : null;

    // 밤이 되었거나 군주가 쓰러졌으면 예약은 버립니다.
    if (this.pendingSocketId && (this.engine.phase !== 'day' || this.engine.hero?.isDead)) {
      this.pendingSocketId = null;
    }

    if (this.pendingSocketId && this.nearSocketId === this.pendingSocketId) {
      this.pendingSocketId = null;
      this.openBuildMenu(this.nearSocketId);
    }

    if (this.buildMenuSocketId && this.nearSocketId !== this.buildMenuSocketId) {
      this.closeBuildMenu();
    }

    this.updateSocketBadgesProjection();
    this.positionBuildMenu();
  }

  // =========================================================================
  // 유물 선택, 원정 결과
  // =========================================================================
  openRelicDraftModal(choices, rerollsLeft) {
    const modal = document.getElementById('relic-draft-modal');
    const cardsEl = document.getElementById('relic-draft-cards');
    const rerollBtn = document.getElementById('btn-reroll-relics');
    if (!modal || !cardsEl) return;

    modal.classList.remove('hidden');
    if (rerollBtn) {
      rerollBtn.textContent = `다시 뽑기 (남은 횟수 ${rerollsLeft})`;
      rerollBtn.disabled = rerollsLeft <= 0;
    }

    cardsEl.innerHTML = choices
      .map((r) => {
        const synIds = Array.isArray(r.synergy) ? r.synergy : [r.synergy];
        const synBadges = synIds
          .map((sid) => SYNERGY_SETS[sid])
          .filter(Boolean)
          .map((s) => `<span class="synergy-chip">${s.icon} ${s.name}</span>`)
          .join(' ');
        return `
          <div class="relic-choice-card" data-relic-id="${r.id}">
            <div class="relic-big-icon">${r.icon}</div>
            <span class="badge-pill gold-badge">${RARITY_KO[r.rarity] || r.rarity}</span>
            <h3 style="font-size:16px;color:#fff;">${r.name}</h3>
            <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">${synBadges}</div>
            <p style="font-size:12px;color:#cbd5e1;line-height:1.45;">${r.desc}</p>
            <small style="font-size:10.5px;color:var(--text-muted);margin-top:auto;line-height:1.4;">${r.lore || ''}</small>
          </div>
        `;
      })
      .join('');

    cardsEl.querySelectorAll('.relic-choice-card').forEach((card) => {
      card.addEventListener('click', () => {
        modal.classList.add('hidden');
        this.engine.pickRelic(card.dataset.relicId);
      });
    });
  }

  openRunEndModal(summary) {
    this.lastRunSummary = summary;
    const modal = document.getElementById('run-end-modal');
    const headerEl = document.getElementById('run-end-header');
    const statsEl = document.getElementById('run-end-stats');
    const endlessBtn = document.getElementById('btn-endless-continue');
    const posterImg = document.getElementById('chronicle-poster-img');
    if (!modal || !headerEl || !statsEl) return;

    modal.classList.remove('hidden');
    if (endlessBtn) {
      endlessBtn.classList.toggle('hidden', !summary.victory);
    }

    headerEl.innerHTML = `
      <div class="relic-crown-badge">${summary.victory ? '영토 평정' : '방어 실패'}</div>
      <h2 style="font-size:24px;color:${summary.victory ? '#fde047' : '#fda4af'};margin-bottom:4px;">
        ${summary.victory ? `${summary.realmName} 평정` : `${summary.realmName} · ${summary.wave}일차 방어 종료`}
      </h2>
      <p style="font-size:13px;color:#cbd5e1;">
        별빛 왕관 <strong style="color:#fde047;">${summary.crownsEarned}개</strong>를 얻었습니다.
      </p>
    `;

    statsEl.innerHTML = `
      <div class="lifetime-stats-box" style="margin-top:8px;">
        <div class="stat-mini-box"><span>도달 일차</span><strong>${summary.wave}일차</strong></div>
        <div class="stat-mini-box"><span>최종 점수</span><strong>${summary.score.toLocaleString()}</strong></div>
        <div class="stat-mini-box"><span>처치한 적</span><strong>${summary.enemiesSlain.toLocaleString()}</strong></div>
        <div class="stat-mini-box"><span>보스 토벌</span><strong>${summary.bossesDefeated}</strong></div>
        <div class="stat-mini-box"><span>채굴 금화</span><strong>${summary.goldMined.toLocaleString()}G</strong></div>
        <div class="stat-mini-box"><span>획득 왕관</span><strong>${summary.crownsEarned} 👑</strong></div>
      </div>
    `;

    // 3D 장면을 한 번 그려 포스터 미리보기를 만듭니다.
    this.sceneManager.render();
    const poster = generateChroniclePoster(summary, this.canvas);
    if (posterImg && poster?.dataUrl) {
      posterImg.src = poster.dataUrl;
    }
  }

  // =========================================================================
  // 메인 루프
  // =========================================================================
  loop(now) {
    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    // 이동 입력
    let moveX = 0;
    let moveZ = 0;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) moveZ -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) moveZ += 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) moveX -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) moveX += 1;

    // 카메라가 돌아간 만큼 입력 방향도 같이 돌립니다.
    if (moveX !== 0 || moveZ !== 0) {
      const cos = Math.cos(this.sceneManager.cameraYaw);
      const sin = Math.sin(this.sceneManager.cameraYaw);
      const rx = moveX * cos + moveZ * sin;
      const rz = -moveX * sin + moveZ * cos;
      moveX = rx;
      moveZ = rz;
    }

    if (this.engine.isPaused) {
      // 타이틀 화면에서만 배경이 천천히 돌아갑니다.
      if (this.isTitleScreen) this.sceneManager.cameraYaw += dt * 0.12;
    } else {
      const sprint = this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight');
      this.engine.update(dt, { moveX, moveZ, sprint });
    }

    const heroPos = this.engine.hero
      ? new THREE.Vector3(this.engine.hero.x, 0, this.engine.hero.z)
      : new THREE.Vector3(0, 0, 0);

    this.sceneManager.update(dt, heroPos, this.engine.hero?.rotationY || 0);
    this.vfxManager.update(dt, this.sceneManager.camera, this.sceneManager.width, this.sceneManager.height);
    this.sceneManager.render();

    if (!this.engine.isPaused) {
      this.updateSocketInteractions();
      this.syncHud(this.engine.getHudSnapshot());
    }

    requestAnimationFrame((nextNow) => this.loop(nextNow));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__ARGONIA_APP__ = new ArgoniaApp();
});
