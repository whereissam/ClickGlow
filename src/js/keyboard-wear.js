// Virtual Keyboard "Paint Wear" Simulator
import { invoke, getTimeRange, currentTimeRange } from './utils.js';

// ANSI keyboard layout — each row is an array of { id, label, width }
// id matches rdev Key debug format
const KEYBOARD_ROWS = [
  [
    { id: 'Escape', label: 'Esc', w: 1 },
    { id: 'F1', label: 'F1', w: 1 }, { id: 'F2', label: 'F2', w: 1 },
    { id: 'F3', label: 'F3', w: 1 }, { id: 'F4', label: 'F4', w: 1 },
    { id: 'F5', label: 'F5', w: 1 }, { id: 'F6', label: 'F6', w: 1 },
    { id: 'F7', label: 'F7', w: 1 }, { id: 'F8', label: 'F8', w: 1 },
    { id: 'F9', label: 'F9', w: 1 }, { id: 'F10', label: 'F10', w: 1 },
    { id: 'F11', label: 'F11', w: 1 }, { id: 'F12', label: 'F12', w: 1 },
    { id: 'Delete', label: 'Del', w: 1 },
  ],
  [
    { id: 'BackQuote', label: '`', w: 1 },
    { id: 'Num1', label: '1', w: 1 }, { id: 'Num2', label: '2', w: 1 },
    { id: 'Num3', label: '3', w: 1 }, { id: 'Num4', label: '4', w: 1 },
    { id: 'Num5', label: '5', w: 1 }, { id: 'Num6', label: '6', w: 1 },
    { id: 'Num7', label: '7', w: 1 }, { id: 'Num8', label: '8', w: 1 },
    { id: 'Num9', label: '9', w: 1 }, { id: 'Num0', label: '0', w: 1 },
    { id: 'Minus', label: '-', w: 1 }, { id: 'Equal', label: '=', w: 1 },
    { id: 'Backspace', label: '⌫', w: 1.5 },
  ],
  [
    { id: 'Tab', label: 'Tab', w: 1.5 },
    { id: 'KeyQ', label: 'Q', w: 1 }, { id: 'KeyW', label: 'W', w: 1 },
    { id: 'KeyE', label: 'E', w: 1 }, { id: 'KeyR', label: 'R', w: 1 },
    { id: 'KeyT', label: 'T', w: 1 }, { id: 'KeyY', label: 'Y', w: 1 },
    { id: 'KeyU', label: 'U', w: 1 }, { id: 'KeyI', label: 'I', w: 1 },
    { id: 'KeyO', label: 'O', w: 1 }, { id: 'KeyP', label: 'P', w: 1 },
    { id: 'LeftBracket', label: '[', w: 1 }, { id: 'RightBracket', label: ']', w: 1 },
    { id: 'BackSlash', label: '\\', w: 1 },
  ],
  [
    { id: 'CapsLock', label: 'Caps', w: 1.75 },
    { id: 'KeyA', label: 'A', w: 1 }, { id: 'KeyS', label: 'S', w: 1 },
    { id: 'KeyD', label: 'D', w: 1 }, { id: 'KeyF', label: 'F', w: 1 },
    { id: 'KeyG', label: 'G', w: 1 }, { id: 'KeyH', label: 'H', w: 1 },
    { id: 'KeyJ', label: 'J', w: 1 }, { id: 'KeyK', label: 'K', w: 1 },
    { id: 'KeyL', label: 'L', w: 1 }, { id: 'SemiColon', label: ';', w: 1 },
    { id: 'Quote', label: "'", w: 1 },
    { id: 'Return', label: 'Enter', w: 1.75 },
  ],
  [
    { id: 'ShiftLeft', label: 'Shift', w: 2.25 },
    { id: 'KeyZ', label: 'Z', w: 1 }, { id: 'KeyX', label: 'X', w: 1 },
    { id: 'KeyC', label: 'C', w: 1 }, { id: 'KeyV', label: 'V', w: 1 },
    { id: 'KeyB', label: 'B', w: 1 }, { id: 'KeyN', label: 'N', w: 1 },
    { id: 'KeyM', label: 'M', w: 1 }, { id: 'Comma', label: ',', w: 1 },
    { id: 'Dot', label: '.', w: 1 }, { id: 'Slash', label: '/', w: 1 },
    { id: 'ShiftRight', label: 'Shift', w: 2.25 },
  ],
  [
    { id: 'Function', label: 'Fn', w: 1 },
    { id: 'ControlLeft', label: 'Ctrl', w: 1.25 },
    { id: 'Alt', label: 'Opt', w: 1.25 },
    { id: 'MetaLeft', label: '⌘', w: 1.25 },
    { id: 'Space', label: '', w: 5 },
    { id: 'MetaRight', label: '⌘', w: 1.25 },
    { id: 'AltGr', label: 'Opt', w: 1.25 },
    { id: 'LeftArrow', label: '←', w: 1 },
    { id: 'UpArrow', label: '↑', w: 1 },
    { id: 'DownArrow', label: '↓', w: 1 },
    { id: 'RightArrow', label: '→', w: 1 },
  ],
];

// Wear stages based on percentage of max key count
// threshold = percentage of max count
const WEAR_STAGES = [
  { threshold: 0,    name: 'pristine', css: 'wear-pristine' },
  { threshold: 0.05, name: 'faded',    css: 'wear-faded' },
  { threshold: 0.2,  name: 'cracked',  css: 'wear-cracked' },
  { threshold: 0.5,  name: 'hole',     css: 'wear-hole' },
  { threshold: 0.8,  name: 'missing',  css: 'wear-missing' },
];

function getWearStage(count, maxCount) {
  if (count === 0 || maxCount === 0) return WEAR_STAGES[0];
  const pct = count / maxCount;
  let stage = WEAR_STAGES[0];
  for (const s of WEAR_STAGES) {
    if (pct >= s.threshold) stage = s;
  }
  return stage;
}

function getHeatColor(count, maxCount) {
  if (count === 0 || maxCount === 0) return 'transparent';
  const pct = Math.min(1, count / maxCount);
  // Blue → Cyan → Green → Yellow → Orange → Red
  if (pct < 0.2) return `rgba(91, 140, 255, ${0.15 + pct * 2})`;
  if (pct < 0.4) return `rgba(126, 217, 87, ${0.2 + pct})`;
  if (pct < 0.6) return `rgba(247, 184, 1, ${0.3 + pct * 0.5})`;
  if (pct < 0.8) return `rgba(255, 107, 53, ${0.4 + pct * 0.4})`;
  return `rgba(255, 50, 50, ${0.5 + pct * 0.4})`;
}

export async function loadKeyboardWear() {
  const container = document.getElementById('keyboardWearSection');
  if (!container) return;

  const { start, end } = getTimeRange(currentTimeRange);
  try {
    const data = await invoke('get_key_frequency', { startMs: start, endMs: end });
    renderKeyboardWear(container, data);
  } catch (e) {
    console.error('Failed to load keyboard wear:', e);
  }
}

function renderKeyboardWear(container, data) {
  container.textContent = '';

  // Build count map from frequency data
  const countMap = {};
  let maxCount = 0;
  let totalHits = 0;
  for (const d of data) {
    countMap[d.key] = Number(d.count);
    totalHits += Number(d.count);
    if (Number(d.count) > maxCount) maxCount = Number(d.count);
  }

  // Keyboard container
  const kbd = document.createElement('div');
  kbd.className = 'wear-keyboard';

  for (const row of KEYBOARD_ROWS) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'wear-row';

    for (const key of row) {
      const count = countMap[key.id] || 0;
      const stage = getWearStage(count, maxCount);
      const heatBg = getHeatColor(count, maxCount);

      const keyEl = document.createElement('div');
      keyEl.className = `wear-key ${stage.css}`;
      keyEl.style.setProperty('--key-w', key.w);
      if (count > 0) {
        keyEl.style.setProperty('--heat-color', heatBg);
      }

      const labelEl = document.createElement('span');
      labelEl.className = 'wear-key-label';
      labelEl.textContent = key.label;
      keyEl.appendChild(labelEl);

      if (count > 0) {
        keyEl.title = `${key.label || key.id}: ${count.toLocaleString()} hits — ${stage.name}`;
      }

      rowDiv.appendChild(keyEl);
    }

    kbd.appendChild(rowDiv);
  }

  container.appendChild(kbd);

  // Wear legend
  const legend = document.createElement('div');
  legend.className = 'wear-legend';
  for (const stage of WEAR_STAGES) {
    const item = document.createElement('div');
    item.className = `wear-legend-item`;
    const swatch = document.createElement('span');
    swatch.className = `wear-legend-swatch ${stage.css}`;
    const label = document.createElement('span');
    label.textContent = stage.name;
    item.appendChild(swatch);
    item.appendChild(label);
    legend.appendChild(item);
  }
  container.appendChild(legend);

  // Fun stat
  if (data.length > 0) {
    const top = data[0];
    const funDiv = document.createElement('div');
    funDiv.className = 'wear-fun-stat';

    const keyName = friendlyKeyName(top.key);
    const count = Number(top.count).toLocaleString();
    funDiv.textContent = `Your ${keyName} has been hit ${count} times!`;
    container.appendChild(funDiv);

    // Runner-up stats
    if (data.length >= 3) {
      const statsRow = document.createElement('div');
      statsRow.className = 'wear-stats-row';
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const d = data[i];
        const stat = document.createElement('div');
        stat.className = 'wear-stat-chip';
        const name = document.createElement('span');
        name.className = 'wear-stat-key';
        name.textContent = friendlyKeyName(d.key);
        const cnt = document.createElement('span');
        cnt.className = 'wear-stat-count';
        cnt.textContent = Number(d.count).toLocaleString();
        stat.appendChild(name);
        stat.appendChild(cnt);
        statsRow.appendChild(stat);
      }
      container.appendChild(statsRow);
    }
  }
}

function friendlyKeyName(keyCode) {
  const map = {
    'Space': 'Spacebar',
    'Return': 'Enter',
    'Backspace': 'Backspace',
    'ShiftLeft': 'Left Shift',
    'ShiftRight': 'Right Shift',
    'ControlLeft': 'Ctrl',
    'MetaLeft': 'Command ⌘',
    'MetaRight': 'Right ⌘',
    'Alt': 'Option',
    'AltGr': 'Right Option',
    'Tab': 'Tab',
    'CapsLock': 'Caps Lock',
    'Escape': 'Escape',
    'Delete': 'Delete',
    'LeftArrow': 'Left Arrow',
    'RightArrow': 'Right Arrow',
    'UpArrow': 'Up Arrow',
    'DownArrow': 'Down Arrow',
    'SemiColon': 'Semicolon',
    'BackQuote': 'Backtick',
    'LeftBracket': 'Left Bracket',
    'RightBracket': 'Right Bracket',
    'BackSlash': 'Backslash',
    'Comma': 'Comma',
    'Dot': 'Period',
    'Slash': 'Slash',
    'Minus': 'Minus',
    'Equal': 'Equals',
    'Quote': 'Quote',
  };
  if (map[keyCode]) return map[keyCode];
  if (keyCode.startsWith('Key')) return keyCode.slice(3) + ' key';
  if (keyCode.startsWith('Num')) return keyCode.slice(3) + ' key';
  return keyCode;
}
