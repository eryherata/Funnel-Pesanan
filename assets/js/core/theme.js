const listeners = new Set();

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
}

export function onThemeChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify(theme) {
  listeners.forEach((callback) => callback(theme));
  document.dispatchEvent(new CustomEvent('app:theme-changed', { detail: { theme } }));
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
  notify(theme);
}

export function initTheme() {
  applyTheme(getTheme());
  const themeToggleBtn = document.getElementById('themeToggle');
  if (!themeToggleBtn || themeToggleBtn.dataset.bound === 'true') return;
  themeToggleBtn.dataset.bound = 'true';
  themeToggleBtn.addEventListener('click', () => {
    applyTheme(getTheme() === 'light' ? 'dark' : 'light');
  });
}
