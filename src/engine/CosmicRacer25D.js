/**
 * CosmicRacer25D - Ultra-Lightweight 2.5D Pseudo-3D Space Racing Engine
 * Engineered to run at 60+ FPS on ultra low-end hardware (potatoes, cheap phones, embedded displays).
 * Features:
 * - Simple & deep drift mechanics: Steering while holding brake increases rotation rate, creates zero-g space slip/inertia, charges mini-turbo boost
 * - Energy Rail Safety Clamping: Car NEVER leaves the track bounds (strictly clamped with rail contact spark FX & audio)
 * - Smooth acceleration curve & progressive braking
 * - Dedicated Nitro Boost system with tank capacity, regeneration, HUD telemetry, and flame burst
 * - Multi-sector lap timing with 3 sector checkpoints and live split differential (+/-)
 * - 6 dynamic AI Opponents with drafting, lane changes, live race positions (1ST to 7TH), and minimap radar
 * - 0 external asset overhead, pure Canvas 2D rasterizer + Web Audio synth
 */

import { StuntController } from '../physics/StuntController.ts';

// Color interpolation helpers for 3-lap atmospheric shift
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(rgb) {
  return '#' + rgb.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

function lerpColor(hexA, hexB, factor) {
  if (!hexA || !hexB) return hexA || hexB || '#ffffff';
  if (hexA.startsWith('rgba') || hexB.startsWith('rgba')) {
    return factor > 0.5 ? hexB : hexA;
  }
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex([
    a[0] + (b[0] - a[0]) * factor,
    a[1] + (b[1] - a[1]) * factor,
    a[2] + (b[2] - a[2]) * factor,
  ]);
}

// 3 Major Street Racing Atmospheric Progression Palettes over 3 laps
const PALETTE_DAY = {
  skyTop: '#1e3a8a',     // Sunset cobalt sky
  skyMid: '#ea580c',     // Blazing golden orange sunset horizon
  skyBottom: '#fed7aa',  // Warm twilight glow over city skyline
  roadLight: '#252a36',  // Real textured asphalt highway
  roadDark: '#1a1e28',   // Shadowed asphalt
  rumble1: '#dc2626',    // Real Armco highway red curb
  rumble2: '#f8fafc',    // Clean white safety curb
  lane1: '#ffffff',      // Crisp highway dashed lane lines
  lane2: 'rgba(255, 255, 255, 0.25)',
  rail1: '#94a3b8',      // Galvanized steel highway guardrail
  rail2: '#dc2626',      // Red highway hazard reflector
  hasSun: true,
  sunY: 0.38,
  sunRadius: 65,
  sunColor1: '#fffbeb',  // Golden setting sun behind skyscraper towers
  sunColor2: '#ea580c',
  sunCorona: 'rgba(254, 215, 170, 0.45)',
  cityLightAlpha: 0.35,  // Office windows start turning on
  streetLampGlow: 'rgba(255, 220, 120, 0.35)',
  phaseName: 'SUNSET HIGHWAY GRAND PRIX',
  icon: '🌇',
};

const PALETTE_SUNSET = {
  skyTop: '#2e1065',     // Deep violet twilight over metropolis
  skyMid: '#a21caf',     // Radiant magenta dusk horizon
  skyBottom: '#ea580c',  // Burning amber twilight city horizon
  roadLight: '#1f192b',  // Dusk-tinted highway tarmac
  roadDark: '#14101e',
  rumble1: '#f97316',    // Glowing amber street rumble
  rumble2: '#8b5cf6',    // Neon dusk purple curb
  lane1: '#fde047',      // Warm sodium yellow highway lane marker
  lane2: 'rgba(253, 224, 71, 0.25)',
  rail1: '#f59e0b',      // Amber illuminated crash barrier
  rail2: '#7c3aed',      // Purple dusk guardrail
  hasSun: true,
  sunY: 0.46,
  sunRadius: 75,
  sunColor1: '#ffea00',  // Giant setting twilight sun
  sunColor2: '#c026d3',
  sunCorona: 'rgba(234, 88, 12, 0.50)',
  cityLightAlpha: 0.75,  // Dazzling skyscraper window lights
  streetLampGlow: 'rgba(255, 180, 50, 0.65)',
  phaseName: 'CYBER DUSK METROPOLIS',
  icon: '🌆',
};

const PALETTE_DEEP_SPACE = {
  skyTop: '#020308',     // Inky midnight street sky
  skyMid: '#080d20',     // Deep midnight indigo city haze
  skyBottom: '#111833',  // Radiant neon skyline underglow
  roadLight: '#0d1017',  // Pitch black highway asphalt
  roadDark: '#07090f',
  rumble1: '#00f0ff',    // Neon cyan street curbs
  rumble2: '#ff0055',    // Hot neon pink Tokyo highway curbs
  lane1: '#00f0ff',      // Neon illuminated lane dashes
  lane2: 'rgba(0, 240, 255, 0.25)',
  rail1: '#00e5ff',      // Glowing neon crash barrier
  rail2: '#ff0055',      // Hot pink hazard barrier
  hasSun: false,
  cityLightAlpha: 1.0,   // Full blazing metropolis skyline neon
  streetLampGlow: 'rgba(0, 240, 255, 0.75)',
  phaseName: 'MIDNIGHT TOKYO SHUTO BATTLE',
  icon: '🌃',
};

export class CosmicRacer25D {
  constructor(canvasContainer, options = {}) {
    this.container = canvasContainer;
    this.options = options;

    // Stunt Engine Controller
    this.stuntController = new StuntController('arcade');

    // Canvas & Context
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'cosmic-canvas';
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    // Offscreen buffer for ultra low-spec mode
    this.ecoBuffer = document.createElement('canvas');
    this.ecoBuffer.width = 320;
    this.ecoBuffer.height = 240;
    this.ecoCtx = this.ecoBuffer.getContext('2d', { alpha: false });

    // Mode: 'hd' or 'eco'
    this.displayMode = options.displayMode || 'hd';

    // Track Geometry & Segments
    this.segments = [];
    this.trackLength = 0;
    this.segmentLength = 200;
    this.rumbleLength = 3;
    this.roadWidth = 2000;
    this.lanes = 3;

    // Checkpoint Sectors: Track is split into 3 sectors
    this.sectorCount = 3;
    this.checkpoints = [0.33, 0.66, 1.0];
    this.currentSector = 0;
    this.sectorTimes = [0, 0, 0];
    this.bestSectorTimes = [null, null, null];

    // Camera & Projection
    this.cameraDepth = 0.84;
    this.cameraHeight = 1000;
    this.drawDistance = 180;
    this.cameraMode = 1; // 1: Chase, 2: Cockpit, 3: Drone

    // Player Physics & Motion
    this.playerX = 0; // -0.92 to 0.92 across road (strictly clamped inside rails)
    this.position = 0; // Z distance along track
    this.speed = 0;
    this.targetSpeed = 0;
    this.maxSpeed = 12500;
    this.accelRate = 3800; // Smooth acceleration ramp
    this.brakeRate = 9500; // Progressive braking
    this.frictionRate = 1800; // Natural inertia coasting

    // Space Drift & Inertia Dynamics
    this.isDrifting = false;
    this.driftDirection = 0; // -1 (left), 1 (right)
    this.driftAngle = 0; // Visual slip angle
    this.driftTime = 0; // Drift duration for mini-turbo tiers
    this.driftLevel = 0; // 0: None, 1: Blue, 2: Orange, 3: Purple (Ultra)
    this.lateralVelocity = 0; // Space inertia sideways slide

    // Rail Clamping & Wall Bounce
    this.railContact = 0; // -1 for left rail, 1 for right rail, 0 for clear
    this.railSparks = [];

    // Nitro Boost System
    this.nitro = 100; // 0 to 100%
    this.nitroMax = 100;
    this.nitroActive = false;
    this.nitroDrainRate = 28; // % per second
    this.nitroRechargeRate = 8; // % per second passively
    this.boostTimer = 0; // Timed bursts from mini-turbo or warp pads

    // Visual Bank & Shake
    this.bankAngle = 0;
    this.screenShake = 0;

    // Input States
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      boost: false,
    };
    this.autopilot = false;

    // Race Timing & Laps
    this.totalLaps = 3;
    this.currentLap = 1;
    this.currentLapTime = 0;
    this.totalRaceTime = 0;
    this.bestLapTime = null;
    this.lapTimes = [];
    this.raceFinished = false;
    this.raceStarted = false;
    this.countdownActive = false;
    this.countdownValue = 0;
    this.racePosition = 1; // 1 to 7

    // Telemetry
    this.fps = 60;
    this.frameTimeMs = 6.8;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsTimer = 0;

    // Starfield & Parallax
    this.stars = [];
    this.planets = [];

    // AI Drone Racers
    this.cars = [];

    // Callbacks
    this.onLapComplete = options.onLapComplete || null;
    this.onFinish = options.onFinish || null;
    this.onSpeedUpdate = options.onSpeedUpdate || null;
    this.onCountdownTick = options.onCountdownTick || null;
    this.onLightsOut = options.onLightsOut || null;
    this.onSectorComplete = options.onSectorComplete || null;
    this.onPositionUpdate = options.onPositionUpdate || null;
    this.onNitroUpdate = options.onNitroUpdate || null;
    this.onStunt = options.onStunt || null;
    this.onPhaseChange = options.onPhaseChange || null;
    this.onOvertakeAlert = options.onOvertakeAlert || null;

    // Atmosphere Phase & Color Shift System (3 Laps Progression)
    this.currentPhase = 1;
    this.currentPhaseName = 'DAYLIGHT GRAND PRIX';
    this.currentPalette = null;
    this.updatePalette(0);

    // Dynamic Ramp & Smooth Landing Spring System
    this.landingPuffs = [];
    this.landingTimer = 0;
    this.landingDuration = 0;
    this.landingBounce = 0;
    this.landingPitch = 0;
    this.cameraDip = 0;
    this.wasAirborne = false;

    // Competitive AI Overtake Tracking
    this.activeOvertake = null;
    this.overtakeAlertCooldown = 0;

    // Stunt Controller Event Wiring
    this.stuntController.onStuntTrigger = (name) => {
      this.playBoostSound();
      if (this.onStunt) this.onStunt(name, 0);
    };
    this.stuntController.onStuntLand = (name, score) => {
      this.playMiniTurboSound(2);
      this.nitro = Math.min(this.nitroMax, this.nitro + 15);
      if (this.onStunt) this.onStunt(name, score);
    };

    // Audio & World Init
    this.initAudio();
    this.buildSpaceTrack();
    this.initCityBackdrop();
    this.initCars();
    this.setupListeners();
    this.resize();

    // Start Animation Loop
    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  // ---------------------------------------------------------------------------
  // PROCEDURAL WEB AUDIO SYNTHESIZER
  // ---------------------------------------------------------------------------
  initAudio() {
    this.audioEnabled = false;
    this.audioCtx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.driftOsc = null;
    this.driftGain = null;
  }

  ensureAudio() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setAudioEnabled(enabled) {
    this.audioEnabled = enabled;
    if (enabled) {
      this.ensureAudio();
      this.startEngineAudio();
    } else {
      this.stopEngineAudio();
    }
    return this.audioEnabled;
  }

  toggleAudio() {
    return this.setAudioEnabled(!this.audioEnabled);
  }

  startEngineAudio() {
    if (!this.audioCtx || this.engineOsc) return;
    try {
      // Main Sawtooth Engine
      this.engineOsc = this.audioCtx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 65;

      const engineFilter = this.audioCtx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 380;

      this.engineGain = this.audioCtx.createGain();
      this.engineGain.gain.value = 0.07;

      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.audioCtx.destination);
      this.engineOsc.start();

      // Drift plasma screech oscillator
      this.driftOsc = this.audioCtx.createOscillator();
      this.driftOsc.type = 'triangle';
      this.driftOsc.frequency.value = 400;

      this.driftGain = this.audioCtx.createGain();
      this.driftGain.gain.value = 0.0001;

      this.driftOsc.connect(this.driftGain);
      this.driftGain.connect(this.audioCtx.destination);
      this.driftOsc.start();
    } catch (_e) {}
  }

  stopEngineAudio() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (_e) {}
      this.engineOsc = null;
    }
    if (this.driftOsc) {
      try {
        this.driftOsc.stop();
        this.driftOsc.disconnect();
      } catch (_e) {}
      this.driftOsc = null;
    }
  }

  updateEngineSound(speedRatio) {
    if (!this.audioEnabled || !this.engineOsc || !this.audioCtx) return;
    const isAccelerated = this.nitroActive || this.boostTimer > 0;
    const baseFreq = 65 + speedRatio * 240 + (isAccelerated ? 95 : 0) + (this.isDrifting ? 30 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.audioCtx.currentTime, 0.05);

    if (this.driftGain) {
      const targetDriftVol = this.isDrifting ? 0.08 : 0.0001;
      this.driftGain.gain.setTargetAtTime(targetDriftVol, this.audioCtx.currentTime, 0.06);
      if (this.driftOsc && this.isDrifting) {
        this.driftOsc.frequency.setValueAtTime(320 + this.driftTime * 220, this.audioCtx.currentTime);
      }
    }
  }

  playBeep(freq = 440, duration = 0.12, type = 'sine') {
    if (!this.audioEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (_e) {}
  }

  playBoostSound() {
    if (!this.audioEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1180, this.audioCtx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.24, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.38);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.38);
    } catch (_e) {}
  }

  playMiniTurboSound(level = 1) {
    if (!this.audioEnabled) return;
    const base = 500 + level * 180;
    this.playBeep(base, 0.12, 'square');
    this.playTurboBlowOffSound();
  }

  playTurboBlowOffSound() {
    if (!this.audioEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;
    try {
      // High-pressure turbo compressor flutter (pshh-chi-chi-chi)
      [1400, 1100, 850, 650].forEach((freq, idx) => {
        setTimeout(() => {
          this.playBeep(freq, 0.04, 'triangle');
        }, idx * 35);
      });
    } catch (_e) {}
  }

  playExhaustPopSound() {
    if (!this.audioEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;
    try {
      this.playBeep(75 + Math.random() * 45, 0.06, 'sawtooth');
    } catch (_e) {}
  }

  playImpactSound() {
    this.playBeep(110, 0.12, 'triangle');
  }

  playRailScrapeSound() {
    this.playBeep(220, 0.08, 'sawtooth');
  }

  playSectorChirp(isBest = false) {
    if (!this.audioEnabled) return;
    if (isBest) {
      this.playBeep(880, 0.1, 'sine');
      setTimeout(() => this.playBeep(1174, 0.15, 'sine'), 90);
    } else {
      this.playBeep(587, 0.12, 'sine');
    }
  }

  playLapFanfare() {
    if (!this.audioEnabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      setTimeout(() => this.playBeep(freq, 0.18, 'square'), idx * 80);
    });
  }

  playRampLaunchSound() {
    if (!this.audioEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.32);
      gain.gain.setValueAtTime(0.26, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.40);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.40);
    } catch (_e) {}
  }

  playLandingSound() {
    if (!this.audioEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;
    try {
      // Hydraulic heavy thud
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, this.audioCtx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.36, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);

      // Tire squawk / friction chirp
      const chirp = this.audioCtx.createOscillator();
      const chirpGain = this.audioCtx.createGain();
      chirp.type = 'sawtooth';
      chirp.frequency.setValueAtTime(620, this.audioCtx.currentTime + 0.02);
      chirp.frequency.exponentialRampToValueAtTime(260, this.audioCtx.currentTime + 0.13);
      chirpGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime + 0.02);
      chirpGain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);
      chirp.connect(chirpGain);
      chirpGain.connect(this.audioCtx.destination);
      chirp.start(this.audioCtx.currentTime + 0.02);
      chirp.stop(this.audioCtx.currentTime + 0.15);
    } catch (_e) {}
  }

  playOvertakeAlertSound() {
    if (!this.audioEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
      osc.frequency.setValueAtTime(1320, this.audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.16, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.18);
    } catch (_e) {}
  }

  // ---------------------------------------------------------------------------
  // DYNAMIC 3-LAP ATMOSPHERIC SHIFT SYSTEM (Day -> Sunset -> Deep Space)
  // ---------------------------------------------------------------------------
  updatePalette(totalProgress = null) {
    if (totalProgress === null) {
      const lapProgress = Math.max(0, Math.min(0.999, (this.position || 0) / (this.trackLength || 1)));
      totalProgress = Math.max(0, Math.min(1.0, ((this.currentLap - 1) + lapProgress) / 3.0));
    }

    let palA, palB, f;
    if (totalProgress < 0.5) {
      palA = PALETTE_DAY;
      palB = PALETTE_SUNSET;
      f = totalProgress / 0.5;
    } else {
      palA = PALETTE_SUNSET;
      palB = PALETTE_DEEP_SPACE;
      f = (totalProgress - 0.5) / 0.5;
    }

    this.currentPalette = {
      skyTop: lerpColor(palA.skyTop, palB.skyTop, f),
      skyMid: lerpColor(palA.skyMid, palB.skyMid, f),
      skyBottom: lerpColor(palA.skyBottom, palB.skyBottom, f),
      roadLight: lerpColor(palA.roadLight, palB.roadLight, f),
      roadDark: lerpColor(palA.roadDark, palB.roadDark, f),
      rumble1: lerpColor(palA.rumble1, palB.rumble1, f),
      rumble2: lerpColor(palA.rumble2, palB.rumble2, f),
      lane1: lerpColor(palA.lane1, palB.lane1, f),
      lane2: lerpColor(palA.lane2, palB.lane2, f),
      rail1: lerpColor(palA.rail1, palB.rail1, f),
      rail2: lerpColor(palA.rail2, palB.rail2, f),
      hasSun: palA.hasSun && f < 0.85,
      sunY: palA.sunY + ((palB.sunY || 0.5) - palA.sunY) * f,
      sunRadius: (palA.sunRadius || 65) + ((palB.sunRadius || 85) - (palA.sunRadius || 65)) * f,
      sunColor1: lerpColor(palA.sunColor1 || '#ffffff', palB.sunColor1 || '#ffea00', f),
      sunColor2: lerpColor(palA.sunColor2 || '#f59e0b', palB.sunColor2 || '#ea580c', f),
      sunCorona: palA.sunCorona || 'rgba(255, 200, 100, 0.4)',
      cityLightAlpha: (palA.cityLightAlpha || 0.35) + ((palB.cityLightAlpha || 1.0) - (palA.cityLightAlpha || 0.35)) * f,
    };

    // Phase threshold check
    let newPhase = 1;
    let newPhaseName = 'SUNSET HIGHWAY GRAND PRIX';
    let newIcon = '🌇';
    if (totalProgress >= 0.66) {
      newPhase = 3;
      newPhaseName = 'MIDNIGHT TOKYO SHUTO BATTLE';
      newIcon = '🌃';
    } else if (totalProgress >= 0.33) {
      newPhase = 2;
      newPhaseName = 'CYBER DUSK METROPOLIS';
      newIcon = '🌆';
    }

    if (newPhase !== this.currentPhase) {
      this.currentPhase = newPhase;
      this.currentPhaseName = newPhaseName;
      if (this.onPhaseChange) {
        this.onPhaseChange(newPhaseName, newIcon);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // TRACK GENERATION
  // ---------------------------------------------------------------------------
  buildSpaceTrack() {
    this.segments = [];

    const addRoad = (enter, hold, leave, curve, y) => {
      const startY = this.segments.length > 0 ? this.segments[this.segments.length - 1].p2.world.y : 0;
      const endY = startY + (y * this.segmentLength);
      const total = enter + hold + leave;

      for (let n = 0; n < enter; n++) {
        this.addSegment(
          this.easeIn(0, curve, n / enter),
          this.easeInOut(startY, endY, n / total)
        );
      }
      for (let n = 0; n < hold; n++) {
        this.addSegment(
          curve,
          this.easeInOut(startY, endY, (enter + n) / total)
        );
      }
      for (let n = 0; n < leave; n++) {
        this.addSegment(
          this.easeInOut(curve, 0, n / leave),
          this.easeInOut(startY, endY, (enter + hold + n) / total)
        );
      }
    };

    const addStraight = (num = 50) => addRoad(num / 4, num / 2, num / 4, 0, 0);
    const addCurve = (num = 60, curve = 3, y = 0) => addRoad(num / 4, num / 2, num / 4, curve, y);
    const addHill = (num = 60, y = 20) => addRoad(num / 4, num / 2, num / 4, 0, y);
    const addDip = (num = 60, y = -20) => addRoad(num / 4, num / 2, num / 4, 0, y);

    // Dynamic 3D Jump Ramp with steep launch climb, apex launch threshold, airborne chasm, and landing transition!
    const addRampJump = (climbLength = 12, riseHeight = 70, gapLength = 14, boost = 1.65) => {
      const startY = this.segments.length > 0 ? this.segments[this.segments.length - 1].p2.world.y : 0;
      const apexY = startY + (riseHeight * this.segmentLength);

      // 1. Upward Launch Climb
      for (let n = 0; n < climbLength; n++) {
        this.addSegment(
          0,
          this.easeIn(startY, apexY, (n + 1) / climbLength),
          { isRamp: true, rampProgress: n / climbLength }
        );
      }

      // 2. Launch Apex Threshold
      this.addSegment(
        0,
        apexY,
        { isRamp: true, isRampApex: true, launchBoost: boost, rampProgress: 1.0 }
      );

      // 3. Aerial Chasm / Void Gap
      for (let n = 0; n < gapLength; n++) {
        this.addSegment(
          0,
          this.easeInOut(apexY, startY, (n + 1) / gapLength),
          { isAirGap: true, isLandingZone: n >= gapLength - 4 }
        );
      }
    };

    // Track Layout: 1200 segments with 4 dramatic Ramp Jumps and Grand Prix drift corners
    addStraight(40); // Starting Grid Straight
    addRampJump(10, 55, 12, 1.55); // RAMP 1: Solar Ascent Launch Ramp (~seg 50)
    addStraight(30);
    addCurve(70, 2.6, 8); // Nebula Climb drift right
    addHill(50, 18);
    addCurve(75, -3.2, -10); // Spiral Dip drift left
    addRampJump(12, 75, 14, 1.70); // RAMP 2: Cosmic Chasm Mega Ramp (~seg 420)
    addDip(40, -18);
    addStraight(50); // Warp accelerator (Sector 2 start)
    addCurve(90, 3.8, 10); // Solar Corkscrew long right drift
    addHill(35, 12);
    addRampJump(10, 60, 12, 1.60); // RAMP 3: Corkscrew Aerial Ramp (~seg 730)
    addCurve(65, -2.8, -6); // Asteroid Chicanes S-turn
    addCurve(65, 2.8, -8);
    addStraight(50); // Hyperspace Alley (Sector 3 start)
    addRampJump(14, 85, 16, 1.85); // RAMP 4: Hyperspace Super Ramp (~seg 970)
    addCurve(80, -3.5, 0); // Galaxy Turn high-speed left drift
    addStraight(70); // Final straight back to start/finish line

    this.trackLength = this.segments.length * this.segmentLength;

    // Scatter highway infrastructure (Overhead Gantries, Streetlights, Billboards, Hazard Barriers)
    for (let i = 25; i < this.segments.length - 25; i += 15) {
      const seg = this.segments[i];
      if (seg.isRamp || seg.isAirGap) continue;

      if (i % 120 === 0) {
        seg.sprites.push({ type: 'highway_gantry', offset: 0, scale: 1.5 });
      } else if (i % 60 === 0) {
        seg.sprites.push({
          type: 'billboard',
          offset: (i % 120 === 60 ? 1.75 : -1.75),
          scale: 1.3,
          brand: (i / 60) % 2 === 0 ? 'SPEEDLINE' : 'TURBO-X'
        });
      } else if (i % 30 === 0) {
        seg.sprites.push({
          type: 'street_light',
          offset: (i % 60 === 30 ? 1.55 : -1.55),
          scale: 1.2
        });
      } else if (Math.abs(seg.curve) > 2.0 && i % 8 === 0) {
        seg.sprites.push({
          type: 'hazard_barrier',
          offset: seg.curve > 0 ? 1.35 : -1.35,
          scale: 0.95
        });
      }
    }
  }

  addSegment(curve, y, flags = {}) {
    const n = this.segments.length;
    const isStartLine = n >= 0 && n < 6;
    const isRumble = Math.floor(n / this.rumbleLength) % 2 === 0;

    // Sector Checkpoint markers
    const isSector1 = n >= 398 && n <= 402;
    const isSector2 = n >= 798 && n <= 802;

    let roadColor = isRumble ? '#0d0d16' : '#141420';
    if (isStartLine) {
      roadColor = n % 2 === 0 ? '#ffffff' : '#111118';
    } else if (isSector1 || isSector2) {
      roadColor = '#ff3e00';
    }

    const color = {
      road: roadColor,
      rumble: isRumble ? '#ff3e00' : '#00e5ff',
      lane: isRumble ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
      rail: isRumble ? '#ff5722' : '#00b4d8',
    };

    this.segments.push({
      index: n,
      p1: {
        world: { x: 0, y: this.lastY(), z: n * this.segmentLength },
        camera: { x: 0, y: 0, z: 0 },
        screen: { x: 0, y: 0, w: 0, scale: 0 },
      },
      p2: {
        world: { x: 0, y, z: (n + 1) * this.segmentLength },
        camera: { x: 0, y: 0, z: 0 },
        screen: { x: 0, y: 0, w: 0, scale: 0 },
      },
      curve,
      color,
      sprites: [],
      cars: [],
      isRamp: flags.isRamp || false,
      isRampApex: flags.isRampApex || false,
      launchBoost: flags.launchBoost || 1.0,
      rampProgress: flags.rampProgress || 0,
      isAirGap: flags.isAirGap || false,
      isLandingZone: flags.isLandingZone || false,
    });
  }

  lastY() {
    return this.segments.length === 0 ? 0 : this.segments[this.segments.length - 1].p2.world.y;
  }

  easeIn(a, b, percent) {
    return a + (b - a) * Math.pow(percent, 2);
  }

  easeInOut(a, b, percent) {
    return a + (b - a) * (-Math.cos(percent * Math.PI) / 2 + 0.5);
  }

  initCityBackdrop() {
    // 1. Distant Mountain Silhouette
    this.mountains = [];
    const mountainPoints = 40;
    for (let i = 0; i <= mountainPoints; i++) {
      const x = i / mountainPoints;
      const h = 45 + Math.sin(i * 0.8) * 22 + Math.cos(i * 1.6) * 14;
      this.mountains.push({ x, h });
    }

    // 2. Far Skyline - High-rise Skyscraper Towers
    this.farBuildings = [];
    let curX = 0;
    while (curX < 2400) {
      const bw = 45 + Math.random() * 55;
      const bh = 90 + Math.random() * 120;
      const hasAntenna = Math.random() > 0.45;
      const antennaH = hasAntenna ? 18 + Math.random() * 25 : 0;
      const roofType = Math.floor(Math.random() * 3); // 0: flat, 1: stepped, 2: spire
      const windows = [];
      const cols = Math.floor(bw / 12);
      const rows = Math.floor(bh / 16);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.40) {
            windows.push({
              x: c * 12 + 3,
              y: r * 16 + 4,
              w: 6,
              h: 8,
              color: ['#fef08a', '#e0f2fe', '#fed7aa', '#fbcfe8'][Math.floor(Math.random() * 4)],
            });
          }
        }
      }
      this.farBuildings.push({ x: curX, w: bw, h: bh, antennaH, roofType, windows });
      curX += bw + 8 + Math.random() * 14;
    }

    // 3. Near City Skyline - Urban Commercial Towers & Neon Signs
    this.nearBuildings = [];
    curX = 0;
    const neonBrands = ['NITRO', 'DRIFT', 'TURBO', 'SHUTO', 'APEX', 'BOOST', 'MIDNIGHT'];
    let brandIdx = 0;
    while (curX < 2600) {
      const bw = 65 + Math.random() * 75;
      const bh = 55 + Math.random() * 85;
      const hasSign = Math.random() > 0.45;
      const signText = hasSign ? neonBrands[brandIdx % neonBrands.length] : null;
      brandIdx++;
      const signColor = ['#00f0ff', '#ff0055', '#ffea00', '#10b981', '#c084fc'][Math.floor(Math.random() * 5)];
      const windows = [];
      const cols = Math.floor(bw / 14);
      const rows = Math.floor(bh / 14);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.35) {
            windows.push({
              x: c * 14 + 3,
              y: r * 14 + 3,
              w: 7,
              h: 7,
              color: ['#fef08a', '#e0f2fe', '#fed7aa'][Math.floor(Math.random() * 3)],
            });
          }
        }
      }
      this.nearBuildings.push({ x: curX, w: bw, h: bh, signText, signColor, windows });
      curX += bw + 12 + Math.random() * 18;
    }
  }

  // ---------------------------------------------------------------------------
  // REAL STREET RACER AI OPPONENTS INITIALIZATION
  // ---------------------------------------------------------------------------
  initCars() {
    // Clear cars from existing segments
    for (const seg of this.segments) {
      seg.cars = [];
    }
    this.cars = [];

    // 6 Authentic, Highly-Competitive Street Tuners on Starting Grid
    // Staggered in 2 visible lanes directly ahead of the player:
    // P1 (Pole: 2600), P2 (2300), P3 (1950), P4 (1650), P5 (1350), P6 (1100)!
    // With player at Z = 0 (viewing forward from bottom of screen ~840 Z), ALL 6 CARS ARE PROMINENTLY VISIBLE!
    const aiConfigs = [
      { name: 'NIGHT-HAWK', model: 'GT-R R34', color: '#7c3aed', accent: '#00e5ff', style: 'gtr', speedMult: 1.05, offset: -0.38, startZ: 2600 },
      { name: 'APEX-RX', model: 'RX-7 SPIRIT', color: '#ea580c', accent: '#fde047', style: 'rx7', speedMult: 1.04, offset: 0.38, startZ: 2300 },
      { name: 'VIPER-GT', model: 'VIPER GTS', color: '#16a34a', accent: '#ffffff', style: 'quad', speedMult: 1.02, offset: -0.42, startZ: 1950 },
      { name: 'TURBO-911', model: '911 GT3', color: '#dc2626', accent: '#111111', style: 'strip', speedMult: 1.01, offset: 0.42, startZ: 1650 },
      { name: 'GHOST-SUPRA', model: 'SUPRA MK4', color: '#f8fafc', accent: '#2563eb', style: 'supra', speedMult: 0.99, offset: -0.36, startZ: 1350 },
      { name: 'SHADOW-NSX', model: 'NSX TYPE-R', color: '#09090b', accent: '#06b6d4', style: 'strip', speedMult: 0.98, offset: 0.36, startZ: 1100 },
    ];

    for (let i = 0; i < aiConfigs.length; i++) {
      const cfg = aiConfigs[i];
      const z = (cfg.startZ + this.trackLength) % this.trackLength;
      const seg = this.findSegment(z);
      const percent = (z % this.segmentLength) / this.segmentLength;
      const car = {
        id: i,
        name: cfg.name,
        model: cfg.model,
        offset: cfg.offset,
        targetOffset: cfg.offset,
        z,
        baseSpeed: this.maxSpeed * cfg.speedMult,
        speed: this.maxSpeed * cfg.speedMult * 0.70, // Rapid green-light launch
        color: cfg.color,
        accent: cfg.accent,
        style: cfg.style,
        percent,
        driftSlip: 0,
        laneTimer: Math.random() * 2 + 1,
        isAirborne: false,
        jumpHeight: 0,
        verticalVel: 0,
        nitroTimer: 0,
        isOvertaking: false,
        exhaustFlameTimer: 0,
      };
      seg.cars.push(car);
      this.cars.push(car);
    }
  }

  findSegment(z) {
    return this.segments[Math.floor(z / this.segmentLength) % this.segments.length];
  }

  // ---------------------------------------------------------------------------
  // INPUT CONTROLS
  // ---------------------------------------------------------------------------
  setupListeners() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      this.handleKey(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.code, false);
    });
  }

  handleKey(code, isDown) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = isDown;
        if (isDown && this.stuntController.isAirborne) {
          this.stuntController.triggerStunt('front_flip');
        }
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = isDown;
        if (isDown && this.stuntController.isAirborne) {
          this.stuntController.triggerStunt('backflip');
        }
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = isDown;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = isDown;
        break;
      case 'KeyQ':
        if (isDown) {
          this.stuntController.triggerStunt('barrel_roll_left');
        }
        break;
      case 'KeyE':
        if (isDown) {
          this.stuntController.triggerStunt('barrel_roll_right');
        }
        break;
      case 'Space':
        this.keys.boost = isDown;
        if (isDown) {
          // Manual Jump if grounded!
          if (!this.stuntController.isAirborne) {
            this.stuntController.triggerJump(1.0);
          }
          this.activateNitro();
        } else {
          this.deactivateNitro();
        }
        break;
      case 'Digit1':
        if (isDown) this.cameraMode = 1;
        break;
      case 'Digit2':
        if (isDown) this.cameraMode = 2;
        break;
      case 'Digit3':
        if (isDown) this.cameraMode = 3;
        break;
      case 'KeyP':
        if (isDown) this.setAutopilot(!this.autopilot);
        break;
      case 'KeyM':
        if (isDown) this.toggleAudio();
        break;
    }
  }

  setTouchKey(control, isPressed) {
    if (control === 'forward') this.keys.forward = isPressed;
    if (control === 'backward') this.keys.backward = isPressed;
    if (control === 'left') this.keys.left = isPressed;
    if (control === 'right') this.keys.right = isPressed;
    if (control === 'boost') {
      this.keys.boost = isPressed;
      if (isPressed) {
        this.activateNitro();
      } else {
        this.deactivateNitro();
      }
    }
  }

  clearTouchKeys() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.boost = false;
    this.nitroActive = false;
  }

  setAutopilot(active) {
    this.autopilot = active;
  }

  setDisplayMode(mode) {
    this.displayMode = mode;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.canvas.width = Math.floor(w * (this.displayMode === 'eco' ? 0.5 : dpr));
    this.canvas.height = Math.floor(h * (this.displayMode === 'eco' ? 0.5 : dpr));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  // ---------------------------------------------------------------------------
  // NITRO & BOOST SYSTEM
  // ---------------------------------------------------------------------------
  activateNitro() {
    if (this.nitro > 8 && !this.nitroActive) {
      this.nitroActive = true;
      this.playBoostSound();
      this.screenShake = 6;
    }
  }

  deactivateNitro() {
    this.nitroActive = false;
  }

  triggerWarpBoost(duration = 2.0) {
    this.boostTimer = Math.max(this.boostTimer, duration);
    this.playBoostSound();
    this.screenShake = 8;
  }

  // ---------------------------------------------------------------------------
  // RACE CONTROL & INSTANT START
  // ---------------------------------------------------------------------------
  startRace() {
    this.raceStarted = true;
    this.raceFinished = false;
    this.position = 0;
    this.speed = 2200; // Rolling start!
    this.targetSpeed = 2200;
    this.playerX = 0;
    this.currentLap = 1;
    this.currentLapTime = 0;
    this.totalRaceTime = 0;
    this.currentSector = 0;
    this.sectorTimes = [0, 0, 0];
    this.nitro = 100;
    this.isDrifting = false;
    this.driftLevel = 0;
    this.driftTime = 0;
    this.lateralVelocity = 0;
    this.keys.forward = true;

    // Reset Landing & Atmosphere Phase
    this.landingTimer = 0;
    this.landingDuration = 0;
    this.landingBounce = 0;
    this.landingPitch = 0;
    this.cameraDip = 0;
    this.wasAirborne = false;
    this.landingPuffs = [];
    this.currentPhase = 1;
    this.currentPhaseName = 'SUNSET HIGHWAY GRAND PRIX';
    this.updatePalette(0);
    if (this.onPhaseChange) {
      this.onPhaseChange('SUNSET HIGHWAY GRAND PRIX', '🌇');
    }

    // Reset AI positions
    this.initCars();

    // Quick countdown
    this.countdownActive = true;
    this.countdownValue = 3;

    const tick = () => {
      if (!this.countdownActive) return;
      if (this.countdownValue > 0) {
        this.playBeep(440 + (3 - this.countdownValue) * 80, 0.12, 'sine');
        if (this.onCountdownTick) this.onCountdownTick(this.countdownValue);
        this.countdownValue--;
        setTimeout(tick, 420);
      } else {
        this.countdownActive = false;
        this.playBeep(880, 0.25, 'square');
        if (this.onLightsOut) this.onLightsOut();
      }
    };
    tick();
  }

  // ---------------------------------------------------------------------------
  // PHYSICS & UPDATE LOOP
  // ---------------------------------------------------------------------------
  update(dt) {
    // 1. Performance Telemetry
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameTimeMs = (dt * 1000).toFixed(1);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 14);
    }

    // 2. Nitro & Boost Logic
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
    }

    if (this.nitroActive) {
      this.nitro = Math.max(0, this.nitro - this.nitroDrainRate * dt);
      if (this.nitro <= 0) {
        this.nitroActive = false;
      }
    } else {
      // Passive nitro regeneration (faster when driving cleanly, bonus when drifting)
      const regenBonus = this.isDrifting ? 1.8 : 1.0;
      this.nitro = Math.min(this.nitroMax, this.nitro + this.nitroRechargeRate * regenBonus * dt);
    }

    if (this.onNitroUpdate) {
      this.onNitroUpdate(this.nitro, this.nitroActive);
    }

    // 3. Autopilot AI Assistance
    if (this.autopilot) {
      this.keys.forward = true;
      const lookAheadSeg = this.findSegment(this.position + this.segmentLength * 8);
      const idealX = -lookAheadSeg.curve * 0.25;
      this.playerX += (idealX - this.playerX) * dt * 4.2;

      // Smart drift triggering during sharp curves
      if (Math.abs(lookAheadSeg.curve) > 2.2 && this.speed > 6000) {
        this.keys.backward = true;
        if (lookAheadSeg.curve > 0) this.keys.right = true;
        else this.keys.left = true;
      } else {
        this.keys.backward = false;
      }
    }

    // 4. Smooth Acceleration & Progressive Braking
    const isAccelerated = this.nitroActive || this.boostTimer > 0;
    const currentMaxSpeed = isAccelerated ? this.maxSpeed * 1.55 : this.maxSpeed;

    if (this.keys.forward) {
      // Smooth acceleration with exponential ramp
      const target = isAccelerated ? currentMaxSpeed : this.maxSpeed;
      const rate = isAccelerated ? this.accelRate * 1.8 : this.accelRate;
      this.speed += (target - this.speed) * (rate / target) * dt * 2.8;
    } else if (this.keys.backward && !this.isDrifting) {
      // Progressive braking when not drifting
      this.speed -= this.brakeRate * dt;
    } else if (!this.isDrifting) {
      // Natural inertia friction coasting
      this.speed -= this.frictionRate * dt;
    }

    this.speed = Math.max(0, Math.min(this.speed, currentMaxSpeed));

    // 5. Space Drift & Inertia Mechanics
    // Trigger condition: Speed > 3000, Brake is held, and Lateral Turn is active
    const hasTurnInput = this.keys.left || this.keys.right;
    const isBraking = this.keys.backward;
    const canInitiateDrift = this.speed > 3200 && isBraking && hasTurnInput;

    if (canInitiateDrift) {
      if (!this.isDrifting) {
        // Initiate drift
        this.isDrifting = true;
        this.driftDirection = this.keys.right ? 1 : -1;
        this.driftTime = 0;
        this.driftLevel = 0;
        // Inject initial space inertia slide
        this.lateralVelocity = this.driftDirection * 1.8;
        this.playBeep(320, 0.08, 'sawtooth');
      }

      this.driftTime += dt;

      // Mini-Turbo charging tiers: Tier 1 (Blue @ 0.8s), Tier 2 (Orange @ 1.8s), Tier 3 (Purple @ 2.8s)
      if (this.driftTime >= 2.8) {
        if (this.driftLevel !== 3) {
          this.driftLevel = 3;
          this.playMiniTurboSound(3);
        }
      } else if (this.driftTime >= 1.8) {
        if (this.driftLevel !== 2) {
          this.driftLevel = 2;
          this.playMiniTurboSound(2);
        }
      } else if (this.driftTime >= 0.8) {
        if (this.driftLevel !== 1) {
          this.driftLevel = 1;
          this.playMiniTurboSound(1);
        }
      }

      // In space drift, maintaining speed with slight slide friction
      this.speed = Math.max(3800, this.speed - 900 * dt);
    } else {
      if (this.isDrifting) {
        // Exit drift -> Deliver Mini-Turbo Boost Impulse!
        if (this.driftLevel > 0) {
          const boostDurations = [0, 1.2, 1.8, 2.5];
          const duration = boostDurations[this.driftLevel];
          this.triggerWarpBoost(duration);
          // Bonus nitro charge from great drift execution
          this.nitro = Math.min(this.nitroMax, this.nitro + this.driftLevel * 12);
        }
        this.isDrifting = false;
        this.driftLevel = 0;
        this.driftTime = 0;
      }
    }

    // 6. Steering Authority & Space Slip Inertia
    const speedFraction = Math.max(0.25, this.speed / this.maxSpeed);
    let steerInput = 0;
    if (this.keys.left) steerInput -= 1;
    if (this.keys.right) steerInput += 1;

    // Drifting amplifies rotation rate (2.8x -> 5.2x) and simulates space inertia
    let turnRate = 2.9;
    if (this.isDrifting) {
      turnRate = 5.4;
      // Sideways zero-g slip pushes player outwards
      this.lateralVelocity += this.driftDirection * dt * 2.2;
    } else {
      // Natural dampening of lateral inertia
      this.lateralVelocity *= Math.max(0, 1 - dt * 4.5);
    }

    const dx = dt * turnRate * speedFraction * steerInput;
    this.playerX += dx + (this.lateralVelocity * dt * speedFraction);

    // Centrifugal curve pull from track curvature
    const currentSegment = this.findSegment(this.position);
    this.playerX -= dt * speedFraction * currentSegment.curve * 1.5;

    // 7. Strict Energy Rail Safety Clamping
    // The player NEVER goes off-track! Clamped between -0.92 and 0.92
    const railLimit = 0.92;
    if (this.playerX > railLimit) {
      this.playerX = railLimit;
      this.railContact = 1;
      this.lateralVelocity = -0.5; // Elastic cushion off energy rail
      this.speed *= 0.985; // Slight friction scrub
      this.createRailSparks(1);
      this.playRailScrapeSound();
    } else if (this.playerX < -railLimit) {
      this.playerX = -railLimit;
      this.railContact = -1;
      this.lateralVelocity = 0.5;
      this.speed *= 0.985;
      this.createRailSparks(-1);
      this.playRailScrapeSound();
    } else {
      this.railContact = 0;
    }

    // Update active rail spark particles
    for (let i = this.railSparks.length - 1; i >= 0; i--) {
      const spk = this.railSparks[i];
      spk.life -= dt * 2.5;
      spk.y += spk.vy * dt;
      spk.x += spk.vx * dt;
      if (spk.life <= 0) {
        this.railSparks.splice(i, 1);
      }
    }

    // Visual Banking Tilt (more extreme during space drifts)
    const targetBank = (steerInput + (this.isDrifting ? this.driftDirection * 0.8 : 0)) * (0.6 + speedFraction * 0.45);
    this.bankAngle += (targetBank - this.bankAngle) * dt * 9.5;

    // Visual Drift Angle (yaw slip)
    const targetDriftAngle = this.isDrifting ? this.driftDirection * 0.38 : 0;
    this.driftAngle += (targetDriftAngle - this.driftAngle) * dt * 8.0;

    // 8. Stunt System Update & Air Control
    this.stuntController.applyAirTilt(steerInput, dt);
    this.stuntTransform = this.stuntController.update(dt);

    // Track Position Advancement
    const prevPosition = this.position;
    this.position += this.speed * dt;

    // Auto-Ramp Launch when hitting Ramp Apexes or Warp Gates
    const currSeg = this.findSegment(this.position);
    const currSegIdx = Math.floor(this.position / this.segmentLength);
    const prevSegIdx = Math.floor(prevPosition / this.segmentLength);

    if (currSeg.isRampApex && !this.stuntController.isAirborne && this.speed > 3200) {
      this.launchPlayerRamp(currSeg.launchBoost || 1.65);
    } else if (currSegIdx !== prevSegIdx && currSegIdx % 80 === 0 && !this.stuntController.isAirborne && this.speed > 4000) {
      this.launchPlayerRamp(1.35);
    }

    // Landing Transition & Smooth Landing Spring Suspension
    if (this.wasAirborne && !this.stuntController.isAirborne) {
      this.onPlayerLanding();
    }
    this.wasAirborne = this.stuntController.isAirborne;

    // Landing suspension bounce & pitch dampening (Damped harmonic spring oscillation)
    if (this.landingDuration > 0 && this.landingTimer < this.landingDuration) {
      this.landingTimer += dt;
      const t = this.landingTimer;
      this.landingBounce = -Math.sin(t * 22) * Math.exp(-t * 7.5) * (34 * this.landingStrength);
      this.landingPitch = Math.sin(t * 16) * Math.exp(-t * 8.5) * (0.24 * this.landingStrength);
    } else {
      this.landingBounce = 0;
      this.landingPitch = 0;
    }

    // Camera impact dip recovery
    if (this.cameraDip > 0) {
      this.cameraDip = Math.max(0, this.cameraDip - dt * 75);
    }

    // Update landing smoke particles & sparks
    for (let i = this.landingPuffs.length - 1; i >= 0; i--) {
      const puff = this.landingPuffs[i];
      puff.life -= dt * 2.4;
      puff.radius += dt * 36;
      puff.x += puff.vx * dt;
      if (puff.life <= 0) {
        this.landingPuffs.splice(i, 1);
      }
    }

    // Dynamic 3-Lap Atmosphere Color Palette Shift
    this.updatePalette();

    // 9. Sector Checkpoints & Lap Timing
    if (this.raceStarted && !this.raceFinished) {
      this.currentLapTime += dt;
      this.totalRaceTime += dt;

      // Check Sector 1 (33% of track)
      const sec1Pos = this.trackLength * 0.33;
      const sec2Pos = this.trackLength * 0.66;

      if (prevPosition < sec1Pos && this.position >= sec1Pos && this.currentSector === 0) {
        this.recordSector(0);
      } else if (prevPosition < sec2Pos && this.position >= sec2Pos && this.currentSector === 1) {
        this.recordSector(1);
      }

      // Full Lap Completion (100% of track)
      if (this.position >= this.trackLength) {
        this.recordSector(2); // Sector 3 complete
        this.position -= this.trackLength;
        const lapTime = this.currentLapTime;
        this.lapTimes.push(lapTime);

        if (!this.bestLapTime || lapTime < this.bestLapTime) {
          this.bestLapTime = lapTime;
        }

        if (this.onLapComplete) {
          this.onLapComplete(this.currentLap, lapTime, this.bestLapTime);
        }

        if (this.currentLap >= this.totalLaps) {
          this.raceFinished = true;
          this.playLapFanfare();
          if (this.onFinish) {
            this.onFinish(this.totalRaceTime, this.bestLapTime, this.racePosition);
          }
        } else {
          this.currentLap++;
          this.currentLapTime = 0;
          this.currentSector = 0;
          this.playLapFanfare();
        }
      }
    } else {
      while (this.position >= this.trackLength) {
        this.position -= this.trackLength;
      }
    }

    // 10. AI Opponents Simulation (Overtaking, Drafting, Dynamic Racing)
    this.updateAIOpponents(dt);

    // 11. Calculate Player Race Position (1ST to 7TH)
    this.calculateRacePosition();

    // 12. Audio & Speed HUD
    this.updateEngineSound(this.speed / this.maxSpeed);
    if (this.onSpeedUpdate) {
      const kmh = Math.round(this.speed * 0.024);
      this.onSpeedUpdate(kmh, this.speed / this.maxSpeed, isAccelerated);
    }
  }

  launchPlayerRamp(boost = 1.65) {
    if (this.stuntController.isAirborne) return;
    this.stuntController.triggerRampJump(boost);
    this.triggerWarpBoost(1.2);
    this.playRampLaunchSound();
    this.screenShake = 6.0;
  }

  onPlayerLanding() {
    this.landingTimer = 0.001;
    this.landingDuration = 0.52;
    this.landingStrength = Math.min(1.2, Math.max(0.4, this.speed / this.maxSpeed));
    this.cameraDip = 28 * this.landingStrength;
    this.screenShake = 5.0;
    this.playLandingSound();

    // Spawn touchdown shockwave smoke rings & tire sparks on road
    for (let i = 0; i < 7; i++) {
      this.landingPuffs.push({
        x: -0.32 + (Math.random() - 0.5) * 0.12,
        z: this.position,
        vx: -(Math.random() * 0.5 + 0.3),
        vy: -(Math.random() * 0.3 + 0.1),
        radius: 6,
        maxRadius: 26,
        life: 1.0,
      });
      this.landingPuffs.push({
        x: 0.32 + (Math.random() - 0.5) * 0.12,
        z: this.position,
        vx: (Math.random() * 0.5 + 0.3),
        vy: -(Math.random() * 0.3 + 0.1),
        radius: 6,
        maxRadius: 26,
        life: 1.0,
      });
    }

    // Reward player with a mini-turbo burst on clean landing
    this.triggerWarpBoost(0.9);
    this.nitro = Math.min(this.nitroMax, this.nitro + 12);
    if (this.onStunt) {
      this.onStunt('SMOOTH LANDING ⚡ TURBO', 250);
    }
  }

  createRailSparks(side) {
    for (let i = 0; i < 3; i++) {
      this.railSparks.push({
        x: side * 0.92,
        y: 0,
        vx: -side * (Math.random() * 0.4 + 0.2),
        vy: (Math.random() - 0.5) * 0.6,
        life: 1.0,
        color: Math.random() > 0.5 ? '#00e5ff' : '#ff3e00',
      });
    }
    if (this.railSparks.length > 30) {
      this.railSparks.splice(0, 10);
    }
  }

  recordSector(sectorIdx) {
    this.currentSector = sectorIdx + 1;
    const secTime = this.currentLapTime;
    const prevBest = this.bestSectorTimes[sectorIdx];
    const delta = prevBest !== null ? secTime - prevBest : null;

    if (prevBest === null || secTime < prevBest) {
      this.bestSectorTimes[sectorIdx] = secTime;
    }

    this.playSectorChirp(delta !== null ? delta < 0 : true);

    if (this.onSectorComplete) {
      this.onSectorComplete(sectorIdx + 1, secTime, delta);
    }
  }

  // ---------------------------------------------------------------------------
  // AI OPPONENTS LOGIC (Aggressive, Drafting, Nitro Overtakes, Ramp Jumps)
  // ---------------------------------------------------------------------------
  updateAIOpponents(dt) {
    let nearestThreat = null;
    let minThreatDist = 999999;

    for (const car of this.cars) {
      const oldSeg = this.findSegment(car.z);

      // AI Lane changing timer
      car.laneTimer -= dt;
      if (car.laneTimer <= 0) {
        car.laneTimer = 1.0 + Math.random() * 2.2;
        car.targetOffset = (Math.random() * 1.3 - 0.65);
      }

      // Check distance to player along circular track
      let distToPlayer = car.z - this.position;
      if (distToPlayer > this.trackLength / 2) distToPlayer -= this.trackLength;
      if (distToPlayer < -this.trackLength / 2) distToPlayer += this.trackLength;

      // 1. Drafting, AI Nitro, & Aggressive Overtake Maneuvers!
      if (distToPlayer < 0 && distToPlayer > -4000) {
        // AI is behind the player and aggressively hunting down position!
        const isAligned = Math.abs(this.playerX - car.offset) < 0.45;
        const draftBonus = isAligned ? 2000 : 1000;
        car.speed = Math.min(this.maxSpeed * 1.20, car.speed + draftBonus * dt);

        // Periodic AI Nitro burst when chasing
        if (!car.nitroTimer || car.nitroTimer <= 0) {
          if (Math.random() < dt * 0.45) {
            car.nitroTimer = 2.4;
          }
        }

        // Active Overtake Maneuver:
        // When closing in from behind (< 1600 units), aggressively take the open lane and outpass!
        if (distToPlayer > -1600) {
          car.isOvertaking = true;
          // Steer towards open lane
          const passSide = this.playerX >= 0 ? -0.58 : 0.58;
          car.targetOffset = passSide;
          car.offset += (car.targetOffset - car.offset) * dt * 3.6;

          // Track proximity threat for HUD alert
          const absDist = Math.abs(distToPlayer);
          if (absDist < minThreatDist && car.speed >= this.speed * 0.92) {
            minThreatDist = absDist;
            nearestThreat = {
              name: car.name,
              side: car.offset > this.playerX ? 'right' : 'left',
            };
          }
        } else {
          car.isOvertaking = false;
          car.offset += (car.targetOffset - car.offset) * dt * 2.2;
        }
      } else {
        // AI is ahead: Maintain high competitive racing pace
        car.isOvertaking = false;
        car.speed += (car.baseSpeed - car.speed) * dt * 2.4;
        car.offset += (car.targetOffset - car.offset) * dt * 1.8;
      }

      // AI Nitro Countdown
      if (car.nitroTimer > 0) {
        car.nitroTimer -= dt;
        car.speed = Math.max(car.speed, this.maxSpeed * 1.16);
      }

      // 2. Advance AI Along Track
      car.z = (car.z + car.speed * dt) % this.trackLength;
      car.percent = (car.z % this.segmentLength) / this.segmentLength;
      const newSeg = this.findSegment(car.z);

      // 3. AI Ramp Jump Physics!
      if (newSeg.isRampApex && !car.isAirborne) {
        car.isAirborne = true;
        car.jumpHeight = 0;
        car.verticalVel = (newSeg.launchBoost || 1.6) * 5.8;
      }

      if (car.isAirborne) {
        car.jumpHeight += car.verticalVel * dt * 45;
        car.verticalVel -= 24 * dt;
        if (car.jumpHeight <= 0) {
          car.jumpHeight = 0;
          car.verticalVel = 0;
          car.isAirborne = false;
        }
      }

      if (oldSeg !== newSeg) {
        const index = oldSeg.cars.indexOf(car);
        if (index !== -1) oldSeg.cars.splice(index, 1);
        newSeg.cars.push(car);
      }

      // 4. Side-by-side wheel-banging / contact
      const dz = Math.abs(distToPlayer);
      if (dz < 170 && Math.abs(this.playerX - car.offset) < 0.40) {
        this.speed *= 0.90;
        this.screenShake = 5;
        this.playImpactSound();
        const pushDir = this.playerX > car.offset ? 1 : -1;
        this.playerX += pushDir * 0.18;
        car.offset -= pushDir * 0.15;
      }
    }

    // 5. Trigger HUD Overtake Alert if rival is actively trying to outpass!
    if (nearestThreat) {
      if (this.onOvertakeAlert) {
        this.onOvertakeAlert(nearestThreat.name, nearestThreat.side, true);
      }
      this.overtakeAlertCooldown = 1.0;
    } else {
      if (this.overtakeAlertCooldown > 0) {
        this.overtakeAlertCooldown -= dt;
      } else if (this.onOvertakeAlert) {
        this.onOvertakeAlert('', 'left', false);
      }
    }
  }

  calculateRacePosition() {
    // Player total progress distance: (lap - 1) * trackLength + position
    const playerDist = (this.currentLap - 1) * this.trackLength + this.position;
    let rank = 1;

    for (const car of this.cars) {
      // Estimate AI total progress (AI starts on Lap 1)
      const aiDist = (this.currentLap - 1) * this.trackLength + car.z;
      if (aiDist > playerDist) {
        rank++;
      }
    }

    if (this.racePosition !== rank) {
      this.racePosition = rank;
      if (this.onPositionUpdate) {
        this.onPositionUpdate(this.racePosition, this.cars.length + 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2.5D RENDER PIPELINE
  // ---------------------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Apply Screen Shake
    ctx.save();
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Street City Highway Parallax
    this.renderCityStreetBackdrop(ctx, w, h);

    // 2. Road Segments & AI Street Cars
    this.renderRoad(ctx, w, h);

    // 3. Player Street Racer Supercar
    this.renderPlayerStreetCar(ctx, w, h);

    ctx.restore();
  }

  renderCityStreetBackdrop(ctx, w, h) {
    const pal = this.currentPalette || PALETTE_DAY;

    // 1. Dynamic Street Sky Gradient (Sunset -> Twilight -> Midnight)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    skyGrad.addColorStop(0.0, pal.skyTop);
    skyGrad.addColorStop(0.60, pal.skyMid);
    skyGrad.addColorStop(1.0, pal.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const currentSegment = this.findSegment(this.position);
    const curveOffset = currentSegment.curve * (this.speed / this.maxSpeed) * 35;
    const horizonY = h * 0.52;

    // 2. Setting Sun or Midnight City Glow on Horizon
    if (pal.hasSun) {
      ctx.save();
      const sunX = w * 0.52 - curveOffset * 0.12;
      const sunY = h * pal.sunY;
      const r = pal.sunRadius;

      // Radiant Sunset Corona Glow over City
      const coronaGrad = ctx.createRadialGradient(sunX, sunY, r * 0.2, sunX, sunY, r * 3.2);
      coronaGrad.addColorStop(0, pal.sunCorona || 'rgba(254, 215, 170, 0.45)');
      coronaGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.18)');
      coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, r * 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Setting Sun Sphere dipping behind towers
      const sunGrad = ctx.createRadialGradient(sunX - r * 0.2, sunY - r * 0.2, r * 0.1, sunX, sunY, r);
      sunGrad.addColorStop(0, pal.sunColor1);
      sunGrad.addColorStop(1, pal.sunColor2);
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Midnight Metropolis Light Dome (City Sky Glow)
      ctx.save();
      const glowGrad = ctx.createRadialGradient(w * 0.5 - curveOffset * 0.1, horizonY, 50, w * 0.5 - curveOffset * 0.1, horizonY, w * 0.65);
      glowGrad.addColorStop(0, 'rgba(0, 240, 255, 0.18)');
      glowGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.10)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, horizonY - 180, w, 220);
      ctx.restore();
    }

    // 3. Distant Mountains Silhouette
    if (this.mountains && this.mountains.length > 0) {
      ctx.save();
      ctx.fillStyle = pal.roadDark;
      ctx.globalAlpha = 0.50;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      const mOffset = (curveOffset * 0.08) % w;
      for (let i = 0; i < this.mountains.length; i++) {
        const pt = this.mountains[i];
        const mx = pt.x * w - mOffset;
        const my = horizonY - pt.h * (h / 600);
        if (i === 0) ctx.lineTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.lineTo(w, horizonY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 4. Far Skyline - High-rise Skyscraper Towers & Lit Windows
    if (this.farBuildings && this.farBuildings.length > 0) {
      ctx.save();
      const farOffset = (this.position * 0.018 + curveOffset * 0.22) % 1800;
      const farBaseY = horizonY;

      for (const b of this.farBuildings) {
        let bx = b.x - farOffset;
        while (bx < -b.w) bx += 1800;
        while (bx > w + b.w) bx -= 1800;
        if (bx + b.w < 0 || bx > w) continue;

        const by = farBaseY - b.h * (h / 700);

        // Building Monolith Body
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(bx, by, b.w, farBaseY - by);

        // Roof details (spire / antenna)
        if (b.antennaH > 0) {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bx + b.w / 2, by);
          ctx.lineTo(bx + b.w / 2, by - b.antennaH);
          ctx.stroke();

          // Blinking Red Aviation Safety Beacon Light
          const beaconFlash = (Math.floor(Date.now() / 600) % 2 === 0);
          if (beaconFlash) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(bx + b.w / 2, by - b.antennaH, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Window Lights Matrix
        if (b.windows && pal.cityLightAlpha > 0.05) {
          ctx.globalAlpha = pal.cityLightAlpha * 0.85;
          for (const win of b.windows) {
            const wx = bx + win.x;
            const wy = by + win.y;
            if (wy < farBaseY - 6) {
              ctx.fillStyle = win.color;
              ctx.fillRect(wx, wy, win.w, win.h);
            }
          }
          ctx.globalAlpha = 1.0;
        }
      }
      ctx.restore();
    }

    // 5. Near City Skyline - Urban Commercial Towers & Neon Billboard Signs
    if (this.nearBuildings && this.nearBuildings.length > 0) {
      ctx.save();
      const nearOffset = (this.position * 0.038 + curveOffset * 0.40) % 2000;
      const nearBaseY = horizonY;

      for (const b of this.nearBuildings) {
        let bx = b.x - nearOffset;
        while (bx < -b.w) bx += 2000;
        while (bx > w + b.w) bx -= 2000;
        if (bx + b.w < 0 || bx > w) continue;

        const by = nearBaseY - b.h * (h / 650);

        // Near Building Body
        ctx.fillStyle = '#070a12';
        ctx.fillRect(bx, by, b.w, nearBaseY - by);

        // Roof edge trim
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx, by - 2, b.w, 3);

        // Rooftop Neon Street Racing Brand Signboard
        if (b.signText) {
          ctx.save();
          const signW = Math.min(b.w - 10, 60);
          const signH = 14;
          const sx = bx + (b.w - signW) / 2;
          const sy = by - signH - 3;

          // Metal scaffold support
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx, sy, signW, signH);

          // Glowing neon text
          ctx.font = "900 9px 'Space Mono', monospace";
          ctx.fillStyle = b.signColor;
          ctx.shadowColor = b.signColor;
          ctx.shadowBlur = 6;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.signText, sx + signW / 2, sy + signH / 2);
          ctx.restore();
        }

        // Office Windows Grid
        if (b.windows && pal.cityLightAlpha > 0.05) {
          ctx.globalAlpha = pal.cityLightAlpha;
          for (const win of b.windows) {
            const wx = bx + win.x;
            const wy = by + win.y;
            if (wy < nearBaseY - 5) {
              ctx.fillStyle = win.color;
              ctx.fillRect(wx, wy, win.w, win.h);
            }
          }
          ctx.globalAlpha = 1.0;
        }
      }
      ctx.restore();
    }
  }

  renderRoad(ctx, w, h) {
    const baseSegment = this.findSegment(this.position);
    const basePercent = (this.position % this.segmentLength) / this.segmentLength;
    const playerSegment = this.findSegment(this.position + this.cameraHeight * this.cameraDepth);
    const playerPercent = ((this.position + this.cameraHeight * this.cameraDepth) % this.segmentLength) / this.segmentLength;
    const playerY = this.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);

    let dx = -(baseSegment.curve * basePercent);
    let x = 0;
    let maxY = h;

    const camX = this.playerX * this.roadWidth;
    // Apply camera impact dip on landing!
    const camY = this.cameraHeight + playerY + (this.cameraDip || 0);

    for (let n = 0; n < this.drawDistance; n++) {
      const segment = this.segments[(baseSegment.index + n) % this.segments.length];
      const looped = segment.index < baseSegment.index;

      this.project(
        segment.p1,
        camX - x,
        camY,
        this.position - (looped ? this.trackLength : 0),
        this.cameraDepth,
        w,
        h,
        this.roadWidth
      );
      this.project(
        segment.p2,
        camX - x - dx,
        camY,
        this.position - (looped ? this.trackLength : 0),
        this.cameraDepth,
        w,
        h,
        this.roadWidth
      );

      x += dx;
      dx += segment.curve;

      if (
        segment.p1.camera.z <= this.cameraDepth ||
        segment.p2.screen.y >= segment.p1.screen.y ||
        segment.p2.screen.y >= maxY
      ) {
        continue;
      }

      this.renderSegment(ctx, w, h, segment);
      maxY = segment.p1.screen.y;
    }

    // Sprites & AI Street Cars back-to-front (including n = 0 baseSegment)
    for (let n = this.drawDistance - 1; n >= 0; n--) {
      const segment = this.segments[(baseSegment.index + n) % this.segments.length];
      if (!segment || !segment.p1.screen || segment.p1.screen.scale <= 0) continue;

      for (const car of segment.cars) {
        const p1Scale = segment.p1.screen.scale;
        const p2Scale = segment.p2.screen.scale || p1Scale;
        const carScale = this.interpolate(p1Scale, p2Scale, car.percent);
        if (carScale > 0.001) {
          const carX = this.interpolate(segment.p1.screen.x, segment.p2.screen.x, car.percent) +
            (carScale * car.offset * this.roadWidth * w / 2);
          const carY = this.interpolate(segment.p1.screen.y, segment.p2.screen.y, car.percent);
          this.renderStreetRivalCar(ctx, carX, carY, carScale, car.color, car.name, car);
        }
      }

      for (const sprite of segment.sprites) {
        const spriteScale = segment.p1.screen.scale;
        if (spriteScale > 0.001) {
          const spriteX = segment.p1.screen.x + (spriteScale * sprite.offset * this.roadWidth * w / 2);
          const spriteY = segment.p1.screen.y;
          this.renderStreetSprite(ctx, sprite, spriteX, spriteY, spriteScale);
        }
      }
    }

    // Render Landing Touchdown Smoke Shockwaves & Tire Sparks on Road
    if (this.landingPuffs.length > 0) {
      ctx.save();
      const puffScale = Math.min(1.0, 1.2 * (w / 800));
      for (const puff of this.landingPuffs) {
        const px = (w / 2) + (puff.x * this.roadWidth * puffScale * 0.5);
        const py = (h * 0.88);
        const alpha = Math.max(0, puff.life * 0.65);

        // Expanding smoke ring
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(px, py, puff.radius * puffScale, puff.radius * 0.35 * puffScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spark sparkler point
        ctx.fillStyle = `rgba(255, 234, 0, ${Math.max(0, puff.life)})`;
        ctx.beginPath();
        ctx.arc(px + puff.vx * 12, py + puff.vy * 8, 3.2 * puffScale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    p.screen.scale = cameraDepth / p.camera.z;
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
    p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
  }

  interpolate(a, b, percent) {
    return a + (b - a) * percent;
  }

  renderSegment(ctx, _w, _h, segment) {
    const p1 = segment.p1;
    const p2 = segment.p2;

    const r1 = p1.screen.w;
    const r2 = p2.screen.w;
    const l1 = r1 * 0.08;
    const l2 = r2 * 0.08;

    const isStartLine = segment.index >= 0 && segment.index < 6;
    const isSector1 = segment.index >= 398 && segment.index <= 402;
    const isSector2 = segment.index >= 798 && segment.index <= 802;
    const isRumble = Math.floor(segment.index / this.rumbleLength) % 2 === 0;

    const pal = this.currentPalette || PALETTE_DAY;

    // Road surface
    let roadFill = isRumble ? pal.roadDark : pal.roadLight;
    if (isStartLine) {
      roadFill = segment.index % 2 === 0 ? '#ffffff' : '#111118';
    } else if (isSector1 || isSector2) {
      roadFill = '#ff3e00';
    } else if (segment.isRamp) {
      roadFill = isRumble ? '#ffea00' : pal.roadLight;
    }

    ctx.fillStyle = roadFill;
    ctx.beginPath();
    ctx.moveTo(p1.screen.x - r1, p1.screen.y);
    ctx.lineTo(p1.screen.x + r1, p1.screen.y);
    ctx.lineTo(p2.screen.x + r2, p2.screen.y);
    ctx.lineTo(p2.screen.x - r2, p2.screen.y);
    ctx.closePath();
    ctx.fill();

    // Edge Kerbs & Energy Rails
    const rumbleFill = segment.isRamp ? (isRumble ? '#ff3e00' : '#ffea00') : (isRumble ? pal.rumble1 : pal.rumble2);
    ctx.fillStyle = rumbleFill;
    ctx.beginPath();
    ctx.moveTo(p1.screen.x - r1 - l1, p1.screen.y);
    ctx.lineTo(p1.screen.x - r1, p1.screen.y);
    ctx.lineTo(p2.screen.x - r2, p2.screen.y);
    ctx.lineTo(p2.screen.x - r2 - l2, p2.screen.y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(p1.screen.x + r1, p1.screen.y);
    ctx.lineTo(p1.screen.x + r1 + l1, p1.screen.y);
    ctx.lineTo(p2.screen.x + r2 + l2, p2.screen.y);
    ctx.lineTo(p2.screen.x + r2, p2.screen.y);
    ctx.closePath();
    ctx.fill();

    // Energy Rails on top
    const railFill = isRumble ? pal.rail1 : pal.rail2;
    ctx.fillStyle = railFill;
    const railH1 = Math.max(1, 3 * p1.screen.scale);
    ctx.fillRect(p1.screen.x - r1 - l1, p1.screen.y - railH1, l1 * 0.4, railH1);
    ctx.fillRect(p1.screen.x + r1 + l1 * 0.6, p1.screen.y - railH1, l1 * 0.4, railH1);

    // Center lane
    if (!segment.isRamp && !isStartLine) {
      const laneW1 = r1 * 0.025;
      const laneW2 = r2 * 0.025;
      ctx.fillStyle = isRumble ? pal.lane1 : pal.lane2;
      ctx.beginPath();
      ctx.moveTo(p1.screen.x - laneW1, p1.screen.y);
      ctx.lineTo(p1.screen.x + laneW1, p1.screen.y);
      ctx.lineTo(p2.screen.x + laneW2, p2.screen.y);
      ctx.lineTo(p2.screen.x - laneW2, p2.screen.y);
      ctx.closePath();
      ctx.fill();
    }

    // Ramp Chevron Launch Indicators on road surface
    if (segment.isRamp && p1.screen.scale > 0.003) {
      ctx.save();
      ctx.strokeStyle = segment.isRampApex ? '#00e5ff' : '#ffea00';
      ctx.lineWidth = Math.max(2, 5 * p1.screen.scale);
      const cy = p1.screen.y;
      const cx = p1.screen.x;
      const cw = r1 * 0.65;
      const ch = Math.max(3, 14 * p1.screen.scale);
      ctx.beginPath();
      ctx.moveTo(cx - cw, cy);
      ctx.lineTo(cx, cy - ch);
      ctx.lineTo(cx + cw, cy);
      ctx.stroke();

      // Apex Launch Gate Threshold
      if (segment.isRampApex) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = Math.max(3, 8 * p1.screen.scale);
        ctx.beginPath();
        ctx.moveTo(p1.screen.x - r1, p1.screen.y);
        ctx.lineTo(p1.screen.x + r1, p1.screen.y);
        ctx.stroke();

        const towerH = Math.max(16, 75 * p1.screen.scale);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(p1.screen.x - r1 - l1, p1.screen.y - towerH, l1 * 0.8, towerH);
        ctx.fillRect(p1.screen.x + r1 + l1 * 0.2, p1.screen.y - towerH, l1 * 0.8, towerH);
      }
      ctx.restore();
    }
  }

  renderStreetSprite(ctx, sprite, x, y, scale) {
    if (scale <= 0) return;
    const destW = 190 * scale * (sprite.scale || 1);
    const destH = 170 * scale * (sprite.scale || 1);

    if (sprite.type === 'highway_gantry') {
      ctx.save();
      const gantryW = destW * 2.2;
      const gantryH = destH * 0.85;

      // Vertical Steel Support Columns
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - gantryW * 0.52, y - gantryH, 8 * scale, gantryH);
      ctx.fillRect(x + gantryW * 0.50, y - gantryH, 8 * scale, gantryH);

      // Horizontal Steel Truss Frame
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - gantryW * 0.53, y - gantryH, gantryW * 1.06, 10 * scale);
      ctx.fillRect(x - gantryW * 0.53, y - gantryH + 28 * scale, gantryW * 1.06, 6 * scale);

      // Japanese / Metropolis Green Highway Directional Sign Board
      const signW = gantryW * 0.88;
      const signH = 34 * scale;
      const sx = x - signW / 2;
      const sy = y - gantryH + 4 * scale;

      ctx.fillStyle = '#065f46'; // Express highway green
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.fillRect(sx, sy, signW, signH);
      ctx.strokeRect(sx, sy, signW, signH);

      // Signboard Highway Text
      if (scale > 0.12) {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.max(8, Math.round(11 * scale))}px 'Space Mono', sans-serif`;
        ctx.fillText('首都高 SHUTO EXPWY · C1 LOOP', x, sy + signH * 0.35);

        ctx.font = `700 ${Math.max(7, Math.round(9 * scale))}px 'Space Mono', monospace`;
        ctx.fillStyle = '#fde047';
        ctx.fillText('▲ TOKYO BAY ROUTE / SHIBUYA', x, sy + signH * 0.72);
      }
      ctx.restore();
    } else if (sprite.type === 'street_light') {
      ctx.save();
      const poleW = Math.max(2, 4 * scale);
      const poleH = destH * 1.1;

      // Curved Lamppost Pole
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - poleW / 2, y - poleH, poleW, poleH);

      // Top Lamppost Arm Arching toward road
      const armDir = sprite.offset > 0 ? -1 : 1;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = poleW;
      ctx.beginPath();
      ctx.moveTo(x, y - poleH);
      ctx.quadraticCurveTo(x + armDir * 20 * scale, y - poleH - 10 * scale, x + armDir * 32 * scale, y - poleH + 4 * scale);
      ctx.stroke();

      // Street Lamp Head & Light Cone
      const lx = x + armDir * 32 * scale;
      const ly = y - poleH + 4 * scale;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(lx, ly, 4 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Soft Downward Sodium Light Glow
      if (scale > 0.18) {
        const glowGrad = ctx.createRadialGradient(lx, ly, 2 * scale, lx, y, 45 * scale);
        glowGrad.addColorStop(0, 'rgba(253, 224, 71, 0.40)');
        glowGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - 35 * scale, y);
        ctx.lineTo(lx + 35 * scale, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (sprite.type === 'billboard') {
      ctx.save();
      const boardW = destW * 1.1;
      const boardH = destH * 0.55;
      const by = y - destH * 0.85;

      // Steel Mounting Legs
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - boardW * 0.35, by + boardH, 4 * scale, y - (by + boardH));
      ctx.fillRect(x + boardW * 0.35, by + boardH, 4 * scale, y - (by + boardH));

      // Billboard Background
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = '#ff3e00';
      ctx.lineWidth = Math.max(1.5, 3 * scale);
      ctx.fillRect(x - boardW / 2, by, boardW, boardH);
      ctx.strokeRect(x - boardW / 2, by, boardW, boardH);

      // Brand Content
      if (scale > 0.14) {
        ctx.fillStyle = '#ffea00';
        ctx.font = `900 ${Math.max(9, Math.round(13 * scale))}px 'Space Mono', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sprite.brand || 'SPEEDLINE', x, by + boardH * 0.40);

        ctx.fillStyle = '#00f0ff';
        ctx.font = `800 ${Math.max(7, Math.round(9 * scale))}px 'Space Mono', monospace`;
        ctx.fillText('TURBO RACING FUELS', x, by + boardH * 0.74);
      }
      ctx.restore();
    } else {
      // Roadside Safety Hazard Chevron Barrier
      ctx.save();
      const bw = destW * 0.65;
      const bh = destH * 0.35;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - bw / 2, y - bh, bw, bh);

      // Yellow / Red Directional Arrow
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = Math.max(2, 4 * scale);
      ctx.beginPath();
      const arrowDir = (sprite.offset > 0) ? -1 : 1;
      ctx.moveTo(x - bw * 0.25 * arrowDir, y - bh * 0.8);
      ctx.lineTo(x + bw * 0.25 * arrowDir, y - bh * 0.5);
      ctx.lineTo(x - bw * 0.25 * arrowDir, y - bh * 0.2);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderStreetRivalCar(ctx, x, y, scale, color, name, car = null) {
    if (scale <= 0) return;
    const w = 205 * scale;
    const h = 92 * scale;
    const isAirborne = car && car.isAirborne;
    const jumpElev = isAirborne ? (car.jumpHeight * scale * 2.5) : 0;
    const cy = y - jumpElev; // Elevated vehicle center of mass
    const isNitro = car && car.nitroTimer > 0;
    const model = (car && car.model) || 'GT TUNER';
    const style = (car && car.style) || 'gtr';
    const accent = (car && car.accent) || '#ffffff';

    ctx.save();

    // 1. Realistic Tarmac Ground Shadow (Stays anchored to ground y while car jumps)
    const shadowScale = isAirborne ? Math.max(0.35, 1.0 - (jumpElev / (180 * scale))) : 1.0;
    const shadowAlpha = isAirborne ? Math.max(0.18, 0.65 - (jumpElev / (250 * scale))) : 0.65;
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 2 * scale, w * 0.55 * shadowScale, h * 0.22 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-Tech Tuner Underglow Neon Light on Asphalt
    if (scale > 0.15) {
      const underglowGrad = ctx.createRadialGradient(x, y, 0, x, y, w * 0.58);
      underglowGrad.addColorStop(0, color);
      underglowGrad.addColorStop(0.5, color + '55');
      underglowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = underglowGrad;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.65, h * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Wide Rubber Performance Tires (Tread Contact Patches Touching Tarmac)
    const tireW = w * 0.16;
    const tireH = h * 0.44;
    [-w * 0.44, w * 0.28].forEach((tx) => {
      // Rubber Tire Tread
      ctx.fillStyle = '#0c0d11';
      ctx.fillRect(x + tx, cy - h * 0.18, tireW, tireH * 0.65);

      // Alloy Rim Face & Brake Caliper
      ctx.fillStyle = '#272a34';
      ctx.fillRect(x + tx + tireW * 0.2, cy - h * 0.14, tireW * 0.6, tireH * 0.48);
      ctx.fillStyle = color; // Colored performance caliper
      ctx.fillRect(x + tx + tireW * 0.3, cy - h * 0.10, tireW * 0.4, tireH * 0.20);
    });

    // 4. Rear Carbon Fiber Diffuser & Vertical Airflow Strakes
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(x - w * 0.38, cy + h * 0.04, w * 0.76, h * 0.18);
    ctx.fillStyle = '#1e222d';
    for (let s = -3; s <= 3; s += 2) {
      ctx.fillRect(x + s * (w * 0.09) - 1.5, cy + h * 0.04, 3 * scale, h * 0.18);
    }

    // 5. Dual / Quad Titanium Exhaust Pipes & Backfire Flame Trails
    const exhaustX = [-w * 0.24, -w * 0.17, w * 0.17, w * 0.24];
    exhaustX.forEach((ex) => {
      // Exhaust Barrel
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(x + ex, cy + h * 0.14, 4.2 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8'; // Heat-treated titanium blue tip
      ctx.beginPath();
      ctx.arc(x + ex, cy + h * 0.14, 2.8 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Violent Backfire Flame Cones (When in nitro or high acceleration)
      if (isNitro || Math.random() < 0.22) {
        const fl = (isNitro ? 45 : 18) * scale * (0.8 + Math.random() * 0.4);
        const fGrad = ctx.createLinearGradient(x + ex, cy + h * 0.14, x + ex, cy + h * 0.14 + fl);
        fGrad.addColorStop(0, '#ffffff');
        fGrad.addColorStop(0.3, '#38bdf8');
        fGrad.addColorStop(0.7, '#ea580c');
        fGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.moveTo(x + ex - 3 * scale, cy + h * 0.14);
        ctx.lineTo(x + ex + 3 * scale, cy + h * 0.14);
        ctx.lineTo(x + ex + (Math.random() - 0.5) * 4 * scale, cy + h * 0.14 + fl);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 6. Sculpted Muscular Widebody Tuner Chassis
    const bodyGrad = ctx.createLinearGradient(x - w * 0.5, cy, x + w * 0.5, cy);
    bodyGrad.addColorStop(0, color);
    bodyGrad.addColorStop(0.2, '#12141c');
    bodyGrad.addColorStop(0.5, '#f8fafc'); // Specular metallic paint highlight
    bodyGrad.addColorStop(0.8, '#12141c');
    bodyGrad.addColorStop(1, color);

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = Math.max(1.8, 3.2 * scale);

    // Realistic Rear Bumper & Haunches
    ctx.beginPath();
    ctx.moveTo(x - w * 0.46, cy + h * 0.12);
    ctx.lineTo(x + w * 0.46, cy + h * 0.12);
    ctx.lineTo(x + w * 0.48, cy - h * 0.22);
    ctx.lineTo(x + w * 0.38, cy - h * 0.42);
    ctx.lineTo(x + w * 0.26, cy - h * 0.46);
    ctx.lineTo(x - w * 0.26, cy - h * 0.46);
    ctx.lineTo(x - w * 0.38, cy - h * 0.42);
    ctx.lineTo(x - w * 0.48, cy - h * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin Center Racing Stripes (for muscle / GT styles)
    if (style === 'quad') {
      ctx.fillStyle = accent;
      ctx.fillRect(x - 9 * scale, cy - h * 0.46, 6 * scale, h * 0.58);
      ctx.fillRect(x + 3 * scale, cy - h * 0.46, 6 * scale, h * 0.58);
    }

    // 7. Authentic Street Tuner Taillight Clusters
    if (style === 'gtr') {
      // Iconic Skyline GT-R Twin Round LED Taillights
      [-w * 0.33, -w * 0.23, w * 0.23, w * 0.33].forEach((lx) => {
        ctx.fillStyle = isNitro ? '#00e5ff' : '#dc2626';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = Math.max(3, 8 * scale);
        ctx.beginPath();
        ctx.arc(x + lx, cy - h * 0.15, 6.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + lx, cy - h * 0.15, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    } else if (style === 'supra') {
      // Iconic Supra MK4 4-Lens Taillight Bank
      ctx.fillStyle = '#05070a';
      ctx.fillRect(x - w * 0.42, cy - h * 0.22, w * 0.20, h * 0.14);
      ctx.fillRect(x + w * 0.22, cy - h * 0.22, w * 0.20, h * 0.14);
      [-w * 0.38, -w * 0.32, -w * 0.26, w * 0.26, w * 0.32, w * 0.38].forEach((lx) => {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(x + lx, cy - h * 0.15, 3.8 * scale, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Sleek High-Tech Smoked Neon Taillight Bar (911 / RX-7 / NSX Style)
      ctx.fillStyle = isNitro ? '#00e5ff' : '#dc2626';
      ctx.shadowColor = isNitro ? '#00e5ff' : '#dc2626';
      ctx.shadowBlur = Math.max(3, 10 * scale);
      ctx.fillRect(x - w * 0.40, cy - h * 0.20, w * 0.80, Math.max(2, 5 * scale));
      ctx.shadowBlur = 0;
    }

    // 8. Illuminated Japanese / Street License Plate
    const plateW = 38 * scale;
    const plateH = 16 * scale;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x - plateW / 2, cy - h * 0.04, plateW, plateH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - plateW / 2, cy - h * 0.04, plateW, plateH);
    if (scale > 0.24) {
      ctx.fillStyle = '#0f172a';
      ctx.font = `900 ${Math.max(6, Math.round(7 * scale))}px 'Space Mono', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(model.substring(0, 7), x, cy - h * 0.04 + plateH / 2);
    }

    // 9. Tinted Rear Windshield Glass & Roofline
    ctx.fillStyle = '#060a14';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.26, cy - h * 0.46);
    ctx.lineTo(x + w * 0.26, cy - h * 0.46);
    ctx.lineTo(x + w * 0.20, cy - h * 0.78);
    ctx.lineTo(x - w * 0.20, cy - h * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Defroster Heating Lines on Rear Window
    if (scale > 0.20) {
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.45)';
      ctx.lineWidth = 1;
      for (let d = 1; d <= 3; d++) {
        const dy = cy - h * 0.48 - d * (h * 0.08);
        ctx.beginPath();
        ctx.moveTo(x - w * 0.18 + d * 3 * scale, dy);
        ctx.lineTo(x + w * 0.18 - d * 3 * scale, dy);
        ctx.stroke();
      }
    }

    // 10. Large Aerodynamic Carbon Fiber GT Wing Spoiler
    ctx.fillStyle = '#05070a';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1.5, 3 * scale);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.48, cy - h * 0.88);
    ctx.lineTo(x + w * 0.48, cy - h * 0.88);
    ctx.lineTo(x + w * 0.44, cy - h * 0.76);
    ctx.lineTo(x - w * 0.44, cy - h * 0.76);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Spoiler Aluminum Uprights & Endplates
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - w * 0.22, cy - h * 0.76, 4 * scale, h * 0.28);
    ctx.fillRect(x + w * 0.22 - 4 * scale, cy - h * 0.76, 4 * scale, h * 0.28);
    ctx.fillStyle = color;
    ctx.fillRect(x - w * 0.50, cy - h * 0.94, w * 0.06, h * 0.28);
    ctx.fillRect(x + w * 0.44, cy - h * 0.94, w * 0.06, h * 0.28);

    // 11. Prominent Street Racer Callout Nametag Badge
    if (scale > 0.18 && name) {
      const tagFontSize = Math.max(9, Math.round(11 * scale));
      ctx.font = `900 ${tagFontSize}px 'Space Mono', monospace`;
      let tagText = `${name} · ${model}`;
      if (isNitro) tagText = `⚡ ${name} [NOS BURST]`;
      else if (isAirborne) tagText = `▲ ${name} [AIRBORNE]`;

      const textW = ctx.measureText(tagText).width;
      const tagY = cy - h * 1.25;

      // Dark contrast nametag backing with neon border
      ctx.fillStyle = 'rgba(4, 6, 12, 0.94)';
      ctx.strokeStyle = isNitro ? '#00e5ff' : color;
      ctx.lineWidth = 1.8;
      ctx.fillRect(x - textW / 2 - 7, tagY, textW + 14, tagFontSize + 7);
      ctx.strokeRect(x - textW / 2 - 7, tagY, textW + 14, tagFontSize + 7);

      ctx.fillStyle = isNitro ? '#00e5ff' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, x, tagY + (tagFontSize + 7) / 2);
    }

    ctx.restore();
  }

  renderPlayerStreetCar(ctx, w, h) {
    if (this.cameraMode === 2) {
      this.renderCockpitOverlay(ctx, w, h);
      return;
    }

    const stunt = this.stuntTransform || { height: 0, pitch: 0, roll: 0, bounceOffset: 0, stuntName: '' };
    const shipX = w / 2;
    // Apply suspension landing bounce and stunt height
    const landingBounceOffset = this.landingBounce || 0;
    const shipY = (h * 0.86) - (stunt.height * 1.8) + (stunt.bounceOffset || 0) + landingBounceOffset;
    const scale = (w / 800) * (this.cameraMode === 3 ? 0.75 : 1.0) * (1.0 + Math.min(0.2, stunt.height * 0.003));
    const carW = 230 * scale;
    const carH = 102 * scale;
    const tilt = this.bankAngle * 0.32 + stunt.roll;
    const yaw = this.driftAngle * 0.85;
    const totalPitch = stunt.pitch + (this.landingPitch || 0);
    const pitchScale = Math.cos(totalPitch);

    ctx.save();
    ctx.translate(shipX, shipY);
    ctx.rotate(tilt + yaw);

    // Dynamic squish during landing impact
    const squishY = Math.max(0.25, Math.abs(pitchScale) * (1.0 - Math.min(0.25, Math.abs(landingBounceOffset) * 0.015)));
    const stretchX = 1.0 + Math.min(0.15, Math.abs(landingBounceOffset) * 0.01);
    ctx.scale(stretchX, squishY);

    // 1. Billowing Realistic Tire Smoke During Drifts
    if (this.isDrifting) {
      const smokePuffs = 8 + this.driftLevel * 5;
      [-carW * 0.44, carW * 0.44].forEach((tx) => {
        for (let s = 0; s < smokePuffs; s++) {
          const sx = tx + (Math.random() - 0.5) * 35 * scale;
          const sy = carH * 0.28 + Math.random() * 25 * scale;
          const sRadius = (Math.random() * 12 + 6) * scale;
          const sAlpha = Math.random() * 0.45 + 0.15;
          ctx.fillStyle = `rgba(226, 232, 240, ${sAlpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Mini-Turbo Tier Announcement
      if (this.driftLevel > 0) {
        ctx.save();
        ctx.font = `900 ${Math.round(13 * scale)}px 'Space Mono', monospace`;
        ctx.fillStyle = this.driftLevel === 3 ? '#c084fc' : (this.driftLevel === 2 ? '#ff7700' : '#00e5ff');
        ctx.textAlign = 'center';
        const tierText = this.driftLevel === 3 ? '⚡ ULTRA DRIFT BOOST ⚡' : (this.driftLevel === 2 ? 'SUPER DRIFT' : 'DRIFT CHARGE');
        ctx.fillText(tierText, 0, -carH * 1.15);
        ctx.restore();
      }
    }

    const isAccelerated = this.nitroActive || this.boostTimer > 0;
    const speedRatio = this.speed / this.maxSpeed;

    // 2. Wide Low-Profile Rubber Racing Tires
    const tireW = carW * 0.17;
    const tireH = carH * 0.46;
    [-carW * 0.46, carW * 0.29].forEach((tx) => {
      // Chunky Black Rubber Tire
      ctx.fillStyle = '#08090d';
      ctx.fillRect(tx, -carH * 0.10, tireW, tireH * 0.72);

      // Deep-Dish Performance Alloy Rim
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(tx + tireW * 0.15, -carH * 0.06, tireW * 0.7, tireH * 0.55);

      // Red Brembo-style Performance Brake Caliper
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(tx + tireW * 0.25, -carH * 0.02, tireW * 0.5, tireH * 0.22);
    });

    // 3. Ground Tarmac Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(0, carH * 0.26, carW * 0.56, carH * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Rear Carbon Fiber Diffuser with Vertical Aero Fins
    ctx.fillStyle = '#07080c';
    ctx.fillRect(-carW * 0.38, carH * 0.08, carW * 0.76, carH * 0.20);
    ctx.fillStyle = '#1e2433';
    for (let s = -3; s <= 3; s += 2) {
      ctx.fillRect(s * (carW * 0.09) - 2 * scale, carH * 0.08, 4 * scale, carH * 0.20);
    }

    // F1-Style Rain / Safety Flashing Light in Center of Diffuser
    const f1Flash = (Math.floor(Date.now() / 250) % 2 === 0) || this.keys.backward;
    ctx.fillStyle = f1Flash ? '#ff0033' : '#450a0a';
    ctx.fillRect(-8 * scale, carH * 0.14, 16 * scale, 9 * scale);

    // 5. Quad Titanium Exhaust Pipes & Violent Backfire Pops
    const exhaustX = [-carW * 0.26, -carW * 0.18, carW * 0.18, carW * 0.26];
    exhaustX.forEach((ex) => {
      // Titanium Exhaust Tip
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(ex, carH * 0.18, 5.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0284c7'; // Blued titanium flame ring
      ctx.beginPath();
      ctx.arc(ex, carH * 0.18, 3.8 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Backfire Exhaust Flames
      if (isAccelerated || (speedRatio > 0.4 && Math.random() < 0.30)) {
        const flameLen = (isAccelerated ? 68 : 28) * scale * (0.8 + Math.random() * 0.4);
        const fGrad = ctx.createLinearGradient(ex, carH * 0.18, ex, carH * 0.18 + flameLen);
        fGrad.addColorStop(0, '#ffffff');
        fGrad.addColorStop(0.25, isAccelerated ? '#00e5ff' : '#38bdf8');
        fGrad.addColorStop(0.65, '#ea580c');
        fGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.moveTo(ex - 4 * scale, carH * 0.18);
        ctx.lineTo(ex + 4 * scale, carH * 0.18);
        ctx.lineTo(ex + (Math.random() - 0.5) * 6 * scale, carH * 0.18 + flameLen);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 6. Sculpted Muscular Widebody Supercar Chassis
    const hullGrad = ctx.createLinearGradient(-carW * 0.5, 0, carW * 0.5, 0);
    hullGrad.addColorStop(0.0, '#c2410c'); // Deep metallic copper-crimson
    hullGrad.addColorStop(0.2, '#ea580c');
    hullGrad.addColorStop(0.48, '#fb923c');
    hullGrad.addColorStop(0.50, '#ffffff'); // Glossy pearl highlight
    hullGrad.addColorStop(0.52, '#fb923c');
    hullGrad.addColorStop(0.8, '#ea580c');
    hullGrad.addColorStop(1.0, '#c2410c');

    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = Math.max(2, 4 * scale);

    ctx.beginPath();
    ctx.moveTo(-carW * 0.48, carH * 0.16);
    ctx.lineTo(carW * 0.48, carH * 0.16);
    ctx.lineTo(carW * 0.50, -carH * 0.18);
    ctx.lineTo(carW * 0.40, -carH * 0.40);
    ctx.lineTo(carW * 0.28, -carH * 0.44);
    ctx.lineTo(-carW * 0.28, -carH * 0.44);
    ctx.lineTo(-carW * 0.40, -carH * 0.40);
    ctx.lineTo(-carW * 0.50, -carH * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 7. Smoked Horizontal LED Taillight Bar with Radiant Brake Glow
    const isBraking = this.keys.backward;
    ctx.fillStyle = isBraking ? '#ff0033' : '#dc2626';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = isBraking ? 18 : 10;
    ctx.fillRect(-carW * 0.42, -carH * 0.18, carW * 0.84, Math.max(3, 7 * scale));
    ctx.shadowBlur = 0;

    // Center Third High-Mount Brake Light
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-carW * 0.12, -carH * 0.42, carW * 0.24, 3 * scale);

    // 8. Japanese Street License Plate (Illuminated by twin white LEDs)
    const plateW = 48 * scale;
    const plateH = 20 * scale;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-plateW / 2, -carH * 0.02, plateW, plateH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-plateW / 2, -carH * 0.02, plateW, plateH);

    ctx.fillStyle = '#0f172a';
    ctx.font = `900 ${Math.max(7, Math.round(8.5 * scale))}px 'Space Mono', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TOKYO 99', 0, -carH * 0.02 + plateH * 0.35);
    ctx.font = `700 ${Math.max(6, Math.round(7.5 * scale))}px 'Space Mono', monospace`;
    ctx.fillStyle = '#dc2626';
    ctx.fillText('DRIFT-GT', 0, -carH * 0.02 + plateH * 0.72);

    // 9. Tinted Slanted Rear Windshield Glass & Roll Cage Bars
    ctx.fillStyle = '#070b14';
    ctx.beginPath();
    ctx.moveTo(-carW * 0.28, -carH * 0.44);
    ctx.lineTo(carW * 0.28, -carH * 0.44);
    ctx.lineTo(carW * 0.21, -carH * 0.76);
    ctx.lineTo(-carW * 0.21, -carH * 0.76);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Interior Roll Cage X-Brace Bars visible through glass
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = Math.max(1, 2.5 * scale);
    ctx.beginPath();
    ctx.moveTo(-carW * 0.18, -carH * 0.46);
    ctx.lineTo(carW * 0.18, -carH * 0.74);
    ctx.moveTo(carW * 0.18, -carH * 0.46);
    ctx.lineTo(-carW * 0.18, -carH * 0.74);
    ctx.stroke();

    // Defroster Grid Lines
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.50)';
    ctx.lineWidth = 1;
    for (let d = 1; d <= 3; d++) {
      const dy = -carH * 0.46 - d * (carH * 0.08);
      ctx.beginPath();
      ctx.moveTo(-carW * 0.20 + d * 3 * scale, dy);
      ctx.lineTo(carW * 0.20 - d * 3 * scale, dy);
      ctx.stroke();
    }

    // 10. High-Downforce Carbon Fiber GT Wing
    ctx.fillStyle = '#06070a';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(2, 3.5 * scale);
    ctx.beginPath();
    ctx.moveTo(-carW * 0.48, -carH * 0.86);
    ctx.lineTo(carW * 0.48, -carH * 0.86);
    ctx.lineTo(carW * 0.43, -carH * 0.72);
    ctx.lineTo(-carW * 0.43, -carH * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // CNC Aluminum Wing Stanchions & Side Endplates
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-carW * 0.24, -carH * 0.72, 5 * scale, carH * 0.28);
    ctx.fillRect(carW * 0.24 - 5 * scale, -carH * 0.72, 5 * scale, carH * 0.28);

    // Red Wing Endplates
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(-carW * 0.50, -carH * 0.94, carW * 0.05, carH * 0.32);
    ctx.fillRect(carW * 0.45, -carH * 0.94, carW * 0.05, carH * 0.32);

    ctx.restore();
  }

  renderCockpitOverlay(ctx, w, h) {
    ctx.save();
    const cx = w / 2;
    const cy = h * 0.55;

    // Suede Sports Steering Wheel
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, h * 0.92, 130, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();

    // 12 O'Clock Red Racing Center Alignment Marker on Steering Wheel
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(cx, h * 0.92, 130, Math.PI * 1.48, Math.PI * 1.52);
    ctx.stroke();

    // Digital Dash HUD Cluster
    ctx.fillStyle = 'rgba(10, 15, 26, 0.88)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 100, h * 0.74, 200, 52);
    ctx.strokeRect(cx - 100, h * 0.74, 200, 52);

    ctx.font = "900 14px 'Space Mono', monospace";
    ctx.fillStyle = '#ffea00';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.speed / 100)} KM/H · GEAR 5`, cx, h * 0.78);

    // Rearview Mirror with Chasing Rivals Reflection
    ctx.fillStyle = '#030712';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.fillRect(cx - 90, 18, 180, 48);
    ctx.strokeRect(cx - 90, 18, 180, 48);

    ctx.fillStyle = '#22c55e';
    ctx.font = "800 10px 'Space Mono', monospace";
    ctx.fillText('REARVIEW · CHASE MIRROR', cx, 36);

    ctx.restore();
  }

  loop(timestamp) {
    const now = timestamp || performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.stopEngineAudio();
  }
}
