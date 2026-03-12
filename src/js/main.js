// Main orchestrator — imports feature modules and wires initialization
import { updateStatus, checkAccessibility, registerTabLoader, setOnTimeRangeChange } from './controls.js';
import { loadDashboard, loadHeatmap, loadKeyboardChart } from './dashboard.js';
import { loadPetPanel } from './pet.js';
import { loadAppsPanel } from './apps.js';
import { loadWeeklyPanel } from './weekly.js';
import { loadActivityLog } from './activity-log.js';
import { loadSettings, initOnboarding } from './settings.js';
import { loadOdometer } from './odometer.js';
import { resizeAllCharts } from './charts.js';

// Register tab loaders
registerTabLoader('dashboard', () => {
  loadDashboard();
  loadHeatmap();
  loadKeyboardChart();
  loadOdometer();
});
registerTabLoader('pet', loadPetPanel);
registerTabLoader('apps', loadAppsPanel);
registerTabLoader('weekly', loadWeeklyPanel);
registerTabLoader('activity', loadActivityLog);
registerTabLoader('settings', loadSettings);

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
  updateStatus();
  checkAccessibility();
  setInterval(updateStatus, 5000);
});

window.addEventListener('resize', resizeAllCharts);
