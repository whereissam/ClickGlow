// Mouse Trail Art Generator — renders mouse trajectories as generative art
import { invoke, getTimeRange, showToast, currentTimeRange } from './utils.js';

let canvas, ctx;
let currentStyle = 'neon';
let trajectoryData = [];

const STYLES = {
  neon: {
    bg: '#0a0a0f',
    colors: ['#F7B801', '#FF6B35', '#7ED957', '#5B8CFF', '#B388FF', '#ff3333'],
    lineWidth: 2,
    glow: true,
    clickDot: true,
  },
  watercolor: {
    bg: '#0d0d14',
    colors: ['#4a90d9', '#6bc5b0', '#e8a87c', '#d291bc', '#8ecae6', '#fb8500'],
    lineWidth: 6,
    glow: false,
    alpha: 0.08,
    clickDot: false,
  },
  ink: {
    bg: '#f5f0e8',
    colors: ['#1a1a1a'],
    lineWidth: 1.5,
    glow: false,
    clickDot: true,
    dark: false,
  },
  constellation: {
    bg: '#06060f',
    colors: ['#ffffff'],
    lineWidth: 0.5,
    glow: true,
    star: true,
    clickDot: true,
  },
  flow: {
    bg: '#0a0a0f',
    colors: ['#F7B801', '#FF6B35', '#ff3333', '#B388FF', '#5B8CFF'],
    lineWidth: 1.2,
    glow: true,
    clickDot: false,
  },
};

export async function loadTrailArt() {
  canvas = document.getElementById('trailArtCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height - 80;

  await fetchAndRender();
}

async function fetchAndRender() {
  const { start, end } = getTimeRange(currentTimeRange);
  try {
    trajectoryData = await invoke('get_mouse_trajectory', { startMs: start, endMs: end });
    document.getElementById('trailArtPoints').textContent = `${trajectoryData.length} points`;
    render();
  } catch (e) {
    console.error('Failed to load trajectory:', e);
  }
}

function render() {
  if (!ctx || trajectoryData.length < 2) {
    if (ctx) {
      ctx.fillStyle = STYLES[currentStyle].bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#5C5E66';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Not enough mouse data yet. Keep using your Mac!', canvas.width / 2, canvas.height / 2);
    }
    return;
  }

  const style = STYLES[currentStyle];
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, w, h);

  // Scale trajectory from screen coords to canvas
  const scaleX = w / 1920;
  const scaleY = h / 1080;

  switch (currentStyle) {
    case 'neon': renderNeon(style, scaleX, scaleY); break;
    case 'watercolor': renderWatercolor(style, scaleX, scaleY); break;
    case 'ink': renderInk(style, scaleX, scaleY); break;
    case 'constellation': renderConstellation(style, scaleX, scaleY); break;
    case 'flow': renderFlow(style, scaleX, scaleY); break;
  }
}

function renderNeon(style, sx, sy) {
  const data = trajectoryData;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const x1 = prev.x * sx, y1 = prev.y * sy;
    const x2 = curr.x * sx, y2 = curr.y * sy;

    // Skip large jumps (likely screen transitions)
    if (Math.hypot(x2 - x1, y2 - y1) > 200) continue;

    const color = style.colors[i % style.colors.length];
    const speed = Math.min(Math.hypot(x2 - x1, y2 - y1), 50);
    const alpha = 0.3 + (speed / 50) * 0.7;

    ctx.strokeStyle = color;
    ctx.lineWidth = style.lineWidth + (1 - speed / 50) * 2;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Click dots
    if (curr.event_type > 0) {
      ctx.globalAlpha = 0.9;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(x2, y2, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function renderWatercolor(style, sx, sy) {
  const data = trajectoryData;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Multiple passes for watercolor blending
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const x1 = prev.x * sx, y1 = prev.y * sy;
      const x2 = curr.x * sx, y2 = curr.y * sy;
      if (Math.hypot(x2 - x1, y2 - y1) > 200) continue;

      const color = style.colors[(i + pass) % style.colors.length];
      const offset = (pass - 1) * 3;

      ctx.strokeStyle = color;
      ctx.lineWidth = style.lineWidth + pass * 4;
      ctx.globalAlpha = style.alpha;

      ctx.beginPath();
      ctx.moveTo(x1 + offset, y1 + offset);
      ctx.lineTo(x2 + offset, y2 + offset);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function renderInk(style, sx, sy) {
  const data = trajectoryData;
  ctx.strokeStyle = style.colors[0];
  ctx.lineCap = 'round';

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const x1 = prev.x * sx, y1 = prev.y * sy;
    const x2 = curr.x * sx, y2 = curr.y * sy;
    if (Math.hypot(x2 - x1, y2 - y1) > 200) continue;

    const speed = Math.min(Math.hypot(x2 - x1, y2 - y1), 40);
    // Faster movement = thinner stroke (like a brush)
    ctx.lineWidth = style.lineWidth + (1 - speed / 40) * 3;
    ctx.globalAlpha = 0.4 + (1 - speed / 40) * 0.6;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (curr.event_type > 0) {
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(x2, y2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function renderConstellation(style, sx, sy) {
  const data = trajectoryData;

  // Draw faint lines between consecutive points
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = style.lineWidth;
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const x1 = prev.x * sx, y1 = prev.y * sy;
    const x2 = curr.x * sx, y2 = curr.y * sy;
    if (Math.hypot(x2 - x1, y2 - y1) > 200) continue;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Draw stars at click points and sparse movement points
  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    const x = p.x * sx, y = p.y * sy;
    const isClick = p.event_type > 0;

    if (!isClick && i % 5 !== 0) continue;

    const size = isClick ? 3 : 1.2;
    const alpha = isClick ? 1 : 0.5;

    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = isClick ? 15 : 5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Cross sparkle for clicks
    if (isClick) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function renderFlow(style, sx, sy) {
  const data = trajectoryData;
  ctx.lineCap = 'round';

  // Group consecutive points into segments, color by time bucket
  const segmentSize = Math.max(1, Math.floor(data.length / 200));

  for (let s = 0; s < data.length - segmentSize; s += segmentSize) {
    const segment = data.slice(s, s + segmentSize + 1);
    const colorIdx = Math.floor((s / data.length) * style.colors.length);
    const color = style.colors[Math.min(colorIdx, style.colors.length - 1)];

    ctx.strokeStyle = color;
    ctx.lineWidth = style.lineWidth;
    ctx.globalAlpha = 0.6;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    for (let i = 0; i < segment.length; i++) {
      const x = segment[i].x * sx;
      const y = segment[i].y * sy;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const px = segment[i - 1].x * sx;
        const py = segment[i - 1].y * sy;
        if (Math.hypot(x - px, y - py) > 200) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// Style switcher
document.querySelectorAll('.art-styles .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.art-styles .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStyle = btn.dataset.style;
    render();
  });
});

// Export
document.getElementById('exportTrailArtBtn')?.addEventListener('click', async () => {
  if (!canvas) return;
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const ts = new Date().toISOString().slice(0, 10);
    const path = await invoke('save_png_base64', {
      base64Data: base64,
      filename: `clickglow-trail-art-${currentStyle}-${ts}.png`,
    });
    showToast('Saved to ' + path);
  } catch (e) {
    console.error('Export failed:', e);
    showToast('Export failed: ' + e, true);
  }
});
