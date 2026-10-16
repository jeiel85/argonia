/**
 * @fileoverview Argonia Procedural WebAudio Sound & Music Engine
 * 100% zero-asset procedural synthesis for medieval-fantasy tactical defense.
 */

const MIDI_TO_FREQ = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// Realm root MIDI notes (Dorian / Aeolian / Phrygian flavor per realm)
const REALM_ROOTS = [
  50, // Realm 0: D3 (Argonia - Royal Dorian)
  48, // Realm 1: C3 (Frostpeak - Crystalline Aeolian)
  45, // Realm 2: A2 (Ashen Wastes - Phrygian Dominant)
  47, // Realm 3: B2 (Obsidian Void - Locrian/Harmonic Minor)
];

const SCALES = {
  dorian: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19],
  aeolian: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19],
  phrygianDom: [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19],
};

export class SoundEngine {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.reverbNode = null;
    this.reverbSend = null;
    this.noiseBuffer = null;
    this.pinkNoiseBuffer = null;

    this.muted = false;
    this.volume = 0.75;
    this.musicVolume = 0.42;
    this.sfxVolume = 0.85;

    this.musicMode = 'none';
    this.realmIndex = 0;
    this.stepIndex = 0;
    this.musicTimer = null;
    this.lastSfxTime = new Map();
  }

  /**
   * Initializes or resumes the AudioContext and master bus chain.
   */
  init() {
    try {
      if (!this.ctx) {
        const AudioCtx =
          typeof window !== 'undefined'
            ? window.AudioContext || window.webkitAudioContext
            : null;
        if (!AudioCtx) return false;

        this.ctx = new AudioCtx();

        // Master compressor to glue procedural voices & prevent clipping
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(18, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this.muted ? 0 : this.volume,
          this.ctx.currentTime
        );

        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);

        // Algorithmic impulse response for lush medieval hall reverb
        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = this._createReverbImpulse(2.2, 2.8);

        this.reverbSend = this.ctx.createGain();
        this.reverbSend.gain.setValueAtTime(0.28, this.ctx.currentTime);

        // Routing
        this.sfxBus.connect(this.compressor);
        this.sfxBus.connect(this.reverbSend);
        this.musicBus.connect(this.compressor);
        this.musicBus.connect(this.reverbSend);

        this.reverbSend.connect(this.reverbNode);
        this.reverbNode.connect(this.compressor);

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Pre-generate white & pink noise buffers
        this.noiseBuffer = this._createWhiteNoiseBuffer(2.0);
        this.pinkNoiseBuffer = this._createPinkNoiseBuffer(2.0);
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Alias for init() to unlock WebAudio on first user gesture.
   */
  unlock() {
    const ok = this.init();
    if (ok && this.musicMode !== 'none' && !this.musicTimer) {
      this._startSequencer();
    }
    return ok;
  }

  /**
   * Sets mute state.
   * @param {boolean} bool
   * @returns {boolean} Current muted state
   */
  setMuted(bool) {
    this.muted = Boolean(bool);
    try {
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(
          this.muted ? 0 : this.volume,
          now,
          0.025
        );
      }
    } catch {
      // Ignore headless errors
    }
    return this.muted;
  }

  /**
   * Toggles mute state and returns the new state.
   * @returns {boolean}
   */
  toggleMute() {
    return this.setMuted(!this.muted);
  }

  /**
   * Sets master volume [0, 1].
   * @param {number} val
   */
  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0));
    try {
      if (this.ctx && this.masterGain && !this.muted) {
        this.masterGain.gain.setTargetAtTime(
          this.volume,
          this.ctx.currentTime,
          0.03
        );
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Switches procedural music mode and realm tonal center.
   * @param {'menu' | 'day' | 'night' | 'boss' | 'victory' | 'defeat' | 'none'} mode
   * @param {number} [realmIndex=0]
   */
  setMusicMode(mode, realmIndex = 0) {
    try {
      this.realmIndex = Math.max(0, Math.min(3, realmIndex | 0));
      if (this.musicMode === mode) return;
      this.musicMode = mode;
      this.stepIndex = 0;

      if (mode === 'victory') {
        this._stopSequencer();
        this.playSfx('victory');
        return;
      }
      if (mode === 'defeat') {
        this._stopSequencer();
        this.playSfx('defeat');
        return;
      }
      if (mode === 'none') {
        this._stopSequencer();
        return;
      }

      this._startSequencer();
    } catch {
      // Safe fallback
    }
  }

  _stopSequencer() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _startSequencer() {
    this._stopSequencer();
    const stepMs =
      this.musicMode === 'boss'
        ? 150
        : this.musicMode === 'night'
          ? 175
          : this.musicMode === 'day'
            ? 230
            : 280; // menu

    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      try {
        this._tickMusicStep(this.stepIndex++);
      } catch {
        // Ignore step errors
      }
    }, stepMs);
  }

  _tickMusicStep(step) {
    const now = this.ctx.currentTime;
    const root = REALM_ROOTS[this.realmIndex] || 50;
    const barStep = step % 16;
    const phraseIndex = Math.floor(step / 16) % 4;

    if (this.musicMode === 'menu') {
      const scale = SCALES.dorian;
      // Warm ambient pad every 16 steps
      if (barStep === 0) {
        const chordRoots = [0, 3, 5, 4];
        const deg = chordRoots[phraseIndex];
        this._playPadVoice(MIDI_TO_FREQ(root + scale[deg]), 4.4, 0.08, 'sine');
        this._playPadVoice(
          MIDI_TO_FREQ(root + scale[deg + 2]),
          4.4,
          0.06,
          'triangle'
        );
        this._playPadVoice(
          MIDI_TO_FREQ(root + 12 + scale[deg + 4]),
          4.4,
          0.05,
          'sine'
        );
      }
      // Slow celestial harp arpeggio
      if (barStep % 2 === 0) {
        const arpPattern = [0, 2, 4, 7, 6, 4, 2, 4];
        const idx = arpPattern[(barStep / 2 + phraseIndex) % arpPattern.length];
        const freq = MIDI_TO_FREQ(root + 12 + scale[idx]);
        this._playPluck(freq, 0.55, 0.09, ((barStep % 4) - 1.5) * 0.25);
      }
      return;
    }

    if (this.musicMode === 'day') {
      const scale = this.realmIndex % 2 === 0 ? SCALES.dorian : SCALES.aeolian;
      const chordProg = [0, 4, 5, 3];
      const deg = chordProg[phraseIndex];

      // Majestic warm pad + bass note at start of bar
      if (barStep === 0 || barStep === 8) {
        const bassFreq = MIDI_TO_FREQ(root - 12 + scale[deg]);
        this._playPluck(bassFreq, 1.3, 0.14, 0);
        if (barStep === 0) {
          this._playPadVoice(MIDI_TO_FREQ(root + scale[deg]), 3.5, 0.07, 'triangle');
          this._playPadVoice(
            MIDI_TO_FREQ(root + scale[deg + 2]),
            3.5,
            0.05,
            'sine'
          );
        }
      }

      // Plucked lute/harp medieval arpeggios
      const lutePattern = [0, 2, 4, 2, 7, 4, 6, 4, 0, 2, 5, 4, 7, 9, 7, 4];
      if (barStep % 2 === 0 || barStep === 7 || barStep === 15) {
        const noteIdx = deg + (lutePattern[barStep] % 5);
        const freq = MIDI_TO_FREQ(root + 12 + scale[noteIdx % scale.length]);
        this._playPluck(freq, 0.42, 0.09, Math.sin(step * 0.5) * 0.35);
      }

      // Subtle crystalline chime on step 4 and 12
      if (barStep === 4 || (barStep === 12 && phraseIndex % 2 === 1)) {
        const chimeFreq = MIDI_TO_FREQ(root + 24 + scale[(deg + 4) % 8]);
        this._playBell(chimeFreq, 0.9, 0.045, 0.3);
      }
      return;
    }

    if (this.musicMode === 'night') {
      const scale =
        this.realmIndex === 2 ? SCALES.phrygianDom : SCALES.harmonicMinor;
      const chordProg = [0, 0, 5, 4];
      const deg = chordProg[phraseIndex];

      // Tactical war drums: low tom/kick on 0, 3, 6, 8, 12
      if (
        barStep === 0 ||
        barStep === 3 ||
        barStep === 6 ||
        barStep === 8 ||
        barStep === 12
      ) {
        this._playWarDrum(barStep === 0 ? 72 : 62, 0.22, barStep === 0 ? 0.22 : 0.15);
      }
      // Rimshot / snare tick on 4, 10, 12, 15
      if (barStep === 4 || barStep === 10 || barStep === 12 || barStep === 15) {
        this._playPercTick(0.08, (barStep % 2) * 0.2);
      }

      // Staccato tense bass ostinato
      const bassNote = MIDI_TO_FREQ(root - 12 + scale[deg]);
      this._playStaccatoBass(
        bassNote,
        0.14,
        barStep % 4 === 0 ? 0.14 : 0.09
      );

      // Minor-scale string/brass lead motif
      const melodySteps = { 0: 0, 2: 2, 4: 3, 6: 4, 8: 7, 11: 6, 12: 4, 14: 3 };
      if (melodySteps[barStep] !== undefined) {
        const mIdx = (deg + melodySteps[barStep]) % scale.length;
        const leadFreq = MIDI_TO_FREQ(root + 12 + scale[mIdx]);
        this._playBrassStringLead(leadFreq, 0.32, 0.075, -0.2);
      }
      return;
    }

    if (this.musicMode === 'boss') {
      const scale = SCALES.phrygianDom;
      const chordProg = [0, 1, 3, 1];
      const deg = chordProg[phraseIndex];

      // Sub-bass drone + choir sawtooth chord at bar start
      if (barStep === 0) {
        const subFreq = MIDI_TO_FREQ(root - 12 + scale[deg]);
        this._playPadVoice(subFreq, 2.4, 0.16, 'sawtooth', 320);
        this._playPadVoice(
          MIDI_TO_FREQ(root + scale[deg]),
          2.4,
          0.09,
          'sawtooth',
          950
        );
        this._playPadVoice(
          MIDI_TO_FREQ(root + scale[deg + 2]),
          2.4,
          0.08,
          'sawtooth',
          1100
        );
      }

      // Polyrhythmic heavy war-percussion
      if (barStep % 2 === 0 || barStep === 3 || barStep === 11 || barStep === 15) {
        const accent = barStep % 4 === 0;
        this._playWarDrum(accent ? 68 : 54, 0.2, accent ? 0.25 : 0.16);
      }
      if (barStep % 4 === 2 || barStep === 7 || barStep === 13) {
        this._playPercTick(0.11, ((barStep % 3) - 1) * 0.35);
      }

      // Urgent fast arpeggio
      const arpSeq = [0, 1, 2, 4, 2, 1, 4, 6, 7, 6, 4, 2, 4, 2, 1, 0];
      const nIdx = (deg + arpSeq[barStep]) % scale.length;
      const arpFreq = MIDI_TO_FREQ(root + 12 + scale[nIdx]);
      this._playBrassStringLead(
        arpFreq,
        0.13,
        0.085,
        Math.cos(step * 0.7) * 0.45
      );
    }
  }

  // ===========================================================================
  // INTERNAL MUSIC INSTRUMENT SYNTHESIZERS
  // ===========================================================================

  _playPluck(freq, duration, gainVal, pan = 0) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const panner = this._createPanner(pan);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.002, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5.5, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.35;

    osc.connect(filter);
    osc2.connect(subGain);
    subGain.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.musicBus);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + duration + 0.02);
    osc2.stop(now + duration + 0.02);
    this._cleanupNodes(osc, [osc, osc2, subGain, filter, gain, panner]);
  }

  _playPadVoice(freq, duration, gainVal, type = 'sine', cutoff = 1200) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);

    osc.start(now);
    osc.stop(now + duration + 0.05);
    this._cleanupNodes(osc, [osc, filter, gain]);
  }

  _playBell(freq, duration, gainVal, pan = 0) {
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this._createPanner(pan);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.756, now); // Inharmonic bell partial

    const partialGain = this.ctx.createGain();
    partialGain.gain.setValueAtTime(0.25, now);
    partialGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.4);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gain);
    osc2.connect(partialGain);
    partialGain.connect(gain);
    gain.connect(panner);
    panner.connect(this.musicBus);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.02);
    osc2.stop(now + duration + 0.02);
    this._cleanupNodes(osc1, [osc1, osc2, partialGain, gain, panner]);
  }

  _playWarDrum(startFreq, duration, gainVal) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq * 1.6, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.musicBus);

    osc.start(now);
    osc.stop(now + duration + 0.02);
    this._cleanupNodes(osc, [osc, gain]);
  }

  _playPercTick(gainVal, pan = 0) {
    if (!this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(3.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    const panner = this._createPanner(pan);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.musicBus);

    src.start(now);
    src.stop(now + 0.06);
    this._cleanupNodes(src, [src, filter, gain, panner]);
  }

  _playStaccatoBass(freq, duration, gainVal) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.1, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);

    osc.start(now);
    osc.stop(now + duration + 0.015);
    this._cleanupNodes(osc, [osc, filter, gain]);
  }

  _playBrassStringLead(freq, duration, gainVal, pan = 0) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const panner = this._createPanner(pan);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, now);
    filter.Q.setValueAtTime(2.0, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.musicBus);

    osc.start(now);
    osc.stop(now + duration + 0.02);
    this._cleanupNodes(osc, [osc, filter, gain, panner]);
  }

  // ===========================================================================
  // PROCEDURAL SFX SYNTHESIS
  // ===========================================================================

  /**
   * Plays a procedural sound effect.
   * @param {string} type
   * @param {{ pan?: number, volume?: number, pitch?: number }} [options={}]
   */
  playSfx(type, options = {}) {
    try {
      if (this.muted) return;
      if (!this.ctx) this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      // Rate-limit identical SFX to avoid comb-filtering or overload
      const nowMs = performance.now();
      const prevMs = this.lastSfxTime.get(type) || 0;
      const minGap = type === 'ui_hover' ? 35 : 22;
      if (nowMs - prevMs < minGap) return;
      this.lastSfxTime.set(type, nowMs);

      const pan = Math.max(-1, Math.min(1, Number(options.pan) || 0));
      const vol = Math.max(0.05, Math.min(2.0, Number(options.volume) || 1.0));
      const pitch = Math.max(0.5, Math.min(2.0, Number(options.pitch) || 1.0));

      switch (type) {
        case 'ui_click':
          this._sfxTone(680 * pitch, 920 * pitch, 0.045, 0.16 * vol, 'triangle', pan);
          break;

        case 'ui_hover':
          this._sfxTone(520 * pitch, 610 * pitch, 0.028, 0.07 * vol, 'sine', pan);
          break;

        case 'build_construct':
          // Wooden mallet thud + stone placement + bright chime
          this._sfxTone(145 * pitch, 62 * pitch, 0.14, 0.35 * vol, 'sine', pan);
          this._sfxNoise(0.11, 850, 2.2, 0.25 * vol, 'bandpass', pan);
          this._sfxDelayed(0.07, () => {
            this._sfxTone(220 * pitch, 95 * pitch, 0.12, 0.28 * vol, 'triangle', pan);
            this._sfxTone(587.33 * pitch, 587.33 * pitch, 0.18, 0.14 * vol, 'sine', pan);
          });
          break;

        case 'build_upgrade':
          // Ascending forge anvil + major triad sparkle
          this._sfxNoise(0.07, 3200, 5.0, 0.2 * vol, 'bandpass', pan);
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            this._sfxDelayed(i * 0.055, () => {
              this._sfxTone(freq * pitch, freq * 1.01 * pitch, 0.24, 0.18 * vol, 'triangle', pan);
            });
          });
          break;

        case 'build_evol':
          // Heroic mythic ascension chord + shimmer
          this._sfxNoise(0.35, 1800, 1.5, 0.18 * vol, 'highpass', pan);
          [293.66, 440, 587.33, 739.99, 880, 1174.66].forEach((freq, i) => {
            this._sfxDelayed(i * 0.05, () => {
              this._sfxTone(freq * pitch, freq * 1.005 * pitch, 0.55, 0.2 * vol, 'sawtooth', pan, 2600);
            });
          });
          break;

        case 'gold_collect':
          // Crisp metallic double coin clink
          this._sfxTone(1318.5 * pitch, 1318.5 * pitch, 0.12, 0.18 * vol, 'sine', pan);
          this._sfxDelayed(0.055, () => {
            this._sfxTone(1760 * pitch, 1760 * pitch, 0.22, 0.22 * vol, 'sine', pan);
          });
          break;

        case 'argon_collect':
          // Crystalline harmonic shimmer
          [880, 1318.5, 1760, 2093].forEach((freq, i) => {
            this._sfxDelayed(i * 0.035, () => {
              this._sfxTone(freq * pitch, freq * 1.08 * pitch, 0.28, 0.15 * vol, 'sine', pan);
            });
          });
          break;

        case 'bow_shoot':
          // Bowstring twang + arrow air whoosh
          this._sfxTone(290 * pitch, 115 * pitch, 0.09, 0.22 * vol, 'triangle', pan);
          this._sfxNoise(0.085, 2400, 1.8, 0.18 * vol, 'bandpass', pan);
          break;

        case 'crossbow_volley':
          // Mechanical ratchet click + heavy triple bolt snap
          for (let i = 0; i < 3; i++) {
            this._sfxDelayed(i * 0.038, () => {
              this._sfxTone((380 - i * 30) * pitch, 120 * pitch, 0.08, 0.22 * vol, 'sawtooth', pan, 1600);
              this._sfxNoise(0.07, 2900, 2.5, 0.2 * vol, 'bandpass', pan);
            });
          }
          break;

        case 'mortar_fire':
          // Deep cannon thump + propellant hiss
          this._sfxTone(135 * pitch, 36 * pitch, 0.26, 0.42 * vol, 'sine', pan);
          this._sfxNoise(0.22, 420, 1.2, 0.32 * vol, 'lowpass', pan);
          break;

        case 'mortar_explode':
          // Heavy sub-bass detonation + crackling debris tail
          this._sfxTone(95 * pitch, 24 * pitch, 0.48, 0.52 * vol, 'sine', pan);
          this._sfxNoise(0.52, 650, 0.8, 0.45 * vol, 'lowpass', pan);
          this._sfxNoise(0.35, 1800, 1.4, 0.22 * vol, 'bandpass', pan);
          break;

        case 'arcane_beam':
          // Detuned resonant synth pulse
          this._sfxTone(440 * pitch, 880 * pitch, 0.24, 0.2 * vol, 'sawtooth', pan, 2200);
          this._sfxTone(446 * pitch, 660 * pitch, 0.24, 0.18 * vol, 'triangle', pan);
          break;

        case 'chain_lightning':
          // High-voltage jagged crackle + rapid pitch zap
          this._sfxNoise(0.18, 3800, 2.8, 0.32 * vol, 'bandpass', pan);
          this._sfxTone(1650 * pitch, 240 * pitch, 0.14, 0.26 * vol, 'sawtooth', pan, 4500);
          this._sfxDelayed(0.05, () => {
            this._sfxTone(2100 * pitch, 320 * pitch, 0.11, 0.22 * vol, 'sawtooth', pan, 4500);
          });
          break;

        case 'frost_nova':
          // Icy wind sweep + crystalline chime ring
          this._sfxNoise(0.38, 2600, 2.0, 0.25 * vol, 'bandpass', pan);
          [1046.5, 1567.98, 2093].forEach((freq, i) => {
            this._sfxDelayed(i * 0.03, () => {
              this._sfxTone(freq * pitch, freq * 0.96 * pitch, 0.35, 0.15 * vol, 'sine', pan);
            });
          });
          break;

        case 'ice_shatter':
          // Sharp high-frequency glass/ice burst
          this._sfxNoise(0.16, 4800, 3.0, 0.28 * vol, 'highpass', pan);
          [1975.5, 2637, 3136].forEach((freq, i) => {
            this._sfxDelayed(i * 0.022, () => {
              this._sfxTone(freq * pitch, freq * 0.85 * pitch, 0.1, 0.16 * vol, 'triangle', pan);
            });
          });
          break;

        case 'hero_slash':
          // Metallic blade swoosh
          this._sfxNoise(0.11, 2100 * pitch, 1.9, 0.26 * vol, 'bandpass', pan);
          this._sfxTone(540 * pitch, 170 * pitch, 0.1, 0.2 * vol, 'sawtooth', pan, 1800);
          break;

        case 'hero_skill_q':
          // Cleave / whirlwind heavy metallic arc
          this._sfxNoise(0.24, 1700 * pitch, 1.4, 0.34 * vol, 'bandpass', pan);
          this._sfxTone(320 * pitch, 110 * pitch, 0.24, 0.32 * vol, 'sawtooth', pan, 1500);
          this._sfxTone(640 * pitch, 960 * pitch, 0.18, 0.18 * vol, 'triangle', pan);
          break;

        case 'hero_skill_e':
          // Warcry / Aegis shield slam + golden resonance
          this._sfxTone(150 * pitch, 55 * pitch, 0.28, 0.38 * vol, 'sine', pan);
          [440, 554.37, 659.25].forEach((freq) => {
            this._sfxTone(freq * pitch, freq * pitch, 0.42, 0.16 * vol, 'triangle', pan);
          });
          break;

        case 'hero_skill_r':
          // Ultimate orbital judgment strike
          this._sfxTone(110 * pitch, 32 * pitch, 0.65, 0.5 * vol, 'sine', pan);
          this._sfxNoise(0.55, 900, 1.0, 0.4 * vol, 'lowpass', pan);
          [293.66, 440, 587.33, 880, 1174.66].forEach((freq, i) => {
            this._sfxDelayed(i * 0.04, () => {
              this._sfxTone(freq * pitch, freq * 1.01 * pitch, 0.6, 0.2 * vol, 'sawtooth', pan, 3000);
            });
          });
          break;

        case 'hero_dash':
          // Quick aerodynamic burst
          this._sfxNoise(0.13, 1500 * pitch, 1.5, 0.24 * vol, 'bandpass', pan);
          this._sfxTone(240 * pitch, 520 * pitch, 0.12, 0.18 * vol, 'sine', pan);
          break;

        case 'hero_hurt':
          // Armor impact thud + low grunt
          this._sfxTone(165 * pitch, 68 * pitch, 0.15, 0.34 * vol, 'sawtooth', pan, 650);
          this._sfxNoise(0.09, 950, 1.6, 0.25 * vol, 'bandpass', pan);
          break;

        case 'troop_rally':
          // Two-note brass call
          this._sfxTone(392 * pitch, 392 * pitch, 0.16, 0.22 * vol, 'sawtooth', pan, 1600);
          this._sfxDelayed(0.14, () => {
            this._sfxTone(523.25 * pitch, 523.25 * pitch, 0.32, 0.26 * vol, 'sawtooth', pan, 1900);
          });
          break;

        case 'horn_night_start':
          // Deep ominous Viking/medieval war horn with fifth overtone
          this._sfxTone(146.83 * pitch, 144.5 * pitch, 1.25, 0.34 * vol, 'sawtooth', pan, 720);
          this._sfxTone(220 * pitch, 218 * pitch, 1.25, 0.2 * vol, 'sawtooth', pan, 900);
          this._sfxTone(73.42 * pitch, 72 * pitch, 1.25, 0.28 * vol, 'triangle', pan);
          break;

        case 'dawn_fanfare':
          // Bright triumphant royal brass fanfare (D - F# - A - D5)
          [293.66, 369.99, 440, 587.33].forEach((freq, i) => {
            const dur = i === 3 ? 0.65 : 0.18;
            this._sfxDelayed(i * 0.13, () => {
              this._sfxTone(freq * pitch, freq * pitch, dur, 0.24 * vol, 'sawtooth', pan, 2100);
              this._sfxTone(freq * 0.5 * pitch, freq * 0.5 * pitch, dur, 0.15 * vol, 'triangle', pan);
            });
          });
          break;

        case 'boss_roar':
          // Monstrous guttural sub-growl + formant noise sweep
          this._sfxTone(98 * pitch, 42 * pitch, 0.95, 0.48 * vol, 'sawtooth', pan, 420);
          this._sfxTone(142 * pitch, 58 * pitch, 0.95, 0.35 * vol, 'sawtooth', pan, 550);
          this._sfxNoise(0.88, 380, 1.8, 0.42 * vol, 'bandpass', pan);
          break;

        case 'relic_pick':
          // Mystical celestial chord arpeggio
          [587.33, 739.99, 880, 1174.66, 1479.98].forEach((freq, i) => {
            this._sfxDelayed(i * 0.06, () => {
              this._sfxTone(freq * pitch, freq * pitch, 0.45, 0.18 * vol, 'sine', pan);
            });
          });
          break;

        case 'wall_hit':
          // Heavy stone/timber impact
          this._sfxTone(115 * pitch, 48 * pitch, 0.14, 0.32 * vol, 'sine', pan);
          this._sfxNoise(0.1, 680, 1.5, 0.24 * vol, 'lowpass', pan);
          break;

        case 'wall_break':
          // Catastrophic masonry collapse
          this._sfxTone(88 * pitch, 26 * pitch, 0.55, 0.48 * vol, 'sine', pan);
          this._sfxNoise(0.65, 520, 0.7, 0.45 * vol, 'lowpass', pan);
          this._sfxDelayed(0.12, () => {
            this._sfxNoise(0.45, 1200, 1.2, 0.3 * vol, 'bandpass', pan);
          });
          break;

        case 'victory':
          // Grand royal victory fanfare
          [
            { f: 293.66, t: 0, d: 0.18 },
            { f: 440.0, t: 0.15, d: 0.18 },
            { f: 587.33, t: 0.3, d: 0.22 },
            { f: 739.99, t: 0.5, d: 0.25 },
            { f: 880.0, t: 0.72, d: 0.95 },
          ].forEach((n) => {
            this._sfxDelayed(n.t, () => {
              this._sfxTone(n.f, n.f, n.d, 0.26 * vol, 'sawtooth', 0, 2400);
              this._sfxTone(n.f * 0.5, n.f * 0.5, n.d, 0.2 * vol, 'triangle', 0);
            });
          });
          break;

        case 'defeat':
          // Somber descending minor dirge
          [
            { f: 329.63, t: 0, d: 0.38 },
            { f: 311.13, t: 0.35, d: 0.38 },
            { f: 293.66, t: 0.7, d: 0.42 },
            { f: 220.0, t: 1.1, d: 1.1 },
          ].forEach((n) => {
            this._sfxDelayed(n.t, () => {
              this._sfxTone(n.f, n.f * 0.98, n.d, 0.25 * vol, 'sawtooth', 0, 950);
              this._sfxTone(n.f * 0.5, n.f * 0.49, n.d, 0.22 * vol, 'sine', 0);
            });
          });
          break;

        default:
          // Fallback generic click/impact
          this._sfxTone(440 * pitch, 220 * pitch, 0.08, 0.15 * vol, 'triangle', pan);
          break;
      }
    } catch {
      // Never throw if AudioContext is blocked or closed
    }
  }

  // ===========================================================================
  // LOW-LEVEL SFX BUILDING BLOCKS & CLEANUP HELPERS
  // ===========================================================================

  _sfxTone(
    startFreq,
    endFreq,
    duration,
    gainVal,
    type = 'sine',
    pan = 0,
    cutoff = 4500
  ) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const panner = this._createPanner(pan);

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, startFreq), now);
    if (Math.abs(startFreq - endFreq) > 0.5) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        now + duration
      );
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxBus);

    osc.start(now);
    osc.stop(now + duration + 0.02);
    this._cleanupNodes(osc, [osc, filter, gain, panner]);
  }

  _sfxNoise(
    duration,
    filterFreq,
    q = 1.0,
    gainVal = 0.2,
    filterType = 'bandpass',
    pan = 0
  ) {
    if (!this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer =
      filterType === 'lowpass' && this.pinkNoiseBuffer
        ? this.pinkNoiseBuffer
        : this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(q, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const panner = this._createPanner(pan);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxBus);

    src.start(now);
    src.stop(now + duration + 0.02);
    this._cleanupNodes(src, [src, filter, gain, panner]);
  }

  _sfxDelayed(delaySec, fn) {
    setTimeout(() => {
      try {
        if (!this.muted && this.ctx) fn();
      } catch {
        // Ignore
      }
    }, delaySec * 1000);
  }

  _createPanner(pan = 0) {
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
      return p;
    }
    const g = this.ctx.createGain();
    return g;
  }

  _cleanupNodes(sourceNode, nodes) {
    sourceNode.onended = () => {
      for (let i = 0; i < nodes.length; i++) {
        try {
          nodes[i].disconnect();
        } catch {
          // Already disconnected
        }
      }
    };
  }

  _createWhiteNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  _createPinkNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buf;
  }

  _createReverbImpulse(durationSec, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * durationSec);
    const impulse = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, decay);
        channelData[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return impulse;
  }
}

export const soundEngine = new SoundEngine();
export default soundEngine;
