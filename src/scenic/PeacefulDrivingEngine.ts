import * as THREE from 'three';
import { AnimeSky3D, TimeOfDay, SKY_PALETTES } from './AnimeSky3D';
import { RealisticJapaneseCoupe } from './RealisticJapaneseCoupe';
import { FancyVehicleBuilder, VehicleType, VEHICLE_SPECS } from './FancyVehicles';
import { CarControls } from './CarModel3D';
import { RealisticScenicWorld } from './RealisticScenicWorld';
import { AudioEnvironment } from './AudioEnvironment';
import { getRoadSpline } from './HighwaySpline';
import { GTAStyleMiniMap } from './GTAStyleMiniMap';
import { getDistrictAtZ, TOTAL_MAP_LENGTH } from './DedicatedCityMap';
import { getVeloraDistrictByCoords, DistrictDefinition } from './VeloraWorldData';
import { VeloraMapHUD } from './VeloraMapHUD';

export type CameraViewMode = 'chase' | 'cockpit' | 'hood' | 'drone';

export interface DrivingTelemetry {
  speedKmh: number;
  rpm: number;
  gear: number;
  locationName: string;
  japaneseTitle: string;
  timeString: string;
  theme: string;
  autoCruise: boolean;
  cameraMode: CameraViewMode;
  headlights: 'off' | 'low' | 'high';
  wipers: 'off' | 'low' | 'high';
  turnSignal: 'none' | 'left' | 'right' | 'hazard';
  damagePercent: number;
  vehicleType: VehicleType;
  timeOfDay: TimeOfDay;
  isRaining: boolean;
  isBoosting: boolean;
}

export class PeacefulDrivingEngine {
  private container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Subsystems
  public skybox: AnimeSky3D;
  public car: RealisticJapaneseCoupe;
  public currentVehicleMesh: THREE.Group;
  public currentVehicleType: VehicleType = 'coupe';
  public world: RealisticScenicWorld;
  public audio: AudioEnvironment;
  public miniMap: GTAStyleMiniMap;
  public mapHUD: VeloraMapHUD;

  // Lighting
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;

  // Car Motion State
  public carPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public carHeading: number = 0; // heading angle in radians
  public lateralOffset: number = 0; // offset from road center (-5.5 to +5.5)
  public speedKmh: number = 80;
  public currentTheme: string = 'sunset';
  public autoCruise: boolean = false;
  public cameraMode: CameraViewMode = 'chase';
  public isBoosting: boolean = false;
  private boostParticles: THREE.Points;

  // Controls
  public controls: CarControls = {
    throttle: 0,
    brake: 0,
    steer: 0,
    headlights: 'low',
    wipers: 'off',
    turnSignal: 'none',
  };

  private keyState: Record<string, boolean> = {};

  // Camera tracking
  private cameraLookTarget: THREE.Vector3 = new THREE.Vector3();
  private droneAngle: number = 0;
  private cameraShake: number = 0;

  // Animation loop
  private lastTime: number = performance.now();
  private animFrameId: number | null = null;
  public onTelemetryUpdate: ((telemetry: DrivingTelemetry) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY_PALETTES.sunset.midColor);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.container.appendChild(this.renderer.domElement);

    // 2. Camera with 60% Sky / 40% Road Framing
    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      1600
    );

    // 3. Lighting Rig matching Sunset initially
    this.ambientLight = new THREE.AmbientLight(0xf472b6, 1.1);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfb923c, 1.5);
    this.dirLight.position.set(80, 120, -100);
    this.scene.add(this.dirLight);

    // 4. Subsystems
    this.skybox = new AnimeSky3D();
    this.scene.add(this.skybox.group);

    // Primary player coupe
    this.car = new RealisticJapaneseCoupe();
    this.currentVehicleMesh = this.car.group;
    this.scene.add(this.currentVehicleMesh);

    // Nitrous exhaust flame particles
    this.boostParticles = this.createBoostFlameParticles();
    this.currentVehicleMesh.add(this.boostParticles);

    // Dedicated Curated World (2400m circuit)
    this.world = new RealisticScenicWorld();
    this.scene.add(this.world.group);

    this.audio = new AudioEnvironment();
    this.miniMap = new GTAStyleMiniMap();
    this.mapHUD = new VeloraMapHUD(this);

    // Attach rain lens mesh to camera
    const lensMesh = this.world.rainSystem.getLensMesh();
    this.camera.add(lensMesh);
    this.scene.add(this.camera);

    this.setupEventListeners();
    this.startLoop();
  }

  private createBoostFlameParticles(): THREE.Points {
    const geo = new THREE.BufferGeometry();
    const count = 30;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 1] = 0.22 + (Math.random() - 0.5) * 0.15;
      pos[i * 3 + 2] = -2.2 - Math.random() * 1.5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.65,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  /**
   * Switches the player's active vehicle (Coupe, F1 Racer, Rolls-Royce)
   */
  public setVehicle(type: VehicleType) {
    if (this.currentVehicleType === type) return;
    this.currentVehicleType = type;

    // Remove old mesh
    this.scene.remove(this.currentVehicleMesh);

    if (type === 'f1') {
      this.currentVehicleMesh = FancyVehicleBuilder.createF1Car(0xdc2626);
    } else if (type === 'rolls') {
      this.currentVehicleMesh = FancyVehicleBuilder.createRollsRoyce(0x0f172a, 0xf8fafc);
    } else {
      this.currentVehicleMesh = this.car.group;
    }

    this.currentVehicleMesh.add(this.boostParticles);
    this.scene.add(this.currentVehicleMesh);
    this.audio.playRepairSound();
  }

  /**
   * Sets Time of Day (day, sunset, night) and updates lighting
   */
  public setTimeOfDay(time: TimeOfDay) {
    this.currentTheme = time;
    this.skybox.setTimeOfDay(time);
    const p = SKY_PALETTES[time];

    this.scene.background = new THREE.Color(p.midColor);

    this.ambientLight.color.setHex(p.ambientLightColor);
    this.ambientLight.intensity = p.ambientLightIntensity;

    this.dirLight.color.setHex(p.dirLightColor);
    this.dirLight.intensity = p.dirLightIntensity;
  }

  /**
   * Toggles dynamic rain weather on/off
   */
  public toggleRain(): boolean {
    const next = !this.world.isRaining;
    this.world.setRainActive(next);
    if (next) {
      this.controls.wipers = 'low';
    } else {
      this.controls.wipers = 'off';
    }
    return next;
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => this.onResize());

    window.addEventListener('keydown', (e) => {
      this.keyState[e.code] = true;

      // Camera views (1, 2, 3, 4)
      if (e.code === 'Digit1') this.cameraMode = 'chase';
      if (e.code === 'Digit2') this.cameraMode = 'cockpit';
      if (e.code === 'Digit3') this.cameraMode = 'hood';
      if (e.code === 'Digit4') this.cameraMode = 'drone';

      // Quick Vehicle Switch shortcuts: [KeyV] cycles vehicle!
      if (e.code === 'KeyV') {
        if (this.currentVehicleType === 'coupe') this.setVehicle('f1');
        else if (this.currentVehicleType === 'f1') this.setVehicle('rolls');
        else this.setVehicle('coupe');
      }

      // Time of Day shortcuts: [KeyT] cycles Day -> Sunset -> Night!
      if (e.code === 'KeyT') {
        if (this.skybox.currentTime === 'day') this.setTimeOfDay('sunset');
        else if (this.skybox.currentTime === 'sunset') this.setTimeOfDay('night');
        else this.setTimeOfDay('day');
      }

      // Auto-cruise ('P')
      if (e.code === 'KeyP') this.toggleAutoCruise();

      // Quick Repair ('R')
      if (e.code === 'KeyR') this.repairVehicle();

      // Headlights ('H')
      if (e.code === 'KeyH') this.cycleHeadlights();

      // Wipers ('X')
      if (e.code === 'KeyX') this.cycleWipers();

      // Turn signals ('Q' / 'E')
      if (e.code === 'KeyQ') this.toggleTurnSignal('left');
      if (e.code === 'KeyE') this.toggleTurnSignal('right');

      this.audio.init();
    });

    window.addEventListener('keyup', (e) => {
      this.keyState[e.code] = false;
    });

    window.addEventListener('pointerdown', () => {
      this.audio.init();
    });
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  }

  public toggleAutoCruise(): boolean {
    this.autoCruise = !this.autoCruise;
    return this.autoCruise;
  }

  public setCameraMode(mode: CameraViewMode) {
    this.cameraMode = mode;
  }

  public cycleHeadlights(): 'off' | 'low' | 'high' {
    if (this.controls.headlights === 'off') this.controls.headlights = 'low';
    else if (this.controls.headlights === 'low') this.controls.headlights = 'high';
    else this.controls.headlights = 'off';
    return this.controls.headlights;
  }

  public cycleWipers(): 'off' | 'low' | 'high' {
    if (this.controls.wipers === 'off') {
      this.controls.wipers = 'low';
      this.audio.playWiperSweep();
    } else if (this.controls.wipers === 'low') {
      this.controls.wipers = 'high';
      this.audio.playWiperSweep();
    } else {
      this.controls.wipers = 'off';
    }
    return this.controls.wipers;
  }

  public toggleTurnSignal(sig: 'left' | 'right' | 'hazard'): 'none' | 'left' | 'right' | 'hazard' {
    if (this.controls.turnSignal === sig) {
      this.controls.turnSignal = 'none';
    } else {
      this.controls.turnSignal = sig;
      this.audio.playTurnSignalClick();
    }
    return this.controls.turnSignal;
  }

  public repairVehicle() {
    this.car.repair();
    this.world.collisionSystem.resetDestroyedStructures();
    this.audio.playRepairSound();
  }

  private startLoop() {
    const loop = (time: number) => {
      const delta = Math.min(0.06, (time - this.lastTime) / 1000);
      this.lastTime = time;

      this.updatePhysics(delta);

      // Traffic Collision Checks
      const collision = this.world.trafficManager.update(delta, this.carPos, this.speedKmh);
      if (collision.hasCrash) {
        this.speedKmh *= collision.speedPenalty;
        this.lateralOffset += collision.impulseX * delta;
        this.cameraShake = Math.min(1.0, 0.45 + collision.damage * 0.015);
        this.car.applyCrashDamage(collision.damage);
        this.audio.playCrashClashSound();
      }

      this.updateCamera(delta);

      // Subsystems
      const wipersActive = this.controls.wipers !== 'off';
      this.car.update(delta, this.controls, this.speedKmh, this.controls.brake > 0.1);
      this.world.update(delta, this.carPos, wipersActive);
      this.skybox.update(delta, this.camera.position);

      const specs = VEHICLE_SPECS[this.currentVehicleType];
      this.audio.updateCarEngine(this.speedKmh * specs.engineTone, this.controls.throttle + (this.isBoosting ? 0.6 : 0));

      // GTA Mini-Map Radar Update
      this.miniMap.render(this.carPos, this.carHeading, this.speedKmh, this.world.trafficManager.cars);

      // Render
      this.renderer.render(this.scene, this.camera);

      // Telemetry (Active district from 16-district Velora grid)
      const currentDistrict = getVeloraDistrictByCoords(this.carPos.x, this.carPos.z);
      if (this.onTelemetryUpdate) {
        this.onTelemetryUpdate({
          speedKmh: Math.round(this.speedKmh),
          rpm: Math.round(this.car.rpm),
          gear: Math.min(6, Math.max(1, Math.floor(this.speedKmh / 38) + 1)),
          locationName: currentDistrict.name,
          japaneseTitle: currentDistrict.japanese,
          timeString: this.skybox.currentTime === 'day' ? '12:45 PM' : this.skybox.currentTime === 'sunset' ? '18:30 PM' : '23:15 PM',
          theme: this.skybox.currentTime,
          autoCruise: this.autoCruise,
          cameraMode: this.cameraMode,
          headlights: this.controls.headlights,
          wipers: this.controls.wipers,
          turnSignal: this.controls.turnSignal,
          damagePercent: Math.round(this.car.damagePercent),
          vehicleType: this.currentVehicleType,
          timeOfDay: this.skybox.currentTime,
          isRaining: this.world.isRaining,
          isBoosting: this.isBoosting,
        });
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private updatePhysics(delta: number) {
    const specs = VEHICLE_SPECS[this.currentVehicleType];

    let targetThrottle = 0;
    let targetBrake = 0;
    let targetSteer = 0;

    if (this.keyState['KeyW'] || this.keyState['ArrowUp']) targetThrottle += 1;
    if (this.keyState['KeyS'] || this.keyState['ArrowDown']) targetBrake += 1;

    // Steering controls
    if (this.keyState['KeyD'] || this.keyState['ArrowRight']) targetSteer += 1;
    if (this.keyState['KeyA'] || this.keyState['ArrowLeft']) targetSteer -= 1;

    // Nitrous Boost (SPACE)
    this.isBoosting = Boolean(this.keyState['Space']);
    const boostMat = this.boostParticles.material as THREE.PointsMaterial;
    boostMat.opacity = this.isBoosting ? 0.95 : 0;

    // Zen Auto-Cruise
    if (this.autoCruise) {
      const cruiseTarget = 110;
      if (this.speedKmh < cruiseTarget) targetThrottle = 0.6;
      else if (this.speedKmh > cruiseTarget + 5) targetBrake = 0.25;
      targetSteer = Math.max(-0.35, Math.min(0.35, this.lateralOffset * 0.4));
    }

    this.controls.throttle = THREE.MathUtils.lerp(this.controls.throttle, targetThrottle, delta * 10);
    this.controls.brake = THREE.MathUtils.lerp(this.controls.brake, targetBrake, delta * 12);
    this.controls.steer = THREE.MathUtils.lerp(this.controls.steer, targetSteer, delta * 8);

    // Punchy, thrilling acceleration & fast driving
    const effectiveMax = this.isBoosting ? specs.maxSpeed * 1.25 : specs.maxSpeed;
    const effectiveAccel = this.isBoosting ? specs.accelRate * 1.9 : specs.accelRate;

    if (this.controls.throttle > 0.05) {
      this.speedKmh += this.controls.throttle * effectiveAccel * delta;
      if (this.speedKmh > effectiveMax) this.speedKmh = effectiveMax;
    } else {
      this.speedKmh -= 4.2 * delta;
    }

    if (this.controls.brake > 0.05) {
      this.speedKmh -= this.controls.brake * 65 * delta;
    }

    if (this.speedKmh < 0) this.speedKmh = 0;

    // Steering rotation (Correct natural orientation: Left turns Left, Right turns Right)
    const speedRatio = Math.min(1.0, this.speedKmh / 20);
    this.carHeading -= this.controls.steer * 2.2 * specs.handling * speedRatio * delta;

    // Forward motion according to car heading across 4x4 KM Velora
    const forwardSpeed = (this.speedKmh / 3.6) * delta;
    this.carPos.x += Math.sin(this.carHeading) * forwardSpeed;
    this.carPos.z += Math.cos(this.carHeading) * forwardSpeed;

    // Physical 3D Building & Structure Collision Check (Solid Obstruction or Crash-Through Destruction)
    const buildingCrash = this.world.collisionSystem.checkAndResolveCollision(
      this.carPos,
      this.carHeading,
      this.speedKmh,
      delta,
      this.isBoosting
    );

    if (buildingCrash.hasCollision) {
      this.carPos.copy(buildingCrash.newPos);
      this.speedKmh = buildingCrash.newSpeed;
      if (buildingCrash.damage > 0) {
        this.car.applyCrashDamage(buildingCrash.damage);
        this.cameraShake = Math.max(this.cameraShake, buildingCrash.cameraShake);
        this.audio.playCrashClashSound();
      }
    }

    // Clamped to 4,000m x 4,000m Velora boundary (-1960 to 1960m)
    const mapLimit = 1960;
    if (this.carPos.x > mapLimit) {
      this.carPos.x = mapLimit;
      this.speedKmh *= 0.85;
    } else if (this.carPos.x < -mapLimit) {
      this.carPos.x = -mapLimit;
      this.speedKmh *= 0.85;
    }

    if (this.carPos.z > mapLimit) {
      this.carPos.z = mapLimit;
      this.speedKmh *= 0.85;
    } else if (this.carPos.z < -mapLimit) {
      this.carPos.z = -mapLimit;
      this.speedKmh *= 0.85;
    }

    this.currentVehicleMesh.position.set(this.carPos.x, 0, this.carPos.z);
    this.currentVehicleMesh.rotation.y = this.carHeading;
  }

  private updateCamera(delta: number) {
    // Dynamic FOV speed expansion: 60° at low speed up to 85° at top speed with Nitro!
    const targetFov = 60 + (this.speedKmh / 280) * 25;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 7);
    this.camera.updateProjectionMatrix();

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);
    }
    const highSpeedShake = Math.max(0, (this.speedKmh - 120) / 200) * 0.08;
    const totalShake = this.cameraShake + highSpeedShake;
    const shakeOffsetX = (Math.random() - 0.5) * totalShake * 0.5;
    const shakeOffsetY = (Math.random() - 0.5) * totalShake * 0.5;

    const heading = this.carHeading;

    if (this.cameraMode === 'chase') {
      // 60% Sky / 40% Road & City: Camera placed low at y=2.0 and looking upward at y=3.7
      const followDist = 7.4 + (this.speedKmh / 200) * 2.2;
      const followHeight = 2.05;

      const targetCamPos = new THREE.Vector3(
        this.carPos.x - Math.sin(heading) * followDist + shakeOffsetX,
        followHeight + shakeOffsetY,
        this.carPos.z - Math.cos(heading) * followDist
      );
      this.camera.position.lerp(targetCamPos, delta * 9);

      const targetLook = new THREE.Vector3(
        this.carPos.x + Math.sin(heading) * 26,
        3.7,
        this.carPos.z + Math.cos(heading) * 26
      );
      this.cameraLookTarget.lerp(targetLook, delta * 9.5);
      this.camera.lookAt(this.cameraLookTarget);

    } else if (this.cameraMode === 'cockpit') {
      const eyePos = this.car.getCockpitCameraPosition();
      this.camera.position.copy(eyePos);
      const lookPos = new THREE.Vector3(
        this.carPos.x + Math.sin(heading) * 28 + 0.38,
        2.4,
        this.carPos.z + Math.cos(heading) * 28
      );
      this.camera.lookAt(lookPos);

    } else if (this.cameraMode === 'hood') {
      const hoodPos = this.car.getHoodCameraPosition();
      this.camera.position.copy(hoodPos);
      const lookPos = new THREE.Vector3(
        this.carPos.x + Math.sin(heading) * 32,
        2.0,
        this.carPos.z + Math.cos(heading) * 32
      );
      this.camera.lookAt(lookPos);

    } else if (this.cameraMode === 'drone') {
      this.droneAngle += delta * 0.28;
      const dist = 12.0;
      const height = 4.8;
      this.camera.position.set(
        this.carPos.x + Math.sin(this.droneAngle) * dist,
        height,
        this.carPos.z + Math.cos(this.droneAngle) * dist
      );
      this.camera.lookAt(this.carPos.x, 1.8, this.carPos.z);
    }
  }

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
