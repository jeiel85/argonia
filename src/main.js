/**
 * ARGONIA: Crown of the Spire
 * Main Application Entry, 3D Viewport Controller, Interactive HUD & Command Hub Orchestrator
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
        btn.textContent = `⏹ ${sec}s`;
      } else {
        btn.classList.remove('recording');
        btn.textContent = '⏺ REC';
        this.showToast('🎬 60fps WebM 전투 클립이 저장되었습니다!', 'info');
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

    // Start in Command Hub so player can inspect Realms/Heroes/Sanctum or jump straight in
    this.openCommandHub(true);

    this.lastFrameTime = performance.now();
    requestAnimationFrame((now) => this.loop(now));
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
  // EVENT BINDINGS & INPUT HANDLING
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
      this.showToast(`🔄 성소 특성이 초기화되어 ${refunded} 👑 별빛 왕관이 환급되었습니다!`, 'gold');
      this.renderHubAll();
    });

    // Save Export / Import
    document.getElementById('btn-export-save')?.addEventListener('click', () => {
      const json = saveSystem.exportJson();
      navigator.clipboard?.writeText(json);
      this.showToast('📤 세이브 JSON 데이터가 클립보드에 복사되었습니다!', 'info');
    });

    document.getElementById('btn-import-save')?.addEventListener('click', () => {
      const raw = window.prompt('백업한 세이브 JSON 문자열을 붙여넣으세요:');
      if (!raw) return;
      try {
        saveSystem.importJson(raw);
        this.showToast('📥 세이브 데이터를 성공적으로 복원했습니다!', 'gold');
        this.renderHubAll();
      } catch {
        this.showToast('⚠️ 올바른 JSON 형식이 아닙니다.', 'danger');
      }
    });

    // In-Game Top Utility Buttons
    document.getElementById('btn-speed-toggle')?.addEventListener('click', (e) => {
      const speeds = [1.0, 1.5, 2.0];
      const next = speeds[(speeds.indexOf(this.engine.gameSpeed) + 1) % speeds.length];
      this.engine.gameSpeed = next;
      e.currentTarget.textContent = `${next.toFixed(1)}x`;
      soundEngine.playSfx('ui_click');
    });

    document.getElementById('btn-cam-mode')?.addEventListener('click', (e) => {
      const mode = this.sceneManager.cycleCameraMode();
      const labels = { tactical: '🎥 전술캠', action: '🎥 액션캠', overview: '🎥 전체조망' };
      e.currentTarget.textContent = labels[mode] || '🎥 전술캠';
      soundEngine.playSfx('ui_click');
    });

    document.getElementById('btn-audio-mute')?.addEventListener('click', (e) => {
      const muted = soundEngine.toggleMute();
      e.currentTarget.textContent = muted ? '🔇 음소거' : '🔊 사운드';
    });

    document.getElementById('btn-rec-clip')?.addEventListener('click', () => {
      if (this.clipRecorder.isRecording()) {
        this.clipRecorder.stop();
      } else {
        this.clipRecorder.start(this.canvas, 15000);
        this.showToast('⏺ 60fps 전투 영상 녹화 시작 (최대 15초, 다시 누르면 저장)', 'info');
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
      this.showToast('📸 4K 왕국 연대기 포스터 PNG가 다운로드되었습니다!', 'gold');
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
        this.showToast('📸 4K 왕국 연대기 포스터 PNG 저장 완료!', 'gold');
      }
    });

    document.getElementById('btn-copy-threads')?.addEventListener('click', () => {
      if (this.lastRunSummary) {
        const text = buildShareText(this.lastRunSummary);
        navigator.clipboard?.writeText(text);
        this.showToast('🧵 Threads / X 공유 문구가 클립보드에 복사되었습니다!', 'gold');
      }
    });

    document.getElementById('btn-return-hub')?.addEventListener('click', () => {
      document.getElementById('run-end-modal')?.classList.add('hidden');
      this.openCommandHub(false);
    });

    // 3D Canvas Mouse & Wheel Controls
    this.canvas.addEventListener('pointermove', (e) => {
      this.sceneManager.updateMouseRay(e.clientX, e.clientY);
      if (this.isRightDragging) {
        const dx = e.clientX - this.lastDragX;
        this.lastDragX = e.clientX;
        this.sceneManager.cameraYaw -= dx * 0.007;
      }
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      const worldPt = this.sceneManager.updateMouseRay(e.clientX, e.clientY);
      if (e.button === 2) {
        this.isRightDragging = true;
        this.lastDragX = e.clientX;
        // Right click also moves hero to clicked location if not dragging
        if (this.engine.hero && !this.engine.hero.isDead) {
          this.engine.hero.targetX = Math.max(-39, Math.min(39, worldPt.x));
          this.engine.hero.targetZ = Math.max(-39, Math.min(39, worldPt.z));
          this.vfxManager.spawnShockwave(worldPt.x, worldPt.z, 1.2, 0x38bdf8, 0.25);
        }
        return;
      }

      if (e.button === 0) {
        // Check if player clicked near a socket node
        let closestSock = null;
        let bestDist = 3.8;
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
          // Move hero toward clicked ground coordinate
          this.engine.hero.targetX = Math.max(-39, Math.min(39, worldPt.x));
          this.engine.hero.targetZ = Math.max(-39, Math.min(39, worldPt.z));
          this.vfxManager.spawnShockwave(worldPt.x, worldPt.z, 1.1, 0xfde047, 0.22);
        }
      }
    });

    window.addEventListener('pointerup', () => {
      this.isRightDragging = false;
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
  // COMMAND HUB RENDERERS (EXPEDITION, SANCTUM, CODEX, ACHIEVEMENTS)
  // =========================================================================
  openCommandHub(isInitialStartup = false) {
    this.engine.isPaused = true;
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
                ${isCleared ? '👑 정복 완료' : `${r.totalWaves} WAVES`}
              </span>
            </div>
            <div class="select-card-desc">${r.desc}</div>
            <div class="hero-skills-mini">
              <span class="hero-skill-tag">${r.difficultyLabel}</span>
              <span class="hero-skill-tag">보상: ${r.rewardCrowns} 👑</span>
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
                ${unlocked ? (isSelected ? '출정 선택됨' : '사용 가능') : `🔒 ${h.unlockCost} 👑 해금`}
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
            this.showToast(`🎉 새로운 군주 영웅 해금 완료!`, 'gold');
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
              <span class="badge-pill ${active ? 'gold-badge' : ''}">+${Math.round((sk.crownBonus || 0.25) * 100)}% 👑</span>
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
        document.getElementById('checkpoint-desc').textContent = `${rName} · 제${cp.wave}야 · ${hName}`;
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
    const modeStr = this.isEndlessMode ? '♾️ 무한의 심연' : `${r.totalWaves}야 캠페인`;
    sub.textContent = `${r.name} (${modeStr}) · ${h.name}`;
  }

  renderSanctumTab() {
    const grid = document.getElementById('sanctum-branches-grid');
    if (!grid) return;

    const branches = SANCTUM_BRANCHES || [
      { id: 'crown_economy', name: '🪙 왕실 재정학 (번영)' },
      { id: 'citadel_bastion', name: '🏰 불멸의 성채 (요새화)' },
      { id: 'warlord_valor', name: '⚔️ 군주의 무력 (전투)' },
      { id: 'astral_arcana', name: '🔮 성좌의 비전 (유물/마법)' },
    ];

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
                      ${isMax ? 'MAX' : `${cost} 👑`}
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
                <strong>★ 궁극진화: ${ev.icon} ${ev.name}</strong><br/>${ev.desc}
              </div>`
          )
          .join('');
        return `
          <div class="codex-item-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:14px;color:#fde047;">${b.icon} ${b.name}</strong>
              <span class="badge-pill">${b.category.toUpperCase()}</span>
            </div>
            <p style="font-size:11px;color:#cbd5e1;">${b.desc}</p>
            <div style="font-size:11px;color:#94a3b8;">1단계 비용: ${b.tiers[0].costGold}G · 체력: ${b.tiers[0].maxHp}</div>
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
              <span class="badge-pill">${e.isBoss ? '💀 ACT BOSS' : e.isFlying ? '🪽 공중' : '⚔️ 지상'}</span>
            </div>
            <p style="font-size:11px;color:#cbd5e1;">${e.desc}</p>
            <div style="font-size:11px;color:#94a3b8;">
              HP: ${e.maxHp} · 공격력: ${e.damage} · 장갑: ${Math.round((e.armor || 0) * 100)}% · 보상: ${e.goldReward}G
            </div>
          </div>
        `;
      }).join('');
    } else if (this.currentCodexCategory === 'relics') {
      const setHtml = Object.values(SYNERGY_SETS)
        .map(
          (s) => `
          <div class="codex-item-card" style="border-color:#a855f7;">
            <strong style="font-size:14px;color:#e9d5ff;">${s.icon} [세트 시너지] ${s.name}</strong>
            <p style="font-size:11px;color:#cbd5e1;">${s.description || ''}</p>
            ${(s.tiers || [])
              .map((t) => `<div style="font-size:11px;color:#fde047;">• (${t.count}세트) ${t.label}</div>`)
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
            <span class="badge-pill">${r.rarity.toUpperCase()}</span>
          </div>
          <p style="font-size:11px;color:#cbd5e1;">${r.desc}</p>
        </div>
      `
      ).join('');

      grid.innerHTML = setHtml + relicHtml;
    } else {
      grid.innerHTML = `
        <div class="codex-item-card">
          <strong style="color:#fde047;">☀️ 1. 주간 정비 & 경제 부흥</strong>
          <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
            낮 동안 금광(🪙), 풍차 농장(🌾), 아르곤 정제소(💎)를 먼저 건설하세요. 여명이 밝을 때마다 모든 경제 건물이 막대한 자원을 생산하며, 파괴된 성벽과 포탑도 여명에 100% 무료 재건됩니다!
          </p>
        </div>
        <div class="codex-item-card">
          <strong style="color:#38bdf8;">🏰 2. 3단계 강화 & 20종 궁극 특화 진화</strong>
          <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
            모든 건물은 Lv.3 달성 후 두 가지 궁극 진화 분기 중 하나를 선택할 수 있습니다. (예: 궁수탑 → 보스 학살용 [거신병 발리스타] vs 군단 섬멸용 [개틀링 석궁]). 단축키 [B]를 누르면 스마트 건설 감독관이 최적의 건물을 자동 증축합니다!
          </p>
        </div>
        <div class="codex-item-card">
          <strong style="color:#a855f7;">⚔️ 3. 군주 직접 전투 & 전군 집결 [T]</strong>
          <p style="font-size:12px;color:#cbd5e1;line-height:1.5;">
            WASD 또는 마우스 클릭으로 군주를 이동하며 Q, E, R 스킬과 Space 돌격 대시를 사용하세요. 위험한 차원문 앞에는 [T] 키를 눌러 병영의 성기사와 발키리 부대를 즉시 집결시킬 수 있습니다.
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
        <div class="stat-mini-box"><span>무한 최고 기록</span><strong>제${saveSystem.data.bestEndlessWave}야</strong></div>
        <div class="stat-mini-box"><span>최고 점수</span><strong>${saveSystem.data.bestScore.toLocaleString()}</strong></div>
      `;
    }

    const histEl = document.getElementById('run-history-list');
    if (histEl) {
      const history = saveSystem.data.runHistory || [];
      if (history.length === 0) {
        histEl.innerHTML = `<div style="font-size:12px;color:#64748b;padding:12px;">아직 완료된 원정 연대기가 없습니다. 첫 출정을 시작해 보세요!</div>`;
      } else {
        histEl.innerHTML = history
          .map(
            (h) => `
          <div class="ach-card">
            <div>
              <div style="font-size:12px;font-weight:800;color:${h.victory ? '#fde047' : '#f8fafc'}">
                ${h.victory ? '👑 승리' : '⚔️ 분전'} · ${h.realmName} (제${h.wave}야)
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
  // IN-GAME HUD & CONTEXTUAL ARCHITECT PANEL
  // =========================================================================
  syncHud(snap) {
    if (!snap) return;

    document.getElementById('hud-phase-icon').textContent = snap.phase === 'night' ? '🌙' : '☀️';
    document.getElementById('hud-realm-title').textContent = snap.realm.name;
    document.getElementById('hud-wave-subtitle').textContent =
      snap.phase === 'night'
        ? `제${snap.wave}${snap.isEndless ? '(무한)' : `/${snap.totalWaves}`}야 교전 중 · 남은 적: ${snap.enemiesRemaining}`
        : `제${snap.wave}${snap.isEndless ? '(무한)' : `/${snap.totalWaves}`}야 정비 중 (낮)`;

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
      document.getElementById('hud-hero-icon').textContent = snap.hero.icon;
      document.getElementById('hud-hero-name').textContent = snap.hero.name;
      const stateEl = document.getElementById('hud-hero-state');
      if (snap.hero.isDead) {
        stateEl.textContent = `부활 대기 (${snap.hero.reviveTimer.toFixed(1)}s)`;
        stateEl.style.color = '#f43f5e';
      } else {
        stateEl.textContent = '전장 지휘 중';
        stateEl.style.color = '#34d399';
      }
      const hPct = Math.max(0, Math.min(100, (snap.hero.hp / Math.max(1, snap.hero.maxHp)) * 100));
      document.getElementById('hud-hero-hp-fill').style.width = `${hPct}%`;
      document.getElementById('hud-hero-hp-text').textContent = `${snap.hero.hp} / ${snap.hero.maxHp} HP · 이동: WASD / 클릭`;

      // Skills Icons & Cooldowns
      for (const k of ['q', 'e', 'r']) {
        const sk = snap.hero.skills[k];
        document.getElementById(`skill-${k}-icon`).textContent = sk.icon;
        document.getElementById(`skill-${k}-name`).textContent = sk.name.slice(0, 5);
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
          <span class="bell-icon">⚔️</span>
          <div class="call-night-text">
            <strong>야간 공성 방어 중!</strong>
            <small>남은 적군: ${snap.enemiesRemaining}기 · 콤보: ${snap.killCombo}x</small>
          </div>
        `;
      } else {
        callBtn.classList.remove('night-active');
        callBtn.innerHTML = `
          <span class="bell-icon">🔔</span>
          <div class="call-night-text">
            <strong>전투 개시 (밤 맞이하기)</strong>
            <small>단축키 [Enter] · 제${snap.wave}야 시작</small>
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
        document.getElementById('boss-banner-name').textContent = `${activeBoss.spec.icon} ${activeBoss.spec.name}`;
        document.getElementById('boss-banner-hp').textContent = `${Math.round(activeBoss.hp)} / ${activeBoss.maxHp}`;
        const pct = Math.max(0, Math.min(100, (activeBoss.hp / activeBoss.maxHp) * 100));
        document.getElementById('boss-banner-fill').style.width = `${pct}%`;
      } else {
        bossBar.classList.add('hidden');
      }
    }

    // Left Dock: Threat Forecast
    const waveBadge = document.getElementById('threat-wave-badge');
    if (waveBadge) waveBadge.textContent = `WAVE ${snap.wave}`;
    const portalListEl = document.getElementById('threat-portal-list');
    if (portalListEl && snap.currentWaveDesc) {
      portalListEl.innerHTML = snap.currentWaveDesc.portalSummaries
        .map((ps) => {
          const chips = Object.entries(ps.enemies)
            .map(([eId, cnt]) => {
              const eSpec = getEnemySpec(eId);
              return `<span class="threat-chip">${eSpec.icon} ${eSpec.name} ×${cnt}</span>`;
            })
            .join('');
          return `
            <div class="threat-portal-row">
              <div class="threat-portal-title">📍 ${ps.portalName}</div>
              <div class="threat-enemy-chips">${chips}</div>
            </div>
          `;
        })
        .join('');
    }
    const hazardEl = document.getElementById('realm-hazard-note');
    if (hazardEl && snap.realm.hazard) {
      hazardEl.textContent = `⚡ ${snap.realm.hazard.name}: ${snap.realm.hazard.desc}`;
    }

    // Left Dock: Synergy Sets & Relics
    document.getElementById('hud-relic-count').textContent = `${snap.ownedRelics.length}개`;
    const synListEl = document.getElementById('hud-synergy-list');
    if (synListEl) {
      if (snap.activeSets.length === 0) {
        synListEl.innerHTML = `<span style="font-size:11px;color:#64748b;">여명 승리 시 유물 및 세트 시너지를 획득합니다.</span>`;
      } else {
        synListEl.innerHTML = snap.activeSets
          .map((s) => `<span class="synergy-chip" title="${s.activeTierLabel || ''}">${s.icon} ${s.name} (${s.count})</span>`)
          .join('');
      }
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
      title.textContent = '🏗️ 왕국 건설 감독관';
      // Show quick list of affordable sockets!
      const quickHtml = this.engine.sockets
        .slice(0, 8)
        .map((s) => {
          const b = s.building;
          if (!b) {
            const defType = s.defaultType || s.allowed[0];
            const bSpec = getBuildingSpec(defType);
            const cost = this.engine.getActionCost(defType, 1, null);
            return `
              <div class="arch-option-card" data-jump-sock="${s.id}">
                <div class="arch-opt-top">
                  <span class="arch-opt-name">📍 ${s.label} (빈 부지)</span>
                  <span class="arch-opt-cost">${cost.gold}🪙 ${cost.argon > 0 ? `${cost.argon}💎` : ''}</span>
                </div>
                <div class="arch-opt-desc">추천: ${bSpec.icon} ${bSpec.name} 건설</div>
              </div>
            `;
          }
          if (!b.evolutionId && b.tier < 3) {
            const cost = this.engine.getActionCost(b.typeId, b.tier + 1, null);
            return `
              <div class="arch-option-card" data-jump-sock="${s.id}">
                <div class="arch-opt-top">
                  <span class="arch-opt-name">${b.baseDef.icon} ${b.baseDef.name} (Lv.${b.tier})</span>
                  <span class="arch-opt-cost">▲ ${cost.gold}🪙 ${cost.argon > 0 ? `${cost.argon}💎` : ''}</span>
                </div>
                <div class="arch-opt-desc">${s.label} · 클릭하여 강화</div>
              </div>
            `;
          }
          return '';
        })
        .join('');

      body.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">
          3D 지도의 건설 부지를 클릭하거나 아래 목록을 눌러 건물을 건설·진화시키세요.
        </div>
        ${quickHtml}
      `;

      body.querySelectorAll('[data-jump-sock]').forEach((el) => {
        el.addEventListener('click', () => {
          soundEngine.playSfx('ui_click');
          this.engine.selectedSocketId = el.dataset.jumpSock;
          this.renderArchitectPanel();
        });
      });
      return;
    }

    title.textContent = `📍 ${sock.label}`;
    const b = sock.building;

    if (!b) {
      // Empty socket: show all allowed building types!
      body.innerHTML = sock.allowed
        .map((typeId) => {
          const bDef = getBuildingSpec(typeId);
          const t1 = getBuildingTierSpec(typeId, 1, null);
          const cost = this.engine.getActionCost(typeId, 1, null);
          return `
            <div class="arch-option-card" data-build-type="${typeId}">
              <div class="arch-opt-top">
                <span class="arch-opt-name">${bDef.icon} ${bDef.name} 건설</span>
                <span class="arch-opt-cost">${cost.gold}🪙 ${cost.argon > 0 ? `${cost.argon}💎` : ''}</span>
              </div>
              <div class="arch-opt-desc">${t1.desc}</div>
            </div>
          `;
        })
        .join('');

      body.querySelectorAll('[data-build-type]').forEach((card) => {
        card.addEventListener('click', () => {
          const res = this.engine.buildOrUpgradeSocket(sock.id, card.dataset.buildType, null);
          if (!res.ok) this.showToast(res.reason, 'danger');
          this.renderArchitectPanel();
        });
      });
      return;
    }

    // Existing building on socket
    let actionsHtml = '';
    if (b.evolutionId) {
      actionsHtml = `
        <div class="arch-option-card evolution-card">
          <div class="arch-opt-top">
            <span class="arch-opt-name">★ 최종 진화 완료: ${b.spec.icon || b.baseDef.icon} ${b.spec.name}</span>
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
            <span class="arch-opt-name">▲ ${nextSpec.name} 강화 [F]</span>
            <span class="arch-opt-cost">${cost.gold}🪙 ${cost.argon > 0 ? `${cost.argon}💎` : ''}</span>
          </div>
          <div class="arch-opt-desc">${nextSpec.desc}</div>
        </div>
      `;
    } else {
      // Tier 3 -> Show 2 Branching Evolutions!
      actionsHtml = (b.baseDef.evolutions || [])
        .map((evo) => {
          const cost = this.engine.getActionCost(b.typeId, 3, evo.id);
          return `
            <div class="arch-option-card evolution-card" data-evo-id="${evo.id}">
              <div class="arch-opt-top">
                <span class="arch-opt-name">★ ${evo.icon} ${evo.name}</span>
                <span class="arch-opt-cost">${cost.gold}🪙 ${cost.argon}💎</span>
              </div>
              <div class="arch-opt-desc">${evo.desc}</div>
            </div>
          `;
        })
        .join('');
    }

    const demolishBtn =
      b.typeId !== 'citadel' && this.engine.phase === 'day'
        ? `<button id="btn-arch-demolish" class="btn-mini" style="margin-top:6px;color:#fda4af;border-color:#f43f5e;">🗑️ 건물 철거 및 부지 재설계 (70% 환급)</button>`
        : '';

    body.innerHTML = `
      <div style="background:rgba(15,23,42,0.65);padding:8px 10px;border-radius:8px;font-size:12px;">
        <strong>${b.baseDef.icon} ${b.spec.name}</strong>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">내구도: ${Math.round(b.hp)} / ${b.maxHp} HP</div>
      </div>
      ${actionsHtml}
      ${demolishBtn}
      <button id="btn-arch-back" class="btn-mini" style="margin-top:4px;">← 전체 부지 목록 보기</button>
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
  // 3D-TO-2D PROJECTED WORLD SOCKET BADGES
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

    for (const sock of this.engine.sockets) {
      const el = this.socketBadgeElements.get(sock.id);
      if (!el) continue;

      // Hide socket build badges during Night unless damaged or selected
      const b = sock.building;
      if (this.engine.phase === 'night' && this.engine.selectedSocketId !== sock.id) {
        el.style.display = 'none';
        continue;
      }

      tempV.set(sock.x, b ? 3.2 : 1.3, sock.z).project(cam);
      if (tempV.z > 1) {
        el.style.display = 'none';
        continue;
      }

      const sx = (tempV.x * 0.5 + 0.5) * w;
      const sy = (-tempV.y * 0.5 + 0.5) * h;

      // Update label & affordability highlight
      let labelHtml = '';
      let canAfford = false;
      if (!b) {
        const defType = sock.defaultType || sock.allowed[0];
        const bSpec = getBuildingSpec(defType);
        const cost = this.engine.getActionCost(defType, 1, null);
        canAfford = this.engine.gold >= cost.gold && this.engine.argon >= cost.argon;
        labelHtml = `${bSpec.icon} ${sock.slotType === 'tactical' ? '거점' : bSpec.name.slice(0, 4)} <span class="cost-tag">${cost.gold}G</span>`;
      } else if (!b.evolutionId && b.tier < 3) {
        const cost = this.engine.getActionCost(b.typeId, b.tier + 1, null);
        canAfford = this.engine.gold >= cost.gold && this.engine.argon >= cost.argon;
        labelHtml = `${b.baseDef.icon} Lv.${b.tier} <span class="cost-tag">▲${cost.gold}G</span>`;
      } else if (!b.evolutionId && b.tier === 3) {
        const evo = b.baseDef.evolutions?.[0];
        const cost = this.engine.getActionCost(b.typeId, 3, evo?.id);
        canAfford = this.engine.gold >= cost.gold && this.engine.argon >= cost.argon;
        labelHtml = `${b.baseDef.icon} Lv.3 <span class="cost-tag">★진화</span>`;
      } else {
        labelHtml = `★ ${b.spec.icon || b.baseDef.icon} MAX`;
      }

      el.innerHTML = labelHtml;
      el.classList.toggle('selected', this.engine.selectedSocketId === sock.id);
      el.classList.toggle('affordable', canAfford);
      el.style.display = 'block';
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  }

  // =========================================================================
  // RELIC DRAFT MODAL & RUN END CHRONICLE MODAL
  // =========================================================================
  openRelicDraftModal(choices, rerollsLeft) {
    const modal = document.getElementById('relic-draft-modal');
    const cardsEl = document.getElementById('relic-draft-cards');
    const rerollBtn = document.getElementById('btn-reroll-relics');
    if (!modal || !cardsEl) return;

    modal.classList.remove('hidden');
    if (rerollBtn) {
      rerollBtn.textContent = `🎲 선택지 재추첨 (남은 횟수: ${rerollsLeft})`;
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
            <span class="badge-pill gold-badge">${r.rarity.toUpperCase()}</span>
            <h3 style="font-size:16px;color:#fff;">${r.name}</h3>
            <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">${synBadges}</div>
            <p style="font-size:12px;color:#cbd5e1;line-height:1.45;">${r.desc}</p>
            <small style="font-size:10px;color:#64748b;margin-top:auto;">"${r.lore || ''}"</small>
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
      <div class="relic-crown-badge">${summary.victory ? '👑 REALM CONQUERED' : '⚔️ VALIANT LAST STAND'}</div>
      <h2 style="font-size:24px;color:${summary.victory ? '#fde047' : '#fda4af'};margin-bottom:4px;">
        ${summary.victory ? `${summary.realmName} 완벽 평정!` : `${summary.realmName} 제${summary.wave}야 방어전 종료`}
      </h2>
      <p style="font-size:13px;color:#cbd5e1;">
        원정 보상으로 <strong style="color:#fde047;">+${summary.crownsEarned} 👑 별빛 왕관</strong>을 획득했습니다!
      </p>
    `;

    statsEl.innerHTML = `
      <div class="lifetime-stats-box" style="margin-top:8px;">
        <div class="stat-mini-box"><span>도달 웨이브</span><strong>제${summary.wave}야</strong></div>
        <div class="stat-mini-box"><span>최종 점수</span><strong>${summary.score.toLocaleString()}</strong></div>
        <div class="stat-mini-box"><span>적군 처치</span><strong>${summary.enemiesSlain.toLocaleString()}</strong></div>
        <div class="stat-mini-box"><span>보스 토벌</span><strong>${summary.bossesDefeated}</strong></div>
        <div class="stat-mini-box"><span>채굴 금화</span><strong>${summary.goldMined.toLocaleString()}G</strong></div>
        <div class="stat-mini-box"><span>획득 왕관</span><strong>+${summary.crownsEarned} 👑</strong></div>
      </div>
    `;

    // Render 3D scene once and generate 1920x1080 Chronicle Poster preview
    this.sceneManager.render();
    const poster = generateChroniclePoster(summary, this.canvas);
    if (posterImg && poster?.dataUrl) {
      posterImg.src = poster.dataUrl;
    }
  }

  // =========================================================================
  // MAIN 60FPS ANIMATION LOOP
  // =========================================================================
  loop(now) {
    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    // Poll WASD / Arrow movement input
    let moveX = 0;
    let moveZ = 0;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) moveZ -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) moveZ += 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) moveX -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) moveX += 1;

    // Rotate movement vector by cameraYaw so WASD always matches screen orientation
    if (moveX !== 0 || moveZ !== 0) {
      const cos = Math.cos(this.sceneManager.cameraYaw);
      const sin = Math.sin(this.sceneManager.cameraYaw);
      const rx = moveX * cos + moveZ * sin;
      const rz = -moveX * sin + moveZ * cos;
      moveX = rx;
      moveZ = rz;
    }

    if (this.engine.isPaused) {
      // Gently orbit camera when Command Hub is open for a gorgeous live 3D title screen!
      this.sceneManager.cameraYaw += dt * 0.12;
    } else {
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
