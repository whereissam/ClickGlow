// Dashboard stats, heatmap, keyboard chart loading
import { invoke, getTimeRange, formatNumber, formatHour, currentTimeRange } from './utils.js';
import { renderHourlyChart, renderKeyboardChart } from './charts.js';

// --- Heatmap ---
let heatmapInstance = null;
let currentFilter = null;

// Heatmap filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    if (f === 'clicks') currentFilter = 1;
    else if (f === 'moves') currentFilter = 0;
    else currentFilter = null;
    loadHeatmap();
  });
});

export async function loadHeatmap() {
  const container = document.getElementById('heatmap-container');
  if (!container || container.offsetHeight === 0) return;

  const { start, end } = getTimeRange(currentTimeRange);

  if (!heatmapInstance) {
    heatmapInstance = h337.create({
      container,
      radius: 25,
      maxOpacity: 0.75,
      minOpacity: 0.02,
      blur: 0.9,
      gradient: {
        0.1: '#1a1a4e',
        0.25: '#5B8CFF',
        0.45: '#7ED957',
        0.65: '#F7B801',
        0.85: '#FF6B35',
        1.0: '#ff3333',
      },
    });
  }

  try {
    const data = await invoke('get_mouse_heatmap', { startMs: start, endMs: end, eventType: currentFilter });
    const rect = container.getBoundingClientRect();
    const maxVal = data.reduce((m, d) => Math.max(m, d.value), 1);
    const scaledData = data.map(d => ({
      x: Math.round((d.x / 1920) * rect.width),
      y: Math.round((d.y / 1080) * rect.height),
      value: d.value,
    }));
    heatmapInstance.setData({ max: maxVal, data: scaledData });
  } catch (e) {
    console.error('Failed to load heatmap:', e);
  }
}

// --- Keyboard chart ---
export async function loadKeyboardChart() {
  const container = document.getElementById('keyboard-chart');
  if (!container || container.offsetHeight === 0) return;

  const { start, end } = getTimeRange(currentTimeRange);
  try {
    const data = await invoke('get_key_frequency', { startMs: start, endMs: end });
    renderKeyboardChart(container, data);
  } catch (e) {
    console.error('Failed to load keyboard chart:', e);
  }
}

// --- Stats + Dashboard ---
export async function loadDashboard() {
  const { start, end } = getTimeRange(currentTimeRange);
  try {
    const s = await invoke('get_daily_summary', { startMs: start, endMs: end });
    document.getElementById('totalClicks').textContent = formatNumber(s.total_clicks);
    document.getElementById('totalMoves').textContent = formatNumber(s.total_moves);
    document.getElementById('totalKeystrokes').textContent = formatNumber(s.total_keystrokes);
    document.getElementById('topKey').textContent = s.top_key || '-';

    if (s.peak_hour !== null && s.peak_hour !== undefined) {
      const tzOffset = new Date().getTimezoneOffset() / -60;
      const localPeak = ((s.peak_hour + tzOffset) % 24 + 24) % 24;
      document.getElementById('peakHour').textContent = formatHour(localPeak);
    } else {
      document.getElementById('peakHour').textContent = '-';
    }

    setTimeout(() => renderHourlyChart(s.hourly || []), 50);
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

// --- PNG Export ---
document.getElementById('exportHeatmapBtn').addEventListener('click', async () => {
  const container = document.getElementById('heatmap-container');
  const canvas = container.querySelector('canvas');
  if (!canvas) return;

  try {
    const { showToast } = await import('./utils.js');
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const ts = new Date().toISOString().slice(0, 10);
    const path = await invoke('save_png_base64', { base64Data: base64, filename: `clickglow-heatmap-${ts}.png` });
    showToast('Saved to ' + path);
  } catch (e) {
    console.error('Failed to export heatmap:', e);
    const { showToast } = await import('./utils.js');
    showToast('Export failed: ' + e, true);
  }
});
