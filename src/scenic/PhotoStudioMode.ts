import * as THREE from 'three';
import { PeacefulDrivingEngine } from './PeacefulDrivingEngine';

export type PhotoFilter = 'your_name' | 'weathering' | 'suzume' | 'cel_90s' | 'clean';

export class PhotoStudioMode {
  private engine: PeacefulDrivingEngine;
  public isActive: boolean = false;
  private savedCameraPos: THREE.Vector3 = new THREE.Vector3();
  private savedCameraRot: THREE.Euler = new THREE.Euler();
  private orbitAngle: number = 0;
  private orbitDistance: number = 8.5;
  private orbitHeight: number = 2.2;
  private currentFilter: PhotoFilter = 'your_name';

  constructor(engine: PeacefulDrivingEngine) {
    this.engine = engine;
  }

  public open() {
    this.isActive = true;
    this.savedCameraPos.copy(this.engine.camera.position);
    this.savedCameraRot.copy(this.engine.camera.rotation);

    // Initial photo position relative to car
    this.orbitDistance = 7.5;
    this.orbitHeight = 1.9;
    this.orbitAngle = Math.PI * 0.15;
    this.updateCamera();
  }

  public close() {
    this.isActive = false;
    this.engine.camera.position.copy(this.savedCameraPos);
    this.engine.camera.rotation.copy(this.savedCameraRot);
  }

  public adjustOrbit(deltaAngle: number, deltaDistance: number, deltaHeight: number) {
    if (!this.isActive) return;
    this.orbitAngle += deltaAngle;
    this.orbitDistance = Math.max(3.5, Math.min(22, this.orbitDistance + deltaDistance));
    this.orbitHeight = Math.max(0.6, Math.min(9.0, this.orbitHeight + deltaHeight));
    this.updateCamera();
  }

  private updateCamera() {
    const carPos = this.engine.carPos;
    const cx = carPos.x + Math.sin(this.orbitAngle) * this.orbitDistance;
    const cz = carPos.z - Math.cos(this.orbitAngle) * this.orbitDistance;
    this.engine.camera.position.set(cx, this.orbitHeight, cz);
    this.engine.camera.lookAt(carPos.x, 0.9, carPos.z);
  }

  public setFilter(filter: PhotoFilter) {
    this.currentFilter = filter;
  }

  public capturePostcard(canvas: HTMLCanvasElement): string {
    // Render current frame
    this.engine.renderer.render(this.engine.scene, this.engine.camera);

    // Create a postcard canvas with Japanese anime cinema framing & typography
    const postCanvas = document.createElement('canvas');
    postCanvas.width = canvas.width;
    postCanvas.height = canvas.height;
    const ctx = postCanvas.getContext('2d')!;

    // 1. Draw base 3D scene
    ctx.drawImage(canvas, 0, 0);

    // 2. Apply Artistic Color Grading Filter
    if (this.currentFilter === 'your_name') {
      // Shinkai Twilight: Vibrant magenta/cyan tone curve
      ctx.fillStyle = 'rgba(186, 45, 101, 0.14)';
      ctx.globalCompositeOperation = 'color';
      ctx.fillRect(0, 0, postCanvas.width, postCanvas.height);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.08)';
      ctx.globalCompositeOperation = 'screen';
      ctx.fillRect(0, 0, postCanvas.width, postCanvas.height);
    } else if (this.currentFilter === 'weathering') {
      // Rain Blue: High clarity aqua glow
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.globalCompositeOperation = 'color';
      ctx.fillRect(0, 0, postCanvas.width, postCanvas.height);
    } else if (this.currentFilter === 'suzume') {
      // Golden Hour: Rich amber warmth
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.globalCompositeOperation = 'color';
      ctx.fillRect(0, 0, postCanvas.width, postCanvas.height);
    } else if (this.currentFilter === 'cel_90s') {
      // Nostalgic anime film grain and soft warmth
      ctx.fillStyle = 'rgba(254, 240, 138, 0.12)';
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillRect(0, 0, postCanvas.width, postCanvas.height);
    }
    ctx.globalCompositeOperation = 'source-over';

    // 3. Cinematic Letterbox Bars
    const barHeight = Math.floor(postCanvas.height * 0.065);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, postCanvas.width, barHeight);
    ctx.fillRect(0, postCanvas.height - barHeight, postCanvas.width, barHeight);

    // 4. Japanese Cinema Title Card Watermark
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px "Syne", "Space Mono", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('君と見た空 · SCENIC DRIVE', 40, postCanvas.height - barHeight + 36);

    ctx.font = '400 15px "Space Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    const loc = this.engine.currentTheme.toUpperCase().replace('_', ' ');
    ctx.fillText(`JAPAN · ${loc} · 35mm FILM`, postCanvas.width - 40, postCanvas.height - barHeight + 36);

    return postCanvas.toDataURL('image/jpeg', 0.95);
  }
}
