/**
 * AudioManager - 3-Gold-Brew 數位合成音效管理員 (v4: Pure Bubble Grains)
 * 移除連續水流底噪，僅保留由隨機氣泡顆粒組成的音效。
 */

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // 氣泡顆粒調度 (Bubble Grains)
  private bubbleProbability: number = 0; 
  private pourIntensity: number = 0;

  private isEnabled: boolean = true;
  private volume: number = 0.5;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * 初始化 AudioContext (需在用戶交互後調用)
   */
  public async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = this.volume;

    console.log("AudioManager: Web Audio Context v4 (Pure Bubbles) initialized.");
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(v: number) {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 更新注水音效 (僅保留隨機氣泡)
   */
  public updatePouring(isPouring: boolean, intensity: number = 1.0) {
    if (!this.ctx || !this.isEnabled) return;

    this.pourIntensity = intensity;

    if (isPouring) {
      // 隨注水強度動態調整氣泡產生率
      // 強度越高，氣泡數量越多，音高也越高
      this.bubbleProbability = 0.2 + (intensity * 0.6); 
      this.maybeTriggerBubble();
    } else {
      this.bubbleProbability = 0;
    }
  }

  /**
   * 概率性觸發顆粒氣泡
   */
  private maybeTriggerBubble() {
    if (!this.ctx || this.bubbleProbability <= 0) return;
    
    // 隨機化的核心：模擬液體墜落的不對稱特質
    if (Math.random() < this.bubbleProbability) {
        this.triggerSingleBubble();
    }
  }

  /**
   * 產生單個隨機氣泡顆粒
   */
  private triggerSingleBubble() {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();

    // 隨機音高：營造豐富的液體質感
    const baseFreq = 700 + (this.pourIntensity * 500);
    const randFreq = baseFreq + (Math.random() * 1000);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(randFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(randFreq * 0.5, ctx.currentTime + 0.04);

    f.type = 'bandpass';
    f.frequency.value = randFreq;
    f.Q.value = 20 + Math.random() * 20; // 高 Q 值強化「啵」聲的中空感

    const dur = 0.02 + Math.random() * 0.05;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.1 + (Math.random() * 0.1), ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    osc.connect(f);
    f.connect(g);
    g.connect(master);

    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  // --- [功能性音效] ---

  public playBeep(freq: number = 880, duration: number = 0.1) {
    const ctx = this.ctx;
    const masterGain = this.masterGain;
    if (!ctx || !this.isEnabled || !masterGain) return;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  public playSuccessJingle() {
    const ctx = this.ctx;
    const masterGain = this.masterGain;
    if (!ctx || !this.isEnabled || !masterGain) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      g.gain.setValueAtTime(0, now + i * 0.12);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.3);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  }

  public playStartSound() {
    this.playBeep(440, 0.05);
    setTimeout(() => this.playBeep(880, 0.1), 100);
  }
}
