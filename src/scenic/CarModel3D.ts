import * as THREE from 'three';

export interface CarControls {
  throttle: number;   // 0 to 1
  brake: number;      // 0 to 1
  steer: number;      // -1 to 1
  headlights: 'off' | 'low' | 'high';
  wipers: 'off' | 'low' | 'high';
  turnSignal: 'none' | 'left' | 'right' | 'hazard';
}

export class CarModel3D {
  public group: THREE.Group;
  public interiorGroup: THREE.Group;
  public exteriorGroup: THREE.Group;

  // Wheel meshes for rotation & steering
  private wheelFL: THREE.Group;
  private wheelFR: THREE.Group;
  private wheelRL: THREE.Group;
  private wheelRR: THREE.Group;

  // Steering wheel & dashboard
  private steeringWheel: THREE.Group;
  private speedoNeedle: THREE.Mesh;
  private rpmNeedle: THREE.Mesh;

  // Lights
  public headLightLeft: THREE.SpotLight;
  public headLightRight: THREE.SpotLight;
  private headLightLeftTarget: THREE.Object3D;
  private headLightRightTarget: THREE.Object3D;
  private headLightLeftMesh: THREE.Mesh;
  private headLightRightMesh: THREE.Mesh;
  private tailLightLeftMesh: THREE.Mesh;
  private tailLightRightMesh: THREE.Mesh;
  private turnSignals: { mesh: THREE.Mesh; side: 'left' | 'right' }[] = [];

  // Windshield wipers
  private wiperLeft: THREE.Group;
  private wiperRight: THREE.Group;
  private wiperAngle: number = 0;
  private wiperSpeed: number = 0;

  // Dynamics & states
  public speedKmh: number = 0;
  public rpm: number = 800;
  public steerAngle: number = 0;
  private blinkerTimer: number = 0;
  private blinkerState: boolean = false;
  private bodyRoll: number = 0;
  private bodyPitch: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.exteriorGroup = new THREE.Group();
    this.interiorGroup = new THREE.Group();
    this.group.add(this.exteriorGroup);
    this.group.add(this.interiorGroup);

    // 1. Build Car Body Materials
    const bodyPaintMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,        // Pure pearl white anime hero coupe
      roughness: 0.22,
      metalness: 0.45,
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.7,
      metalness: 0.1,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x101a24,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
    });

    // 2. Chassis / Main Lower Body
    const chassisGeo = new THREE.BoxGeometry(1.82, 0.46, 4.3);
    const chassisMesh = new THREE.Mesh(chassisGeo, bodyPaintMat);
    chassisMesh.position.y = 0.45;
    this.exteriorGroup.add(chassisMesh);

    // Front Bumper / Air Dam
    const bumperGeo = new THREE.BoxGeometry(1.8, 0.32, 0.6);
    const bumperMesh = new THREE.Mesh(bumperGeo, blackTrimMat);
    bumperMesh.position.set(0, 0.25, 2.1);
    this.exteriorGroup.add(bumperMesh);

    // Hood Slope
    const hoodGeo = new THREE.BoxGeometry(1.76, 0.18, 1.35);
    const hoodMesh = new THREE.Mesh(hoodGeo, bodyPaintMat);
    hoodMesh.position.set(0, 0.64, 1.25);
    hoodMesh.rotation.x = 0.05;
    this.exteriorGroup.add(hoodMesh);

    // Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(1.58, 0.62, 1.95);
    const cabinMesh = new THREE.Mesh(cabinGeo, bodyPaintMat);
    cabinMesh.position.set(0, 0.98, -0.22);
    this.exteriorGroup.add(cabinMesh);

    // Windshield (Front Glass)
    const windshieldGeo = new THREE.PlaneGeometry(1.48, 0.68);
    const windshieldMesh = new THREE.Mesh(windshieldGeo, glassMat);
    windshieldMesh.position.set(0, 0.98, 0.82);
    windshieldMesh.rotation.x = -0.62;
    this.exteriorGroup.add(windshieldMesh);

    // Rear Window Glass
    const rearGlassGeo = new THREE.PlaneGeometry(1.48, 0.62);
    const rearGlassMesh = new THREE.Mesh(rearGlassGeo, glassMat);
    rearGlassMesh.position.set(0, 0.96, -1.24);
    rearGlassMesh.rotation.x = 0.58;
    this.exteriorGroup.add(rearGlassMesh);

    // Side Windows
    const sideGlassGeo = new THREE.PlaneGeometry(1.55, 0.42);
    const leftWindow = new THREE.Mesh(sideGlassGeo, glassMat);
    leftWindow.position.set(-0.80, 0.96, -0.2);
    leftWindow.rotation.y = -Math.PI / 2;
    this.exteriorGroup.add(leftWindow);

    const rightWindow = leftWindow.clone();
    rightWindow.position.x = 0.80;
    rightWindow.rotation.y = Math.PI / 2;
    this.exteriorGroup.add(rightWindow);

    // Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.18, 0.1, 0.14);
    const leftMirror = new THREE.Mesh(mirrorGeo, blackTrimMat);
    leftMirror.position.set(-0.95, 0.88, 0.6);
    this.exteriorGroup.add(leftMirror);

    const rightMirror = leftMirror.clone();
    rightMirror.position.x = 0.95;
    this.exteriorGroup.add(rightMirror);

    // Rear Ducktail / Lip Spoiler
    const spoilerGeo = new THREE.BoxGeometry(1.72, 0.1, 0.28);
    const spoilerMesh = new THREE.Mesh(spoilerGeo, blackTrimMat);
    spoilerMesh.position.set(0, 0.74, -2.12);
    spoilerMesh.rotation.x = -0.15;
    this.exteriorGroup.add(spoilerMesh);

    // Exhaust Pipe with Chrome Finish
    const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16);
    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.9,
      roughness: 0.2,
    });
    const exhaustMesh = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaustMesh.position.set(0.62, 0.2, -2.18);
    exhaustMesh.rotation.x = Math.PI / 2;
    this.exteriorGroup.add(exhaustMesh);

    // 3. 4 Wheels (Spin + Steering)
    this.wheelFL = this.createWheel();
    this.wheelFL.position.set(-0.88, 0.32, 1.35);
    this.exteriorGroup.add(this.wheelFL);

    this.wheelFR = this.createWheel();
    this.wheelFR.position.set(0.88, 0.32, 1.35);
    this.exteriorGroup.add(this.wheelFR);

    this.wheelRL = this.createWheel();
    this.wheelRL.position.set(-0.88, 0.32, -1.35);
    this.exteriorGroup.add(this.wheelRL);

    this.wheelRR = this.createWheel();
    this.wheelRR.position.set(0.88, 0.32, -1.35);
    this.exteriorGroup.add(this.wheelRR);

    // 4. Headlights (Meshes + Real Three.js SpotLights)
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const headLightGeo = new THREE.BoxGeometry(0.34, 0.14, 0.08);

    this.headLightLeftMesh = new THREE.Mesh(headLightGeo, headLightMat);
    this.headLightLeftMesh.position.set(-0.62, 0.62, 2.14);
    this.exteriorGroup.add(this.headLightLeftMesh);

    this.headLightRightMesh = new THREE.Mesh(headLightGeo, headLightMat);
    this.headLightRightMesh.position.set(0.62, 0.62, 2.14);
    this.exteriorGroup.add(this.headLightRightMesh);

    // SpotLights
    this.headLightLeft = new THREE.SpotLight(0xfffaed, 2.4, 70, Math.PI / 6, 0.35, 1.2);
    this.headLightLeft.position.set(-0.62, 0.62, 2.14);
    this.headLightLeftTarget = new THREE.Object3D();
    this.headLightLeftTarget.position.set(-0.62, 0.1, 35);
    this.group.add(this.headLightLeft);
    this.group.add(this.headLightLeftTarget);
    this.headLightLeft.target = this.headLightLeftTarget;

    this.headLightRight = new THREE.SpotLight(0xfffaed, 2.4, 70, Math.PI / 6, 0.35, 1.2);
    this.headLightRight.position.set(0.62, 0.62, 2.14);
    this.headLightRightTarget = new THREE.Object3D();
    this.headLightRightTarget.position.set(0.62, 0.1, 35);
    this.group.add(this.headLightRight);
    this.group.add(this.headLightRightTarget);
    this.headLightRight.target = this.headLightRightTarget;

    // 5. Taillights
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tailLightGeo = new THREE.BoxGeometry(0.38, 0.12, 0.08);

    this.tailLightLeftMesh = new THREE.Mesh(tailLightGeo, tailLightMat);
    this.tailLightLeftMesh.position.set(-0.62, 0.64, -2.14);
    this.exteriorGroup.add(this.tailLightLeftMesh);

    this.tailLightRightMesh = new THREE.Mesh(tailLightGeo, tailLightMat);
    this.tailLightRightMesh.position.set(0.62, 0.64, -2.14);
    this.exteriorGroup.add(this.tailLightRightMesh);

    // 6. Turn Signal Indicators (Amber corner markers)
    const amberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const signalGeo = new THREE.BoxGeometry(0.12, 0.08, 0.08);

    const sigFL = new THREE.Mesh(signalGeo, amberMat.clone());
    sigFL.position.set(-0.84, 0.62, 2.13);
    this.exteriorGroup.add(sigFL);
    this.turnSignals.push({ mesh: sigFL, side: 'left' });

    const sigFR = new THREE.Mesh(signalGeo, amberMat.clone());
    sigFR.position.set(0.84, 0.62, 2.13);
    this.exteriorGroup.add(sigFR);
    this.turnSignals.push({ mesh: sigFR, side: 'right' });

    const sigRL = new THREE.Mesh(signalGeo, amberMat.clone());
    sigRL.position.set(-0.84, 0.64, -2.13);
    this.exteriorGroup.add(sigRL);
    this.turnSignals.push({ mesh: sigRL, side: 'left' });

    const sigRR = new THREE.Mesh(signalGeo, amberMat.clone());
    sigRR.position.set(0.84, 0.64, -2.13);
    this.exteriorGroup.add(sigRR);
    this.turnSignals.push({ mesh: sigRR, side: 'right' });

    // 7. Windshield Wipers
    const wiperMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const wiperArmGeo = new THREE.BoxGeometry(0.03, 0.02, 0.42);

    this.wiperLeft = new THREE.Group();
    const wiperLeftBlade = new THREE.Mesh(wiperArmGeo, wiperMat);
    wiperLeftBlade.position.z = 0.21;
    this.wiperLeft.add(wiperLeftBlade);
    this.wiperLeft.position.set(-0.35, 0.72, 0.88);
    this.wiperLeft.rotation.x = -0.62;
    this.wiperLeft.rotation.y = 0.2;
    this.exteriorGroup.add(this.wiperLeft);

    this.wiperRight = new THREE.Group();
    const wiperRightBlade = new THREE.Mesh(wiperArmGeo, wiperMat);
    wiperRightBlade.position.z = 0.21;
    this.wiperRight.add(wiperRightBlade);
    this.wiperRight.position.set(0.35, 0.72, 0.88);
    this.wiperRight.rotation.x = -0.62;
    this.wiperRight.rotation.y = 0.2;
    this.exteriorGroup.add(this.wiperRight);

    // 8. Interior Cockpit Details (Driver's POV)
    const dashMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const dashMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.55), dashMat);
    dashMesh.position.set(0, 0.72, 0.45);
    this.interiorGroup.add(dashMesh);

    // Driver's Seat (Right Hand Drive for Japan!)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 });
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.55), seatMat);
    seatBase.position.set(0.38, 0.45, -0.2);
    this.interiorGroup.add(seatBase);

    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.15), seatMat);
    seatBack.position.set(0.38, 0.8, -0.45);
    seatBack.rotation.x = 0.15;
    this.interiorGroup.add(seatBack);

    // Passenger Seat (Left)
    const passSeatBase = seatBase.clone();
    passSeatBase.position.x = -0.38;
    this.interiorGroup.add(passSeatBase);

    const passSeatBack = seatBack.clone();
    passSeatBack.position.x = -0.38;
    this.interiorGroup.add(passSeatBack);

    // Japanese Right-Hand Drive Steering Wheel
    this.steeringWheel = this.createSteeringWheel();
    this.steeringWheel.position.set(0.38, 0.82, 0.24);
    this.steeringWheel.rotation.x = 0.45;
    this.interiorGroup.add(this.steeringWheel);

    // Instrument Cluster (Gauges)
    const gaugeCluster = this.createGauges();
    gaugeCluster.position.set(0.38, 0.85, 0.42);
    gaugeCluster.rotation.x = 0.3;
    this.interiorGroup.add(gaugeCluster);

    // Rearview Mirror
    const mirrorMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
    const rearMirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.03), mirrorMat);
    rearMirror.position.set(0, 1.15, 0.52);
    rearMirror.rotation.x = 0.1;
    this.interiorGroup.add(rearMirror);
  }

  private createWheel(): THREE.Group {
    const wheel = new THREE.Group();
    // Rubber tire
    const tireGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 24);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);

    // 8-Spoke Sport Rim (Gunmetal)
    const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.25, 16);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    // Center hub cap with gold lug nuts
    const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.26, 8);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.1 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);

    return wheel;
  }

  private createSteeringWheel(): THREE.Group {
    const sw = new THREE.Group();
    // Outer leather rim
    const torusGeo = new THREE.TorusGeometry(0.18, 0.024, 12, 24);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
    const rim = new THREE.Mesh(torusGeo, rimMat);
    sw.add(rim);

    // 3-Spoke center hub (Classic Japanese 90s sports wheel)
    const spokeMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7, roughness: 0.3 });
    const center = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), spokeMat);
    center.rotation.x = Math.PI / 2;
    sw.add(center);

    const spokeGeo = new THREE.BoxGeometry(0.02, 0.16, 0.015);
    const spoke1 = new THREE.Mesh(spokeGeo, spokeMat);
    spoke1.position.y = -0.07;
    sw.add(spoke1);

    const spoke2 = new THREE.Mesh(spokeGeo, spokeMat);
    spoke2.position.set(-0.07, 0.04, 0);
    spoke2.rotation.z = -Math.PI / 3;
    sw.add(spoke2);

    const spoke3 = new THREE.Mesh(spokeGeo, spokeMat);
    spoke3.position.set(0.07, 0.04, 0);
    spoke3.rotation.z = Math.PI / 3;
    sw.add(spoke3);

    return sw;
  }

  private createGauges(): THREE.Group {
    const cluster = new THREE.Group();
    // Backing panel
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.16, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x09090b })
    );
    cluster.add(panel);

    // Speedometer dial (Left)
    const dialMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const speedo = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), dialMat);
    speedo.position.set(-0.09, 0, 0.012);
    cluster.add(speedo);

    // Tachometer dial (Right)
    const tacho = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), dialMat);
    tacho.position.set(0.09, 0, 0.012);
    cluster.add(tacho);

    // Orange glowing needles
    const needleGeo = new THREE.BoxGeometry(0.006, 0.05, 0.005);
    needleGeo.translate(0, 0.025, 0);
    const needleMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    this.speedoNeedle = new THREE.Mesh(needleGeo, needleMat);
    this.speedoNeedle.position.set(-0.09, 0, 0.015);
    this.speedoNeedle.rotation.z = Math.PI * 0.75;
    cluster.add(this.speedoNeedle);

    this.rpmNeedle = new THREE.Mesh(needleGeo, needleMat);
    this.rpmNeedle.position.set(0.09, 0, 0.015);
    this.rpmNeedle.rotation.z = Math.PI * 0.75;
    cluster.add(this.rpmNeedle);

    return cluster;
  }

  public update(delta: number, controls: CarControls, speedKmh: number, isBraking: boolean) {
    this.speedKmh = speedKmh;
    // Calculate RPM proportional to speed (with 5-gear feel)
    const gear = Math.min(5, Math.max(1, Math.floor(speedKmh / 28) + 1));
    const speedInGear = (speedKmh % 28) / 28;
    this.rpm = 850 + speedInGear * 4200 + (controls.throttle * 900);

    // Animate wheels spin based on distance traveled
    const wheelRot = (speedKmh / 3.6) * delta / 0.33;
    this.wheelFL.children[0].rotation.x += wheelRot;
    this.wheelFR.children[0].rotation.x += wheelRot;
    this.wheelRL.children[0].rotation.x += wheelRot;
    this.wheelRR.children[0].rotation.x += wheelRot;

    // Steering wheel & front wheels turn angle
    const targetSteer = controls.steer * 0.48; // Max wheel steer rads
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, delta * 12);

    this.wheelFL.rotation.y = this.steerAngle;
    this.wheelFR.rotation.y = this.steerAngle;
    this.steeringWheel.rotation.z = -this.steerAngle * 2.8;

    // Dashboard needles
    // Speed: 0 to 180 km/h mapped to 135 deg to -135 deg
    const speedRatio = Math.min(1.0, speedKmh / 180);
    this.speedoNeedle.rotation.z = Math.PI * 0.75 - speedRatio * Math.PI * 1.5;

    const rpmRatio = Math.min(1.0, this.rpm / 7500);
    this.rpmNeedle.rotation.z = Math.PI * 0.75 - rpmRatio * Math.PI * 1.5;

    // Headlights control
    if (controls.headlights === 'off') {
      this.headLightLeft.intensity = 0;
      this.headLightRight.intensity = 0;
      (this.headLightLeftMesh.material as THREE.MeshBasicMaterial).color.setHex(0x333333);
      (this.headLightRightMesh.material as THREE.MeshBasicMaterial).color.setHex(0x333333);
    } else if (controls.headlights === 'low') {
      this.headLightLeft.intensity = 1.8;
      this.headLightRight.intensity = 1.8;
      this.headLightLeft.distance = 55;
      this.headLightRight.distance = 55;
      (this.headLightLeftMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      (this.headLightRightMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    } else {
      // High beam
      this.headLightLeft.intensity = 3.4;
      this.headLightRight.intensity = 3.4;
      this.headLightLeft.distance = 95;
      this.headLightRight.distance = 95;
      (this.headLightLeftMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      (this.headLightRightMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    }

    // Taillights brake glow
    if (isBraking || controls.brake > 0.05) {
      (this.tailLightLeftMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      (this.tailLightRightMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      this.tailLightLeftMesh.scale.set(1.2, 1.2, 1.0);
      this.tailLightRightMesh.scale.set(1.2, 1.2, 1.0);
    } else {
      (this.tailLightLeftMesh.material as THREE.MeshBasicMaterial).color.setHex(0x991b1b);
      (this.tailLightRightMesh.material as THREE.MeshBasicMaterial).color.setHex(0x991b1b);
      this.tailLightLeftMesh.scale.set(1.0, 1.0, 1.0);
      this.tailLightRightMesh.scale.set(1.0, 1.0, 1.0);
    }

    // Turn signals / hazard blinking
    this.blinkerTimer += delta;
    if (this.blinkerTimer >= 0.38) {
      this.blinkerTimer = 0;
      this.blinkerState = !this.blinkerState;
    }

    const showLeft = this.blinkerState && (controls.turnSignal === 'left' || controls.turnSignal === 'hazard');
    const showRight = this.blinkerState && (controls.turnSignal === 'right' || controls.turnSignal === 'hazard');

    for (const sig of this.turnSignals) {
      const active = sig.side === 'left' ? showLeft : showRight;
      (sig.mesh.material as THREE.MeshBasicMaterial).color.setHex(active ? 0xfbbf24 : 0x78350f);
    }

    // Windshield wipers sweep animation
    if (controls.wipers !== 'off') {
      const freq = controls.wipers === 'high' ? 7.5 : 4.0;
      this.wiperAngle += delta * freq;
      const sweep = Math.sin(this.wiperAngle) * 0.72;
      this.wiperLeft.rotation.z = sweep;
      this.wiperRight.rotation.z = sweep;
    } else {
      this.wiperLeft.rotation.z = THREE.MathUtils.lerp(this.wiperLeft.rotation.z, 0, delta * 6);
      this.wiperRight.rotation.z = THREE.MathUtils.lerp(this.wiperRight.rotation.z, 0, delta * 6);
    }

    // Body roll (lean into turns) & Body pitch (nose dip on brake, lift on throttle)
    const targetRoll = -this.steerAngle * (speedKmh / 120) * 0.12;
    this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, targetRoll, delta * 8);

    const targetPitch = (isBraking ? 0.04 : -controls.throttle * 0.02) * (speedKmh / 100);
    this.bodyPitch = THREE.MathUtils.lerp(this.bodyPitch, targetPitch, delta * 8);

    this.exteriorGroup.rotation.z = this.bodyRoll;
    this.exteriorGroup.rotation.x = this.bodyPitch;
    this.interiorGroup.rotation.z = this.bodyRoll;
    this.interiorGroup.rotation.x = this.bodyPitch;
  }

  public getCockpitCameraPosition(): THREE.Vector3 {
    // Driver's eye level (right hand side for Japanese cars)
    const local = new THREE.Vector3(0.38, 1.08, -0.15);
    return this.group.localToWorld(local);
  }

  public getHoodCameraPosition(): THREE.Vector3 {
    // Low hood perspective
    const local = new THREE.Vector3(0, 0.78, 1.8);
    return this.group.localToWorld(local);
  }
}
