class JellyAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;

  private stepAccum = 0;
  private currentStep = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.7;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.38;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.65;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.02);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public resetMusic() {
    this.stepAccum = 0;
    this.currentStep = 0;
  }

  public updateMusic(
    dt: number,
    bpm: number,
    musicKey: 'strawberry' | 'mint' | 'mango' | 'stereo',
    active: boolean
  ): number {
    // Returns beat pulse (0..1) synced to quarter-note beat for visual bounce
    const stepDuration = 60 / bpm / 4; // 16th note
    if (!active) return 0;

    this.stepAccum += dt;
    while (this.stepAccum >= stepDuration) {
      this.stepAccum -= stepDuration;
      this.triggerStep(this.currentStep, musicKey);
      this.currentStep = (this.currentStep + 1) % 32;
    }

    const quarterProgress = ((this.currentStep % 4) + this.stepAccum / stepDuration) / 4;
    return Math.max(0, 1 - quarterProgress * 2.2);
  }

  private triggerStep(step: number, key: 'strawberry' | 'mint' | 'mango' | 'stereo') {
    if (this.muted) return;
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;

    // 4-on-the-floor kick
    if (step % 4 === 0) {
      this.synthKick(now);
    }
    // Crisp offbeat snare/clap
    if (step % 8 === 4) {
      this.synthSnare(now);
    }
    // Hi-hat groove
    if (step % 2 === 1 || ((key === 'mango' || key === 'stereo') && step % 4 === 2)) {
      this.synthHat(now, step % 4 === 2 ? 0.08 : 0.04);
    }

    // Bass & Lead patterns per level
    const scales = {
      strawberry: {
        bass: [130.81, 0, 130.81, 0, 164.81, 0, 196.0, 0, 174.61, 0, 174.61, 0, 146.83, 0, 196.0, 0],
        lead: [523.25, 0, 659.25, 783.99, 0, 659.25, 587.33, 0, 523.25, 659.25, 783.99, 880.0, 783.99, 0, 659.25, 587.33],
      },
      mint: {
        bass: [146.83, 146.83, 0, 146.83, 174.61, 0, 196.0, 0, 130.81, 130.81, 0, 130.81, 164.81, 0, 196.0, 220.0],
        lead: [587.33, 698.46, 880.0, 0, 783.99, 698.46, 659.25, 0, 587.33, 0, 698.46, 880.0, 1046.5, 0, 880.0, 783.99],
      },
      mango: {
        bass: [110.0, 0, 110.0, 220.0, 130.81, 0, 146.83, 0, 164.81, 0, 164.81, 196.0, 146.83, 0, 130.81, 110.0],
        lead: [659.25, 783.99, 880.0, 1046.5, 880.0, 0, 783.99, 659.25, 587.33, 659.25, 783.99, 0, 880.0, 1046.5, 1174.66, 0],
      },
      stereo: {
        // Classic upbeat F#m -> D -> A -> E progression at 160 BPM
        bass: [185.0, 0, 185.0, 369.99, 146.83, 0, 146.83, 293.66, 220.0, 0, 220.0, 440.0, 164.81, 0, 196.0, 220.0],
        lead: [739.99, 0, 880.0, 1108.73, 587.33, 0, 739.99, 880.0, 880.0, 0, 1108.73, 1318.51, 659.25, 830.61, 987.77, 830.61],
      },
    };

    const pat = scales[key];
    const idx = step % 16;
    const bassFreq = pat.bass[idx];
    if (bassFreq > 0) {
      this.synthBass(now, bassFreq, 0.14);
    }

    const leadFreq = pat.lead[(step + (step >= 16 ? 2 : 0)) % 16];
    if (leadFreq > 0 && (step % 2 === 0 || key !== 'strawberry')) {
      this.synthLead(now, leadFreq, 0.12);
    }
  }

  private synthKick(t: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  private synthSnare(t: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);
    g.gain.setValueAtTime(0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  private synthHat(t: number, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(6200, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  private synthBass(t: number, freq: number, dur: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(640, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + dur);
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private synthLead(t: number, freq: number, dur: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  // ============================================================================
  // JELLY SFX
  // ============================================================================

  public playJump() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(590, t + 0.09);
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playLand(intensity = 0.6) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(175, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.065);
    g.gain.setValueAtTime(Math.min(0.22, 0.09 + intensity * 0.13), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.075);
  }

  public playPadBounce() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(840, t + 0.15);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  public playOrb() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(960, t + 0.1);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playFlip() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.18);
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playDrop() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.setValueAtTime(1046.5, t + 0.045);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  public playCheckpoint() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.055);
      g.gain.setValueAtTime(0.2, t + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.055 + 0.11);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t + i * 0.055);
      osc.stop(t + i * 0.055 + 0.12);
    });
  }

  public playCrash() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;

    // Wet jelly splat thud
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.22);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);

    // Squish bubble pop
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(460, t + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(140, t + 0.16);
    g2.gain.setValueAtTime(0.24, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.start(t + 0.02);
    osc2.stop(t + 0.18);
  }

  public playComplete() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.085);
      g.gain.setValueAtTime(0.28, t + i * 0.085);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.085 + 0.35);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t + i * 0.085);
      osc.stop(t + i * 0.085 + 0.36);
    });
  }
}

export const audioEngine = new JellyAudioEngine();
