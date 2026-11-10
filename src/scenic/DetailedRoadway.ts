import * as THREE from 'three';
import { getRoadSpline } from './HighwaySpline';

/**
 * DetailedRoadway - High-fidelity Japanese expressway asphalt
 * with realistic markings, directional arrows, speed limit stencils,
 * zebra crossings, manholes, drainage grates, and overhead traffic gantries.
 */
export class DetailedRoadway {
  public group: THREE.Group;
  public roadMesh: THREE.Mesh;
  public roadMat: THREE.MeshStandardMaterial;
  private trackLength: number;
  private segments: number;

  constructor(trackLength: number = 2400, segments: number = 240) {
    this.group = new THREE.Group();
    this.trackLength = trackLength;
    this.segments = segments;

    this.roadMat = this.createDetailedAsphaltMaterial();
    this.roadMesh = this.buildCurvedRoadMesh();
    this.group.add(this.roadMesh);

    this.createGuardrailsAndCurbs();
    this.createOverheadGantries();
  }

  private createDetailedAsphaltMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d')!;

    // 1. Inky textured asphalt background
    ctx.fillStyle = '#111622';
    ctx.fillRect(0, 0, 1024, 2048);

    // Subtle asphalt aggregate grain
    for (let i = 0; i < 4000; i++) {
      const gx = Math.random() * 1024;
      const gy = Math.random() * 2048;
      const col = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
      ctx.fillStyle = col;
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Tar expansion & repair seams
    ctx.strokeStyle = '#090d15';
    ctx.lineWidth = 4;
    for (let y = 300; y < 2048; y += 500) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(994, y + 25);
      ctx.stroke();
    }

    // Wet reflective sheen gradient
    const wetGrad = ctx.createLinearGradient(0, 0, 0, 2048);
    wetGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    wetGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.16)');
    wetGrad.addColorStop(1, 'rgba(56, 189, 248, 0.22)');
    ctx.fillStyle = wetGrad;
    ctx.fillRect(0, 0, 1024, 2048);

    // 2. Crisp Painted Lane Markings (3 lanes: widths ~320px each)
    const laneW = 1024 / 3;

    // Outer Shoulder Solid Yellow Lines
    ctx.fillStyle = '#facc15';
    ctx.fillRect(24, 0, 14, 2048);
    ctx.fillRect(1024 - 38, 0, 14, 2048);

    // Dashed White Lane Dividers
    ctx.fillStyle = '#ffffff';
    for (let y = 16; y < 2048; y += 96) {
      ctx.fillRect(laneW - 6, y, 12, 54);
      ctx.fillRect(laneW * 2 - 6, y, 12, 54);
    }

    // 3. Stenciled Speed Limit "80" on Center Lane
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 88px "Space Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('80', laneW * 1.5, 620);
    ctx.fillText('80', laneW * 1.5, 1640);

    // 4. White Directional Navigation Arrows on Road
    this.drawDirectionalArrow(ctx, laneW * 0.5, 380);
    this.drawDirectionalArrow(ctx, laneW * 1.5, 1200);
    this.drawDirectionalArrow(ctx, laneW * 2.5, 880);

    // 5. Cast-Iron Manhole Covers (Side lane)
    ctx.fillStyle = '#1e2430';
    ctx.beginPath();
    ctx.arc(laneW * 2.5, 1450, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 48);

    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.2,
      metalness: 0.45,
    });
  }

  private drawDirectionalArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    // Arrow head
    ctx.moveTo(cx, cy - 70);
    ctx.lineTo(cx + 30, cy - 25);
    ctx.lineTo(cx + 12, cy - 25);
    ctx.lineTo(cx + 12, cy + 50);
    ctx.lineTo(cx - 12, cy + 50);
    ctx.lineTo(cx - 12, cy - 25);
    ctx.lineTo(cx - 30, cy - 25);
    ctx.closePath();
    ctx.fill();
  }

  private buildCurvedRoadMesh(): THREE.Mesh {
    const roadWidth = 14.5;
    const halfW = roadWidth / 2;
    const segs = this.segments;
    const len = this.trackLength;
    const segLen = len / segs;

    const vertexCount = (segs + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices: number[] = [];

    for (let i = 0; i <= segs; i++) {
      const z = i * segLen;
      const { x: roadX } = getRoadSpline(z);

      // Left vertex
      positions[(i * 2) * 3] = roadX - halfW;
      positions[(i * 2) * 3 + 1] = 0.02;
      positions[(i * 2) * 3 + 2] = z;

      uvs[(i * 2) * 2] = 0;
      uvs[(i * 2) * 2 + 1] = (i / segs) * 48;

      // Right vertex
      positions[(i * 2 + 1) * 3] = roadX + halfW;
      positions[(i * 2 + 1) * 3 + 1] = 0.02;
      positions[(i * 2 + 1) * 3 + 2] = z;

      uvs[(i * 2 + 1) * 2] = 1;
      uvs[(i * 2 + 1) * 2 + 1] = (i / segs) * 48;

      if (i < segs) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        indices.push(row1, row2, row1 + 1);
        indices.push(row1 + 1, row2, row2 + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return new THREE.Mesh(geo, this.roadMat);
  }

  private createGuardrailsAndCurbs() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
    const segs = 160;
    const segLen = this.trackLength / segs;

    for (let i = 0; i < segs; i++) {
      const z = i * segLen;
      const { x: roadX, rotY } = getRoadSpline(z);

      // Left steel guardrail
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, segLen + 0.3), railMat);
      railL.position.set(roadX - 7.35, 0.65, z);
      railL.rotation.y = rotY;
      this.group.add(railL);

      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 8), postMat);
      postL.position.set(roadX - 7.35, 0.42, z);
      this.group.add(postL);

      // Right steel guardrail
      const railR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, segLen + 0.3), railMat);
      railR.position.set(roadX + 7.35, 0.65, z);
      railR.rotation.y = rotY;
      this.group.add(railR);

      const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 8), postMat);
      postR.position.set(roadX + 7.35, 0.42, z);
      this.group.add(postR);
    }
  }

  /**
   * Overhead Japanese Highway Signs / Traffic Gantries at district borders
   */
  private createOverheadGantries() {
    const gantryPositions = [280, 850, 1420, 2050];
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    for (const gz of gantryPositions) {
      const { x: roadX, rotY } = getRoadSpline(gz);

      const gantry = new THREE.Group();

      // Left & Right Pillars (8.5m high)
      const pL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.5, 0.5), gantryMat);
      pL.position.set(-8.2, 4.25, 0);
      gantry.add(pL);

      const pR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.5, 0.5), gantryMat);
      pR.position.set(8.2, 4.25, 0);
      gantry.add(pR);

      // Overhead Crossbar Span
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.6, 0.6), gantryMat);
      crossbar.position.set(0, 8.2, 0);
      gantry.add(crossbar);

      // Japanese Highway Green Signboard
      const signMat = new THREE.MeshBasicMaterial({ color: 0x15803d });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.2, 0.15), signMat);
      sign.position.set(0, 7.8, 0);
      gantry.add(sign);

      gantry.position.set(roadX, 0, gz);
      gantry.rotation.y = rotY;
      this.group.add(gantry);
    }
  }
}
