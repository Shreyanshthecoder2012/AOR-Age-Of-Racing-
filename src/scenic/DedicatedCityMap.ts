import * as THREE from 'three';
import { getRoadSpline } from './HighwaySpline';
import { VeloraCollisionSystem } from './VeloraCollisionSystem';

export interface DistrictInfo {
  id: string;
  name: string;
  japanese: string;
  speedLimit: number;
  description: string;
}

export const MAP_DISTRICTS: { startZ: number; endZ: number; info: DistrictInfo }[] = [
  {
    startZ: 0,
    endZ: 600,
    info: {
      id: 'downtown',
      name: 'DOWNTOWN METROPOLIS',
      japanese: '新宿中央 · ネオン大通り',
      speedLimit: 80,
      description: 'Skyscrapers, commercial neons & multi-lane city highway',
    },
  },
  {
    startZ: 600,
    endZ: 1200,
    info: {
      id: 'residential',
      name: 'SUBURBAN RESIDENTIAL COLONY',
      japanese: '静寂の住宅街 · ガレージと桜',
      speedLimit: 60,
      description: 'Houses with pitched tile roofs, private garages & gardens',
    },
  },
  {
    startZ: 1200,
    endZ: 1800,
    info: {
      id: 'airport',
      name: 'INTERNATIONAL AIRPORT DISTRICT',
      japanese: '東京国際空港 · 滑走路と格納庫',
      speedLimit: 120,
      description: 'Runway landing lights, control tower & airplane hangars',
    },
  },
  {
    startZ: 1800,
    endZ: 2400,
    info: {
      id: 'harbor',
      name: 'HARBOR BRIDGE & OVERPASS',
      japanese: '湾岸大橋 · コンテナ埠頭',
      speedLimit: 140,
      description: 'Cable-stayed suspension bridge & shipping container docks',
    },
  },
];

export const TOTAL_MAP_LENGTH = 2400;

export function getDistrictAtZ(z: number): DistrictInfo {
  const normZ = ((z % TOTAL_MAP_LENGTH) + TOTAL_MAP_LENGTH) % TOTAL_MAP_LENGTH;
  for (const d of MAP_DISTRICTS) {
    if (normZ >= d.startZ && normZ < d.endZ) return d.info;
  }
  return MAP_DISTRICTS[0].info;
}

/**
 * DedicatedCityMap - High-variety GTA/RDR style closed curated city world.
 * Solves the repetitive empty space problem by constructing continuous,
 * seamless architecture across 4 distinct districts.
 */
export class DedicatedCityMap {
  public group: THREE.Group;
  private structuresGroup: THREE.Group;
  private collisionSystem?: VeloraCollisionSystem;

  constructor(collisionSystem?: VeloraCollisionSystem) {
    this.group = new THREE.Group();
    this.structuresGroup = new THREE.Group();
    this.collisionSystem = collisionSystem;

    this.group.add(this.structuresGroup);

    this.buildDowntownDistrict();
    this.buildResidentialColony();
    this.buildAirportDistrict();
    this.buildHarborBridgeDistrict();
  }

  /**
   * District 1: Downtown Metropolis (Z: 0 to 600)
   * Continuous modern commercial skyscrapers, neon storefronts, zero black gaps.
   */
  private buildDowntownDistrict() {
    const step = 32;
    const startZ = 0;
    const endZ = 600;

    const neonColors = [0x38bdf8, 0xf43f5e, 0xfacc15, 0x10b981, 0xa855f7];

    for (let z = startZ; z < endZ; z += step) {
      const { x: roadX, rotY } = getRoadSpline(z);

      // Left High-Rise Tower with solid walls and rooftop antenna
      const hL = 48 + ((z / 32) % 5) * 14;
      const towerL = new THREE.Group();
      const bodyL = new THREE.Mesh(
        new THREE.BoxGeometry(22, hL, 34),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.5 })
      );
      bodyL.position.y = hL / 2;
      towerL.add(bodyL);

      // Glowing storefront neon signage on ground floor
      const neonMatL = new THREE.MeshBasicMaterial({ color: neonColors[Math.floor(z / 32) % neonColors.length] });
      const signL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.5, 26), neonMatL);
      signL.position.set(11.1, 4.5, 0);
      towerL.add(signL);

      // Rooftop antenna tower with red obstruction beacon
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.4, 12, 6), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
      ant.position.set(0, hL + 6, 0);
      towerL.add(ant);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      beacon.position.set(0, hL + 12.2, 0);
      towerL.add(beacon);

      towerL.position.set(roadX - 24, 0, z);
      towerL.rotation.y = rotY;
      this.structuresGroup.add(towerL);
      if (this.collisionSystem) {
        this.collisionSystem.registerBox('Downtown Street Tower Left', roadX - 24, z, 22, 34, hL, false, towerL);
      }

      // Right Commercial High-Rise
      const hR = 52 + (((z + 16) / 32) % 5) * 12;
      const towerR = new THREE.Group();
      const bodyR = new THREE.Mesh(
        new THREE.BoxGeometry(22, hR, 34),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.6 })
      );
      bodyR.position.y = hR / 2;
      towerR.add(bodyR);

      const neonMatR = new THREE.MeshBasicMaterial({ color: neonColors[(Math.floor(z / 32) + 2) % neonColors.length] });
      const signR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.5, 26), neonMatR);
      signR.position.set(-11.1, 4.5, 0);
      towerR.add(signR);

      towerR.position.set(roadX + 24, 0, z);
      towerR.rotation.y = rotY;
      this.structuresGroup.add(towerR);
      if (this.collisionSystem) {
        this.collisionSystem.registerBox('Downtown Street Tower Right', roadX + 24, z, 22, 34, hR, false, towerR);
      }
    }
  }

  /**
   * District 2: Residential Colony & Suburbs (Z: 600 to 1200)
   * Japanese houses with pitched roofs, private garages with roller shutters,
   * garden fences, trees, and street furniture.
   */
  private buildResidentialColony() {
    const step = 28;
    const startZ = 600;
    const endZ = 1200;

    for (let z = startZ; z < endZ; z += step) {
      const { x: roadX, rotY } = getRoadSpline(z);

      // Left Side: Japanese House with Garage & Garden
      const houseL = this.createJapaneseHouseWithGarage(z % 2 === 0 ? 0x1e3a8a : 0x7c2d12);
      houseL.position.set(roadX - 22, 0, z);
      houseL.rotation.y = rotY;
      this.structuresGroup.add(houseL);
      if (this.collisionSystem) {
        this.collisionSystem.registerBox('Suburban House Left', roadX - 22, z, 18, 16, 9, true, houseL);
      }

      // Right Side: Modern Suburban Residence with Carport
      const houseR = this.createJapaneseHouseWithGarage((z + 14) % 2 === 0 ? 0x065f46 : 0x1e293b);
      houseR.position.set(roadX + 22, 0, z);
      houseR.rotation.y = rotY + Math.PI; // Face the road
      this.structuresGroup.add(houseR);
      if (this.collisionSystem) {
        this.collisionSystem.registerBox('Suburban House Right', roadX + 22, z, 18, 16, 9, true, houseR);
      }
    }
  }

  private createJapaneseHouseWithGarage(roofColor: number): THREE.Group {
    const house = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });

    // 1. Two-Story Main House Body (12m wide, 7.5m high, 14m deep)
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(11, 7.2, 13), wallMat);
    mainBody.position.y = 3.6;
    house.add(mainBody);

    // Pitched Japanese Hip Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.2, 3.2, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 8.8, 0);
    house.add(roof);

    // 2. Private Ground Garage with Roller Shutter
    const garageBody = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.8, 7.5), wallMat);
    garageBody.position.set(7.5, 1.9, 2.5);
    house.add(garageBody);

    // Garage Roller Shutter Door
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.0, 5.2), shutterMat);
    shutter.position.set(4.2, 1.6, 2.5);
    house.add(shutter);

    // Parked Kei-Car in front of garage driveway
    const parkedCar = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.3, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 })
    );
    parkedCar.position.set(7.5, 0.65, 8.2);
    house.add(parkedCar);

    // 3. Suburban Concrete Boundary Wall & Garden Fence
    const fence = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 18), woodMat);
    fence.position.set(3.2, 0.6, 0);
    house.add(fence);

    // Cherry blossom / Suburban Pine Tree in Garden
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 4.5, 6), woodMat);
    trunk.position.set(1.5, 2.2, -5.5);
    house.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.4),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 })
    );
    foliage.position.set(1.5, 4.8, -5.5);
    house.add(foliage);

    return house;
  }

  /**
   * District 3: Tokyo International Airport (Z: 1200 to 1800)
   * Active airport runway, control tower, hangars, parked airliners, runway approach lights.
   */
  private buildAirportDistrict() {
    const startZ = 1200;
    const endZ = 1800;

    // 1. Airport Runway Tarmac (Parallel to highway on Left side, from x = -20 to -90)
    const runwayGeo = new THREE.PlaneGeometry(65, 600);
    const runwayMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(-52, 0.05, 1500);
    this.structuresGroup.add(runway);

    // Runway Centerline & Threshold Markings
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let rz = startZ + 30; rz < endZ - 30; rz += 30) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 18), lineMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-52, 0.08, rz);
      this.structuresGroup.add(stripe);
    }

    // Runway Green/White Edge Lights
    const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const whiteLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let rz = startZ; rz <= endZ; rz += 40) {
      const gLightL = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), greenLightMat);
      gLightL.position.set(-84, 0.4, rz);
      this.structuresGroup.add(gLightL);

      const wLightR = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), whiteLightMat);
      wLightR.position.set(-20, 0.4, rz);
      this.structuresGroup.add(wLightR);
    }

    // 2. Airport Control Tower (At z = 1500, x = -88)
    const tower = this.createAirportControlTower();
    tower.position.set(-88, 0, 1500);
    this.structuresGroup.add(tower);
    if (this.collisionSystem) {
      this.collisionSystem.registerCircle('Airport Control Tower', -88, 1500, 5.0, 50, false, tower);
    }

    // 3. Huge Airplane Hangars & Parked Jets (On Right side, z = 1300 & 1650)
    const hangar1 = this.createAirplaneHangar('TOKYO AIR CARGO');
    hangar1.position.set(45, 0, 1380);
    this.structuresGroup.add(hangar1);
    if (this.collisionSystem) {
      this.collisionSystem.registerBox('Air Cargo Hangar 1', 45, 1380, 38, 45, 18, false, hangar1);
    }

    const hangar2 = this.createAirplaneHangar('HANEDA JET SERVICE');
    hangar2.position.set(45, 0, 1620);
    this.structuresGroup.add(hangar2);
    if (this.collisionSystem) {
      this.collisionSystem.registerBox('Jet Service Hangar 2', 45, 1620, 38, 45, 18, false, hangar2);
    }

    // Parked Twin-Engine Passenger Jet on Apron
    const jet = this.createParkedPassengerJet();
    jet.position.set(-48, 0, 1360);
    this.structuresGroup.add(jet);
    if (this.collisionSystem) {
      this.collisionSystem.registerBox('Parked Passenger Jet', -48, 1360, 28, 36, 12, true, jet);
    }
  }

  private createAirportControlTower(): THREE.Group {
    const tower = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Tower Column (42m tall)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 42, 16), concreteMat);
    shaft.position.y = 21;
    tower.add(shaft);

    // Observation Cab (360° Glass Dome)
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 6.0, 6.5, 16), glassMat);
    cab.position.y = 44;
    tower.add(cab);

    // Tower Roof & Rotating Radar Antenna
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.0, 3.0, 16), concreteMat);
    roof.position.y = 48.5;
    tower.add(roof);

    // Red Aerodrome Rotating Beacon
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    beacon.position.y = 50.8;
    tower.add(beacon);

    return tower;
  }

  private createAirplaneHangar(label: string): THREE.Group {
    const hangar = new THREE.Group();
    const sheetMetalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });

    // Curved arched barrel hangar roof (38m wide, 16m high, 45m deep)
    const archGeo = new THREE.CylinderGeometry(19, 19, 45, 20, 1, false, 0, Math.PI);
    const arch = new THREE.Mesh(archGeo, sheetMetalMat);
    arch.rotation.z = Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    arch.position.y = 0;
    hangar.add(arch);

    // Hangar Big Open Doors
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(32, 14), doorMat);
    door.position.set(0, 7, -22.6);
    door.rotation.y = Math.PI;
    hangar.add(door);

    return hangar;
  }

  private createParkedPassengerJet(): THREE.Group {
    const jet = new THREE.Group();
    const whitePaint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const bluePaint = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3 });

    // Fuselage
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 38, 16), whitePaint);
    body.rotation.x = Math.PI / 2;
    body.position.y = 4.2;
    jet.add(body);

    // Nose Cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(2.4, 6, 16), whitePaint);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 4.2, 22);
    jet.add(nose);

    // Swept Main Wings (32m wingspan)
    const wingGeo = new THREE.BoxGeometry(34, 0.4, 6);
    const wings = new THREE.Mesh(wingGeo, bluePaint);
    wings.position.set(0, 3.8, 2);
    jet.add(wings);

    // Vertical Tail Fin
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.5, 5), bluePaint);
    tail.position.set(0, 8.5, -16);
    jet.add(tail);

    return jet;
  }

  /**
   * District 4: Harbor Bay & Coastal Bridge (Z: 1800 to 2400)
   * Cable-stayed suspension bridge, colorful stacked shipping containers, industrial cranes.
   */
  private buildHarborBridgeDistrict() {
    const startZ = 1800;
    const endZ = 2400;

    // 1. Cable-Stayed Suspension Bridge Towers (At z = 1950 and z = 2250)
    for (const bz of [1950, 2250]) {
      const { x: roadX } = getRoadSpline(bz);
      const bridgePylon = this.createSuspensionBridgePylon();
      bridgePylon.position.set(roadX, 0, bz);
      this.structuresGroup.add(bridgePylon);
      if (this.collisionSystem) {
        this.collisionSystem.registerBox('Bridge Pylon Left Column', roadX - 16.5, bz, 3.5, 4.0, 55, false, bridgePylon);
        this.collisionSystem.registerBox('Bridge Pylon Right Column', roadX + 16.5, bz, 3.5, 4.0, 55, false, bridgePylon);
      }
    }

    // 2. Stacked Colorful Harbor Shipping Containers (Left side water docks, z = 1850 to 2350)
    const containerColors = [0x0284c7, 0xdc2626, 0x16a34a, 0xea580c, 0xfacc15];
    for (let cz = startZ + 30; cz < endZ - 40; cz += 35) {
      const { x: roadX } = getRoadSpline(cz);

      // Stack of 3x2 containers
      for (let stackY = 0; stackY < 3; stackY++) {
        const cMat = new THREE.MeshStandardMaterial({
          color: containerColors[(Math.floor(cz / 35) + stackY) % containerColors.length],
          roughness: 0.6,
          metalness: 0.4,
        });
        const containerBox = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.0, 14), cMat);
        containerBox.position.set(roadX - 32 + (stackY % 2) * 2, 1.5 + stackY * 3.0, cz);
        this.structuresGroup.add(containerBox);
        if (this.collisionSystem && stackY === 0) {
          this.collisionSystem.registerBox('Harbor Shipping Container', roadX - 32, cz, 7, 14.5, 9, true, containerBox);
        }
      }
    }
  }

  private createSuspensionBridgePylon(): THREE.Group {
    const pylon = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.7 }); // Golden Gate / Tokyo Bay amber
    const cableMat = new THREE.LineBasicMaterial({ color: 0xf8fafc, linewidth: 2 });

    // Left & Right Giant Steel Towers (68m tall)
    const towerL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 68, 2.8), steelMat);
    towerL.position.set(-10.5, 34, 0);
    pylon.add(towerL);

    const towerR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 68, 2.8), steelMat);
    towerR.position.set(10.5, 34, 0);
    pylon.add(towerR);

    // Cross Beams
    const beamTop = new THREE.Mesh(new THREE.BoxGeometry(23, 2.5, 2.4), steelMat);
    beamTop.position.set(0, 62, 0);
    pylon.add(beamTop);

    const beamMid = new THREE.Mesh(new THREE.BoxGeometry(23, 2.0, 2.4), steelMat);
    beamMid.position.set(0, 38, 0);
    pylon.add(beamMid);

    // Diagonal Suspension Cables
    for (let c = 1; c <= 6; c++) {
      const zOffset = c * 18;
      const ptsL = [new THREE.Vector3(-10.5, 62, 0), new THREE.Vector3(-8.5, 1.5, zOffset)];
      pylon.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsL), cableMat));

      const ptsLBack = [new THREE.Vector3(-10.5, 62, 0), new THREE.Vector3(-8.5, 1.5, -zOffset)];
      pylon.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsLBack), cableMat));

      const ptsR = [new THREE.Vector3(10.5, 62, 0), new THREE.Vector3(8.5, 1.5, zOffset)];
      pylon.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsR), cableMat));

      const ptsRBack = [new THREE.Vector3(10.5, 62, 0), new THREE.Vector3(8.5, 1.5, -zOffset)];
      pylon.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsRBack), cableMat));
    }

    return pylon;
  }
}
