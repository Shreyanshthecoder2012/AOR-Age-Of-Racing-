import * as THREE from 'three';

/**
 * AnimeSpriteFactory - Generates high-fidelity 2D hand-painted anime textures
 * in the art style of Makoto Shinkai (Your Name, Suzume, Weathering With You).
 * All textures are cached once at startup for 60+ FPS on low-end hardware.
 */
export class AnimeSpriteFactory {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  // Helper to create and cache CanvasTexture
  private static getOrCreateTexture(
    key: string,
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): THREE.CanvasTexture {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    drawFn(ctx, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    this.cache.set(key, texture);
    return texture;
  }

  // 1. Sakura (Cherry Blossom) Tree - Painted Anime Style
  public static getSakuraTreeTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('sakura_tree', 256, 320, (ctx, w, h) => {
      // Dark twisted bark trunk
      ctx.fillStyle = '#3e1f13';
      ctx.beginPath();
      ctx.moveTo(w * 0.45, h);
      ctx.lineTo(w * 0.55, h);
      ctx.lineTo(w * 0.53, h * 0.55);
      ctx.lineTo(w * 0.65, h * 0.45);
      ctx.lineTo(w * 0.62, h * 0.42);
      ctx.lineTo(w * 0.51, h * 0.52);
      ctx.lineTo(w * 0.44, h * 0.4);
      ctx.lineTo(w * 0.40, h * 0.43);
      ctx.lineTo(w * 0.47, h * 0.58);
      ctx.closePath();
      ctx.fill();

      // Lush pink canopy puffs with soft anime shading
      const puffs = [
        { x: w * 0.5, y: h * 0.35, r: 75, col: '#f472b6' },
        { x: w * 0.32, y: h * 0.38, r: 55, col: '#fb7185' },
        { x: w * 0.68, y: h * 0.36, r: 60, col: '#f472b6' },
        { x: w * 0.42, y: h * 0.22, r: 50, col: '#fbcfe8' },
        { x: w * 0.58, y: h * 0.20, r: 52, col: '#fdf2f8' },
        { x: w * 0.50, y: h * 0.28, r: 65, col: '#fda4af' },
      ];

      for (const p of puffs) {
        const grad = ctx.createRadialGradient(p.x - p.r * 0.2, p.y - p.r * 0.2, 5, p.x, p.y, p.r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, p.col);
        grad.addColorStop(0.85, '#ec4899');
        grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Highlights / floating petal flecks
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 24; i++) {
        const px = w * 0.25 + Math.random() * w * 0.5;
        const py = h * 0.12 + Math.random() * h * 0.35;
        ctx.beginPath();
        ctx.ellipse(px, py, 3, 1.5, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // 2. Traditional Japanese Country Home
  public static getCountryHouseTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('country_house', 320, 240, (ctx, w, h) => {
      // Warm plaster walls
      ctx.fillStyle = '#f1ece4';
      ctx.fillRect(w * 0.15, h * 0.38, w * 0.7, h * 0.62);

      // Wood frame columns
      ctx.fillStyle = '#4a3728';
      ctx.fillRect(w * 0.14, h * 0.38, 8, h * 0.62);
      ctx.fillRect(w * 0.84, h * 0.38, 8, h * 0.62);
      ctx.fillRect(w * 0.49, h * 0.38, 6, h * 0.62);

      // Dark Japanese tile roof (Kawara)
      ctx.fillStyle = '#2d3748';
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.42);
      ctx.lineTo(w * 0.5, h * 0.08);
      ctx.lineTo(w * 0.95, h * 0.42);
      ctx.lineTo(w * 0.88, h * 0.44);
      ctx.lineTo(w * 0.5, h * 0.14);
      ctx.lineTo(w * 0.12, h * 0.44);
      ctx.closePath();
      ctx.fill();

      // Ridge tile accents
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const y = h * 0.14 + i * 10;
        ctx.beginPath();
        ctx.moveTo(w * 0.3 + i * 4, y);
        ctx.lineTo(w * 0.7 - i * 4, y);
        ctx.stroke();
      }

      // Warm glowing Shoji paper sliding door
      const shojiGrad = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.9);
      shojiGrad.addColorStop(0, '#fef08a');
      shojiGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = shojiGrad;
      ctx.fillRect(w * 0.25, h * 0.52, w * 0.22, h * 0.42);
      ctx.fillRect(w * 0.53, h * 0.52, w * 0.22, h * 0.42);

      // Wood lattice grid
      ctx.strokeStyle = 'rgba(74, 55, 40, 0.7)';
      ctx.lineWidth = 1.5;
      for (let x of [w * 0.32, w * 0.39, w * 0.60, w * 0.67]) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.52);
        ctx.lineTo(x, h * 0.94);
        ctx.stroke();
      }
      for (let y = h * 0.6; y < h * 0.94; y += 18) {
        ctx.beginPath();
        ctx.moveTo(w * 0.25, y);
        ctx.lineTo(w * 0.47, y);
        ctx.moveTo(w * 0.53, y);
        ctx.lineTo(w * 0.75, y);
        ctx.stroke();
      }
    });
  }

  // 3. Japanese Electric Utility Pole with Transformer & Cables
  public static getUtilityPoleTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('utility_pole', 180, 360, (ctx, w, h) => {
      // Concrete grey pole
      ctx.fillStyle = '#64748b';
      ctx.fillRect(w * 0.46, h * 0.1, w * 0.08, h * 0.9);

      // Upper and lower crossarms
      ctx.fillStyle = '#334155';
      ctx.fillRect(w * 0.2, h * 0.16, w * 0.6, 8);
      ctx.fillRect(w * 0.26, h * 0.24, w * 0.48, 7);

      // White ceramic insulator pegs
      ctx.fillStyle = '#f8fafc';
      for (const x of [w * 0.23, w * 0.38, w * 0.62, w * 0.77]) {
        ctx.fillRect(x, h * 0.13, 6, 8);
      }

      // Cylindrical transformer drum
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(w * 0.56, h * 0.28, 28, 45, 4);
      ctx.fill();

      // Dangling wire curve
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.16);
      ctx.quadraticCurveTo(w * 0.25, h * 0.20, w * 0.48, h * 0.16);
      ctx.stroke();
    });
  }

  // 4. Roadside Japanese Vending Machine (Jidōhanbaiki)
  public static getVendingMachineTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('vending_machine', 160, 260, (ctx, w, h) => {
      // Red casing
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(w * 0.1, h * 0.08, w * 0.8, h * 0.88, 8);
      ctx.fill();

      // Glowing illuminated glass drink display
      const glassGrad = ctx.createLinearGradient(0, h * 0.15, 0, h * 0.6);
      glassGrad.addColorStop(0, '#e0f2fe');
      glassGrad.addColorStop(1, '#7dd3fc');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(w * 0.16, h * 0.14, w * 0.68, h * 0.46);

      // Rows of canned drinks (blue = cold, red = warm)
      for (let r = 0; r < 3; r++) {
        const y = h * 0.18 + r * 34;
        for (let c = 0; c < 5; c++) {
          const x = w * 0.2 + c * 18;
          ctx.fillStyle = (r + c) % 2 === 0 ? '#2563eb' : '#ef4444';
          ctx.fillRect(x, y, 12, 18);
          // Can price button
          ctx.fillStyle = (r + c) % 2 === 0 ? '#38bdf8' : '#f87171';
          ctx.fillRect(x + 2, y + 20, 8, 4);
        }
      }

      // Coin slot & illuminated dispense chute
      ctx.fillStyle = '#18181b';
      ctx.fillRect(w * 0.65, h * 0.64, 16, 6); // Coin
      ctx.fillStyle = '#09090b';
      ctx.fillRect(w * 0.2, h * 0.74, w * 0.6, 26); // Dispense slot

      // Soft cyan underglow
      const underglow = ctx.createLinearGradient(0, h * 0.88, 0, h);
      underglow.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
      underglow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = underglow;
      ctx.fillRect(0, h * 0.88, w, h * 0.12);
    });
  }

  // 5. Tokyo Skyscraper with Animated Neon Signs
  public static getSkyscraperTexture(colorTheme: 'cyan' | 'magenta' | 'amber'): THREE.CanvasTexture {
    const key = `skyscraper_${colorTheme}`;
    return this.getOrCreateTexture(key, 240, 480, (ctx, w, h) => {
      // Dark slate skyscraper facade
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Window grid with random lit apartments / offices
      ctx.fillStyle = '#fef08a';
      for (let y = 15; y < h - 80; y += 18) {
        for (let x = 12; x < w - 12; x += 18) {
          if (Math.random() > 0.45) {
            ctx.fillStyle = Math.random() > 0.3 ? '#fef08a' : '#38bdf8';
            ctx.fillRect(x, y, 10, 8);
          }
        }
      }

      // Prominent Japanese Kanji Neon Sign
      const neonY = h * 0.35;
      const neonH = 75;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(16, neonY, w - 32, neonH);

      const neonColor = colorTheme === 'cyan' ? '#06b6d4' : colorTheme === 'magenta' ? '#ec4899' : '#f59e0b';
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(16, neonY, w - 32, neonH);

      ctx.fillStyle = neonColor;
      ctx.font = 'bold 32px "Space Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = colorTheme === 'cyan' ? '深夜喫茶' : colorTheme === 'magenta' ? '新宿中央' : '星空ホテル';
      ctx.fillText(text, w / 2, neonY + neonH / 2);

      // Soft neon bloom haze
      ctx.fillStyle = colorTheme === 'cyan' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(236, 72, 153, 0.15)';
      ctx.fillRect(6, neonY - 10, w - 12, neonH + 20);
    });
  }

  // 6. Japanese Commuter Train (Enoden Green & Cream)
  public static getTrainTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('enoden_train', 380, 160, (ctx, w, h) => {
      // Vintage dark green body
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.roundRect(0, h * 0.15, w, h * 0.75, 8);
      ctx.fill();

      // Cream mid stripe
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(0, h * 0.35, w, h * 0.28);

      // Commuter windows with warm interior glow
      const winGrad = ctx.createLinearGradient(0, h * 0.38, 0, h * 0.58);
      winGrad.addColorStop(0, '#fef9c3');
      winGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = winGrad;
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(35 + i * 65, h * 0.38, 48, 28);
      }

      // Front windshield & headlight
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(w - 38, h * 0.36, 30, 32);

      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(w - 12, h * 0.72, 9, 0, Math.PI * 2);
      ctx.fill();

      // Pantograph rooftop connector
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.25, h * 0.15);
      ctx.lineTo(w * 0.32, h * 0.04);
      ctx.lineTo(w * 0.40, h * 0.15);
      ctx.stroke();
    });
  }

  // 7. Coastal Wave Breaker (Tetrapod)
  public static getTetrapodTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('tetrapod', 160, 160, (ctx, w, h) => {
      ctx.fillStyle = '#94a3b8';
      const cx = w / 2;
      const cy = h / 2;

      // 4 rounded conical arms
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.arc(cx, cy - 42, 18, 0, Math.PI * 2);
      ctx.arc(cx - 38, cy + 28, 18, 0, Math.PI * 2);
      ctx.arc(cx + 38, cy + 28, 18, 0, Math.PI * 2);
      ctx.fill();

      // Ambient shading
      ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy + 8, 16, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 8. Coastal Palm Tree
  public static getPalmTreeTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('palm_tree', 200, 300, (ctx, w, h) => {
      // Slanted textured trunk
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(w * 0.35, h);
      ctx.quadraticCurveTo(w * 0.55, h * 0.5, w * 0.48, h * 0.28);
      ctx.stroke();

      // Deep green palm fronds arching down
      ctx.fillStyle = '#15803d';
      const cx = w * 0.48;
      const cy = h * 0.28;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const ex = cx + Math.cos(a) * 75;
        const ey = cy + Math.sin(a) * 55 + 20;
        ctx.quadraticCurveTo(cx + Math.cos(a) * 45, cy + Math.sin(a) * 30 - 15, ex, ey);
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#16a34a';
        ctx.stroke();
      }
    });
  }

  // 9. Friendly Traffic Car Sprite (Rear View)
  public static getTrafficCarTexture(color: string): THREE.CanvasTexture {
    const key = `traffic_${color}`;
    return this.getOrCreateTexture(key, 180, 140, (ctx, w, h) => {
      // Compact commuter car body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(w * 0.1, h * 0.35, w * 0.8, h * 0.52, 10);
      ctx.fill();

      // Cabin roof & rear window
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(w * 0.2, h * 0.12, w * 0.6, h * 0.3, 8);
      ctx.fill();

      // Rear glass with reflection
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(w * 0.24, h * 0.16, w * 0.52, h * 0.22, 6);
      ctx.fill();

      // Glowing red taillights
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(w * 0.14, h * 0.46, 26, 12);
      ctx.fillRect(w * 0.86 - 26, h * 0.46, 26, 12);

      // License plate (Japanese white & green)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(w * 0.4, h * 0.64, 36, 18);
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('品川 500', w * 0.5, h * 0.73);

      // Dual exhaust
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(w * 0.24, h * 0.88, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 10. Railway Crossing (Fumikiri) Warning Post
  public static getFumikiriTexture(): THREE.CanvasTexture {
    return this.getOrCreateTexture('fumikiri', 140, 260, (ctx, w, h) => {
      // Post
      ctx.fillStyle = '#facc15';
      ctx.fillRect(w * 0.45, h * 0.15, 14, h * 0.85);

      // Black stripes
      ctx.fillStyle = '#0f172a';
      for (let y = h * 0.25; y < h * 0.95; y += 32) {
        ctx.fillRect(w * 0.45, y, 14, 16);
      }

      // X Crossbuck
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.save();
      ctx.translate(w * 0.5, h * 0.22);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-35, -6, 70, 12);
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(-35, -6, 70, 12);
      ctx.restore();

      // Dual Flashing Red Warning Lamps
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(w * 0.32, h * 0.32, 12, 0, Math.PI * 2);
      ctx.arc(w * 0.68, h * 0.32, 12, 0, Math.PI * 2);
      ctx.fill();

      // Red bulb glow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w * 0.32, h * 0.32, 4, 0, Math.PI * 2);
      ctx.arc(w * 0.68, h * 0.32, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
