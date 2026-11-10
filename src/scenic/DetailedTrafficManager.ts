import * as THREE from 'three';
import { getRoadSpline } from './HighwaySpline';
import { FancyVehicleBuilder } from './FancyVehicles';

export interface TrafficCar {
  mesh: THREE.Group;
  speed: number;
  laneX: number; // offset relative to road center (-4.2, 0, +4.2)
  z: number;
  width: number;
  length: number;
  isBraking: boolean;
  carType: string;
}

export interface CollisionResult {
  hasCrash: boolean;
  speedPenalty: number;
  impulseX: number;
  impulseZ: number;
  damage: number;
  contactPoint: THREE.Vector3;
}

/**
 * DetailedTrafficManager - Populates the dedicated city map with diverse high-end traffic:
 * Screaming Formula 1 cars (240+ km/h), Rolls-Royce Phantom luxury saloons,
 * tuned supercars, kei delivery vans, and Tokyo taxis.
 */
export class DetailedTrafficManager {
  public group: THREE.Group;
  public cars: TrafficCar[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.spawnHighEndTraffic();
  }

  private spawnHighEndTraffic() {
    // Diverse roster of vehicles with distinct speeds across 3 lanes
    const configs = [
      { type: 'f1', color: 0xdc2626, lane: 4.2, z: 60, speed: 230 },        // Red F1 Grand Prix Racer
      { type: 'rolls', color: 0x0f172a, lane: -4.2, z: 120, speed: 85 },     // Rolls-Royce Phantom Luxury
      { type: 'sports', color: 0x2563eb, lane: 0.0, z: 200, speed: 175 },    // Blue Tuned Supercar
      { type: 'f1', color: 0x16a34a, lane: 4.2, z: 320, speed: 245 },        // Green F1 Racer
      { type: 'rolls', color: 0x475569, lane: -4.2, z: 460, speed: 90 },     // Silver Rolls-Royce Ghost
      { type: 'sports', color: 0xf59e0b, lane: 0.0, z: 620, speed: 165 },    // Amber Supercar
      { type: 'taxi', color: 0x15803d, lane: -4.2, z: 780, speed: 75 },      // Tokyo Green Taxi
      { type: 'delivery', color: 0xffffff, lane: 4.2, z: 950, speed: 70 },   // White Delivery Van
      { type: 'sports', color: 0xd946ef, lane: 0.0, z: 1140, speed: 190 },   // Magenta GT Supercar
      { type: 'rolls', color: 0x1e1b4b, lane: -4.2, z: 1350, speed: 95 },    // Royal Purple Rolls-Royce
      { type: 'f1', color: 0x0284c7, lane: 4.2, z: 1550, speed: 260 },       // Cyan F1 Racer
      { type: 'sports', color: 0xef4444, lane: 0.0, z: 1800, speed: 180 },   // Crimson Supercar
    ];

    for (const cfg of configs) {
      let carMesh: THREE.Group;
      let width = 1.85;
      let length = 4.2;

      if (cfg.type === 'f1') {
        carMesh = FancyVehicleBuilder.createF1Car(cfg.color);
        width = 2.0;
        length = 4.8;
      } else if (cfg.type === 'rolls') {
        carMesh = FancyVehicleBuilder.createRollsRoyce(cfg.color, 0xf1f5f9);
        width = 2.0;
        length = 5.4;
      } else {
        carMesh = this.createStandardTrafficCar(cfg.type, cfg.color);
      }

      this.group.add(carMesh);

      const { x: roadX, rotY } = getRoadSpline(cfg.z);
      carMesh.position.set(roadX + cfg.lane, 0, cfg.z);
      carMesh.rotation.y = rotY;

      this.cars.push({
        mesh: carMesh,
        speed: cfg.speed,
        laneX: cfg.lane,
        z: cfg.z,
        width,
        length,
        isBraking: false,
        carType: cfg.type,
      });
    }
  }

  private createStandardTrafficCar(type: string, bodyColor: number): THREE.Group {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.25, metalness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });

    // Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.45, 4.3), bodyMat);
    chassis.position.y = 0.45;
    car.add(chassis);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.58, 2.1), glassMat);
    cabin.position.set(0, 0.96, -0.2);
    car.add(cabin);

    // Spoiler on sports
    if (type === 'sports') {
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 0.32), blackMat);
      spoiler.position.set(0, 0.74, -2.1);
      car.add(spoiler);
    }

    // 4 Wheels
    const wGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12);
    wGeo.rotateZ(Math.PI / 2);
    for (const [x, z] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) {
      const wheel = new THREE.Mesh(wGeo, blackMat);
      wheel.position.set(x, 0.33, z);
      car.add(wheel);
    }

    // Lights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.05), hlMat);
    hlL.position.set(-0.64, 0.6, 2.15);
    car.add(hlL);
    const hlR = hlL.clone();
    hlR.position.x = 0.64;
    car.add(hlR);

    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 0.05), tlMat);
    tl.position.set(0, 0.62, -2.15);
    car.add(tl);

    return car;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerSpeedKmh: number
  ): CollisionResult {
    let hasCrash = false;
    let speedPenalty = 1.0;
    let impulseX = 0;
    let impulseZ = 0;
    let damage = 0;
    const contactPoint = new THREE.Vector3();

    const playerHalfW = 1.0;
    const playerHalfL = 2.2;

    for (const car of this.cars) {
      // 1. Advance along road
      car.z += (car.speed / 3.6) * delta;

      const { x: roadX, rotY } = getRoadSpline(car.z);
      const worldCarX = roadX + car.laneX;

      // 2. Collision Check Against Player
      const dx = Math.abs(playerPos.x - worldCarX);
      const dz = Math.abs(playerPos.z - car.z);
      const overlapX = (playerHalfW + car.width * 0.5) - dx;
      const overlapZ = (playerHalfL + car.length * 0.5) - dz;

      if (overlapX > 0 && overlapZ > 0) {
        hasCrash = true;
        contactPoint.set(
          (playerPos.x + worldCarX) * 0.5,
          0.6,
          (playerPos.z + car.z) * 0.5
        );

        const relativeSpeed = Math.abs(playerSpeedKmh - car.speed);
        const crashSeverity = Math.min(50, 15 + relativeSpeed * 0.6);

        if (overlapZ < overlapX) {
          if (playerPos.z < car.z) {
            speedPenalty = 0.35;
            impulseZ = -12.0;
            damage = crashSeverity;
            car.z += 3.5;
            car.speed += 30;
          } else {
            speedPenalty = 0.8;
            impulseZ = 6.0;
            damage = crashSeverity * 0.6;
            car.speed = Math.max(20, playerSpeedKmh - 20);
          }
        } else {
          const pushDir = playerPos.x > worldCarX ? 1 : -1;
          impulseX = pushDir * 6.5;
          speedPenalty = 0.7;
          damage = crashSeverity * 0.5;
          car.laneX -= pushDir * 0.8;
        }
      }

      // 3. Traffic Loop Far Behind / Ahead (Seamless 2400m circuit wrap)
      if (car.z < playerPos.z - 80) {
        car.z = playerPos.z + 320 + Math.random() * 120;
      } else if (car.z > playerPos.z + 480) {
        car.z = playerPos.z - 60;
      }

      car.mesh.position.set(worldCarX, 0, car.z);
      car.mesh.rotation.y = rotY;
    }

    return { hasCrash, speedPenalty, impulseX, impulseZ, damage, contactPoint };
  }
}
