/**
 * Japanese Anime Slice-of-Life Peaceful Driving Journey
 * Art style inspired by Makoto Shinkai: "Your Name", "Suzume", "Weathering With You"
 * 3D Cars, roads, buildings, bridges, and barriers
 * 2D Painted skyboxes, distant mountains, and clouds
 */

import { PeacefulDrivingEngine } from './scenic/PeacefulDrivingEngine';
import { AnimeDriveUI } from './scenic/AnimeDriveUI';

function initApp() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // Clear previous canvas
  container.innerHTML = '';

  // Initialize 3D Scenic Drive Engine
  const engine = new PeacefulDrivingEngine(container);
  const ui = new AnimeDriveUI(engine);

  // Expose to window for debugging
  (window as unknown as { __animeEngine: PeacefulDrivingEngine; __animeUI: AnimeDriveUI }).__animeEngine = engine;
  (window as unknown as { __animeEngine: PeacefulDrivingEngine; __animeUI: AnimeDriveUI }).__animeUI = ui;

  // Welcome dialog dismiss
  const welcomeOverlay = document.getElementById('welcome-dialog-overlay');
  const btnStart = document.getElementById('btn-welcome-start');
  const btnAuto = document.getElementById('btn-welcome-autopilot');

  const startJourney = (autoPilot: boolean) => {
    if (welcomeOverlay) {
      welcomeOverlay.classList.add('hidden');
    }
    engine.audio.init();
    if (autoPilot) {
      engine.toggleAutoCruise();
    }
  };

  btnStart?.addEventListener('click', () => startJourney(false));
  btnAuto?.addEventListener('click', () => startJourney(true));

  window.addEventListener('keydown', (e) => {
    if (welcomeOverlay && !welcomeOverlay.classList.contains('hidden')) {
      if (e.code === 'Enter') {
        startJourney(false);
      } else if (e.code === 'KeyP') {
        startJourney(true);
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
