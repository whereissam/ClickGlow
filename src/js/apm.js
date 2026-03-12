// APM (Actions Per Minute) Flow Mode UI
import { invoke } from './utils.js';

const FLOW_LABELS = ['', 'Warming Up', 'In The Zone', 'ULTRA COMBO'];
const FLOW_COLORS = ['', '#5B8CFF', '#7ED957', '#FF6B35'];

let apmPollTimer = null;

export function startApmPoll() {
  if (apmPollTimer) clearInterval(apmPollTimer);
  updateApm();
  apmPollTimer = setInterval(updateApm, 2000);
}

export function stopApmPoll() {
  if (apmPollTimer) {
    clearInterval(apmPollTimer);
    apmPollTimer = null;
  }
}

async function updateApm() {
  const container = document.getElementById('apmSection');
  if (!container) return;

  try {
    const stats = await invoke('get_apm_stats');
    renderApm(container, stats);
  } catch (_) {}
}

function renderApm(container, stats) {
  // Only rebuild if structure doesn't exist yet
  if (!container.querySelector('.apm-gauge')) {
    container.textContent = '';
    buildApmUI(container);
  }

  // Update values
  const apmValue = container.querySelector('.apm-value');
  apmValue.textContent = stats.current_apm;

  // Gauge fill
  const fill = container.querySelector('.apm-gauge-fill');
  const pct = Math.min(100, (stats.current_apm / 200) * 100);
  fill.style.width = pct + '%';

  // Color based on APM
  if (stats.current_apm >= 100) fill.style.background = 'linear-gradient(90deg, #FF6B35, #ff3333)';
  else if (stats.current_apm >= 60) fill.style.background = 'linear-gradient(90deg, #F7B801, #FF6B35)';
  else if (stats.current_apm >= 30) fill.style.background = 'linear-gradient(90deg, #7ED957, #F7B801)';
  else fill.style.background = 'linear-gradient(90deg, #5B8CFF, #7ED957)';

  // Flow state
  const flowBadge = container.querySelector('.apm-flow-badge');
  if (stats.in_flow && stats.flow_level > 0) {
    flowBadge.style.display = 'flex';
    flowBadge.querySelector('.flow-label').textContent = FLOW_LABELS[stats.flow_level];
    flowBadge.style.borderColor = FLOW_COLORS[stats.flow_level];
    flowBadge.querySelector('.flow-label').style.color = FLOW_COLORS[stats.flow_level];
    const mins = Math.floor(stats.flow_duration_ms / 60000);
    flowBadge.querySelector('.flow-duration').textContent = mins + 'm in flow';

    // Fire effect on container
    container.classList.add('flow-active');
    container.setAttribute('data-flow-level', stats.flow_level);
  } else {
    flowBadge.style.display = 'none';
    container.classList.remove('flow-active');
    container.removeAttribute('data-flow-level');
  }

  // High scores
  container.querySelector('.apm-daily-high').textContent = stats.daily_high;
  container.querySelector('.apm-alltime-high').textContent = stats.alltime_high;

  // Mini history sparkline
  const sparkline = container.querySelector('.apm-sparkline');
  renderSparkline(sparkline, stats.history);
}

function buildApmUI(container) {
  // Gauge
  const gauge = document.createElement('div');
  gauge.className = 'apm-gauge';

  const gaugeHeader = document.createElement('div');
  gaugeHeader.className = 'apm-gauge-header';

  const label = document.createElement('div');
  label.className = 'apm-label';
  label.textContent = 'APM';

  const value = document.createElement('div');
  value.className = 'apm-value';
  value.textContent = '0';

  gaugeHeader.appendChild(label);
  gaugeHeader.appendChild(value);

  const bar = document.createElement('div');
  bar.className = 'apm-gauge-bar';
  const fill = document.createElement('div');
  fill.className = 'apm-gauge-fill';
  bar.appendChild(fill);

  const ticks = document.createElement('div');
  ticks.className = 'apm-gauge-ticks';
  for (const t of [0, 50, 100, 150, 200]) {
    const tick = document.createElement('span');
    tick.textContent = t;
    ticks.appendChild(tick);
  }

  gauge.appendChild(gaugeHeader);
  gauge.appendChild(bar);
  gauge.appendChild(ticks);
  container.appendChild(gauge);

  // Flow badge
  const flowBadge = document.createElement('div');
  flowBadge.className = 'apm-flow-badge';
  flowBadge.style.display = 'none';
  const flowIcon = document.createElement('span');
  flowIcon.className = 'flow-icon';
  flowIcon.textContent = '🔥';
  const flowLabel = document.createElement('span');
  flowLabel.className = 'flow-label';
  const flowDuration = document.createElement('span');
  flowDuration.className = 'flow-duration';
  flowBadge.appendChild(flowIcon);
  flowBadge.appendChild(flowLabel);
  flowBadge.appendChild(flowDuration);
  container.appendChild(flowBadge);

  // High scores row
  const scores = document.createElement('div');
  scores.className = 'apm-scores';

  const daily = document.createElement('div');
  daily.className = 'apm-score-card';
  const dailyVal = document.createElement('div');
  dailyVal.className = 'apm-score-val apm-daily-high';
  dailyVal.textContent = '0';
  const dailyLbl = document.createElement('div');
  dailyLbl.className = 'apm-score-lbl';
  dailyLbl.textContent = 'Daily High';
  daily.appendChild(dailyVal);
  daily.appendChild(dailyLbl);

  const alltime = document.createElement('div');
  alltime.className = 'apm-score-card';
  const alltimeVal = document.createElement('div');
  alltimeVal.className = 'apm-score-val apm-alltime-high';
  alltimeVal.textContent = '0';
  const alltimeLbl = document.createElement('div');
  alltimeLbl.className = 'apm-score-lbl';
  alltimeLbl.textContent = 'All-Time High';
  alltime.appendChild(alltimeVal);
  alltime.appendChild(alltimeLbl);

  scores.appendChild(daily);
  scores.appendChild(alltime);
  container.appendChild(scores);

  // Sparkline
  const sparkWrap = document.createElement('div');
  sparkWrap.className = 'apm-sparkline-wrap';
  const sparkTitle = document.createElement('div');
  sparkTitle.className = 'apm-sparkline-title';
  sparkTitle.textContent = 'APM History (last hour)';
  const sparkline = document.createElement('canvas');
  sparkline.className = 'apm-sparkline';
  sparkline.width = 400;
  sparkline.height = 60;
  sparkWrap.appendChild(sparkTitle);
  sparkWrap.appendChild(sparkline);
  container.appendChild(sparkWrap);
}

function renderSparkline(canvas, history) {
  if (!canvas || history.length < 2) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const values = history.map(s => s.apm);
  const max = Math.max(...values, 50);
  const step = w / (values.length - 1);

  // Fill
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i < values.length; i++) {
    ctx.lineTo(i * step, h - (values[i] / max) * (h - 4));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(247, 184, 1, 0.2)');
  grad.addColorStop(1, 'rgba(247, 184, 1, 0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  for (let i = 0; i < values.length; i++) {
    const x = i * step;
    const y = h - (values[i] / max) * (h - 4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#F7B801';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Threshold line at 100 APM
  const threshY = h - (100 / max) * (h - 4);
  if (threshY > 0 && threshY < h) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, threshY);
    ctx.lineTo(w, threshY);
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
