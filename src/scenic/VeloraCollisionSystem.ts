import * as THREE from 'three';

export interface StructureCollider {
  id: string;
  name: string;
  shape: 'box' | 'circle';
  // Center in world coordinates (X, Z)
  cx: number;
  cz: number;
  // Bounding box dimensions
  halfW: number;
  halfD: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  // Bounding circle dimension
  radius: number;
  height: number;
  // Destruction properties
  destructible: boolean;
  isDestroyed: boolean;
  meshRef?: THREE.Object3D;
  initialScaleY?: number;
  initialRotZ?: number;
}

export interface CollisionResult {
  hasCollision: boolean;
  newPos: THREE.Vector3;
  newSpeed: number;
  damage: number;
  cameraShake: number;
  colliderName: string;
  contactPoint: THREE.Vector3;
  crashedThrough: boolean;
  normal: THREE.Vector2;
}

/**
 * VeloraCollisionSystem - 3D Physical Collision & Crash-Through Engine.
 *
 * Implements:
 * 1. 2D/3D Spatial Hash Grid for high-speed sub-millisecond collision queries.
 * 2. Solid wall stopping & recoil physics preventing ghosting through buildings.
 * 3. High-velocity crash-through destruction for residential homes & structures.
 * 4. Realistic 3D impact sparks, debris shards, and smoke explosion effects.
 */
export class VeloraCollisionSystem {
  public colliders: StructureCollider[] = [];
  private grid: Map<string, StructureCollider[]> = new Map();
  private readonly CELL_SIZE = 120; // 120m grid cell partition
  private debrisGroup: THREE.Group;

  // Particle systems for crash effects
  private sparkParticles: THREE.Points;
  private sparkPositions: Float32Array;
  private sparkVelocities: Float32Array;
  private sparkAges: Float32Array;
  private readonly SPARK_COUNT = 80;

  private smokeParticles: THREE.Points;
  private smokePositions: Float32Array;
  private smokeVelocities: Float32Array;
  private smokeAges: Float32Array;
  private readonly SMOKE_COUNT = 60;

  // Debris fragments (tumbling 3D blocks)
  private debrisMeshes: THREE.Mesh[] = [];
  private debrisVelocities: THREE.Vector3[] = [];
  private debrisRotations: THREE.Vector3[] = [];
  private readonly DEBRIS_COUNT = 24;

  constructor() {
    this.debrisGroup = new THREE.Group();
    this.debrisGroup.name = 'velora_crash_debris_group';

    // 1. Spark particle pool
    const sparkGeo = new THREE.BufferGeometry();
    this.sparkPositions = new Float32Array(this.SPARK_COUNT * 3);
    this.sparkVelocities = new Float32Array(this.SPARK_COUNT * 3);
    this.sparkAges = new Float32Array(this.SPARK_COUNT);

    for (let i = 0; i < this.SPARK_COUNT; i++) {
      this.sparkPositions[i * 3 + 1] = -999; // offscreen
      this.sparkAges[i] = 999;
    }

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.85,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sparkParticles = new THREE.Points(sparkGeo, sparkMat);
    this.debrisGroup.add(this.sparkParticles);

    // 2. Smoke particle pool
    const smokeGeo = new THREE.BufferGeometry();
    this.smokePositions = new Float32Array(this.SMOKE_COUNT * 3);
    this.smokeVelocities = new Float32Array(this.SMOKE_COUNT * 3);
    this.smokeAges = new Float32Array(this.SMOKE_COUNT);

    for (let i = 0; i < this.SMOKE_COUNT; i++) {
      this.smokePositions[i * 3 + 1] = -999;
      this.smokeAges[i] = 999;
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 2.2,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.debrisGroup.add(this.smokeParticles);

    // 3. Physical tumbling concrete / wood chunks
    const fragGeo = new THREE.BoxGeometry(0.5, 0.4, 0.6);
    const fragMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.8,
    });

    for (let i = 0; i < this.DEBRIS_COUNT; i++) {
      const mesh = new THREE.Mesh(fragGeo, fragMat);
      mesh.visible = false;
      this.debrisMeshes.push(mesh);
      this.debrisVelocities.push(new THREE.Vector3());
      this.debrisRotations.push(new THREE.Vector3());
      this.debrisGroup.add(mesh);
    }
  }

  public getVisualGroup(): THREE.Group {
    return this.debrisGroup;
  }

  /**
   * Registers an Axis-Aligned Box structure collider
   */
  public registerBox(
    name: string,
    cx: number,
    cz: number,
    w: number,
    d: number,
    height: number = 10,
    destructible: boolean = false,
    mesh?: THREE.Object3D
  ): StructureCollider {
    const halfW = w / 2;
    const halfD = d / 2;

    const collider: StructureCollider = {
      id: `box_${this.colliders.length}_${name}`,
      name,
      shape: 'box',
      cx,
      cz,
      halfW,
      halfD,
      minX: cx - halfW,
      maxX: cx + halfW,
      minZ: cz - halfD,
      maxZ: cz + halfD,
      radius: Math.sqrt(halfW * halfW + halfD * halfD),
      height,
      destructible,
      isDestroyed: false,
      meshRef: mesh,
      initialScaleY: mesh ? mesh.scale.y : 1,
      initialRotZ: mesh ? mesh.rotation.z : 0,
    };

    this.colliders.push(collider);
    this.insertIntoGrid(collider);
    return collider;
  }

  /**
   * Registers a Cylindrical / Circular structure collider (Tanks, Stadium, Showroom, Trees)
   */
  public registerCircle(
    name: string,
    cx: number,
    cz: number,
    radius: number,
    height: number = 10,
    destructible: boolean = false,
    mesh?: THREE.Object3D
  ): StructureCollider {
    const collider: StructureCollider = {
      id: `circle_${this.colliders.length}_${name}`,
      name,
      shape: 'circle',
      cx,
      cz,
      halfW: radius,
      halfD: radius,
      minX: cx - radius,
      maxX: cx + radius,
      minZ: cz - radius,
      maxZ: cz + radius,
      radius,
      height,
      destructible,
      isDestroyed: false,
      meshRef: mesh,
      initialScaleY: mesh ? mesh.scale.y : 1,
      initialRotZ: mesh ? mesh.rotation.z : 0,
    };

    this.colliders.push(collider);
    this.insertIntoGrid(collider);
    return collider;
  }

  private getGridKey(gx: number, gz: number): string {
    return `${gx}_${gz}`;
  }

  private insertIntoGrid(c: StructureCollider) {
    const minGX = Math.floor(c.minX / this.CELL_SIZE);
    const maxGX = Math.floor(c.maxX / this.CELL_SIZE);
    const minGZ = Math.floor(c.minZ / this.CELL_SIZE);
    const maxGZ = Math.floor(c.maxZ / this.CELL_SIZE);

    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gz = minGZ; gz <= maxGZ; gz++) {
        const key = this.getGridKey(gx, gz);
        let list = this.grid.get(key);
        if (!list) {
          list = [];
          this.grid.set(key, list);
        }
        list.push(c);
      }
    }
  }

  /**
   * Tests and resolves car collision against all nearby buildings.
   * Prevents walking through walls, provides realistic bounce and crash damage,
   * or triggers high-speed crash-through destruction!
   */
  public checkAndResolveCollision(
    carPos: THREE.Vector3,
    carHeading: number,
    speedKmh: number,
    _delta: number,
    isBoosting: boolean
  ): CollisionResult {
    const result: CollisionResult = {
      hasCollision: false,
      newPos: carPos.clone(),
      newSpeed: speedKmh,
      damage: 0,
      cameraShake: 0,
      colliderName: '',
      contactPoint: new THREE.Vector3(),
      crashedThrough: false,
      normal: new THREE.Vector2(0, 1),
    };

    // Effective car bumper collision radius
    const carRadius = 1.35;
    // Front bumper test point in world space
    const frontOffset = 1.95;
    const fx = carPos.x + Math.sin(carHeading) * frontOffset;
    const fz = carPos.z + Math.cos(carHeading) * frontOffset;

    // Center test point
    const cx = carPos.x;
    const cz = carPos.z;

    // Retrieve nearby candidates from spatial grid
    const centerGX = Math.floor(cx / this.CELL_SIZE);
    const centerGZ = Math.floor(cz / this.CELL_SIZE);

    const testedIds = new Set<string>();

    for (let gx = centerGX - 1; gx <= centerGX + 1; gx++) {
      for (let gz = centerGZ - 1; gz <= centerGZ + 1; gz++) {
        const list = this.grid.get(this.getGridKey(gx, gz));
        if (!list) continue;

        for (const collider of list) {
          if (testedIds.has(collider.id)) continue;
          testedIds.add(collider.id);

          if (collider.isDestroyed) continue; // Already smashed through

          // Test collision using front bumper point and center point
          const hit = this.testPointAgainstCollider(fx, fz, carRadius, collider) ||
                      this.testPointAgainstCollider(cx, cz, carRadius * 1.1, collider);

          if (hit) {
            result.hasCollision = true;
            result.colliderName = collider.name;
            result.normal.copy(hit.normal);
            result.contactPoint.set(hit.contactX, 1.0, hit.contactZ);

            // Check if high-speed or nitro crash-through applies for destructible buildings/homes
            const canCrashThrough = collider.destructible && (speedKmh > 48 || isBoosting);

            if (canCrashThrough) {
              // --- CRASH THROUGH DESTRUCTION! ---
              result.crashedThrough = true;
              collider.isDestroyed = true;

              // Deform / collapse building mesh
              if (collider.meshRef) {
                collider.meshRef.scale.y = 0.12;
                collider.meshRef.position.y = -0.5;
                collider.meshRef.rotation.z = (Math.random() - 0.5) * 0.4;
              }

              // Explosive flying debris & sparks
              this.spawnExplosiveDebris(result.contactPoint, carHeading, speedKmh * 1.5);

              // Maintain thrilling forward momentum, but with high impact crunch
              result.newSpeed = Math.max(25, speedKmh * 0.72);
              result.damage = Math.min(45, Math.floor(15 + speedKmh * 0.15));
              result.cameraShake = Math.min(1.2, 0.6 + speedKmh * 0.006);

            } else {
              // --- SOLID PHYSICAL OBSTRUCTION (NO PASSING THROUGH) ---
              // Push car position out along collision normal so it NEVER passes through
              result.newPos.x += hit.normal.x * hit.penetration;
              result.newPos.z += hit.normal.y * hit.penetration;

              // High-speed impact mechanics
              if (speedKmh > 12) {
                // Bounce / Recoil backward
                result.newSpeed = -Math.min(35, speedKmh * 0.38);
                result.damage = Math.min(70, Math.floor(speedKmh * 0.42 + 8));
                result.cameraShake = Math.min(1.4, 0.45 + (speedKmh / 160) * 0.65);

                // Spawn collision sparks and smoke
                this.spawnImpactSparksAndSmoke(result.contactPoint, hit.normal, speedKmh);
              } else {
                result.newSpeed = 0;
              }
            }

            return result; // Resolve first primary collision
          }
        }
      }
    }

    return result;
  }

  private testPointAgainstCollider(
    px: number,
    pz: number,
    radius: number,
    c: StructureCollider
  ): { normal: THREE.Vector2; penetration: number; contactX: number; contactZ: number } | null {
    if (c.shape === 'circle') {
      const dx = px - c.cx;
      const dz = pz - c.cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = radius + c.radius;

      if (dist < minDist) {
        const pen = minDist - dist;
        const nx = dist > 0.001 ? dx / dist : 0;
        const nz = dist > 0.001 ? dz / dist : 1;
        return {
          normal: new THREE.Vector2(nx, nz),
          penetration: pen + 0.1, // extra safety margin
          contactX: c.cx + nx * c.radius,
          contactZ: c.cz + nz * c.radius,
        };
      }
      return null;
    }

    // Box Collision: Closest point on AABB
    const closestX = Math.max(c.minX, Math.min(c.maxX, px));
    const closestZ = Math.max(c.minZ, Math.min(c.maxZ, pz));

    const dx = px - closestX;
    const dz = pz - closestZ;
    const distSq = dx * dx + dz * dz;

    // Check if inside box
    const inside = px >= c.minX && px <= c.maxX && pz >= c.minZ && pz <= c.maxZ;

    if (inside) {
      // Find closest edge to push out
      const distLeft = px - c.minX;
      const distRight = c.maxX - px;
      const distTop = pz - c.minZ;
      const distBottom = c.maxZ - pz;
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);

      let nx = 0;
      let nz = 0;
      if (minDist === distLeft) nx = -1;
      else if (minDist === distRight) nx = 1;
      else if (minDist === distTop) nz = -1;
      else nz = 1;

      return {
        normal: new THREE.Vector2(nx, nz),
        penetration: minDist + radius + 0.2,
        contactX: closestX,
        contactZ: closestZ,
      };
    }

    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const nx = dist > 0.001 ? dx / dist : 0;
      const nz = dist > 0.001 ? dz / dist : 1;
      const pen = radius - dist;

      return {
        normal: new THREE.Vector2(nx, nz),
        penetration: pen + 0.1,
        contactX: closestX,
        contactZ: closestZ,
      };
    }

    return null;
  }

  /**
   * Spawns physical flying debris, sparks, and concrete/wood rubble on crash-through
   */
  public spawnExplosiveDebris(point: THREE.Vector3, heading: number, speed: number) {
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);

    // 1. Activate tumbling debris meshes
    for (let i = 0; i < this.DEBRIS_COUNT; i++) {
      const m = this.debrisMeshes[i];
      m.visible = true;
      m.position.set(
        point.x + (Math.random() - 0.5) * 2.5,
        point.y + 0.4 + Math.random() * 1.2,
        point.z + (Math.random() - 0.5) * 2.5
      );

      const vel = this.debrisVelocities[i];
      vel.set(
        forwardX * (speed * 0.12) + (Math.random() - 0.5) * 14,
        6 + Math.random() * 12,
        forwardZ * (speed * 0.12) + (Math.random() - 0.5) * 14
      );

      const rot = this.debrisRotations[i];
      rot.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16
      );
    }

    // 2. High-density Sparks & Smoke burst
    this.spawnImpactSparksAndSmoke(point, new THREE.Vector2(forwardX, forwardZ), speed * 1.2);
  }

  /**
   * Spawns hot metal sparks and billowing dust/smoke on hard collision
   */
  public spawnImpactSparksAndSmoke(point: THREE.Vector3, normal: THREE.Vector2, speed: number) {
    const sparkCount = Math.min(this.SPARK_COUNT, Math.floor(25 + speed * 0.4));
    for (let i = 0; i < sparkCount; i++) {
      this.sparkPositions[i * 3] = point.x + (Math.random() - 0.5) * 0.8;
      this.sparkPositions[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.6;
      this.sparkPositions[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.8;

      const spread = (Math.random() - 0.5) * 18;
      this.sparkVelocities[i * 3] = normal.x * (6 + Math.random() * 12) + spread;
      this.sparkVelocities[i * 3 + 1] = 4 + Math.random() * 10;
      this.sparkVelocities[i * 3 + 2] = normal.y * (6 + Math.random() * 12) + spread;
      this.sparkAges[i] = 0;
    }

    const smokeCount = Math.min(this.SMOKE_COUNT, Math.floor(15 + speed * 0.25));
    for (let i = 0; i < smokeCount; i++) {
      this.smokePositions[i * 3] = point.x + (Math.random() - 0.5) * 1.5;
      this.smokePositions[i * 3 + 1] = point.y + Math.random() * 0.8;
      this.smokePositions[i * 3 + 2] = point.z + (Math.random() - 0.5) * 1.5;

      this.smokeVelocities[i * 3] = normal.x * 2.5 + (Math.random() - 0.5) * 4;
      this.smokeVelocities[i * 3 + 1] = 2.0 + Math.random() * 3.5;
      this.smokeVelocities[i * 3 + 2] = normal.y * 2.5 + (Math.random() - 0.5) * 4;
      this.smokeAges[i] = 0;
    }

    const sparkAttr = this.sparkParticles.geometry.attributes.position as THREE.BufferAttribute;
    sparkAttr.needsUpdate = true;
    const smokeAttr = this.smokeParticles.geometry.attributes.position as THREE.BufferAttribute;
    smokeAttr.needsUpdate = true;
  }

  /**
   * Updates animated debris and particles each frame
   */
  public update(delta: number) {
    const gravity = -24;

    // 1. Update Physical Debris Chunks
    for (let i = 0; i < this.DEBRIS_COUNT; i++) {
      const m = this.debrisMeshes[i];
      if (!m.visible) continue;

      const vel = this.debrisVelocities[i];
      const rot = this.debrisRotations[i];

      vel.y += gravity * delta;
      m.position.x += vel.x * delta;
      m.position.y += vel.y * delta;
      m.position.z += vel.z * delta;

      m.rotation.x += rot.x * delta;
      m.rotation.y += rot.y * delta;
      m.rotation.z += rot.z * delta;

      // Ground bounce
      if (m.position.y < 0.25) {
        m.position.y = 0.25;
        vel.y = -vel.y * 0.35;
        vel.x *= 0.65;
        vel.z *= 0.65;

        // If resting, hide after settling
        if (Math.abs(vel.y) < 0.8) {
          vel.set(0, 0, 0);
        }
      }
    }

    // 2. Update Sparks
    let sparkActive = false;
    for (let i = 0; i < this.SPARK_COUNT; i++) {
      if (this.sparkAges[i] > 1.2) continue;
      sparkActive = true;
      this.sparkAges[i] += delta;

      this.sparkVelocities[i * 3 + 1] += gravity * delta;
      this.sparkPositions[i * 3] += this.sparkVelocities[i * 3] * delta;
      this.sparkPositions[i * 3 + 1] += this.sparkVelocities[i * 3 + 1] * delta;
      this.sparkPositions[i * 3 + 2] += this.sparkVelocities[i * 3 + 2] * delta;

      if (this.sparkPositions[i * 3 + 1] < 0.05) {
        this.sparkPositions[i * 3 + 1] = 0.05;
        this.sparkVelocities[i * 3 + 1] = -this.sparkVelocities[i * 3 + 1] * 0.25;
      }
    }
    if (sparkActive) {
      (this.sparkParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // 3. Update Smoke
    let smokeActive = false;
    for (let i = 0; i < this.SMOKE_COUNT; i++) {
      if (this.smokeAges[i] > 2.0) continue;
      smokeActive = true;
      this.smokeAges[i] += delta;

      this.smokePositions[i * 3] += this.smokeVelocities[i * 3] * delta;
      this.smokePositions[i * 3 + 1] += this.smokeVelocities[i * 3 + 1] * delta;
      this.smokePositions[i * 3 + 2] += this.smokeVelocities[i * 3 + 2] * delta;
    }
    if (smokeActive) {
      (this.smokeParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  /**
   * Resets all smashed structures back to pristine condition on car repair
   */
  public resetDestroyedStructures() {
    for (const c of this.colliders) {
      if (c.isDestroyed) {
        c.isDestroyed = false;
        if (c.meshRef) {
          c.meshRef.scale.y = c.initialScaleY ?? 1;
          c.meshRef.position.y = 0;
          c.meshRef.rotation.z = c.initialRotZ ?? 0;
        }
      }
    }
    for (const m of this.debrisMeshes) {
      m.visible = false;
    }
  }
}
