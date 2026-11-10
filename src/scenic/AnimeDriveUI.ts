import { PeacefulDrivingEngine, DrivingTelemetry } from './PeacefulDrivingEngine';
import { PhotoStudioMode, PhotoFilter } from './PhotoStudioMode';
import { TimeOfDay } from './AnimeSky3D';
import { VehicleType } from './FancyVehicles';

export class AnimeDriveUI {
  private engine: PeacefulDrivingEngine;
  private photoMode: PhotoStudioMode;

  // DOM Elements
  private elLocationKanji: HTMLElement | null = null;
  private elLocationSub: HTMLElement | null = null;
  private elSpeedNum: HTMLElement | null = null;
  private elRpmNum: HTMLElement | null = null;
  private elGearNum: HTMLElement | null = null;
  private elAutoCruiseBtn: HTMLElement | null = null;
  private elRadioTitle: HTMLElement | null = null;
  private elRadioArtist: HTMLElement | null = null;
  private elRadioPlayBtn: HTMLElement | null = null;
  private elHeadlightBtn: HTMLElement | null = null;
  private elRainBtn: HTMLElement | null = null;
  private elNitroBadge: HTMLElement | null = null;
  private elRepairBtn: HTMLElement | null = null;
  private elDamageText: HTMLElement | null = null;
  private elPhotoModal: HTMLElement | null = null;
  private elPhotoPreview: HTMLImageElement | null = null;

  constructor(engine: PeacefulDrivingEngine) {
    this.engine = engine;
    this.photoMode = new PhotoStudioMode(engine);

    this.cacheElements();
    this.bindEvents();

    this.engine.onTelemetryUpdate = (telemetry: DrivingTelemetry) => {
      this.renderTelemetry(telemetry);
    };

    this.updateRadioDisplay();
  }

  private cacheElements() {
    this.elLocationKanji = document.getElementById('ui-location-kanji');
    this.elLocationSub = document.getElementById('ui-location-sub');
    this.elSpeedNum = document.getElementById('ui-speed-num');
    this.elRpmNum = document.getElementById('ui-rpm-num');
    this.elGearNum = document.getElementById('ui-gear-num');
    this.elAutoCruiseBtn = document.getElementById('btn-toggle-autocruise');
    this.elRadioTitle = document.getElementById('ui-radio-title');
    this.elRadioArtist = document.getElementById('ui-radio-artist');
    this.elRadioPlayBtn = document.getElementById('btn-radio-play');
    this.elHeadlightBtn = document.getElementById('btn-toggle-headlights');
    this.elRainBtn = document.getElementById('btn-toggle-rain');
    this.elNitroBadge = document.getElementById('ui-nitro-badge');
    this.elRepairBtn = document.getElementById('btn-repair-car');
    this.elDamageText = document.getElementById('ui-damage-text');
    this.elPhotoModal = document.getElementById('photo-modal-overlay');
    this.elPhotoPreview = document.getElementById('photo-postcard-img') as HTMLImageElement;
  }

  private bindEvents() {
    // 1. Vehicle Selector Buttons
    document.querySelectorAll('[data-veh-btn]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const type = (e.currentTarget as HTMLElement).getAttribute('data-veh-btn') as VehicleType;
        if (type) {
          this.engine.setVehicle(type);
          this.updateVehicleButtons(type);
        }
      });
    });

    // 2. Time of Day Switcher (Day, Sunset, Night)
    document.querySelectorAll('[data-time-btn]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const time = (e.currentTarget as HTMLElement).getAttribute('data-time-btn') as TimeOfDay;
        if (time) {
          this.engine.setTimeOfDay(time);
          this.updateTimeButtons(time);
        }
      });
    });

    // 3. Camera View Switchers (1, 2, 3, 4)
    document.querySelectorAll('[data-cam-btn]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const cam = (e.currentTarget as HTMLElement).getAttribute('data-cam-btn') as 'chase' | 'cockpit' | 'hood' | 'drone';
        if (cam) {
          this.engine.setCameraMode(cam);
          this.updateCamButtons(cam);
        }
      });
    });

    // 4. Auto-Cruise & Repair
    this.elAutoCruiseBtn?.addEventListener('click', () => {
      const active = this.engine.toggleAutoCruise();
      this.updateAutoCruiseButton(active);
    });

    this.elRepairBtn?.addEventListener('click', () => {
      this.engine.repairVehicle();
    });

    // 5. Rain Weather Toggle
    this.elRainBtn?.addEventListener('click', () => {
      const isRaining = this.engine.toggleRain();
      if (this.elRainBtn) {
        this.elRainBtn.innerHTML = `<span>🌧️ RAIN: ${isRaining ? 'ON' : 'OFF'}</span>`;
        this.elRainBtn.classList.toggle('active', isRaining);
      }
    });

    // 6. Headlights
    this.elHeadlightBtn?.addEventListener('click', () => {
      const mode = this.engine.cycleHeadlights();
      if (this.elHeadlightBtn) {
        this.elHeadlightBtn.textContent = `💡 LIGHTS: ${mode.toUpperCase()}`;
      }
    });

    // 7. Radio Controls
    this.elRadioPlayBtn?.addEventListener('click', () => {
      const playing = this.engine.audio.toggleMusic();
      if (this.elRadioPlayBtn) {
        this.elRadioPlayBtn.textContent = playing ? '⏸' : '▶';
      }
    });

    document.getElementById('btn-radio-next')?.addEventListener('click', () => {
      this.engine.audio.nextTrack();
      this.updateRadioDisplay();
    });

    // 8. Velora Map & Photo Mode
    document.getElementById('btn-open-map')?.addEventListener('click', () => {
      this.engine.mapHUD.toggle();
    });

    document.getElementById('btn-open-photo')?.addEventListener('click', () => {
      this.openPhotoMode();
    });

    document.getElementById('btn-close-photo')?.addEventListener('click', () => {
      this.closePhotoMode();
    });

    document.getElementById('btn-photo-capture')?.addEventListener('click', () => {
      this.captureAndDownloadPostcard();
    });

    // Photo Filters
    document.querySelectorAll('[data-photo-filter]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const filter = (e.currentTarget as HTMLElement).getAttribute('data-photo-filter') as PhotoFilter;
        if (filter) {
          this.photoMode.setFilter(filter);
          document.querySelectorAll('[data-photo-filter]').forEach((b) => b.classList.remove('active'));
          (e.currentTarget as HTMLElement).classList.add('active');
          this.refreshPhotoPreview();
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyC') {
        if (this.photoMode.isActive) this.closePhotoMode();
        else this.openPhotoMode();
      }
    });
  }

  private renderTelemetry(t: DrivingTelemetry) {
    if (this.elSpeedNum) this.elSpeedNum.textContent = String(t.speedKmh);
    if (this.elLocationKanji) this.elLocationKanji.textContent = t.japaneseTitle;
    if (this.elLocationSub) this.elLocationSub.textContent = `${t.locationName} · ${t.timeString}`;

    this.updateAutoCruiseButton(t.autoCruise);
    this.updateCamButtons(t.cameraMode);
    this.updateVehicleButtons(t.vehicleType);
    this.updateTimeButtons(t.timeOfDay);

    // Nitro badge glow
    if (this.elNitroBadge) {
      this.elNitroBadge.classList.toggle('nitro-active', t.isBoosting);
    }

    // Damage status & GTA 5 repair button
    if (this.elRepairBtn) {
      if (t.damagePercent > 0) {
        this.elRepairBtn.classList.remove('hidden');
        if (this.elDamageText) {
          this.elDamageText.textContent = `💥 DAMAGE: ${t.damagePercent}% · REPAIR`;
        }
      } else {
        this.elRepairBtn.classList.add('hidden');
      }
    }
  }

  private updateVehicleButtons(type: VehicleType) {
    document.querySelectorAll('[data-veh-btn]').forEach((btn) => {
      const active = btn.getAttribute('data-veh-btn') === type;
      btn.classList.toggle('active', active);
    });
  }

  private updateTimeButtons(time: TimeOfDay) {
    document.querySelectorAll('[data-time-btn]').forEach((btn) => {
      const active = btn.getAttribute('data-time-btn') === time;
      btn.classList.toggle('active', active);
    });
  }

  private updateCamButtons(cam: string) {
    document.querySelectorAll('[data-cam-btn]').forEach((btn) => {
      const active = btn.getAttribute('data-cam-btn') === cam;
      btn.classList.toggle('active', active);
    });
  }

  private updateAutoCruiseButton(active: boolean) {
    if (this.elAutoCruiseBtn) {
      this.elAutoCruiseBtn.classList.toggle('active', active);
      this.elAutoCruiseBtn.innerHTML = active
        ? `<span>ZEN CRUISE: ACTIVE</span><kbd class="kbd-pill">P</kbd>`
        : `<span>AUTO-CRUISE PILOT</span><kbd class="kbd-pill">P</kbd>`;
    }
  }

  private updateRadioDisplay() {
    const track = this.engine.audio.getCurrentTrack();
    if (this.elRadioTitle) this.elRadioTitle.textContent = track.title;
    if (this.elRadioArtist) this.elRadioArtist.textContent = track.artist;
  }

  private openPhotoMode() {
    this.photoMode.open();
    if (this.elPhotoModal) {
      this.elPhotoModal.classList.remove('hidden');
      this.refreshPhotoPreview();
    }
  }

  private closePhotoMode() {
    this.photoMode.close();
    if (this.elPhotoModal) {
      this.elPhotoModal.classList.add('hidden');
    }
  }

  private refreshPhotoPreview() {
    if (!this.elPhotoPreview) return;
    const canvas = this.engine.renderer.domElement;
    const dataUrl = this.photoMode.capturePostcard(canvas);
    this.elPhotoPreview.src = dataUrl;
  }

  private captureAndDownloadPostcard() {
    const canvas = this.engine.renderer.domElement;
    const dataUrl = this.photoMode.capturePostcard(canvas);
    const link = document.createElement('a');
    link.download = `tokyo_gt_${Date.now()}.jpg`;
    link.href = dataUrl;
    link.click();
  }
}
