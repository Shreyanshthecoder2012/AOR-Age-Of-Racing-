import * as THREE from 'three';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export interface SkyPalette {
  topColor: number;
  midColor: number;
  botColor: number;
  hazeColor: number;
  celestialColor: number;
  celestialPos: THREE.Vector3;
  cloudHighlight: number;
  cloudShadow: number;
  cloudOpacity: number;
  starOpacity: number;
  ambientLightColor: number;
  ambientLightIntensity: number;
  dirLightColor: number;
  dirLightIntensity: number;
}

export const SKY_PALETTES: Record<TimeOfDay, SkyPalette> = {
  day: {
    topColor: 0x0369a1,          // Deep radiant anime azure zenith
    midColor: 0x38bdf8,          // Brilliant cerulean Shinkai sky
    botColor: 0xdbeafe,          // Luminous soft white-cyan horizon
    hazeColor: 0xbae6fd,         // Atmospheric summer glow
    celestialColor: 0xfffbeb,     // Blinding radiant sun
    celestialPos: new THREE.Vector3(180, 480, -380),
    cloudHighlight: 0xffffff,     // Brilliant pure white cloud billows
    cloudShadow: 0x93c5fd,        // Soft azure sky-reflected shadow
    cloudOpacity: 0.98,
    starOpacity: 0.0,
    ambientLightColor: 0xdbeafe,
    ambientLightIntensity: 1.45,
    dirLightColor: 0xfff7ed,
    dirLightIntensity: 1.85,
  },
  sunset: {
    topColor: 0x4c1d95,          // Deep purple twilight zenith ("Your Name" style)
    midColor: 0xdb2777,          // Radiant fiery magenta
    botColor: 0xf97316,          // Golden hour flaming orange horizon
    hazeColor: 0xfb7185,         // Rose-gold twilight haze
    celestialColor: 0xfef08a,     // Giant glowing golden sun
    celestialPos: new THREE.Vector3(120, 110, -560),
    cloudHighlight: 0xfef08a,     // Golden illuminated cloud crests
    cloudShadow: 0x6b21a8,        // Deep purple-pink cloud bellies
    cloudOpacity: 0.95,
    starOpacity: 0.45,
    ambientLightColor: 0xf472b6,
    ambientLightIntensity: 1.15,
    dirLightColor: 0xfb923c,
    dirLightIntensity: 1.6,
  },
  night: {
    topColor: 0x020617,          // Midnight deep space obsidian
    midColor: 0x0f172a,          // Ultramarine night sky
    botColor: 0x1e1b4b,          // Tokyo neon purple horizon
    hazeColor: 0x312e81,         // City light atmospheric haze
    celestialColor: 0xe0e7ff,     // Luminous silver-blue moon
    celestialPos: new THREE.Vector3(-180, 360, -420),
    cloudHighlight: 0xc7d2fe,     // Moonlit silver highlights
    cloudShadow: 0x090d16,        // Stormy deep night shadows
    cloudOpacity: 0.82,
    starOpacity: 0.95,
    ambientLightColor: 0x242d54,
    ambientLightIntensity: 0.75,
    dirLightColor: 0x93c5fd,
    dirLightIntensity: 0.85,
  },
};

/**
 * AnimeSky3D - Complete 360° Makoto Shinkai Day / Sunset / Night Sky
 * Featuring:
 * - 3-tier custom GLSL atmospheric gradient dome that NEVER turns black
 * - 360-degree encircling expressive 3D billowing clouds
 * - Radiant celestial orb (Sun / Moon) with lens halo
 * - Glittering starfield dome
 * - Zero frustum-culling glitches across entire 4x4 KM Velora map
 */
export class AnimeSky3D {
  public group: THREE.Group;
  private skyDome: THREE.Mesh;
  private skyShaderMat: THREE.ShaderMaterial;
  private cloudPlanesGroup: THREE.Group;
  private cloudShaderMaterials: THREE.ShaderMaterial[] = [];
  private celestialGlow: THREE.Mesh;
  private stars: THREE.Points;

  public currentTime: TimeOfDay = 'sunset';
  public autoCycleTime: boolean = false;
  private cycleTimer: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'anime_sky_3d_group';

    // 1. Sky Dome with GLSL Shader (Local position coordinates for 100% stable 360° gradient)
    const domeGeo = new THREE.SphereGeometry(1050, 48, 36);
    this.skyShaderMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        topColor: { value: new THREE.Color(SKY_PALETTES.sunset.topColor) },
        midColor: { value: new THREE.Color(SKY_PALETTES.sunset.midColor) },
        botColor: { value: new THREE.Color(SKY_PALETTES.sunset.botColor) },
        hazeColor: { value: new THREE.Color(SKY_PALETTES.sunset.hazeColor) },
        celestialPos: { value: new THREE.Vector3().copy(SKY_PALETTES.sunset.celestialPos) },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 botColor;
        uniform vec3 hazeColor;
        uniform vec3 celestialPos;
        uniform float time;
        varying vec3 vLocalPos;

        void main() {
          float h = max(0.0, vLocalPos.y);

          // Makoto Shinkai vertical atmospheric gradient
          vec3 sky;
          if (h < 0.28) {
            float t = h / 0.28;
            sky = mix(botColor, midColor, smoothstep(0.0, 1.0, t));
          } else {
            float t = (h - 0.28) / 0.72;
            sky = mix(midColor, topColor, pow(t, 0.72));
          }

          // Below horizon fade for low camera angles
          if (vLocalPos.y < 0.0) {
            sky = mix(botColor, hazeColor, min(1.0, -vLocalPos.y * 3.5));
          }

          // Celestial light corona & god-ray aura
          vec3 celDir = normalize(celestialPos);
          float celDot = max(0.0, dot(vLocalPos, celDir));
          float aura = pow(celDot, 6.0) * 0.45 + pow(celDot, 28.0) * 0.85;
          sky += vec3(1.0, 0.94, 0.82) * aura;

          // Atmospheric horizon haze
          float haze = exp(-max(0.0, h) * 6.5) * 0.45;
          sky = mix(sky, hazeColor, haze);

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });

    this.skyDome = new THREE.Mesh(domeGeo, this.skyShaderMat);
    this.skyDome.frustumCulled = false; // Never cull the sky dome!
    this.skyDome.renderOrder = -1000;
    this.group.add(this.skyDome);

    // 2. 360° Encircling Expressive 3D Textured Cloud Formations
    this.cloudPlanesGroup = new THREE.Group();
    this.cloudPlanesGroup.renderOrder = -900;
    this.group.add(this.cloudPlanesGroup);
    this.create360CloudFormations();

    // 3. Celestial Sun / Moon Shader Orb
    this.celestialGlow = this.createCelestialShaderGlow();
    this.celestialGlow.frustumCulled = false;
    this.celestialGlow.renderOrder = -950;
    this.group.add(this.celestialGlow);

    // 4. Night Starfield
    this.stars = this.createStarfield();
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -980;
    this.group.add(this.stars);

    // Apply initial sunset palette
    this.applyTime(this.currentTime);
  }

  private generateCloudAlphaTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 512);

    const puffs = [
      { x: 256, y: 250, r: 165, a: 0.95 },
      { x: 170, y: 280, r: 135, a: 0.9 },
      { x: 340, y: 270, r: 140, a: 0.9 },
      { x: 220, y: 170, r: 115, a: 0.95 },
      { x: 300, y: 180, r: 120, a: 0.92 },
      { x: 110, y: 320, r: 95, a: 0.75 },
      { x: 400, y: 310, r: 100, a: 0.75 },
      { x: 260, y: 110, r: 90, a: 0.88 },
      { x: 180, y: 120, r: 75, a: 0.85 },
      { x: 330, y: 130, r: 80, a: 0.82 },
      { x: 65, y: 360, r: 75, a: 0.6 },
      { x: 445, y: 350, r: 75, a: 0.6 },
    ];

    for (const p of puffs) {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${p.a})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${p.a * 0.75})`);
      grad.addColorStop(0.85, `rgba(255, 255, 255, ${p.a * 0.25})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /**
   * Generates 360-degree encircling cloud planes so every direction
   * (North, South, East, West) has breathtaking anime cloud billows!
   */
  private create360CloudFormations() {
    const cloudMap = this.generateCloudAlphaTexture();

    const createMat = () => {
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          cloudTex: { value: cloudMap },
          highlightColor: { value: new THREE.Color() },
          shadowColor: { value: new THREE.Color() },
          opacity: { value: 0.95 },
          time: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D cloudTex;
          uniform vec3 highlightColor;
          uniform vec3 shadowColor;
          uniform float opacity;
          varying vec2 vUv;

          void main() {
            vec4 tex = texture2D(cloudTex, vUv);
            if (tex.a < 0.015) discard;

            float vertical = smoothstep(0.12, 0.88, vUv.y);
            vec3 color = mix(shadowColor, highlightColor, pow(vertical, 1.35));
            gl_FragColor = vec4(color, tex.a * opacity);
          }
        `,
      });
      this.cloudShaderMaterials.push(mat);
      return mat;
    };

    // 16 cloud clusters distributed in 360° ring around the player
    const cloudCount = 16;
    for (let i = 0; i < cloudCount; i++) {
      const angle = (i / cloudCount) * Math.PI * 2;
      const dist = 680 + (i % 3) * 60;
      const height = 180 + (i % 4) * 45;
      const width = 340 + (i % 3) * 80;
      const cloudH = 190 + (i % 2) * 50;

      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;

      const mat = createMat();
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, cloudH), mat);
      plane.position.set(px, height, pz);
      // Billboard faces center (where viewer stands)
      plane.lookAt(0, height, 0);
      plane.frustumCulled = false;
      this.cloudPlanesGroup.add(plane);
    }
  }

  private createCelestialShaderGlow(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(220, 220);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec2 vUv;
        void main() {
          float d = distance(vUv, vec2(0.5));
          if (d > 0.5) discard;
          float core = smoothstep(0.14, 0.0, d);
          float halo = pow(max(0.0, 1.0 - d * 2.0), 2.5);
          gl_FragColor = vec4(glowColor, core + halo * 0.75);
        }
      `,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createStarfield(): THREE.Points {
    const count = 900;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85 + 0.15); // Upper hemisphere
      const r = 980;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.currentTime = time;
    this.applyTime(time);
  }

  private applyTime(time: TimeOfDay) {
    const p = SKY_PALETTES[time];

    // Sky Dome uniforms
    this.skyShaderMat.uniforms.topColor.value.setHex(p.topColor);
    this.skyShaderMat.uniforms.midColor.value.setHex(p.midColor);
    this.skyShaderMat.uniforms.botColor.value.setHex(p.botColor);
    this.skyShaderMat.uniforms.hazeColor.value.setHex(p.hazeColor);
    this.skyShaderMat.uniforms.celestialPos.value.copy(p.celestialPos);

    // Celestial Sun / Moon glow placed along celestial direction
    const celDir = p.celestialPos.clone().normalize();
    this.celestialGlow.position.copy(celDir).multiplyScalar(880);
    this.celestialGlow.lookAt(0, 0, 0);

    const celMat = this.celestialGlow.material as THREE.ShaderMaterial;
    celMat.uniforms.glowColor.value.setHex(p.celestialColor);

    // Cloud planes tint
    for (const mat of this.cloudShaderMaterials) {
      mat.uniforms.highlightColor.value.setHex(p.cloudHighlight);
      mat.uniforms.shadowColor.value.setHex(p.cloudShadow);
      mat.uniforms.opacity.value = p.cloudOpacity;
    }

    // Stars
    (this.stars.material as THREE.PointsMaterial).opacity = p.starOpacity;
  }

  /**
   * Updates sky position relative to viewer so that the sky is ALWAYS
   * perfectly centered around the player's camera at all times across Velora.
   */
  public update(delta: number, viewerPos: THREE.Vector3) {
    // Keep skybox centered directly on viewer camera!
    this.group.position.copy(viewerPos);

    // Gentle cloud drifting rotation
    this.cloudPlanesGroup.rotation.y += delta * 0.0018;

    // Optional Day-Night automatic cycle
    if (this.autoCycleTime) {
      this.cycleTimer += delta;
      if (this.cycleTimer > 45) {
        this.cycleTimer = 0;
        if (this.currentTime === 'day') this.setTimeOfDay('sunset');
        else if (this.currentTime === 'sunset') this.setTimeOfDay('night');
        else this.setTimeOfDay('day');
      }
    }
  }
}
