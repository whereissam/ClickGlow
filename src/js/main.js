const { invoke } = window.__TAURI__.core;

// --- Time range helpers ---
function getTimeRange(range) {
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  switch (range) {
    case 'today':
      return { start: startOfDay.getTime(), end: now };
    case 'week': {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - d.getDay());
      return { start: d.getTime(), end: now };
    }
    case 'month': {
      const d = new Date(startOfDay);
      d.setDate(1);
      return { start: d.getTime(), end: now };
    }
    default:
      return { start: startOfDay.getTime(), end: now };
  }
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return h + ' AM';
  if (h === 12) return '12 PM';
  return (h - 12) + ' PM';
}

// --- Tab switching ---
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-panel`).classList.add('active');

    if (btn.dataset.tab === 'keyboard') loadKeyboardChart();
    if (btn.dataset.tab === 'heatmap') loadHeatmap();
    if (btn.dataset.tab === 'dashboard') loadDashboard();
  });
});

// --- Heatmap filter ---
let currentFilter = null;
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

// --- Heatmap ---
let heatmapInstance = null;

async function loadHeatmap() {
  const container = document.getElementById('heatmap-container');
  if (!container || container.offsetHeight === 0) return;

  const { start, end } = getTimeRange(document.getElementById('timeRange').value);

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
    const data = await invoke('get_mouse_heatmap', {
      startMs: start,
      endMs: end,
      eventType: currentFilter,
    });

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
let keyboardChart = null;

async function loadKeyboardChart() {
  const container = document.getElementById('keyboard-chart');
  if (!container || container.offsetHeight === 0) return;

  const { start, end } = getTimeRange(document.getElementById('timeRange').value);

  if (!keyboardChart) {
    keyboardChart = echarts.init(container, null, { renderer: 'canvas' });
  }

  try {
    const data = await invoke('get_key_frequency', { startMs: start, endMs: end });

    const keys = data.map(d => d.key).reverse();
    const counts = data.map(d => Number(d.count)).reverse();

    keyboardChart.setOption({
      backgroundColor: 'transparent',
      title: {
        text: 'Most Used Keys',
        left: 16,
        top: 12,
        textStyle: { color: '#E8E6E3', fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#2A2D34',
        borderColor: '#33363F',
        textStyle: { color: '#E8E6E3', fontSize: 12 },
      },
      grid: { left: 100, right: 40, top: 56, bottom: 24 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#5C5E66', fontSize: 11 },
        splitLine: { lineStyle: { color: '#2A2D34' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: keys,
        axisLabel: { color: '#8B8D94', fontSize: 12, fontFamily: 'Space Grotesk' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: counts,
        barWidth: 16,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#F7B801' },
            { offset: 1, color: '#FF6B35' },
          ]),
          borderRadius: [0, 6, 6, 0],
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#FFD166' },
              { offset: 1, color: '#FF8855' },
            ]),
          },
        },
      }],
      animationDuration: 600,
      animationEasing: 'cubicOut',
    });
  } catch (e) {
    console.error('Failed to load keyboard chart:', e);
  }
}

// --- Hourly activity chart ---
let hourlyChart = null;

function renderHourlyChart(hourly) {
  const container = document.getElementById('hourly-chart');
  if (!container || container.offsetHeight === 0) return;

  if (!hourlyChart) {
    hourlyChart = echarts.init(container, null, { renderer: 'canvas' });
  }

  // Build full 24-hour arrays
  const hours = Array.from({ length: 24 }, (_, i) => formatHour(i));
  const clicks = new Array(24).fill(0);
  const keystrokes = new Array(24).fill(0);

  // Adjust UTC hour from DB to local timezone
  const tzOffset = new Date().getTimezoneOffset() / -60;
  for (const h of hourly) {
    const localHour = ((h.hour + tzOffset) % 24 + 24) % 24;
    clicks[localHour] = Number(h.clicks);
    keystrokes[localHour] = Number(h.keystrokes);
  }

  hourlyChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#2A2D34',
      borderColor: '#33363F',
      textStyle: { color: '#E8E6E3', fontSize: 12 },
    },
    legend: {
      data: ['Clicks', 'Keystrokes'],
      top: 4,
      right: 16,
      textStyle: { color: '#8B8D94', fontSize: 11 },
    },
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: { color: '#5C5E66', fontSize: 10, interval: 2 },
      axisLine: { lineStyle: { color: '#33363F' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#5C5E66', fontSize: 10 },
      splitLine: { lineStyle: { color: '#2A2D34' } },
      axisLine: { show: false },
    },
    series: [
      {
        name: 'Clicks',
        type: 'bar',
        data: clicks,
        barWidth: 8,
        itemStyle: { color: '#F7B801', borderRadius: [3, 3, 0, 0] },
      },
      {
        name: 'Keystrokes',
        type: 'bar',
        data: keystrokes,
        barWidth: 8,
        itemStyle: { color: '#5B8CFF', borderRadius: [3, 3, 0, 0] },
      },
    ],
    animationDuration: 600,
    animationEasing: 'cubicOut',
  });
}

// --- Stats + Dashboard ---
async function loadStats() {
  const { start, end } = getTimeRange(document.getElementById('timeRange').value);

  try {
    const s = await invoke('get_daily_summary', { startMs: start, endMs: end });
    document.getElementById('totalClicks').textContent = formatNumber(s.total_clicks);
    document.getElementById('totalMoves').textContent = formatNumber(s.total_moves);
    document.getElementById('totalKeystrokes').textContent = formatNumber(s.total_keystrokes);
    document.getElementById('topKey').textContent = s.top_key || '-';

    // Peak hour (adjust from UTC to local)
    if (s.peak_hour !== null && s.peak_hour !== undefined) {
      const tzOffset = new Date().getTimezoneOffset() / -60;
      const localPeak = ((s.peak_hour + tzOffset) % 24 + 24) % 24;
      document.getElementById('peakHour').textContent = formatHour(localPeak);
    } else {
      document.getElementById('peakHour').textContent = '-';
    }

    // Render hourly chart
    setTimeout(() => renderHourlyChart(s.hourly || []), 50);
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

async function loadDashboard() {
  await loadStats();
}

// --- Recording status (clickable toggle) ---
const recIndicator = document.getElementById('recordingIndicator');
recIndicator.style.cursor = 'pointer';
recIndicator.addEventListener('click', async () => {
  try {
    const isRecording = await invoke('toggle_recording');
    const text = recIndicator.querySelector('.rec-text');
    if (isRecording) {
      recIndicator.classList.remove('paused');
      text.textContent = 'Recording';
    } else {
      recIndicator.classList.add('paused');
      text.textContent = 'Paused';
    }
  } catch (e) {
    console.error('Failed to toggle recording:', e);
  }
});

async function updateStatus() {
  try {
    const recording = await invoke('get_recording_status');
    const el = document.getElementById('recordingIndicator');
    const text = el.querySelector('.rec-text');
    if (recording) {
      el.classList.remove('paused');
      text.textContent = 'Recording';
    } else {
      el.classList.add('paused');
      text.textContent = 'Paused';
    }
  } catch (e) {
    console.error('Failed to get status:', e);
  }
}

// --- Refresh ---
document.getElementById('refreshBtn').addEventListener('click', () => {
  const activeTab = document.querySelector('.nav-btn.active').dataset.tab;
  if (activeTab === 'heatmap') loadHeatmap();
  if (activeTab === 'keyboard') loadKeyboardChart();
  if (activeTab === 'dashboard') loadDashboard();
});

document.getElementById('timeRange').addEventListener('change', () => {
  const activeTab = document.querySelector('.nav-btn.active').dataset.tab;
  if (activeTab === 'heatmap') loadHeatmap();
  if (activeTab === 'keyboard') loadKeyboardChart();
  if (activeTab === 'dashboard') loadDashboard();
});

// --- Init ---
window.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  updateStatus();
  setInterval(updateStatus, 5000);
});

window.addEventListener('resize', () => {
  if (keyboardChart) keyboardChart.resize();
  if (hourlyChart) hourlyChart.resize();
});
