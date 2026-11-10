import * as THREE from 'three';
import { getRoadSpline } from './HighwaySpline';
import { getDistrictAtZ, TOTAL_MAP_LENGTH } from './DedicatedCityMap';
import { TrafficCar } from './DetailedTrafficManager';

/**
 * GTAStyleMiniMap - Circular GPS radar HUD display in the bottom-left corner
 * showing real-time road trajectory, player position & heading, nearby traffic blips,
 * and current district name just like GTA 5.
 */
export class GTAStyleMiniMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 220;
  private height: number = 220;

  constructor(canvasId: string = 'gta-minimap-canvas') {
    let el = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!el) {
      el = document.createElement('canvas');
      el.id = canvasId;
      el.className = 'gta-minimap-canvas';
      document.body.appendChild(el);
    }
    this.canvas = el;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;
  }

  public render(
    playerPos: THREE.Vector3,
    playerRotY: number,
    speedKmh: number,
    trafficCars: TrafficCar[]
  ) {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = 95;

    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Radar Circular Mask & Glass Background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Radar grid range rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 35, 0, Math.PI * 2);
    ctx.arc(cx, cy, 68, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Road Spline Ribbon (Oriented relative to player heading & position)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-playerRotY); // Rotate map so "forward" is UP

    const scale = 0.55; // 1 meter = 0.55 pixels on radar
    const roadPoints: { x: number; y: number }[] = [];

    for (let dz = -160; dz <= 160; dz += 10) {
      const worldZ = playerPos.z + dz;
      const { x: roadX } = getRoadSpline(worldZ);
      const relX = (roadX - playerPos.x) * scale;
      const relY = -dz * scale; // Negative Z is forward
      roadPoints.push({ x: relX, y: relY });
    }

    // Draw road ribbon
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    roadPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Road centerline
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Traffic Blips on Radar
    for (const car of trafficCars) {
      const dz = car.z - playerPos.z;
      if (Math.abs(dz) < 150) {
        const { x: roadX } = getRoadSpline(car.z);
        const carWorldX = roadX + car.laneX;
        const relX = (carWorldX - playerPos.x) * scale;
        const relY = -dz * scale;

        ctx.fillStyle = car.carType === 'f1' ? '#ef4444' : car.carType === 'rolls' ? '#a855f7' : '#facc15';
        ctx.beginPath();
        ctx.arc(relX, relY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // restore player rotation

    // 4. Player Marker (Center chevron arrow facing UP)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy + 7);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx - 6, cy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore(); // restore clip

    // 5. Outer Bezel Ring & Cardinal North Indicator
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // North Marker 'N'
    const northAngle = -playerRotY - Math.PI / 2;
    const nx = cx + Math.cos(northAngle) * (radius - 8);
    const ny = cy + Math.sin(northAngle) * (radius - 8);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);

    // 6. Current District Badge below Radar
    const district = getDistrictAtZ(playerPos.z);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(10, this.height - 24, this.width - 20, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(district.name, cx, this.height - 10);
  }
}
