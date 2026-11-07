/**
 * StuntController - Lightweight Quaternion-Based Visual Space Stunt Engine
 * Designed for peak 60+ FPS on low-end hardware (e.g. Celeron, potato machines, low-spec mobile).
 *
 * Core architectural principles:
 * 1. Zero Per-Frame Allocations: All internal vectors & quaternions are pre-allocated and reused.
 * 2. Visual Separation: Stunt rotations & jump elevation are strictly isolated on the visual mesh/sprite.
 *    Translation physics along the track is decoupled so spinning or tumbling the car never throws
 *    movement vectors off-track.
 * 3. Quaternion System: Pure 4-component quaternion representation (x, y, z, w) eliminates gimbal lock,
 *    allowing combined flips, barrel rolls, drifts, and air tilts to blend cleanly.
 * 4. Dual Animation Style:
 *    - 'arcade': Snappy, high-velocity rotation, suspension bounce on landing.
 *    - 'realistic': Smooth sinusoidal ease-in/ease-out acceleration and deceleration curves.
 */

export type StuntType = 'none' | 'barrel_roll_left' | 'barrel_roll_right' | 'front_flip' | 'backflip' | 'air_tilt' | 'drift';
export type StuntStyle = 'arcade' | 'realistic';

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface StuntTransform {
  height: number;
  quaternion: Quaternion;
  pitch: number;
  roll: number;
  yaw: number;
  airTilt: number;
  isAirborne: boolean;
  stuntName: string;
  stuntScore: number;
  bounceOffset: number;
  forwardScale: number; // 2.5D foreshortening factor for 3D flip projection
}

export class StuntController {
  // Jump & Vertical Dynamics (Lightweight 1D Integration)
  public height: number = 0;
  public verticalVel: number = 0;
  public gravity: number = 24.0;
  public jumpStrength: number = 7.5;
  public isAirborne: boolean = false;

  // Stunt Execution
  public currentStunt: StuntType = 'none';
  public stuntProgress: number = 0; // 0 to 1
  public stuntDuration: number = 0.52; // seconds
  public stuntScoreTotal: number = 0;
  public lastStuntName: string = '';
  public stuntDisplayTimer: number = 0;

  // Animation Style
  public style: StuntStyle = 'arcade';
  public suspensionBounce: number = 0;

  // Euler Angles (radians)
  public pitch: number = 0;
  public roll: number = 0;
  public yaw: number = 0;
  public airTilt: number = 0;

  // Pre-allocated internal scratch quaternions (Zero GC Garbage)
  private qCurrent: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
  private qPitch: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
  private qRoll: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
  private qYaw: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
  private qTemp: Quaternion = { x: 0, y: 0, z: 0, w: 1 };

  // Callbacks
  public onStuntTrigger: ((name: string) => void) | null = null;
  public onStuntLand: ((name: string, score: number) => void) | null = null;

  constructor(style: StuntStyle = 'arcade') {
    this.style = style;
  }

  public setStyle(style: StuntStyle) {
    this.style = style;
  }

  // ---------------------------------------------------------------------------
  // JUMP SYSTEM
  // ---------------------------------------------------------------------------
  /**
   * Manual jump triggered from player input (Space key / Boost button).
   * Only activates when the car is grounded.
   */
  public triggerJump(strengthMult: number = 1.0): boolean {
    if (!this.isAirborne && this.height <= 0.001) {
      this.isAirborne = true;
      this.verticalVel = this.jumpStrength * strengthMult;
      this.suspensionBounce = this.style === 'arcade' ? 0.22 : 0.12;
      if (this.onStuntTrigger) this.onStuntTrigger('SPACE JUMP');
      return true;
    }
    return false;
  }

  /**
   * Ramp launch triggered automatically when speeding over track crests / warp pads.
   */
  public triggerRampJump(boost: number = 1.35) {
    this.isAirborne = true;
    this.verticalVel = this.jumpStrength * boost;
    this.suspensionBounce = this.style === 'arcade' ? 0.30 : 0.18;
    if (this.onStuntTrigger) this.onStuntTrigger('RAMP LAUNCH');
  }

  // ---------------------------------------------------------------------------
  // STUNT INITIATION
  // ---------------------------------------------------------------------------
  public triggerStunt(type: StuntType): boolean {
    if (this.currentStunt !== 'none') {
      return false; // Already executing an aerial maneuver
    }

    if (!this.isAirborne) {
      // Auto-hop if triggered on the ground
      this.triggerJump(0.95);
    }

    this.currentStunt = type;
    this.stuntProgress = 0;
    this.stuntDuration = this.style === 'arcade' ? 0.48 : 0.72;

    let stuntName = '';
    switch (type) {
      case 'barrel_roll_left':
        stuntName = 'BARREL ROLL LEFT';
        break;
      case 'barrel_roll_right':
        stuntName = 'BARREL ROLL RIGHT';
        break;
      case 'front_flip':
        stuntName = 'FRONT FLIP 360°';
        break;
      case 'backflip':
        stuntName = 'BACKFLIP 360°';
        break;
      case 'air_tilt':
        stuntName = 'AERO TILT';
        break;
      case 'drift':
        stuntName = 'SPACE DRIFT';
        break;
    }

    this.lastStuntName = stuntName;
    this.stuntDisplayTimer = 1.8;
    if (this.onStuntTrigger) this.onStuntTrigger(stuntName);
    return true;
  }

  /**
   * Air Control (A / D while airborne)
   */
  public applyAirTilt(tiltInput: number, dt: number) {
    if (this.isAirborne) {
      const targetTilt = tiltInput * 0.45;
      const rate = this.style === 'arcade' ? 12.0 : 6.0;
      this.airTilt += (targetTilt - this.airTilt) * dt * rate;
    } else {
      this.airTilt *= Math.max(0, 1 - dt * 10);
    }
  }

  // ---------------------------------------------------------------------------
  // QUATERNION MATH (ZERO ALLOCATIONS)
  // ---------------------------------------------------------------------------
  private setAxisAngle(q: Quaternion, ax: number, ay: number, az: number, rad: number) {
    const half = rad * 0.5;
    const s = Math.sin(half);
    q.x = ax * s;
    q.y = ay * s;
    q.z = az * s;
    q.w = Math.cos(half);
  }

  private multiplyQuat(out: Quaternion, a: Quaternion, b: Quaternion) {
    const ax = a.x, ay = a.y, az = a.z, aw = a.w;
    const bx = b.x, by = b.y, bz = b.z, bw = b.w;

    out.x = ax * bw + aw * bx + ay * bz - az * by;
    out.y = ay * bw + aw * by + az * bx - ax * bz;
    out.z = az * bw + aw * bz + ax * by - ay * bx;
    out.w = aw * bw - ax * bx - ay * by - az * bz;
  }

  /**
   * Updates stunt progress, jump elevation, and builds visual orientation quaternion.
   */
  public update(dt: number): StuntTransform {
    // 1. Jump Elevation & Gravity
    if (this.isAirborne) {
      this.height += this.verticalVel * dt * 45;
      this.verticalVel -= this.gravity * dt;

      if (this.height <= 0) {
        // Landing Event
        this.height = 0;
        this.verticalVel = 0;
        this.isAirborne = false;
        this.suspensionBounce = this.style === 'arcade' ? 0.38 : 0.20;

        let earnedScore = 0;
        if (this.currentStunt !== 'none') {
          earnedScore = this.currentStunt.includes('barrel') ? 500 : (this.currentStunt.includes('flip') ? 750 : 250);
          this.stuntScoreTotal += earnedScore;
          if (this.onStuntLand) this.onStuntLand(this.lastStuntName, earnedScore);
          this.currentStunt = 'none';
        }
      }
    } else {
      this.height = 0;
      this.verticalVel = 0;
    }

    // Suspension bounce recovery
    if (this.suspensionBounce > 0) {
      this.suspensionBounce = Math.max(0, this.suspensionBounce - dt * 3.0);
    }

    if (this.stuntDisplayTimer > 0) {
      this.stuntDisplayTimer -= dt;
    }

    // 2. Stunt Progress & Rotation Angles
    if (this.currentStunt !== 'none') {
      this.stuntProgress += dt / this.stuntDuration;
      const t = Math.min(1.0, this.stuntProgress);

      let angle = 0;
      if (this.style === 'arcade') {
        // Snappy arcade ease-out ramp
        angle = Math.sin(t * Math.PI * 0.5) * Math.PI * 2;
      } else {
        // Realistic smooth S-curve
        angle = (-Math.cos(t * Math.PI) * 0.5 + 0.5) * Math.PI * 2;
      }

      switch (this.currentStunt) {
        case 'barrel_roll_left':
          this.roll = -angle;
          this.pitch = 0;
          break;
        case 'barrel_roll_right':
          this.roll = angle;
          this.pitch = 0;
          break;
        case 'front_flip':
          this.pitch = -angle;
          this.roll = 0;
          break;
        case 'backflip':
          this.pitch = angle;
          this.roll = 0;
          break;
      }

      if (this.stuntProgress >= 1.0) {
        this.roll = 0;
        this.pitch = 0;
        if (!this.isAirborne) {
          this.currentStunt = 'none';
        }
      }
    } else {
      this.roll *= Math.max(0, 1 - dt * 14);
      this.pitch *= Math.max(0, 1 - dt * 14);
    }

    // 3. Build Stunt Orientation Quaternion (Roll * Pitch * Yaw)
    const effectiveRoll = this.roll + this.airTilt;
    this.setAxisAngle(this.qRoll, 0, 0, 1, effectiveRoll);
    this.setAxisAngle(this.qPitch, 1, 0, 0, this.pitch);
    this.setAxisAngle(this.qYaw, 0, 1, 0, this.yaw);

    this.multiplyQuat(this.qTemp, this.qPitch, this.qRoll);
    this.multiplyQuat(this.qCurrent, this.qYaw, this.qTemp);

    const forwardScale = Math.cos(this.pitch);

    return {
      height: this.height,
      quaternion: this.qCurrent,
      pitch: this.pitch,
      roll: effectiveRoll,
      yaw: this.yaw,
      airTilt: this.airTilt,
      isAirborne: this.isAirborne,
      stuntName: this.stuntDisplayTimer > 0 ? this.lastStuntName : '',
      stuntScore: this.stuntScoreTotal,
      bounceOffset: Math.sin(performance.now() * 0.03) * this.suspensionBounce * 6,
      forwardScale,
    };
  }

  public reset() {
    this.height = 0;
    this.verticalVel = 0;
    this.isAirborne = false;
    this.pitch = 0;
    this.roll = 0;
    this.airTilt = 0;
    this.yaw = 0;
    this.currentStunt = 'none';
    this.stuntProgress = 0;
    this.stuntScoreTotal = 0;
    this.suspensionBounce = 0;
    this.stuntDisplayTimer = 0;
    this.qCurrent = { x: 0, y: 0, z: 0, w: 1 };
  }
}
