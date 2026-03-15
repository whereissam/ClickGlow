// Heatmap Time-lapse Replay — watch heatmap build up hour by hour
import { invoke, getTimeRange, currentTimeRange } from './utils.js';

let replayInstance = null;
let hourlyData = [];
let currentHourIdx = 0;
let isPlaying = false;
let playInterval = null;
let speed = 2; // frames per second

export async function loadReplay() {
  const container = document.getElementById('replay-heatmap-container');
  if (!container || container.offsetHeight === 0) return;

  if (!replayInstance) {
    replayInstance = h337.create({
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

  await fetchData();
}

async function fetchData() {
  const { start, end } = getTimeRange(currentTimeRange);
  try {
    hourlyData = await invoke('get_hourly_heatmaps', { startMs: start, endMs: end });
    currentHourIdx = 0;

    const slider = document.getElementById('replaySlider');
    slider.max = Math.max(0, hourlyData.length - 1);
    slider.value = 0;

    document.getElementById('replayHourDisplay').textContent =
      `0 / ${hourlyData.length} hours`;

    if (hourlyData.length > 0) {
      renderFrame(0);
    } else {
      replayInstance?.setData({ max: 1, data: [] });
      document.getElementById('replayTimeLabel').textContent = '--:00';
    }
  } catch (e) {
    console.error('Failed to load hourly heatmaps:', e);
  }
}

function renderFrame(idx) {
  if (!replayInstance || idx < 0 || idx >= hourlyData.length) return;

  const container = document.getElementById('replay-heatmap-container');
  const rect = container.getBoundingClientRect();

  // Accumulate all data up to this hour for progressive build-up
  const allPoints = [];
  for (let i = 0; i <= idx; i++) {
    for (const p of hourlyData[i].points) {
      allPoints.push({
        x: Math.round((p.x / 1920) * rect.width),
        y: Math.round((p.y / 1080) * rect.height),
        value: p.value,
      });
    }
  }

  const maxVal = allPoints.reduce((m, d) => Math.max(m, d.value), 1);
  replayInstance.setData({ max: maxVal, data: allPoints });

  document.getElementById('replayTimeLabel').textContent = hourlyData[idx].hour_label;
  document.getElementById('replayHourDisplay').textContent =
    `${idx + 1} / ${hourlyData.length} hours`;
  document.getElementById('replaySlider').value = idx;
}

function updatePlayButton(paused) {
  const btn = document.getElementById('replayPlayBtn');
  // Clear children
  while (btn.firstChild) btn.removeChild(btn.firstChild);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');

  if (paused) {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '5 3 19 12 5 21 5 3');
    svg.appendChild(poly);
    btn.appendChild(svg);
    btn.appendChild(document.createTextNode(' Play'));
  } else {
    const r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r1.setAttribute('x', '6'); r1.setAttribute('y', '4');
    r1.setAttribute('width', '4'); r1.setAttribute('height', '16');
    const r2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r2.setAttribute('x', '14'); r2.setAttribute('y', '4');
    r2.setAttribute('width', '4'); r2.setAttribute('height', '16');
    svg.appendChild(r1);
    svg.appendChild(r2);
    btn.appendChild(svg);
    btn.appendChild(document.createTextNode(' Pause'));
  }
}

function play() {
  if (hourlyData.length === 0) return;
  if (isPlaying) { pause(); return; }

  isPlaying = true;
  updatePlayButton(false);

  // If at end, restart
  if (currentHourIdx >= hourlyData.length - 1) currentHourIdx = 0;

  playInterval = setInterval(() => {
    currentHourIdx++;
    if (currentHourIdx >= hourlyData.length) {
      pause();
      return;
    }
    renderFrame(currentHourIdx);
  }, 1000 / speed);
}

function pause() {
  isPlaying = false;
  if (playInterval) { clearInterval(playInterval); playInterval = null; }
  updatePlayButton(true);
}

// Play button
document.getElementById('replayPlayBtn')?.addEventListener('click', play);

// Slider scrub
document.getElementById('replaySlider')?.addEventListener('input', (e) => {
  const idx = parseInt(e.target.value, 10);
  currentHourIdx = idx;
  renderFrame(idx);
  if (isPlaying) pause();
});

// Speed buttons
document.querySelectorAll('.replay-speeds .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.replay-speeds .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    speed = parseInt(btn.dataset.speed, 10);
    if (isPlaying) {
      pause();
      play();
    }
  });
});
