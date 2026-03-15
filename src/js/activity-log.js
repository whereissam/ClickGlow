// Activity log and category rules
import { invoke, getTimeRange } from './utils.js';

export async function loadActivityLog() {
  loadCategoryRules();
  const range = document.getElementById('logRange').value;
  const { start, end } = getTimeRange(range);
  try {
    const entries = await invoke('get_activity_log', { startMs: start, endMs: end, limit: 200 });
    const container = document.getElementById('logEntries');

    if (entries.length === 0) {
      container.textContent = '';
      const msg = document.createElement('div');
      msg.style.cssText = 'text-align:center;padding:24px;color:var(--text-secondary)';
      msg.textContent = 'No activity recorded yet. Use your apps and check back!';
      container.appendChild(msg);
      return;
    }

    container.textContent = '';
    for (const e of entries) {
      const row = document.createElement('div');
      row.className = 'log-entry';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'log-col-time';
      timeSpan.textContent = new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const appSpan = document.createElement('span');
      appSpan.className = 'log-col-app';
      appSpan.textContent = e.app_name;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'log-col-title';
      titleSpan.textContent = e.window_title || '—';
      titleSpan.title = e.window_title || '';

      const catSpan = document.createElement('span');
      catSpan.className = 'log-col-cat';
      const catBadge = document.createElement('span');
      catBadge.className = `log-cat ${e.category}`;
      catBadge.textContent = e.category;
      catSpan.appendChild(catBadge);

      const durSpan = document.createElement('span');
      durSpan.className = 'log-col-dur';
      const dur = e.duration_ms >= 60000
        ? Math.round(e.duration_ms / 60000) + 'm'
        : Math.round(e.duration_ms / 1000) + 's';
      durSpan.textContent = dur;

      row.appendChild(timeSpan);
      row.appendChild(appSpan);
      row.appendChild(titleSpan);
      row.appendChild(catSpan);
      row.appendChild(durSpan);
      container.appendChild(row);
    }
  } catch (e) {
    console.error('Failed to load activity log:', e);
  }
}

document.getElementById('logRange').addEventListener('change', loadActivityLog);

async function loadCategoryRules() {
  try {
    const appCats = await invoke('get_app_categories');
    const appList = document.getElementById('appRulesList');
    appList.textContent = '';
    for (const [name, cat] of appCats) {
      const row = document.createElement('div');
      row.className = 'rule-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'rule-name';
      nameSpan.textContent = name;

      const sel = document.createElement('select');
      for (const val of ['productive', 'neutral', 'distraction']) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val.charAt(0).toUpperCase() + val.slice(1);
        if (val === cat) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => updateAppCategory(name, sel.value));

      const delBtn = document.createElement('button');
      delBtn.className = 'rule-delete';
      delBtn.textContent = 'x';
      delBtn.addEventListener('click', () => removeAppCategory(name));

      row.appendChild(nameSpan);
      row.appendChild(sel);
      row.appendChild(delBtn);
      appList.appendChild(row);
    }

    const kwRules = await invoke('get_keyword_rules');
    const kwList = document.getElementById('keywordRulesList');
    kwList.textContent = '';
    for (const r of kwRules) {
      const row = document.createElement('div');
      row.className = 'rule-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'rule-name';
      nameSpan.textContent = r.keyword;

      const sel = document.createElement('select');
      for (const val of ['productive', 'neutral', 'distraction']) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val.charAt(0).toUpperCase() + val.slice(1);
        if (val === r.category) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => updateKeywordRule(r.keyword, sel.value));

      const delBtn = document.createElement('button');
      delBtn.className = 'rule-delete';
      delBtn.textContent = 'x';
      delBtn.addEventListener('click', () => removeKeywordRule(r.keyword));

      row.appendChild(nameSpan);
      row.appendChild(sel);
      row.appendChild(delBtn);
      kwList.appendChild(row);
    }
  } catch (e) {
    console.error('Failed to load rules:', e);
  }
}

async function updateAppCategory(appName, category) {
  try {
    await invoke('set_app_category', { appName, category });
  } catch (e) {
    console.error('Failed to update app category:', e);
  }
}

async function updateKeywordRule(keyword, category) {
  try {
    await invoke('set_keyword_rule', { keyword, category });
  } catch (e) {
    console.error('Failed to update keyword rule:', e);
  }
}

async function removeKeywordRule(keyword) {
  try {
    await invoke('delete_keyword_rule', { keyword });
    loadCategoryRules();
  } catch (e) {
    console.error('Failed to delete keyword rule:', e);
  }
}

async function removeAppCategory(appName) {
  try {
    await invoke('set_app_category', { appName, category: 'neutral' });
    loadCategoryRules();
  } catch (e) {
    console.error('Failed to remove app category:', e);
  }
}

document.getElementById('addAppRuleBtn').addEventListener('click', async () => {
  const input = document.getElementById('newAppName');
  const appName = input.value.trim();
  if (!appName) return;
  const category = document.getElementById('newAppCat').value;
  try {
    await invoke('set_app_category', { appName, category });
    input.value = '';
    loadCategoryRules();
  } catch (e) {
    console.error('Failed to add app rule:', e);
  }
});

document.getElementById('addKeywordBtn').addEventListener('click', async () => {
  const input = document.getElementById('newKeyword');
  const keyword = input.value.trim().toLowerCase();
  if (!keyword) return;
  const category = document.getElementById('newKeywordCat').value;
  try {
    await invoke('set_keyword_rule', { keyword, category });
    input.value = '';
    loadCategoryRules();
  } catch (e) {
    console.error('Failed to add keyword rule:', e);
  }
});
