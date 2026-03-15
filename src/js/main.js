// Main orchestrator — imports feature modules and wires initialization
import { updateStatus, checkAccessibility, registerTabLoader, setOnTimeRangeChange } from './controls.js';
import { loadDashboard, loadHeatmap, loadKeyboardChart } from './dashboard.js';
import { loadPetPanel } from './pet.js';
import { loadAppsPanel } from './apps.js';
import { loadWeeklyPanel } from './weekly.js';
import { loadActivityLog } from './activity-log.js';
import { loadSettings, initOnboarding } from './settings.js';
import { loadOdometer } from './odometer.js';
import { loadKeyboardWear } from './keyboard-wear.js';
import { startApmPoll, stopApmPoll } from './apm.js';
import { startPanicPoll, stopPanicPoll } from './panic-index.js';
import { resizeAllCharts } from './charts.js';
import { loadTrailArt } from './trail-art.js';
import { loadReplay } from './heatmap-replay.js';
import { loadTerrain, stopTerrainAnimation } from './terrain-map.js';
import { initSound } from './sounds.js';

// Register tab loaders
registerTabLoader('dashboard', () => {
  loadDashboard();
  loadHeatmap();
  loadKeyboardChart();
  loadOdometer();
  startApmPoll();
  startPanicPoll();
});
registerTabLoader('keyboard', () => {
  loadKeyboardChart();
  loadKeyboardWear();
  stopApmPoll();
  stopPanicPoll();
});
registerTabLoader('pet', () => {
  loadPetPanel();
  stopApmPoll();
  stopPanicPoll();
});
registerTabLoader('apps', () => {
  loadAppsPanel();
  stopApmPoll();
  stopPanicPoll();
});
registerTabLoader('weekly', () => {
  loadWeeklyPanel();
  stopApmPoll();
  stopPanicPoll();
});
registerTabLoader('activity', () => {
  loadActivityLog();
  stopApmPoll();
  stopPanicPoll();
});
registerTabLoader('trail-art', () => {
  loadTrailArt();
  stopApmPoll();
  stopPanicPoll();
  stopTerrainAnimation();
});
registerTabLoader('replay', () => {
  loadReplay();
  stopApmPoll();
  stopPanicPoll();
  stopTerrainAnimation();
});
registerTabLoader('terrain', () => {
  loadTerrain();
  stopApmPoll();
  stopPanicPoll();
});
registerTabLoader('settings', () => {
  loadSettings();
  stopApmPoll();
  stopPanicPoll();
  stopTerrainAnimation();
});

// When time range changes, reload active dashboard
setOnTimeRangeChange(() => {
  loadDashboard();
  loadHeatmap();
  loadKeyboardChart();
  loadOdometer();
});

// --- Init ---
window.addEventListener('DOMContentLoaded', () => {
  initOnboarding(() => {
    loadDashboard();
    checkAccessibility();
  });
  loadDashboard();
  loadHeatmap();
  loadKeyboardChart();
  loadOdometer();
  startApmPoll();
  startPanicPoll();
  updateStatus();
  checkAccessibility();
  initSound();
  setInterval(updateStatus, 5000);
});

window.addEventListener('resize', resizeAllCharts);
