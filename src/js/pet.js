// Focus Pet, Pomodoro, mini pet, desktop buddy toggle
import { invoke, showToast } from './utils.js';
import { setPetPollTimer } from './controls.js';

let pomodoroTimer = null;
let pomodoroDurationMins = 25;
let pomodoroSecondsLeft = 25 * 60;
let pomodoroRunning = false;

const distractionQuotes = [
  "Hey! YouTube won't code itself!",
  "Your pet is DYING and you're watching cat videos?!",
  "Plot twist: the deadline is tomorrow",
  "Netflix & chill? More like Netflix & skill-drain",
  "Your pet just filed a complaint to HR",
  "Every second on Reddit costs 1 brain cell",
  "Touch grass... I mean, touch keyboard!",
  "Your future self is judging you right now",
  "This is fine. Everything is fine.",
  "POV: you explaining to your boss why the feature isn't done",
];

export async function loadPetPanel() {
  try {
    const pet = await invoke('get_pet');
    const distracted = await invoke('is_distracted');
    updatePetUI(pet, distracted);
  } catch (e) {
    console.error('Failed to load pet:', e);
  }
  loadStreakHeatmap();

  const timer = setInterval(async () => {
    try {
      const pet = await invoke('get_pet');
      const distracted = await invoke('is_distracted');
      updatePetUI(pet, distracted);
    } catch (_) {}
  }, 3000);
  setPetPollTimer(timer);
}

function updatePetUI(pet, distracted = false) {
  const creature = document.getElementById('petCreature');
  const petScene = document.querySelector('.pet-scene');
  creature.setAttribute('data-species', pet.species);

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

  // Distraction warning
  let warningEl = document.getElementById('petWarning');
  if (!warningEl) {
    warningEl = document.createElement('div');
    warningEl.id = 'petWarning';
    warningEl.className = 'pet-warning';
    document.querySelector('.pet-scene').appendChild(warningEl);
  }
  if (distracted) {
    warningEl.textContent = distractionQuotes[Math.floor(Math.random() * distractionQuotes.length)];
    warningEl.style.display = 'block';
  } else {
    warningEl.style.display = 'none';
  }

  // HP bar
  const hpPct = Math.max(0, Math.min(100, (pet.hp / pet.max_hp) * 100));
  const hpFill = document.getElementById('petHpFill');
  hpFill.style.width = hpPct + '%';
  if (hpPct > 60) hpFill.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
  else if (hpPct > 40) hpFill.style.background = 'linear-gradient(90deg, #facc15, #eab308)';
  else if (hpPct > 20) hpFill.style.background = 'linear-gradient(90deg, #fb923c, #f97316)';
  else hpFill.style.background = 'linear-gradient(90deg, #f87171, #ef4444)';
  document.getElementById('petHpText').textContent = `${pet.hp}/${pet.max_hp}`;

  // XP bar
  const xpNeeded = pet.level === 1 ? 100 : pet.level === 2 ? 300 : 999;
  const xpPct = Math.max(0, Math.min(100, (pet.xp / xpNeeded) * 100));
  document.getElementById('petXpFill').style.width = xpPct + '%';
  document.getElementById('petXpText').textContent = `${pet.xp}/${xpNeeded}`;

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

// Global mini pet poll (sidebar, always visible)
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
  creature.offsetHeight;
  creature.style.animation = 'petBounce 0.4s ease';
});

// --- Pet Rename (click to edit) ---
const petNameTag = document.getElementById('petNameTag');
const petNameInput = document.getElementById('petNameInput');

petNameTag.style.cursor = 'pointer';
petNameTag.addEventListener('click', () => {
  petNameInput.value = petNameTag.textContent;
  petNameTag.style.display = 'none';
  petNameInput.style.display = 'block';
  petNameInput.focus();
  petNameInput.select();
});

async function commitRename() {
  const newName = petNameInput.value.trim();
  petNameInput.style.display = 'none';
  petNameTag.style.display = 'block';
  if (!newName || newName === petNameTag.textContent) return;
  try {
    const pet = await invoke('rename_pet', { name: newName });
    petNameTag.textContent = pet.name;
    document.getElementById('miniPetName').textContent = pet.name;
    showToast('Renamed to ' + pet.name);
  } catch (e) {
    console.error('Rename failed:', e);
    showToast('Rename failed', true);
  }
}

petNameInput.addEventListener('blur', commitRename);
petNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); petNameInput.blur(); }
  if (e.key === 'Escape') { petNameInput.style.display = 'none'; petNameTag.style.display = 'block'; }
});

// --- Focus Streak Heatmap (GitHub-style grid) ---
export async function loadStreakHeatmap() {
  try {
    const history = await invoke('get_focus_history');
    renderStreakGrid(history);
  } catch (e) {
    console.error('Failed to load focus history:', e);
  }
}

function renderStreakGrid(history) {
  const grid = document.getElementById('streakGrid');
  const summary = document.getElementById('streakSummary');
  if (!grid) return;
  grid.textContent = '';

  // Build a map of date -> count
  const map = {};
  let totalSessions = 0;
  let activeDays = 0;
  for (const [date, count] of history) {
    map[date] = count;
    totalSessions += count;
    activeDays++;
  }

  // Generate last 90 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = 91; // 13 weeks
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);

  // Align to start of week (Sunday)
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay);

  const totalDays = Math.ceil((today - startDate) / 86400000) + 1;
  const weeks = Math.ceil(totalDays / 7);

  for (let w = 0; w < weeks; w++) {
    const col = document.createElement('div');
    col.className = 'streak-col';
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const dateStr = cellDate.toISOString().slice(0, 10);
      const count = map[dateStr] || 0;

      const cell = document.createElement('div');
      cell.className = 'streak-cell';
      cell.title = `${dateStr}: ${count} session${count !== 1 ? 's' : ''}`;

      if (cellDate > today) {
        cell.style.visibility = 'hidden';
      } else if (count === 0) {
        cell.style.background = 'var(--bg-hover)';
      } else if (count === 1) {
        cell.style.background = 'rgba(74,222,128,0.2)';
      } else if (count === 2) {
        cell.style.background = 'rgba(74,222,128,0.45)';
      } else if (count <= 4) {
        cell.style.background = 'rgba(74,222,128,0.7)';
      } else {
        cell.style.background = '#4ade80';
      }

      col.appendChild(cell);
    }
    grid.appendChild(col);
  }

  // Current streak (consecutive days from today backward)
  let currentStreak = 0;
  const checkDate = new Date(today);
  while (true) {
    const ds = checkDate.toISOString().slice(0, 10);
    if (map[ds] && map[ds] > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  summary.textContent = `${totalSessions} sessions over ${activeDays} days · ${currentStreak} day streak`;
}

// --- Pomodoro timer ---
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

document.getElementById('pomodoroDuration').addEventListener('change', (e) => {
  if (pomodoroRunning) return;
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

// --- Desktop Buddy Toggle ---
let buddyVisible = false;

window.toggleDesktopBuddy = async function () {
  try {
    buddyVisible = await invoke('toggle_buddy');
    const btn = document.getElementById('buddyToggleBtn');
    if (btn) btn.textContent = buddyVisible ? 'Call Pet Back' : 'Release Pet to Desktop Edge';
    showToast(buddyVisible ? 'Pet released to desktop edge!' : 'Pet returned home');
  } catch (e) {
    showToast('Failed to toggle buddy: ' + e, true);
  }
};
