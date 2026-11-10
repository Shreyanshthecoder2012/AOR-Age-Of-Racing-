import * as THREE from 'three';
import { CarControls } from './CarModel3D';

/**
 * RealisticJapaneseCoupe - High-fidelity Japanese sports coupe
 * with authentic GTA 5 style physical clash deformation, damage states,
 * and repair mechanics!
 *
 * Visual Damage Features:
 * - Crumpled & popped-open engine hood
 * - Dislodged, crooked front bumper
 * - Smashed / extinguished headlight
 * - Billowing radiator smoke & steam particles
 * - Spiderweb cracked windshield overlay
 * - Crash spark shower
 */
export class RealisticJapaneseCoupe {
  public group: THREE.Group;
  private chassisGroup: THREE.Group;

  // Parts for GTA 5 style deformation
  private hoodMesh: THREE.Mesh;
  private frontBumperMesh: THREE.Mesh;
  private windshieldCracksMesh: THREE.Mesh;
  private radiatorSmokeParticles: THREE.Points;
  private smokePositions: Float32Array;
  private smokeVelocities: Float32Array;
  private smokeCount = 35;

  // Wheels
  private wheelFL: THREE.Group;
  private wheelFR: THREE.Group;
  private wheelRL: THREE.Group;
  private wheelRR: THREE.Group;

  // Lights
  private headLightL: THREE.Mesh;
  private headLightR: THREE.Mesh;
  private tailLightBar: THREE.Mesh;
  private headLightCone: THREE.Mesh;
  private turnSignalL: THREE.Mesh;
  private turnSignalR: THREE.Mesh;

  // Windshield Wipers
  private wiperL: THREE.Mesh;
  private wiperR: THREE.Mesh;
  private wiperAngle: number = 0;

  // Damage & Mechanics (GTA 5 style)
  public damagePercent: number = 0; // 0 (pristine) to 100 (totaled)
  public isRepairing: boolean = false;
  private repairTimer: number = 0;

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
    this.chassisGroup = new THREE.Group();
    this.group.add(this.chassisGroup);

    // 1. Premium Materials
    const bodyPaintMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,       // Pure pearl white anime hero coupe
      roughness: 0.18,
      metalness: 0.45,
    });

    const bodyAccentMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,       // Two-tone black aero lower body
      roughness: 0.6,
      metalness: 0.2,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.6,
      transparent: true,
      opacity: 0.75,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.9,
    });

    // 2. Main Chassis Body
    // Lower body / fenders
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.42, 4.3), bodyPaintMat);
    lowerBody.position.y = 0.46;
    this.chassisGroup.add(lowerBody);

    // Aerodynamic black side skirts & front/rear lip
    const aeroLip = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.14, 4.34), bodyAccentMat);
    aeroLip.position.y = 0.26;
    this.chassisGroup.add(aeroLip);

    // Front Hood (Separate component that deforms / pops open when crashed!)
    this.hoodMesh = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.16, 1.4), bodyPaintMat);
    this.hoodMesh.position.set(0, 0.65, 1.25);
    this.hoodMesh.rotation.x = 0.06;
    this.chassisGroup.add(this.hoodMesh);

    // Front Bumper / Air Grille (Dislodges / tilts when crashed!)
    this.frontBumperMesh = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.28, 0.32), bodyPaintMat);
    this.frontBumperMesh.position.set(0, 0.36, 2.12);
    this.chassisGroup.add(this.frontBumperMesh);

    const grilleMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.08), grilleMat);
    grille.position.set(0, 0, 0.16);
    this.frontBumperMesh.add(grille);

    // Aerodynamic Cabin / Greenhouse
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.58, 2.0), glassMat);
    cabin.position.set(0, 0.96, -0.2);
    this.chassisGroup.add(cabin);

    // Sleek Roof Cap
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 1.45), bodyPaintMat);
    roof.position.set(0, 1.26, -0.2);
    this.chassisGroup.add(roof);

    // Windshield frame A-pillars
    const aPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.08), bodyPaintMat);
    aPillarL.position.set(-0.7, 0.96, 0.72);
    aPillarL.rotation.x = -0.55;
    this.chassisGroup.add(aPillarL);

    const aPillarR = aPillarL.clone();
    aPillarR.position.x = 0.7;
    this.chassisGroup.add(aPillarR);

    // Windshield Spiderweb Cracks Decal Mesh (Appears when heavily damaged)
    this.windshieldCracksMesh = this.createWindshieldCrackDecal();
    this.chassisGroup.add(this.windshieldCracksMesh);

    // Rear C-Pillars
    const cPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.08), bodyPaintMat);
    cPillarL.position.set(-0.7, 0.96, -1.1);
    cPillarL.rotation.x = 0.52;
    this.chassisGroup.add(cPillarL);

    const cPillarR = cPillarL.clone();
    cPillarR.position.x = 0.7;
    this.chassisGroup.add(cPillarR);

    // Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.18, 0.1, 0.12);
    const mirrorL = new THREE.Mesh(mirrorGeo, bodyAccentMat);
    mirrorL.position.set(-0.95, 0.88, 0.62);
    this.chassisGroup.add(mirrorL);

    const mirrorR = mirrorL.clone();
    mirrorR.position.x = 0.95;
    this.chassisGroup.add(mirrorR);

    // Ducktail Rear Lip Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.1, 0.28), bodyAccentMat);
    spoiler.position.set(0, 0.76, -2.12);
    spoiler.rotation.x = -0.15;
    this.chassisGroup.add(spoiler);

    // Dual Chrome Exhaust Tips
    const exhaustGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.35, 12);
    exhaustGeo.rotateX(Math.PI / 2);
    const exhaust1 = new THREE.Mesh(exhaustGeo, chromeMat);
    exhaust1.position.set(0.62, 0.22, -2.2);
    this.chassisGroup.add(exhaust1);

    const exhaust2 = exhaust1.clone();
    exhaust2.position.x = 0.76;
    this.chassisGroup.add(exhaust2);

    // Japanese License Plate (Rear)
    const plate = this.createJapaneseLicensePlate();
    plate.position.set(0, 0.38, -2.16);
    this.chassisGroup.add(plate);

    // 3. Headlights & Taillights
    const hlMatL = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.headLightL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.08), hlMatL);
    this.headLightL.position.set(-0.65, 0.55, 2.14);
    this.chassisGroup.add(this.headLightL);

    const hlMatR = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.headLightR = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.08), hlMatR);
    this.headLightR.position.set(0.65, 0.55, 2.14);
    this.chassisGroup.add(this.headLightR);

    // Road Beam Cones
    this.headLightCone = this.createHeadlightBeamCone();
    this.headLightCone.position.set(0, 0.45, 12);
    this.chassisGroup.add(this.headLightCone);

    // LED Taillight Bar
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.tailLightBar = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.11, 0.06), tlMat);
    this.tailLightBar.position.set(0, 0.65, -2.14);
    this.chassisGroup.add(this.tailLightBar);

    // Turn Signals
    const amberMat = new THREE.MeshBasicMaterial({ color: 0x78350f });
    this.turnSignalL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), amberMat);
    this.turnSignalL.position.set(-0.84, 0.55, 2.13);
    this.chassisGroup.add(this.turnSignalL);

    this.turnSignalR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), amberMat.clone());
    this.turnSignalR.position.set(0.84, 0.55, 2.13);
    this.chassisGroup.add(this.turnSignalR);

    // 4. Windshield Wipers
    const wiperMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const wiperBladeGeo = new THREE.BoxGeometry(0.02, 0.45, 0.02);

    this.wiperL = new THREE.Mesh(wiperBladeGeo, wiperMat);
    this.wiperL.position.set(-0.35, 0.88, 0.68);
    this.wiperL.rotation.x = -0.55;
    this.chassisGroup.add(this.wiperL);

    this.wiperR = new THREE.Mesh(wiperBladeGeo, wiperMat);
    this.wiperR.position.set(0.25, 0.88, 0.68);
    this.wiperR.rotation.x = -0.55;
    this.chassisGroup.add(this.wiperR);

    // 5. 3D Alloy Wheels & High-Performance Tires
    this.wheelFL = this.create3DWheelAssembly();
    this.wheelFL.position.set(-0.94, 0.34, 1.35);
    this.chassisGroup.add(this.wheelFL);

    this.wheelFR = this.create3DWheelAssembly();
    this.wheelFR.position.set(0.94, 0.34, 1.35);
    this.wheelFR.rotation.y = Math.PI;
    this.chassisGroup.add(this.wheelFR);

    this.wheelRL = this.create3DWheelAssembly();
    this.wheelRL.position.set(-0.94, 0.34, -1.35);
    this.chassisGroup.add(this.wheelRL);

    this.wheelRR = this.create3DWheelAssembly();
    this.wheelRR.position.set(0.94, 0.34, -1.35);
    this.wheelRR.rotation.y = Math.PI;
    this.chassisGroup.add(this.wheelRR);

    // 6. Radiator Steam & Smoke Emitter (GTA 5 Destruction Effect)
    const { points, posArray, velArray } = this.createRadiatorSmokeSystem();
    this.radiatorSmokeParticles = points;
    this.smokePositions = posArray;
    this.smokeVelocities = velArray;
    this.chassisGroup.add(this.radiatorSmokeParticles);
  }

  private createWindshieldCrackDecal(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 256);
    // Draw spiderweb fracture lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3;
    const cx = 140;
    const cy = 120;

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let x = cx;
      let y = cy;
      for (let s = 0; s < 4; s++) {
        x += Math.cos(angle + (Math.random() - 0.5) * 0.4) * 25;
        y += Math.sin(angle + (Math.random() - 0.5) * 0.4) * 25;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Rings
    for (let r = 20; r <= 80; r += 20) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), mat);
    mesh.position.set(0, 0.94, 0.72);
    mesh.rotation.x = -0.55;
    return mesh;
  }

  private createRadiatorSmokeSystem(): {
    points: THREE.Points;
    posArray: Float32Array;
    velArray: Float32Array;
  } {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.smokeCount * 3);
    const vel = new Float32Array(this.smokeCount * 3);

    for (let i = 0; i < this.smokeCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.6;
      pos[i * 3 + 1] = 0.65 + Math.random() * 0.3;
      pos[i * 3 + 2] = 1.9 + Math.random() * 0.3;

      vel[i * 3] = (Math.random() - 0.5) * 0.4;
      vel[i * 3 + 1] = 1.2 + Math.random() * 1.5;
      vel[i * 3 + 2] = -(0.5 + Math.random() * 1.5); // Drifting backward over car
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // Soft puff canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.5, 'rgba(200, 210, 225, 0.4)');
    grad.addColorStop(1, 'rgba(150, 160, 180, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const mat = new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(canvas),
      size: 0.85,
      transparent: true,
      opacity: 0, // invisible until damaged
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geo, mat);
    return { points, posArray: pos, velArray: vel };
  }

  private createJapaneseLicensePlate(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 60);

    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 16px "Zen Antique", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('品川 330', 64, 20);

    ctx.font = 'bold 30px "Space Mono", monospace';
    ctx.fillText('86-25', 64, 52);

    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.26), new THREE.MeshBasicMaterial({ map: tex }));
  }

  private createHeadlightBeamCone(): THREE.Mesh {
    const geo = new THREE.ConeGeometry(3.6, 22, 16, 1, true);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geo, mat);
  }

  private create3DWheelAssembly(): THREE.Group {
    const wheel = new THREE.Group();
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20), tireMat);
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);

    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.85, roughness: 0.2 });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.245, 16), rimMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    const spokeMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.9, roughness: 0.2 });
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.25), spokeMat);
      spoke.rotation.x = angle;
      wheel.add(spoke);
    }
    return wheel;
  }

  /**
   * Applies realistic crash destruction (GTA 5 Style)
   */
  public applyCrashDamage(intensity: number) {
    this.damagePercent = Math.min(100, this.damagePercent + intensity);

    // 1. Deform Front Hood (Pop up and crumple)
    const dFactor = this.damagePercent / 100;
    this.hoodMesh.rotation.x = 0.06 + dFactor * 0.42;
    this.hoodMesh.position.y = 0.65 + dFactor * 0.24;
    this.hoodMesh.position.z = 1.25 - dFactor * 0.18;

    // 2. Dislodge Front Bumper
    this.frontBumperMesh.position.y = 0.36 - dFactor * 0.14;
    this.frontBumperMesh.position.z = 2.12 - dFactor * 0.12;
    this.frontBumperMesh.rotation.z = (Math.random() > 0.5 ? 1 : -1) * dFactor * 0.28;

    // 3. Headlight Damage (Smash right headlight if heavy)
    if (this.damagePercent > 35) {
      (this.headLightR.material as THREE.MeshBasicMaterial).color.setHex(0x222222);
    }

    // 4. Windshield Cracks
    const crackMat = this.windshieldCracksMesh.material as THREE.MeshBasicMaterial;
    crackMat.opacity = Math.min(0.9, dFactor * 1.2);

    // 5. Radiator Smoke & Steam
    const smokeMat = this.radiatorSmokeParticles.material as THREE.PointsMaterial;
    smokeMat.opacity = Math.min(0.85, Math.max(0, (this.damagePercent - 15) / 85));
  }

  /**
   * Restores vehicle to mint condition (GTA 5 Pay 'n' Spray / Repair mechanic)
   */
  public repair() {
    this.isRepairing = true;
    this.repairTimer = 1.0;
  }

  public update(delta: number, controls: CarControls, speedKmh: number, isBraking: boolean) {
    this.speedKmh = speedKmh;

    // Repair animation smoothly restoring body parts
    if (this.isRepairing) {
      this.repairTimer -= delta * 1.5;
      this.damagePercent = Math.max(0, this.damagePercent - delta * 120);

      const dFactor = this.damagePercent / 100;
      this.hoodMesh.rotation.x = THREE.MathUtils.lerp(this.hoodMesh.rotation.x, 0.06, delta * 6);
      this.hoodMesh.position.y = THREE.MathUtils.lerp(this.hoodMesh.position.y, 0.65, delta * 6);
      this.hoodMesh.position.z = THREE.MathUtils.lerp(this.hoodMesh.position.z, 1.25, delta * 6);

      this.frontBumperMesh.position.set(0, 0.36, 2.12);
      this.frontBumperMesh.rotation.z = THREE.MathUtils.lerp(this.frontBumperMesh.rotation.z, 0, delta * 6);

      (this.headLightR.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);

      const crackMat = this.windshieldCracksMesh.material as THREE.MeshBasicMaterial;
      crackMat.opacity = THREE.MathUtils.lerp(crackMat.opacity, 0, delta * 6);

      const smokeMat = this.radiatorSmokeParticles.material as THREE.PointsMaterial;
      smokeMat.opacity = THREE.MathUtils.lerp(smokeMat.opacity, 0, delta * 6);

      if (this.repairTimer <= 0) {
        this.isRepairing = false;
        this.damagePercent = 0;
      }
    }

    // Animate Radiator Smoke & Steam when damaged
    if (this.damagePercent > 15) {
      const posAttr = this.radiatorSmokeParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.smokeCount; i++) {
        let x = posAttr.getX(i) + this.smokeVelocities[i * 3] * delta;
        let y = posAttr.getY(i) + this.smokeVelocities[i * 3 + 1] * delta;
        let z = posAttr.getZ(i) + (this.smokeVelocities[i * 3 + 2] - (this.speedKmh / 30)) * delta;

        if (y > 2.2 || z < -1.5) {
          x = (Math.random() - 0.5) * 0.5;
          y = 0.65 + Math.random() * 0.15;
          z = 1.9 + Math.random() * 0.2;
        }

        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    // RPM & Engine pitch calculation
    const baseIdleRpm = 850;
    const gearRatio = 32;
    this.rpm = THREE.MathUtils.lerp(
      this.rpm,
      baseIdleRpm + ((speedKmh % gearRatio) / gearRatio) * 4800 + controls.throttle * 900,
      delta * 12
    );

    // 3D Wheels Rotation (Speed-based roll)
    const spinRot = (speedKmh / 3.6 / 0.34) * delta;
    this.wheelFL.children[0].rotation.x += spinRot;
    this.wheelFR.children[0].rotation.x += spinRot;
    this.wheelRL.children[0].rotation.x += spinRot;
    this.wheelRR.children[0].rotation.x += spinRot;

    // Front wheels steering angle
    const targetSteer = controls.steer * 0.44;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, delta * 12);
    this.wheelFL.rotation.y = -this.steerAngle;
    this.wheelFR.rotation.y = -this.steerAngle;

    // Headlight brightness & road beam cone
    if (controls.headlights === 'off') {
      this.headLightCone.visible = false;
      (this.headLightL.material as THREE.MeshBasicMaterial).color.setHex(0x333333);
      if (this.damagePercent <= 35) (this.headLightR.material as THREE.MeshBasicMaterial).color.setHex(0x333333);
    } else if (controls.headlights === 'low') {
      this.headLightCone.visible = true;
      (this.headLightCone.material as THREE.MeshBasicMaterial).opacity = 0.55;
      (this.headLightL.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      if (this.damagePercent <= 35) (this.headLightR.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    } else {
      // High beam
      this.headLightCone.visible = true;
      (this.headLightCone.material as THREE.MeshBasicMaterial).opacity = 0.88;
      (this.headLightL.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      if (this.damagePercent <= 35) (this.headLightR.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    }

    // Taillight bar illumination (Bright red on brake)
    if (isBraking || controls.brake > 0.05) {
      (this.tailLightBar.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      this.tailLightBar.scale.set(1.05, 1.4, 1.0);
    } else {
      (this.tailLightBar.material as THREE.MeshBasicMaterial).color.setHex(0x991b1b);
      this.tailLightBar.scale.set(1.0, 1.0, 1.0);
    }

    // Turn signal indicator flashing
    this.blinkerTimer += delta;
    if (this.blinkerTimer >= 0.38) {
      this.blinkerTimer = 0;
      this.blinkerState = !this.blinkerState;
    }

    const showL = this.blinkerState && (controls.turnSignal === 'left' || controls.turnSignal === 'hazard');
    const showR = this.blinkerState && (controls.turnSignal === 'right' || controls.turnSignal === 'hazard');

    (this.turnSignalL.material as THREE.MeshBasicMaterial).color.setHex(showL ? 0xfbbf24 : 0x78350f);
    (this.turnSignalR.material as THREE.MeshBasicMaterial).color.setHex(showR ? 0xfbbf24 : 0x78350f);

    // Windshield wipers sweep
    if (controls.wipers !== 'off') {
      const freq = controls.wipers === 'high' ? 7.5 : 4.0;
      this.wiperAngle += delta * freq;
      const sweep = Math.sin(this.wiperAngle) * 0.72;
      this.wiperL.rotation.z = sweep;
      this.wiperR.rotation.z = sweep;
    } else {
      this.wiperL.rotation.z = THREE.MathUtils.lerp(this.wiperL.rotation.z, 0, delta * 8);
      this.wiperR.rotation.z = THREE.MathUtils.lerp(this.wiperR.rotation.z, 0, delta * 8);
    }

    // Realistic suspension body roll & pitch
    const targetRoll = this.steerAngle * (speedKmh / 120) * 0.09;
    this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, targetRoll, delta * 8);

    const targetPitch = (isBraking ? 0.035 : -controls.throttle * 0.018) * (speedKmh / 100);
    this.bodyPitch = THREE.MathUtils.lerp(this.bodyPitch, targetPitch, delta * 8);

    this.chassisGroup.rotation.z = this.bodyRoll;
    this.chassisGroup.rotation.x = this.bodyPitch;
  }

  public getCockpitCameraPosition(): THREE.Vector3 {
    return this.group.localToWorld(new THREE.Vector3(0.38, 1.04, -0.15));
  }

  public getHoodCameraPosition(): THREE.Vector3 {
    return this.group.localToWorld(new THREE.Vector3(0, 0.72, 1.85));
  }
}
