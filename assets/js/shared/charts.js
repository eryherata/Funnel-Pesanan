import { getTheme, onThemeChange } from '../core/theme.js';

const registry = new Map();

function colors() {
  const dark = getTheme() === 'dark';
  return {
    grid: dark ? '#222834' : '#e3ebf6',
    tick: dark ? '#b3c0d1' : '#5e6e82',
  };
}

export function createManagedChart(key, canvasId, factory) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return null;
  if (registry.has(key)) registry.get(key).destroy();
  const instance = factory(canvas.getContext('2d'), colors());
  registry.set(key, instance);
  return instance;
}

onThemeChange(() => {
  registry.forEach((chart) => chart.destroy());
  registry.clear();
  document.dispatchEvent(new CustomEvent('app:charts-refresh'));
});
