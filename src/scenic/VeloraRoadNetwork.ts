import * as THREE from 'three';
import { VELORA_MAP_SIZE, GRID_CELL_SIZE } from './VeloraWorldData';

export interface RoadSegment {
  id: string;
  name: string;
  p1: THREE.Vector2; // start (x, z)
  p2: THREE.Vector2; // end (x, z)
  width: number;
  lanes: number;
  speedLimit: number;
  category: 'highway' | 'boulevard' | 'arterial' | 'residential' | 'narrow';
}

/**
 * VeloraRoadNetwork - Interconnected 4,000m x 4,000m driveable road grid
 * featuring Highways (30m), Boulevards (24m), Arterials (16m), Residential roads (10m),
 * and Narrow technical streets (7m).
 *
 * Implements the 3 connected major routes + Ring Road:
 * 1. The Downtown Loop
 * 2. The Residential Run
 * 3. The Grand Highway & Bridge
 */
export class VeloraRoadNetwork {
  public group: THREE.Group;
  public roadSegments: RoadSegment[] = [];
  public terrainMesh: THREE.Mesh;

  constructor() {
    this.group = new THREE.Group();

    // 1. Base 4x4 KM Ground Terrain (Velora Peninsula & River Basin)
    this.terrainMesh = this.createVeloraTerrain();
    this.group.add(this.terrainMesh);

    // 2. Define Highway & Arterial Network
    this.defineRoadNetwork();

    // 3. Generate 3D Road Meshes & Intersection Markings
    this.build3DRoadMesh();
  }

  private createVeloraTerrain(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(VELORA_MAP_SIZE + 400, VELORA_MAP_SIZE + 400, 48, 48);
    geo.rotateX(-Math.PI / 2);

    // Subtle elevation: Elite Hills (northeast X>500, Z<-1000) rises gently up to +45 meters!
    // River valley (Z between 1000 and 1600) dips down to 0!
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let y = 0.0;
      // Elite Hills elevation in NE
      if (x > 500 && z < -500) {
        const factorX = (x - 500) / 1500;
        const factorZ = (-500 - z) / 1500;
        y = Math.min(48, factorX * factorZ * 65);
      }
      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rich coastal city landmass terrain
    ctx.fillStyle = '#0f172a'; // Base urban foundation
    ctx.fillRect(0, 0, 512, 512);

    // Green residential parks in NW and Suburbs in SW
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2); // Green Heights
    ctx.arc(64, 440, 80, 0, Math.PI * 2); // Outer Suburbs
    ctx.fill();

    // River Water Channel (flowing through South across Riverfront and Bridge District)
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(0, 400);
    ctx.bezierCurveTo(180, 380, 320, 430, 512, 410);
    ctx.lineTo(512, 460);
    ctx.bezierCurveTo(320, 480, 180, 440, 0, 460);
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.15,
    });

    return new THREE.Mesh(geo, mat);
  }

  private defineRoadNetwork() {
    // A. Outer Perimeter Highway (30m wide, 6 lanes, speed 140 km/h)
    // Runs around X: ±1800, Z: ±1800
    this.addSegment('H_NORTH', new THREE.Vector2(-1800, -1800), new THREE.Vector2(1800, -1800), 30, 6, 140, 'highway');
    this.addSegment('H_EAST', new THREE.Vector2(1800, -1800), new THREE.Vector2(1800, 1800), 30, 6, 140, 'highway');
    this.addSegment('H_SOUTH', new THREE.Vector2(1800, 1800), new THREE.Vector2(-1800, 1800), 30, 6, 140, 'highway');
    this.addSegment('H_WEST', new THREE.Vector2(-1800, 1800), new THREE.Vector2(-1800, -1800), 30, 6, 140, 'highway');

    // B. Central Grand Boulevards (24m wide, 6 lanes, speed 90 km/h)
    // 1. Central North-South Boulevard (X = 0, through Downtown, Civic Centre, Transit, Riverfront)
    this.addSegment('B_CENTRAL_NS', new THREE.Vector2(0, -1800), new THREE.Vector2(0, 1800), 24, 6, 90, 'boulevard');
    // 2. Central East-West Expressway (Z = 0, through Industrial, Civic Centre, Midtown, Commercial)
    this.addSegment('B_CENTRAL_EW', new THREE.Vector2(-1800, 0), new THREE.Vector2(1800, 0), 24, 6, 90, 'boulevard');

    // C. Major City Arterials (16m wide, 4 lanes, speed 80 km/h)
    // North Arterial (Z = -1000, between Northern Metropolitan and Central Districts)
    this.addSegment('A_NORTH_EW', new THREE.Vector2(-1800, -1000), new THREE.Vector2(1800, -1000), 18, 4, 80, 'arterial');
    // South Arterial (Z = 1000, between Central and Southern Districts)
    this.addSegment('A_SOUTH_EW', new THREE.Vector2(-1800, 1000), new THREE.Vector2(1800, 1000), 18, 4, 80, 'arterial');
    // West Arterial (X = -1000, connecting Green Heights, Old Town, Industrial, Suburbs)
    this.addSegment('A_WEST_NS', new THREE.Vector2(-1000, -1800), new THREE.Vector2(-1000, 1800), 18, 4, 80, 'arterial');
    // East Arterial (X = 1000, connecting Elite Hills, Luxury Enclave, Commercial, Highway)
    this.addSegment('A_EAST_NS', new THREE.Vector2(1000, -1800), new THREE.Vector2(1000, 1800), 18, 4, 80, 'arterial');

    // D. The 3 Major Racing & Scenic Routes:
    // 1. The Downtown Loop (Downtown West & East: X = -500 to 500, Z = -1500)
    this.addSegment('R_DT_NORTH', new THREE.Vector2(-1000, -1500), new THREE.Vector2(1000, -1500), 20, 4, 80, 'boulevard');
    this.addSegment('R_DT_WEST', new THREE.Vector2(-500, -1800), new THREE.Vector2(-500, -1000), 20, 4, 80, 'boulevard');
    this.addSegment('R_DT_EAST', new THREE.Vector2(500, -1800), new THREE.Vector2(500, -1000), 20, 4, 80, 'boulevard');

    // 2. The Residential Run (Green Heights, Midtown, Housing Colony, Commercial: Z = -500 & 500)
    this.addSegment('R_RES_MID', new THREE.Vector2(-1800, -500), new THREE.Vector2(1800, -500), 14, 2, 60, 'residential');
    this.addSegment('R_RES_COLONY', new THREE.Vector2(-1800, 500), new THREE.Vector2(1800, 500), 14, 2, 60, 'residential');

    // 3. Old Town Narrow Technical Streets (7m wide, speed 50 km/h)
    this.addSegment('R_OLD_1', new THREE.Vector2(-1500, -1000), new THREE.Vector2(-1500, 0), 8, 2, 50, 'narrow');
    this.addSegment('R_OLD_2', new THREE.Vector2(-1800, -350), new THREE.Vector2(-1000, -350), 8, 2, 50, 'narrow');
    this.addSegment('R_OLD_3', new THREE.Vector2(-1800, -650), new THREE.Vector2(-1000, -650), 8, 2, 50, 'narrow');

    // 4. Velora Grand Bridge Span (District 15: Across river at X = 500, Z: 1200 to 1800)
    this.addSegment('R_BRIDGE_SPAN', new THREE.Vector2(500, 1100), new THREE.Vector2(500, 1800), 22, 4, 100, 'boulevard');

    // 5. Riverfront Sunset Promenade Drive (District 14: X = -1000 to 0, Z = 1450)
    this.addSegment('R_RIVER_DRIVE', new THREE.Vector2(-1200, 1400), new THREE.Vector2(400, 1400), 16, 2, 60, 'arterial');
  }

  private addSegment(
    id: string,
    p1: THREE.Vector2,
    p2: THREE.Vector2,
    width: number,
    lanes: number,
    speedLimit: number,
    category: 'highway' | 'boulevard' | 'arterial' | 'residential' | 'narrow'
  ) {
    this.roadSegments.push({
      id,
      name: id.replace(/_/g, ' '),
      p1,
      p2,
      width,
      lanes,
      speedLimit,
      category,
    });
  }

  private build3DRoadMesh() {
    const roadMat = this.createProceduralRoadTextureMaterial();

    for (const seg of this.roadSegments) {
      const len = seg.p1.distanceTo(seg.p2);
      const angle = Math.atan2(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y);
      const mid = new THREE.Vector2().addVectors(seg.p1, seg.p2).multiplyScalar(0.5);

      // Road asphalt slab
      const geo = new THREE.PlaneGeometry(seg.width, len);
      geo.rotateX(-Math.PI / 2);

      const mesh = new THREE.Mesh(geo, roadMat);
      mesh.position.set(mid.x, 0.08, mid.y);
      mesh.rotation.y = angle;
      this.group.add(mesh);

      // Steel Armco Guardrails for Highways
      if (seg.category === 'highway') {
        const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
        const halfW = seg.width / 2;

        const railL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, len), railMat);
        railL.position.set(-halfW + 0.15, 0.45, 0);
        mesh.add(railL);

        const railR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, len), railMat);
        railR.position.set(halfW - 0.15, 0.45, 0);
        mesh.add(railR);
      }
    }
  }

  private createProceduralRoadTextureMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Inky asphalt
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 1024);

    // Subtle grain
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2);
    }

    // Outer edge solid yellow lines
    ctx.fillStyle = '#facc15';
    ctx.fillRect(16, 0, 10, 1024);
    ctx.fillRect(512 - 26, 0, 10, 1024);

    // Dashed white center dividers
    ctx.fillStyle = '#ffffff';
    for (let y = 16; y < 1024; y += 64) {
      ctx.fillRect(170, y, 8, 36);
      ctx.fillRect(342, y, 8, 36);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 16);

    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.25,
      metalness: 0.35,
    });
  }

  /**
   * Snaps or clamps car physics to road network or allows free-roaming off-road driving
   */
  public getClosestRoadPoint(pos: THREE.Vector3): { distance: number; normal: THREE.Vector2; speedLimit: number } {
    let closestDist = Infinity;
    let closestLimit = 80;
    const p2d = new THREE.Vector2(pos.x, pos.z);

    for (const seg of this.roadSegments) {
      const v = seg.p2.clone().sub(seg.p1);
      const w = p2d.clone().sub(seg.p1);
      const c1 = w.dot(v);
      const c2 = v.dot(v);

      let b = 0;
      if (c1 > 0) b = Math.min(1, c1 / c2);

      const pb = seg.p1.clone().add(v.multiplyScalar(b));
      const dist = p2d.distanceTo(pb);

      if (dist < closestDist) {
        closestDist = dist;
        closestLimit = seg.speedLimit;
      }
    }

    return {
      distance: closestDist,
      normal: new THREE.Vector2(0, 1),
      speedLimit: closestLimit,
    };
  }
}
