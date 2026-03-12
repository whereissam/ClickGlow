// Mouse Odometer — distance tracking, fun comparisons, achievement badges
import { invoke } from './utils.js';

// Fun landmark comparisons (distance in meters)
const LANDMARKS = [
  { meters: 50, name: "a bowling lane", icon: "🎳" },
  { meters: 100, name: "a football field", icon: "🏈" },
  { meters: 200, name: "2 football fields", icon: "🏟️" },
  { meters: 443, name: "the Empire State Building (height)", icon: "🏙️" },
  { meters: 828, name: "the Burj Khalifa (height)", icon: "🗼" },
  { meters: 1000, name: "10 city blocks", icon: "🏘️" },
  { meters: 2737, name: "the Golden Gate Bridge", icon: "🌉" },
  { meters: 3952, name: "Mt. Jade (Yushan)", icon: "🏔️" },
  { meters: 5000, name: "5 kilometers", icon: "🏃" },
  { meters: 8849, name: "Mt. Everest (height)", icon: "⛰️" },
  { meters: 10000, name: "a 10K run", icon: "🎽" },
  { meters: 21097, name: "a half marathon", icon: "🏅" },
  { meters: 42195, name: "a full marathon!", icon: "🏆" },
  { meters: 100000, name: "crossing Taipei end-to-end", icon: "🌆" },
  { meters: 384400000, name: "the Moon! 🚀", icon: "🌙" },
];

// Achievement badges (all-time milestones)
const BADGES = [
  { meters: 100, name: "First Steps", desc: "100m total mouse distance" },
  { meters: 1000, name: "Kilometer Club", desc: "1 km total distance" },
  { meters: 5000, name: "5K Runner", desc: "5 km total distance" },
  { meters: 10000, name: "Explorer", desc: "10 km total distance" },
  { meters: 42195, name: "Marathoner", desc: "Marathon distance!" },
  { meters: 100000, name: "Road Warrior", desc: "100 km total distance" },
  { meters: 500000, name: "Globetrotter", desc: "500 km total distance" },
  { meters: 1000000, name: "Million Meter Mouse", desc: "1,000 km!" },
];

function formatDistance(meters) {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(2) + ' km';
  }
  return meters.toFixed(1) + ' m';
}

function getFunComparison(meters) {
  // Find the best landmark comparison
  let best = null;
  for (const lm of LANDMARKS) {
    if (meters >= lm.meters) {
      best = lm;
    }
  }
  if (!best) return null;

  const times = meters / best.meters;
  if (times >= 2) {
    return `${best.icon} You've traveled ${times.toFixed(1)}x ${best.name}`;
  }
  return `${best.icon} You've crossed ${best.name}!`;
}

function getEarnedBadges(totalMeters) {
  return BADGES.filter(b => totalMeters >= b.meters);
}

function getNextBadge(totalMeters) {
  return BADGES.find(b => totalMeters < b.meters) || null;
}

export async function loadOdometer() {
  const container = document.getElementById('odometerSection');
  if (!container) return;

  try {
    const stats = await invoke('get_distance_stats');
    renderOdometer(container, stats);
  } catch (e) {
    console.error('Failed to load odometer:', e);
  }
}

function renderOdometer(container, stats) {
  container.textContent = '';

  // Distance cards row
  const cardsRow = document.createElement('div');
  cardsRow.className = 'odometer-cards';

  const todayCard = createDistanceCard(
    'Today', stats.today_meters, stats.today_pixels, 'var(--accent)'
  );
  const weekCard = createDistanceCard(
    'This Week', stats.week_meters, stats.week_pixels, '#7ED957'
  );
  const allTimeCard = createDistanceCard(
    'All Time', stats.alltime_meters, stats.alltime_pixels, '#B388FF'
  );

  cardsRow.appendChild(todayCard);
  cardsRow.appendChild(weekCard);
  cardsRow.appendChild(allTimeCard);
  container.appendChild(cardsRow);

  // Fun comparison
  const todayComparison = getFunComparison(stats.today_meters);
  if (todayComparison) {
    const compDiv = document.createElement('div');
    compDiv.className = 'odometer-comparison';
    compDiv.textContent = todayComparison;
    container.appendChild(compDiv);
  }

  // Badges section
  const earned = getEarnedBadges(stats.alltime_meters);
  const next = getNextBadge(stats.alltime_meters);

  if (earned.length > 0 || next) {
    const badgeSection = document.createElement('div');
    badgeSection.className = 'odometer-badges';

    const badgeTitle = document.createElement('div');
    badgeTitle.className = 'odometer-badges-title';
    badgeTitle.textContent = 'Distance Badges';
    badgeSection.appendChild(badgeTitle);

    const badgeRow = document.createElement('div');
    badgeRow.className = 'odometer-badge-row';

    for (const badge of earned) {
      const b = document.createElement('div');
      b.className = 'odometer-badge earned';
      b.title = badge.desc;
      const icon = document.createElement('span');
      icon.className = 'badge-icon';
      icon.textContent = '🏅';
      const name = document.createElement('span');
      name.className = 'badge-name';
      name.textContent = badge.name;
      b.appendChild(icon);
      b.appendChild(name);
      badgeRow.appendChild(b);
    }

    if (next) {
      const b = document.createElement('div');
      b.className = 'odometer-badge locked';
      const remaining = formatDistance(next.meters - stats.alltime_meters);
      b.title = `${next.desc} — ${remaining} to go`;
      const icon = document.createElement('span');
      icon.className = 'badge-icon';
      icon.textContent = '🔒';
      const name = document.createElement('span');
      name.className = 'badge-name';
      name.textContent = next.name;

      const prevThreshold = earned.length > 0 ? earned[earned.length - 1].meters : 0;
      const pct = Math.min(100, ((stats.alltime_meters - prevThreshold) / (next.meters - prevThreshold)) * 100);
      const prog = document.createElement('div');
      prog.className = 'badge-progress';
      const progFill = document.createElement('div');
      progFill.className = 'badge-progress-fill';
      progFill.style.width = pct + '%';
      prog.appendChild(progFill);

      b.appendChild(icon);
      b.appendChild(name);
      b.appendChild(prog);
      badgeRow.appendChild(b);
    }

    badgeSection.appendChild(badgeRow);
    container.appendChild(badgeSection);
  }

  // Daily history mini chart (last 7 days)
  if (stats.daily_history && stats.daily_history.length > 1) {
    const histDiv = document.createElement('div');
    histDiv.className = 'odometer-history';
    const histTitle = document.createElement('div');
    histTitle.className = 'odometer-history-title';
    histTitle.textContent = 'Last 7 Days';
    histDiv.appendChild(histTitle);

    const barContainer = document.createElement('div');
    barContainer.className = 'odometer-bars';
    const maxM = Math.max(...stats.daily_history.map(d => d.meters), 1);

    // Reverse so oldest is on the left
    const sortedHistory = [...stats.daily_history].reverse();
    for (const day of sortedHistory) {
      const barWrap = document.createElement('div');
      barWrap.className = 'odometer-bar-wrap';

      const bar = document.createElement('div');
      bar.className = 'odometer-bar';
      const h = Math.max(4, (day.meters / maxM) * 60);
      bar.style.height = h + 'px';
      bar.title = `${day.date_key}: ${formatDistance(day.meters)}`;

      const label = document.createElement('div');
      label.className = 'odometer-bar-label';
      label.textContent = day.date_key.slice(5); // MM-DD

      barWrap.appendChild(bar);
      barWrap.appendChild(label);
      barContainer.appendChild(barWrap);
    }

    histDiv.appendChild(barContainer);
    container.appendChild(histDiv);
  }
}

function createDistanceCard(title, meters, pixels, color) {
  const card = document.createElement('div');
  card.className = 'odometer-card';

  const label = document.createElement('div');
  label.className = 'odometer-label';
  label.textContent = title;

  const value = document.createElement('div');
  value.className = 'odometer-value';
  value.style.color = color;
  value.textContent = formatDistance(meters);

  const pxDiv = document.createElement('div');
  pxDiv.className = 'odometer-pixels';
  pxDiv.textContent = formatNumber(Math.round(pixels)) + ' px';

  card.appendChild(label);
  card.appendChild(value);
  card.appendChild(pxDiv);
  return card;
}

function formatNumber(n) {
  return n.toLocaleString();
}
