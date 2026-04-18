import { createProductTable, updateSummaryCards } from '../shared/product-table.js';

export function initInputPesananPage() {
  if (!document.getElementById('product-grid')) return;
  const table = createProductTable('#product-grid');
  if (!table) return;
  table.on('dataChanged', () => updateSummaryCards(table));
  table.on('cellEdited', () => updateSummaryCards(table));
  table.on('rowDeleted', () => updateSummaryCards(table));
  document.getElementById('add-row-btn')?.addEventListener('click', () => table.addRow({}));
  document.getElementById('save-data-btn')?.addEventListener('click', () => {
    alert('Data pesanan berhasil disimpan (demo).');
  });
  updateSummaryCards(table);
}
