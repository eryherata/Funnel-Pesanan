import { masterProdukRows, masterMitraRows, masterSatkerRows } from '../data/mock-data.js';

export function initDatabaseMasterPage() {
  if (typeof Tabulator === 'undefined' || !document.getElementById('master-produk-grid')) return;

  const produkTable = new Tabulator('#master-produk-grid', {
    data: JSON.parse(JSON.stringify(masterProdukRows)),
    layout: 'fitColumns',
    columns: [
      { title: 'Kode', field: 'kode', width: 120, editor: 'input' },
      { title: 'Nama Produk', field: 'nama', minWidth: 250, editor: 'input' },
      { title: 'Kategori', field: 'kategori', width: 150, editor: 'input' },
      { title: 'Principal', field: 'principal', width: 150, editor: 'input' },
      { title: 'Aksi', formatter: () => "<button class='btn btn-sm btn-custom-outline py-0'><i class='fa-solid fa-trash text-danger'></i></button>", width: 80, hozAlign: 'center', cellClick: (e, cell) => cell.getRow().delete() },
    ],
  });
  const mitraTable = new Tabulator('#master-mitra-grid', {
    data: JSON.parse(JSON.stringify(masterMitraRows)),
    layout: 'fitColumns',
    columns: [
      { title: 'Tipe Mitra', field: 'tipe', width: 150, editor: 'list', editorParams: { values: ['Pelaksana', 'Distributor', 'Pemasok'] } },
      { title: 'Nama Perusahaan', field: 'nama', minWidth: 250, editor: 'input' },
      { title: 'Kontak / PIC', field: 'kontak', minWidth: 200, editor: 'input' },
      { title: 'Aksi', formatter: () => "<button class='btn btn-sm btn-custom-outline py-0'><i class='fa-solid fa-trash text-danger'></i></button>", width: 80, hozAlign: 'center', cellClick: (e, cell) => cell.getRow().delete() },
    ],
  });
  const satkerTable = new Tabulator('#master-satker-grid', {
    data: JSON.parse(JSON.stringify(masterSatkerRows)),
    layout: 'fitColumns',
    columns: [
      { title: 'Wilayah', field: 'wilayah', width: 150, editor: 'input' },
      { title: 'Nama Instansi / Satker', field: 'instansi', minWidth: 250, editor: 'input' },
      { title: 'Alamat Lengkap', field: 'alamat', minWidth: 250, editor: 'input' },
      { title: 'Aksi', formatter: () => "<button class='btn btn-sm btn-custom-outline py-0'><i class='fa-solid fa-trash text-danger'></i></button>", width: 80, hozAlign: 'center', cellClick: (e, cell) => cell.getRow().delete() },
    ],
  });

  document.getElementById('btn-add-produk')?.addEventListener('click', () => produkTable.addRow({}));
  document.getElementById('btn-add-mitra')?.addEventListener('click', () => mitraTable.addRow({}));
  document.getElementById('btn-add-satker')?.addEventListener('click', () => satkerTable.addRow({}));
  document.querySelectorAll('button[data-bs-toggle="tab"]').forEach((tab) => {
    tab.addEventListener('shown.bs.tab', () => {
      produkTable.redraw();
      mitraTable.redraw();
      satkerTable.redraw();
    });
  });
}
