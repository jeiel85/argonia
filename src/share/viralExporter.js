/**
 * @fileoverview Viral Export & Royal Chronicle Generator for Argonia: Crown of the Spire.
 * Pure ES Module with zero external dependencies.
 * Provides 1920x1080 2D canvas poster rendering, social share text formatting (Threads/X),
 * and 60fps WebGL MediaRecorder clip capture.
 */

const DEMO_URL = 'https://jeiel85.github.io/argonia/';
const WATERMARK_TEXT = 'ARGONIA // THREE.JS TACTICAL KINGDOM ROGUELITE';

/**
 * Helper to draw a rounded rectangle path on a 2D context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Normalizes incoming runData with rich fallback defaults so rendering never fails.
 * @param {Object} raw
 */
function normalizeRunData(raw = {}) {
  const wave = raw.wave ?? raw.waveReached ?? 1;
  const maxWaves = raw.maxWaves ?? 15;
  const isEndless = Boolean(raw.isEndless || raw.endlessMode || wave > maxWaves);
  const victory = Boolean(raw.victory ?? (raw.outcome === 'VICTORY'));

  return {
    victory,
    isEndless,
    wave,
    maxWaves,
    realmName: raw.realmName || raw.realm?.name || 'Valerion — Sunlit Bastion (발레리온 성채)',
    heroName: raw.heroName || raw.hero?.name || 'Aurelius the Dawnblade (여명검 아우렐리우스)',
    heroIcon: raw.heroIcon || raw.hero?.icon || '👑',
    score: Number(raw.score ?? raw.totalScore ?? 0),
    enemiesSlain: Number(raw.enemiesSlain ?? raw.kills ?? 0),
    goldMined: Number(raw.goldMined ?? raw.totalGold ?? raw.gold ?? 0),
    bossesDefeated: Number(raw.bossesDefeated ?? raw.bossKills ?? 0),
    mutatorSkulls: Number(raw.mutatorSkulls ?? raw.skulls ?? raw.heat ?? 0),
    seed: String(raw.seed || raw.seedCode || 'ARG-7777').toUpperCase(),
    timestamp: raw.timestamp || new Date().toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    synergies: Array.isArray(raw.synergies) ? raw.synergies : [],
    relics: Array.isArray(raw.relics) ? raw.relics : []
  };
}

/**
 * Generates an offscreen 1920x1080 Royal Chronicle poster canvas and returns its dataUrl + blobPromise.
 * @param {Object} runData
 * @param {HTMLCanvasElement} [sourceCanvas]
 * @returns {{ dataUrl: string, blobPromise: Promise<Blob|null>, canvas: HTMLCanvasElement }}
 */
export function generateChroniclePoster(runData = {}, sourceCanvas = null) {
  const data = normalizeRunData(runData);
  const W = 1920;
  const H = 1080;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. Background Layer (WebGL snapshot or procedural cyber-medieval royal gradient)
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#070913');
  bgGrad.addColorStop(0.5, '#10172a');
  bgGrad.addColorStop(1, '#090b16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
    try {
      ctx.save();
      const scale = Math.max(W / sourceCanvas.width, H / sourceCanvas.height);
      const sw = sourceCanvas.width * scale;
      const sh = sourceCanvas.height * scale;
      const sx = (W - sw) / 2;
      const sy = (H - sh) / 2;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(sourceCanvas, sx, sy, sw, sh);
      ctx.restore();
    } catch (_) {
      // Ignore tainted or unavailable WebGL context errors and keep procedural background
    }
  }

  // Subtle arcane hex/grid pattern & radial glow
  const radialVignette = ctx.createRadialGradient(W * 0.5, H * 0.45, 180, W * 0.5, H * 0.5, W * 0.72);
  radialVignette.addColorStop(0, 'rgba(14, 22, 45, 0.42)');
  radialVignette.addColorStop(0.6, 'rgba(8, 12, 26, 0.82)');
  radialVignette.addColorStop(1, 'rgba(3, 5, 12, 0.96)');
  ctx.fillStyle = radialVignette;
  ctx.fillRect(0, 0, W, H);

  // Decorative Arcane Aura Rings
  ctx.save();
  ctx.strokeStyle = data.victory ? 'rgba(245, 197, 66, 0.08)' : 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 2;
  for (const radius of [320, 480, 660]) {
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Cyber-Medieval Golden & Cyan Frame Overlay
  const pad = 42;
  ctx.save();
  roundRectPath(ctx, pad, pad, W - pad * 2, H - pad * 2, 20);
  ctx.fillStyle = 'rgba(10, 15, 29, 0.74)';
  ctx.fill();

  const frameGrad = ctx.createLinearGradient(0, pad, W, H - pad);
  frameGrad.addColorStop(0, '#f5c542');
  frameGrad.addColorStop(0.5, '#38bdf8');
  frameGrad.addColorStop(1, '#f5c542');
  ctx.strokeStyle = frameGrad;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Inner hairline frame
  roundRectPath(ctx, pad + 12, pad + 12, W - (pad + 12) * 2, H - (pad + 12) * 2, 14);
  ctx.strokeStyle = 'rgba(245, 197, 66, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Corner Ornaments
  const corners = [
    [pad + 24, pad + 24, 1, 1],
    [W - pad - 24, pad + 24, -1, 1],
    [pad + 24, H - pad - 24, 1, -1],
    [W - pad - 24, H - pad - 24, -1, -1]
  ];
  ctx.save();
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 3;
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * 28);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * 28, cy);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Header Title & Outcome Badge
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 20px "Segoe UI", "Malgun Gothic", sans-serif';
  ctx.fillText('ARGONIA: CROWN OF THE SPIRE — ROYAL CHRONICLE (왕국 연대기 기록서)', W / 2, 108);

  // Outcome Badge Pill
  let badgeText = `⚔️ VALIANT STAND — WAVE ${data.wave}`;
  let badgeBorder = '#f87171';
  let badgeFill = 'rgba(127, 29, 29, 0.55)';
  let badgeTextColor = '#fecaca';

  if (data.isEndless) {
    badgeText = `♾️ ENDLESS ABYSS RECORD — WAVE ${data.wave}`;
    badgeBorder = '#c084fc';
    badgeFill = 'rgba(88, 28, 135, 0.58)';
    badgeTextColor = '#f3e8ff';
  } else if (data.victory) {
    badgeText = '👑 VICTORY — REALM CONQUERED';
    badgeBorder = '#f5c542';
    badgeFill = 'rgba(120, 83, 14, 0.58)';
    badgeTextColor = '#fef08a';
  }

  const badgeW = 680;
  const badgeH = 62;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 128;

  roundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 31);
  ctx.fillStyle = badgeFill;
  ctx.fill();
  ctx.strokeStyle = badgeBorder;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = badgeTextColor;
  ctx.font = '800 30px "Segoe UI", "Malgun Gothic", sans-serif';
  ctx.fillText(badgeText, W / 2, badgeY + 41);
  ctx.restore();

  // 4. Monarch Hero, Realm, Seed & Mutator Skulls Bar
  const infoY = 216;
  const infoW = W - 180;
  const infoX = 90;
  const infoH = 112;

  ctx.save();
  roundRectPath(ctx, infoX, infoY, infoW, infoH, 16);
  ctx.fillStyle = 'rgba(17, 25, 48, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Left: Hero Icon & Monarch Name + Realm
  ctx.textAlign = 'left';
  ctx.font = '56px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText(data.heroIcon, infoX + 28, infoY + 75);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 30px "Segoe UI", "Malgun Gothic", sans-serif';
  ctx.fillText(data.heroName, infoX + 108, infoY + 48);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 21px "Segoe UI", "Malgun Gothic", sans-serif';
  ctx.fillText(`🏰 Realm: ${data.realmName}`, infoX + 108, infoY + 86);

  // Right: Seed Code, Mutator Skulls, Timestamp
  ctx.textAlign = 'right';
  const skullLabel = data.mutatorSkulls > 0 ? `💀 x${data.mutatorSkulls} MUTATOR SKULLS` : '🛡️ STANDARD ROYAL DECREE (💀 x0)';
  ctx.fillStyle = data.mutatorSkulls > 0 ? '#fca5a5' : '#7dd3fc';
  ctx.font = '700 22px "Segoe UI", "Malgun Gothic", sans-serif';
  ctx.fillText(skullLabel, infoX + infoW - 32, infoY + 44);

  ctx.fillStyle = '#f5c542';
  ctx.font = '700 22px Consolas, "Courier New", monospace';
  ctx.fillText(`SEED: ${data.seed}   |   🕒 ${data.timestamp}`, infoX + infoW - 32, infoY + 84);
  ctx.restore();

  // 5. Core Combat Statistics Grid (5 Cards)
  const stats = [
    { label: 'WAVE REACHED (도달 웨이브)', value: data.isEndless ? `W-${data.wave} (♾️)` : `${data.wave} / ${data.maxWaves}`, accent: '#38bdf8', icon: '🌊' },
    { label: 'TOTAL SCORE (총점)', value: data.score.toLocaleString(), accent: '#f5c542', icon: '🏆' },
    { label: 'ENEMIES SLAIN (처치한 적)', value: data.enemiesSlain.toLocaleString(), accent: '#f87171', icon: '⚔️' },
    { label: 'GOLD MINED (채굴 골드)', value: `${data.goldMined.toLocaleString()} G`, accent: '#fbbf24', icon: '🪙' },
    { label: 'BOSSES DEFEATED (보스 토벌)', value: data.bossesDefeated.toLocaleString(), accent: '#c084fc', icon: '🐉' }
  ];

  const gridY = 352;
  const gap = 22;
  const cardW = (infoW - gap * (stats.length - 1)) / stats.length;
  const cardH = 165;

  stats.forEach((st, idx) => {
    const cx = infoX + idx * (cardW + gap);
    ctx.save();
    roundRectPath(ctx, cx, gridY, cardW, cardH, 14);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.strokeStyle = st.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '32px "Segoe UI Emoji", sans-serif';
    ctx.fillText(st.icon, cx + cardW / 2, gridY + 46);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 15px "Segoe UI", "Malgun Gothic", sans-serif';
    ctx.fillText(st.label, cx + cardW / 2, gridY + 82);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px "Segoe UI", "Malgun Gothic", sans-serif';
    ctx.fillText(st.value, cx + cardW / 2, gridY + 134);
    ctx.restore();
  });

  // 6. Active Synergy Sets Section
  const synY = 545;
  const synH = 115;
  ctx.save();
  roundRectPath(ctx, infoX, synY, infoW, synH, 14);
  ctx.fillStyle = 'rgba(13, 20, 38, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 197, 66, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5c542';
  ctx.font = '800 19px "Segoe UI", "Malgun Gothic", sans-serif';
  ctx.fillText('✨ ACTIVE SYNERGY SETS (활성 유물 시너지 세트)', infoX + 26, synY + 36);

  const synergies = data.synergies.length > 0
    ? data.synergies.slice(0, 5)
    : [{ name: 'Royal Vanguard (왕실 선봉대)', icon: '🛡️', count: 2, required: 2 }];

  let badgeCursorX = infoX + 26;
  synergies.forEach((syn) => {
    const label = typeof syn === 'string'
      ? `⚡ ${syn}`
      : `${syn.icon || '⚡'} ${syn.name || syn.id} ${syn.count ? `(${syn.count}/${syn.required || syn.count})` : ''}`.trim();

    ctx.font = '700 20px "Segoe UI", "Malgun Gothic", sans-serif';
    const textWidth = ctx.measureText(label).width;
    const pillW = textWidth + 36;
    const pillH = 44;
    const pillY = synY + 52;

    if (badgeCursorX + pillW < infoX + infoW - 20) {
      roundRectPath(ctx, badgeCursorX, pillY, pillW, pillH, 22);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#e0f2fe';
      ctx.fillText(label, badgeCursorX + 18, pillY + 29);
      badgeCursorX += pillW + 16;
    }
  });
  ctx.restore();

  // 7. Top 8 Owned Relics Showcase
  const relY = 684;
  const relH = 264;
  ctx.save();
  roundRectPath(ctx, infoX, relY, infoW, relH, 14);
  ctx.fillStyle = 'rgba(13, 20, 38, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 19px "Segoe UI", "Malgun Gothic", sans-serif';
  ctx.fillText('🏺 ROYAL RELIC VAULT — TOP 8 RELICS (보유 핵심 유물)', infoX + 26, relY + 36);

  const topRelics = data.relics.slice(0, 8);
  const cols = 4;
  const relicGapX = 20;
  const relicGapY = 16;
  const relicCardW = (infoW - 52 - relicGapX * (cols - 1)) / cols;
  const relicCardH = 88;

  if (topRelics.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 22px "Segoe UI", "Malgun Gothic", sans-serif';
    ctx.fillText('No Relics Claimed in This Expedition (수집한 유물 없음)', infoX + 26, relY + 140);
  } else {
    topRelics.forEach((relic, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rx = infoX + 26 + col * (relicCardW + relicGapX);
      const ry = relY + 54 + row * (relicCardH + relicGapY);

      const rIcon = typeof relic === 'string' ? '💎' : (relic.icon || '💎');
      const rName = typeof relic === 'string' ? relic : (relic.name || relic.title || 'Royal Relic');
      const rSub = typeof relic === 'object' && (relic.rarity || relic.set)
        ? String(relic.rarity || relic.set).toUpperCase()
        : 'ROYAL ARTIFACT';

      roundRectPath(ctx, rx, ry, relicCardW, relicCardH, 10);
      ctx.fillStyle = 'rgba(23, 33, 58, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 197, 66, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '34px "Segoe UI Emoji", sans-serif';
      ctx.fillText(rIcon, rx + 18, ry + 56);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 20px "Segoe UI", "Malgun Gothic", sans-serif';
      const clippedName = rName.length > 22 ? `${rName.slice(0, 21)}…` : rName;
      ctx.fillText(clippedName, rx + 68, ry + 42);

      ctx.fillStyle = '#f5c542';
      ctx.font = '600 14px "Segoe UI", "Malgun Gothic", sans-serif';
      ctx.fillText(rSub, rx + 68, ry + 68);
    });
  }
  ctx.restore();

  // 8. Footer with Live Demo URL & Watermark
  ctx.save();
  const footerY = 1004;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 18px Consolas, "Segoe UI", sans-serif';
  ctx.fillText(WATERMARK_TEXT, infoX, footerY);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f5c542';
  ctx.font = '800 22px "Segoe UI", sans-serif';
  ctx.fillText(`🌐 PLAY LIVE: ${DEMO_URL}`, infoX + infoW, footerY);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/png');
  const blobPromise = new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } else {
      resolve(null);
    }
  });

  return { dataUrl, blobPromise, canvas };
}

/**
 * Generates the Royal Chronicle 1920x1080 poster and triggers a browser `.png` download.
 * @param {Object} runData
 * @param {HTMLCanvasElement} [sourceCanvas]
 * @returns {{ dataUrl: string, blobPromise: Promise<Blob|null>, filename: string }}
 */
export function downloadChroniclePoster(runData = {}, sourceCanvas = null) {
  const data = normalizeRunData(runData);
  const { dataUrl, blobPromise } = generateChroniclePoster(data, sourceCanvas);
  const cleanSeed = data.seed.replace(/[^A-Z0-9_-]/gi, '') || 'ROYAL';
  const filename = `argonia-chronicle-${cleanSeed}.png`;

  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return { dataUrl, blobPromise, filename };
}

/**
 * Builds a punchy, viral Korean + English share text formatted for Threads & X (Twitter).
 * @param {Object} runData
 * @returns {string}
 */
export function buildShareText(runData = {}) {
  const data = normalizeRunData(runData);

  const headline = data.isEndless
    ? `[ARGONIA] 무한의 심연 Wave ${data.wave} 기록 달성`
    : data.victory
      ? `[ARGONIA] 왕국 방어전 클리어! (Wave ${data.wave})`
      : `[ARGONIA] Wave ${data.wave} 방어전 기록`;

  const lines = [
    headline,
    `스코어: ${data.score.toLocaleString()}점 | 토벌: ${data.enemiesSlain}기 | 보스: ${data.bossesDefeated}체`,
    `지휘: ${data.heroName} (${data.realmName})`,
    `시드: ${data.seed}`,
    '',
    `웹에서 바로 플레이: ${DEMO_URL}`
  ];

  return lines.join('\n');
}

/**
 * Records 60fps WebM gameplay clips directly from the 3D WebGL canvas.
 */
export class BattleClipRecorder {
  /**
   * @param {{ onStateChange?: (isRecording: boolean, elapsedSec: number) => void }} [options]
   */
  constructor(options = {}) {
    this.onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : null;
    this._recorder = null;
    this._stream = null;
    this._chunks = [];
    this._recording = false;
    this._startTime = 0;
    this._tickInterval = null;
    this._autoStopTimeout = null;
  }

  /**
   * @returns {boolean}
   */
  isRecording() {
    return this._recording;
  }

  /**
   * Starts recording the given WebGL canvas at 60fps.
   * @param {HTMLCanvasElement} canvas
   * @param {number} [maxDurationMs=15000]
   * @returns {boolean} True if recording started successfully
   */
  start(canvas, maxDurationMs = 15000) {
    if (this._recording) return true;
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      return false;
    }

    try {
      this._stream = canvas.captureStream(60);
      const preferredMime = 'video/webm;codecs=vp9';
      const fallbackMime = 'video/webm';
      let mimeType = '';

      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported(preferredMime)) {
          mimeType = preferredMime;
        } else if (MediaRecorder.isTypeSupported(fallbackMime)) {
          mimeType = fallbackMime;
        }
      }

      const recorderOptions = mimeType
        ? { mimeType, videoBitsPerSecond: 8_000_000 }
        : { videoBitsPerSecond: 8_000_000 };

      this._chunks = [];
      this._recorder = new MediaRecorder(this._stream, recorderOptions);

      this._recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this._chunks.push(event.data);
        }
      };

      this._recorder.onstop = () => {
        this._cleanupTimers();
        this._recording = false;
        const elapsedSec = Math.max(1, Math.round((Date.now() - this._startTime) / 1000));

        if (this._chunks.length > 0 && typeof document !== 'undefined') {
          const blob = new Blob(this._chunks, { type: mimeType || 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `argonia-battle-clip-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }

        if (this._stream) {
          this._stream.getTracks().forEach((t) => t.stop());
          this._stream = null;
        }

        if (this.onStateChange) {
          this.onStateChange(false, elapsedSec);
        }
      };

      this._recorder.start(250);
      this._recording = true;
      this._startTime = Date.now();

      if (this.onStateChange) {
        this.onStateChange(true, 0);
      }

      this._tickInterval = setInterval(() => {
        if (!this._recording) return;
        const elapsedSec = Math.floor((Date.now() - this._startTime) / 1000);
        if (this.onStateChange) {
          this.onStateChange(true, elapsedSec);
        }
      }, 250);

      if (maxDurationMs > 0) {
        this._autoStopTimeout = setTimeout(() => {
          if (this._recording) {
            this.stop();
          }
        }, maxDurationMs);
      }

      return true;
    } catch (_) {
      this._cleanupTimers();
      this._recording = false;
      return false;
    }
  }

  /**
   * Stops an active recording and triggers `.webm` clip download.
   */
  stop() {
    this._cleanupTimers();
    if (this._recorder && this._recording && this._recorder.state !== 'inactive') {
      try {
        this._recorder.stop();
      } catch (_) {
        this._recording = false;
      }
    } else {
      this._recording = false;
    }
  }

  _cleanupTimers() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
    if (this._autoStopTimeout) {
      clearTimeout(this._autoStopTimeout);
      this._autoStopTimeout = null;
    }
  }
}
