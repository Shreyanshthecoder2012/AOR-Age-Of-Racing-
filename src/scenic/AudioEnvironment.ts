import { EnvironmentTheme } from './AnimeSkybox';

export interface RadioTrack {
  id: string;
  title: string;
  artist: string;
  theme: EnvironmentTheme;
  bpm: number;
}

export const RADIO_TRACKS: RadioTrack[] = [
  {
    id: 'track_1',
    title: 'Sparkle of the Morning Valley',
    artist: '君の街 · Lofi Piano & Wind Chimes',
    theme: 'countryside',
    bpm: 78,
  },
  {
    id: 'track_2',
    title: 'Midnight Rain on Shinjuku Glass',
    artist: '深夜喫茶 · Rainy Jazz Hop',
    theme: 'rain_city',
    bpm: 72,
  },
  {
    id: 'track_3',
    title: 'Sunset Over Shonan Coast',
    artist: '茜色の空 · Dreamy Guitar & Rhodes',
    theme: 'coastal_sunset',
    bpm: 82,
  },
  {
    id: 'track_4',
    title: 'Summer Clouds & Endless Rails',
    artist: '夏雲の記憶 · Chillhop Journey',
    theme: 'countryside',
    bpm: 80,
  },
];

export class AudioEnvironment {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Engine audio nodes
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Rain noise node
  private rainNoiseNode: AudioNode | null = null;
  private rainGain: GainNode | null = null;

  // Ocean noise node
  private oceanNoiseNode: AudioNode | null = null;
  private oceanGain: GainNode | null = null;

  // Music sequencer state
  private isMusicPlaying: boolean = true;
  private currentTrackIndex: number = 0;
  private sequenceTimer: number | null = null;
  private step: number = 0;

  // Turn signal clicker
  private turnSignalTimer: number = 0;
  private turnSignalState: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.65;
    this.musicGain.connect(this.masterGain);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.5;
    this.ambientGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.45;
    this.sfxGain.connect(this.masterGain);

    // 1. Setup Engine Synthesizer
    this.setupEngineSynth();

    // 2. Setup Rain Ambient Soundscape
    this.setupRainSynth();

    // 3. Setup Ocean Surf Soundscape
    this.setupOceanSynth();

    // 4. Start Lo-Fi Generative Music Sequencer
    this.startMusicSequencer();
  }

  private setupEngineSynth() {
    if (!this.ctx || !this.sfxGain) return;

    // Gentle purring Japanese sports coupe engine
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'triangle';
    this.engineOsc.frequency.value = 55; // Idle ~800 RPM

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 240;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.15;

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start();
  }

  private setupRainSynth() {
    if (!this.ctx || !this.ambientGain) return;

    // Pink/White noise buffer for soothing rain
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.12;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.8;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0; // Off by default

    whiteNoise.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.ambientGain);

    whiteNoise.start();
    this.rainNoiseNode = whiteNoise;
  }

  private setupOceanSynth() {
    if (!this.ctx || !this.ambientGain) return;

    // Low rumble noise for ocean waves
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    this.oceanGain = this.ctx.createGain();
    this.oceanGain.gain.value = 0;

    source.connect(filter);
    filter.connect(this.oceanGain);
    this.oceanGain.connect(this.ambientGain);

    source.start();
    this.oceanNoiseNode = source;
  }

  private startMusicSequencer() {
    if (this.sequenceTimer !== null) clearInterval(this.sequenceTimer);

    // Warm Lo-Fi Progression Chords (Makoto Shinkai / Radwimps inspired chords: Fmaj9 -> G6 -> Em7 -> Am7)
    const chordProgressions = [
      // Countryside: Cmaj9 -> Am9 -> Fmaj7 -> Gsus4
      [
        [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9
        [220.00, 261.63, 329.63, 392.00, 493.88], // Am9
        [174.61, 261.63, 329.63, 349.23, 440.00], // Fmaj7
        [196.00, 293.66, 329.63, 392.00, 493.88], // Gsus4
      ],
      // Rain City: Dm9 -> G13 -> Cmaj9 -> A7alt
      [
        [293.66, 349.23, 440.00, 523.25, 659.25], // Dm9
        [196.00, 293.66, 329.63, 440.00, 523.25], // G13
        [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9
        [220.00, 277.18, 329.63, 392.00, 523.25], // A7#9
      ],
      // Coastal Sunset: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
      [
        [174.61, 261.63, 329.63, 440.00], // Fmaj7
        [164.81, 246.94, 329.63, 392.00], // Em7
        [146.83, 220.00, 261.63, 349.23], // Dm7
        [130.81, 196.00, 261.63, 329.63], // Cmaj7
      ],
    ];

    const currentTrack = RADIO_TRACKS[this.currentTrackIndex];
    const beatInterval = (60 / currentTrack.bpm) * 1000;

    this.step = 0;
    this.sequenceTimer = window.setInterval(() => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;

      const chords = chordProgressions[this.currentTrackIndex % chordProgressions.length];
      const chord = chords[Math.floor(this.step / 4) % chords.length];

      // Play soft electric piano chord on beat 0
      if (this.step % 4 === 0) {
        this.playRhodesChord(chord, 3.2);
        this.playLoFiKick();
      }

      // Soft rimshot snare on beat 2
      if (this.step % 4 === 2) {
        this.playLoFiRimshot();
      }

      // Melodic acoustic pluck on steps
      if (this.step % 2 === 1 && Math.random() > 0.3) {
        const note = chord[Math.floor(Math.random() * chord.length)] * 2;
        this.playAcousticPluck(note);
      }

      this.step = (this.step + 1) % 16;
    }, beatInterval / 2);
  }

  private playRhodesChord(frequencies: number[], duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    frequencies.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + duration);

      // Rhodes bell tone envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  private playAcousticPluck(freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  private playLoFiKick() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  private playLoFiRimshot() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playTurnSignalClick() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.turnSignalState ? 900 : 720, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.03);
    this.turnSignalState = !this.turnSignalState;
  }

  public playWiperSweep() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.15);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playScenicDiscoveryChime() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Japanese temple / chime chord
    const notes = [587.33, 739.99, 880.00, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 2.5);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 2.5);
    });
  }

  public playCrashClashSound() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Heavy low metal thump
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.exponentialRampToValueAtTime(35, now + 0.38);

    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.7, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    // Crunch noise buffer
    const bufSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc1.start(now);
    osc1.stop(now + 0.45);
    noise.start(now);
  }

  public playRepairSound() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Ascending repair wrench / power tool chime
    [320, 480, 640, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.25, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.35);
    });
  }

  public updateCarEngine(speedKmh: number, throttle: number) {
    if (!this.engineOsc || !this.engineFilter || !this.ctx) return;

    // Pitch shifts smoothly from idle (55Hz) to cruise (160Hz)
    const baseFreq = 55 + (speedKmh / 180) * 115 + (throttle * 25);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.08);

    const cutoff = 240 + (speedKmh / 180) * 450 + (throttle * 200);
    this.engineFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.08);
  }

  public setTheme(theme: EnvironmentTheme) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Adjust environmental soundscapes
    if (this.rainGain) {
      const rainVol = theme === 'rain_city' ? 0.38 : 0.0;
      this.rainGain.gain.setTargetAtTime(rainVol, now, 1.2);
    }

    if (this.oceanGain) {
      const oceanVol = theme === 'coastal_sunset' ? 0.35 : 0.0;
      this.oceanGain.gain.setTargetAtTime(oceanVol, now, 1.2);
    }

    // Auto-select matching radio track if user wants
    const matchedIdx = RADIO_TRACKS.findIndex((t) => t.theme === theme);
    if (matchedIdx !== -1 && matchedIdx !== this.currentTrackIndex) {
      this.currentTrackIndex = matchedIdx;
      this.startMusicSequencer();
    }
  }

  public toggleMusic(): boolean {
    this.isMusicPlaying = !this.isMusicPlaying;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.isMusicPlaying ? 0.65 : 0.0, this.ctx.currentTime, 0.3);
    }
    return this.isMusicPlaying;
  }

  public nextTrack(): RadioTrack {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % RADIO_TRACKS.length;
    this.startMusicSequencer();
    return RADIO_TRACKS[this.currentTrackIndex];
  }

  public prevTrack(): RadioTrack {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + RADIO_TRACKS.length) % RADIO_TRACKS.length;
    this.startMusicSequencer();
    return RADIO_TRACKS[this.currentTrackIndex];
  }

  public getCurrentTrack(): RadioTrack {
    return RADIO_TRACKS[this.currentTrackIndex];
  }

  public setMusicVolume(val: number) {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.05);
    }
  }

  public setAmbientVolume(val: number) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.05);
    }
  }
}
