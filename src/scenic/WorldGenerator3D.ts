import * as THREE from 'three';
import { EnvironmentTheme } from './AnimeSkybox';

interface TrafficCar {
  mesh: THREE.Group;
  speed: number;
  laneX: number;
  z: number;
  color: number;
  headlightL: THREE.Mesh;
  headlightR: THREE.Mesh;
  taillights: THREE.Mesh;
}

export class WorldGenerator3D {
  public group: THREE.Group;
  public roadGroup: THREE.Group;
  public buildingsGroup: THREE.Group;
  public propsGroup: THREE.Group;
  public foliageGroup: THREE.Group;
  public oceanMesh: THREE.Mesh;
  public rainParticles: THREE.Points;
  public sakuraParticles: THREE.Points;

  // Road geometry & materials
  private roadMaterial: THREE.MeshStandardMaterial;
  private roadWetMaterial: THREE.MeshStandardMaterial;
  private puddlePlanes: THREE.Mesh[] = [];

  // Scenery chunks for infinite continuous driving
  private roadChunks: THREE.Group[] = [];
  private chunkLength = 120;
  private chunkCount = 7; // Total visible road range ~840m
  private currentTheme: EnvironmentTheme = 'countryside';

  // Ambient traffic cars
  private trafficCars: TrafficCar[] = [];

  // Animated elements
  private trainMesh: THREE.Group;
  private trainX = -250;
  private lighthouseBeam: THREE.SpotLight;
  private lighthouseTarget: THREE.Object3D;
  private toriiGateMesh: THREE.Group;
  private vendingMachines: THREE.Group[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.roadGroup = new THREE.Group();
    this.buildingsGroup = new THREE.Group();
    this.propsGroup = new THREE.Group();
    this.foliageGroup = new THREE.Group();

    this.group.add(this.roadGroup);
    this.group.add(this.buildingsGroup);
    this.group.add(this.propsGroup);
    this.group.add(this.foliageGroup);

    // 1. Road Materials
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.75,
      metalness: 0.15,
    });

    this.roadWetMaterial = new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.15,   // High gloss wet asphalt reflection
      metalness: 0.45,
    });

    // 2. Animated Ocean for Coastal Highway
    this.oceanMesh = this.createOcean();
    this.group.add(this.oceanMesh);

    // 3. Weather Particles (Rain and Sakura Petals)
    this.rainParticles = this.createRainSystem();
    this.group.add(this.rainParticles);

    this.sakuraParticles = this.createSakuraSystem();
    this.group.add(this.sakuraParticles);

    // 4. Build Initial Road Chunks
    for (let i = 0; i < this.chunkCount; i++) {
      const chunkZ = i * this.chunkLength - 120;
      const chunk = this.createRoadChunk(chunkZ, i);
      this.roadChunks.push(chunk);
      this.roadGroup.add(chunk);
    }

    // 5. Special Landmarks: Train Crossing, Torii Gate, Lighthouse
    this.trainMesh = this.createJapaneseTrain();
    this.group.add(this.trainMesh);

    const lighthouseObj = this.createLighthouse();
    this.lighthouseBeam = lighthouseObj.beam;
    this.lighthouseTarget = lighthouseObj.target;
    this.group.add(lighthouseObj.group);
    this.group.add(this.lighthouseTarget);

    this.toriiGateMesh = this.createToriiGate();
    this.group.add(this.toriiGateMesh);

    // 6. Spawn Ambient Peaceful Traffic
    this.initTraffic();
  }

  private createOcean(): THREE.Mesh {
    const oceanGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(-280, -2.5, 0); // Positioned to the left of the coastal highway
    ocean.visible = false;
    return ocean;
  }

  private createRainSystem(): THREE.Points {
    const count = 1800;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
      velocities[i] = 45 + Math.random() * 25;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

    const mat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.28,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    points.visible = false;
    return points;
  }

  private createSakuraSystem(): THREE.Points {
    const count = 750;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = 1 + Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    // Delicate pink sakura petal particle
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffb3c6';
    ctx.beginPath();
    ctx.ellipse(16, 16, 12, 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    const petalTex = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      map: petalTex,
      color: 0xffccd5,
      size: 0.75,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    return new THREE.Points(geo, mat);
  }

  private createRoadChunk(chunkZ: number, index: number): THREE.Group {
    const chunk = new THREE.Group();
    chunk.position.z = chunkZ;

    const roadWidth = 14;
    const len = this.chunkLength;

    // 1. Asphalt Road Surface
    const roadGeo = new THREE.PlaneGeometry(roadWidth, len);
    const roadMesh = new THREE.Mesh(
      roadGeo,
      this.currentTheme === 'rain_city' ? this.roadWetMaterial : this.roadMaterial
    );
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.receiveShadow = true;
    chunk.add(roadMesh);

    // 2. Japanese Road Markings
    // Center dashed white line
    const dashCount = Math.floor(len / 8);
    const dashGeo = new THREE.PlaneGeometry(0.24, 4.5);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let d = 0; d < dashCount; d++) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.015, -len / 2 + d * 8 + 4);
      chunk.add(dash);
    }

    // Outer edge solid yellow/white lines
    const edgeGeo = new THREE.PlaneGeometry(0.22, len);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Warm highway yellow
    const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
    leftEdge.rotation.x = -Math.PI / 2;
    leftEdge.position.set(-roadWidth / 2 + 0.5, 0.015, 0);
    chunk.add(leftEdge);

    const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
    rightEdge.rotation.x = -Math.PI / 2;
    rightEdge.position.set(roadWidth / 2 - 0.5, 0.015, 0);
    chunk.add(rightEdge);

    // Pavement Japanese Speed Markings (50 km/h) & Arrows
    if (index % 2 === 0) {
      const marking = this.createRoadKanjiMarking();
      marking.position.set(2.8, 0.02, -15);
      chunk.add(marking);
    }

    // 3. Sidewalks & Curbs
    const curbGeo = new THREE.BoxGeometry(1.6, 0.28, len);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.9 });
    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(-roadWidth / 2 - 0.8, 0.14, 0);
    chunk.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(roadWidth / 2 + 0.8, 0.14, 0);
    chunk.add(rightCurb);

    // 4. Japanese Armco Highway Guardrails with round orange reflector caps
    const guardrail = this.createGuardrail(len);
    guardrail.position.set(roadWidth / 2 + 1.2, 0, 0);
    chunk.add(guardrail);

    const leftGuardrail = this.createGuardrail(len);
    leftGuardrail.position.set(-roadWidth / 2 - 1.2, 0, 0);
    chunk.add(leftGuardrail);

    // 5. Streetlamps (Warm sodium lanterns)
    const lampSpacing = 40;
    for (let l = -len / 2 + 15; l < len / 2; l += lampSpacing) {
      const lamp = this.createStreetLamp();
      lamp.position.set(roadWidth / 2 + 2.4, 0, l);
      chunk.add(lamp);
    }

    // 6. Scenery Elements based on current Theme
    this.populateChunkScenery(chunk, index);

    return chunk;
  }

  private createGuardrail(len: number): THREE.Group {
    const group = new THREE.Group();
    // Horizontal steel rail
    const railGeo = new THREE.BoxGeometry(0.12, 0.35, len);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.y = 0.65;
    group.add(rail);

    // Vertical posts every 4 meters
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
    const reflectorMat = new THREE.MeshBasicMaterial({ color: 0xf97316 }); // Orange reflector cap

    for (let z = -len / 2; z <= len / 2; z += 4) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(0, 0.45, z);
      group.add(post);

      const reflector = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), reflectorMat);
      reflector.rotation.z = Math.PI / 2;
      reflector.position.set(0.08, 0.72, z);
      group.add(reflector);
    }

    return group;
  }

  private createStreetLamp(): THREE.Group {
    const lamp = new THREE.Group();
    // Curved steel pole
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 12);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 3.75;
    lamp.add(pole);

    // Overhang arm
    const armGeo = new THREE.BoxGeometry(2.4, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(-1.0, 7.4, 0);
    lamp.add(arm);

    // Lantern fixture
    const headGeo = new THREE.BoxGeometry(0.7, 0.22, 0.45);
    const head = new THREE.Mesh(headGeo, poleMat);
    head.position.set(-2.0, 7.3, 0);
    lamp.add(head);

    // Glowing bulb
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe28a });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.35), bulbMat);
    bulb.position.set(-2.0, 7.15, 0);
    lamp.add(bulb);

    return lamp;
  }

  private createRoadKanjiMarking(): THREE.Group {
    const g = new THREE.Group();
    // Japanese "50" speed stencil on road
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px "Space Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('50', 64, 128);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.4), mat);
    mesh.rotation.x = -Math.PI / 2;
    g.add(mesh);
    return g;
  }

  private populateChunkScenery(chunk: THREE.Group, index: number) {
    const theme = this.currentTheme;

    if (theme === 'countryside') {
      // 1. Traditional Japanese Country Houses
      if (index % 2 === 0) {
        const houseL = this.createTraditionalHouse();
        houseL.position.set(-24, 0, -25);
        houseL.rotation.y = Math.PI / 6;
        chunk.add(houseL);

        const houseR = this.createTraditionalHouse();
        houseR.position.set(26, 0, 15);
        houseR.rotation.y = -Math.PI / 4;
        chunk.add(houseR);
      }

      // 2. Sakura (Cherry Blossom) & Pine Trees
      for (let z = -45; z <= 45; z += 30) {
        const sakuraL = this.createSakuraTree();
        sakuraL.position.set(-14 - Math.random() * 8, 0, z + (Math.random() - 0.5) * 8);
        chunk.add(sakuraL);

        const sakuraR = this.createSakuraTree();
        sakuraR.position.set(15 + Math.random() * 8, 0, z + 15 + (Math.random() - 0.5) * 8);
        chunk.add(sakuraR);
      }

      // 3. Wooden Utility Poles with Transformer and dangling wires
      const pole = this.createJapaneseUtilityPole();
      pole.position.set(11.5, 0, -35);
      chunk.add(pole);

      // 4. Vending Machine (Jidōhanbaiki) & Rural Bus Stop
      if (index % 3 === 0) {
        const vm = this.createVendingMachine();
        vm.position.set(-10.5, 0, 5);
        vm.rotation.y = Math.PI / 2;
        chunk.add(vm);
        this.vendingMachines.push(vm);

        const busStop = this.createBusStop();
        busStop.position.set(11.5, 0, 10);
        chunk.add(busStop);
      }

    } else if (theme === 'rain_city') {
      // Modern Tokyo Skyscrapers & Glowing Kanji Neon Signs
      const bldgHeights = [35, 60, 45, 80, 50, 70];
      for (let s = 0; s < 4; s++) {
        const h = bldgHeights[(index * 4 + s) % bldgHeights.length];
        const bldgL = this.createSkyscraper(h, true);
        bldgL.position.set(-30 - s * 6, 0, -45 + s * 30);
        chunk.add(bldgL);

        const bldgR = this.createSkyscraper(h * 0.9, false);
        bldgR.position.set(30 + s * 6, 0, -35 + s * 30);
        chunk.add(bldgR);
      }

      // Overhead Expressway Green Sign Gantry
      if (index % 3 === 1) {
        const gantry = this.createHighwayGantry();
        gantry.position.set(0, 0, 0);
        chunk.add(gantry);
      }

    } else {
      // Coastal Sunset: Sea on the left, cliffs & palms on the right
      // Concrete Wave-breaker Tetrapods along left seawall
      for (let z = -50; z <= 50; z += 12) {
        const tetrapod = this.createTetrapod();
        tetrapod.position.set(-11.5, -0.5, z);
        tetrapod.rotation.y = Math.random() * Math.PI;
        chunk.add(tetrapod);
      }

      // Coastal Palm Trees & Seaside Pines
      for (let z = -40; z <= 40; z += 25) {
        const palm = this.createPalmTree();
        palm.position.set(16 + Math.random() * 6, 0, z);
        chunk.add(palm);
      }

      // Seaside Rest Bench & Overlook Rail
      if (index % 2 === 1) {
        const bench = this.createSeasideBench();
        bench.position.set(-9.8, 0.3, 0);
        bench.rotation.y = Math.PI / 2;
        chunk.add(bench);
      }
    }
  }

  private createTraditionalHouse(): THREE.Group {
    const house = new THREE.Group();
    // Wooden base & walls
    const wallGeo = new THREE.BoxGeometry(10, 4.2, 8);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe2d9cc, roughness: 0.9 });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 2.1;
    house.add(walls);

    // Dark grey Japanese tile roof (Kawara)
    const roofGeo = new THREE.ConeGeometry(8.5, 3.2, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 5.6;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);

    // Warm glowing shoji sliding window
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), windowMat);
    win.position.set(0, 2.2, 4.02);
    house.add(win);

    return house;
  }

  private createSakuraTree(): THREE.Group {
    const tree = new THREE.Group();
    // Twisted dark trunk
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.6, 5.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.75;
    tree.add(trunk);

    // Fluffy cloud of pink cherry blossoms
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.8,
    });

    const puffs = [
      { x: 0, y: 5.6, z: 0, r: 2.8 },
      { x: -1.6, y: 5.2, z: 0.8, r: 2.2 },
      { x: 1.8, y: 5.4, z: -0.6, r: 2.4 },
      { x: 0.4, y: 6.8, z: 0.4, r: 2.1 },
    ];

    for (const p of puffs) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(p.r, 10, 8), blossomMat);
      puff.position.set(p.x, p.y, p.z);
      tree.add(puff);
    }

    return tree;
  }

  private createJapaneseUtilityPole(): THREE.Group {
    const pole = new THREE.Group();
    // Concrete / wood pole
    const pMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 11, 10),
      new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.8 })
    );
    pMesh.position.y = 5.5;
    pole.add(pMesh);

    // Cross-arm crossbars
    const barMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.5 });
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), barMat);
    bar1.position.y = 9.8;
    pole.add(bar1);

    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.12), barMat);
    bar2.position.y = 8.6;
    pole.add(bar2);

    // Transformer drum
    const trans = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.5 })
    );
    trans.position.set(0.65, 8.2, 0);
    pole.add(trans);

    return pole;
  }

  private createVendingMachine(): THREE.Group {
    const vm = new THREE.Group();
    // Outer casing (Japanese Red / White style)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.3, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.9), bodyMat);
    body.position.y = 1.1;
    vm.add(body);

    // Glowing front display showing hot and cold cans
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.1), glassMat);
    display.position.set(0, 1.35, 0.46);
    vm.add(display);

    // Coin slot & dispense slot
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.35), slotMat);
    slot.position.set(0, 0.45, 0.46);
    vm.add(slot);

    // Warm ambient point light cast on the sidewalk
    const light = new THREE.PointLight(0x38bdf8, 1.2, 6);
    light.position.set(0, 1.2, 0.8);
    vm.add(light);

    return vm;
  }

  private createBusStop(): THREE.Group {
    const bus = new THREE.Group();
    // Metal pole with circular route sign
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
    );
    pole.position.y = 1.4;
    bus.add(pole);

    const sign = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 20),
      new THREE.MeshBasicMaterial({ color: 0x2563eb, side: THREE.DoubleSide })
    );
    sign.position.y = 2.65;
    bus.add(sign);

    // Small wooden waiting bench
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.45, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
    );
    bench.position.set(1.4, 0.22, 0);
    bus.add(bench);

    return bus;
  }

  private createSkyscraper(height: number, hasKanji: boolean): THREE.Group {
    const bldg = new THREE.Group();
    const w = 18 + Math.random() * 12;
    const d = 18 + Math.random() * 10;

    // Building tower
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.2,
      roughness: 0.7,
    });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), bodyMat);
    tower.position.y = height / 2;
    bldg.add(tower);

    // Window grid texture
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 128;
    winCanvas.height = 256;
    const ctx = winCanvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 256);
    // Illuminated office windows
    ctx.fillStyle = '#fef08a';
    for (let r = 8; r < 248; r += 16) {
      for (let c = 8; c < 120; c += 16) {
        if (Math.random() > 0.45) {
          ctx.fillStyle = Math.random() > 0.3 ? '#fef08a' : '#38bdf8';
          ctx.fillRect(c, r, 9, 7);
        }
      }
    }
    const winTex = new THREE.CanvasTexture(winCanvas);
    winTex.wrapS = THREE.RepeatWrapping;
    winTex.wrapT = THREE.RepeatWrapping;
    winTex.repeat.set(2, Math.floor(height / 10));

    const facadeMat = new THREE.MeshBasicMaterial({ map: winTex });
    const facade = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.95, height * 0.95), facadeMat);
    facade.position.set(0, height / 2, d / 2 + 0.05);
    bldg.add(facade);

    // Luminous Japanese Kanji Neon Billboard
    if (hasKanji) {
      const neonSign = this.createNeonSign();
      neonSign.position.set(0, height * 0.65, d / 2 + 0.2);
      bldg.add(neonSign);
    }

    return bldg;
  }

  private createNeonSign(): THREE.Group {
    const group = new THREE.Group();
    const signs = [
      { text: '新宿中央', color: '#ec4899', glow: 0xf43f5e },
      { text: '深夜喫茶', color: '#06b6d4', glow: 0x06b6d4 },
      { text: '星空ホテル', color: '#eab308', glow: 0xfacc15 },
      { text: 'ラーメン 光', color: '#10b981', glow: 0x10b981 },
      { text: 'SHUTO TOKYO', color: '#8b5cf6', glow: 0xa855f7 },
    ];
    const item = signs[Math.floor(Math.random() * signs.length)];

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 88);

    ctx.fillStyle = item.color;
    ctx.font = 'bold 42px "Space Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.text, 128, 48);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.5), mat);
    group.add(signMesh);

    // Pointlight casting neon glow
    const neonLight = new THREE.PointLight(item.glow, 2.5, 20);
    neonLight.position.set(0, 0, 1.5);
    group.add(neonLight);

    return group;
  }

  private createHighwayGantry(): THREE.Group {
    const gantry = new THREE.Group();
    const archMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });

    // Left and right pillars
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8, 8), archMat);
    p1.position.set(-8.5, 4, 0);
    gantry.add(p1);

    const p2 = p1.clone();
    p2.position.set(8.5, 4, 0);
    gantry.add(p2);

    // Cross beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.6, 0.6), archMat);
    beam.position.set(0, 7.8, 0);
    gantry.add(beam);

    // Japanese Green Highway Signboard ("首都高速 湾岸線")
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 96;
    const ctx = signCanvas.getContext('2d')!;
    ctx.fillStyle = '#065f46'; // Express highway emerald green
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 88);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Space Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('首都高速 湾岸線', 128, 44);
    ctx.font = '22px sans-serif';
    ctx.fillText('SHUTO EXP 500m', 128, 76);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.8), signMat);
    sign.position.set(0, 6.4, 0.35);
    gantry.add(sign);

    return gantry;
  }

  private createTetrapod(): THREE.Group {
    // Japanese concrete wave breaker
    const tetra = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const armGeo = new THREE.CylinderGeometry(0.35, 0.7, 2.2, 8);

    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(armGeo, mat);
      if (i === 0) arm.rotation.x = 0;
      if (i === 1) { arm.rotation.z = Math.PI * 0.6; arm.rotation.y = 0; }
      if (i === 2) { arm.rotation.z = Math.PI * 0.6; arm.rotation.y = Math.PI * 0.66; }
      if (i === 3) { arm.rotation.z = Math.PI * 0.6; arm.rotation.y = Math.PI * 1.33; }
      tetra.add(arm);
    }
    tetra.position.y = 0.8;
    return tetra;
  }

  private createPalmTree(): THREE.Group {
    const palm = new THREE.Group();
    // Slanted trunk
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 8, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(0.6, 4, 0);
    trunk.rotation.z = -0.15;
    palm.add(trunk);

    // Palm fronds
    const frondGeo = new THREE.ConeGeometry(3.5, 0.6, 6);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const crown = new THREE.Mesh(frondGeo, frondMat);
    crown.position.set(1.2, 7.8, 0);
    crown.rotation.x = Math.PI;
    palm.add(crown);

    return palm;
  }

  private createSeasideBench(): THREE.Group {
    const bench = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.6), woodMat);
    seat.position.y = 0.45;
    bench.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 0.08), woodMat);
    back.position.set(0, 0.8, -0.28);
    bench.add(back);

    return bench;
  }

  private createJapaneseTrain(): THREE.Group {
    // Green & Cream Enoshima-style coastal commuter train
    const train = new THREE.Group();
    const carMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.5 }); // Enoden dark green
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 }); // Vintage cream band

    const body = new THREE.Mesh(new THREE.BoxGeometry(45, 4.2, 3.6), carMat);
    body.position.y = 2.4;
    train.add(body);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(45.1, 1.4, 3.65), creamMat);
    stripe.position.y = 2.4;
    train.add(stripe);

    // Front headlight
    const light = new THREE.PointLight(0xfef08a, 2.5, 30);
    light.position.set(22.8, 2.8, 0);
    train.add(light);

    train.position.set(-250, 0, 60);
    return train;
  }

  private createLighthouse(): { group: THREE.Group; beam: THREE.SpotLight; target: THREE.Object3D } {
    const group = new THREE.Group();
    // White coastal tower
    const towerGeo = new THREE.CylinderGeometry(1.8, 3.5, 22, 16);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 11;
    group.add(tower);

    // Red striped band
    const bandGeo = new THREE.CylinderGeometry(2.2, 2.6, 4.5, 16);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 11;
    group.add(band);

    // Lantern room glass & rotating beam
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), beaconMat);
    beacon.position.y = 22.8;
    group.add(beacon);

    const beam = new THREE.SpotLight(0xfff3d1, 4.0, 350, Math.PI / 8, 0.25, 1.2);
    beam.position.set(0, 22.8, 0);
    const target = new THREE.Object3D();
    target.position.set(100, 2, 0);
    group.add(beam);
    beam.target = target;

    group.position.set(-180, 0, -180);
    group.visible = false;

    return { group, beam, target };
  }

  private createToriiGate(): THREE.Group {
    const torii = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b });

    // Two main pillars
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 8.5, 12), redMat);
    p1.position.set(-3.2, 4.25, 0);
    torii.add(p1);

    const p2 = p1.clone();
    p2.position.set(3.2, 4.25, 0);
    torii.add(p2);

    // Top curved crossbeam (Kasagi)
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.55, 0.7), blackMat);
    topBar.position.set(0, 8.6, 0);
    torii.add(topBar);

    // Secondary beam (Nuki)
    const midBar = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.35, 0.4), redMat);
    midBar.position.set(0, 7.1, 0);
    torii.add(midBar);

    torii.position.set(-28, 0, -45);
    torii.rotation.y = Math.PI / 3;
    return torii;
  }

  private initTraffic() {
    const colors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981, 0x6b7280];
    const lanes = [-2.8, 2.8]; // Driving on the left / right lanes

    for (let i = 0; i < 5; i++) {
      const color = colors[i % colors.length];
      const lane = lanes[i % 2];
      const zOffset = 30 + i * 45;
      const traffic = this.createTrafficCarMesh(color);
      traffic.position.set(lane, 0, zOffset);
      this.group.add(traffic);

      this.trafficCars.push({
        mesh: traffic,
        speed: 48 + Math.random() * 14, // Relaxed cruising speeds (km/h)
        laneX: lane,
        z: zOffset,
        color,
        headlightL: traffic.getObjectByName('headlightL') as THREE.Mesh,
        headlightR: traffic.getObjectByName('headlightR') as THREE.Mesh,
        taillights: traffic.getObjectByName('taillights') as THREE.Mesh,
      });
    }
  }

  private createTrafficCarMesh(color: number): THREE.Group {
    const car = new THREE.Group();
    // Cute Japanese Kei commuter hatchback
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 3.4), bodyMat);
    body.position.y = 0.55;
    car.add(body);

    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 1.8), cabinMat);
    cabin.position.set(0, 1.15, -0.2);
    car.add(cabin);

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12);
    for (const [x, z] of [[-0.78, 1.0], [0.78, 1.0], [-0.78, -1.0], [0.78, -1.0]]) {
      const w = new THREE.Mesh(wGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.28, z);
      car.add(w);
    }

    // Headlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.05), hlMat);
    hlL.name = 'headlightL';
    hlL.position.set(-0.55, 0.6, 1.72);
    car.add(hlL);

    const hlR = hlL.clone();
    hlR.name = 'headlightR';
    hlR.position.x = 0.55;
    car.add(hlR);

    // Taillights
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.05), tlMat);
    tl.name = 'taillights';
    tl.position.set(0, 0.65, -1.72);
    car.add(tl);

    return car;
  }

  public setTheme(theme: EnvironmentTheme) {
    this.currentTheme = theme;
    // Toggle theme-specific scenery
    this.oceanMesh.visible = theme === 'coastal_sunset';
    this.rainParticles.visible = theme === 'rain_city';
    this.sakuraParticles.visible = theme === 'countryside' || theme === 'coastal_sunset';

    // Rebuild chunks for new theme atmosphere
    for (let i = 0; i < this.roadChunks.length; i++) {
      const chunk = this.roadChunks[i];
      const chunkZ = chunk.position.z;
      this.roadGroup.remove(chunk);
      const newChunk = this.createRoadChunk(chunkZ, i);
      this.roadChunks[i] = newChunk;
      this.roadGroup.add(newChunk);
    }
  }

  public update(delta: number, carPos: THREE.Vector3, playerSpeedKmh: number) {
    // 1. Endless Looping Road Chunks
    const halfSpan = (this.chunkCount * this.chunkLength) / 2;
    for (let i = 0; i < this.roadChunks.length; i++) {
      const chunk = this.roadChunks[i];
      // If chunk is far behind the car, recycle it to the front
      if (chunk.position.z < carPos.z - this.chunkLength * 1.5) {
        chunk.position.z += this.chunkCount * this.chunkLength;
      } else if (chunk.position.z > carPos.z + halfSpan + this.chunkLength) {
        chunk.position.z -= this.chunkCount * this.chunkLength;
      }
    }

    // 2. Weather Particles (Follow car smoothly)
    if (this.rainParticles.visible) {
      this.rainParticles.position.set(carPos.x, 0, carPos.z);
      const posAttr = this.rainParticles.geometry.attributes.position as THREE.BufferAttribute;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i) - delta * 45;
        if (y < 0) y = 45;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    if (this.sakuraParticles.visible) {
      this.sakuraParticles.position.set(carPos.x, 0, carPos.z);
      const posAttr = this.sakuraParticles.geometry.attributes.position as THREE.BufferAttribute;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i) - delta * 3.5;
        let x = posAttr.getX(i) + Math.sin(performance.now() * 0.002 + i) * delta * 2.0;
        if (y < 0.2) y = 25;
        posAttr.setY(i, y);
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    }

    // 3. Ambient Peaceful Traffic Cars
    for (const car of this.trafficCars) {
      // Move cars forward along the highway
      car.z += (car.speed / 3.6) * delta;
      // Loop traffic cars relative to player position
      if (car.z < carPos.z - 80) {
        car.z = carPos.z + 180 + Math.random() * 60;
      } else if (car.z > carPos.z + 280) {
        car.z = carPos.z - 40;
      }
      car.mesh.position.set(car.laneX, 0, car.z);
    }

    // 4. Japanese Commuter Train Glide
    this.trainX += delta * 18;
    if (this.trainX > 250) this.trainX = -250;
    this.trainMesh.position.x = this.trainX;
    this.trainMesh.position.z = carPos.z + 80;

    // 5. Lighthouse Rotating Spotlight
    if (this.oceanMesh.visible) {
      const angle = performance.now() * 0.0008;
      this.lighthouseTarget.position.set(
        -180 + Math.cos(angle) * 120,
        2,
        -180 + Math.sin(angle) * 120
      );
    }

    // 6. Keep Ocean plane centered along road
    if (this.oceanMesh.visible) {
      this.oceanMesh.position.z = carPos.z;
    }
  }
}
