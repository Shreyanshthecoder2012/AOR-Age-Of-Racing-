import * as THREE from 'three';
import { CarControls } from './CarModel3D';

/**
 * CarModelLightweight - Ultra-lightweight 3D Japanese Sports Coupe
 * Optimized with minimal draw calls and fake-projected light cones
 * for 60+ FPS on low-end hardware.
 */
export class CarModelLightweight {
  public group: THREE.Group;
  public interiorGroup: THREE.Group;
  public exteriorGroup: THREE.Group;

  // Wheels
  private wheelFL: THREE.Mesh;
  private wheelFR: THREE.Mesh;
  private wheelRL: THREE.Mesh;
  private wheelRR: THREE.Mesh;

  // Lights & Projection
  private headLightBeamMesh: THREE.Mesh;
  private tailLightMesh: THREE.Mesh;
  private turnSignalMeshL: THREE.Mesh;
  private turnSignalMeshR: THREE.Mesh;

  // Windshield Wipers
  private wiperL: THREE.Mesh;
  private wiperR: THREE.Mesh;
  private wiperAngle: number = 0;

  // Interior elements
  private steeringWheel: THREE.Mesh;

  // Dynamics
  public speedKmh: number = 0;
  public rpm: number = 800;
  public steerAngle: number = 0;
  private blinkerTimer: number = 0;
  private blinkerState: boolean = false;
  private bodyRoll: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.exteriorGroup = new THREE.Group();
    this.interiorGroup = new THREE.Group();
    this.group.add(this.exteriorGroup);
    this.group.add(this.interiorGroup);

    // Shared lightweight materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.3,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.8,
    });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const tireMat = new THREE.MeshBasicMaterial({ color: 0x27272a });

    // 1. Lower Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.44, 4.2), bodyMat);
    chassis.position.y = 0.44;
    this.exteriorGroup.add(chassis);

    // Front Bumper Lip
    const lip = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.22, 0.5), blackMat);
    lip.position.set(0, 0.24, 2.05);
    this.exteriorGroup.add(lip);

    // Cabin Roof & Windows
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.56, 1.9), glassMat);
    cabin.position.set(0, 0.94, -0.2);
    this.exteriorGroup.add(cabin);

    // Roof cap
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.08, 1.4), bodyMat);
    roof.position.set(0, 1.24, -0.2);
    this.exteriorGroup.add(roof);

    // Ducktail Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.08, 0.25), blackMat);
    spoiler.position.set(0, 0.72, -2.05);
    this.exteriorGroup.add(spoiler);

    // 2. Wheels
    const wGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
    wGeo.rotateZ(Math.PI / 2);

    this.wheelFL = new THREE.Mesh(wGeo, tireMat);
    this.wheelFL.position.set(-0.88, 0.32, 1.35);
    this.exteriorGroup.add(this.wheelFL);

    this.wheelFR = new THREE.Mesh(wGeo, tireMat);
    this.wheelFR.position.set(0.88, 0.32, 1.35);
    this.exteriorGroup.add(this.wheelFR);

    this.wheelRL = new THREE.Mesh(wGeo, tireMat);
    this.wheelRL.position.set(-0.88, 0.32, -1.35);
    this.exteriorGroup.add(this.wheelRL);

    this.wheelRR = new THREE.Mesh(wGeo, tireMat);
    this.wheelRR.position.set(0.88, 0.32, -1.35);
    this.exteriorGroup.add(this.wheelRR);

    // 3. Fake Projected Headlight Beam Cone (Ultra lightweight, zero GPU cost!)
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 128;
    beamCanvas.height = 256;
    const ctx = beamCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(64, 0, 64, 256);
    grad.addColorStop(0, 'rgba(255, 250, 230, 0.85)');
    grad.addColorStop(0.3, 'rgba(255, 240, 180, 0.45)');
    grad.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(35, 0);
    ctx.lineTo(93, 0);
    ctx.lineTo(128, 256);
    ctx.lineTo(0, 256);
    ctx.closePath();
    ctx.fill();

    const beamTex = new THREE.CanvasTexture(beamCanvas);
    const beamMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const beamGeo = new THREE.PlaneGeometry(8.5, 38);
    this.headLightBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.headLightBeamMesh.rotation.x = -Math.PI / 2;
    this.headLightBeamMesh.position.set(0, 0.08, 20);
    this.group.add(this.headLightBeamMesh);

    // 4. Taillights Bar
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.tailLightMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.05), tailMat);
    this.tailLightMesh.position.set(0, 0.62, -2.12);
    this.exteriorGroup.add(this.tailLightMesh);

    // Turn Signals
    const amberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.turnSignalMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), amberMat);
    this.turnSignalMeshL.position.set(-0.82, 0.62, 2.1);
    this.exteriorGroup.add(this.turnSignalMeshL);

    this.turnSignalMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), amberMat);
    this.turnSignalMeshR.position.set(0.82, 0.62, 2.1);
    this.exteriorGroup.add(this.turnSignalMeshR);

    // 5. Windshield Wipers
    const wiperMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const wiperGeo = new THREE.BoxGeometry(0.02, 0.02, 0.45);

    this.wiperL = new THREE.Mesh(wiperGeo, wiperMat);
    this.wiperL.position.set(-0.35, 0.72, 0.82);
    this.wiperL.rotation.x = -0.62;
    this.exteriorGroup.add(this.wiperL);

    this.wiperR = new THREE.Mesh(wiperGeo, wiperMat);
    this.wiperR.position.set(0.35, 0.72, 0.82);
    this.wiperR.rotation.x = -0.62;
    this.exteriorGroup.add(this.wiperR);

    // 6. Interior Dashboard & Steering Wheel
    const swGeo = new THREE.TorusGeometry(0.16, 0.02, 8, 16);
    this.steeringWheel = new THREE.Mesh(swGeo, blackMat);
    this.steeringWheel.position.set(0.38, 0.82, 0.24);
    this.steeringWheel.rotation.x = 0.45;
    this.interiorGroup.add(this.steeringWheel);

    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), blackMat);
    dash.position.set(0, 0.72, 0.45);
    this.interiorGroup.add(dash);
  }

  public update(delta: number, controls: CarControls, speedKmh: number, isBraking: boolean) {
    this.speedKmh = speedKmh;
    this.rpm = 850 + (speedKmh % 30) / 30 * 4200 + (controls.throttle * 800);

    // Wheel spin
    const rot = (speedKmh / 3.6) * delta / 0.32;
    this.wheelFL.rotation.x += rot;
    this.wheelFR.rotation.x += rot;
    this.wheelRL.rotation.x += rot;
    this.wheelRR.rotation.x += rot;

    // Steering
    const targetSteer = controls.steer * 0.45;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, delta * 12);
    this.wheelFL.rotation.y = this.steerAngle;
    this.wheelFR.rotation.y = this.steerAngle;
    this.steeringWheel.rotation.z = -this.steerAngle * 2.8;

    // Headlight beam visibility
    if (controls.headlights === 'off') {
      this.headLightBeamMesh.visible = false;
    } else {
      this.headLightBeamMesh.visible = true;
      (this.headLightBeamMesh.material as THREE.MeshBasicMaterial).opacity =
        controls.headlights === 'high' ? 0.9 : 0.55;
    }

    // Taillights brake glow
    if (isBraking || controls.brake > 0.05) {
      (this.tailLightMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      this.tailLightMesh.scale.set(1.15, 1.3, 1.0);
    } else {
      (this.tailLightMesh.material as THREE.MeshBasicMaterial).color.setHex(0x991b1b);
      this.tailLightMesh.scale.set(1.0, 1.0, 1.0);
    }

    // Blinker flash
    this.blinkerTimer += delta;
    if (this.blinkerTimer >= 0.38) {
      this.blinkerTimer = 0;
      this.blinkerState = !this.blinkerState;
    }

    const showL = this.blinkerState && (controls.turnSignal === 'left' || controls.turnSignal === 'hazard');
    const showR = this.blinkerState && (controls.turnSignal === 'right' || controls.turnSignal === 'hazard');

    (this.turnSignalMeshL.material as THREE.MeshBasicMaterial).color.setHex(showL ? 0xfbbf24 : 0x78350f);
    (this.turnSignalMeshR.material as THREE.MeshBasicMaterial).color.setHex(showR ? 0xfbbf24 : 0x78350f);

    // Wiper sweep
    if (controls.wipers !== 'off') {
      const freq = controls.wipers === 'high' ? 7.5 : 4.0;
      this.wiperAngle += delta * freq;
      const sweep = Math.sin(this.wiperAngle) * 0.7;
      this.wiperL.rotation.z = sweep;
      this.wiperR.rotation.z = sweep;
    } else {
      this.wiperL.rotation.z = 0;
      this.wiperR.rotation.z = 0;
    }

    // Body roll
    const targetRoll = -this.steerAngle * (speedKmh / 120) * 0.08;
    this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, targetRoll, delta * 8);
    this.exteriorGroup.rotation.z = this.bodyRoll;
    this.interiorGroup.rotation.z = this.bodyRoll;
  }

  public getCockpitCameraPosition(): THREE.Vector3 {
    return this.group.localToWorld(new THREE.Vector3(0.38, 1.04, -0.15));
  }

  public getHoodCameraPosition(): THREE.Vector3 {
    return this.group.localToWorld(new THREE.Vector3(0, 0.75, 1.8));
  }
}
