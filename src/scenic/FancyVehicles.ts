import * as THREE from 'three';

export type VehicleType = 'coupe' | 'f1' | 'rolls';

export interface VehicleSpecs {
  type: VehicleType;
  name: string;
  maxSpeed: number;     // km/h
  accelRate: number;    // km/h per sec
  handling: number;     // lateral grip factor
  engineTone: number;   // audio pitch multiplier
}

export const VEHICLE_SPECS: Record<VehicleType, VehicleSpecs> = {
  coupe: {
    type: 'coupe',
    name: 'GT-R Street Tuned Supercar',
    maxSpeed: 245,
    accelRate: 45,
    handling: 1.0,
    engineTone: 1.0,
  },
  f1: {
    type: 'f1',
    name: 'Scuderia Grand Prix F1 Racer',
    maxSpeed: 330,
    accelRate: 75,
    handling: 1.35,
    engineTone: 1.85, // High-rev screaming V10
  },
  rolls: {
    type: 'rolls',
    name: 'Rolls-Royce Phantom V12 Luxury',
    maxSpeed: 215,
    accelRate: 35,
    handling: 0.85,
    engineTone: 0.75, // Deep whisper-quiet V12
  },
};

/**
 * FancyVehicles - Builds high-detail 3D procedural vehicle models:
 * 1. Formula 1 Racer (aerodynamic front wing, halo, sidepods, rear wing, slick tires)
 * 2. Rolls-Royce Phantom (Pantheon chrome grille, Spirit of Ecstasy, two-tone livery)
 * 3. GT Supercar (widebody, carbon splitter, spoiler, underglow)
 */
export class FancyVehicleBuilder {
  /**
   * Builds an authentic Formula 1 Grand Prix race car
   */
  public static createF1Car(colorHex: number = 0xdc2626): THREE.Group {
    const f1 = new THREE.Group();

    const liveryMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.2,
      metalness: 0.6,
    });
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.8,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.9,
    });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Pirelli yellow stripe

    // 1. Long Aerodynamic Needle Monocoque / Nosecone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.2, 12), liveryMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.32, 1.6);
    f1.add(nose);

    // Main Cockpit Tub
    const tub = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 2.6), liveryMat);
    tub.position.set(0, 0.36, -0.4);
    f1.add(tub);

    // Engine Airbox Intake above driver head
    const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.9), liveryMat);
    airbox.position.set(0, 0.74, -0.6);
    f1.add(airbox);

    const airIntake = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.1), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    airIntake.position.set(0, 0.82, -0.15);
    f1.add(airIntake);

    // Driver Safety Halo
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 16, Math.PI), carbonMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(0, 0.64, 0.1);
    f1.add(halo);

    // Driver Helmet (Yellow / Black anime helmet)
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 }));
    helmet.position.set(0, 0.58, 0.0);
    f1.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.12), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    visor.position.set(0, 0.6, 0.12);
    f1.add(visor);

    // Aerodynamic Sidepods (cooling radiators)
    const sidepodL = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 1.8), liveryMat);
    sidepodL.position.set(-0.65, 0.32, -0.4);
    f1.add(sidepodL);

    const sidepodR = sidepodL.clone();
    sidepodR.position.x = 0.65;
    f1.add(sidepodR);

    // 2. Wide Front Wing with Cascade Endplates
    const frontWingMain = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.06, 0.42), carbonMat);
    frontWingMain.position.set(0, 0.16, 2.5);
    f1.add(frontWingMain);

    const endplateL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.48), liveryMat);
    endplateL.position.set(-0.98, 0.24, 2.5);
    f1.add(endplateL);

    const endplateR = endplateL.clone();
    endplateR.position.x = 0.98;
    f1.add(endplateR);

    // 3. Giant Dual-Plane Rear Wing with DRS flap
    const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 0.44), carbonMat);
    rearWing.position.set(0, 0.92, -1.95);
    f1.add(rearWing);

    const rearWingTop = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 0.32), liveryMat);
    rearWingTop.position.set(0, 1.08, -1.98);
    f1.add(rearWingTop);

    const rearEndplateL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.55), liveryMat);
    rearEndplateL.position.set(-0.82, 0.88, -1.95);
    f1.add(rearEndplateL);

    const rearEndplateR = rearEndplateL.clone();
    rearEndplateR.position.x = 0.82;
    f1.add(rearEndplateR);

    // Rear F1 Rain Safety Light (flashing bright red in rain or braking)
    const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    rainLight.position.set(0, 0.26, -2.05);
    f1.add(rainLight);

    // 4. Exposed Formula 1 Suspension Arms & Fat Slick Tires
    const wheelGeoFront = new THREE.CylinderGeometry(0.32, 0.32, 0.32, 16);
    wheelGeoFront.rotateZ(Math.PI / 2);
    const wheelGeoRear = new THREE.CylinderGeometry(0.35, 0.35, 0.45, 16);
    wheelGeoRear.rotateZ(Math.PI / 2);

    // Wheels at 4 corners outside the chassis
    const wheels = [
      { x: -0.96, y: 0.32, z: 1.6, geo: wheelGeoFront, name: 'wFL' },
      { x: 0.96, y: 0.32, z: 1.6, geo: wheelGeoFront, name: 'wFR' },
      { x: -0.98, y: 0.35, z: -1.3, geo: wheelGeoRear, name: 'wRL' },
      { x: 0.98, y: 0.35, z: -1.3, geo: wheelGeoRear, name: 'wRR' },
    ];

    for (const w of wheels) {
      const wGroup = new THREE.Group();
      wGroup.name = w.name;
      const tire = new THREE.Mesh(w.geo, tireMat);
      wGroup.add(tire);

      // Yellow tire wall decal ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 6, 16), stripeMat);
      ring.position.x = w.x > 0 ? 0.17 : -0.17;
      ring.rotation.y = Math.PI / 2;
      wGroup.add(ring);

      wGroup.position.set(w.x, w.y, w.z);
      f1.add(wGroup);

      // Wishbone suspension rods
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), carbonMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(w.x * 0.6, w.y, w.z);
      f1.add(rod);
    }

    return f1;
  }

  /**
   * Builds a stately, regal Rolls-Royce Phantom Luxury Limousine
   */
  public static createRollsRoyce(bodyColor: number = 0x0f172a, roofColor: number = 0xe2e8f0): THREE.Group {
    const rr = new THREE.Group();

    const lowerPaintMat = new THREE.MeshStandardMaterial({
      color: bodyColor,     // Royal dark navy / emerald
      roughness: 0.15,
      metalness: 0.35,
    });
    const upperPaintMat = new THREE.MeshStandardMaterial({
      color: roofColor,     // Liquid silver two-tone bonnet & roof
      roughness: 0.12,
      metalness: 0.65,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.08,
      metalness: 0.95,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.1,
      metalness: 0.4,
    });

    // 1. Stately Long Body Hull (5.5m long, 2.0m wide)
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.58, 5.3), lowerPaintMat);
    hull.position.y = 0.52;
    rr.add(hull);

    // High Long Bonnet / Hood (Liquid silver two-tone)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.22, 1.9), upperPaintMat);
    hood.position.set(0, 0.82, 1.45);
    rr.add(hood);

    // 2. Iconic Rolls-Royce Pantheon Chrome Grille
    const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.68, 0.18), chromeMat);
    grilleFrame.position.set(0, 0.68, 2.62);
    rr.add(grilleFrame);

    // Vertical chrome louvers
    const louverMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const louverBox = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.56, 0.05), louverMat);
    louverBox.position.set(0, 0.68, 2.7);
    rr.add(louverBox);

    // Spirit of Ecstasy chrome hood ornament statuette
    const ecstasy = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 8), chromeMat);
    ecstasy.position.set(0, 1.05, 2.58);
    rr.add(ecstasy);

    // 3. Stately Executive Cabin Greenhouse
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 2.6), glassMat);
    cabin.position.set(0, 1.15, -0.35);
    rr.add(cabin);

    // Roof (Two-tone silver matching hood)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.08, 2.4), upperPaintMat);
    roof.position.set(0, 1.48, -0.35);
    rr.add(roof);

    // Thick Formal C-Pillars for Rear Passenger Privacy
    const cPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.8), upperPaintMat);
    cPillarL.position.set(-0.84, 1.15, -1.25);
    rr.add(cPillarL);

    const cPillarR = cPillarL.clone();
    cPillarR.position.x = 0.84;
    rr.add(cPillarR);

    // 4. Headlights (Sophisticated Laser Matrix LED)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.08), hlMat);
    hlL.position.set(-0.72, 0.68, 2.58);
    rr.add(hlL);

    const hlR = hlL.clone();
    hlR.position.x = 0.72;
    rr.add(hlR);

    // Chrome waistline pinstripe trim
    const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 5.2), chromeMat);
    trimL.position.set(-1.02, 0.78, 0);
    rr.add(trimL);

    const trimR = trimL.clone();
    trimR.position.x = 1.02;
    rr.add(trimR);

    // Taillights
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.08), tlMat);
    tlL.position.set(-0.78, 0.65, -2.62);
    rr.add(tlL);

    const tlR = tlL.clone();
    tlR.position.x = 0.78;
    rr.add(tlR);

    // 5. Polished Chrome Disc Wheels (Self-righting RR center caps)
    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 20);
    wGeo.rotateZ(Math.PI / 2);
    const discMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.1 });

    for (const [x, z] of [[-0.98, 1.6], [0.98, 1.6], [-0.98, -1.6], [0.98, -1.6]]) {
      const wGroup = new THREE.Group();
      const tire = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 }));
      wGroup.add(tire);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.285, 16), discMat);
      cap.rotation.z = Math.PI / 2;
      wGroup.add(cap);

      wGroup.position.set(x, 0.38, z);
      rr.add(wGroup);
    }

    return rr;
  }
}
