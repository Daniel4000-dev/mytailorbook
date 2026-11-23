/**
 * High-Energy Studio Audio Engine for Stitch Wrap
 * 
 * Supports:
 * 1. Lagos Amapiano Groove (114 BPM synthesized log drums, shakers, 808 sub-bass, Rhodes chords)
 * 2. Afro-Fusion Runway (120 BPM synthesized Afrobeat brass, syncopated percussion, kick/snare)
 * 3. Custom Track Upload (user-selected audio file on device, 0 server upload, 0 copyright liability)
 * 4. Real-time AnalyserNode for live dancing equalizer bars
 * 5. MediaStreamDestination for zero-latency video recording
 */

export type AudioTrackId = 'lagos_amapiano' | 'afro_fusion' | 'custom' | 'mute';

export interface SoundEngineState {
  currentTrack: AudioTrackId;
  isPlaying: boolean;
  customFileName: string | null;
}

class WrapAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private masterGain: GainNode | null = null;

  private isRunning: boolean = false;
  private currentTrack: AudioTrackId = 'lagos_amapiano';
  private customAudioEl: HTMLAudioElement | null = null;
  private customSourceNode: MediaElementAudioSourceNode | null = null;

  private loopInterval: number | null = null;
  private stepIndex: number = 0;
  private customFileName: string | null = null;

  public init() {
    if (this.ctx) return;
    if (typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    this.destinationNode = this.ctx.createMediaStreamDestination();

    // Route: masterGain -> analyser -> ctx.destination (speakers) + destinationNode (video recorder)
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.analyser.connect(this.destinationNode);
  }

  public getAudioStreamTrack(): MediaStreamTrack | null {
    if (!this.destinationNode) return null;
    return this.destinationNode.stream.getAudioTracks()[0] || null;
  }

  public getAnalyserData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(16);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public async setTrack(trackId: AudioTrackId, customFile?: File) {
    this.stop();
    this.currentTrack = trackId;

    if (trackId === 'custom' && customFile) {
      this.customFileName = customFile.name;
      const url = URL.createObjectURL(customFile);
      if (this.customAudioEl) {
        this.customAudioEl.pause();
        this.customAudioEl.src = '';
      }
      this.customAudioEl = new Audio(url);
      this.customAudioEl.loop = true;
      this.customAudioEl.crossOrigin = 'anonymous';

      if (this.ctx && this.masterGain) {
        if (!this.customSourceNode) {
          this.customSourceNode = this.ctx.createMediaElementSource(this.customAudioEl);
          this.customSourceNode.connect(this.masterGain);
        }
      }
    }

    if (trackId !== 'mute') {
      await this.start();
    }
  }

  public async start() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.currentTrack === 'mute') return;
    this.isRunning = true;

    if (this.currentTrack === 'custom' && this.customAudioEl) {
      try {
        await this.customAudioEl.play();
      } catch {
        // Autoplay policy fallback
      }
      return;
    }

    // Synthesized Groove Loops
    const bpm = this.currentTrack === 'lagos_amapiano' ? 114 : 120;
    const stepTimeMs = (60 / bpm / 4) * 1000; // 16th-note steps
    this.stepIndex = 0;

    if (this.loopInterval) clearInterval(this.loopInterval);
    this.loopInterval = window.setInterval(() => {
      if (!this.isRunning || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const step = this.stepIndex % 16;

      if (this.currentTrack === 'lagos_amapiano') {
        this.playAmapianoStep(now, step);
      } else if (this.currentTrack === 'afro_fusion') {
        this.playAfrobeatStep(now, step);
      }

      this.stepIndex++;
    }, stepTimeMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }
  }

  /**
   * Authentic South African / Nigerian Amapiano Synthesis:
   * Heavy pitch-drop log drums, syncopated 16th shakers, 808 sub-kick, warm Rhodes 7th chords.
   */
  private playAmapianoStep(now: number, step: number) {
    if (!this.ctx || !this.masterGain) return;

    // 1. Kick on 0, 4, 8, 12 (Four-on-the-floor foundation)
    if (step % 4 === 0) {
      this.triggerKick(now);
    }

    // 2. High-energy syncopated Afro Shaker on all 16ths with velocity groove
    const shakerVolume = step % 4 === 2 ? 0.08 : step % 2 === 0 ? 0.04 : 0.02;
    this.triggerShaker(now, shakerVolume);

    // 3. Iconic Amapiano Log Drum on syncopated cuts: [0, 3, 6, 9, 11, 14]
    const logPitches: Record<number, number> = {
      0: 65.41,  // C2
      3: 58.27,  // A#1
      6: 65.41,  // C2
      9: 73.42,  // D2
      11: 65.41, // C2
      14: 87.31, // F2
    };
    if (logPitches[step]) {
      this.triggerLogDrum(now, logPitches[step]);
    }

    // 4. Lush Rhodes Chord Swell on beats 0 and 8
    if (step === 0) {
      this.triggerRhodesChord(now, [261.63, 311.13, 392.00, 466.16]); // Cm7
    } else if (step === 8) {
      this.triggerRhodesChord(now, [233.08, 293.66, 349.23, 440.00]); // Bb7
    }
  }

  /**
   * Afro-Fusion Runway Beat (120 BPM):
   * Driving syncopated clave, punchy kick/snare, brass synth stabs.
   */
  private playAfrobeatStep(now: number, step: number) {
    if (!this.ctx || !this.masterGain) return;

    // Kick on syncopated Afrobeat pattern: [0, 6, 10]
    if (step === 0 || step === 6 || step === 10) {
      this.triggerKick(now);
    }

    // Rimshot on 4 and 12
    if (step === 4 || step === 12) {
      this.triggerSnare(now);
    }

    // Syncopated Afro Clave: [0, 3, 6, 10, 12]
    if ([0, 3, 6, 10, 12].includes(step)) {
      this.triggerClave(now);
    }

    // Shakers on every 16th note
    this.triggerShaker(now, step % 2 === 0 ? 0.05 : 0.025);

    // Brass Synth Stabs on 2, 7, 14
    if (step === 2 || step === 7 || step === 14) {
      this.triggerBrassStab(now, step === 14 ? 349.23 : 293.66);
    }
  }

  // --- DSP SYNTHESIS INSTRUMENTS ---

  private triggerKick(now: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  private triggerLogDrum(now: number, baseFreq: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Iconic Amapiano fast pitch modulation
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 2.2, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  private triggerShaker(now: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.035);
  }

  private triggerSnare(now: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  private triggerClave(now: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  private triggerRhodesChord(now: number, frequencies: number[]) {
    if (!this.ctx || !this.masterGain) return;
    frequencies.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  private triggerBrassStab(now: number, freq: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  public getState(): SoundEngineState {
    return {
      currentTrack: this.currentTrack,
      isPlaying: this.isRunning,
      customFileName: this.customFileName,
    };
  }
}

export const wrapAudio = new WrapAudioEngine();

