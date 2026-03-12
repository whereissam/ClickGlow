// Weekly report panel
import { invoke, formatNumber, formatHour } from './utils.js';
import { renderWeeklyHourlyChart, renderWeeklyKeysChart } from './charts.js';

function getISOWeekString(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getWeekRange(isoWeek) {
  const [yearStr, weekStr] = isoWeek.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { start: monday.getTime(), end: sunday.getTime() };
}

export async function loadWeeklyPanel() {
  const select = document.getElementById('weekSelect');
  try {
    const weeks = await invoke('list_weekly_reports');
    select.textContent = '';

    if (weeks.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No reports yet';
      select.appendChild(opt);
      return;
    }

    weeks.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w;
      opt.textContent = w;
      select.appendChild(opt);
    });

    loadWeeklyReport(weeks[0]);
  } catch (e) {
    console.error('Failed to load weekly reports:', e);
  }
}

document.getElementById('weekSelect').addEventListener('change', (e) => {
  if (e.target.value) loadWeeklyReport(e.target.value);
});

document.getElementById('generateReportBtn').addEventListener('click', async () => {
  const now = new Date();
  const isoWeek = getISOWeekString(now);
  const { start, end } = getWeekRange(isoWeek);
  try {
    await invoke('generate_weekly_report', { isoWeek, startMs: start, endMs: end });
    await loadWeeklyPanel();
  } catch (e) {
    console.error('Failed to generate report:', e);
  }
});

async function loadWeeklyReport(isoWeek) {
  try {
    const report = await invoke('get_weekly_report', { isoWeek });
    if (!report) return;

    const container = document.getElementById('weeklyContent');
    container.textContent = '';

    // Stats row
    const statsDiv = document.createElement('div');
    statsDiv.className = 'weekly-stats';
    const statItems = [
      { value: formatNumber(report.total_clicks), label: 'Clicks', avg: `~${Math.round(report.avg_daily_clicks)}/day` },
      { value: formatNumber(report.total_moves), label: 'Mouse Moves', avg: '' },
      { value: formatNumber(report.total_keystrokes), label: 'Keystrokes', avg: `~${Math.round(report.avg_daily_keystrokes)}/day` },
    ];
    statItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'weekly-stat';
      const val = document.createElement('div');
      val.className = 'stat-value';
      val.textContent = item.value;
      const lbl = document.createElement('div');
      lbl.className = 'stat-label';
      lbl.textContent = item.label;
      card.appendChild(val);
      card.appendChild(lbl);
      if (item.avg) {
        const avg = document.createElement('div');
        avg.className = 'weekly-avg';
        avg.textContent = item.avg;
        card.appendChild(avg);
      }
      statsDiv.appendChild(card);
    });
    container.appendChild(statsDiv);

    // Extra info row
    const infoDiv = document.createElement('div');
    infoDiv.className = 'weekly-stats';
    const peakText = report.peak_hour != null ? formatHour(report.peak_hour) : '-';
    const infoItems = [
      { value: peakText, label: 'Peak Hour' },
      { value: report.top_key || '-', label: 'Top Key' },
      { value: `${report.top_keys?.length || 0}`, label: 'Unique Keys' },
    ];
    infoItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'weekly-stat';
      const val = document.createElement('div');
      val.className = 'stat-value';
      val.textContent = item.value;
      const lbl = document.createElement('div');
      lbl.className = 'stat-label';
      lbl.textContent = item.label;
      card.appendChild(val);
      card.appendChild(lbl);
      infoDiv.appendChild(card);
    });
    container.appendChild(infoDiv);

    // Charts row
    const chartsDiv = document.createElement('div');
    chartsDiv.className = 'weekly-charts';

    const hourlyCard = document.createElement('div');
    hourlyCard.className = 'weekly-chart-card';
    const hourlyTitle = document.createElement('h4');
    hourlyTitle.textContent = 'Hourly Activity';
    const hourlyChartEl = document.createElement('div');
    hourlyChartEl.id = 'weeklyHourlyChart';
    hourlyCard.appendChild(hourlyTitle);
    hourlyCard.appendChild(hourlyChartEl);
    chartsDiv.appendChild(hourlyCard);

    const keysCard = document.createElement('div');
    keysCard.className = 'weekly-chart-card';
    const keysTitle = document.createElement('h4');
    keysTitle.textContent = 'Top Keys';
    const keysChartEl = document.createElement('div');
    keysChartEl.id = 'weeklyKeysChart';
    keysCard.appendChild(keysTitle);
    keysCard.appendChild(keysChartEl);
    chartsDiv.appendChild(keysCard);

    container.appendChild(chartsDiv);

    setTimeout(() => {
      renderWeeklyHourlyChart(report.hourly || []);
      renderWeeklyKeysChart(report.top_keys || []);
    }, 50);
  } catch (e) {
    console.error('Failed to load weekly report:', e);
  }
}
