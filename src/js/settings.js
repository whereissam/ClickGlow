// Settings panel and onboarding wizard
import { invoke } from './utils.js';
import { checkAccessibility } from './controls.js';
import { initSound, playToggle } from './sounds.js';

// --- Settings ---
export async function loadSettings() {
  try {
    const months = await invoke('get_retention_months');
    document.getElementById('retentionMonths').value = months.toString();
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  loadTheme();
}

// --- Theme ---
function loadTheme() {
  const saved = localStorage.getItem('clickglow_theme') || 'dark';
  applyTheme(saved);
  document.querySelectorAll('#themeToggle .theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === saved);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('clickglow_theme', theme);
}

document.getElementById('themeToggle')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-btn');
  if (!btn) return;
  const theme = btn.dataset.theme;
  applyTheme(theme);
  document.querySelectorAll('#themeToggle .theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  playToggle();
});

// Init theme on page load (before settings tab is opened)
(function () {
  const saved = localStorage.getItem('clickglow_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

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

export async function initOnboarding(onFinish) {
  try {
    const done = await invoke('get_onboarding_done');
    if (!done) {
      document.getElementById('onboarding').style.display = 'flex';
      onboardingCheckPerm();
    }
  } catch (e) {
    console.error('Failed to check onboarding:', e);
  }

  window.onboardingFinish = async function () {
    try {
      await invoke('set_onboarding_done');
    } catch (e) {
      console.error('Failed to save onboarding state:', e);
    }
    document.getElementById('onboarding').style.display = 'none';
    if (onFinish) onFinish();
  };
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
