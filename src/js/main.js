const { invoke } = window.__TAURI__.core;

// --- Toast notification ---
function showToast(message, isError = false) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding:10px 16px;border-radius:10px;font-size:0.8rem;font-weight:600;
    color:#fff;max-width:320px;word-break:break-all;
    animation:toastIn 0.3s ease;
    background:${isError ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#22c55e,#16a34a)'};
    box-shadow:0 4px 12px rgba(0,0,0,0.3);
  `;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

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

    // Stop pet polling when leaving Pet tab
    if (btn.dataset.tab !== 'pet' && petPollTimer) {
      clearInterval(petPollTimer);
      petPollTimer = null;
    }

    if (btn.dataset.tab === 'keyboard') loadKeyboardChart();
    if (btn.dataset.tab === 'heatmap') loadHeatmap();
    if (btn.dataset.tab === 'dashboard') loadDashboard();
    if (btn.dataset.tab === 'weekly') loadWeeklyPanel();
    if (btn.dataset.tab === 'apps') loadAppsPanel();
    if (btn.dataset.tab === 'pet') loadPetPanel();
    if (btn.dataset.tab === 'log') loadActivityLog();
    if (btn.dataset.tab === 'settings') loadSettings();
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
    const status = await invoke('get_listener_status');
    const el = document.getElementById('recordingIndicator');
    const text = el.querySelector('.rec-text');
    const dot = el.querySelector('.rec-dot');

    el.classList.remove('paused', 'error');
    if (status === 'recording') {
      text.textContent = 'Recording';
    } else if (status === 'paused') {
      el.classList.add('paused');
      text.textContent = 'Paused';
    } else if (status === 'error') {
      el.classList.add('error');
      text.textContent = 'Error';
    }
  } catch (e) {
    console.error('Failed to get status:', e);
  }
}

async function checkAccessibility() {
  try {
    const granted = await invoke('check_accessibility');
    const banner = document.getElementById('accessibilityBanner');
    if (banner) {
      banner.style.display = granted ? 'none' : 'flex';
    }
  } catch (e) {
    console.error('Failed to check accessibility:', e);
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

// --- PNG Export ---
document.getElementById('exportHeatmapBtn').addEventListener('click', async () => {
  const container = document.getElementById('heatmap-container');
  const canvas = container.querySelector('canvas');
  if (!canvas) return;

  try {
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const ts = new Date().toISOString().slice(0, 10);
    const path = await invoke('save_png_base64', { base64Data: base64, filename: `clickglow-heatmap-${ts}.png` });
    showToast('Saved to ' + path);
  } catch (e) {
    console.error('Failed to export heatmap:', e);
    showToast('Export failed: ' + e, true);
  }
});

// --- Weekly Report ---
let weeklyHourlyChart = null;
let weeklyKeysChart = null;

function getISOWeekString(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getWeekRange(isoWeek) {
  const [yearStr, weekStr] = isoWeek.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { start: monday.getTime(), end: sunday.getTime() };
}

async function loadWeeklyPanel() {
  const select = document.getElementById('weekSelect');
  try {
    const weeks = await invoke('list_weekly_reports');
    select.textContent = '';

    if (weeks.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No reports yet';
      select.appendChild(opt);
      return;
    }

    weeks.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w;
      opt.textContent = w;
      select.appendChild(opt);
    });

    loadWeeklyReport(weeks[0]);
  } catch (e) {
    console.error('Failed to load weekly reports:', e);
  }
}

document.getElementById('weekSelect').addEventListener('change', (e) => {
  if (e.target.value) loadWeeklyReport(e.target.value);
});

document.getElementById('generateReportBtn').addEventListener('click', async () => {
  const now = new Date();
  const isoWeek = getISOWeekString(now);
  const { start, end } = getWeekRange(isoWeek);
  try {
    await invoke('generate_weekly_report', { isoWeek, startMs: start, endMs: end });
    await loadWeeklyPanel();
  } catch (e) {
    console.error('Failed to generate report:', e);
  }
});

async function loadWeeklyReport(isoWeek) {
  try {
    const report = await invoke('get_weekly_report', { isoWeek });
    if (!report) return;

    const container = document.getElementById('weeklyContent');
    container.textContent = '';

    // Stats row
    const statsDiv = document.createElement('div');
    statsDiv.className = 'weekly-stats';
    const statItems = [
      { value: formatNumber(report.total_clicks), label: 'Clicks', avg: `~${Math.round(report.avg_daily_clicks)}/day` },
      { value: formatNumber(report.total_moves), label: 'Mouse Moves', avg: '' },
      { value: formatNumber(report.total_keystrokes), label: 'Keystrokes', avg: `~${Math.round(report.avg_daily_keystrokes)}/day` },
    ];
    statItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'weekly-stat';
      const val = document.createElement('div');
      val.className = 'stat-value';
      val.textContent = item.value;
      const lbl = document.createElement('div');
      lbl.className = 'stat-label';
      lbl.textContent = item.label;
      card.appendChild(val);
      card.appendChild(lbl);
      if (item.avg) {
        const avg = document.createElement('div');
        avg.className = 'weekly-avg';
        avg.textContent = item.avg;
        card.appendChild(avg);
      }
      statsDiv.appendChild(card);
    });
    container.appendChild(statsDiv);

    // Extra info row
    const infoDiv = document.createElement('div');
    infoDiv.className = 'weekly-stats';
    const peakText = report.peak_hour != null ? formatHour(report.peak_hour) : '-';
    const infoItems = [
      { value: peakText, label: 'Peak Hour' },
      { value: report.top_key || '-', label: 'Top Key' },
      { value: `${report.top_keys?.length || 0}`, label: 'Unique Keys' },
    ];
    infoItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'weekly-stat';
      const val = document.createElement('div');
      val.className = 'stat-value';
      val.textContent = item.value;
      const lbl = document.createElement('div');
      lbl.className = 'stat-label';
      lbl.textContent = item.label;
      card.appendChild(val);
      card.appendChild(lbl);
      infoDiv.appendChild(card);
    });
    container.appendChild(infoDiv);

    // Charts row
    const chartsDiv = document.createElement('div');
    chartsDiv.className = 'weekly-charts';

    const hourlyCard = document.createElement('div');
    hourlyCard.className = 'weekly-chart-card';
    const hourlyTitle = document.createElement('h4');
    hourlyTitle.textContent = 'Hourly Activity';
    const hourlyChartEl = document.createElement('div');
    hourlyChartEl.id = 'weeklyHourlyChart';
    hourlyCard.appendChild(hourlyTitle);
    hourlyCard.appendChild(hourlyChartEl);
    chartsDiv.appendChild(hourlyCard);

    const keysCard = document.createElement('div');
    keysCard.className = 'weekly-chart-card';
    const keysTitle = document.createElement('h4');
    keysTitle.textContent = 'Top Keys';
    const keysChartEl = document.createElement('div');
    keysChartEl.id = 'weeklyKeysChart';
    keysCard.appendChild(keysTitle);
    keysCard.appendChild(keysChartEl);
    chartsDiv.appendChild(keysCard);

    container.appendChild(chartsDiv);

    // Render charts after DOM update
    setTimeout(() => {
      renderWeeklyHourlyChart(report.hourly || []);
      renderWeeklyKeysChart(report.top_keys || []);
    }, 50);
  } catch (e) {
    console.error('Failed to load weekly report:', e);
  }
}

function renderWeeklyHourlyChart(hourly) {
  const el = document.getElementById('weeklyHourlyChart');
  if (!el) return;
  weeklyHourlyChart = echarts.init(el, null, { renderer: 'canvas' });

  const hours = Array.from({ length: 24 }, (_, i) => formatHour(i));
  const clicks = new Array(24).fill(0);
  const keystrokes = new Array(24).fill(0);
  const tzOffset = new Date().getTimezoneOffset() / -60;

  for (const h of hourly) {
    const localHour = ((h.hour + tzOffset) % 24 + 24) % 24;
    clicks[localHour] = Number(h.clicks);
    keystrokes[localHour] = Number(h.keystrokes);
  }

  weeklyHourlyChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#2A2D34', borderColor: '#33363F', textStyle: { color: '#E8E6E3', fontSize: 12 } },
    legend: { data: ['Clicks', 'Keystrokes'], top: 0, right: 0, textStyle: { color: '#8B8D94', fontSize: 10 } },
    grid: { left: 40, right: 8, top: 28, bottom: 24 },
    xAxis: { type: 'category', data: hours, axisLabel: { color: '#5C5E66', fontSize: 9, interval: 3 }, axisLine: { lineStyle: { color: '#33363F' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: '#5C5E66', fontSize: 9 }, splitLine: { lineStyle: { color: '#2A2D34' } }, axisLine: { show: false } },
    series: [
      { name: 'Clicks', type: 'bar', data: clicks, barWidth: 6, itemStyle: { color: '#F7B801', borderRadius: [2, 2, 0, 0] } },
      { name: 'Keystrokes', type: 'bar', data: keystrokes, barWidth: 6, itemStyle: { color: '#5B8CFF', borderRadius: [2, 2, 0, 0] } },
    ],
    animationDuration: 400,
  });
}

function renderWeeklyKeysChart(topKeys) {
  const el = document.getElementById('weeklyKeysChart');
  if (!el) return;
  weeklyKeysChart = echarts.init(el, null, { renderer: 'canvas' });

  const keys = topKeys.slice(0, 15).map(d => d.key).reverse();
  const counts = topKeys.slice(0, 15).map(d => Number(d.count)).reverse();

  weeklyKeysChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#2A2D34', borderColor: '#33363F', textStyle: { color: '#E8E6E3', fontSize: 12 } },
    grid: { left: 80, right: 16, top: 8, bottom: 8 },
    xAxis: { type: 'value', axisLabel: { color: '#5C5E66', fontSize: 9 }, splitLine: { lineStyle: { color: '#2A2D34' } }, axisLine: { show: false } },
    yAxis: { type: 'category', data: keys, axisLabel: { color: '#8B8D94', fontSize: 11 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', data: counts, barWidth: 12,
      itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#F7B801' }, { offset: 1, color: '#FF6B35' }]), borderRadius: [0, 4, 4, 0] },
    }],
    animationDuration: 400,
  });
}

// --- Apps Panel ---
let categoryChart = null;
let appUsageChart = null;

async function loadAppsPanel() {
  const { start, end } = getTimeRange(document.getElementById('timeRange').value);

  // Category pie chart
  try {
    const breakdown = await invoke('get_category_breakdown', { startMs: start, endMs: end });
    renderCategoryChart(breakdown);
  } catch (e) {
    console.error('Failed to load category breakdown:', e);
  }

  // App usage bar chart
  try {
    const usage = await invoke('get_app_usage', { startMs: start, endMs: end });
    renderAppUsageChart(usage);
  } catch (e) {
    console.error('Failed to load app usage:', e);
  }

  // Time thief
  try {
    const thief = await invoke('get_time_thief', { startMs: start, endMs: end });
    const section = document.getElementById('timeThiefSection');
    if (thief) {
      section.style.display = 'flex';
      document.getElementById('thiefName').textContent = thief.app_name;
      document.getElementById('thiefIcon').textContent = thief.app_name.charAt(0);
      document.getElementById('thiefHours').textContent = thief.hours_stolen.toFixed(1);
      document.getElementById('thiefSwitches').textContent = thief.switch_count;
      const mins = Math.round(thief.longest_session_ms / 60000);
      document.getElementById('thiefLongest').textContent = mins >= 60 ? `${(mins/60).toFixed(1)}h` : `${mins}m`;
    } else {
      section.style.display = 'none';
    }
  } catch (e) {
    console.error('Failed to load time thief:', e);
  }
}

function renderCategoryChart(breakdown) {
  const el = document.getElementById('categoryChart');
  if (!el) return;
  if (!categoryChart) {
    categoryChart = echarts.init(el, null, { renderer: 'canvas' });
    // Ensure correct size after init
    setTimeout(() => categoryChart.resize(), 100);
  }

  if (!breakdown || breakdown.length === 0) {
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:0.8rem;">No category data yet. Use apps to start tracking!</div>';
    categoryChart = null;
    return;
  }

  const colorMap = { productive: '#7ED957', neutral: '#5B8CFF', distraction: '#FF5252' };
  const data = breakdown.map(([cat, ms]) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: Math.round(ms / 60000) || 1, // at least 1 min to show something
    itemStyle: { color: colorMap[cat] || '#8B8D94' },
  }));

  categoryChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} min ({d}%)', backgroundColor: '#2A2D34', borderColor: '#33363F', textStyle: { color: '#E8E6E3' } },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '55%'],
      data, label: { color: '#8B8D94', fontSize: 12 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
    animationDuration: 600,
  });
}

function renderAppUsageChart(usage) {
  const el = document.getElementById('appUsageChart');
  if (!el) return;
  if (!appUsageChart) {
    appUsageChart = echarts.init(el, null, { renderer: 'canvas' });
    setTimeout(() => appUsageChart.resize(), 100);
  }

  if (!usage || usage.length === 0) {
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:0.8rem;">No app usage data yet.</div>';
    appUsageChart = null;
    return;
  }

  const top10 = usage.slice(0, 10);
  const names = top10.map(a => a.app_name).reverse();
  const mins = top10.map(a => Math.round(a.total_duration_ms / 60000)).reverse();
  const colorMap = { productive: '#7ED957', neutral: '#5B8CFF', distraction: '#FF5252' };
  const colors = top10.map(a => colorMap[a.category] || '#8B8D94').reverse();

  appUsageChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#2A2D34', borderColor: '#33363F', textStyle: { color: '#E8E6E3', fontSize: 12 } },
    grid: { left: 100, right: 16, top: 8, bottom: 8 },
    xAxis: { type: 'value', axisLabel: { color: '#5C5E66', fontSize: 10, formatter: '{value}m' }, splitLine: { lineStyle: { color: '#2A2D34' } }, axisLine: { show: false } },
    yAxis: { type: 'category', data: names, axisLabel: { color: '#8B8D94', fontSize: 11 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', data: mins.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
      barWidth: 14, itemStyle: { borderRadius: [0, 4, 4, 0] },
    }],
    animationDuration: 400,
  });
}

// Export poster
document.getElementById('exportPosterBtn').addEventListener('click', async () => {
  const poster = document.querySelector('.wanted-poster');
  if (!poster) return;

  // Read data from DOM
  const name = poster.querySelector('.wanted-name')?.textContent || 'Unknown';
  const initial = poster.querySelector('.wanted-icon')?.textContent?.trim() || '?';
  const stats = poster.querySelectorAll('.wanted-stat-value');
  const labels = poster.querySelectorAll('.wanted-stat-label');
  const reward = poster.querySelector('.wanted-reward')?.textContent || '';

  // Render to canvas
  const w = 480, h = 640;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#3B2F1A');
  grad.addColorStop(1, '#2A1F10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Border
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // WANTED text
  ctx.fillStyle = '#D4A843';
  ctx.font = 'bold 48px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#1A1205';
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillText('WANTED', w/2, 80);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // TIME THIEF subtitle
  ctx.fillStyle = '#8B6914';
  ctx.font = '14px "Space Grotesk", sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('T I M E   T H I E F', w/2, 110);

  // Icon circle
  ctx.beginPath();
  ctx.arc(w/2, 200, 50, 0, Math.PI * 2);
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(212,168,67,0.1)';
  ctx.fill();

  // Initial letter
  ctx.fillStyle = '#D4A843';
  ctx.font = 'bold 36px "Space Grotesk", sans-serif';
  ctx.fillText(initial, w/2, 214);

  // App name
  ctx.fillStyle = '#E8D5A3';
  ctx.font = 'bold 28px "Space Grotesk", sans-serif';
  ctx.fillText(name, w/2, 300);

  // Stats
  const statY = 370;
  for (let i = 0; i < Math.min(stats.length, 3); i++) {
    const x = w/4 + (i * w/4);
    ctx.fillStyle = '#D4A843';
    ctx.font = 'bold 24px "Space Grotesk", sans-serif';
    ctx.fillText(stats[i].textContent, x, statY);
    ctx.fillStyle = '#8B6914';
    ctx.font = '10px "Space Grotesk", sans-serif';
    ctx.fillText(labels[i]?.textContent?.toUpperCase() || '', x, statY + 20);
  }

  // Divider
  ctx.strokeStyle = '#5A4510';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 420);
  ctx.lineTo(w - 60, 420);
  ctx.stroke();

  // Reward
  ctx.fillStyle = '#8B6914';
  ctx.font = '14px "Space Grotesk", sans-serif';
  ctx.fillText(reward, w/2, 455);

  // ClickGlow watermark
  ctx.fillStyle = 'rgba(139,105,20,0.3)';
  ctx.font = '11px "Space Grotesk", sans-serif';
  ctx.fillText('Generated by ClickGlow', w/2, h - 30);

  // Export
  const btn = document.getElementById('exportPosterBtn');
  btn.textContent = 'Saving...';
  btn.disabled = true;
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const ts = new Date().toISOString().slice(0, 10);
    const path = await invoke('save_png_base64', { base64Data: base64, filename: `clickglow-wanted-${ts}.png` });
    btn.textContent = 'Saved!';
    showToast('Saved to ' + path);
    setTimeout(() => { btn.textContent = 'Export Poster as PNG'; btn.disabled = false; }, 3000);
  } catch (e) {
    console.error('Failed to save poster:', e);
    btn.textContent = 'Export Failed';
    showToast('Export failed: ' + e, true);
    setTimeout(() => { btn.textContent = 'Export Poster as PNG'; btn.disabled = false; }, 3000);
  }
});

// --- Activity Log ---
async function loadActivityLog() {
  loadCategoryRules();
  const range = document.getElementById('logRange').value;
  const { start, end } = getTimeRange(range);
  try {
    const entries = await invoke('get_activity_log', { startMs: start, endMs: end, limit: 200 });
    const container = document.getElementById('logEntries');
    if (entries.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary)">No activity recorded yet. Use your apps and check back!</div>';
      return;
    }
    container.innerHTML = entries.map(e => {
      const time = new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dur = e.duration_ms >= 60000
        ? Math.round(e.duration_ms / 60000) + 'm'
        : Math.round(e.duration_ms / 1000) + 's';
      const title = e.window_title || '—';
      return `<div class="log-entry">
        <span class="log-col-time">${time}</span>
        <span class="log-col-app">${e.app_name}</span>
        <span class="log-col-title" title="${title.replace(/"/g, '&quot;')}">${title}</span>
        <span class="log-col-cat"><span class="log-cat ${e.category}">${e.category}</span></span>
        <span class="log-col-dur">${dur}</span>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('Failed to load activity log:', e);
  }
}

document.getElementById('logRange').addEventListener('change', loadActivityLog);

async function loadCategoryRules() {
  try {
    // Load app rules
    const appCats = await invoke('get_app_categories');
    const appList = document.getElementById('appRulesList');
    appList.innerHTML = appCats.map(([name, cat]) => `
      <div class="rule-row">
        <span class="rule-name">${name}</span>
        <select onchange="updateAppCategory('${name.replace(/'/g, "\\'")}', this.value)">
          <option value="productive" ${cat === 'productive' ? 'selected' : ''}>Productive</option>
          <option value="neutral" ${cat === 'neutral' ? 'selected' : ''}>Neutral</option>
          <option value="distraction" ${cat === 'distraction' ? 'selected' : ''}>Distraction</option>
        </select>
      </div>
    `).join('');

    // Load keyword rules
    const kwRules = await invoke('get_keyword_rules');
    const kwList = document.getElementById('keywordRulesList');
    kwList.innerHTML = kwRules.map(r => `
      <div class="rule-row">
        <span class="rule-name">${r.keyword}</span>
        <select onchange="updateKeywordRule('${r.keyword.replace(/'/g, "\\'")}', this.value)">
          <option value="productive" ${r.category === 'productive' ? 'selected' : ''}>Productive</option>
          <option value="neutral" ${r.category === 'neutral' ? 'selected' : ''}>Neutral</option>
          <option value="distraction" ${r.category === 'distraction' ? 'selected' : ''}>Distraction</option>
        </select>
        <button class="rule-delete" onclick="removeKeywordRule('${r.keyword.replace(/'/g, "\\'")}')">x</button>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load rules:', e);
  }
}

async function updateAppCategory(appName, category) {
  try {
    await invoke('set_app_category', { appName, category });
  } catch (e) {
    console.error('Failed to update app category:', e);
  }
}

async function updateKeywordRule(keyword, category) {
  try {
    await invoke('set_keyword_rule', { keyword, category });
  } catch (e) {
    console.error('Failed to update keyword rule:', e);
  }
}

async function removeKeywordRule(keyword) {
  try {
    await invoke('delete_keyword_rule', { keyword });
    loadCategoryRules();
  } catch (e) {
    console.error('Failed to delete keyword rule:', e);
  }
}

document.getElementById('addKeywordBtn').addEventListener('click', async () => {
  const input = document.getElementById('newKeyword');
  const keyword = input.value.trim().toLowerCase();
  if (!keyword) return;
  const category = document.getElementById('newKeywordCat').value;
  try {
    await invoke('set_keyword_rule', { keyword, category });
    input.value = '';
    loadCategoryRules();
  } catch (e) {
    console.error('Failed to add keyword rule:', e);
  }
});

// --- Focus Pet ---
let pomodoroTimer = null;
let pomodoroDurationMins = 25;
let pomodoroSecondsLeft = 25 * 60;
let pomodoroRunning = false;
let petPollTimer = null;

const distractionQuotes = [
  "Hey! YouTube won't code itself! 🫠",
  "Your pet is DYING and you're watching cat videos?!",
  "Plot twist: the deadline is tomorrow 💀",
  "Netflix & chill? More like Netflix & skill-drain",
  "Your pet just filed a complaint to HR",
  "Every second on Reddit costs 1 brain cell",
  "Touch grass... I mean, touch keyboard! ⌨️",
  "Your future self is judging you right now",
  "This is fine. Everything is fine. 🔥",
  "POV: you explaining to your boss why the feature isn't done",
];

async function loadPetPanel() {
  try {
    const pet = await invoke('get_pet');
    const distracted = await invoke('is_distracted');
    updatePetUI(pet, distracted);
  } catch (e) {
    console.error('Failed to load pet:', e);
  }
  // Poll pet state every 3s while on Pet tab
  if (petPollTimer) clearInterval(petPollTimer);
  petPollTimer = setInterval(async () => {
    try {
      const pet = await invoke('get_pet');
      const distracted = await invoke('is_distracted');
      updatePetUI(pet, distracted);
    } catch (_) {}
  }, 3000);
}

function updatePetUI(pet, distracted = false) {
  const creature = document.getElementById('petCreature');
  const petScene = document.querySelector('.pet-scene');
  creature.setAttribute('data-species', pet.species);

  // Override mood to angry when distracted, regardless of HP
  if (distracted) {
    creature.setAttribute('data-mood', 'angry');
    petScene.classList.add('distracted');
  } else {
    creature.setAttribute('data-mood', pet.mood);
    petScene.classList.remove('distracted');
  }

  document.getElementById('petNameTag').textContent = pet.name;
  document.getElementById('petLevel').textContent = pet.level;
  document.getElementById('petSpecies').textContent = pet.species;
  document.getElementById('petStreak').textContent = pet.focus_streak;

  // Distraction warning message
  let warningEl = document.getElementById('petWarning');
  if (!warningEl) {
    warningEl = document.createElement('div');
    warningEl.id = 'petWarning';
    warningEl.className = 'pet-warning';
    document.querySelector('.pet-scene').appendChild(warningEl);
  }
  if (distracted) {
    const quote = distractionQuotes[Math.floor(Math.random() * distractionQuotes.length)];
    warningEl.textContent = quote;
    warningEl.style.display = 'block';
  } else {
    warningEl.style.display = 'none';
  }

  // HP bar with gradient color based on HP level
  const hpPct = Math.max(0, Math.min(100, (pet.hp / pet.max_hp) * 100));
  const hpFill = document.getElementById('petHpFill');
  hpFill.style.width = hpPct + '%';
  if (hpPct > 60) {
    hpFill.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
  } else if (hpPct > 40) {
    hpFill.style.background = 'linear-gradient(90deg, #facc15, #eab308)';
  } else if (hpPct > 20) {
    hpFill.style.background = 'linear-gradient(90deg, #fb923c, #f97316)';
  } else {
    hpFill.style.background = 'linear-gradient(90deg, #f87171, #ef4444)';
  }
  document.getElementById('petHpText').textContent = `${pet.hp}/${pet.max_hp}`;

  // XP bar
  const xpNeeded = pet.level === 1 ? 100 : pet.level === 2 ? 300 : 999;
  const xpPct = Math.max(0, Math.min(100, (pet.xp / xpNeeded) * 100));
  document.getElementById('petXpFill').style.width = xpPct + '%';
  document.getElementById('petXpText').textContent = `${pet.xp}/${xpNeeded}`;

  // Sync mini pet in sidebar
  updateMiniPet(pet, distracted);
}

function updateMiniPet(pet, distracted = false) {
  const mini = document.getElementById('miniPet');
  if (!mini) return;
  mini.setAttribute('data-species', pet.species);
  mini.setAttribute('data-mood', distracted ? 'angry' : pet.mood);
  document.getElementById('miniPetName').textContent = pet.name;
  const hpPct = Math.max(0, Math.min(100, (pet.hp / pet.max_hp) * 100));
  const fill = document.getElementById('miniHpFill');
  fill.style.width = hpPct + '%';
  if (hpPct > 60) fill.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
  else if (hpPct > 40) fill.style.background = 'linear-gradient(90deg, #facc15, #eab308)';
  else if (hpPct > 20) fill.style.background = 'linear-gradient(90deg, #fb923c, #f97316)';
  else fill.style.background = 'linear-gradient(90deg, #f87171, #ef4444)';
}

// Global mini pet poll (always visible in sidebar, updates every 10s)
setInterval(async () => {
  try {
    const pet = await invoke('get_pet');
    const distracted = await invoke('is_distracted');
    updateMiniPet(pet, distracted);
  } catch (_) {}
}, 10000);

// Init mini pet on load
(async () => {
  try {
    const pet = await invoke('get_pet');
    updateMiniPet(pet);
  } catch (_) {}
})();

// Click pet to interact
document.getElementById('petCreature').addEventListener('click', () => {
  const creature = document.getElementById('petCreature');
  creature.style.animation = 'none';
  creature.offsetHeight; // trigger reflow
  creature.style.animation = 'petBounce 0.4s ease';
});

// Pomodoro timer
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Update display when duration changes
document.getElementById('pomodoroDuration').addEventListener('change', (e) => {
  if (pomodoroRunning) return; // don't change while running
  pomodoroDurationMins = parseInt(e.target.value);
  pomodoroSecondsLeft = pomodoroDurationMins * 60;
  document.getElementById('pomodoroDisplay').textContent = formatTime(pomodoroSecondsLeft);
});

document.getElementById('pomodoroStartBtn').addEventListener('click', () => {
  if (pomodoroRunning) return;
  pomodoroRunning = true;
  pomodoroDurationMins = parseInt(document.getElementById('pomodoroDuration').value);
  pomodoroSecondsLeft = pomodoroDurationMins * 60;
  document.getElementById('pomodoroStartBtn').style.display = 'none';
  document.getElementById('pomodoroStopBtn').style.display = 'inline-block';
  document.getElementById('pomodoroDuration').disabled = true;

  pomodoroTimer = setInterval(async () => {
    pomodoroSecondsLeft--;
    document.getElementById('pomodoroDisplay').textContent = formatTime(pomodoroSecondsLeft);

    if (pomodoroSecondsLeft <= 0) {
      clearInterval(pomodoroTimer);
      pomodoroRunning = false;
      document.getElementById('pomodoroStartBtn').style.display = 'inline-block';
      document.getElementById('pomodoroStopBtn').style.display = 'none';
      document.getElementById('pomodoroDuration').disabled = false;
      document.getElementById('pomodoroDisplay').textContent = formatTime(pomodoroDurationMins * 60);

      // Feed the pet!
      try {
        const pet = await invoke('feed_pet', { focusMins: pomodoroDurationMins });
        updatePetUI(pet);
      } catch (e) {
        console.error('Failed to feed pet:', e);
      }
    }
  }, 1000);
});

document.getElementById('pomodoroStopBtn').addEventListener('click', () => {
  clearInterval(pomodoroTimer);
  pomodoroRunning = false;
  pomodoroSecondsLeft = pomodoroDurationMins * 60;
  document.getElementById('pomodoroDisplay').textContent = formatTime(pomodoroSecondsLeft);
  document.getElementById('pomodoroStartBtn').style.display = 'inline-block';
  document.getElementById('pomodoroStopBtn').style.display = 'none';
  document.getElementById('pomodoroDuration').disabled = false;
});

// --- Settings ---
async function loadSettings() {
  try {
    const months = await invoke('get_retention_months');
    document.getElementById('retentionMonths').value = months.toString();
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

document.getElementById('saveRetentionBtn').addEventListener('click', async () => {
  const months = parseInt(document.getElementById('retentionMonths').value);
  try {
    await invoke('set_retention_months', { months });
    const btn = document.getElementById('saveRetentionBtn');
    btn.textContent = 'Saved!';
    setTimeout(() => { btn.textContent = 'Save'; }, 1500);
  } catch (e) {
    console.error('Failed to save retention:', e);
  }
});

// --- Onboarding Wizard ---
let currentOnboardingStep = 1;

async function initOnboarding() {
  try {
    const done = await invoke('get_onboarding_done');
    if (!done) {
      document.getElementById('onboarding').style.display = 'flex';
      onboardingCheckPerm();
    }
  } catch (e) {
    console.error('Failed to check onboarding:', e);
  }
}

function setPermStatus(granted) {
  const statusEl = document.getElementById('onboardingPermStatus');
  statusEl.textContent = '';
  const dot = document.createElement('span');
  dot.className = granted ? 'perm-dot granted' : 'perm-dot denied';
  const label = document.createElement('span');
  label.textContent = granted ? 'Permission granted!' : 'Permission not granted yet';
  statusEl.appendChild(dot);
  statusEl.appendChild(label);
}

window.onboardingNext = function () {
  const steps = document.querySelectorAll('.onboarding-step');
  const dots = document.querySelectorAll('.onboarding-dots .dot');

  steps[currentOnboardingStep - 1].classList.remove('active');
  dots[currentOnboardingStep - 1].classList.remove('active');

  currentOnboardingStep++;

  steps[currentOnboardingStep - 1].classList.add('active');
  dots[currentOnboardingStep - 1].classList.add('active');
};

window.onboardingCheckPerm = async function () {
  try {
    const granted = await invoke('check_accessibility');
    const btn = document.getElementById('onboardingPermBtn');
    setPermStatus(granted);

    if (granted) {
      btn.textContent = 'Continue';
      btn.onclick = onboardingNext;
    } else {
      btn.textContent = 'Check Again';
    }
  } catch (e) {
    console.error('Failed to check permission:', e);
  }
};

window.onboardingFinish = async function () {
  try {
    await invoke('set_onboarding_done');
  } catch (e) {
    console.error('Failed to save onboarding state:', e);
  }
  document.getElementById('onboarding').style.display = 'none';
  loadDashboard();
  checkAccessibility();
};

// --- Init ---
window.addEventListener('DOMContentLoaded', () => {
  initOnboarding();
  loadDashboard();
  updateStatus();
  checkAccessibility();
  setInterval(updateStatus, 5000);
});

window.addEventListener('resize', () => {
  if (keyboardChart) keyboardChart.resize();
  if (hourlyChart) hourlyChart.resize();
  if (weeklyHourlyChart) weeklyHourlyChart.resize();
  if (weeklyKeysChart) weeklyKeysChart.resize();
  if (categoryChart) categoryChart.resize();
  if (appUsageChart) appUsageChart.resize();
});

// ===== Desktop Buddy Toggle =====

let buddyVisible = false;

async function toggleDesktopBuddy() {
  try {
    buddyVisible = await invoke('toggle_buddy');
    const btn = document.getElementById('buddyToggleBtn');
    if (btn) {
      btn.textContent = buddyVisible ? 'Call Pet Back' : 'Release Pet to Desktop Edge';
    }
    showToast(buddyVisible ? 'Pet released to desktop edge!' : 'Pet returned home');
  } catch (e) {
    showToast('Failed to toggle buddy: ' + e, true);
  }
}
