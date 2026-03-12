// Time range dropdown, rest mode, recording status, tab switching
import { invoke, showToast, currentTimeRange, setTimeRange } from './utils.js';

// --- Custom time range dropdown ---
const timeRangeLabels = { today: "Today", week: "This Week", month: "This Month" };
const overviewTitles = { today: "Today's Overview", week: "This Week's Overview", month: "This Month's Overview" };

const selectWrapper = document.getElementById('timeRangeWrapper');
const selectTrigger = document.getElementById('timeRangeTrigger');
const selectDropdown = document.getElementById('timeRangeDropdown');

let onTimeRangeChangeCallback = null;

export function setOnTimeRangeChange(fn) {
  onTimeRangeChangeCallback = fn;
}

selectTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  selectWrapper.classList.toggle('open');
});

selectDropdown.addEventListener('click', (e) => {
  const btn = e.target.closest('.custom-option');
  if (!btn) return;
  const val = btn.dataset.value;
  setTimeRange(val);

  selectTrigger.querySelector('.select-label').textContent = timeRangeLabels[val];
  selectDropdown.querySelectorAll('.custom-option').forEach(o => o.classList.remove('active'));
  btn.classList.add('active');

  const titleEl = document.getElementById('overviewTitle');
  if (titleEl) titleEl.textContent = overviewTitles[val] || 'Overview';

  selectWrapper.classList.remove('open');
  if (onTimeRangeChangeCallback) onTimeRangeChangeCallback();
});

document.addEventListener('click', () => {
  selectWrapper.classList.remove('open');
});

// --- Rest mode ---
const restBtn = document.getElementById('restModeBtn');
let isResting = false;

function setRestBtnIcon(isPlay) {
  const svg = restBtn.querySelector('svg');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  if (isPlay) {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '5 3 19 12 5 21 5 3');
    svg.appendChild(poly);
  } else {
    const r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r1.setAttribute('x', '6'); r1.setAttribute('y', '4');
    r1.setAttribute('width', '4'); r1.setAttribute('height', '16');
    const r2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r2.setAttribute('x', '14'); r2.setAttribute('y', '4');
    r2.setAttribute('width', '4'); r2.setAttribute('height', '16');
    svg.appendChild(r1);
    svg.appendChild(r2);
  }
}

restBtn.addEventListener('click', async () => {
  try {
    const isRecording = await invoke('get_recording_status');
    if (!isResting) {
      if (isRecording) await invoke('toggle_recording');
      isResting = true;
      restBtn.classList.add('resting');
      restBtn.querySelector('span').textContent = 'Resting...';
      setRestBtnIcon(true);
      const recEl = document.getElementById('recordingIndicator');
      recEl.classList.add('paused');
      recEl.querySelector('.rec-text').textContent = 'Resting';
      showToast('Rest mode ON — pet is safe!');
    } else {
      const isStillPaused = !(await invoke('get_recording_status'));
      if (isStillPaused) await invoke('toggle_recording');
      isResting = false;
      restBtn.classList.remove('resting');
      restBtn.querySelector('span').textContent = 'Take a Rest';
      setRestBtnIcon(false);
      const recEl = document.getElementById('recordingIndicator');
      recEl.classList.remove('paused');
      recEl.querySelector('.rec-text').textContent = 'Recording';
      showToast('Back to work! Recording resumed.');
    }
  } catch (e) {
    console.error('Rest mode error:', e);
  }
});

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

export async function updateStatus() {
  try {
    const status = await invoke('get_listener_status');
    const el = document.getElementById('recordingIndicator');
    const text = el.querySelector('.rec-text');
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

export async function checkAccessibility() {
  try {
    const granted = await invoke('check_accessibility');
    const banner = document.getElementById('accessibilityBanner');
    if (banner) banner.style.display = granted ? 'none' : 'flex';
  } catch (e) {
    console.error('Failed to check accessibility:', e);
  }
}

// --- Tab switching ---
const tabLoaders = {};

export function registerTabLoader(tab, fn) {
  tabLoaders[tab] = fn;
}

export let petPollTimer = null;

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-panel`).classList.add('active');

    if (btn.dataset.tab !== 'pet' && petPollTimer) {
      clearInterval(petPollTimer);
      petPollTimer = null;
    }

    const loader = tabLoaders[btn.dataset.tab];
    if (loader) loader();
  });
});

export function setPetPollTimer(timer) {
  petPollTimer = timer;
}

// --- Refresh button ---
document.getElementById('refreshBtn').addEventListener('click', () => {
  const activeTab = document.querySelector('.nav-btn.active').dataset.tab;
  const loader = tabLoaders[activeTab];
  if (loader) loader();
});
