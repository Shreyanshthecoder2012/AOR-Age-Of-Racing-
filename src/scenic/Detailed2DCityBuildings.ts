import * as THREE from 'three';

/**
 * Detailed2DCityBuildings - High-fidelity 2D hand-painted Tokyo building facades
 * with authentic architectural details (balconies, AC compressor units, fire escapes,
 * rooftop antennas, illuminated kanji neon shopfronts, and rain-streaked windows).
 */
export class Detailed2DCityBuildings {
  private static textureCache: Map<string, THREE.CanvasTexture> = new Map();

  public static getBuildingFacadeTexture(styleIndex: number): THREE.CanvasTexture {
    const key = `detailed_bldg_${styleIndex % 3}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 1. Dark Rainy Tokyo Concrete Facade
    const facadeGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    facadeGrad.addColorStop(0, '#090d16');
    facadeGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = facadeGrad;
    ctx.fillRect(0, 0, 512, 1024);

    // Weathered concrete panel joints
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    for (let y = 60; y < 1024; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    for (let x = 64; x < 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }

    // 2. Multi-Story Windows with Interior Lighting & Rain Wetness
    const windowColors = ['#fef08a', '#38bdf8', '#fbcfe8', '#facc15', '#e0f2fe'];
    for (let floor = 1; floor < 12; floor++) {
      const y = 80 + floor * 72;
      for (let col = 0; col < 4; col++) {
        const x = 32 + col * 115;
        const w = 78;
        const h = 48;

        // Window frame
        ctx.fillStyle = '#020617';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Window interior glow
        if (Math.random() > 0.35) {
          const winColor = windowColors[(floor + col + styleIndex) % windowColors.length];
          const winGrad = ctx.createLinearGradient(x, y, x, y + h);
          winGrad.addColorStop(0, winColor);
          winGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = winGrad;
          ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

          // Curtains / blinds silhouette
          ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
          ctx.fillRect(x + 3, y + 3, (w - 6) * 0.4, h - 6);
        }

        // External Balcony Railing & Air Conditioner Unit
        if (floor % 2 === 0 && col % 2 === 1) {
          // Railing
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 8, y + h + 6);
          ctx.lineTo(x + w + 8, y + h + 6);
          ctx.stroke();

          // Japanese AC compressor condenser unit on balcony
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.roundRect(x + w - 24, y + h - 14, 26, 18, 3);
          ctx.fill();
          // Fan vent
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(x + w - 12, y + h - 5, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Emergency Zigzag Fire Escape on the left
    if (styleIndex % 2 === 0) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      for (let f = 2; f < 10; f += 2) {
        const y = 80 + f * 72;
        // Platform
        ctx.fillStyle = '#334155';
        ctx.fillRect(8, y + 42, 36, 6);
        // Diagonal ladder
        ctx.beginPath();
        ctx.moveTo(38, y + 42);
        ctx.lineTo(12, y + 114);
        ctx.stroke();
      }
    }

    // 4. Ground Floor Streetfront: Japanese Ramen / Izakaya / Cafe Sign
    const groundY = 880;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, groundY, 512, 144);

    const signs = [
      { text: '新宿 歌舞伎町', sub: 'SHINJUKU CENTRAL', neon: '#ec4899', bg: '#831843' },
      { text: 'ラーメン 光', sub: 'RAMEN 24 HOURS', neon: '#f59e0b', bg: '#78350f' },
      { text: '純喫茶 星空', sub: 'MIDNIGHT CAFE', neon: '#06b6d4', bg: '#164e63' },
    ];
    const s = signs[styleIndex % signs.length];

    // Illuminated Shop Signboard
    ctx.fillStyle = s.bg;
    ctx.fillRect(24, groundY + 16, 464, 76);
    ctx.strokeStyle = s.neon;
    ctx.lineWidth = 4;
    ctx.strokeRect(24, groundY + 16, 464, 76);

    ctx.fillStyle = s.neon;
    ctx.font = 'bold 36px "M PLUS 1p", "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, 256, groundY + 48);

    ctx.font = 'bold 14px "Space Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.sub, 256, groundY + 74);

    // Vending Machine on sidewalk
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(410, groundY + 45, 60, 95, 4);
    ctx.fill();
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(416, groundY + 54, 48, 40);

    // 5. Rooftop Details: Water Tank, Ventilation Ducts & Antennas
    ctx.fillStyle = '#334155';
    // Water tank
    ctx.beginPath();
    ctx.roundRect(80, 15, 65, 45, 6);
    ctx.fill();
    // Antenna mast with blinking red warning light
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(380, 60);
    ctx.lineTo(380, 8);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(380, 8, 4, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    this.textureCache.set(key, tex);
    return tex;
  }
}
