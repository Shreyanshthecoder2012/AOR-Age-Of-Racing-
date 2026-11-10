import * as THREE from 'three';
import { getRoadSpline } from './HighwaySpline';

interface WalkingPerson {
  mesh: THREE.Group;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  walkSpeed: number; // positive = forward, negative = backward
  baseX: number;     // offset from road center on sidewalk
  z: number;
  stridePhase: number;
}

/**
 * TokyoPedestrianWalkways - Japanese urban sidewalks flush with the road and buildings.
 * Completely eliminates the disturbing void between road and architecture!
 * Includes wet concrete paving, tactile Braille blocks, glowing vending machines,
 * street furniture, and animated pedestrians with umbrellas walking in the rain.
 */
export class TokyoPedestrianWalkways {
  public group: THREE.Group;
  private pedestrians: WalkingPerson[] = [];
  private trackLength: number;

  constructor(trackLength: number = 800) {
    this.group = new THREE.Group();
    this.trackLength = trackLength;

    this.createSidewalkPavements();
    this.createStreetFurniture();
    this.spawnWalkingPedestrians();
  }

  /**
   * High-detail wet concrete sidewalk texture with yellow tactile paving (Tenji blocks)
   */
  private createSidewalkMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Wet dark grey Japanese granite slab sidewalk
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 256, 256, 512);
    ctx.fillStyle = '#171c26';
    ctx.fillRect(0, 0, 256, 256);

    // Slab seam lines
    ctx.strokeStyle = '#0f141c';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 252);
    ctx.strokeRect(2, 258, 252, 250);

    // Yellow tactile Braille warning tiles (Tenji blocks) near curb edge (left ~30px)
    ctx.fillStyle = '#eab308';
    ctx.fillRect(8, 0, 32, 512);

    // Tactile dot grid
    ctx.fillStyle = '#ca8a04';
    for (let y = 12; y < 512; y += 24) {
      ctx.beginPath();
      ctx.arc(24, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wet puddle water gloss sheen
    const pgrad = ctx.createLinearGradient(0, 0, 256, 512);
    pgrad.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
    pgrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
    pgrad.addColorStop(1, 'rgba(56, 189, 248, 0.2)');
    ctx.fillStyle = pgrad;
    ctx.fillRect(0, 0, 256, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 24);

    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.15,
      metalness: 0.35,
    });
  }

  private createSidewalkPavements() {
    const sidewalkMat = this.createSidewalkMaterial();
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });

    // Segmented curved sidewalks that follow HighwaySpline
    const segments = 120;
    const segLen = this.trackLength / segments;

    for (let i = 0; i < segments; i++) {
      const z = (i - segments / 2) * segLen;
      const { x: roadX, rotY } = getRoadSpline(z);

      // Left Sidewalk slab (6.5m wide, from road edge x=-7.0 to x=-13.5)
      const leftSlab = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.22, segLen + 0.4), sidewalkMat);
      leftSlab.position.set(roadX - 10.25, 0.11, z);
      leftSlab.rotation.y = rotY;
      this.group.add(leftSlab);

      // Left Raised Curb stone
      const leftCurb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.26, segLen + 0.4), curbMat);
      leftCurb.position.set(roadX - 7.0, 0.13, z);
      leftCurb.rotation.y = rotY;
      this.group.add(leftCurb);

      // Right Sidewalk slab (from road edge x=7.0 to x=13.5)
      const rightSlab = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.22, segLen + 0.4), sidewalkMat);
      rightSlab.position.set(roadX + 10.25, 0.11, z);
      rightSlab.rotation.y = rotY;
      this.group.add(rightSlab);

      // Right Raised Curb stone
      const rightCurb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.26, segLen + 0.4), curbMat);
      rightCurb.position.set(roadX + 7.0, 0.13, z);
      rightCurb.rotation.y = rotY;
      this.group.add(rightCurb);
    }
  }

  private createStreetFurniture() {
    // Glowing Japanese beverage vending machines on the sidewalks!
    const step = 65;
    const count = Math.floor(this.trackLength / step);

    for (let i = 0; i < count; i++) {
      const z = (i - count / 2) * step + 12;
      const { x: roadX, rotY } = getRoadSpline(z);

      // Vending machine on Left Sidewalk (placed near building edge at x = roadX - 12.8)
      const vmGroupL = this.createVendingMachineGroup(i % 2 === 0 ? 0xef4444 : 0x0284c7);
      vmGroupL.position.set(roadX - 12.6, 0.22, z);
      vmGroupL.rotation.y = rotY + Math.PI / 2; // Facing the sidewalk
      this.group.add(vmGroupL);

      // Vending machine on Right Sidewalk
      const vmGroupR = this.createVendingMachineGroup(i % 2 === 0 ? 0x16a34a : 0xf97316);
      vmGroupR.position.set(roadX + 12.6, 0.22, z + 25);
      vmGroupR.rotation.y = rotY - Math.PI / 2;
      this.group.add(vmGroupR);

      // Tokyo Bus Stop Shelter on Right sidewalk
      if (i % 3 === 0) {
        const shelter = this.createBusStopShelter();
        shelter.position.set(roadX + 11.2, 0.22, z - 18);
        shelter.rotation.y = rotY - Math.PI / 2;
        this.group.add(shelter);
      }
    }
  }

  private createVendingMachineGroup(glowColorHex: number): THREE.Group {
    const vm = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.8), bodyMat);
    body.position.y = 0.95;
    vm.add(body);

    // Glowing front illuminated panel
    const glassMat = new THREE.MeshBasicMaterial({ color: glowColorHex });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.05), glassMat);
    panel.position.set(0, 1.25, 0.42);
    vm.add(panel);

    // Dispenser tray
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.1), new THREE.MeshBasicMaterial({ color: 0x09090b }));
    tray.position.set(0, 0.4, 0.42);
    vm.add(tray);

    return vm;
  }

  private createBusStopShelter(): THREE.Group {
    const shelter = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.45 });

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.8), frameMat);
    roof.position.set(0, 2.5, 0);
    shelter.add(roof);

    // Glass back wall
    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.3, 0.08), glassMat);
    backGlass.position.set(0, 1.25, -0.85);
    shelter.add(backGlass);

    // Bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.45), frameMat);
    bench.position.set(0, 0.25, -0.4);
    shelter.add(bench);

    return shelter;
  }

  private spawnWalkingPedestrians() {
    const umbrellaColors = [0x38bdf8, 0xf43f5e, 0xfacc15, 0x10b981, 0xe0e7ff, 0xa855f7];
    const coats = [0x1e293b, 0x334155, 0x475569, 0x0f172a, 0x581c87];

    const count = 22;
    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      const baseXOffset = isLeft ? -9.5 - (i % 3) * 1.0 : 9.5 + (i % 3) * 1.0;
      const z = (i - count / 2) * 32 + (Math.random() - 0.5) * 15;
      const walkSpeed = (i % 4 === 0 ? -1 : 1) * (1.1 + Math.random() * 0.5);

      const uColor = umbrellaColors[i % umbrellaColors.length];
      const cColor = coats[i % coats.length];

      const { mesh, legL, legR } = this.createPedestrianMesh(uColor, cColor);
      mesh.position.set(baseXOffset, 0.22, z);
      this.group.add(mesh);

      this.pedestrians.push({
        mesh,
        legL,
        legR,
        walkSpeed,
        baseX: baseXOffset,
        z,
        stridePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private createPedestrianMesh(umbrellaColor: number, coatColor: number): {
    mesh: THREE.Group;
    legL: THREE.Mesh;
    legR: THREE.Mesh;
  } {
    const p = new THREE.Group();

    // Body / Coat
    const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.8, 8), coatMat);
    torso.position.y = 1.05;
    p.add(torso);

    // Head
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.5 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
    head.position.y = 1.6;
    p.add(head);

    // Legs
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.65, 6);

    const legL = new THREE.Mesh(legGeo, pantMat);
    legL.position.set(-0.11, 0.35, 0);
    p.add(legL);

    const legR = new THREE.Mesh(legGeo, pantMat);
    legR.position.set(0.11, 0.35, 0);
    p.add(legR);

    // Translucent Japanese Dome Umbrella (Makoto Shinkai aesthetic)
    const umbrellaMat = new THREE.MeshStandardMaterial({
      color: umbrellaColor,
      transparent: true,
      opacity: 0.82,
      roughness: 0.15,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    // Hemisphere dome
    const domeGeo = new THREE.SphereGeometry(0.68, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const umbrellaDome = new THREE.Mesh(domeGeo, umbrellaMat);
    umbrellaDome.position.set(0, 1.95, 0);
    umbrellaDome.rotation.x = -Math.PI; // Opening downward
    p.add(umbrellaDome);

    // Umbrella shaft & handle
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.75, 6),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
    );
    shaft.position.set(0, 1.65, 0);
    p.add(shaft);

    return { mesh: p, legL, legR };
  }

  public update(delta: number, carZ: number) {
    const halfLen = this.trackLength / 2;

    for (const ped of this.pedestrians) {
      // Advance walking animation & position along Z
      ped.z += ped.walkSpeed * delta;
      ped.stridePhase += Math.abs(ped.walkSpeed) * delta * 5.2;

      // Animate walking leg stride swing
      const stride = Math.sin(ped.stridePhase) * 0.45;
      ped.legL.rotation.x = stride;
      ped.legR.rotation.x = -stride;

      // Wrap smoothly around player's driving view
      let relZ = ped.z - carZ;
      if (relZ < -100) {
        ped.z += this.trackLength * 0.75;
      } else if (relZ > this.trackLength * 0.75) {
        ped.z -= this.trackLength * 0.75;
      }

      // Re-align to highway curve at current Z
      const { x: roadX, rotY } = getRoadSpline(ped.z);
      ped.mesh.position.set(roadX + ped.baseX, 0.22, ped.z);
      // Face walking direction
      ped.mesh.rotation.y = rotY + (ped.walkSpeed > 0 ? 0 : Math.PI);
    }
  }
}
