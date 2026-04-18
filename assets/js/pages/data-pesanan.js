import { pesananRows } from '../data/mock-data.js';
import { rpFormatter } from '../core/tabulator-helpers.js';
import { createProductTable } from '../shared/product-table.js';

export function initDataPesananPage() {
  if (!document.getElementById('daftar-pesanan-grid') || typeof Tabulator === 'undefined') return;

  const table = new Tabulator('#daftar-pesanan-grid', {
    data: JSON.parse(JSON.stringify(pesananRows)),
    layout: 'fitColumns',
    pagination: 'local',
    paginationSize: 10,
    columns: [
      { title: 'No.', formatter: 'rownum', width: 60, hozAlign: 'center' },
      { title: 'No. PO', field: 'po', width: 130, cssClass: 'fw-bold text-primary' },
      { title: 'Instansi / Satuan Kerja', field: 'satker', minWidth: 250 },
      { title: 'Tanggal', field: 'tgl', width: 130 },
      { title: 'Nilai Kontrak', field: 'nilai', width: 180, formatter: rpFormatter, cssClass: 'fw-bold text-custom' },
      { title: 'Status', field: 'status', width: 140, formatter: (cell) => {
        const val = cell.getValue();
        const color = val === 'Selesai' ? 'success' : (val === 'Dikirim' ? 'primary' : 'warning');
        return `<span class="badge bg-${color}-subtle text-${color} border border-${color}">${val}</span>`;
      } },
      { title: 'Aksi', width: 180, hozAlign: 'center', headerSort: false, formatter: (cell) => {
        const po = cell.getRow().getData().po;
        return `<button class="btn btn-sm btn-info-subtle text-info border-info py-0 px-2 me-1 btn-view-data" data-po="${po}" data-bs-toggle="modal" data-bs-target="#viewModal" title="Lihat Ringkasan"><i class="fa-solid fa-eye"></i></button>
                <button class="btn btn-sm btn-custom-outline py-0 px-2 me-1 btn-edit-data" data-po="${po}" data-bs-toggle="modal" data-bs-target="#editModal" title="Edit Seluruh Data"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-primary py-0 px-2 btn-update-status" data-po="${po}" data-bs-toggle="modal" data-bs-target="#statusModal" title="Update Status Pengiriman"><i class="fa-solid fa-truck-fast"></i></button>`;
      } },
    ],
  });

  const searchInput = document.getElementById('search-pesanan');
  if (searchInput) {
    searchInput.addEventListener('keyup', function () {
      table.setFilter([[{ field: 'po', type: 'like', value: this.value }, { field: 'satker', type: 'like', value: this.value }]]);
    });
  }

  document.getElementById('daftar-pesanan-grid').addEventListener('click', (event) => {
    const statusBtn = event.target.closest('.btn-update-status');
    const viewBtn = event.target.closest('.btn-view-data');
    const editBtn = event.target.closest('.btn-edit-data');
    if (statusBtn) document.getElementById('modal-po-title').innerText = statusBtn.dataset.po;
    if (viewBtn) document.getElementById('view-po-title').innerText = viewBtn.dataset.po;
    if (editBtn) document.getElementById('edit-po-title').innerText = editBtn.dataset.po;
  });

  const editTable = createProductTable('#edit-product-grid');
  const editModal = document.getElementById('editModal');
  if (editModal) {
    editModal.addEventListener('shown.bs.modal', () => editTable?.redraw());
  }
  const addBtn = document.getElementById('edit-add-row-btn');
  if (addBtn && editTable) addBtn.addEventListener('click', () => editTable.addRow({}));
}
