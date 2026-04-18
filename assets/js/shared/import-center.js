(function (window, document) {
  'use strict';

  const bridge = () => window.DataSystemBridge || null;
  const authUi = () => window.DataSystemAuthUi || null;
  const feedback = () => window.DataSystemFeedback || null;

  const LOCAL_TEMPLATE_MAP = {
    orders: {
      filename: 'template-import-orders.csv',
      columns: [
        'po_number', 'po_date', 'kode_rup', 'wilayah', 'kabkota', 'instansi', 'satker', 'nama_pengadaan',
        'principal', 'pemasok', 'distributor', 'pelaksana', 'pic', 'penggarap', 'brutto', 'netto', 'negosiasi',
        'status_pesanan', 'status_pengiriman', 'prioritas', 'no_resi', 'tgl_aktual_dikirim', 'tgl_aktual_diterima', 'nama_penerima'
      ],
      sampleRows: [
        {
          po_number: 'PO-2026-001', po_date: '2026-04-18', kode_rup: 'RUP-778899', wilayah: 'Jawa Timur', kabkota: 'Kota Surabaya',
          instansi: 'Dinas Kesehatan', satker: 'UPTD Gudang Farmasi', nama_pengadaan: 'Pengadaan Alat Kesehatan Tahap 1', principal: 'Principal A',
          pemasok: 'PT Pemasok Sejahtera', distributor: 'PT Distributor Nusantara', pelaksana: 'PT Pelaksana Utama', pic: 'Dery', penggarap: 'Tim Surabaya',
          brutto: 150000000, netto: 140000000, negosiasi: 5000000, status_pesanan: 'Diproses', status_pengiriman: 'Penyiapan', prioritas: 'Normal',
          no_resi: '', tgl_aktual_dikirim: '', tgl_aktual_diterima: '', nama_penerima: ''
        }
      ],
      guidance: ['Satu baris = satu nomor PO.', 'Format tanggal: YYYY-MM-DD.']
    },
    order_items: {
      filename: 'template-import-order-items.csv',
      columns: ['po_number', 'sku', 'nama_produk', 'kategori', 'qty', 'satuan', 'harga_satuan', 'diskon', 'subtotal', 'catatan'],
      sampleRows: [
        {
          po_number: 'PO-2026-001', sku: 'SKU-ALKES-001', nama_produk: 'Tensimeter Digital', kategori: 'Alkes', qty: 50,
          satuan: 'Unit', harga_satuan: 1250000, diskon: 0, subtotal: 62500000, catatan: 'Item contoh untuk import massal'
        }
      ],
      guidance: ['Gunakan po_number yang sama untuk mengelompokkan item ke order yang sama.', 'qty, harga_satuan, diskon, dan subtotal diisi angka tanpa pemisah ribuan.']
    },
    funnels: {
      filename: 'template-import-funnels.csv',
      columns: [
        'id', 'kode_rup', 'nama_pengadaan', 'wilayah', 'kabkota', 'instansi', 'satker', 'sumber_peluang',
        'principal', 'pemasok', 'distributor', 'pelaksana', 'pic_omset', 'penggarap', 'stage', 'status', 'priority',
        'probability', 'target_closing', 'follow_up_date', 'next_action', 'estimasi_brutto', 'estimasi_netto', 'estimasi_negosiasi'
      ],
      sampleRows: [
        {
          id: 'FUN-2026-001', kode_rup: 'RUP-112233', nama_pengadaan: 'Pengadaan Perangkat Jaringan', wilayah: 'Jawa Barat', kabkota: 'Kota Bandung',
          instansi: 'Diskominfo', satker: 'Bidang Infrastruktur', sumber_peluang: 'E-Katalog', principal: 'Principal B', pemasok: 'PT Jaringan Prima',
          distributor: 'PT Distribusi Bandung', pelaksana: 'PT Implementasi Nusantara', pic_omset: 'Ayu', penggarap: 'Tim Bandung', stage: 'Negosiasi',
          status: 'Aktif', priority: 'Tinggi', probability: 65, target_closing: '2026-05-20', follow_up_date: '2026-04-25', next_action: 'Follow up negosiasi harga',
          estimasi_brutto: 320000000, estimasi_netto: 295000000, estimasi_negosiasi: 15000000
        }
      ],
      guidance: ['ID funnel harus unik.', 'Probability diisi 0-100.']
    },
    locations: {
      filename: 'template-import-master-lokasi.csv',
      columns: ['wilayah', 'kabkota', 'instansi', 'satker', 'aliases_text'],
      sampleRows: [{ wilayah: 'Jawa Timur', kabkota: 'Kota Surabaya', instansi: 'Dinas Kesehatan', satker: 'UPTD Gudang Farmasi', aliases_text: 'Surabaya, Kota SBY' }],
      guidance: ['Pisahkan alias dengan koma.']
    },
    principals: {
      filename: 'template-import-master-principal.csv',
      columns: ['principal_code', 'principal_name', 'category', 'aliases_text'],
      sampleRows: [{ principal_code: 'PRN-001', principal_name: 'Principal A', category: 'Alkes', aliases_text: 'PT Principal A, Principal-A' }],
      guidance: ['Kode principal opsional.']
    },
    partners: {
      filename: 'template-import-master-mitra.csv',
      columns: ['partner_name', 'partner_type', 'principal_name', 'wilayah', 'kabkota', 'contact_name', 'contact_phone', 'aliases_text'],
      sampleRows: [{ partner_name: 'PT Distribusi Nusantara', partner_type: 'Distributor', principal_name: 'Principal A', wilayah: 'Jawa Timur', kabkota: 'Kota Surabaya', contact_name: 'Budi', contact_phone: '08123456789', aliases_text: 'Distribusi Nusantara, PT DN' }],
      guidance: ['Partner Type: Pemasok, Distributor, atau Pelaksana.']
    },
    owners: {
      filename: 'template-import-master-owner.csv',
      columns: ['owner_name', 'owner_role', 'team_name', 'wilayah', 'email', 'phone', 'aliases_text'],
      sampleRows: [{ owner_name: 'Dery Yonata', owner_role: 'PIC Omset', team_name: 'Tim Surabaya', wilayah: 'Jawa Timur', email: 'dery@example.com', phone: '08129876543', aliases_text: 'Pak Dery, D Yonata' }],
      guidance: ['Gunakan email kerja bila tersedia.']
    }
  };

  function isPage(name) {
    return (location.pathname.split('/').pop() || '').toLowerCase() === String(name || '').toLowerCase();
  }

  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (resolve, reject) {
      const existing = document.getElementById('ds-xlsx-loader');
      if (existing) {
        existing.addEventListener('load', function () { resolve(window.XLSX); }, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = 'ds-xlsx-loader';
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = function () { resolve(window.XLSX); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function csvToRows(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quote = false;
    const pushCell = function () {
      row.push(cell);
      cell = '';
    };
    const pushRow = function () {
      if (row.length || cell.length) pushCell();
      if (row.some(function (item) { return String(item || '').trim() !== ''; })) rows.push(row);
      row = [];
    };
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];
      if (quote) {
        if (ch === '"' && next === '"') {
          cell += '"';
          i += 1;
        } else if (ch === '"') {
          quote = false;
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        quote = true;
      } else if (ch === ',') {
        pushCell();
      } else if (ch === '\n') {
        pushRow();
      } else if (ch !== '\r') {
        cell += ch;
      }
    }
    pushRow();
    return rows;
  }

  function normalizeHeader(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  const HEADER_MAP = {
    orders: {
      po: 'po_number', nomor_po: 'po_number', po_number: 'po_number', no_po: 'po_number',
      po_date: 'po_date', tanggal_po: 'po_date', kode_rup: 'kode_rup', rup: 'kode_rup',
      wilayah: 'wilayah', kabkota: 'kabkota', kabupaten_kota: 'kabkota', kota: 'kabkota',
      instansi: 'instansi', satker: 'satker', nama_pengadaan: 'nama_pengadaan', pengadaan: 'nama_pengadaan',
      principal: 'principal', pemasok: 'pemasok', distributor: 'distributor', pelaksana: 'pelaksana',
      pic: 'pic', pic_omset: 'pic', penggarap: 'penggarap',
      brutto: 'brutto', netto: 'netto', negosiasi: 'negosiasi',
      status_pesanan: 'status_pesanan', status: 'status_pesanan', status_pengiriman: 'status_pengiriman',
      prioritas: 'prioritas', priority: 'prioritas', no_resi: 'no_resi', resi: 'no_resi',
      tgl_aktual_dikirim: 'tgl_aktual_dikirim', tgl_aktual_diterima: 'tgl_aktual_diterima', nama_penerima: 'nama_penerima'
    },
    funnels: {
      id: 'id', kode_rup: 'kode_rup', nama_pengadaan: 'nama_pengadaan', pengadaan: 'nama_pengadaan',
      wilayah: 'wilayah', kabkota: 'kabkota', kabupaten_kota: 'kabkota', instansi: 'instansi', satker: 'satker',
      sumber_peluang: 'sumber_peluang', principal: 'principal', pemasok: 'pemasok', distributor: 'distributor', pelaksana: 'pelaksana',
      pic_omset: 'pic_omset', penggarap: 'penggarap', stage: 'stage', tahap: 'stage', status: 'status', priority: 'priority', prioritas: 'priority',
      probability: 'probability', target_closing: 'target_closing', follow_up_date: 'follow_up_date', next_action: 'next_action',
      estimasi_brutto: 'estimasi_brutto', estimasi_netto: 'estimasi_netto', estimasi_negosiasi: 'estimasi_negosiasi'
    },
    locations: {
      wilayah: 'wilayah', kabkota: 'kabkota', kabupaten_kota: 'kabkota', instansi: 'instansi', satker: 'satker', alias: 'aliases_text', alias_lokasi: 'aliases_text'
    },
    principals: {
      principal_name: 'principal_name', nama_principal: 'principal_name', principal: 'principal_name', principal_code: 'principal_code', code: 'principal_code', category: 'category', alias: 'aliases_text'
    },
    partners: {
      partner_name: 'partner_name', nama_mitra: 'partner_name', partner: 'partner_name', partner_type: 'partner_type', tipe_mitra: 'partner_type', principal_name: 'principal_name', wilayah: 'wilayah', kabkota: 'kabkota', contact_name: 'contact_name', contact_phone: 'contact_phone', alias: 'aliases_text'
    },
    owners: {
      owner_name: 'owner_name', nama_owner: 'owner_name', owner_role: 'owner_role', role: 'owner_role', team_name: 'team_name', wilayah: 'wilayah', email: 'email', phone: 'phone', alias: 'aliases_text'
    }
  };

  function remapRows(tableRows, target) {
    const rows = Array.isArray(tableRows) ? tableRows : [];
    if (!rows.length) return [];
    const headers = rows[0].map(normalizeHeader);
    const mapping = HEADER_MAP[target] || {};
    return rows.slice(1).map(function (cells) {
      const out = {};
      headers.forEach(function (header, index) {
        const key = mapping[header] || header;
        let value = cells[index];
        if (value == null) value = '';
        if (typeof value === 'string') value = value.trim();
        if (value === '') return;
        out[key] = value;
      });
      return out;
    }).filter(function (row) { return Object.keys(row).length; });
  }

  async function fileToRows(file) {
    const name = String(file?.name || '').toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const XLSX = await ensureXlsx();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    }
    const text = await file.text();
    return csvToRows(text);
  }

  function csvEscape(value) {
    const raw = String(value == null ? '' : value);
    if (/[",\n]/.test(raw)) return '"' + raw.replace(/"/g, '""') + '"';
    return raw;
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function buildTemplateCsv(target, template) {
    const spec = template || LOCAL_TEMPLATE_MAP[target] || null;
    if (!spec) return null;
    const lines = [];
    lines.push((spec.columns || []).join(','));
    (spec.sampleRows || []).forEach(function (row) {
      lines.push((spec.columns || []).map(function (column) { return csvEscape(row?.[column] || ''); }).join(','));
    });
    return lines.join('\n');
  }

  async function fetchTemplate(target) {
    try {
      const serverTemplate = await bridge()?.getImportTemplate?.(target);
      if (serverTemplate) return serverTemplate;
    } catch (_error) {}
    return LOCAL_TEMPLATE_MAP[target] || null;
  }

  async function downloadTemplate(target) {
    const template = await fetchTemplate(target);
    if (!template) return feedback()?.alert?.('Template untuk target ini belum tersedia.', { title: 'Template belum tersedia', variant: 'warning' });
    const csv = buildTemplateCsv(target, template);
    downloadBlob(template.filename || ('template-' + target + '.csv'), new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }

  async function exportServerBackup() {
    const allowed = authUi()?.can?.('backups', 'export');
    if (allowed === false) return feedback()?.alert?.('Role saat ini tidak punya izin export backup backend.', { title: 'Akses ditolak', variant: 'warning' });
    try {
      const bundle = await bridge()?.exportServerBackup?.();
      if (!bundle) return feedback()?.alert?.('Backup backend gagal dibuat.', { title: 'Backup gagal', variant: 'danger' });
      downloadBlob('pantauan-pesanan-backend-backup-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json', new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
    } catch (error) {
      feedback()?.alert?.(error?.message || 'Backup backend gagal.', { title: 'Backup gagal', variant: 'danger' });
    }
  }

  async function restoreServerBackupFile(file) {
    const allowed = authUi()?.can?.('backups', 'restore');
    if (allowed === false) return feedback()?.alert?.('Role saat ini tidak punya izin restore backup backend.', { title: 'Akses ditolak', variant: 'warning' });
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const mode = await feedback()?.choose?.('Pilih mode restore backend yang akan digunakan.', {
        title: 'Mode restore backend',
        variant: 'warning',
        confirmText: 'Gunakan mode ini',
        choices: [
          { value: 'merge', label: 'Merge', description: 'Menggabungkan bundle ke data server yang sudah ada.' },
          { value: 'replace', label: 'Replace', description: 'Menimpa data server secara penuh dengan bundle backup.' }
        ],
        defaultValue: 'merge'
      });
      if (!['merge', 'replace'].includes(mode)) return;
      const warnText = mode === 'replace'
        ? 'Restore replace akan menimpa data server secara penuh. Lanjutkan?'
        : 'Restore merge akan menggabungkan bundle ke data server yang sudah ada. Lanjutkan?';
      const proceed = await feedback()?.confirm?.(warnText, {
        title: 'Konfirmasi restore backend',
        variant: mode === 'replace' ? 'danger' : 'warning',
        confirmText: mode === 'replace' ? 'Ya, replace' : 'Ya, merge',
        cancelText: 'Batal'
      });
      if (!proceed) return;
      await bridge()?.restoreServerBackup?.(bundle, { mode: mode });
      feedback()?.toast?.('Restore backend selesai dengan mode ' + mode + '. Halaman akan dimuat ulang.', 'success');
      setTimeout(function () { window.DataSystemNavigation?.reloadPage?.() || window.location.reload(); }, 700);
    } catch (error) {
      feedback()?.alert?.(error?.message || 'Restore backend gagal.', { title: 'Restore gagal', variant: 'danger' });
    }
  }

  function ensureHiddenFileInput(id, accept, onChange) {
    let input = document.getElementById(id);
    if (input) return input;
    input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.id = id;
    input.hidden = true;
    input.addEventListener('change', function (event) {
      const file = event.target.files?.[0];
      if (file) onChange(file);
      event.target.value = '';
    });
    document.body.appendChild(input);
    return input;
  }

  function ensureModal() {
    let modal = document.getElementById('ds-import-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'ds-import-modal';
    modal.tabIndex = -1;
    modal.innerHTML = [
      '<div class="modal-dialog modal-xl modal-dialog-centered">',
      '  <div class="modal-content">',
      '    <div class="modal-header">',
      '      <h5 class="modal-title"><i class="fa-solid fa-file-import me-2 text-primary"></i>Import CSV / Excel</h5>',
      '      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>',
      '    </div>',
      '    <div class="modal-body">',
      '      <div class="row g-3 mb-3">',
      '        <div class="col-md-4"><label class="form-label">Target Import</label><select class="form-select" id="ds-import-target"></select></div>',
      '        <div class="col-md-5"><label class="form-label">File</label><input type="file" class="form-control" id="ds-import-file" accept=".csv,.xlsx,.xls"></div>',
      '        <div class="col-md-3"><label class="form-label">Aksi Cepat</label><div class="d-grid gap-2"><button type="button" class="btn btn-outline-secondary" id="ds-import-template"><i class="fa-solid fa-download me-2"></i>Download Template</button></div></div>',
      '      </div>',
      '      <div class="row g-3 mb-3">',
      '        <div class="col-lg-5">',
      '          <div class="border rounded-3 p-3 h-100 bg-light-subtle">',
      '            <div class="fw-semibold mb-2">Template Resmi</div>',
      '            <div class="small text-muted mb-2" id="ds-import-template-guidance">Pilih target untuk melihat struktur import resmi.</div>',
      '            <div class="small"><strong>Kolom:</strong></div>',
      '            <div class="small text-muted" id="ds-import-columns">-</div>',
      '          </div>',
      '        </div>',
      '        <div class="col-lg-7">',
      '          <div class="border rounded-3 p-3 h-100">',
      '            <div class="d-flex flex-wrap align-items-center gap-3 mb-2">',
      '              <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="ds-import-dryrun" checked><label class="form-check-label" for="ds-import-dryrun">Preview dulu (dry run)</label></div>',
      '              <div class="small text-muted">Validasi import sekarang lebih ketat per kolom.</div>',
      '            </div>',
      '            <div class="alert alert-secondary mb-2" id="ds-import-result">Pilih file CSV/XLSX lalu klik Preview.</div>',
      '            <div class="small text-muted" id="ds-import-summary">Header file akan dipetakan otomatis ke field umum. Format xlsx memakai sheet pertama.</div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="modal-footer">',
      '      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Tutup</button>',
      '      <button type="button" class="btn btn-outline-primary" id="ds-import-preview">Preview</button>',
      '      <button type="button" class="btn btn-primary" id="ds-import-submit">Import</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
    return modal;
  }

  function getTargetsForPage() {
    if (isPage('data-pesanan.html')) return [{ value: 'orders', label: 'Orders / Pesanan' }];
    if (isPage('funnel-daftar.html')) return [{ value: 'funnels', label: 'Funnels / Pipeline' }];
    if (isPage('database-master.html')) return [
      { value: 'locations', label: 'Master Lokasi' },
      { value: 'principals', label: 'Master Principal' },
      { value: 'partners', label: 'Master Mitra / Vendor' },
      { value: 'owners', label: 'Master PIC / Penggarap' }
    ];
    return [{ value: 'orders', label: 'Orders / Pesanan' }];
  }

  async function refreshTemplateInfo(target) {
    const modal = ensureModal();
    const guidanceNode = modal.querySelector('#ds-import-template-guidance');
    const columnsNode = modal.querySelector('#ds-import-columns');
    const template = await fetchTemplate(target);
    const guidance = Array.isArray(template?.guidance) ? template.guidance.join(' • ') : 'Gunakan template resmi agar validasi lebih lancar.';
    guidanceNode.textContent = guidance;
    columnsNode.textContent = Array.isArray(template?.columns) && template.columns.length ? template.columns.join(', ') : '-';
  }

  function openImportModal(defaultTarget) {
    const modal = ensureModal();
    const select = modal.querySelector('#ds-import-target');
    const targets = getTargetsForPage();
    select.innerHTML = targets.map(function (item) { return '<option value="' + item.value + '">' + item.label + '</option>'; }).join('');
    select.value = defaultTarget || targets[0].value;
    modal.querySelector('#ds-import-file').value = '';
    modal.querySelector('#ds-import-dryrun').checked = true;
    modal.querySelector('#ds-import-result').className = 'alert alert-secondary mb-2';
    modal.querySelector('#ds-import-result').textContent = 'Pilih file CSV/XLSX lalu klik Preview.';
    modal.querySelector('#ds-import-summary').textContent = 'Header file akan dipetakan otomatis ke field umum. Format xlsx memakai sheet pertama.';
    refreshTemplateInfo(select.value);
    if (window.bootstrap?.Modal) {
      const instance = bootstrap.Modal.getOrCreateInstance(modal);
      instance.show();
    } else {
      modal.style.display = 'block';
    }
  }

  function renderImportResult(resultNode, summaryNode, rows, tableRows, response, dryRun) {
    const errors = Array.isArray(response?.errors) ? response.errors : [];
    const warnings = Array.isArray(response?.warnings) ? response.warnings : [];
    const normalizedPreview = Array.isArray(response?.normalizedPreview) ? response.normalizedPreview : [];
    resultNode.className = 'alert ' + (errors.length ? 'alert-warning' : warnings.length ? 'alert-info' : 'alert-success') + ' mb-2';
    resultNode.innerHTML = [
      '<div class="fw-semibold mb-1">' + (dryRun ? 'Preview import selesai' : 'Import selesai') + '</div>',
      '<div class="small">Rows file: ' + Math.max((tableRows?.length || 1) - 1, 0) + ' • Rows terbaca: ' + rows.length + ' • Imported: ' + (response?.imported || 0) + ' • Errors: ' + errors.length + ' • Warnings: ' + warnings.length + '</div>',
      errors.length ? '<div class="small mt-2"><strong>Error:</strong> ' + errors.slice(0, 6).map(function (item) { return 'Baris ' + (item.row || '?') + ' [' + (item.field || '-') + '] ' + item.message; }).join(' | ') + '</div>' : '',
      warnings.length ? '<div class="small mt-2"><strong>Warning:</strong> ' + warnings.slice(0, 6).map(function (item) { return 'Baris ' + (item.row || '?') + ' [' + (item.field || '-') + '] ' + item.message; }).join(' | ') + '</div>' : ''
    ].join('');
    summaryNode.innerHTML = [
      '<div class="small text-muted mb-1">Contoh normalisasi baris (maks. 3):</div>',
      normalizedPreview.length
        ? '<pre class="small mb-0" style="max-height:160px; overflow:auto; white-space:pre-wrap;">' + String(JSON.stringify(normalizedPreview.slice(0, 3), null, 2)).replace(/[<>&]/g, function (ch) { return ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[ch]; }) + '</pre>'
        : '<div class="small text-muted">Belum ada preview baris.</div>'
    ].join('');
  }

  async function handleImport(isPreview) {
    const modal = ensureModal();
    const file = modal.querySelector('#ds-import-file').files?.[0];
    const target = modal.querySelector('#ds-import-target').value;
    const result = modal.querySelector('#ds-import-result');
    const summary = modal.querySelector('#ds-import-summary');
    const dryRun = isPreview ? true : Boolean(modal.querySelector('#ds-import-dryrun').checked);
    if (!file) return feedback()?.alert?.('Pilih file terlebih dahulu.', { title: 'File belum dipilih', variant: 'warning' });
    try {
      result.className = 'alert alert-info mb-2';
      result.textContent = 'Memproses file...';
      summary.textContent = 'Sistem sedang membaca file dan menjalankan validasi per kolom.';
      const tableRows = await fileToRows(file);
      const rows = remapRows(tableRows, target);
      if (!rows.length) throw new Error('Tidak ada baris valid yang bisa diimport. Pastikan header sesuai template.');
      const response = await bridge()?.importRows?.(target, rows, { dryRun: dryRun });
      renderImportResult(result, summary, rows, tableRows, response || {}, dryRun);
      if (!dryRun) {
        if (target === 'orders') await bridge()?.refreshCollection?.('orders');
        if (target === 'funnels') await bridge()?.refreshCollection?.('funnels');
        if (['locations', 'principals', 'partners', 'owners'].includes(target)) await bridge()?.getMastersBootstrap?.();
      }
    } catch (error) {
      const payloadErrors = Array.isArray(error?.payload?.errors) ? error.payload.errors : [];
      const payloadWarnings = Array.isArray(error?.payload?.warnings) ? error.payload.warnings : [];
      result.className = 'alert alert-danger mb-2';
      result.innerHTML = [
        '<div class="fw-semibold mb-1">Import gagal</div>',
        '<div class="small">' + (error?.message || 'Import gagal.') + '</div>',
        payloadErrors.length ? '<div class="small mt-2"><strong>Error:</strong> ' + payloadErrors.slice(0, 6).map(function (item) { return 'Baris ' + (item.row || '?') + ' [' + (item.field || '-') + '] ' + item.message; }).join(' | ') + '</div>' : '',
        payloadWarnings.length ? '<div class="small mt-2"><strong>Warning:</strong> ' + payloadWarnings.slice(0, 6).map(function (item) { return 'Baris ' + (item.row || '?') + ' [' + (item.field || '-') + '] ' + item.message; }).join(' | ') + '</div>' : ''
      ].join('');
      summary.textContent = 'Gunakan template resmi untuk memastikan nama kolom dan tipe data sesuai.';
    }
  }

  function addButton(container, id, label, className, icon, onClick, attrs) {
    if (!container || document.getElementById(id)) return null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.className = className;
    btn.innerHTML = '<i class="fa-solid ' + icon + ' me-2"></i>' + label;
    Object.entries(attrs || {}).forEach(function (entry) { btn.setAttribute(entry[0], entry[1]); });
    btn.addEventListener('click', onClick);
    container.appendChild(btn);
    return btn;
  }

  function wireDataPesananTools() {
    const toolbar = document.querySelector('.page-toolbar-inline .d-flex.flex-wrap.gap-2.ms-auto');
    addButton(toolbar, 'btnOrdersImportExcel', 'Import CSV/Excel', 'btn btn-outline-success bg-surface', 'fa-file-import', function () { openImportModal('orders'); }, { 'data-permission-module': 'orders', 'data-permission-action': 'import' });
    addButton(toolbar, 'btnOrdersTemplate', 'Template CSV', 'btn btn-outline-secondary bg-surface', 'fa-download', function () { downloadTemplate('orders'); }, { 'data-permission-module': 'orders', 'data-permission-action': 'import' });
    addButton(toolbar, 'btnServerBackupOrders', 'Backup Server', 'btn btn-outline-secondary bg-surface', 'fa-database', exportServerBackup, { 'data-permission-module': 'backups', 'data-permission-action': 'export' });
  }

  function wireFunnelTools() {
    const toolbar = Array.from(document.querySelectorAll('.phoenix-card .card-header-custom')).find(function (node) {
      return /Semua Funnel/i.test(node.textContent || '');
    });
    if (!toolbar) return;
    let actions = toolbar.querySelector('.ds-funnel-tools');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'd-flex flex-wrap gap-2 ds-funnel-tools';
      toolbar.appendChild(actions);
    }
    addButton(actions, 'btnFunnelsImportExcel', 'Import CSV/Excel', 'btn btn-sm btn-outline-success bg-surface', 'fa-file-import', function () { openImportModal('funnels'); }, { 'data-permission-module': 'funnels', 'data-permission-action': 'import' });
    addButton(actions, 'btnFunnelsTemplate', 'Template CSV', 'btn btn-sm btn-outline-secondary bg-surface', 'fa-download', function () { downloadTemplate('funnels'); }, { 'data-permission-module': 'funnels', 'data-permission-action': 'import' });
    addButton(actions, 'btnServerBackupFunnels', 'Backup Server', 'btn btn-sm btn-outline-secondary bg-surface', 'fa-database', exportServerBackup, { 'data-permission-module': 'backups', 'data-permission-action': 'export' });
  }


  function getMasterImportContext() {
    const master = window.DataSystemMasterData || null;
    const entity = master?.getActiveTabEntity?.() || 'locations';
    const label = master?.getEntityLabel?.(entity) || 'Master';
    return { entity, label };
  }

  function updateMasterImportButtons() {
    const context = getMasterImportContext();
    const importBtn = document.getElementById('btnMasterImportExcel');
    const templateBtn = document.getElementById('btnMasterTemplate');
    if (importBtn) importBtn.innerHTML = '<i class="fa-solid fa-file-import me-2"></i>Import ' + context.label;
    if (templateBtn) templateBtn.innerHTML = '<i class="fa-solid fa-download me-2"></i>Template ' + context.label;
  }

  function wireMasterTools() {
    if (document.getElementById('btnMasterContextImport')) {
      updateMasterImportButtons();
      document.addEventListener('masters:active-tab-changed', updateMasterImportButtons);
      return;
    }
    const header = document.querySelector('.main-content .container-fluid.pb-4 > .d-flex.justify-content-between.align-items-center.mb-4');
    if (!header) return;
    let tools = header.querySelector('.ds-master-import-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'd-flex flex-wrap gap-2 ms-auto ds-master-import-tools';
      header.appendChild(tools);
    }
    addButton(tools, 'btnMasterImportExcel', 'Import Master', 'btn btn-outline-success bg-surface', 'fa-file-import', function () {
      openImportModal(getMasterImportContext().entity);
    }, { 'data-permission-module': 'masters', 'data-permission-action': 'import' });
    addButton(tools, 'btnMasterTemplate', 'Template Master', 'btn btn-outline-secondary bg-surface', 'fa-download', function () {
      downloadTemplate(getMasterImportContext().entity);
    }, { 'data-permission-module': 'masters', 'data-permission-action': 'import' });
    addButton(tools, 'btnServerBackupMaster', 'Backup Server', 'btn btn-outline-secondary bg-surface', 'fa-database', exportServerBackup, { 'data-permission-module': 'backups', 'data-permission-action': 'export' });
    const restoreInput = ensureHiddenFileInput('ds-restore-server-backup-input', 'application/json,.json', restoreServerBackupFile);
    addButton(tools, 'btnServerRestoreMaster', 'Restore Server', 'btn btn-outline-danger bg-surface', 'fa-rotate-left', function () { restoreInput.click(); }, { 'data-permission-module': 'backups', 'data-permission-action': 'restore' });
    updateMasterImportButtons();
    document.addEventListener('masters:active-tab-changed', updateMasterImportButtons);
  }

  function bootstrapModalEvents() {
    const modal = ensureModal();
    if (modal.dataset.wired === 'true') return;
    modal.dataset.wired = 'true';
    modal.querySelector('#ds-import-target').addEventListener('change', function (event) {
      refreshTemplateInfo(event.target.value);
    });
    modal.querySelector('#ds-import-template').addEventListener('click', function () {
      downloadTemplate(modal.querySelector('#ds-import-target').value);
    });
    modal.querySelector('#ds-import-preview').addEventListener('click', function () { handleImport(true); });
    modal.querySelector('#ds-import-submit').addEventListener('click', function () { handleImport(false); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bootstrapModalEvents();
    if (isPage('data-pesanan.html')) wireDataPesananTools();
    if (isPage('funnel-daftar.html')) wireFunnelTools();
    if (isPage('database-master.html')) wireMasterTools();
  });

  window.DataSystemImportCenter = {
    openImportModal,
    openModal: openImportModal,
    downloadTemplate,
    exportServerBackup,
    restoreServerBackupFile,
  };
})(window, document);
