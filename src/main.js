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
    this.isRightDragging = false;
    this.lastDragX = 0;
    this.socketBadgeElements = new Map();

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
    this.renderArchitectPanel();
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
    document.getElementById('btn-speed-toggle')?.addEventListener('click', (e) => {
      const speeds = [1.0, 1.5, 2.0];
      const next = speeds[(speeds.indexOf(this.engine.gameSpeed) + 1) % speeds.length];
      this.engine.gameSpeed = next;
      e.currentTarget.textContent = `${next.toFixed(1)}x`;
      soundEngine.playSfx('ui_click');
    });

    document.getElementById('btn-cam-mode')?.addEventListener('click', () => {
      const mode = this.sceneManager.cycleCameraMode();
      const labels = { tactical: '전술 시점', action: '추적 시점', overview: '조감 시점' };
      const labelEl = document.getElementById('cam-mode-label');
      if (labelEl) labelEl.textContent = labels[mode] || '전술 시점';
      soundEngine.playSfx('ui_click');
    });

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

    // Smart Auto-Architect Button
    document.getElementById('btn-smart-build')?.addEventListener('click', () => {
      this.engine.autoBuildSmart();
      this.renderArchitectPanel();
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

    // 왼쪽 버튼은 부지 선택이나 군주 이동, 오른쪽·가운데 드래그는 카메라 회전입니다.
    this.canvas.addEventListener('pointermove', (e) => {
      const worldPt = this.sceneManager.updateMouseRay(e.clientX, e.clientY);
      if (this.isRightDragging) {
        const dx = e.clientX - this.lastDragX;
        this.lastDragX = e.clientX;
        this.sceneManager.cameraYaw -= dx * 0.0075;
        return;
      }
      if (this.isLeftMoving && this.engine.hero && !this.engine.hero.isDead) {
        this.engine.hero.targetX = Math.max(-39, Math.min(39, worldPt.x));
        this.engine.hero.targetZ = Math.max(-39, Math.min(39, worldPt.z));
      }
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      const worldPt = this.sceneManager.updateMouseRay(e.clientX, e.clientY);

      // 오른쪽·가운데 버튼: 카메라 회전
      if (e.button === 2 || e.button === 1) {
        this.isRightDragging = true;
        this.lastDragX = e.clientX;
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      // 왼쪽 버튼: 부지 선택 또는 군주 이동
      if (e.button === 0) {
        let closestSock = null;
        let bestDist = 3.5;
        for (const s of this.engine.sockets) {
          const d = Math.hypot(s.x - worldPt.x, s.z - worldPt.z);
          if (d < bestDist) {
            bestDist = d;
            closestSock = s;
          }
        }
        if (closestSock) {
          soundEngine.playSfx('ui_click');
          this.engine.selectedSocketId = closestSock.id;
          this.renderArchitectPanel();
        } else if (this.engine.hero && !this.engine.hero.isDead) {
          // 누른 지점으로 이동하고, 버튼을 누른 채 끌면 계속 따라갑니다.
          this.isLeftMoving = true;
          this.engine.hero.targetX = Math.max(-39, Math.min(39, worldPt.x));
          this.engine.hero.targetZ = Math.max(-39, Math.min(39, worldPt.z));
          this.vfxManager.spawnShockwave(worldPt.x, worldPt.z, 1.1, 0xfde047, 0.22);
        }
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (e.button === 2 || e.button === 1) {
        this.isRightDragging = false;
        if (this.canvas) this.canvas.style.cursor = '';
      }
      if (e.button === 0) {
        this.isLeftMoving = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        this.sceneManager.cameraZoom = Math.max(
          0.55,
          Math.min(1.65, this.sceneManager.cameraZoom + (e.deltaY > 0 ? 0.08 : -0.08))
        );
      },
      { passive: true }
    );

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const code = e.code;
      this.keysDown.add(code);

      const titleOverlay = document.getElementById('title-overlay');
      if (titleOverlay && !titleOverlay.classList.contains('hidden')) {
        if (code === 'Space' || code === 'Enter') {
          e.preventDefault();
          this.startGameFromTitle();
          return;
        }
      }

      if (code === 'Escape') {
        const hub = document.getElementById('command-hub-modal');
        if (hub?.classList.contains('hidden')) {
          this.openCommandHub(false);
        } else {
          this.closeCommandHub();
        }
        return;
      }

      // If Command Hub is open, ignore battlefield hotkeys
      if (!document.getElementById('command-hub-modal')?.classList.contains('hidden')) return;

      if (code === 'KeyQ') this.engine.castHeroSkill('q', this.sceneManager.mouseWorld);
      else if (code === 'KeyE') this.engine.castHeroSkill('e', this.sceneManager.mouseWorld);
      else if (code === 'KeyR') this.engine.castHeroSkill('r', this.sceneManager.mouseWorld);
      else if (code === 'Space') {
        e.preventDefault();
        this.engine.triggerHeroDash(0, 0);
      } else if (code === 'KeyT') {
        if (this.engine.hero) {
          this.engine.commandRally(this.engine.hero.x, this.engine.hero.z);
        }
      } else if (code === 'KeyB') {
        this.engine.autoBuildSmart();
        this.renderArchitectPanel();
      } else if (code === 'KeyF') {
        if (this.engine.selectedSocketId) {
          this.engine.buildOrUpgradeSocket(this.engine.selectedSocketId);
          this.renderArchitectPanel();
        }
      } else if (code === 'Enter') {
        if (this.engine.phase === 'day') {
          this.engine.startNightWave();
        }
      } else if (code === 'KeyV') {
        document.getElementById('btn-cam-mode')?.click();
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
    });
  }

  // =========================================================================
  // 사령부 화면
  // =========================================================================
  openCommandHub(isInitialStartup = false) {
    this.engine.isPaused = true;
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
    this.renderArchitectPanel();
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
          <strong style="color:#fde047;">낮에는 경제부터</strong>
          <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
            해가 떠 있는 동안 금광과 풍차, 아르곤 정제소를 세웁니다. 수입은 다음 날 아침에 한꺼번에 들어오고, 부서진 성벽과 포탑도 그때 무료로 다시 세워집니다.
          </p>
        </div>
        <div class="codex-item-card">
          <strong style="color:#38bdf8;">건물 3단계와 특화 진화</strong>
          <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
            건물은 Lv.3까지 올린 뒤 두 갈래 특화 진화 가운데 하나를 고릅니다. 궁수탑이라면 보스용 발리스타와 다수 처리용 개틀링 석궁으로 갈립니다. B 키를 누르면 지을 만한 곳을 알아서 골라 줍니다.
          </p>
        </div>
        <div class="codex-item-card">
          <strong style="color:#a855f7;">군주 직접 조작</strong>
          <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
            WASD나 클릭으로 군주를 움직이고 Q, E, R과 Space 돌진을 씁니다. 차원문이 밀리면 T로 병영 병력을 군주에게 불러 모으세요.
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

  renderArchitectPanel() {
    const body = document.getElementById('arch-body');
    const title = document.getElementById('arch-title');
    if (!body || !title) return;

    const selId = this.engine.selectedSocketId;
    const sock = this.engine.sockets.find((s) => s.id === selId);

    if (!sock) {
      title.textContent = '건설 감독';
      body.innerHTML = `
        <div class="arch-idle-hint">
          건설 부지를 클릭하면 지을 수 있는 건물이 나옵니다. 자동 건설은 <kbd>B</kbd> 키입니다.
        </div>
      `;
      return;
    }

    title.textContent = sock.label;
    const b = sock.building;

    if (!b) {
      // 빈 부지: 지을 수 있는 건물을 모두 보여 줍니다.
      body.innerHTML =
        sock.allowed
          .map((typeId) => {
            const bDef = getBuildingSpec(typeId);
            const t1 = getBuildingTierSpec(typeId, 1, null);
            const cost = this.engine.getActionCost(typeId, 1, null);
            return `
              <div class="arch-option-card" data-build-type="${typeId}">
                <div class="arch-opt-top">
                  <span class="arch-opt-name">${bDef.name}</span>
                  <span class="arch-opt-cost">${cost.gold}G ${cost.argon > 0 ? `· ${cost.argon}A` : ''}</span>
                </div>
                <div class="arch-opt-desc">${t1.desc}</div>
              </div>
            `;
          })
          .join('') +
        `<button id="btn-arch-back" class="btn-mini" style="margin-top:2px;">선택 해제</button>`;

      body.querySelectorAll('[data-build-type]').forEach((card) => {
        card.addEventListener('click', () => {
          const res = this.engine.buildOrUpgradeSocket(sock.id, card.dataset.buildType, null);
          if (!res.ok) this.showToast(res.reason, 'danger');
          this.renderArchitectPanel();
        });
      });
      document.getElementById('btn-arch-back')?.addEventListener('click', () => {
        this.engine.selectedSocketId = null;
        this.renderArchitectPanel();
      });
      return;
    }

    // Existing building on socket
    let actionsHtml = '';
    if (b.evolutionId) {
      actionsHtml = `
        <div class="arch-option-card evolution-card">
          <div class="arch-opt-top">
            <span class="arch-opt-name">특화 진화 · ${b.spec.name}</span>
          </div>
          <div class="arch-opt-desc">${b.spec.desc}</div>
        </div>
      `;
    } else if (b.tier < 3) {
      const nextSpec = getBuildingTierSpec(b.typeId, b.tier + 1, null);
      const cost = this.engine.getActionCost(b.typeId, b.tier + 1, null);
      actionsHtml = `
        <div class="arch-option-card" id="btn-arch-upgrade">
          <div class="arch-opt-top">
            <span class="arch-opt-name">${nextSpec.name}로 강화 [F]</span>
            <span class="arch-opt-cost">${cost.gold}G ${cost.argon > 0 ? `· ${cost.argon}A` : ''}</span>
          </div>
          <div class="arch-opt-desc">${nextSpec.desc}</div>
        </div>
      `;
    } else {
      // 3단계: 특화 진화 두 갈래
      actionsHtml = (b.baseDef.evolutions || [])
        .map((evo) => {
          const cost = this.engine.getActionCost(b.typeId, 3, evo.id);
          return `
            <div class="arch-option-card evolution-card" data-evo-id="${evo.id}">
              <div class="arch-opt-top">
                <span class="arch-opt-name">${evo.name}</span>
                <span class="arch-opt-cost">${cost.gold}G · ${cost.argon}A</span>
              </div>
              <div class="arch-opt-desc">${evo.desc}</div>
            </div>
          `;
        })
        .join('');
    }

    const demolishBtn =
      b.typeId !== 'citadel' && this.engine.phase === 'day'
        ? `<button id="btn-arch-demolish" class="btn-mini" style="margin-top:4px;color:#f5b5b5;border-color:rgba(201,59,59,0.5);">철거 (70% 환급)</button>`
        : '';

    body.innerHTML = `
      <div style="background:rgba(0,0,0,0.42);border-left:2px solid var(--brass-bright);padding:7px 10px;font-size:12px;">
        <strong>${b.spec.name}</strong>
        <div class="tabular-nums" style="font-size:10.5px;color:var(--text-parchment);margin-top:2px;">내구도 ${Math.round(b.hp)} / ${b.maxHp.toLocaleString()}</div>
      </div>
      ${actionsHtml}
      ${demolishBtn}
      <button id="btn-arch-back" class="btn-mini" style="margin-top:2px;">선택 해제</button>
    `;

    document.getElementById('btn-arch-upgrade')?.addEventListener('click', () => {
      const res = this.engine.buildOrUpgradeSocket(sock.id);
      if (!res.ok) this.showToast(res.reason, 'danger');
      this.renderArchitectPanel();
    });

    body.querySelectorAll('[data-evo-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const res = this.engine.buildOrUpgradeSocket(sock.id, null, card.dataset.evoId);
        if (!res.ok) this.showToast(res.reason, 'danger');
        this.renderArchitectPanel();
      });
    });

    document.getElementById('btn-arch-demolish')?.addEventListener('click', () => {
      const res = this.engine.demolishSocketBuilding(sock.id);
      if (!res.ok) this.showToast(res.reason, 'danger');
      this.renderArchitectPanel();
    });

    document.getElementById('btn-arch-back')?.addEventListener('click', () => {
      this.engine.selectedSocketId = null;
      this.renderArchitectPanel();
    });
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
        soundEngine.playSfx('ui_click');
        if (this.engine.selectedSocketId === sock.id) {
          // Clicking an already-selected badge immediately builds/upgrades it!
          const res = this.engine.buildOrUpgradeSocket(sock.id);
          if (!res.ok) this.showToast(res.reason, 'danger');
        } else {
          this.engine.selectedSocketId = sock.id;
        }
        this.renderArchitectPanel();
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

      // 밤에는 선택한 부지만 표시합니다.
      const b = sock.building;
      if (this.engine.phase === 'night' && this.engine.selectedSocketId !== sock.id) {
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

      // 이름과 건설 가능 여부만 갱신합니다.
      let labelHtml = '';
      let canAfford = false;
      if (!b) {
        const defType = sock.defaultType || sock.allowed[0];
        const cost = this.engine.getActionCost(defType, 1, null);
        canAfford = this.engine.gold >= cost.gold && this.engine.argon >= cost.argon;
        const shortLabel = shortNames[defType] || '부지';
        labelHtml = `${shortLabel}<span class="cost-tag">${cost.gold}G</span>`;
      } else if (!b.evolutionId && b.tier < 3) {
        const cost = this.engine.getActionCost(b.typeId, b.tier + 1, null);
        canAfford = this.engine.gold >= cost.gold && this.engine.argon >= cost.argon;
        const shortLabel = shortNames[b.typeId] || b.baseDef.name;
        labelHtml = `${shortLabel} Lv.${b.tier}<span class="cost-tag">▲${cost.gold}G</span>`;
      } else if (!b.evolutionId && b.tier === 3) {
        const evo = b.baseDef.evolutions?.[0];
        const cost = this.engine.getActionCost(b.typeId, 3, evo?.id);
        canAfford = this.engine.gold >= cost.gold && this.engine.argon >= cost.argon;
        const shortLabel = shortNames[b.typeId] || b.baseDef.name;
        labelHtml = `${shortLabel} Lv.3<span class="cost-tag">진화</span>`;
      } else {
        const shortLabel = shortNames[b.typeId] || b.baseDef.name;
        labelHtml = `${shortLabel} 완성`;
      }

      el.innerHTML = labelHtml;
      el.classList.toggle('selected', this.engine.selectedSocketId === sock.id);
      el.classList.toggle('affordable', canAfford);
      el.style.display = 'block';
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
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
        this.renderArchitectPanel();
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
      // 사령부가 열려 있는 동안에는 카메라를 천천히 돌립니다.
      this.sceneManager.cameraYaw += dt * 0.12;
    } else {
      if (this.keysDown.has('KeyZ')) this.sceneManager.cameraYaw -= dt * 1.65;
      if (this.keysDown.has('KeyC')) this.sceneManager.cameraYaw += dt * 1.65;
      this.engine.update(dt, { moveX, moveZ });
    }

    const heroPos = this.engine.hero
      ? new THREE.Vector3(this.engine.hero.x, 0, this.engine.hero.z)
      : new THREE.Vector3(0, 0, 0);

    this.sceneManager.update(dt, heroPos, this.engine.hero?.rotationY || 0);
    this.vfxManager.update(dt, this.sceneManager.camera, this.sceneManager.width, this.sceneManager.height);
    this.sceneManager.render();

    if (!this.engine.isPaused) {
      this.updateSocketBadgesProjection();
      this.syncHud(this.engine.getHudSnapshot());
    }

    requestAnimationFrame((nextNow) => this.loop(nextNow));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__ARGONIA_APP__ = new ArgoniaApp();
});
