// Boss Panic Index UI
import { invoke } from './utils.js';

let panicPollTimer = null;

export function startPanicPoll() {
  if (panicPollTimer) clearInterval(panicPollTimer);
  updatePanic();
  panicPollTimer = setInterval(updatePanic, 3000);
}

export function stopPanicPoll() {
  if (panicPollTimer) {
    clearInterval(panicPollTimer);
    panicPollTimer = null;
  }
}

async function updatePanic() {
  const container = document.getElementById('panicSection');
  if (!container) return;

  try {
    const stats = await invoke('get_panic_stats');
    renderPanic(container, stats);
  } catch (_) {}
}

function renderPanic(container, stats) {
  container.textContent = '';

  // Header with panic indicator
  const header = document.createElement('div');
  header.className = 'panic-header';

  const title = document.createElement('div');
  title.className = 'panic-title';
  if (stats.in_panic) {
    title.textContent = '🚨 PANIC DETECTED!';
    title.classList.add('panicking');
  } else if (stats.stealth_master) {
    title.textContent = '🥷 Stealth Master';
    title.classList.add('stealth');
  } else {
    title.textContent = 'Boss Panic Index';
  }
  header.appendChild(title);
  container.appendChild(header);

  // Stats row
  const statsRow = document.createElement('div');
  statsRow.className = 'panic-stats';

  const cards = [
    { value: stats.weekly_panics, label: 'This Week', color: stats.weekly_panics === 0 ? '#7ED957' : '#FF6B35' },
    { value: stats.weekly_score, label: 'Panic Score', color: stats.weekly_score > 10 ? '#ff3333' : '#F7B801' },
    { value: stats.total_panics, label: 'Total (Session)', color: 'var(--text)' },
  ];

  for (const c of cards) {
    const card = document.createElement('div');
    card.className = 'panic-stat-card';
    const val = document.createElement('div');
    val.className = 'panic-stat-val';
    val.style.color = c.color;
    val.textContent = c.value;
    const lbl = document.createElement('div');
    lbl.className = 'panic-stat-lbl';
    lbl.textContent = c.label;
    card.appendChild(val);
    card.appendChild(lbl);
    statsRow.appendChild(card);
  }
  container.appendChild(statsRow);

  // Achievement
  if (stats.stealth_master) {
    const badge = document.createElement('div');
    badge.className = 'panic-achievement';
    badge.textContent = '🏆 Stealth Master — 0 panic switches this week!';
    container.appendChild(badge);
  }

  // Recent events
  if (stats.recent_events.length > 0) {
    const eventsDiv = document.createElement('div');
    eventsDiv.className = 'panic-events';
    const evTitle = document.createElement('div');
    evTitle.className = 'panic-events-title';
    evTitle.textContent = 'Recent Panic Events';
    eventsDiv.appendChild(evTitle);

    const list = document.createElement('div');
    list.className = 'panic-events-list';

    // Show last 10
    const recent = stats.recent_events.slice(-10).reverse();
    for (const ev of recent) {
      const row = document.createElement('div');
      row.className = 'panic-event-row';

      const time = document.createElement('span');
      time.className = 'panic-event-time';
      time.textContent = new Date(ev.timestamp_ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const kind = document.createElement('span');
      kind.className = 'panic-event-kind';
      kind.textContent = ev.kind === 'rapid_tab_switch' ? '⌘Tab spam' : 'Panic keys';

      const score = document.createElement('span');
      score.className = 'panic-event-score';
      score.textContent = '+' + ev.score;

      row.appendChild(time);
      row.appendChild(kind);
      row.appendChild(score);
      list.appendChild(row);
    }

    eventsDiv.appendChild(list);
    container.appendChild(eventsDiv);
  }
}
