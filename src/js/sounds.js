// Pet sound effects using Web Audio API (no audio files needed)

let audioCtx = null;
let soundEnabled = true;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  localStorage.setItem('clickglow_sound', enabled ? '1' : '0');
}

export function initSound() {
  const saved = localStorage.getItem('clickglow_sound');
  if (saved !== null) soundEnabled = saved === '1';
  const toggle = document.getElementById('soundToggle');
  if (toggle) {
    toggle.checked = soundEnabled;
    toggle.addEventListener('change', () => setSoundEnabled(toggle.checked));
  }
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

// --- Sound library ---

// Pet click/bounce — cheerful blip
export function playPetClick() {
  playTone(880, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(1100, 0.08, 'sine', 0.08), 60);
}

// Pomodoro start — ascending chime
export function playFocusStart() {
  playTone(523, 0.15, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.1), 120);
  setTimeout(() => playTone(784, 0.2, 'sine', 0.12), 240);
}

// Pomodoro complete — victory fanfare
export function playFocusComplete() {
  playTone(784, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(988, 0.15, 'sine', 0.12), 150);
  setTimeout(() => playTone(1175, 0.3, 'sine', 0.15), 300);
  setTimeout(() => playTone(1568, 0.4, 'triangle', 0.1), 500);
}

// Pet takes damage — low warning buzz
export function playDamage() {
  playTone(200, 0.15, 'sawtooth', 0.08);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.06), 100);
}

// Pet rename — soft confirmation
export function playRename() {
  playTone(660, 0.1, 'sine', 0.08);
  setTimeout(() => playTone(880, 0.12, 'sine', 0.1), 80);
}

// Level up / evolution — epic ascending
export function playLevelUp() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.2, 'sine', 0.1), i * 100);
  });
  setTimeout(() => playTone(1568, 0.5, 'triangle', 0.12), 500);
}

// Export PNG — camera shutter sound
export function playExport() {
  playTone(1200, 0.05, 'square', 0.06);
  setTimeout(() => playTone(800, 0.08, 'square', 0.04), 50);
}

// Theme toggle — soft switch
export function playToggle() {
  playTone(440, 0.08, 'sine', 0.06);
  setTimeout(() => playTone(660, 0.08, 'sine', 0.06), 60);
}
