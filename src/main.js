/**
 * Cosmic Racer 2.5D - Main Application Controller
 * Optimized for ultra low-end devices, responsive input handling, and instant gameplay.
 * Features:
 * - Drift mechanics with space inertia
 * - Smooth acceleration and braking
 * - Nitro boost HUD with live fill meter and status
 * - Sector lap timing with split delta alerts (+/-)
 * - Live AI opponent positions (1ST to 7TH) and minimap radar dots
 */

import { CosmicRacer25D } from './engine/CosmicRacer25D.js';

let engine = null;

function initApp() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // 1. Initialize 2.5D Engine
  engine = new CosmicRacer25D(container, {
    displayMode: 'hd',
    onSpeedUpdate: (kmh, speedRatio, isBoost) => {
      updateSpeedHUD(kmh, speedRatio, isBoost);
    },
    onCountdownTick: (val) => {
      const elF1 = document.getElementById('hud-f1-countdown');
      if (elF1) {
        elF1.textContent = String(val);
        elF1.classList.remove('hidden');
      }
    },
    onLightsOut: () => {
      const elF1 = document.getElementById('hud-f1-countdown');
      if (elF1) {
        elF1.classList.add('hidden');
      }
    },
    onLapComplete: (lapNum, lapTime, _bestLap) => {
      showLapSplit(lapNum, lapTime);
      const elLapCurr = document.getElementById('hud-lap-curr');
      if (elLapCurr) {
        elLapCurr.textContent = String(Math.min(3, lapNum + 1));
      }
      const elSectorInd = document.getElementById('hud-sector-indicator');
      if (elSectorInd) elSectorInd.textContent = 'S1';
    },
    onSectorComplete: (sectorNum, secTime, delta) => {
      showSectorAlert(sectorNum, secTime, delta);
      const elSectorInd = document.getElementById('hud-sector-indicator');
      if (elSectorInd) {
        elSectorInd.textContent = `S${Math.min(3, sectorNum + 1)}`;
      }
    },
    onPositionUpdate: (rank, total) => {
      updatePositionBadge(rank, total);
    },
    onNitroUpdate: (pct, active) => {
      updateNitroHUD(pct, active);
    },
    onStunt: (name, score) => {
      updateStuntBadge(name, score);
    },
    onPhaseChange: (phaseName, icon) => {
      showPhaseAlert(phaseName, icon);
    },
    onOvertakeAlert: (rivalName, side, active) => {
      showOvertakeAlert(rivalName, side, active);
    },
    onFinish: (totalTime, bestLap, rank) => {
      showFinishOverlay(totalTime, bestLap, rank);
    },
  });

  window.__cosmicEngine = engine;

  // 2. Cache HUD Elements
  const elLapTimer = document.getElementById('hud-lap-timer');
  const lapDigitEls = [
    document.getElementById('lap-d0'),
    document.getElementById('lap-d1'),
    document.getElementById('lap-d2'),
    document.getElementById('lap-d3'),
    document.getElementById('lap-d4'),
    document.getElementById('lap-d5'),
  ];
  const elLapSplit = document.getElementById('hud-lap-split');
  const elScaleSpeed = document.getElementById('hud-scale-speed');
  const elPosCurr = document.getElementById('hud-pos-curr');
  const elPosTotal = document.getElementById('hud-pos-total');
  const elNitroFill = document.getElementById('hud-nitro-fill');
  const elNitroStatus = document.getElementById('hud-nitro-status');
  const elNitroPct = document.getElementById('hud-nitro-pct');
  const elSectorAlert = document.getElementById('hud-sector-alert');
  const elSectorName = document.getElementById('hud-sector-name');
  const elSectorTime = document.getElementById('hud-sector-time');
  const elSectorDelta = document.getElementById('hud-sector-delta');

  // Atmosphere Phase Transition Alert & Opponent Overtake Elements
  const elPhaseAlert = document.getElementById('hud-phase-alert');
  const elPhaseIcon = document.getElementById('hud-phase-icon');
  const elPhaseTitle = document.getElementById('hud-phase-title');
  const elOvertakeAlert = document.getElementById('hud-overtake-alert');
  const elOvertakeDir = document.getElementById('hud-overtake-dir');
  const elOvertakeMsg = document.getElementById('hud-overtake-msg');

  const elWelcomeOverlay = document.getElementById('welcome-dialog-overlay');
  const btnWelcomeStart = document.getElementById('btn-welcome-start');
  const btnWelcomeAutopilot = document.getElementById('btn-welcome-autopilot');
  const elFinishOverlay = document.getElementById('hud-finish-overlay');
  const btnFinishRaceAgain = document.getElementById('btn-finish-race-again');
  const btnFinishAutopilot = document.getElementById('btn-finish-autopilot');
  const btnMuteSound = document.getElementById('btn-mute-sound');
  const iconSoundOn = document.getElementById('icon-sound-on');
  const iconSoundOff = document.getElementById('icon-sound-off');
  const btnPerfToggle = document.getElementById('btn-perf-toggle');

  // Build Speedometer Segments in SVG
  const ticksGroup = document.getElementById('speedo-ticks-group');
  const speedoSegEls = [];
  if (ticksGroup) {
    ticksGroup.innerHTML = '';
    const kx = 66.0;
    const ky = 36.0;
    const ux = 7.2;
    const uy = -10.8;
    const vx = 16.4;
    const vy = -2.25;
    const wx = 10.5;
    const wy = 11.2;

    for (let s = 0; s < 6; s++) {
      const p0x = kx - (6.0 - s) * ux;
      const p0y = ky - (6.0 - s) * uy;
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.id = `speedo-seg-${s}`;
      poly.setAttribute(
        'points',
        `${p0x.toFixed(1)},${p0y.toFixed(1)} ${(p0x + ux * 0.8).toFixed(1)},${(p0y + uy * 0.8).toFixed(1)} ${(p0x + ux * 0.8 + wx).toFixed(1)},${(p0y + uy * 0.8 + wy).toFixed(1)} ${(p0x + wx).toFixed(1)},${(p0y + wy).toFixed(1)}`
      );
      poly.style.fill = 'rgba(26, 26, 26, 0.12)';
      ticksGroup.appendChild(poly);
      speedoSegEls.push(poly);
    }
    for (let s = 0; s < 12; s++) {
      const p0x = kx + s * vx;
      const p0y = ky + s * vy;
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.id = `speedo-seg-${s + 6}`;
      poly.setAttribute(
        'points',
        `${p0x.toFixed(1)},${p0y.toFixed(1)} ${(p0x + vx * 0.8).toFixed(1)},${(p0y + vy * 0.8).toFixed(1)} ${(p0x + vx * 0.8 + wx).toFixed(1)},${(p0y + vy * 0.8 + wy).toFixed(1)} ${(p0x + wx).toFixed(1)},${(p0y + wy).toFixed(1)}`
      );
      poly.style.fill = 'rgba(26, 26, 26, 0.12)';
      ticksGroup.appendChild(poly);
      speedoSegEls.push(poly);
    }
  }

  const SPEEDO_COLORS = [
    '#1a1a1a', '#1a1a1a', '#1a1a1a', '#1a1a1a', '#1a1a1a', '#1a1a1a',
    '#ff6230', '#ff5722', '#ff4d15', '#ff450d', '#ff3e00', '#ff3e00',
    '#ff3e00', '#ff3e00', '#ff3e00', '#ff3e00', '#00e5ff', '#00f0ff',
  ];

  function updateSpeedHUD(kmh, speedRatio, isBoost) {
    if (elScaleSpeed) {
      elScaleSpeed.textContent = String(kmh);
      elScaleSpeed.style.color = isBoost ? '#ff3e00' : '';
    }

    const activeSegs = Math.min(18, Math.round(speedRatio * 18));
    for (let i = 0; i < speedoSegEls.length; i++) {
      const seg = speedoSegEls[i];
      if (!seg) continue;
      seg.style.fill = i < activeSegs ? SPEEDO_COLORS[i] : 'rgba(26, 26, 26, 0.12)';
    }

    if (btnPerfToggle && engine) {
      btnPerfToggle.textContent = engine.displayMode === 'eco' ? '⚡ 60FPS ECO' : '✨ 60FPS HD';
    }
  }

  function updatePositionBadge(rank, total) {
    if (elPosCurr) {
      const ordinals = ['', '1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH'];
      elPosCurr.textContent = ordinals[rank] || `${rank}TH`;
      elPosCurr.style.color = rank === 1 ? '#ff3e00' : '#1a1a1a';
    }
    if (elPosTotal) {
      elPosTotal.textContent = `/${total}`;
    }
  }

  function updateNitroHUD(pct, active) {
    if (elNitroFill) {
      elNitroFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      elNitroFill.style.background = active ? '#ff3e00' : '#00e5ff';
    }
    if (elNitroStatus) {
      elNitroStatus.textContent = active ? 'ENGAGED ⚡' : (pct < 15 ? 'RECHARGING...' : 'READY');
      elNitroStatus.style.color = active ? '#ff3e00' : '#1a1a1a';
    }
    if (elNitroPct) {
      elNitroPct.textContent = `${Math.round(pct)}%`;
    }
  }

  const elStuntState = document.getElementById('hud-stunt-state');
  const elStuntMult = document.getElementById('hud-stunt-mult');
  let stuntResetTimeout = null;

  function updateStuntBadge(stuntName, score) {
    if (!elStuntState || !elStuntMult) return;
    if (stuntResetTimeout) clearTimeout(stuntResetTimeout);

    if (stuntName) {
      const shortName = stuntName.replace('BARREL ROLL ', 'ROLL ').replace(' 360°', '');
      elStuntState.textContent = shortName;
      elStuntState.style.color = '#ff3e00';

      const mult = score > 500 ? 'x2.5' : (score > 0 ? 'x2.0' : 'x1.5');
      elStuntMult.textContent = mult;
      elStuntMult.style.color = '#00e5ff';

      stuntResetTimeout = setTimeout(() => {
        elStuntState.textContent = 'READY';
        elStuntState.style.color = '#1a1a1a';
        elStuntMult.textContent = 'x1.0';
        elStuntMult.style.color = '#ff3e00';
      }, 2200);
    }
  }

  function formatLapTimerMMSSCC(seconds) {
    const totalCentis = Math.max(0, Math.floor((seconds || 0) * 100));
    const mins = Math.floor(totalCentis / 6000);
    const secs = Math.floor((totalCentis % 6000) / 100);
    const centis = totalCentis % 100;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }

  let sectorAlertTimeout = null;
  function showSectorAlert(sectorNum, secTime, delta) {
    if (!elSectorAlert || !elSectorName || !elSectorTime || !elSectorDelta) return;
    if (sectorAlertTimeout) clearTimeout(sectorAlertTimeout);

    elSectorName.textContent = `SECTOR ${sectorNum}`;
    elSectorTime.textContent = formatLapTimerMMSSCC(secTime);

    if (delta !== null) {
      const sign = delta > 0 ? '+' : '';
      elSectorDelta.textContent = `${sign}${delta.toFixed(2)}s`;
      elSectorDelta.className = delta <= 0 ? 'sector-delta-gain' : 'sector-delta-loss';
      elSectorDelta.style.display = 'inline-block';
    } else {
      elSectorDelta.textContent = 'BEST';
      elSectorDelta.className = 'sector-delta-gain';
      elSectorDelta.style.display = 'inline-block';
    }

    elSectorAlert.classList.remove('hidden');
    sectorAlertTimeout = setTimeout(() => {
      elSectorAlert.classList.add('hidden');
    }, 2400);
  }

  let lapSplitTimeout = null;
  function showLapSplit(lapNum, lapTime) {
    if (!elLapSplit) return;
    if (lapSplitTimeout) clearTimeout(lapSplitTimeout);
    elLapSplit.textContent = `LAP ${lapNum} · ${formatLapTimerMMSSCC(lapTime)}`;
    elLapSplit.classList.remove('hidden');
    lapSplitTimeout = setTimeout(() => {
      elLapSplit.classList.add('hidden');
    }, 2800);
  }

  // Lap Atmosphere Phase Transition Banner
  let phaseAlertTimeout = null;
  function showPhaseAlert(phaseName, phaseIcon) {
    if (!elPhaseAlert) return;
    if (phaseAlertTimeout) clearTimeout(phaseAlertTimeout);

    if (elPhaseIcon) elPhaseIcon.textContent = phaseIcon || '☀️';
    if (elPhaseTitle) elPhaseTitle.textContent = phaseName || 'DAYLIGHT CIRCUIT';

    elPhaseAlert.classList.remove('hidden');
    phaseAlertTimeout = setTimeout(() => {
      elPhaseAlert.classList.add('hidden');
    }, 3200);
  }

  // Real-time Rival Overtake Alert
  function showOvertakeAlert(rivalName, side, active) {
    if (!elOvertakeAlert) return;
    if (active && rivalName) {
      if (elOvertakeDir) {
        elOvertakeDir.textContent = side === 'left' ? '◀' : '▶';
      }
      if (elOvertakeMsg) {
        elOvertakeMsg.textContent = `RIVAL OVERTAKING ${side.toUpperCase()}: ${rivalName}!`;
      }
      elOvertakeAlert.classList.remove('hidden');
    } else {
      elOvertakeAlert.classList.add('hidden');
    }
  }

  // Persistent Session Leaderboard (Top 5 Fastest Lap Times)
  const LEADERBOARD_KEY = 'cosmic_racer_session_leaderboard_v1';

  function getLeaderboard() {
    try {
      const data = localStorage.getItem(LEADERBOARD_KEY);
      if (data) return JSON.parse(data);
    } catch (_e) {}
    // Seed initial session benchmarks with AI rivals
    return [
      { pilot: 'NIGHT-HAWK', vehicle: 'SKYLINE GT-R R34', time: 14.85, isPlayer: false },
      { pilot: 'APEX-RX', vehicle: 'MAZDA RX-7 SPIRIT', time: 15.42, isPlayer: false },
      { pilot: 'GHOST-SUPRA', vehicle: 'SUPRA MK4 TURBO', time: 16.10, isPlayer: false },
    ];
  }

  function saveLeaderboardLap(lapTimeSeconds) {
    if (!lapTimeSeconds || lapTimeSeconds <= 0) return getLeaderboard();
    const list = getLeaderboard();
    list.push({
      pilot: 'YOU (PLAYER)',
      vehicle: 'DRIFT GT-R SPEC',
      time: parseFloat(lapTimeSeconds.toFixed(2)),
      isPlayer: true,
      timestamp: Date.now(),
    });
    // Sort ascending (fastest first)
    list.sort((a, b) => a.time - b.time);
    const top5 = list.slice(0, 5);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top5));
    } catch (_e) {}
    return top5;
  }

  function renderLeaderboardTable(currentLapTime = null) {
    const tbody = document.getElementById('finish-leaderboard-body');
    if (!tbody) return;
    const records = getLeaderboard();
    tbody.innerHTML = '';

    records.forEach((rec, idx) => {
      const tr = document.createElement('tr');
      if (rec.isPlayer) {
        tr.className = 'leaderboard-row-player';
      }
      tr.innerHTML = `
        <td class="lb-col-rank">${idx + 1}</td>
        <td class="lb-col-pilot">${rec.pilot} ${rec.isPlayer ? '<span class="lb-you-tag">YOU</span>' : ''}</td>
        <td class="lb-col-vehicle">${rec.vehicle}</td>
        <td class="lb-col-time">${formatLapTimerMMSSCC(rec.time)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function showFinishOverlay(totalTime, bestLap, rank = 1) {
    const elFinishTitle = document.getElementById('hud-finish-title');
    const elFinishTime = document.getElementById('hud-finish-time');
    const elFinishSub = document.getElementById('hud-finish-sub');

    if (elFinishTitle) {
      const rankTexts = ['', 'VICTORY · 1ST PLACE', 'PODIUM · 2ND PLACE', 'PODIUM · 3RD PLACE'];
      elFinishTitle.textContent = rankTexts[rank] || `FINISHED · ${rank}TH PLACE`;
    }
    if (elFinishTime) {
      elFinishTime.textContent = formatLapTimerMMSSCC(totalTime);
    }
    if (elFinishSub) {
      elFinishSub.textContent = `BEST LAP ${formatLapTimerMMSSCC(bestLap || totalTime / 3)}`;
    }

    // Save player's best lap to persistent session leaderboard and render
    if (bestLap) {
      saveLeaderboardLap(bestLap);
    }
    renderLeaderboardTable(bestLap);

    if (elFinishOverlay) {
      elFinishOverlay.classList.remove('hidden');
    }
  }

  // 3. Minimap Radar with AI Rivals & Player
  const minimapCanvas = document.getElementById('minimap-canvas');
  const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  function drawMinimap() {
    if (!minimapCtx || !minimapCanvas || !engine) return;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;

    minimapCtx.fillStyle = '#f9f8f5';
    minimapCtx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const rx = w * 0.40;
    const ry = h * 0.36;

    minimapCtx.save();
    // Track boundary outline
    minimapCtx.strokeStyle = 'rgba(26, 26, 26, 0.15)';
    minimapCtx.lineWidth = 14;
    minimapCtx.beginPath();
    minimapCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    minimapCtx.stroke();

    minimapCtx.strokeStyle = '#1a1a1a';
    minimapCtx.lineWidth = 6;
    minimapCtx.stroke();

    // Start / Finish Line
    minimapCtx.strokeStyle = '#ff3e00';
    minimapCtx.lineWidth = 4;
    minimapCtx.beginPath();
    minimapCtx.moveTo(cx + rx - 8, cy);
    minimapCtx.lineTo(cx + rx + 8, cy);
    minimapCtx.stroke();

    // Sector Checkpoint Lines on Minimap (1/3 & 2/3)
    const renderMinimapCheckpoint = (pct, color) => {
      const angle = pct * Math.PI * 2;
      const kx = cx + Math.cos(angle) * rx;
      const ky = cy + Math.sin(angle) * ry;
      minimapCtx.strokeStyle = color;
      minimapCtx.lineWidth = 3;
      minimapCtx.beginPath();
      minimapCtx.arc(kx, ky, 6, 0, Math.PI * 2);
      minimapCtx.stroke();
    };
    renderMinimapCheckpoint(0.33, '#00e5ff');
    renderMinimapCheckpoint(0.66, '#00e5ff');

    // AI Drones
    for (const car of engine.cars) {
      const droneProgress = (car.z % engine.trackLength) / engine.trackLength;
      const angle = droneProgress * Math.PI * 2;
      const dx = cx + Math.cos(angle) * rx;
      const dy = cy + Math.sin(angle) * ry;

      minimapCtx.fillStyle = car.color || '#00e5ff';
      minimapCtx.beginPath();
      minimapCtx.arc(dx, dy, 5, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.strokeStyle = '#1a1a1a';
      minimapCtx.lineWidth = 1.5;
      minimapCtx.stroke();
    }

    // Player Speeder
    const playerProgress = (engine.position % engine.trackLength) / engine.trackLength;
    const playerAngle = playerProgress * Math.PI * 2;
    const px = cx + Math.cos(playerAngle) * rx;
    const py = cy + Math.sin(playerAngle) * ry;

    minimapCtx.fillStyle = 'rgba(255, 62, 0, 0.35)';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 14, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.fillStyle = '#1a1a1a';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 7.5, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.fillStyle = '#ff3e00';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 5, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.restore();
  }

  // 4. Timer Animation Loop
  function tickUI() {
    if (engine && elLapTimer) {
      const timerStr = formatLapTimerMMSSCC(engine.totalRaceTime);
      const digitIndices = [0, 1, 3, 4, 6, 7];
      for (let d = 0; d < 6; d++) {
        const spanEl = lapDigitEls[d];
        const ch = timerStr[digitIndices[d]];
        if (spanEl && spanEl.textContent !== ch) {
          spanEl.textContent = ch;
        }
      }
    }
    drawMinimap();
    requestAnimationFrame(tickUI);
  }
  requestAnimationFrame(tickUI);

  // 5. Button Click Handlers & Instant Race Start
  function launchRace(withAutopilot = false) {
    if (elWelcomeOverlay) elWelcomeOverlay.classList.add('hidden');
    if (elFinishOverlay) elFinishOverlay.classList.add('hidden');
    if (engine) {
      engine.setAudioEnabled(true);
      updateAudioButtonUI(true);
      engine.setAutopilot(withAutopilot);
      engine.startRace();
    }
  }

  if (btnWelcomeStart) {
    btnWelcomeStart.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      launchRace(false);
    };
  }

  if (btnWelcomeAutopilot) {
    btnWelcomeAutopilot.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      launchRace(true);
    };
  }

  if (btnFinishRaceAgain) {
    btnFinishRaceAgain.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      launchRace(false);
    };
  }

  if (btnFinishAutopilot) {
    btnFinishAutopilot.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      launchRace(true);
    };
  }

  // Keyboard shortcut: Press ENTER or SPACE to launch from welcome screen
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      if (elWelcomeOverlay && !elWelcomeOverlay.classList.contains('hidden')) {
        launchRace(false);
      } else if (elFinishOverlay && !elFinishOverlay.classList.contains('hidden')) {
        launchRace(false);
      }
    } else if (e.code === 'KeyP') {
      if (elWelcomeOverlay && !elWelcomeOverlay.classList.contains('hidden')) {
        launchRace(true);
      }
    }
  });

  // Brand logo opens welcome modal
  const hudBrandLogo = document.getElementById('hud-brand-logo');
  if (hudBrandLogo) {
    hudBrandLogo.onclick = () => {
      if (elWelcomeOverlay) elWelcomeOverlay.classList.remove('hidden');
    };
  }

  // Audio Toggle
  function updateAudioButtonUI(enabled) {
    if (btnMuteSound) btnMuteSound.classList.toggle('is-muted', !enabled);
    if (iconSoundOn) iconSoundOn.classList.toggle('hidden', !enabled);
    if (iconSoundOff) iconSoundOff.classList.toggle('hidden', enabled);
  }

  if (btnMuteSound) {
    btnMuteSound.onclick = () => {
      if (engine) {
        const on = engine.toggleAudio();
        updateAudioButtonUI(on);
      }
    };
  }

  // Quick Performance Switcher (HD <-> ECO)
  if (btnPerfToggle) {
    btnPerfToggle.onclick = () => {
      if (!engine) return;
      const nextMode = engine.displayMode === 'hd' ? 'eco' : 'hd';
      engine.setDisplayMode(nextMode);
      btnPerfToggle.textContent = nextMode === 'eco' ? '⚡ 60FPS ECO' : '✨ 60FPS HD';

      document.querySelectorAll('.perf-pill').forEach((b) => {
        b.classList.toggle('active', b.dataset.mode === nextMode);
      });
    };
  }

  // Performance Mode Pills inside Welcome Dialog
  document.querySelectorAll('.perf-pill').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const mode = btn.dataset.mode;
      if (engine) engine.setDisplayMode(mode);
      document.querySelectorAll('.perf-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (btnPerfToggle) {
        btnPerfToggle.textContent = mode === 'eco' ? '⚡ 60FPS ECO' : '✨ 60FPS HD';
      }
    };
  });

  // Camera Mode Pills
  document.querySelectorAll('.cam-pill').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const cam = Number(btn.dataset.cam);
      if (engine) engine.cameraMode = cam;
      document.querySelectorAll('.cam-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  // Mobile Touch Controls
  const setupControlBtn = (id, ctrlKey) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const startPress = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('is-pressed');
      if (engine) engine.setTouchKey(ctrlKey, true);
    };

    const stopPress = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.remove('is-pressed');
      if (engine) engine.setTouchKey(ctrlKey, false);
    };

    btn.addEventListener('touchstart', startPress, { passive: false });
    btn.addEventListener('touchend', stopPress, { passive: false });
    btn.addEventListener('touchcancel', stopPress, { passive: false });
    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('mouseup', stopPress);
    btn.addEventListener('mouseleave', stopPress);
  };

  setupControlBtn('btn-touch-left', 'left');
  setupControlBtn('btn-touch-right', 'right');
  setupControlBtn('btn-touch-accel', 'forward');
  setupControlBtn('btn-touch-brake', 'backward');
  setupControlBtn('btn-touch-boost', 'boost');
}

// Auto-boot on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
