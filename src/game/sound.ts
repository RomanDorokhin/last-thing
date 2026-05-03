class SoundEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  enabled = true;

  init() {
    if (this.ctx) return;
    try {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.enabled = false;
    }
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'square', vol = 1) {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  shoot() {
    this.playTone(880, 0.1, 'square', 0.3);
    setTimeout(() => this.playTone(440, 0.15, 'sawtooth', 0.2), 30);
  }

  hit() {
    this.playTone(200, 0.2, 'sawtooth', 0.4);
  }

  collect() {
    this.playTone(523, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 80);
  }

  success() {
    this.playTone(523, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 100);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 200);
  }

  fail() {
    this.playTone(300, 0.3, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(150, 0.4, 'sawtooth', 0.4), 100);
  }

  jump() {
    this.playTone(300, 0.1, 'square', 0.2);
    setTimeout(() => this.playTone(450, 0.1, 'square', 0.15), 50);
  }

  step() {
    this.playTone(80, 0.05, 'triangle', 0.15);
  }

  alert() {
    this.playTone(600, 0.15, 'square', 0.2);
    setTimeout(() => this.playTone(600, 0.15, 'square', 0.2), 200);
  }

  hackBeep() {
    this.playTone(1000, 0.05, 'sine', 0.15);
  }

  hackError() {
    this.playTone(200, 0.3, 'sawtooth', 0.3);
  }

  phaseTransition() {
    this.playTone(200, 0.2, 'sine', 0.2);
    setTimeout(() => this.playTone(400, 0.2, 'sine', 0.2), 150);
    setTimeout(() => this.playTone(600, 0.3, 'sine', 0.3), 300);
  }

  victory() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, 'sine', 0.3), i * 150);
    });
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (this.masterGain) {
      this.masterGain.gain.value = v ? 0.4 : 0;
    }
  }
}

export const sound = new SoundEngine();
