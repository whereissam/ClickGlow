// Shared utilities and helpers
export const { invoke } = window.__TAURI__.core;

// --- Toast notification ---
export function showToast(message, isError = false) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding:10px 16px;border-radius:10px;font-size:0.8rem;font-weight:600;
    color:#fff;max-width:320px;word-break:break-all;
    animation:toastIn 0.3s ease;
    background:${isError ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#22c55e,#16a34a)'};
    box-shadow:0 4px 12px rgba(0,0,0,0.3);
  `;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Time range state ---
export let currentTimeRange = 'today';

export function setTimeRange(val) {
  currentTimeRange = val;
}

// --- Time range helpers ---
export function getTimeRange(range) {
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  switch (range) {
    case 'today':
      return { start: startOfDay.getTime(), end: now };
    case 'week': {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - d.getDay());
      return { start: d.getTime(), end: now };
    }
    case 'month': {
      const d = new Date(startOfDay);
      d.setDate(1);
      return { start: d.getTime(), end: now };
    }
    default:
      return { start: startOfDay.getTime(), end: now };
  }
}

export function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return h + ' AM';
  if (h === 12) return '12 PM';
  return (h - 12) + ' PM';
}
