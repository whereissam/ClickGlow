// All ECharts rendering functions
import { formatHour } from './utils.js';

export let hourlyChart = null;
export let keyboardChart = null;
export let weeklyHourlyChart = null;
export let weeklyKeysChart = null;
export let categoryChart = null;
export let appUsageChart = null;

export function renderHourlyChart(hourly) {
  const container = document.getElementById('hourly-chart');
  if (!container || container.offsetHeight === 0) return;

  if (!hourlyChart) {
    hourlyChart = echarts.init(container, null, { renderer: 'canvas' });
  }

  const hours = Array.from({ length: 24 }, (_, i) => formatHour(i));
  const clicks = new Array(24).fill(0);
  const keystrokes = new Array(24).fill(0);
  const tzOffset = new Date().getTimezoneOffset() / -60;

  for (const h of hourly) {
    const localHour = ((h.hour + tzOffset) % 24 + 24) % 24;
    clicks[localHour] = Number(h.clicks);
    keystrokes[localHour] = Number(h.keystrokes);
  }

  hourlyChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#2A2D34', borderColor: '#33363F', textStyle: { color: '#E8E6E3', fontSize: 12 } },
    legend: { data: ['Clicks', 'Keystrokes'], top: 4, right: 16, textStyle: { color: '#8B8D94', fontSize: 11 } },
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: hours, axisLabel: { color: '#5C5E66', fontSize: 10, interval: 2 }, axisLine: { lineStyle: { color: '#33363F' } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: '#5C5E66', fontSize: 10 }, splitLine: { lineStyle: { color: '#2A2D34' } }, axisLine: { show: false } },
    series: [
      { name: 'Clicks', type: 'bar', data: clicks, barWidth: 8, itemStyle: { color: '#F7B801', borderRadius: [3, 3, 0, 0] } },
      { name: 'Keystrokes', type: 'bar', data: keystrokes, barWidth: 8, itemStyle: { color: '#5B8CFF', borderRadius: [3, 3, 0, 0] } },
    ],
    animationDuration: 600,
    animationEasing: 'cubicOut',
  });
}

export function renderKeyboardChart(container, data) {
  if (!container || container.offsetHeight === 0) return;

  if (!keyboardChart) {
    keyboardChart = echarts.init(container, null, { renderer: 'canvas' });
  }

  const keys = data.map(d => d.key).reverse();
  const counts = data.map(d => Number(d.count)).reverse();

  keyboardChart.setOption({
    backgroundColor: 'transparent',
    title: { text: 'Most Used Keys', left: 16, top: 12, textStyle: { color: '#E8E6E3', fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#2A2D34', borderColor: '#33363F', textStyle: { color: '#E8E6E3', fontSize: 12 } },
    grid: { left: 100, right: 40, top: 56, bottom: 24 },
    xAxis: { type: 'value', axisLabel: { color: '#5C5E66', fontSize: 11 }, splitLine: { lineStyle: { color: '#2A2D34' } }, axisLine: { show: false } },
    yAxis: { type: 'category', data: keys, axisLabel: { color: '#8B8D94', fontSize: 12, fontFamily: 'Space Grotesk' }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', data: counts, barWidth: 16,
      itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#F7B801' }, { offset: 1, color: '#FF6B35' }]), borderRadius: [0, 6, 6, 0] },
      emphasis: { itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#FFD166' }, { offset: 1, color: '#FF8855' }]) } },
    }],
    animationDuration: 600,
    animationEasing: 'cubicOut',
  });
}

export function renderWeeklyHourlyChart(hourly) {
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

export function renderWeeklyKeysChart(topKeys) {
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

export function renderCategoryChart(breakdown) {
  const el = document.getElementById('categoryChart');
  if (!el) return;
  if (!categoryChart) {
    categoryChart = echarts.init(el, null, { renderer: 'canvas' });
    setTimeout(() => categoryChart.resize(), 100);
  }

  if (!breakdown || breakdown.length === 0) {
    categoryChart.dispose();
    categoryChart = null;
    el.textContent = '';
    const msg = document.createElement('div');
    msg.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:0.8rem;';
    msg.textContent = 'No category data yet. Use apps to start tracking!';
    el.appendChild(msg);
    return;
  }

  const colorMap = { productive: '#7ED957', neutral: '#5B8CFF', distraction: '#FF5252' };
  const data = breakdown.map(([cat, ms]) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: Math.round(ms / 60000) || 1,
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

export function renderAppUsageChart(usage) {
  const el = document.getElementById('appUsageChart');
  if (!el) return;
  if (!appUsageChart) {
    appUsageChart = echarts.init(el, null, { renderer: 'canvas' });
    setTimeout(() => appUsageChart.resize(), 100);
  }

  if (!usage || usage.length === 0) {
    appUsageChart.dispose();
    appUsageChart = null;
    el.textContent = '';
    const msg = document.createElement('div');
    msg.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:0.8rem;';
    msg.textContent = 'No app usage data yet.';
    el.appendChild(msg);
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

export function resizeAllCharts() {
  if (keyboardChart) keyboardChart.resize();
  if (hourlyChart) hourlyChart.resize();
  if (weeklyHourlyChart) weeklyHourlyChart.resize();
  if (weeklyKeysChart) weeklyKeysChart.resize();
  if (categoryChart) categoryChart.resize();
  if (appUsageChart) appUsageChart.resize();
}
