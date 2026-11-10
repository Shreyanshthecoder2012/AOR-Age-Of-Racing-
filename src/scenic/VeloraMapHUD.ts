import { VELORA_DISTRICTS, DistrictDefinition, getVeloraDistrictByCoords } from './VeloraWorldData';
import { PeacefulDrivingEngine } from './PeacefulDrivingEngine';

/**
 * VeloraMapHUD - Full-screen interactive GTA/RDR style 4x4 km World Map.
 * Allows viewing all 16 districts, inspecting landmarks, speed limits,
 * and fast-traveling / teleporting anywhere across Velora.
 */
export class VeloraMapHUD {
  private engine: PeacefulDrivingEngine;
  private overlay: HTMLElement;
  private isOpen: boolean = false;
  private selectedDistrict: DistrictDefinition = VELORA_DISTRICTS[0];
  private playerDot: HTMLElement | null = null;
  private mapCanvas: HTMLCanvasElement | null = null;
  private infoPanel: HTMLElement | null = null;

  constructor(engine: PeacefulDrivingEngine) {
    this.engine = engine;
    this.overlay = this.createDOM();
    document.body.appendChild(this.overlay);

    this.bindEvents();
  }

  private createDOM(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'velora-map-modal';
    el.className = 'velora-map-modal hidden';
    el.innerHTML = `
      <div class="velora-map-container">
        <!-- Header -->
        <div class="velora-map-header">
          <div class="velora-map-title-group">
            <span class="velora-tag">OPEN WORLD MASTER MAP · 16 KM²</span>
            <h2 class="velora-city-title">VELORA (ヴェローラ市)</h2>
          </div>
          <div class="velora-map-header-right">
            <span class="velora-coord-readout" id="velora-live-coord">X: 0m | Z: 0m</span>
            <button id="btn-close-velora-map" class="velora-close-btn" type="button" aria-label="Close Map">✕</button>
          </div>
        </div>

        <!-- Main Map Area -->
        <div class="velora-map-body">
          <!-- 4x4 Grid Canvas & Interactive District Cells -->
          <div class="velora-map-canvas-wrapper" id="velora-canvas-wrapper">
            <canvas id="velora-world-canvas" width="600" height="600"></canvas>
            <div id="velora-player-marker" class="velora-player-blip" title="You are here">
              <div class="blip-pulse"></div>
              <div class="blip-arrow">▲</div>
            </div>
            <!-- District Clickable Grid Overlay -->
            <div class="velora-grid-overlay" id="velora-grid-cells"></div>
          </div>

          <!-- District Info & Fast Travel Card -->
          <div class="velora-info-card" id="velora-info-panel">
            <div class="district-badge" id="vinfo-number">01</div>
            <h3 class="district-name" id="vinfo-name">Green Heights</h3>
            <div class="district-japanese" id="vinfo-japanese">緑ヶ丘 · 閑静な住宅街</div>
            <p class="district-tagline" id="vinfo-tagline">Quiet tree-lined residential community with central park & family homes</p>

            <div class="district-stat-grid">
              <div class="d-stat-box">
                <span class="d-stat-label">TYPE</span>
                <span class="d-stat-val" id="vinfo-type">RESIDENTIAL</span>
              </div>
              <div class="d-stat-box">
                <span class="d-stat-label">SPEED LIMIT</span>
                <span class="d-stat-val" id="vinfo-speed">60 KM/H</span>
              </div>
            </div>

            <div class="district-landmarks-box">
              <span class="landmarks-title">KEY LANDMARKS &amp; ARCHITECTURE</span>
              <ul class="landmarks-list" id="vinfo-landmarks">
                <li>Green Heights Park</li>
                <li>Community Clubhouse</li>
              </ul>
            </div>

            <div class="velora-action-row">
              <button id="btn-fast-travel" class="velora-fast-travel-btn" type="button">
                <span>⚡ FAST TRAVEL HERE</span>
                <kbd class="kbd-pill">ENTER</kbd>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Legend -->
        <div class="velora-map-footer">
          <div class="map-legend-row">
            <span class="legend-item"><span class="legend-swatch d-downtown"></span> DOWNTOWN (02, 03)</span>
            <span class="legend-item"><span class="legend-swatch d-residential"></span> RESIDENTIAL (01, 04, 07, 08, 11)</span>
            <span class="legend-item"><span class="legend-swatch d-civic"></span> CIVIC &amp; TRANSIT (06, 10)</span>
            <span class="legend-item"><span class="legend-swatch d-industrial"></span> INDUSTRIAL (09)</span>
            <span class="legend-item"><span class="legend-swatch d-waterfront"></span> WATERFRONT &amp; BRIDGE (14, 15)</span>
          </div>
          <span class="map-hint">PRESS [M] TO TOGGLE MAP · CLICK ANY DISTRICT TO TELEPORT</span>
        </div>
      </div>
    `;
    return el;
  }

  private bindEvents() {
    // Keyboard 'M' key opens/closes map
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        this.toggle();
      }
      if (e.code === 'Escape' && this.isOpen) {
        this.close();
      }
      if (e.code === 'Enter' && this.isOpen) {
        this.fastTravelToSelected();
      }
    });

    // Close button
    this.overlay.querySelector('#btn-close-velora-map')?.addEventListener('click', () => {
      this.close();
    });

    // Fast travel button
    this.overlay.querySelector('#btn-fast-travel')?.addEventListener('click', () => {
      this.fastTravelToSelected();
    });

    // Build the 4x4 Grid interactive cells
    this.buildGridCells();

    this.playerDot = this.overlay.querySelector('#velora-player-marker');
    this.mapCanvas = this.overlay.querySelector('#velora-world-canvas') as HTMLCanvasElement;
    this.infoPanel = this.overlay.querySelector('#velora-info-panel');

    this.drawMapCanvas();
  }

  private buildGridCells() {
    const container = this.overlay.querySelector('#velora-grid-cells');
    if (!container) return;

    container.innerHTML = '';
    for (const district of VELORA_DISTRICTS) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `velora-grid-cell type-${district.type}`;
      cell.setAttribute('data-id', district.id);
      cell.innerHTML = `
        <span class="cell-num">${district.number}</span>
        <span class="cell-name">${district.name}</span>
      `;

      cell.addEventListener('click', () => {
        this.selectDistrict(district);
      });

      cell.addEventListener('dblclick', () => {
        this.selectDistrict(district);
        this.fastTravelToSelected();
      });

      container.appendChild(cell);
    }
  }

  public toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  public open() {
    this.isOpen = true;
    this.overlay.classList.remove('hidden');

    // Auto-select current district where the player is
    const cur = getVeloraDistrictByCoords(this.engine.carPos.x, this.engine.carPos.z);
    this.selectDistrict(cur);

    this.updatePlayerMarker();
  }

  public close() {
    this.isOpen = false;
    this.overlay.classList.add('hidden');
  }

  private selectDistrict(d: DistrictDefinition) {
    this.selectedDistrict = d;

    // Highlight cell
    this.overlay.querySelectorAll('.velora-grid-cell').forEach((c) => {
      const match = c.getAttribute('data-id') === d.id;
      c.classList.toggle('selected', match);
    });

    // Update Info Card
    const elNum = this.overlay.querySelector('#vinfo-number');
    const elName = this.overlay.querySelector('#vinfo-name');
    const elJp = this.overlay.querySelector('#vinfo-japanese');
    const elTag = this.overlay.querySelector('#vinfo-tagline');
    const elType = this.overlay.querySelector('#vinfo-type');
    const elSpeed = this.overlay.querySelector('#vinfo-speed');
    const elLandmarks = this.overlay.querySelector('#vinfo-landmarks');

    if (elNum) elNum.textContent = d.number;
    if (elName) elName.textContent = d.name;
    if (elJp) elJp.textContent = d.japanese;
    if (elTag) elTag.textContent = d.tagline;
    if (elType) elType.textContent = d.type.toUpperCase();
    if (elSpeed) elSpeed.textContent = `${d.speedLimit} KM/H`;

    if (elLandmarks) {
      elLandmarks.innerHTML = d.landmarks.map((l) => `<li>${l}</li>`).join('');
    }
  }

  private fastTravelToSelected() {
    if (!this.selectedDistrict) return;

    // Teleport car position to district center
    this.engine.carPos.x = this.selectedDistrict.centerX;
    this.engine.carPos.z = this.selectedDistrict.centerZ;
    this.engine.speedKmh = 40; // Safe initial speed
    this.engine.lateralOffset = 0;

    this.engine.audio.playRepairSound();
    this.updatePlayerMarker();
    this.close();
  }

  private updatePlayerMarker() {
    if (!this.playerDot) return;

    // 4000x4000 world mapped to 600x600 canvas
    // (-2000 to +2000) -> (0 to 600)
    const normX = (this.engine.carPos.x + 2000) / 4000;
    const normZ = (this.engine.carPos.z + 2000) / 4000;

    const px = Math.max(10, Math.min(590, normX * 600));
    const pz = Math.max(10, Math.min(590, normZ * 600));

    this.playerDot.style.left = `${px}px`;
    this.playerDot.style.top = `${pz}px`;

    const coordEl = this.overlay.querySelector('#velora-live-coord');
    if (coordEl) {
      coordEl.textContent = `X: ${Math.round(this.engine.carPos.x)}m | Z: ${Math.round(this.engine.carPos.z)}m`;
    }
  }

  private drawMapCanvas() {
    if (!this.mapCanvas) return;
    const ctx = this.mapCanvas.getContext('2d');
    if (!ctx) return;

    const w = 600;
    const h = 600;

    // Background terrain
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // River channel across bottom (Z = 1200 to 1600 -> y = 480 to 540)
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(0, 480);
    ctx.bezierCurveTo(200, 460, 400, 520, 600, 490);
    ctx.lineTo(600, 540);
    ctx.bezierCurveTo(400, 570, 200, 510, 0, 530);
    ctx.closePath();
    ctx.fill();

    // Major Highways (Outer Ring Road)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 540, 540);

    // Boulevards (Cross Center at X=0, Z=0 -> x=300, y=300)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(300, 30);
    ctx.lineTo(300, 570);
    ctx.moveTo(30, 300);
    ctx.lineTo(570, 300);
    ctx.stroke();

    // Velora Grand Bridge Span across River at X = 500 (x = 375, y = 460 to 550)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(375, 470);
    ctx.lineTo(375, 545);
    ctx.stroke();
  }
}
