import { parseRp } from './formatters.js';

let choicesInstances = [];

export function initPlugins() {
  initSearchableDropdowns();
  initDatepickers();
  initMoneyInputs();
  initFileZones();
}

function initSearchableDropdowns() {
  if (typeof Choices === 'undefined') return;
  choicesInstances.forEach((instance) => instance.destroy());
  choicesInstances = [];
  document.querySelectorAll('.searchable-dropdown').forEach((el) => {
    choicesInstances.push(new Choices(el, {
      searchEnabled: true,
      searchPlaceholderValue: 'Cari...',
      itemSelectText: '',
      shouldSort: false,
    }));
  });
}

function initDatepickers() {
  if (typeof flatpickr === 'undefined') return;
  document.querySelectorAll('.datepicker').forEach((el) => {
    if (el._flatpickr) el._flatpickr.destroy();
    flatpickr(el, { dateFormat: 'd/m/Y', allowInput: true });
  });
}

function formatInputCurrency(input) {
  const raw = parseRp(input.value);
  input.value = raw ? new Intl.NumberFormat('id-ID').format(raw).replace(/^/, 'Rp ') : '';
}

function initMoneyInputs() {
  document.querySelectorAll('.format-uang, .calc-uang').forEach((input) => {
    if (input.dataset.currencyBound === 'true') return;
    input.dataset.currencyBound = 'true';
    input.addEventListener('keyup', () => formatInputCurrency(input));
    input.addEventListener('blur', () => formatInputCurrency(input));
  });
}

function initFileZones() {
  document.querySelectorAll('.file-drop-zone, .excel-drop-zone').forEach((zone) => {
    if (zone.dataset.bound === 'true') return;
    zone.dataset.bound = 'true';
    const input = zone.querySelector('input[type="file"]');
    if (!input) return;
    input.addEventListener('change', () => {
      const fileName = input.files?.[0]?.name || 'Pilih File';
      const textEl = zone.querySelector('p, h6');
      const iconEl = zone.querySelector('i');
      if (textEl) {
        textEl.innerText = fileName;
        textEl.style.color = input.files?.[0] ? 'var(--primary-color)' : 'var(--text-muted)';
      }
      if (iconEl) {
        iconEl.className = input.files?.[0] ? 'fa-solid fa-check-circle' : 'fa-solid fa-cloud-arrow-up';
        iconEl.style.color = input.files?.[0] ? 'var(--primary-color)' : 'var(--text-muted)';
      }
    });
  });
}
