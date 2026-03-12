// Settings panel and onboarding wizard
import { invoke } from './utils.js';
import { checkAccessibility } from './controls.js';

// --- Settings ---
export async function loadSettings() {
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
