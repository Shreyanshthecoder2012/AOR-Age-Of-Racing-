import * as THREE from 'three';

export type EnvironmentTheme = 'countryside' | 'rain_city' | 'coastal_sunset';

export interface ThemeConfig {
  name: string;
  japaneseTitle: string;
  timeString: string;
  locationName: string;
  skyTop: number;
  skyMid: number;
  skyBottom: number;
  sunColor: number;
  sunPosition: THREE.Vector3;
  ambientColor: number;
  ambientIntensity: number;
  dirLightColor: number;
  dirLightIntensity: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  roadWetness: number;
  hasRain: boolean;
  hasPetals: boolean;
  hasComet: boolean;
  cloudOpacity: number;
  cloudTint: number;
}

export const THEME_CONFIGS: Record<EnvironmentTheme, ThemeConfig> = {
  countryside: {
    name: 'Morning Countryside',
    japaneseTitle: '田舎の朝 · 新緑と桜の小道',
    timeString: '06:45 AM',
    locationName: 'NAGANO · SATOHARA VALLEY',
    skyTop: 0x1a66b8,     // Deep crystalline morning blue
    skyMid: 0x6bb7f8,     // Luminous soft azure
    skyBottom: 0xd9f0ff,  // Pale morning dew horizon
    sunColor: 0xfff3d1,   // Warm radiant morning sun
    sunPosition: new THREE.Vector3(120, 85, -250),
    ambientColor: 0x9dc9f5,
    ambientIntensity: 0.9,
    dirLightColor: 0xfffae8,
    dirLightIntensity: 1.8,
    fogColor: 0xcfe7fc,
    fogNear: 80,
    fogFar: 450,
    roadWetness: 0.15,
    hasRain: false,
    hasPetals: true,
    hasComet: false,
    cloudOpacity: 0.85,
    cloudTint: 0xffffff,
  },
  rain_city: {
    name: 'Rain-Soaked City at Night',
    japaneseTitle: '雨の新宿 · ネオンと水たまり',
    timeString: '23:15 PM',
    locationName: 'TOKYO · SHINJUKU EXPRESSWAY',
    skyTop: 0x070914,     // Midnight indigo
    skyMid: 0x161c36,     // Moody rainy night sky
    skyBottom: 0x2b2245,  // Neon purple reflection on cloud bellies
    sunColor: 0x4cc9f0,   // Cool moonlight
    sunPosition: new THREE.Vector3(-80, 110, -200),
    ambientColor: 0x242d54,
    ambientIntensity: 0.65,
    dirLightColor: 0x82aaff,
    dirLightIntensity: 0.8,
    fogColor: 0x141829,
    fogNear: 35,
    fogFar: 280,
    roadWetness: 0.95,
    hasRain: true,
    hasPetals: false,
    hasComet: false,
    cloudOpacity: 0.95,
    cloudTint: 0x8f75b8,
  },
  coastal_sunset: {
    name: 'Coastal Sunset Highway',
    japaneseTitle: '夕暮れの海岸線 · 茜色の空と君の街',
    timeString: '18:25 PM',
    locationName: 'SHONAN · ENOSHIMA COASTAL ROUTE',
    skyTop: 0x301551,     // Twilight violet zenith
    skyMid: 0xba2d65,     // Vivid Shinkai magenta
    skyBottom: 0xff8c42,  // Blazing fiery golden orange horizon
    sunColor: 0xffd166,   // Liquid gold sunset
    sunPosition: new THREE.Vector3(180, 32, -300),
    ambientColor: 0x8c4372,
    ambientIntensity: 0.85,
    dirLightColor: 0xffaa5e,
    dirLightIntensity: 1.9,
    fogColor: 0xd96860,
    fogNear: 60,
    fogFar: 420,
    roadWetness: 0.25,
    hasRain: false,
    hasPetals: true,
    hasComet: true,       // Makoto Shinkai "Your Name" split comet streak!
    cloudOpacity: 0.9,
    cloudTint: 0xffa47f,
  },
};

export class AnimeSkybox {
  public group: THREE.Group;
  private skyDome: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;
  private cloudsMesh: THREE.InstancedMesh;
  private sunMesh: THREE.Mesh;
  private sunFlareMesh: THREE.Sprite;
  private cometGroup: THREE.Group;
  private starsPoints: THREE.Points;
  private mountainMesh: THREE.Mesh;
  private currentTheme: EnvironmentTheme = 'countryside';
  private targetTheme: EnvironmentTheme = 'countryside';
  private transitionProgress: number = 1.0;

  constructor() {
    this.group = new THREE.Group();

    // 1. Procedural Gradient Sky Dome with Makoto Shinkai Atmospheric Colors
    const domeGeo = new THREE.SphereGeometry(600, 32, 24);
    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(THEME_CONFIGS.countryside.skyTop) },
        midColor: { value: new THREE.Color(THEME_CONFIGS.countryside.skyMid) },
        bottomColor: { value: new THREE.Color(THEME_CONFIGS.countryside.skyBottom) },
        offset: { value: 20 },
        exponent: { value: 0.65 },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          float factor = max(h, 0.0);
          vec3 col;
          if (factor < 0.45) {
            col = mix(bottomColor, midColor, factor / 0.45);
          } else {
            col = mix(midColor, topColor, pow((factor - 0.45) / 0.55, exponent));
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyDome = new THREE.Mesh(domeGeo, this.skyMaterial);
    this.group.add(this.skyDome);

    // 2. Distant 2D/3D Layered Mount Fuji and Mountain Ranges
    this.mountainMesh = this.createMountainSilhouette();
    this.group.add(this.mountainMesh);

    // 3. Volumetric Hand-Painted Anime Clouds
    this.cloudsMesh = this.createAnimeClouds();
    this.group.add(this.cloudsMesh);

    // 4. Luminous Anime Sun & Glowing Corona Flare
    const sunGeo = new THREE.CircleGeometry(26, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      depthWrite: false,
      transparent: true,
      opacity: 0.95,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.copy(THEME_CONFIGS.countryside.sunPosition);
    this.sunMesh.lookAt(0, 0, 0);
    this.group.add(this.sunMesh);

    // Sun flare sprite
    const flareTexture = this.createSunGlowTexture();
    const flareMat = new THREE.SpriteMaterial({
      map: flareTexture,
      color: 0xfff0c2,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sunFlareMesh = new THREE.Sprite(flareMat);
    this.sunFlareMesh.scale.set(160, 160, 1);
    this.sunMesh.add(this.sunFlareMesh);

    // 5. Twilight Stars & Split Comet (Tiamat Comet from "Your Name")
    this.starsPoints = this.createStars();
    this.group.add(this.starsPoints);

    this.cometGroup = this.createAnimeComet();
    this.group.add(this.cometGroup);

    this.applyTheme(this.currentTheme);
  }

  private createSunGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 240, 180, 0.85)');
    grad.addColorStop(0.5, 'rgba(255, 180, 100, 0.4)');
    grad.addColorStop(0.8, 'rgba(255, 100, 80, 0.15)');
    grad.addColorStop(1, 'rgba(255, 100, 80, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }

  private createMountainSilhouette(): THREE.Mesh {
    const groupGeo = new THREE.BufferGeometry();
    const width = 1100;
    const height = 150;
    const segs = 48;
    const positions: number[] = [];
    const colors: number[] = [];

    // Distant mountain ridge coordinates
    const baseColor = new THREE.Color(0x35527a);
    const snowColor = new THREE.Color(0xffffff);

    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const x = (u - 0.5) * width;
      // Procedural mountain peaks with Mount Fuji cone near center
      const distFromFuji = Math.abs(x - 40);
      let peakH = Math.sin(u * 8.0) * 25 + Math.cos(u * 14.0) * 15 + 20;
      if (distFromFuji < 120) {
        // Mount Fuji silhouette
        const fujiCone = Math.max(0, 1.0 - (distFromFuji / 120));
        peakH += fujiCone * 85;
      }

      positions.push(x, 0, -480);
      colors.push(baseColor.r, baseColor.g, baseColor.b);

      positions.push(x, peakH, -480);
      if (distFromFuji < 50 && peakH > 75) {
        colors.push(snowColor.r, snowColor.g, snowColor.b);
      } else {
        colors.push(baseColor.r * 1.3, baseColor.g * 1.3, baseColor.b * 1.3);
      }
    }

    const indices: number[] = [];
    for (let i = 0; i < segs; i++) {
      const i0 = i * 2;
      const i1 = i * 2 + 1;
      const i2 = (i + 1) * 2;
      const i3 = (i + 1) * 2 + 1;
      indices.push(i0, i1, i2);
      indices.push(i2, i1, i3);
    }

    groupGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    groupGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    groupGeo.setIndex(indices);
    groupGeo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    return new THREE.Mesh(groupGeo, mat);
  }

  private createAnimeClouds(): THREE.InstancedMesh {
    // Distinctive fluffy puff clouds with Makoto Shinkai rim-lit billows
    const cloudGeo = new THREE.SphereGeometry(18, 12, 10);
    const count = 38;
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const instMesh = new THREE.InstancedMesh(cloudGeo, mat, count);

    const dummy = new THREE.Object3D();
    const cloudClusters = [
      { x: -180, y: 110, z: -380, scale: 2.2 },
      { x: -140, y: 130, z: -360, scale: 2.8 },
      { x: -90, y: 100, z: -390, scale: 2.4 },
      // Towering cumulonimbus cloud mountain (center-right)
      { x: 120, y: 90, z: -350, scale: 2.8 },
      { x: 160, y: 135, z: -340, scale: 3.5 },
      { x: 200, y: 170, z: -330, scale: 4.2 },
      { x: 230, y: 120, z: -340, scale: 3.0 },
      { x: 80, y: 75, z: -320, scale: 2.1 },
      // Fluffy lower horizon puffs
      { x: -300, y: 65, z: -400, scale: 2.0 },
      { x: 320, y: 60, z: -380, scale: 2.2 },
    ];

    let idx = 0;
    for (const cluster of cloudClusters) {
      // Create sub-puffs for each main cloud
      const subPuffs = 3 + Math.floor(Math.random() * 2);
      for (let s = 0; s < subPuffs && idx < count; s++) {
        const ox = (Math.random() - 0.5) * 45 * cluster.scale;
        const oy = (Math.random() - 0.5) * 20 * cluster.scale;
        const oz = (Math.random() - 0.5) * 30;
        dummy.position.set(cluster.x + ox, cluster.y + oy, cluster.z + oz);
        const sRand = (0.7 + Math.random() * 0.6) * cluster.scale;
        dummy.scale.set(sRand * 1.5, sRand * 1.0, sRand * 1.0);
        dummy.updateMatrix();
        instMesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    // Fill remainder
    while (idx < count) {
      dummy.position.set(0, -9999, 0);
      dummy.updateMatrix();
      instMesh.setMatrixAt(idx++, dummy.matrix);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    return instMesh;
  }

  private createStars(): THREE.Points {
    const starCount = 350;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.8 + 0.2); // Upper dome only
      const r = 540;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 1.2 + Math.random() * 2.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.5,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  private createAnimeComet(): THREE.Group {
    // "Your Name" style split comet arching across the sky
    const comet = new THREE.Group();

    // Main luminous nucleus
    const headGeo = new THREE.SphereGeometry(3, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({
      color: 0x88ffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    comet.add(head);

    // Glowing comet trail
    const trailPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      const x = -t * 120 + Math.sin(t * 4.0) * 2;
      const y = t * 45;
      const z = -t * 60;
      trailPoints.push(new THREE.Vector3(x, y, z));
    }
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x64dfdf,
      transparent: true,
      opacity: 0.85,
      linewidth: 3,
      blending: THREE.AdditiveBlending,
    });
    const trail = new THREE.Line(trailGeo, trailMat);
    comet.add(trail);

    // Secondary splintered pink fragment
    const fragTrailPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const x = -t * 90 - 8;
      const y = t * 38 - 6;
      const z = -t * 50;
      fragTrailPoints.push(new THREE.Vector3(x, y, z));
    }
    const fragGeo = new THREE.BufferGeometry().setFromPoints(fragTrailPoints);
    const fragMat = new THREE.LineBasicMaterial({
      color: 0xff70a6,
      transparent: true,
      opacity: 0.75,
      linewidth: 2,
      blending: THREE.AdditiveBlending,
    });
    const fragTrail = new THREE.Line(fragGeo, fragMat);
    comet.add(fragTrail);

    comet.position.set(70, 240, -420);
    comet.visible = false;
    return comet;
  }

  public setTheme(theme: EnvironmentTheme) {
    if (this.currentTheme === theme) return;
    this.targetTheme = theme;
    this.transitionProgress = 0.0;
  }

  public applyTheme(theme: EnvironmentTheme) {
    this.currentTheme = theme;
    this.targetTheme = theme;
    this.transitionProgress = 1.0;
    const cfg = THEME_CONFIGS[theme];

    // Sky colors
    this.skyMaterial.uniforms.topColor.value.setHex(cfg.skyTop);
    this.skyMaterial.uniforms.midColor.value.setHex(cfg.skyMid);
    this.skyMaterial.uniforms.bottomColor.value.setHex(cfg.skyBottom);

    // Sun
    this.sunMesh.position.copy(cfg.sunPosition);
    this.sunMesh.lookAt(0, 0, 0);
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.setHex(cfg.sunColor);
    (this.sunFlareMesh.material as THREE.SpriteMaterial).color.setHex(cfg.sunColor);

    // Sun visibility (in rain city night, sun becomes moonlight)
    if (theme === 'rain_city') {
      this.sunMesh.scale.set(0.65, 0.65, 0.65);
      (this.sunMesh.material as THREE.MeshBasicMaterial).opacity = 0.4;
      (this.sunFlareMesh.material as THREE.SpriteMaterial).opacity = 0.25;
      (this.starsPoints.material as THREE.PointsMaterial).opacity = 0.45;
      this.cometGroup.visible = false;
    } else if (theme === 'coastal_sunset') {
      this.sunMesh.scale.set(1.4, 1.4, 1.4);
      (this.sunMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
      (this.sunFlareMesh.material as THREE.SpriteMaterial).opacity = 0.9;
      (this.starsPoints.material as THREE.PointsMaterial).opacity = 0.7;
      this.cometGroup.visible = true;
    } else {
      // Countryside
      this.sunMesh.scale.set(1.0, 1.0, 1.0);
      (this.sunMesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
      (this.sunFlareMesh.material as THREE.SpriteMaterial).opacity = 0.8;
      (this.starsPoints.material as THREE.PointsMaterial).opacity = 0.0;
      this.cometGroup.visible = false;
    }

    // Clouds tint
    const cloudMat = this.cloudsMesh.material as THREE.MeshBasicMaterial;
    cloudMat.color.setHex(cfg.cloudTint);
    cloudMat.opacity = cfg.cloudOpacity;

    // Mountain color tint
    const mountainMat = this.mountainMesh.material as THREE.MeshBasicMaterial;
    if (theme === 'rain_city') {
      mountainMat.opacity = 0.4;
    } else if (theme === 'coastal_sunset') {
      mountainMat.opacity = 0.95;
    } else {
      mountainMat.opacity = 0.85;
    }
  }

  public update(delta: number, carPos: THREE.Vector3) {
    // Keep skybox centered relative to camera/car
    this.group.position.set(carPos.x * 0.1, 0, carPos.z);

    // Gentle cloud drifting animation
    this.cloudsMesh.position.x = Math.sin(performance.now() * 0.00008) * 15;

    // Comet subtle pulse
    if (this.cometGroup.visible) {
      const pulse = 1.0 + Math.sin(performance.now() * 0.003) * 0.12;
      this.cometGroup.scale.set(pulse, pulse, pulse);
    }

    // Smooth theme transition
    if (this.transitionProgress < 1.0) {
      this.transitionProgress += delta * 1.5;
      if (this.transitionProgress >= 1.0) {
        this.transitionProgress = 1.0;
        this.currentTheme = this.targetTheme;
        this.applyTheme(this.currentTheme);
      } else {
        const fromCfg = THEME_CONFIGS[this.currentTheme];
        const toCfg = THEME_CONFIGS[this.targetTheme];
        const t = this.transitionProgress;

        const cTop = new THREE.Color(fromCfg.skyTop).lerp(new THREE.Color(toCfg.skyTop), t);
        const cMid = new THREE.Color(fromCfg.skyMid).lerp(new THREE.Color(toCfg.skyMid), t);
        const cBot = new THREE.Color(fromCfg.skyBottom).lerp(new THREE.Color(toCfg.skyBottom), t);

        this.skyMaterial.uniforms.topColor.value.copy(cTop);
        this.skyMaterial.uniforms.midColor.value.copy(cMid);
        this.skyMaterial.uniforms.bottomColor.value.copy(cBot);

        // Lerp sun position
        this.sunMesh.position.lerpVectors(fromCfg.sunPosition, toCfg.sunPosition, t);
        this.sunMesh.lookAt(0, 0, 0);

        const cSun = new THREE.Color(fromCfg.sunColor).lerp(new THREE.Color(toCfg.sunColor), t);
        (this.sunMesh.material as THREE.MeshBasicMaterial).color.copy(cSun);
        (this.sunFlareMesh.material as THREE.SpriteMaterial).color.copy(cSun);
      }
    }
  }

  public getCurrentTheme(): EnvironmentTheme {
    return this.currentTheme;
  }
}
