import * as THREE from 'three';
import { EnvironmentTheme } from './AnimeSkybox';
import { AnimeSpriteFactory } from './AnimeSpriteFactory';

interface ScenerySprite {
  sprite: THREE.Sprite;
  baseZ: number;
  laneX: number;
}

interface TrafficCar2D {
  sprite: THREE.Sprite;
  speed: number;
  laneX: number;
  z: number;
}

export class LightweightWorld2D {
  public group: THREE.Group;
  private roadGroup: THREE.Group;
  private spritesGroup: THREE.Group;
  private oceanMesh: THREE.Mesh;
  private rainParticles: THREE.Points;
  private sakuraParticles: THREE.Points;

  // Road mesh
  private roadMesh: THREE.Mesh;
  private roadMatDry: THREE.MeshBasicMaterial;
  private roadMatWet: THREE.MeshBasicMaterial;

  // Billboard Sprites Pool
  private sceneryPool: ScenerySprite[] = [];
  private trafficCars: TrafficCar2D[] = [];

  // Animated landmarks
  private trainSprite: THREE.Sprite;
  private trainX: number = -200;
  private fumikiriSprite: THREE.Sprite;

  private currentTheme: EnvironmentTheme = 'countryside';
  private trackLength = 700;

  constructor() {
    this.group = new THREE.Group();
    this.roadGroup = new THREE.Group();
    this.spritesGroup = new THREE.Group();

    this.group.add(this.roadGroup);
    this.group.add(this.spritesGroup);

    // 1. Sleek Lightweight Road Surface
    this.roadMatDry = this.createRoadMaterial(false);
    this.roadMatWet = this.createRoadMaterial(true);

    const roadGeo = new THREE.PlaneGeometry(14, this.trackLength, 1, 32);
    this.roadMesh = new THREE.Mesh(roadGeo, this.roadMatDry);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadGroup.add(this.roadMesh);

    // 2. Coastal Ocean Plane
    const oceanGeo = new THREE.PlaneGeometry(800, this.trackLength);
    const oceanMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.85 });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(-200, -0.5, 0);
    this.oceanMesh.visible = false;
    this.group.add(this.oceanMesh);

    // 3. Lightweight Weather Particles
    this.rainParticles = this.createRainParticles();
    this.group.add(this.rainParticles);

    this.sakuraParticles = this.createSakuraParticles();
    this.group.add(this.sakuraParticles);

    // 4. Landmarks: Train & Fumikiri
    const trainTex = AnimeSpriteFactory.getTrainTexture();
    const trainMat = new THREE.SpriteMaterial({ map: trainTex, transparent: true });
    this.trainSprite = new THREE.Sprite(trainMat);
    this.trainSprite.scale.set(45, 18, 1);
    this.trainSprite.position.set(-200, 9, 80);
    this.group.add(this.trainSprite);

    const fumiTex = AnimeSpriteFactory.getFumikiriTexture();
    const fumiMat = new THREE.SpriteMaterial({ map: fumiTex, transparent: true });
    this.fumikiriSprite = new THREE.Sprite(fumiMat);
    this.fumikiriSprite.scale.set(6, 12, 1);
    this.fumikiriSprite.position.set(-9.5, 6, 80);
    this.group.add(this.fumikiriSprite);

    // 5. Populate Initial 2D Scenery & Ambient Traffic
    this.rebuildScenery(this.currentTheme);
    this.initTraffic();
  }

  private createRoadMaterial(isWet: boolean): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Asphalt base
    ctx.fillStyle = isWet ? '#0f172a' : '#1e293b';
    ctx.fillRect(0, 0, 512, 1024);

    // Wet road puddles / specular sheen
    if (isWet) {
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      grad.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 1024);
    }

    // Japanese road lane markings
    // White center dashed line
    ctx.fillStyle = '#ffffff';
    for (let y = 16; y < 1024; y += 64) {
      ctx.fillRect(256 - 6, y, 12, 36);
    }

    // Outer edge solid yellow highway lines
    ctx.fillStyle = '#facc15';
    ctx.fillRect(24, 0, 10, 1024);
    ctx.fillRect(512 - 34, 0, 10, 1024);

    // Japanese speed stencil "50"
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('50', 380, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 24);

    return new THREE.MeshBasicMaterial({ map: tex });
  }

  private createRainParticles(): THREE.Points {
    const count = 450; // Super lightweight particle count
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 35;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.35,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    const pts = new THREE.Points(geo, mat);
    pts.visible = false;
    return pts;
  }

  private createSakuraParticles(): THREE.Points {
    const count = 220; // Lightweight flutter
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = Math.random() * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 110;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfbcfe8,
      size: 0.55,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    return new THREE.Points(geo, mat);
  }

  private rebuildScenery(theme: EnvironmentTheme) {
    // Clear old sprites
    while (this.spritesGroup.children.length > 0) {
      this.spritesGroup.remove(this.spritesGroup.children[0]);
    }
    this.sceneryPool = [];

    const spacing = 35;
    const count = Math.floor(this.trackLength / spacing);

    for (let i = 0; i < count; i++) {
      const z = (i - count / 2) * spacing;

      if (theme === 'countryside') {
        // Left side: Sakura tree & Utility pole
        const sakuraTex = AnimeSpriteFactory.getSakuraTreeTexture();
        const sakura = new THREE.Sprite(new THREE.SpriteMaterial({ map: sakuraTex, transparent: true }));
        sakura.scale.set(14, 18, 1);
        sakura.position.set(-14 - Math.random() * 6, 9, z);
        this.spritesGroup.add(sakura);
        this.sceneryPool.push({ sprite: sakura, baseZ: z, laneX: sakura.position.x });

        // Right side: Country house & Vending Machine
        if (i % 2 === 0) {
          const houseTex = AnimeSpriteFactory.getCountryHouseTexture();
          const house = new THREE.Sprite(new THREE.SpriteMaterial({ map: houseTex, transparent: true }));
          house.scale.set(22, 16, 1);
          house.position.set(18 + Math.random() * 6, 8, z);
          this.spritesGroup.add(house);
          this.sceneryPool.push({ sprite: house, baseZ: z, laneX: house.position.x });
        } else {
          const vmTex = AnimeSpriteFactory.getVendingMachineTexture();
          const vm = new THREE.Sprite(new THREE.SpriteMaterial({ map: vmTex, transparent: true }));
          vm.scale.set(5, 8, 1);
          vm.position.set(10.5, 4, z);
          this.spritesGroup.add(vm);
          this.sceneryPool.push({ sprite: vm, baseZ: z, laneX: vm.position.x });

          const poleTex = AnimeSpriteFactory.getUtilityPoleTexture();
          const pole = new THREE.Sprite(new THREE.SpriteMaterial({ map: poleTex, transparent: true }));
          pole.scale.set(6, 16, 1);
          pole.position.set(11.5, 8, z + 12);
          this.spritesGroup.add(pole);
          this.sceneryPool.push({ sprite: pole, baseZ: z + 12, laneX: pole.position.x });
        }

      } else if (theme === 'rain_city') {
        // Tokyo Neon Skyscrapers
        const colors: ('cyan' | 'magenta' | 'amber')[] = ['cyan', 'magenta', 'amber'];
        const colL = colors[i % colors.length];
        const colR = colors[(i + 1) % colors.length];

        const bldgLTex = AnimeSpriteFactory.getSkyscraperTexture(colL);
        const bldgL = new THREE.Sprite(new THREE.SpriteMaterial({ map: bldgLTex, transparent: true }));
        bldgL.scale.set(24, 48, 1);
        bldgL.position.set(-20 - Math.random() * 6, 24, z);
        this.spritesGroup.add(bldgL);
        this.sceneryPool.push({ sprite: bldgL, baseZ: z, laneX: bldgL.position.x });

        const bldgRTex = AnimeSpriteFactory.getSkyscraperTexture(colR);
        const bldgR = new THREE.Sprite(new THREE.SpriteMaterial({ map: bldgRTex, transparent: true }));
        bldgR.scale.set(24, 48, 1);
        bldgR.position.set(20 + Math.random() * 6, 24, z + 15);
        this.spritesGroup.add(bldgR);
        this.sceneryPool.push({ sprite: bldgR, baseZ: z + 15, laneX: bldgR.position.x });

      } else {
        // Coastal Sunset: Sea on left with tetrapods, palms on right
        const tetraTex = AnimeSpriteFactory.getTetrapodTexture();
        const tetra = new THREE.Sprite(new THREE.SpriteMaterial({ map: tetraTex, transparent: true }));
        tetra.scale.set(6, 6, 1);
        tetra.position.set(-9.5, 2.5, z);
        this.spritesGroup.add(tetra);
        this.sceneryPool.push({ sprite: tetra, baseZ: z, laneX: tetra.position.x });

        const palmTex = AnimeSpriteFactory.getPalmTreeTexture();
        const palm = new THREE.Sprite(new THREE.SpriteMaterial({ map: palmTex, transparent: true }));
        palm.scale.set(12, 18, 1);
        palm.position.set(15 + Math.random() * 6, 9, z);
        this.spritesGroup.add(palm);
        this.sceneryPool.push({ sprite: palm, baseZ: z, laneX: palm.position.x });
      }
    }
  }

  private initTraffic() {
    const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981'];
    const lanes = [-2.8, 2.8];

    for (let i = 0; i < 4; i++) {
      const col = colors[i % colors.length];
      const tex = AnimeSpriteFactory.getTrafficCarTexture(col);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sprite.scale.set(4.2, 3.2, 1);

      const lane = lanes[i % 2];
      const z = 40 + i * 65;
      sprite.position.set(lane, 1.6, z);
      this.group.add(sprite);

      this.trafficCars.push({
        sprite,
        speed: 46 + Math.random() * 12,
        laneX: lane,
        z,
      });
    }
  }

  public setTheme(theme: EnvironmentTheme) {
    this.currentTheme = theme;
    this.roadMesh.material = theme === 'rain_city' ? this.roadMatWet : this.roadMatDry;
    this.oceanMesh.visible = theme === 'coastal_sunset';
    this.rainParticles.visible = theme === 'rain_city';
    this.sakuraParticles.visible = theme === 'countryside' || theme === 'coastal_sunset';

    this.rebuildScenery(theme);
  }

  public update(delta: number, carPos: THREE.Vector3) {
    // 1. Keep road strip centered along Z
    this.roadMesh.position.z = carPos.z;
    if (this.oceanMesh.visible) {
      this.oceanMesh.position.z = carPos.z;
    }

    // 2. Wrap billboard scenery sprites smoothly around the car
    const halfLen = this.trackLength / 2;
    for (const item of this.sceneryPool) {
      let relZ = (item.sprite.position.z - carPos.z);
      if (relZ < -halfLen) {
        item.sprite.position.z += this.trackLength;
      } else if (relZ > halfLen) {
        item.sprite.position.z -= this.trackLength;
      }
    }

    // 3. Gentle Sakura sway in breeze
    if (this.currentTheme === 'countryside') {
      const sway = Math.sin(performance.now() * 0.002) * 0.4;
      for (const item of this.sceneryPool) {
        item.sprite.position.x = item.laneX + sway;
      }
    }

    // 4. Peaceful 2D Traffic Cars
    for (const car of this.trafficCars) {
      car.z += (car.speed / 3.6) * delta;
      // Loop relative to player
      if (car.z < carPos.z - 60) {
        car.z = carPos.z + 160 + Math.random() * 40;
      } else if (car.z > carPos.z + 240) {
        car.z = carPos.z - 40;
      }
      car.sprite.position.set(car.laneX, 1.6, car.z);
    }

    // 5. Enoden Train Glide
    this.trainX += delta * 18;
    if (this.trainX > 200) this.trainX = -200;
    this.trainSprite.position.x = this.trainX;
    this.trainSprite.position.z = carPos.z + 75;
    this.fumikiriSprite.position.z = carPos.z + 75;

    // 6. Weather particles follow car
    if (this.rainParticles.visible) {
      this.rainParticles.position.set(carPos.x, 0, carPos.z);
      const posAttr = this.rainParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) - delta * 45;
        if (y < 0) y = 35;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    if (this.sakuraParticles.visible) {
      this.sakuraParticles.position.set(carPos.x, 0, carPos.z);
      const posAttr = this.sakuraParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) - delta * 3.2;
        let x = posAttr.getX(i) + Math.sin(performance.now() * 0.003 + i) * delta * 1.8;
        if (y < 0.2) y = 25;
        posAttr.setY(i, y);
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    }
  }
}
