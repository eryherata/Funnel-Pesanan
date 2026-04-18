import { formatRp } from './formatters.js';

export const rpFormatter = (cell) => formatRp(cell.getValue() || 0);
export const pctFormatter = (cell) => `${cell.getValue() || 0}%`;

export function createCurrencyEditor() {
  return function currencyEditor(cell, onRendered, success, cancel) {
    const input = document.createElement('input');
    input.type = 'text';
    input.style.textAlign = 'right';
    input.value = cell.getValue() ? new Intl.NumberFormat('id-ID').format(cell.getValue()) : '';
    onRendered(() => { input.focus(); input.select(); });
    input.addEventListener('keyup', () => {
      const raw = input.value.replace(/\D/g, '');
      input.value = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    });
    input.addEventListener('blur', () => success(parseInt(input.value.replace(/\D/g, ''), 10) || 0));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') success(parseInt(input.value.replace(/\D/g, ''), 10) || 0);
      if (event.key === 'Escape') cancel();
    });
    return input;
  };
}

export function createPercentEditor() {
  return function percentEditor(cell, onRendered, success, cancel) {
    const input = document.createElement('input');
    input.type = 'text';
    input.style.textAlign = 'center';
    input.value = cell.getValue() || 0;
    onRendered(() => { input.focus(); input.select(); });
    input.addEventListener('keyup', () => { input.value = input.value.replace(/[^0-9.]/g, ''); });
    input.addEventListener('blur', () => success(parseFloat(input.value) || 0));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') success(parseFloat(input.value) || 0);
      if (event.key === 'Escape') cancel();
    });
    return input;
  };
}

export function createQtyEditor() {
  return function qtyEditor(cell, onRendered, success, cancel) {
    const input = document.createElement('input');
    input.type = 'text';
    input.style.textAlign = 'center';
    input.value = cell.getValue() || 1;
    onRendered(() => { input.focus(); input.select(); });
    input.addEventListener('keyup', () => { input.value = input.value.replace(/\D/g, ''); });
    input.addEventListener('blur', () => success(parseInt(input.value, 10) || 1));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') success(parseInt(input.value, 10) || 1);
      if (event.key === 'Escape') cancel();
    });
    return input;
  };
}
