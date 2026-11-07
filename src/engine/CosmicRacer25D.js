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
    this.initParallaxBackdrop();
    this.initStars();
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
    this.playBeep(base, 0.15, 'square');
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

    // Build 1200 segments cosmic void track with great drift corners
    addStraight(60); // Grid straight (Sector 1 start)
    addCurve(70, 2.6, 8); // Nebula Climb drift right
    addHill(60, 20);
    addCurve(80, -3.2, -12); // Spiral Dip drift left
    addDip(50, -20);
    addStraight(60); // Warp accelerator (Sector 2 start ~seg 380)
    addCurve(95, 3.8, 10); // Solar Corkscrew long right drift
    addHill(40, 12);
    addCurve(70, -2.8, -6); // Asteroid Chicanes S-turn
    addCurve(70, 2.8, -8);
    addStraight(60); // Hyperspace Alley (Sector 3 start ~seg 775)
    addCurve(85, -3.5, 0); // Galaxy Turn high-speed left drift
    addStraight(80); // Final straight back to start/finish line

    this.trackLength = this.segments.length * this.segmentLength;

    // Scatter space objects (Asteroids, Warp Gates, Satellites)
    for (let i = 35; i < this.segments.length - 35; i += 20) {
      const seg = this.segments[i];
      if (i % 80 === 0) {
        seg.sprites.push({ type: 'warp_gate', offset: 0, scale: 1.4 });
      } else if (i % 40 === 0) {
        seg.sprites.push({ type: 'satellite', offset: (i % 80 === 40 ? 1.6 : -1.6), scale: 1.0 });
      } else {
        seg.sprites.push({
          type: 'asteroid',
          offset: (i % 2 === 0 ? 1.35 : -1.35),
          scale: 0.85,
        });
      }
    }
  }

  addSegment(curve, y) {
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

  initStars() {
    this.stars = [];
    for (let i = 0; i < 180; i++) {
      this.stars.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 800 - 400,
        size: Math.random() * 1.8 + 0.6,
        color: ['#ffffff', '#a5f3fc', '#fed7aa', '#c084fc', '#ff6b6b'][Math.floor(Math.random() * 5)],
        layer: Math.floor(Math.random() * 3),
      });
    }
  }

  initParallaxBackdrop() {
    this.planets = [
      { x: 0.28, y: 0.24, radius: 70, color1: '#ff3e00', color2: '#5b1000', ring: true },
      { x: 0.76, y: 0.20, radius: 38, color1: '#00e5ff', color2: '#002b4d', ring: false },
    ];
  }

  // ---------------------------------------------------------------------------
  // AI OPPONENTS INITIALIZATION
  // ---------------------------------------------------------------------------
  initCars() {
    // Clear cars from existing segments
    for (const seg of this.segments) {
      seg.cars = [];
    }
    this.cars = [];

    // 6 Distinct Grand Prix AI Opponents
    const aiConfigs = [
      { name: 'VORTEX-1', color: '#00e5ff', speedMult: 0.96, offset: -0.45, gridRow: 1 },
      { name: 'SOLARIS', color: '#ffd600', speedMult: 0.93, offset: 0.45, gridRow: 2 },
      { name: 'NEBULA-X', color: '#ec4899', speedMult: 0.90, offset: -0.35, gridRow: 3 },
      { name: 'TITAN-9', color: '#10b981', speedMult: 0.87, offset: 0.35, gridRow: 4 },
      { name: 'PULSAR', color: '#a855f7', speedMult: 0.84, offset: -0.48, gridRow: 5 },
      { name: 'CYBER-GT', color: '#f97316', speedMult: 0.81, offset: 0.48, gridRow: 6 },
    ];

    for (let i = 0; i < aiConfigs.length; i++) {
      const cfg = aiConfigs[i];
      // Starting Grid: Placed in classic Grand Prix staggered grid directly ahead of player!
      // Row 1 starts ~450 units ahead, staggered by 350 units per row
      const z = 450 + (cfg.gridRow - 1) * 360;
      const seg = this.findSegment(z);
      const percent = (z % this.segmentLength) / this.segmentLength;
      const car = {
        id: i,
        name: cfg.name,
        offset: cfg.offset,
        targetOffset: cfg.offset,
        z,
        baseSpeed: this.maxSpeed * cfg.speedMult,
        speed: this.maxSpeed * cfg.speedMult * 0.75, // Starting grid acceleration
        color: cfg.color,
        percent,
        driftSlip: 0,
        laneTimer: Math.random() * 2 + 1,
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

    // Auto-Ramp Launch when hitting Warp Gates or steep hill crests
    const currSegIdx = Math.floor(this.position / this.segmentLength);
    const prevSegIdx = Math.floor(prevPosition / this.segmentLength);
    if (currSegIdx !== prevSegIdx && currSegIdx % 80 === 0 && !this.stuntController.isAirborne && this.speed > 4000) {
      this.stuntController.triggerRampJump(1.35);
      this.triggerWarpBoost(1.2);
    }

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
  // AI OPPONENTS LOGIC
  // ---------------------------------------------------------------------------
  updateAIOpponents(dt) {
    for (const car of this.cars) {
      const oldSeg = this.findSegment(car.z);

      // AI Lane changing & dynamic overtaking
      car.laneTimer -= dt;
      if (car.laneTimer <= 0) {
        car.laneTimer = 1.5 + Math.random() * 3.0;
        // Lane wandering within [-0.7, 0.7]
        car.targetOffset = (Math.random() * 1.4 - 0.7);
      }
      car.offset += (car.targetOffset - car.offset) * dt * 1.8;

      // Drafting speed boost if player is directly ahead
      const distToPlayer = this.position - car.z;
      if (distToPlayer > 0 && distToPlayer < 2400 && Math.abs(this.playerX - car.offset) < 0.35) {
        // AI catches player slipstream
        car.speed = Math.min(this.maxSpeed * 1.05, car.speed + 1200 * dt);
      } else {
        car.speed += (car.baseSpeed - car.speed) * dt * 2.0;
      }

      // Advance AI position along track
      car.z = (car.z + car.speed * dt) % this.trackLength;
      car.percent = (car.z % this.segmentLength) / this.segmentLength;
      const newSeg = this.findSegment(car.z);

      if (oldSeg !== newSeg) {
        const index = oldSeg.cars.indexOf(car);
        if (index !== -1) oldSeg.cars.splice(index, 1);
        newSeg.cars.push(car);
      }

      // Collision check with player
      const dz = Math.abs(this.position - car.z);
      if (dz < 160 && Math.abs(this.playerX - car.offset) < 0.42) {
        this.speed *= 0.75;
        this.screenShake = 5;
        this.playImpactSound();
        // Nudge player sideways
        this.playerX += (this.playerX > car.offset ? 0.2 : -0.2);
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

    // 1. Space Parallax
    this.renderSpaceBackdrop(ctx, w, h);

    // 2. Road Segments & AI Cars
    this.renderRoad(ctx, w, h);

    // 3. Player Speeder
    this.renderPlayerShip(ctx, w, h);

    ctx.restore();
  }

  renderSpaceBackdrop(ctx, w, h) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0.0, '#04020a');
    skyGrad.addColorStop(0.55, '#0b0818');
    skyGrad.addColorStop(1.0, '#15102a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const currentSegment = this.findSegment(this.position);
    const curveOffset = currentSegment.curve * (this.speed / this.maxSpeed) * 30;

    // Distant Planets
    for (const p of this.planets) {
      const px = p.x * w - curveOffset * 0.12;
      const py = p.y * h;
      const grad = ctx.createRadialGradient(px - p.radius * 0.3, py - p.radius * 0.3, p.radius * 0.1, px, py, p.radius);
      grad.addColorStop(0, p.color1);
      grad.addColorStop(1, p.color2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      ctx.fill();

      if (p.ring) {
        ctx.strokeStyle = 'rgba(255, 200, 160, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(px, py, p.radius * 2.1, p.radius * 0.42, -0.22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Stars
    const isAccelerated = this.nitroActive || this.boostTimer > 0;
    const speedRatio = this.speed / this.maxSpeed;
    const streakLength = isAccelerated ? 24 : 2 + speedRatio * 9;
    for (const star of this.stars) {
      const layerMult = (star.layer + 1) * 0.25;
      const sx = (star.x - curveOffset * layerMult + w * 2) % w;
      const sy = (star.y + h * 2) % (h * 0.65);

      ctx.fillStyle = star.color;
      if (speedRatio > 0.4 || isAccelerated) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - curveOffset * 0.1, sy + streakLength * layerMult);
        ctx.strokeStyle = star.color;
        ctx.lineWidth = star.size;
        ctx.stroke();
      } else {
        ctx.fillRect(sx, sy, star.size, star.size);
      }
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
    const camY = this.cameraHeight + playerY;

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

    // Sprites & AI Cars back-to-front
    for (let n = this.drawDistance - 1; n > 0; n--) {
      const segment = this.segments[(baseSegment.index + n) % this.segments.length];

      for (const car of segment.cars) {
        const carScale = this.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, car.percent);
        const carX = this.interpolate(segment.p1.screen.x, segment.p2.screen.x, car.percent) +
          (carScale * car.offset * this.roadWidth * w / 2);
        const carY = this.interpolate(segment.p1.screen.y, segment.p2.screen.y, car.percent);
        this.renderDroneCar(ctx, carX, carY, carScale, car.color, car.name);
      }

      for (const sprite of segment.sprites) {
        const spriteScale = segment.p1.screen.scale;
        const spriteX = segment.p1.screen.x + (spriteScale * sprite.offset * this.roadWidth * w / 2);
        const spriteY = segment.p1.screen.y;
        this.renderSpaceSprite(ctx, sprite, spriteX, spriteY, spriteScale);
      }
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

    // Road surface
    ctx.fillStyle = segment.color.road;
    ctx.beginPath();
    ctx.moveTo(p1.screen.x - r1, p1.screen.y);
    ctx.lineTo(p1.screen.x + r1, p1.screen.y);
    ctx.lineTo(p2.screen.x + r2, p2.screen.y);
    ctx.lineTo(p2.screen.x - r2, p2.screen.y);
    ctx.closePath();
    ctx.fill();

    // Edge Kerbs & Energy Rails
    ctx.fillStyle = segment.color.rumble;
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

    // Center lane
    if (segment.color.lane) {
      const laneW1 = r1 * 0.025;
      const laneW2 = r2 * 0.025;
      ctx.fillStyle = segment.color.lane;
      ctx.beginPath();
      ctx.moveTo(p1.screen.x - laneW1, p1.screen.y);
      ctx.lineTo(p1.screen.x + laneW1, p1.screen.y);
      ctx.lineTo(p2.screen.x + laneW2, p2.screen.y);
      ctx.lineTo(p2.screen.x - laneW2, p2.screen.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  renderSpaceSprite(ctx, sprite, x, y, scale) {
    if (scale <= 0) return;
    const destW = 180 * scale * (sprite.scale || 1);
    const destH = 180 * scale * (sprite.scale || 1);

    if (sprite.type === 'warp_gate') {
      ctx.save();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = Math.max(2, 6 * scale);
      ctx.beginPath();
      ctx.ellipse(x, y - destH * 0.7, destW * 1.3, destH * 1.05, 0, Math.PI, 0);
      ctx.stroke();

      ctx.strokeStyle = '#ff3e00';
      ctx.lineWidth = Math.max(1.5, 3 * scale);
      ctx.beginPath();
      ctx.ellipse(x, y - destH * 0.7, destW * 1.15, destH * 0.9, 0, Math.PI, 0);
      ctx.stroke();
      ctx.restore();
    } else if (sprite.type === 'satellite') {
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.fillRect(x - destW * 0.2, y - destH * 0.5, destW * 0.4, destH * 0.4);
      ctx.strokeRect(x - destW * 0.2, y - destH * 0.5, destW * 0.4, destH * 0.4);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(x - destW * 0.65, y - destH * 0.4, destW * 0.4, destH * 0.2);
      ctx.fillRect(x + destW * 0.25, y - destH * 0.4, destW * 0.4, destH * 0.2);
      ctx.restore();
    } else {
      ctx.save();
      const radius = destW * 0.35;
      const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
      grad.addColorStop(0, '#857e7b');
      grad.addColorStop(1, '#262220');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y - radius, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderDroneCar(ctx, x, y, scale, color, name) {
    if (scale <= 0) return;
    const w = 150 * scale;
    const h = 75 * scale;

    ctx.save();
    // Soft Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2 * scale, w * 0.62, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rear Aero Wing / Spoiler
    ctx.fillStyle = '#111116';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(1.5, 2.5 * scale);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.46, y - h * 0.72);
    ctx.lineTo(x + w * 0.46, y - h * 0.72);
    ctx.lineTo(x + w * 0.42, y - h * 0.60);
    ctx.lineTo(x - w * 0.42, y - h * 0.60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin Wing Endplates
    ctx.fillStyle = color;
    ctx.fillRect(x - w * 0.48, y - h * 0.80, w * 0.07, h * 0.32);
    ctx.fillRect(x + w * 0.41, y - h * 0.80, w * 0.07, h * 0.32);

    // Main Grand Prix Aerodynamic Monocoque Chassis
    const bodyGrad = ctx.createLinearGradient(x - w * 0.5, y, x + w * 0.5, y);
    bodyGrad.addColorStop(0, color);
    bodyGrad.addColorStop(0.5, '#ffffff');
    bodyGrad.addColorStop(1, color);

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(1.8, 3.0 * scale);
    ctx.beginPath();
    ctx.moveTo(x, -h * 0.85 + y);
    ctx.lineTo(x + w * 0.42, y - h * 0.22);
    ctx.lineTo(x + w * 0.38, y + h * 0.08);
    ctx.lineTo(x + w * 0.16, y - h * 0.02);
    ctx.lineTo(x - w * 0.16, y - h * 0.02);
    ctx.lineTo(x - w * 0.38, y + h * 0.08);
    ctx.lineTo(x - w * 0.42, y - h * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit Canopy (Dark Glass with Sun Glare)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.38, w * 0.14, h * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = Math.max(1, 1.8 * scale);
    ctx.stroke();

    // Active Dual Afterburner Thrusters
    [-w * 0.20, w * 0.20].forEach((tx) => {
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(x + tx, y - h * 0.18, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + tx, y - h * 0.18, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    // High-visibility Grand Prix Pilot Callout Name & Rank
    if (scale > 0.25 && name) {
      const tagFontSize = Math.max(9, Math.round(11 * scale));
      ctx.font = `800 ${tagFontSize}px 'Space Mono', monospace`;
      const textW = ctx.measureText(name).width;

      // Dark contrast nametag backing
      ctx.fillStyle = 'rgba(10, 10, 16, 0.88)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - textW / 2 - 5, y - h * 1.15, textW + 10, tagFontSize + 5);
      ctx.strokeRect(x - textW / 2 - 5, y - h * 1.15, textW + 10, tagFontSize + 5);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, x, y - h * 1.15 + (tagFontSize + 5) / 2);
    }

    ctx.restore();
  }

  renderPlayerShip(ctx, w, h) {
    if (this.cameraMode === 2) {
      this.renderCockpitOverlay(ctx, w, h);
      return;
    }

    const stunt = this.stuntTransform || { height: 0, pitch: 0, roll: 0, bounceOffset: 0, stuntName: '' };
    const shipX = w / 2;
    const shipY = (h * 0.86) - (stunt.height * 1.8) + (stunt.bounceOffset || 0);
    const scale = (w / 800) * (this.cameraMode === 3 ? 0.75 : 1.0) * (1.0 + Math.min(0.2, stunt.height * 0.003));
    const shipW = 190 * scale;
    const shipH = 92 * scale;
    const tilt = this.bankAngle * 0.35 + stunt.roll;
    const yaw = this.driftAngle;
    const pitchScale = Math.cos(stunt.pitch);

    ctx.save();
    ctx.translate(shipX, shipY);
    ctx.rotate(tilt + yaw);
    ctx.scale(1.0, Math.max(0.2, Math.abs(pitchScale)));

    // Stunt Announcement Banner
    if (stunt.stuntName) {
      ctx.save();
      ctx.font = `800 ${Math.round(14 * scale)}px 'Space Mono', monospace`;
      ctx.fillStyle = '#ffea00';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(`★ ${stunt.stuntName} ★`, 0, -shipH * 1.35);
      ctx.restore();
    }

    const isAccelerated = this.nitroActive || this.boostTimer > 0;
    const speedRatio = this.speed / this.maxSpeed;

    // 1. Drift Plasma Sparks
    if (this.isDrifting) {
      const sparkColor = this.driftLevel === 3 ? '#c084fc' : (this.driftLevel === 2 ? '#ff7700' : '#00e5ff');
      const sparkCount = 5 + this.driftLevel * 4;
      const sparkOriginX = -this.driftDirection * shipW * 0.38;

      for (let s = 0; s < sparkCount; s++) {
        const sx = sparkOriginX + (Math.random() - 0.5) * 24 * scale;
        const sy = shipH * 0.15 + Math.random() * 28 * scale;
        const sSize = (Math.random() * 4.5 + 2) * scale;
        ctx.fillStyle = sparkColor;
        ctx.beginPath();
        ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
        ctx.fill();
      }

      if (this.driftLevel > 0) {
        ctx.font = `800 ${Math.round(12 * scale)}px 'Space Mono', monospace`;
        ctx.fillStyle = sparkColor;
        ctx.textAlign = 'center';
        const tierText = this.driftLevel === 3 ? '⚡ ULTRA DRIFT ⚡' : (this.driftLevel === 2 ? 'SUPER DRIFT' : 'DRIFT BOOST');
        ctx.fillText(tierText, 0, -shipH * 1.05);
      }
    }

    // 2. High-Performance Triple Plasma Thrusters
    const flameLen = (22 + speedRatio * 58 + (isAccelerated ? 68 : 0)) * scale;
    const flameW = (13 + (isAccelerated ? 7 : 0)) * scale;

    [-shipW * 0.26, 0, shipW * 0.26].forEach((tx, idx) => {
      const fLen = idx === 1 ? flameLen * 1.25 : flameLen * 0.9;
      const flameGrad = ctx.createLinearGradient(tx, 0, tx, fLen);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, isAccelerated ? '#00e5ff' : '#ff3e00');
      flameGrad.addColorStop(0.7, '#ff0055');
      flameGrad.addColorStop(1, 'rgba(255, 62, 0, 0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(tx - flameW * 0.5, -shipH * 0.12);
      ctx.lineTo(tx + flameW * 0.5, -shipH * 0.12);
      ctx.lineTo(tx + (Math.random() - 0.5) * 6, fLen * (0.85 + Math.random() * 0.35));
      ctx.closePath();
      ctx.fill();
    });

    // 3. Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';
    ctx.beginPath();
    ctx.ellipse(0, shipH * 0.35, shipW * 0.58, shipH * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Rear Spoiler Wing
    ctx.fillStyle = '#111116';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(2, 3.2 * scale);
    ctx.beginPath();
    ctx.moveTo(-shipW * 0.44, -shipH * 0.32);
    ctx.lineTo(shipW * 0.44, -shipH * 0.32);
    ctx.lineTo(shipW * 0.38, -shipH * 0.18);
    ctx.lineTo(-shipW * 0.38, -shipH * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing Stabilizer Fins
    ctx.fillStyle = '#ff3e00';
    ctx.fillRect(-shipW * 0.46, -shipH * 0.45, shipW * 0.06, shipH * 0.30);
    ctx.fillRect(shipW * 0.40, -shipH * 0.45, shipW * 0.06, shipH * 0.30);

    // 5. Grand Prix Aerodynamic Speeder Monocoque
    const hullGrad = ctx.createLinearGradient(-shipW * 0.5, 0, shipW * 0.5, 0);
    hullGrad.addColorStop(0, '#e63500');
    hullGrad.addColorStop(0.48, '#ff5010');
    hullGrad.addColorStop(0.5, '#ffffff');
    hullGrad.addColorStop(0.52, '#ff5010');
    hullGrad.addColorStop(1, '#e63500');

    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(2, 3.8 * scale);

    ctx.beginPath();
    ctx.moveTo(0, -shipH * 0.95);
    ctx.lineTo(shipW * 0.52, -shipH * 0.18);
    ctx.lineTo(shipW * 0.44, shipH * 0.26);
    ctx.lineTo(shipW * 0.16, shipH * 0.14);
    ctx.lineTo(-shipW * 0.16, shipH * 0.14);
    ctx.lineTo(-shipW * 0.44, shipH * 0.26);
    ctx.lineTo(-shipW * 0.52, -shipH * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Neon Circuit Trim Lines along the Wings
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = Math.max(1.5, 2.4 * scale);
    ctx.beginPath();
    ctx.moveTo(0, -shipH * 0.85);
    ctx.lineTo(shipW * 0.35, -shipH * 0.20);
    ctx.lineTo(shipW * 0.25, shipH * 0.12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -shipH * 0.85);
    ctx.lineTo(-shipW * 0.35, -shipH * 0.20);
    ctx.lineTo(-shipW * 0.25, shipH * 0.12);
    ctx.stroke();

    // 6. High-Tech Cockpit & Pilot Helmet Visor
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -shipH * 0.76);
    ctx.lineTo(shipW * 0.16, -shipH * 0.26);
    ctx.lineTo(shipW * 0.12, 0);
    ctx.lineTo(-shipW * 0.12, 0);
    ctx.lineTo(-shipW * 0.16, -shipH * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0a0d14';
    ctx.beginPath();
    ctx.moveTo(0, -shipH * 0.65);
    ctx.lineTo(shipW * 0.11, -shipH * 0.28);
    ctx.lineTo(-shipW * 0.11, -shipH * 0.28);
    ctx.closePath();
    ctx.fill();

    // Pilot Gold Visor Glint
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.ellipse(0, -shipH * 0.42, 6 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 7. Shield Energy Aura during Nitro Boost
    if (isAccelerated) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.arc(0, -shipH * 0.28, shipW * 0.68, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderCockpitOverlay(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.75)';
    ctx.lineWidth = 2;
    const cx = w / 2;
    const cy = h * 0.55;

    ctx.beginPath();
    ctx.moveTo(cx - 30, cy);
    ctx.lineTo(cx - 10, cy);
    ctx.moveTo(cx + 10, cy);
    ctx.lineTo(cx + 30, cy);
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy - 8);
    ctx.stroke();

    ctx.strokeStyle = this.isDrifting ? '#ff3e00' : 'rgba(255, 62, 0, 0.65)';
    ctx.strokeRect(cx - 40, cy - 40, 80, 80);
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
