import * as THREE from 'three';

/**
 * PainterlyRainSystem - Continuous, asynchronous anime rain
 * inspired by Makoto Shinkai's "The Garden of Words" and "Weathering With You".
 * Every raindrop has an independent lifetime and height to prevent uniform batching,
 * with hand-painted watercolor streaks and screen lens condensation.
 */
export class PainterlyRainSystem {
  public group: THREE.Group;
  private rainPoints: THREE.Points;
  private particleCount: number = 1400;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lengths: Float32Array;

  // On-screen lens condensation drops
  private lensCanvas: HTMLCanvasElement;
  private lensCtx: CanvasRenderingContext2D;
  private lensTexture: THREE.CanvasTexture;
  private lensMesh: THREE.Mesh;
  private lensDroplets: { x: number; y: number; r: number; alpha: number; speed: number }[] = [];

  constructor() {
    this.group = new THREE.Group();

    // 1. Create Painterly Anime Rain Streak Texture (Watercolor brush look)
    const streakCanvas = document.createElement('canvas');
    streakCanvas.width = 32;
    streakCanvas.height = 128;
    const sctx = streakCanvas.getContext('2d')!;

    // Soft painted gradient streak with glowing tip
    const grad = sctx.createLinearGradient(16, 0, 16, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.3, 'rgba(186, 230, 253, 0.35)');
    grad.addColorStop(0.85, 'rgba(224, 242, 254, 0.85)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.ellipse(16, 110, 4, 16, 0, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillRect(14, 20, 4, 90);

    const streakTex = new THREE.CanvasTexture(streakCanvas);

    // 2. Continuous Particle Geometry with independent heights & velocities
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount);
    this.lengths = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      // Completely asynchronous starting distribution
      this.positions[i * 3] = (Math.random() - 0.5) * 60;
      this.positions[i * 3 + 1] = Math.random() * 50; // Random heights across the sky
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 110;

      // Varied fall velocities (35 to 55 m/s)
      this.velocities[i] = 38 + Math.random() * 20;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const mat = new THREE.PointsMaterial({
      map: streakTex,
      color: 0xc7d2fe, // Soft twilight lavender/blue
      size: 0.75,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.rainPoints = new THREE.Points(geo, mat);
    this.group.add(this.rainPoints);

    // 3. Screen Lens Condensation (Watercolor droplets on camera glass)
    this.lensCanvas = document.createElement('canvas');
    this.lensCanvas.width = 512;
    this.lensCanvas.height = 512;
    this.lensCtx = this.lensCanvas.getContext('2d')!;
    this.lensTexture = new THREE.CanvasTexture(this.lensCanvas);

    // Create 35 independent lens droplets
    for (let i = 0; i < 35; i++) {
      this.lensDroplets.push({
        x: Math.random() * 512,
        y: Math.random() * 512,
        r: 3 + Math.random() * 7,
        alpha: 0.3 + Math.random() * 0.5,
        speed: 15 + Math.random() * 35,
      });
    }

    const lensGeo = new THREE.PlaneGeometry(2, 2);
    const lensMat = new THREE.MeshBasicMaterial({
      map: this.lensTexture,
      transparent: true,
      opacity: 0.65,
      depthTest: false,
      depthWrite: false,
    });
    this.lensMesh = new THREE.Mesh(lensGeo, lensMat);
    // Fixed in front of camera
    this.lensMesh.position.set(0, 0, -1.0);
    this.lensMesh.visible = true;
  }

  public getLensMesh(): THREE.Mesh {
    return this.lensMesh;
  }

  public update(delta: number, carPos: THREE.Vector3, wipersActive: boolean) {
    // 1. Update continuous 3D rain streaks (independent respawn)
    this.rainPoints.position.set(carPos.x, 0, carPos.z);
    const posAttr = this.rainPoints.geometry.attributes.position as THREE.BufferAttribute;

    const count = this.particleCount;
    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i) - this.velocities[i] * delta;
      // Slight atmospheric wind drift along X
      let x = posAttr.getX(i) - delta * 3.5;

      // Independent respawn: resets only this individual drop smoothly!
      if (y < 0.1) {
        y = 48 + Math.random() * 4;
        x = (Math.random() - 0.5) * 60;
        posAttr.setZ(i, (Math.random() - 0.5) * 110);
      }
      if (x < -30) x = 30;

      posAttr.setY(i, y);
      posAttr.setX(i, x);
    }
    posAttr.needsUpdate = true;

    // 2. Animate On-Screen Painted Lens Condensation
    this.lensCtx.clearRect(0, 0, 512, 512);

    for (const d of this.lensDroplets) {
      d.y += d.speed * delta;
      if (d.y > 512) {
        d.y = -10;
        d.x = Math.random() * 512;
        d.r = 3 + Math.random() * 7;
      }

      // If wipers are sweeping, wipe droplets away
      if (wipersActive && Math.random() < 0.05) {
        d.y = -20;
      }

      // Draw soft painterly anime droplet with refraction ring
      const grad = this.lensCtx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 1, d.x, d.y, d.r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${d.alpha * 0.9})`);
      grad.addColorStop(0.6, `rgba(186, 230, 253, ${d.alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(147, 197, 253, 0)');

      this.lensCtx.fillStyle = grad;
      this.lensCtx.beginPath();
      this.lensCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      this.lensCtx.fill();

      // Droplet highlight glint
      this.lensCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.lensCtx.beginPath();
      this.lensCtx.arc(d.x - d.r * 0.35, d.y - d.r * 0.35, d.r * 0.3, 0, Math.PI * 2);
      this.lensCtx.fill();
    }
    this.lensTexture.needsUpdate = true;
  }
}
