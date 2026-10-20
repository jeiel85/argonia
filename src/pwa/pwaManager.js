/**
 * ARGONIA: Crown of the Spire — PWA Installation & Service Worker Manager
 * Handles Service Worker registration, `beforeinstallprompt` capture,
 * standalone mode detection, and one-click app installation UI.
 */

export class PwaManager {
  constructor({ onNotify } = {}) {
    this.onNotify = onNotify || (() => {});
    this.deferredPrompt = null;
    this.registration = null;
    this.installButtons = [];
  }

  /**
   * Checks if the app is currently running as an installed standalone PWA
   */
  isStandalone() {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      window.navigator?.standalone === true
    );
  }

  /**
   * Detects iOS / iPadOS Safari where manual "Add to Home Screen" is used
   */
  isIosSafari() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isWebkit = /WebKit/.test(ua);
    const isCriOS = /CriOS|FxiOS|EdgiOS/.test(ua);
    return isIOS && isWebkit && !isCriOS;
  }

  /**
   * Initializes Service Worker and binds install prompt listeners
   */
  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.installButtons = [
      document.getElementById('btn-title-install-pwa'),
      document.getElementById('btn-hub-install-pwa'),
    ].filter(Boolean);

    for (const btn of this.installButtons) {
      btn.addEventListener('click', () => this.promptInstall());
    }

    // If on iOS Safari and not yet installed, show install button to guide user
    if (this.isIosSafari() && !this.isStandalone()) {
      this.syncInstallButtons(true);
    } else {
      this.syncInstallButtons(false);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (!this.isStandalone()) {
        this.syncInstallButtons(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.syncInstallButtons(false);
      this.onNotify('아르고니아 앱이 기기에 설치되었습니다.', 'success');
    });

    // Listen to display-mode changes
    const mql = window.matchMedia?.('(display-mode: standalone)');
    if (mql?.addEventListener) {
      mql.addEventListener('change', (e) => {
        if (e.matches) {
          this.syncInstallButtons(false);
        }
      });
    }

    this.registerServiceWorker();
  }

  /**
   * Shows or hides all PWA install buttons in the UI
   */
  syncInstallButtons(visible) {
    const show = Boolean(visible) && !this.isStandalone();
    for (const btn of this.installButtons) {
      btn.classList.toggle('hidden', !show);
    }
  }

  /**
   * Triggers the native PWA installation prompt or shows platform guidance
   */
  async promptInstall() {
    if (this.isStandalone()) {
      this.onNotify('이미 앱 모드로 실행 중입니다.', 'info');
      return false;
    }

    if (this.deferredPrompt) {
      try {
        this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          this.deferredPrompt = null;
          this.syncInstallButtons(false);
          return true;
        }
      } catch (err) {
        console.warn('[Argonia PWA] Install prompt error:', err);
      }
      return false;
    }

    if (this.isIosSafari()) {
      this.onNotify('브라우저 공유 버튼 [↑] → "홈 화면에 추가"를 눌러 앱으로 설치하세요.', 'info');
      return false;
    }

    this.onNotify('주소창 우측의 앱 설치 아이콘을 눌러 설치할 수 있습니다.', 'info');
    return false;
  }

  /**
   * Registers the Service Worker (`sw.js`) for offline caching & PWA installability
   */
  async registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    const base = import.meta.env?.BASE_URL || './';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const swUrl = `${cleanBase}sw.js`;

    try {
      const reg = await navigator.serviceWorker.register(swUrl, { scope: cleanBase });
      this.registration = reg;

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      return reg;
    } catch (err) {
      console.warn('[Argonia PWA] Service Worker registration skipped or failed:', err);
      return null;
    }
  }
}
