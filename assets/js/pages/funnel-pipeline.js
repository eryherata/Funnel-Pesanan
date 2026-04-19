(function () {
  const STORAGE_KEY = 'dsFunnelPipelineRecords';
  const CONVERT_KEY = 'dsFunnelConversionDraft';
  const nf = new Intl.NumberFormat('id-ID');

  function getBridge() { return window.DataSystemBridge || null; }
  function getWorkflow() { return window.DataSystemWorkflow || null; }
  function getFeedback() { return window.DataSystemFeedback || null; }

  function formatCompactRupiah(value) {
    const num = Number(value) || 0;
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000_000) return 'Rp ' + (num / 1_000_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' T';
    if (abs >= 1_000_000_000) return 'Rp ' + (num / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
    if (abs >= 1_000_000) return 'Rp ' + (num / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Jt';
    return 'Rp ' + nf.format(Math.round(num));
  }
  function formatDateID(v) {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString('id-ID');
  }
  function daysBetween(a, b) {
    const start = new Date(a); const end = new Date(b);
    if (Number.isNaN(start) || Number.isNaN(end)) return 0;
    return Math.floor((end - start) / 86400000);
  }
  function setHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
  function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
  function formatIssueList(title, items) {
    const rows = Array.isArray(items) ? items.filter(Boolean) : [];
    return title + '\n- ' + rows.join('\n- ');
  }
  function readRecords() {
    const bridge = getBridge();
    const cached = bridge?.getCachedCollection?.('funnels');
    if (Array.isArray(cached) && cached.length) return cached;
    let data = [];
    try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) {}
    if (!Array.isArray(data) || !data.length) {
      data = seedRecords();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      bridge?.setCachedCollection?.('funnels', data);
    }
    return data;
  }
  function saveRecords(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    getBridge()?.setCachedCollection?.('funnels', data);
  }
  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }
  function normalizeMatchKey(value) {
    return String(value || '').trim().toLowerCase();
  }
  function normalizeOrderStatus(value) {
    const text = normalizeMatchKey(value);
    if (!text) return 'Baru';
    if (/(validasi|verifikasi)/.test(text)) return 'Validasi Data';
    if (/(siap|ready)/.test(text)) return 'Siap Kirim';
    if (/(perjalanan|dikirim|transit)/.test(text)) return 'Dalam Pengiriman';
    if (/(selesai|closing|bast|diterima|complete)/.test(text)) return 'Selesai';
    if (/(kendala|masalah|retur|overdue|terlambat)/.test(text)) return 'Bermasalah';
    if (/(proses|kontrak|penyiapan|packing|nego|negosiasi|approval)/.test(text)) return 'Diproses';
    return value || 'Baru';
  }
  function normalizeShippingStatus(value) {
    const text = normalizeMatchKey(value);
    if (!text) return 'Belum Diproses';
    if (/(belum|pending)/.test(text)) return 'Belum Diproses';
    if (/(siap|penyiapan|packing)/.test(text)) return 'Penyiapan';
    if (/(perjalanan|dikirim|transit)/.test(text)) return 'Dalam Perjalanan';
    if (/(tiba|sampai|diterima)/.test(text)) return 'Tiba';
    if (/(selesai|bast|complete)/.test(text)) return 'BAST';
    if (/(kendala|retur|masalah|overdue|terlambat)/.test(text)) return 'Terkendala';
    return value || 'Belum Diproses';
  }
  function getOrderIdentity(row, index = 0) {
    return normalizeMatchKey(row?.po_number || row?.po || row?.no_po || row?.order_no || row?.nomor_po || row?.id || `order-${index + 1}`);
  }
  function isMeaningfulOrderValue(value) {
    return !(value === undefined || value === null || String(value).trim() === '' || String(value).trim() === '-');
  }
  function mergeOrderObjects(baseRow, incomingRow) {
    const merged = { ...(baseRow || {}) };
    Object.keys(incomingRow || {}).forEach((key) => {
      const incomingValue = incomingRow[key];
      if (!isMeaningfulOrderValue(incomingValue)) return;
      if (!isMeaningfulOrderValue(merged[key])) merged[key] = incomingValue;
    });
    return merged;
  }
  function readOrders() {
    const normalizedBridgeRows = typeof window.DashboardDataBridge?.getNormalizedOrders === 'function'
      ? window.DashboardDataBridge.getNormalizedOrders()
      : null;
    const bridgeOrders = getBridge()?.getCachedCollection?.('orders');
    const sources = [bridgeOrders, normalizedBridgeRows, window.__ORDERS_DATA__, window.ordersData, window.daftarPesananData, window.dashboardOrders, window.__APP_PESANAN_ROWS];
    ['ordersData', 'datasystem_orders'].forEach((key) => {
      const parsed = safeJsonParse(localStorage.getItem(key), []);
      if (Array.isArray(parsed) && parsed.length) sources.push(parsed);
    });
    const mergedMap = new Map();
    sources.forEach((source) => {
      if (!Array.isArray(source) || !source.length) return;
      source.forEach((row, index) => {
        if (!row || typeof row !== 'object') return;
        const identity = getOrderIdentity(row, index);
        const current = mergedMap.get(identity);
        mergedMap.set(identity, current ? mergeOrderObjects(current, row) : { ...row });
      });
    });
    return Array.from(mergedMap.values());
  }
  function getOrderNumber(row) {
    return row.po_number || row.po || row.no_po || row.order_no || row.nomor_po || '';
  }
  function getOrderLabel(row) {
    const po = getOrderNumber(row) || 'PO Tanpa Nomor';
    const inst = row.instansi || row.satker || row.instansi_satker || row.nama_instansi || '-';
    const pengadaan = row.nama_pengadaan || row.namaPengadaan || row.pengadaan || '-';
    return `${po} • ${inst} • ${pengadaan}`;
  }
  function deriveKabkota(row) {
    const direct = row.kabkota || row.kabupatenKota || row.kabupaten_kota || row.kabupaten || row.kota || row.city || row.kab_kota;
    if (isMeaningfulOrderValue(direct)) return direct;
    const source = `${row.instansi || ''} ${row.instansi_satker || ''} ${row.satker || ''} ${row.nama_instansi || ''}`;
    const kotaMatch = source.match(/\bKota\s+([A-Za-zÀ-ÿ'`.-]+(?:\s+[A-Za-zÀ-ÿ'`.-]+){0,3})/i);
    if (kotaMatch?.[1]) return kotaMatch[1].trim();
    const kabupatenMatch = source.match(/\bKab(?:upaten)?\.?\s+([A-Za-zÀ-ÿ'`.-]+(?:\s+[A-Za-zÀ-ÿ'`.-]+){0,3})/i);
    if (kabupatenMatch?.[1]) return kabupatenMatch[1].trim();
    return '-';
  }
  function normalizeOrderRow(row, idx) {
    row = window.DataSystemMasterNormalizer?.normalizeRow?.(row) || row;
    const po = getOrderNumber(row) || `ORDER-${idx + 1}`;
    const kabkota = deriveKabkota(row);
    return {
      orderNo: po,
      poDate: row.po_date || row.tgl_iso || row.tanggal_po || row.poDate || row.tanggal || row.tgl || '',
      kodeRup: row.kode_rup || row.kodeRup || row.rup_code || row.rup || '-',
      wilayah: row.wilayah || row.region || row.provinsi || row.province || '-',
      kabkota,
      instansi: row.instansi || row.instansi_satker || row.satker || row.nama_instansi || row.dinas || '-',
      satker: row.satker || row.satuan_kerja || row.instansi_satker || '-',
      namaPengadaan: row.nama_pengadaan || row.namaPengadaan || row.pengadaan || row.pengadaan_name || row.judul || '-',
      principal: row.principal || '-',
      pemasok: row.pemasok || row.supplier || row.vendor || '-',
      distributor: row.distributor || '-',
      pelaksana: row.pelaksana || row.executor || '-',
      pic: row.pic || row.pic_omset || row.picOmset || row.sales_pic || '-',
      penggarap: row.penggarap || row.pic_omset || row.picOmset || row.pic || '-',
      statusPesanan: normalizeOrderStatus(row.status_pesanan || row.status_order || row.statusOrder || row.status || row.tahap || '-'),
      statusPengiriman: normalizeShippingStatus(row.status_pengiriman || row.shipping_status || row.shipment_status || row.statusKirim || row.shipment_stage || '-'),
      netto: Number(row.netto_value || row.nilai || row.netto || row.nilai_kontrak || row.kontrak_total || row.net_value || 0) || 0,
      brutto: Number(row.brutto_value || row.brutto || row.nilai_tayang || row.tayang_total || row.nilai || row.gross_value || 0) || 0,
      lastUpdate: row.last_update_at || row.last_update_iso || row.last_update || row.updated_at || row.po_date || row.tgl_iso || '',
      raw: row,
    };
  }

  function getFilteredConvertOrders(funnelRecord) {
    const rows = readOrders().map((row, idx) => normalizeOrderRow(row, idx));
    const penggarap = normalizeMatchKey(funnelRecord?.penggarap);
    if (!penggarap) return { rows, filteredBy: '', isFallback: false };
    const exact = rows.filter((row) => normalizeMatchKey(row.penggarap) === penggarap);
    if (exact.length) return { rows: exact, filteredBy: funnelRecord?.penggarap || '', isFallback: false };
    const byPic = rows.filter((row) => normalizeMatchKey(row.pic) === penggarap);
    if (byPic.length) return { rows: byPic, filteredBy: funnelRecord?.penggarap || '', isFallback: false };
    return { rows, filteredBy: funnelRecord?.penggarap || '', isFallback: true };
  }

  function updateConvertSelectedSummary(selected) {
    const box = document.getElementById('convert-selected-order-summary');
    const text = document.getElementById('convert-selected-order-text');
    const confirmBtn = document.getElementById('btnConfirmFunnelConvert');
    if (!box || !text || !confirmBtn) return;
    if (!selected) {
      box.classList.add('d-none');
      text.innerHTML = '';
      confirmBtn.textContent = 'Konfirmasi Konversi';
      return;
    }
    box.classList.remove('d-none');
    text.innerHTML = `Pesanan terpilih: <strong>${selected.orderNo || '-'}</strong> • ${selected.instansi || '-'} • ${selected.namaPengadaan || '-'} <span class="text-muted">(${selected.principal || '-'} / ${selected.penggarap || '-'})</span>`;
    confirmBtn.textContent = `Tautkan ke ${selected.orderNo || 'Pesanan Terpilih'}`;
  }

  function refreshConvertOrderInfo(result, visibleRows) {
    const info = document.getElementById('convert-existing-info');
    if (!info) return;
    const visibleCount = Array.isArray(visibleRows) ? visibleRows.length : 0;
    const totalCount = Array.isArray(result?.rows) ? result.rows.length : 0;
    let prefix = '';
    if (result?.filteredBy && !result?.isFallback) prefix = `Auto-filter Penggarap: ${result.filteredBy}. `;
    else if (result?.filteredBy && result?.isFallback) prefix = `Penggarap ${result.filteredBy} tidak ditemukan, jadi semua pesanan ditampilkan. `;
    info.textContent = `${prefix}Menampilkan ${visibleCount} dari ${totalCount} pesanan.`;
  }

  function applyConvertOrderFilters() {
    if (!convertOrderTable) return;
    const search = String(document.getElementById('convert-existing-search')?.value || '').toLowerCase().trim();
    const status = document.getElementById('convert-existing-status-filter')?.value || '';
    const wilayah = document.getElementById('convert-existing-wilayah-filter')?.value || '';
    const kabkota = document.getElementById('convert-existing-kabkota-filter')?.value || '';
    const baseRows = window.__CONVERT_EXISTING_RESULT__?.rows || [];
    buildConvertLocationOptions(baseRows);
    const activeKabkota = document.getElementById('convert-existing-kabkota-filter')?.value || '';
    convertOrderTable.setFilter((data) => {
      const matchSearch = !search || [
        data.orderNo, data.kodeRup, data.instansi, data.satker, data.wilayah, data.kabkota,
        data.namaPengadaan, data.principal, data.pemasok, data.distributor, data.pelaksana,
        data.pic, data.penggarap, data.statusPesanan, data.statusPengiriman,
      ].some((v) => String(v || '').toLowerCase().includes(search));
      const matchStatus = !status || String(data.statusPesanan || '') === status;
      const matchWilayah = !wilayah || String(data.wilayah || '') === wilayah;
      const matchKabkota = !activeKabkota || String(data.kabkota || '') === activeKabkota;
      return matchSearch && matchStatus && matchWilayah && matchKabkota;
    });
    const selectedRows = convertOrderTable.getSelectedData?.() || [];
    if (selectedRows.length) updateConvertSelectedSummary(selectedRows[0]);
    else updateConvertSelectedSummary(null);
    const visibleRows = convertOrderTable.getData('active') || [];
    refreshConvertOrderInfo(window.__CONVERT_EXISTING_RESULT__ || { rows: visibleRows }, visibleRows);
    syncConvertCheckboxState();
  }

  function buildConvertStatusOptions(rows) {
    const select = document.getElementById('convert-existing-status-filter');
    if (!select) return;
    const current = select.value || '';
    const statuses = [...new Set((Array.isArray(rows) ? rows : []).map((row) => row.statusPesanan).filter(Boolean))].sort();
    select.innerHTML = '<option value="">Semua Status</option>' + statuses.map((status) => `<option value="${String(status).replace(/"/g, '&quot;')}">${status}</option>`).join('');
    select.value = statuses.includes(current) ? current : '';
  }
  function buildSelectOptions(selectId, values, placeholder, preferredValue) {
    const select = document.getElementById(selectId);
    if (!select) return '';
    const normalized = [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
    const current = preferredValue !== undefined ? preferredValue : (select.value || '');
    select.innerHTML = `<option value="">${placeholder}</option>` + normalized.map((value) => `<option value="${String(value).replace(/"/g, '&quot;')}">${value}</option>`).join('');
    select.value = normalized.includes(current) ? current : '';
    return select.value || '';
  }
  function buildConvertLocationOptions(rows) {
    const wilayahCurrent = buildSelectOptions('convert-existing-wilayah-filter', (Array.isArray(rows) ? rows : []).map((row) => row.wilayah), 'Semua Wilayah');
    const scopedRows = wilayahCurrent
      ? (Array.isArray(rows) ? rows : []).filter((row) => String(row.wilayah || '') === wilayahCurrent)
      : (Array.isArray(rows) ? rows : []);
    buildSelectOptions('convert-existing-kabkota-filter', scopedRows.map((row) => row.kabkota), 'Semua Kabupaten/Kota');
  }
  function syncConvertCheckboxState() {
    if (!convertOrderTable) return;
    const rows = convertOrderTable.getRows?.('active') || [];
    rows.forEach((row) => {
      const checkbox = row.getElement()?.querySelector?.('.convert-order-checkbox');
      if (checkbox) checkbox.checked = !!row.isSelected?.();
    });
  }
  function toggleConvertRowSelection(row) {
    if (!row) return;
    if (row.isSelected?.()) row.deselect?.();
    else row.select?.();
    syncConvertCheckboxState();
  }
  function buildConvertOrderTable(funnelRecord) {
    const el = document.getElementById('convert-existing-table');
    if (!el || typeof Tabulator === 'undefined') return;
    const result = getFilteredConvertOrders(funnelRecord);
    const rows = result.rows;
    window.__CONVERT_EXISTING_RESULT__ = result;
    buildConvertStatusOptions(rows);
    buildConvertLocationOptions(rows);
    updateConvertSelectedSummary(null);

    if (!convertOrderTable) {
      convertOrderTable = new Tabulator(el, {
        data: rows,
        height: 320,
        layout: 'fitDataTable',
        placeholder: 'Tidak ada pesanan yang cocok.',
        pagination: true,
        paginationSize: 6,
        selectableRows: 1,
        rowClick: function(_e, row){ toggleConvertRowSelection(row); },
        rowSelectionChanged: function(data) {
          updateConvertSelectedSummary(data?.[0] || null);
          syncConvertCheckboxState();
        },
        pageLoaded: function() {
          syncConvertCheckboxState();
        },
        columns: [
          {
            title: 'Pilih', field: 'pick', width: 72, minWidth: 72, maxWidth: 72, hozAlign: 'center', headerHozAlign: 'center', headerSort: false,
            formatter: function(_cell) {
              return '<div class="d-flex justify-content-center"><input type="checkbox" class="convert-order-checkbox" aria-label="Pilih pesanan"></div>';
            },
            cellClick: function(e, cell) {
              e.stopPropagation();
              toggleConvertRowSelection(cell.getRow());
            }
          },
          { title: 'No. PO', field: 'orderNo', width: 135 },
          { title: 'Tanggal PO', field: 'poDate', width: 118, formatter: cell => formatDateID(cell.getValue()) },
          {
            title: 'Instansi / Satker', field: 'instansi', minWidth: 240,
            formatter: cell => `${cell.getValue()}<div class="small text-muted">${cell.getRow().getData().satker || '-'} • ${cell.getRow().getData().wilayah || '-'} • ${cell.getRow().getData().kabkota || '-'}</div>`
          },
          { title: 'Nama Pengadaan', field: 'namaPengadaan', minWidth: 240 },
          { title: 'Principal', field: 'principal', width: 130 },
          {
            title: 'PIC / Penggarap', field: 'penggarap', width: 150,
            formatter: cell => `${cell.getValue() || '-'}<div class="small text-muted">${cell.getRow().getData().pic || '-'}</div>`
          },
          {
            title: 'Status Pesanan', field: 'statusPesanan', width: 140, hozAlign: 'center',
            formatter: cell => `<span class="badge ${badgeClass('status', cell.getValue())}">${cell.getValue() || '-'}</span>`
          },
          {
            title: 'Status Kirim', field: 'statusPengiriman', width: 145, hozAlign: 'center',
            formatter: cell => `<span class="badge bg-info-subtle text-info border border-info-subtle">${cell.getValue() || '-'}</span>`
          },
          { title: 'Netto', field: 'netto', width: 135, hozAlign: 'right', formatter: cell => formatCompactRupiah(cell.getValue()) },
          { title: 'Last Update', field: 'lastUpdate', width: 128, formatter: cell => formatDateID(cell.getValue()) },
        ],
      });
    } else {
      convertOrderTable.setData(rows);
      convertOrderTable.deselectRow();
    }

    const s = document.getElementById('convert-existing-search');
    const f = document.getElementById('convert-existing-status-filter');
    const w = document.getElementById('convert-existing-wilayah-filter');
    const k = document.getElementById('convert-existing-kabkota-filter');
    if (s) s.value = '';
    if (f) f.value = '';
    if (w) w.value = '';
    if (k) k.value = '';
    applyConvertOrderFilters();
    setTimeout(() => {
      convertOrderTable.redraw(true);
      syncConvertCheckboxState();
    }, 0);
  }
  function seedRecords() {
    return [
      {
        id: 'FUN-260401', inputDate: '2026-04-01', namaPengadaan: 'Pengadaan Laptop Pendidikan Tahap 1', kodeRup: 'RUP-2026-001', wilayah: 'DKI Jakarta', kabupatenKota: 'Jakarta Pusat', instansi: 'Dinas Pendidikan DKI Jakarta', satker: 'Bidang Sarpras', sumberPeluang: 'Monitoring LPSE', principal: 'Asus', pemasok: 'PT Pemasok Nusantara', distributor: 'PT Distribusi Makmur', pelaksana: 'CV Cakra Niaga', picOmset: 'Lina', penggarap: 'Bimo', estimasiBrutto: 12500000000, estimasiNetto: 11800000000, estimasiNegosiasi: 700000000, estimasiMarginPct: 11.2, estimasiQty: 500, stage: 'Negosiasi', probability: 75, targetClosing: '2026-04-30', nextAction: 'Follow up revisi penawaran', followUpDate: '2026-04-18', status: 'Aktif', priority: 'Tinggi', riskNote: 'Kompetitor menekan harga', notes: 'Vendor meminta percepatan spesifikasi final.', converted: false, convertedOrderNo: '', lastUpdate: '2026-04-15T09:30:00', followUpHistory:[{date:'2026-04-10',note:'Kirim revisi penawaran ke satker'},{date:'2026-04-15',note:'Menunggu balasan negosiasi akhir'}]
      },
      {
        id: 'FUN-260402', inputDate: '2026-04-03', namaPengadaan: 'Pengadaan Printer Puskesmas', kodeRup: 'RUP-2026-017', wilayah: 'Jawa Barat', kabupatenKota: 'Bandung', instansi: 'Dinas Kesehatan Prov. Jawa Barat', satker: 'UPT Puskesmas', sumberPeluang: 'Referensi Principal', principal: 'Epson', pemasok: 'PT Graha Print', distributor: '', pelaksana: 'CV Sejahtera Medika', picOmset: 'Raka', penggarap: 'Tyo', estimasiBrutto: 3680000000, estimasiNetto: 3515000000, estimasiNegosiasi: 165000000, estimasiMarginPct: 10.1, estimasiQty: 180, stage: 'Tayang / Penawaran', probability: 55, targetClosing: '2026-05-10', nextAction: 'Kirim sample & brosur', followUpDate: '2026-04-22', status: 'Aktif', priority: 'Normal', riskNote: 'Belum final kebutuhan cabang', notes: 'Masih menunggu konfirmasi jumlah unit.', converted: false, convertedOrderNo: '', lastUpdate: '2026-04-14T15:00:00', followUpHistory:[{date:'2026-04-14',note:'Dokumen penawaran dikirim'}]
      },
      {
        id: 'FUN-260403', inputDate: '2026-03-25', namaPengadaan: 'Pengadaan Monitor RSUD', kodeRup: 'RUP-2026-032', wilayah: 'Jawa Tengah', kabupatenKota: 'Semarang', instansi: 'RSUD Semarang', satker: 'Pengadaan Alkes', sumberPeluang: 'Relasi lama', principal: 'Samsung', pemasok: 'PT Visual Teknologi', distributor: 'PT Delta Distribusi', pelaksana: 'CV Prima Husada', picOmset: 'Aji', penggarap: 'Bagus', estimasiBrutto: 2850000000, estimasiNetto: 2725000000, estimasiNegosiasi: 125000000, estimasiMarginPct: 9.8, estimasiQty: 90, stage: 'Menunggu Keputusan', probability: 85, targetClosing: '2026-04-20', nextAction: 'Konfirmasi keputusan ULP', followUpDate: '2026-04-17', status: 'Pending', priority: 'Perlu Follow Up', riskNote: 'Approval internal RSUD lambat', notes: 'Secara harga sudah cocok.', converted: false, convertedOrderNo: '', lastUpdate: '2026-04-12T10:00:00', followUpHistory:[{date:'2026-04-12',note:'Konfirmasi dokumen teknis lengkap'}]
      },
      {
        id: 'FUN-260404', inputDate: '2026-03-10', namaPengadaan: 'Pengadaan Chromebook Sekolah', kodeRup: 'RUP-2026-044', wilayah: 'Banten', kabupatenKota: 'Serang', instansi: 'Dinas Pendidikan Banten', satker: 'Sekretariat', sumberPeluang: 'Monitoring LPSE', principal: 'Acer', pemasok: 'PT Digital Prima', distributor: '', pelaksana: 'CV Sinar Edukasi', picOmset: 'Lina', penggarap: 'Raka', estimasiBrutto: 5420000000, estimasiNetto: 5180000000, estimasiNegosiasi: 240000000, estimasiMarginPct: 8.6, estimasiQty: 240, stage: 'Kalah / Batal', probability: 0, targetClosing: '2026-04-05', nextAction: 'Arsipkan dan simpan alasan kalah', followUpDate: '', status: 'Closed Lost', priority: 'Normal', riskNote: 'Harga kompetitor lebih rendah', notes: 'Masuk arsip peluang kalah.', converted: false, convertedOrderNo: '', lastUpdate: '2026-04-06T11:30:00', followUpHistory:[{date:'2026-04-06',note:'Dinyatakan kalah harga'}]
      },
      {
        id: 'FUN-260405', inputDate: '2026-04-05', namaPengadaan: 'Pengadaan PC Laboratorium', kodeRup: 'RUP-2026-051', wilayah: 'Sumatera Barat', kabupatenKota: 'Padang', instansi: 'Universitas Negeri Padang', satker: 'Fakultas Teknik', sumberPeluang: 'Relasi kampus', principal: 'Lenovo', pemasok: 'PT Inovasi Komputama', distributor: 'PT Delta Distribusi', pelaksana: 'CV Andalas Solusi', picOmset: 'Tyo', penggarap: 'Lina', estimasiBrutto: 7900000000, estimasiNetto: 7585000000, estimasiNegosiasi: 315000000, estimasiMarginPct: 12.4, estimasiQty: 160, stage: 'Lead Masuk', probability: 30, targetClosing: '2026-05-25', nextAction: 'Jadwalkan meeting kebutuhan', followUpDate: '2026-04-19', status: 'Aktif', priority: 'Tinggi', riskNote: 'Timeline mepet semester baru', notes: 'Potensi besar, perlu follow up intensif.', converted: false, convertedOrderNo: '', lastUpdate: '2026-04-15T08:00:00', followUpHistory:[{date:'2026-04-15',note:'Lead masuk dari relasi kampus'}]
      }
    ];
  }

  function badgeClass(type, value) {
    const v = String(value || '').toLowerCase();
    if (type === 'stage') {
      if (v.includes('menang')) return 'bg-success-subtle text-success border border-success-subtle';
      if (v.includes('kalah')) return 'bg-danger-subtle text-danger border border-danger-subtle';
      if (v.includes('negosiasi')) return 'bg-warning-subtle text-warning border border-warning-subtle';
      return 'bg-primary-subtle text-primary border border-primary-subtle';
    }
    if (type === 'status') {
      if (v.includes('lost')) return 'bg-danger-subtle text-danger border border-danger-subtle';
      if (v.includes('won')) return 'bg-success-subtle text-success border border-success-subtle';
      if (v.includes('pending')) return 'bg-warning-subtle text-warning border border-warning-subtle';
      return 'bg-primary-subtle text-primary border border-primary-subtle';
    }
    if (type === 'priority') {
      if (v.includes('kritis') || v.includes('tinggi')) return 'bg-danger-subtle text-danger border border-danger-subtle';
      if (v.includes('follow') || v.includes('perlu')) return 'bg-warning-subtle text-warning border border-warning-subtle';
      return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
    }
    return 'bg-primary-subtle text-primary border border-primary-subtle';
  }

  function initSidebarFunnelActive() {
    if (typeof bootstrap === 'undefined') return;
    const currentPage = window.location.pathname.split('/').pop() || '';
    const activeLink = document.querySelector(`.sidebar-sub-item[href="${currentPage}"]`);
    if (activeLink && activeLink.closest('#menuFunnel')) {
      const collapse = document.getElementById('menuFunnel');
      if (collapse) {
        let inst = bootstrap.Collapse.getInstance(collapse);
        if (!inst) inst = new bootstrap.Collapse(collapse, {toggle:false});
        inst.show();
      }
    }
  }

  function initDashboardPage() {
    if (!document.getElementById('funnelDashboardPage')) return;
    const bridge = window.DashboardDataBridge || null;
    const records = readRecords();
    const active = records.filter(r => !String(r.status).toLowerCase().includes('closed'));
    const won = records.filter(r => String(r.status).toLowerCase().includes('won'));
    const lost = records.filter(r => String(r.status).toLowerCase().includes('lost') || String(r.stage).toLowerCase().includes('kalah'));
    const overdue = active.filter(r => r.followUpDate && new Date(r.followUpDate) < new Date());
    const weighted = active.reduce((s, r) => s + (Number(r.estimasiNetto) || 0) * ((Number(r.probability) || 0) / 100), 0);
    const totalBrutto = active.reduce((s, r) => s + (Number(r.estimasiBrutto) || 0), 0);
    const totalNetto = active.reduce((s, r) => s + (Number(r.estimasiNetto) || 0), 0);
    const activeWithAging = active.map(r => ({
      ...r,
      agingInput: daysBetween(r.inputDate, new Date()),
      agingUpdate: daysBetween(r.lastUpdate, new Date())
    }));
    const stagnant = activeWithAging.filter(r => Number(r.agingUpdate || 0) > 14);
    const avgAging = activeWithAging.length ? Math.round(activeWithAging.reduce((s, r) => s + Number(r.agingInput || 0), 0) / activeWithAging.length) : 0;
    const stagnantValue = stagnant.reduce((s, r) => s + (Number(r.estimasiNetto) || 0), 0);

    const closedByOwner = records.reduce((acc, row) => {
      const owner = row.picOmset || row.penggarap || 'Belum ditetapkan';
      if (!acc[owner]) acc[owner] = { owner, won: 0, lost: 0, total: 0, rate: 0 };
      if (String(row.status).toLowerCase().includes('won')) acc[owner].won += 1;
      if (String(row.status).toLowerCase().includes('lost') || String(row.stage).toLowerCase().includes('kalah')) acc[owner].lost += 1;
      acc[owner].total = acc[owner].won + acc[owner].lost;
      acc[owner].rate = acc[owner].total ? (acc[owner].won / acc[owner].total) * 100 : 0;
      return acc;
    }, {});
    const winRateRows = Object.values(closedByOwner).filter(r => r.total > 0).sort((a, b) => (b.rate - a.rate) || (b.total - a.total) || a.owner.localeCompare(b.owner));
    const bestOwner = winRateRows[0];

    const forecastBuckets = ['<=30 hari', '31-60 hari', '61-90 hari', '>90 hari', 'Belum valid'];
    const closingForecastRows = forecastBuckets.map(bucket => ({ bucket, count: 0, netto: 0, weighted: 0 }));
    active.forEach((row) => {
      const forecastDate = bridge?.getClosingForecastDate ? bridge.getClosingForecastDate(row) : new Date(row.targetClosing || row.followUpDate || row.inputDate || Date.now());
      const days = bridge?.getDaysUntil ? bridge.getDaysUntil(forecastDate, new Date()) : daysBetween(new Date(), forecastDate || new Date());
      const bucket = bridge?.getForecastBucket ? bridge.getForecastBucket(days, 'closing') : 'Belum valid';
      const found = closingForecastRows.find(item => item.bucket === bucket) || closingForecastRows[closingForecastRows.length - 1];
      found.count += 1;
      found.netto += Number(row.estimasiNetto) || 0;
      found.weighted += (Number(row.estimasiNetto) || 0) * ((Number(row.probability) || 0) / 100);
    });

    const ownerPerformanceMap = {};
    activeWithAging.forEach((row) => {
      const owner = row.picOmset || row.penggarap || 'Belum ditetapkan';
      if (!ownerPerformanceMap[owner]) ownerPerformanceMap[owner] = { owner, active: 0, netto: 0, weighted: 0, stagnant: 0, won: 0, lost: 0, winRate: 0 };
      ownerPerformanceMap[owner].active += 1;
      ownerPerformanceMap[owner].netto += Number(row.estimasiNetto) || 0;
      ownerPerformanceMap[owner].weighted += (Number(row.estimasiNetto) || 0) * ((Number(row.probability) || 0) / 100);
      if (Number(row.agingUpdate || 0) > 14) ownerPerformanceMap[owner].stagnant += 1;
    });
    Object.keys(ownerPerformanceMap).forEach((owner) => {
      ownerPerformanceMap[owner].won = closedByOwner[owner]?.won || 0;
      ownerPerformanceMap[owner].lost = closedByOwner[owner]?.lost || 0;
      const totalClosed = ownerPerformanceMap[owner].won + ownerPerformanceMap[owner].lost;
      ownerPerformanceMap[owner].winRate = totalClosed ? (ownerPerformanceMap[owner].won / totalClosed) * 100 : 0;
    });
    const ownerPerformanceRows = Object.values(ownerPerformanceMap).sort((a, b) => (b.weighted - a.weighted) || (b.active - a.active) || a.owner.localeCompare(b.owner)).slice(0, 8);

    const lostReasonMap = {};
    lost.forEach((row) => {
      const reason = bridge?.classifyFunnelLostReason ? bridge.classifyFunnelLostReason(row) : 'Lainnya / belum terkategori';
      if (!lostReasonMap[reason]) lostReasonMap[reason] = { reason, count: 0, netto: 0, lastUpdate: '' };
      lostReasonMap[reason].count += 1;
      lostReasonMap[reason].netto += Number(row.estimasiNetto) || 0;
      lostReasonMap[reason].lastUpdate = row.lastUpdate || lostReasonMap[reason].lastUpdate;
    });
    const lostReasonRows = Object.values(lostReasonMap).sort((a, b) => (b.count - a.count) || (b.netto - a.netto) || a.reason.localeCompare(b.reason));

    const accuracyLabels = ['Lebih Cepat', 'Sesuai Forecast', 'Mundur 1-30 hari', 'Mundur >30 hari', 'Belum valid'];
    const forecastAccuracyRows = accuracyLabels.map(label => ({ category: label, count: 0, netto: 0 }));
    won.forEach((row) => {
      const actualDate = bridge?.parseDate ? (bridge.parseDate(row.closeDate || row.actualCloseDate || row.convertedAt || row.lastUpdate)) : new Date(row.lastUpdate || Date.now());
      const label = bridge?.getForecastAccuracyLabel ? bridge.getForecastAccuracyLabel(row.targetClosing, actualDate, 'closing') : 'Belum valid';
      const found = forecastAccuracyRows.find(item => item.category === label) || forecastAccuracyRows[forecastAccuracyRows.length - 1];
      found.count += 1;
      found.netto += Number(row.estimasiNetto) || 0;
    });
    const forecastAccuracyMeta = bridge?.getForecastAccuracyRate
      ? bridge.getForecastAccuracyRate(won, 'closing', item => item.targetClosing, item => item.closeDate || item.lastUpdate)
      : { valid: 0, accurate: 0, rate: 0 };

    setText('funnel-kpi-active', nf.format(active.length));
    setText('funnel-kpi-brutto', formatCompactRupiah(totalBrutto));
    setText('funnel-kpi-netto', formatCompactRupiah(totalNetto));
    setText('funnel-kpi-weighted', formatCompactRupiah(weighted));
    setText('funnel-kpi-won', nf.format(won.length));
    setText('funnel-kpi-lost', nf.format(lost.length));
    setText('funnel-kpi-conv', ((won.length / Math.max(1, won.length + lost.length)) * 100).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + '%');
    setText('funnel-kpi-overdue', nf.format(overdue.length));
    setText('funnel-kpi-aging', nf.format(avgAging) + ' hari');
    setText('funnel-kpi-stagnant', nf.format(stagnant.length));
    setText('funnel-kpi-stagnant-value', formatCompactRupiah(stagnantValue));
    setText('funnel-kpi-best-owner', bestOwner ? `${bestOwner.owner} • ${bestOwner.rate.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%` : '-');

    if (typeof Chart !== 'undefined') {
      const stageMap = ['Lead Masuk','Kualifikasi','Tayang / Penawaran','Negosiasi','Menunggu Keputusan','Menang / Deal','Kalah / Batal'];
      const stageCounts = stageMap.map(s => records.filter(r => r.stage === s).length);
      const ctx1 = document.getElementById('funnelStageChart');
      if (ctx1) new Chart(ctx1, { type:'doughnut', data:{ labels: stageMap, datasets:[{ data: stageCounts, backgroundColor:['#2c7be5','#00d27a','#f5803e','#f6c343','#39afd1','#6ec664','#e63757'], borderWidth:0 }]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{color:getComputedStyle(document.documentElement).getPropertyValue('--text-muted')}}}}});
      const byWil = {};
      active.forEach(r=>byWil[r.wilayah]=(byWil[r.wilayah]||0)+(Number(r.estimasiNetto)||0));
      const ctx2 = document.getElementById('funnelRegionChart');
      if (ctx2) new Chart(ctx2, { type:'bar', data:{ labels:Object.keys(byWil), datasets:[{label:'Netto', data:Object.values(byWil), backgroundColor:'#2c7be5', borderRadius:6}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#b6c2d9'}}, y:{ticks:{color:'#b6c2d9', callback:v=>formatCompactRupiah(v)}, grid:{color:'rgba(255,255,255,.08)'}}}}});
      const byOutcome = {};
      records.forEach(r=>{ const k = (r.targetClosing||r.inputDate||'').slice(0,7); if(!k) return; byOutcome[k] = byOutcome[k] || {won:0,lost:0}; if(String(r.status).toLowerCase().includes('won')) byOutcome[k].won++; if(String(r.status).toLowerCase().includes('lost') || String(r.stage).toLowerCase().includes('kalah')) byOutcome[k].lost++; });
      const labels = Object.keys(byOutcome).sort();
      const ctx3 = document.getElementById('funnelOutcomeChart');
      if (ctx3) new Chart(ctx3, { type:'bar', data:{ labels, datasets:[{label:'Won', data:labels.map(k=>byOutcome[k].won), backgroundColor:'#00d27a'},{label:'Lost', data:labels.map(k=>byOutcome[k].lost), backgroundColor:'#e63757'}]}, options:{responsive:true, maintainAspectRatio:false, scales:{x:{stacked:false,ticks:{color:'#b6c2d9'}},y:{ticks:{color:'#b6c2d9'},grid:{color:'rgba(255,255,255,.08)'}}}, plugins:{legend:{labels:{color:'#b6c2d9'}}}}});
      const stageAging = ['Lead Masuk','Kualifikasi','Tayang / Penawaran','Negosiasi','Menunggu Keputusan','Menang / Deal','Kalah / Batal'].map(stage => {
        const rows = records.filter(r => r.stage === stage);
        const avg = rows.length ? Math.round(rows.reduce((s, r) => s + daysBetween(r.inputDate, new Date()), 0) / rows.length) : 0;
        return { stage, avg };
      });
      const ctx4 = document.getElementById('funnelAgingStageChart');
      if (ctx4) new Chart(ctx4, { type:'bar', data:{ labels:stageAging.map(x=>x.stage), datasets:[{label:'Rata-rata Aging (hari)', data:stageAging.map(x=>x.avg), backgroundColor:'#39afd1', borderRadius:6}]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#b6c2d9'}}, y:{ticks:{color:'#b6c2d9'}, grid:{color:'rgba(255,255,255,.08)'}}}}});
      const ctx5 = document.getElementById('funnelClosingForecastChart');
      if (ctx5) new Chart(ctx5, {
        type: 'bar',
        data: {
          labels: closingForecastRows.map(item => item.bucket),
          datasets: [
            { label: 'Jumlah Funnel', data: closingForecastRows.map(item => item.count), backgroundColor: '#00d27a', borderRadius: 6, yAxisID: 'y' },
            { label: 'Weighted Pipeline', data: closingForecastRows.map(item => item.weighted), backgroundColor: '#2c7be5', borderRadius: 6, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#b6c2d9' }, grid: { display: false } },
            y: { position: 'left', ticks: { color: '#b6c2d9' }, grid: { color: 'rgba(255,255,255,.08)' } },
            y1: { position: 'right', ticks: { color: '#b6c2d9', callback: v => formatCompactRupiah(v) }, grid: { display: false } }
          },
          plugins: { legend: { labels: { color: '#b6c2d9' } } }
        }
      });
      const ctx6 = document.getElementById('funnelForecastAccuracyChart');
      if (ctx6) new Chart(ctx6, {
        type: 'doughnut',
        data: {
          labels: forecastAccuracyRows.map(item => item.category),
          datasets: [{ data: forecastAccuracyRows.map(item => item.count), backgroundColor: ['#39afd1', '#00d27a', '#f6c343', '#e63757', '#748194'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#b6c2d9' } }, title: { display: true, text: 'Accuracy ' + (forecastAccuracyMeta.rate || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '% • Valid ' + (forecastAccuracyMeta.valid || 0), color: '#b6c2d9' } } }
      });
    }

    if (typeof Tabulator !== 'undefined') {
      new Tabulator('#funnel-followup-grid', {
        data: active.slice().sort((a,b)=>String(a.followUpDate).localeCompare(String(b.followUpDate))),
        layout:'fitColumns', pagination:true, paginationSize:6,
        columns:[
          {title:'ID', field:'id', width:110},
          {title:'Nama Pengadaan', field:'namaPengadaan', minWidth:220},
          {title:'Wilayah', field:'wilayah', width:140},
          {title:'PIC', field:'picOmset', width:110},
          {title:'Next Action', field:'nextAction', minWidth:200},
          {title:'Due', field:'followUpDate', width:120, formatter:cell=>formatDateID(cell.getValue())},
          {title:'Prioritas', field:'priority', width:140, hozAlign:'center', formatter:cell=>`<span class="badge ${badgeClass('priority', cell.getValue())}">${cell.getValue()}</span>`}
        ]
      });
      const staleData = active.map(r=>({ ...r, aging: daysBetween(r.lastUpdate, new Date()) })).sort((a,b)=>b.aging-a.aging);
      new Tabulator('#funnel-stagnant-grid', {
        data: staleData,
        layout:'fitColumns', pagination:true, paginationSize:6,
        columns:[
          {title:'ID', field:'id', width:110},
          {title:'Nama Pengadaan', field:'namaPengadaan', minWidth:220},
          {title:'Tahap', field:'stage', width:160, formatter:cell=>`<span class="badge ${badgeClass('stage', cell.getValue())}">${cell.getValue()}</span>`},
          {title:'Last Update', field:'lastUpdate', width:140, formatter:cell=>formatDateID(cell.getValue())},
          {title:'Aging', field:'aging', width:110, formatter:cell=>`${cell.getValue()} hari`},
          {title:'Status', field:'status', width:140, formatter:cell=>`<span class="badge ${badgeClass('status', cell.getValue())}">${cell.getValue()}</span>`}
        ]
      });
      new Tabulator('#funnelWinrateOwnerTable', {
        data: winRateRows.slice(0, 8),
        layout:'fitColumns', pagination:false, placeholder:'Belum ada closed funnel.',
        columns:[
          {title:'PIC', field:'owner', minWidth:150, cssClass:'fw-semibold text-primary'},
          {title:'Won', field:'won', width:90, hozAlign:'right'},
          {title:'Lost', field:'lost', width:90, hozAlign:'right'},
          {title:'Win Rate', field:'rate', minWidth:110, hozAlign:'right', formatter:cell=>`${Number(cell.getValue()||0).toLocaleString('id-ID',{maximumFractionDigits:1})}%`}
        ]
      });
      new Tabulator('#funnelTopStuckTable', {
        data: stagnant.slice().sort((a,b)=>(Number(b.estimasiNetto||0)-Number(a.estimasiNetto||0))).slice(0, 8),
        layout:'fitColumns', pagination:false, placeholder:'Belum ada funnel stagnan.',
        columns:[
          {title:'Pengadaan', field:'namaPengadaan', minWidth:220, cssClass:'fw-semibold text-primary'},
          {title:'PIC', field:'picOmset', minWidth:100},
          {title:'Aging', field:'agingUpdate', width:95, formatter:cell=>`${cell.getValue()} hari`},
          {title:'Netto', field:'estimasiNetto', minWidth:120, hozAlign:'right', formatter:cell=>formatCompactRupiah(cell.getValue())}
        ]
      });
      new Tabulator('#funnelOwnerPerformanceTable', {
        data: ownerPerformanceRows,
        layout:'fitColumns', pagination:false, placeholder:'Belum ada owner aktif.',
        columns:[
          {title:'Owner', field:'owner', minWidth:150, cssClass:'fw-semibold text-primary'},
          {title:'Aktif', field:'active', width:80, hozAlign:'right'},
          {title:'Weighted', field:'weighted', minWidth:120, hozAlign:'right', formatter:cell=>formatCompactRupiah(cell.getValue())},
          {title:'Stagnan', field:'stagnant', width:90, hozAlign:'right'},
          {title:'Win Rate', field:'winRate', minWidth:100, hozAlign:'right', formatter:cell=>`${Number(cell.getValue()||0).toLocaleString('id-ID',{maximumFractionDigits:1})}%`}
        ]
      });
      new Tabulator('#funnelLostReasonTable', {
        data: lostReasonRows,
        layout:'fitColumns', pagination:false, placeholder:'Belum ada funnel lost.',
        columns:[
          {title:'Reason', field:'reason', minWidth:180, cssClass:'fw-semibold text-primary'},
          {title:'Lost', field:'count', width:80, hozAlign:'right'},
          {title:'Netto', field:'netto', minWidth:120, hozAlign:'right', formatter:cell=>formatCompactRupiah(cell.getValue())}
        ]
      });
      new Tabulator('#funnelForecastAccuracyTable', {
        data: forecastAccuracyRows,
        layout:'fitColumns', pagination:false, placeholder:'Belum ada funnel won yang bisa dibandingkan.',
        columns:[
          {title:'Kategori', field:'category', minWidth:180, cssClass:'fw-semibold text-primary'},
          {title:'Jumlah Funnel', field:'count', width:120, hozAlign:'right'},
          {title:'Nilai Netto', field:'netto', minWidth:140, hozAlign:'right', formatter:cell=>formatCompactRupiah(cell.getValue())},
          {title:'Coverage', field:'count', minWidth:120, hozAlign:'right', formatter:cell=>{ const total = forecastAccuracyRows.reduce((s, item) => s + (Number(item.count) || 0), 0); return total ? ((Number(cell.getValue()||0) / total) * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%' : '0%'; }}
        ]
      });
    }
    try { window.dispatchEvent(new CustomEvent('ds:dashboard-rendered', { detail: { page: 'funnel-dashboard.html', records: records.length } })); } catch (_error) {}
  }

  let funnelTable, funnelItemTable, convertOrderTable;

  async function loadFunnelAuditTrail(record) {
    const box = document.getElementById('detail-funnel-audit');
    if (!box || !record?.id) return;
    box.innerHTML = '<div class="text-muted small">Memuat audit trail...</div>';
    try {
      const bridge = getBridge();
      const logs = bridge?.getAuditLogs ? await bridge.getAuditLogs({ limit: 40 }) : [];
      const filtered = (Array.isArray(logs) ? logs : []).filter((log) => String(log.entity_type || '').toLowerCase() === 'funnel' && String(log.entity_id || '') === String(record.id));
      box.innerHTML = getWorkflow()?.renderAuditList?.(filtered.slice(0, 10)) || '<div class="text-muted small">Belum ada audit trail.</div>';
    } catch (_error) {
      box.innerHTML = '<div class="text-muted small">Audit trail tidak tersedia.</div>';
    }
  }

  async function loadFunnelRelations(record) {
    const countEl = document.getElementById('detail-related-order-count');
    const listEl = document.getElementById('detail-related-orders');
    if (!countEl || !listEl || !record?.id) return;
    let rows = Array.isArray(record.relatedOrders) ? record.relatedOrders : [];
    try {
      const bridgeRows = await getBridge()?.getFunnelOrderLinks?.({ funnelId: record.id });
      if (Array.isArray(bridgeRows) && bridgeRows.length) {
        rows = bridgeRows.map((item) => ({
          orderNo: item.order_no || item.orderNo,
          linkType: item.link_type || item.linkType,
          linkedAt: item.linked_at || item.linkedAt,
          linkedBy: item.linked_by || item.linkedBy,
          orderName: item.order_name || item.orderName,
        }));
      }
    } catch (_error) {}
    countEl.textContent = String(rows.length || 0);
    if (!rows.length) {
      listEl.innerHTML = '<div class="text-muted small">Belum ada order yang ditautkan.</div>';
      return;
    }
    listEl.innerHTML = '<div class="d-flex flex-column gap-2">' + rows.map((item) => `
      <div class="detail-field-card">
        <div class="fw-semibold">${item.orderNo || '-'}</div>
        <div class="small text-muted">${item.orderName || '-'} • ${item.linkType || 'link'} • ${formatDateID(item.linkedAt)}</div>
      </div>`).join('') + '</div>';
  }
  function buildOptionList(records, selector, field) {
    const el = document.querySelector(selector); if (!el) return;
    const vals = [...new Set(records.map(r=>r[field]).filter(Boolean))].sort();
    el.innerHTML = '<option value="">Semua</option>' + vals.map(v=>`<option value="${String(v).replace(/"/g,'&quot;')}">${v}</option>`).join('');
  }
  function openFunnelDetail(record) {
    setText('funnel-detail-title', `${record.id} • ${record.namaPengadaan}`);
    const map = {
      'detail-funnel-id': record.id, 'detail-input-date': formatDateID(record.inputDate), 'detail-pengadaan': record.namaPengadaan,
      'detail-rup': record.kodeRup, 'detail-wilayah': record.wilayah, 'detail-kabkota': record.kabupatenKota,
      'detail-instansi': record.instansi, 'detail-satker': record.satker, 'detail-source': record.sumberPeluang,
      'detail-principal': record.principal, 'detail-pemasok': record.pemasok, 'detail-distributor': record.distributor || '-',
      'detail-pelaksana': record.pelaksana, 'detail-pic': record.picOmset, 'detail-penggarap': record.penggarap,
      'detail-brutto': formatCompactRupiah(record.estimasiBrutto), 'detail-netto': formatCompactRupiah(record.estimasiNetto),
      'detail-nego': formatCompactRupiah(record.estimasiNegosiasi), 'detail-margin': (Number(record.estimasiMarginPct)||0).toLocaleString('id-ID',{maximumFractionDigits:2}) + '%',
      'detail-qty': nf.format(record.estimasiQty || 0), 'detail-stage': record.stage, 'detail-prob': (Number(record.probability)||0) + '%',
      'detail-target': formatDateID(record.targetClosing), 'detail-status': record.status, 'detail-priority': record.priority,
      'detail-follow-action': record.nextAction, 'detail-follow-date': formatDateID(record.followUpDate), 'detail-risk': record.riskNote || '-',
      'detail-notes': record.notes || '-', 'detail-converted': record.converted ? `Ya (${record.convertedOrderNo || '-'})` : 'Belum',
      'detail-last-update': formatDateID(record.lastUpdate)
    };
    Object.entries(map).forEach(([k,v])=>setText(k,v));
    setHTML('funnel-followup-history', (record.followUpHistory||[]).length ? record.followUpHistory.map(x=>`<li class="list-group-item bg-transparent text-custom border-bottom"><div class="fw-semibold">${formatDateID(x.date)}</div><div class="small text-muted">${x.note}</div></li>`).join('') : '<li class="list-group-item bg-transparent text-muted">Belum ada riwayat follow up.</li>');
    loadFunnelRelations(record);
    loadFunnelAuditTrail(record);
    const modalEl = document.getElementById('funnelDetailModal');
    if (modalEl && typeof bootstrap !== 'undefined') new bootstrap.Modal(modalEl).show();
    modalEl.dataset.recordId = record.id;
  }
  function openConvertModal(record) {
    const gate = getWorkflow()?.validateFunnelConversion?.(record, { targetOrderNo: record?.convertedOrderNo || '' }) || { ok: true, errors: [], warnings: [] };
    if (!gate.ok) {
      alert(formatIssueList('Funnel belum bisa dikonversi.', gate.errors));
      return;
    }
    const modalEl = document.getElementById('funnelConvertModal');
    if (!modalEl || typeof bootstrap === 'undefined') {
      convertToOrder(record);
      return;
    }
    document.getElementById('convert-funnel-id').value = record.id;
    const modeNew = document.getElementById('convert-mode-new');
    const modeLink = document.getElementById('convert-mode-link');
    if (modeNew) modeNew.checked = true;
    if (modeLink) modeLink.checked = false;
    updateConvertSelectedSummary(null);
    toggleConvertExisting(record);
    new bootstrap.Modal(modalEl).show();
  }
  function toggleConvertExisting(record) {
    const wrap = document.getElementById('convert-existing-wrapper');
    const isLink = document.getElementById('convert-mode-link')?.checked;
    if (wrap) wrap.style.display = isLink ? '' : 'none';
    if (isLink) {
      const activeRecord = record || readRecords().find((r) => r.id === document.getElementById('convert-funnel-id')?.value);
      if (activeRecord) buildConvertOrderTable(activeRecord);
    } else {
      updateConvertSelectedSummary(null);
      convertOrderTable?.deselectRow?.();
    }
  }
  async function convertToOrder(record) {
    const gate = getWorkflow()?.validateFunnelConversion?.(record, { mode: 'create' }) || { ok: true, errors: [], warnings: [] };
    if (!gate.ok) {
      alert(formatIssueList('Funnel belum bisa dibuatkan pesanan.', gate.errors));
      return false;
    }
    if (gate.warnings?.length) {
      const proceed = await (getFeedback()?.confirm?.(formatIssueList('Ada catatan sebelum order dibuat:', gate.warnings) + '\n\nLanjut ke Form Pesanan?', { title: 'Konversi funnel ke pesanan', variant: 'warning', confirmText: 'Lanjut ke form', cancelText: 'Batal' }) ?? Promise.resolve(window.confirm(formatIssueList('Ada catatan sebelum order dibuat:', gate.warnings) + '\n\nLanjut ke Form Pesanan?')));
      if (!proceed) return false;
    }
    localStorage.setItem(CONVERT_KEY, JSON.stringify(record));
    window.DataSystemNavigation?.navigate?.('input-pesanan.html') || (window.location.href = 'input-pesanan.html');
    return true;
  }
  async function linkToExistingOrder(record, orderNo) {
    const gate = getWorkflow()?.validateFunnelConversion?.(record, { mode: 'link', targetOrderNo: orderNo }) || { ok: true, errors: [], warnings: [] };
    if (!gate.ok) {
      alert(formatIssueList('Funnel belum bisa ditautkan ke pesanan.', gate.errors));
      return false;
    }
    const data = readRecords();
    const row = data.find((item) => item.id === record.id);
    if (!row) return false;
    const orders = readOrders();
    const orderRaw = orders.find((item) => String(getOrderNumber(item)).trim().toLowerCase() === String(orderNo).trim().toLowerCase());
    const existingFunnelId = orderRaw?.funnel_id || orderRaw?.source_funnel_id || orderRaw?.sourceFunnelId || null;
    if (existingFunnelId && String(existingFunnelId) !== String(record.id)) {
      alert(`Pesanan ${orderNo} sudah tertaut ke funnel ${existingFunnelId}. Re-assign lintas funnel diblokir pada Sprint 1.`);
      return false;
    }
    if (gate.warnings?.length) {
      const proceed = await (getFeedback()?.confirm?.(formatIssueList('Ada catatan sebelum tautan disimpan:', gate.warnings) + '\n\nLanjutkan penautan?', { title: 'Tautkan ke pesanan existing', variant: 'warning', confirmText: 'Lanjutkan tautan', cancelText: 'Batal' }) ?? Promise.resolve(window.confirm(formatIssueList('Ada catatan sebelum tautan disimpan:', gate.warnings) + '\n\nLanjutkan penautan?')));
      if (!proceed) return false;
    }
    row.converted = true;
    row.convertedOrderNo = orderNo;
    row.status = 'Closed Won';
    row.stage = 'Menang / Deal';
    row.lastUpdate = new Date().toISOString();
    row.relatedOrders = Array.isArray(row.relatedOrders) ? row.relatedOrders.filter((item) => String(item.orderNo || item.order_no || '') !== orderNo) : [];
    row.relatedOrders.unshift({ orderNo, linkType: 'link', linkedAt: new Date().toISOString(), linkedBy: 'Modal Konversi' });
    row.followUpHistory = row.followUpHistory || [];
    row.followUpHistory.unshift({ date: new Date().toISOString(), note: `Ditautkan ke pesanan ${orderNo}` });
    saveRecords(data);
    try {
      await getBridge()?.linkFunnelOrder?.({
        funnelId: record.id,
        orderNo,
        orderId: orderRaw?.id || null,
        actorName: 'Modal Konversi Funnel',
        linkType: 'link',
        funnelName: record.namaPengadaan || null,
        orderName: orderRaw?.nama_pengadaan || orderRaw?.namaPengadaan || null,
        note: 'Tautkan dari modal konversi funnel'
      });
    } catch (error) {
      console.warn('[funnel-convert-link]', error);
    }
    if (funnelTable) funnelTable.replaceData(data);
    alert(`Funnel ${record.id} berhasil ditautkan ke pesanan ${orderNo}.`);
    return true;
  }
  function initDaftarPage() {
    if (!document.getElementById('funnelDaftarPage') || typeof Tabulator === 'undefined') return;
    const records = readRecords();
    buildOptionList(records, '#funnel-stage-filter', 'stage');
    buildOptionList(records, '#funnel-status-filter', 'status');
    buildOptionList(records, '#funnel-priority-filter', 'priority');
    buildOptionList(records, '#funnel-wilayah-filter', 'wilayah');
    buildOptionList(records, '#funnel-principal-filter', 'principal');

    funnelTable = new Tabulator('#funnel-daftar-grid', {
      data: records,
      layout:'fitDataStretch', pagination:true, paginationSize:10,
      movableColumns:true,
      columns:[
        {title:'ID Funnel', field:'id', width:120, frozen:true},
        {title:'Tanggal Input', field:'inputDate', width:120, formatter:cell=>formatDateID(cell.getValue())},
        {title:'Wilayah', field:'wilayah', width:140},
        {title:'Kabupaten / Kota', field:'kabupatenKota', width:165},
        {title:'Instansi / Satker', field:'instansi', minWidth:220, formatter:cell=>`${cell.getValue()}<div class="small text-muted">${cell.getRow().getData().satker || '-'}</div>`},
        {title:'Nama Pengadaan', field:'namaPengadaan', minWidth:260},
        {title:'Principal', field:'principal', width:140},
        {title:'Pemasok', field:'pemasok', width:160},
        {title:'Pelaksana', field:'pelaksana', width:160},
        {title:'PIC', field:'picOmset', width:110},
        {title:'Brutto', field:'estimasiBrutto', width:130, hozAlign:'right', formatter:cell=>formatCompactRupiah(cell.getValue())},
        {title:'Netto', field:'estimasiNetto', width:130, hozAlign:'right', formatter:cell=>formatCompactRupiah(cell.getValue())},
        {title:'Tahap Funnel', field:'stage', width:170, hozAlign:'center', formatter:cell=>`<span class="badge ${badgeClass('stage', cell.getValue())}">${cell.getValue()}</span>`},
        {title:'Probabilitas', field:'probability', width:120, hozAlign:'center', formatter:cell=>`${cell.getValue() || 0}%`},
        {title:'Target Closing', field:'targetClosing', width:130, formatter:cell=>formatDateID(cell.getValue())},
        {title:'Next Action', field:'nextAction', minWidth:200},
        {title:'Last Update', field:'lastUpdate', width:130, formatter:cell=>formatDateID(cell.getValue())},
        {title:'Status', field:'status', width:130, hozAlign:'center', formatter:cell=>`<span class="badge ${badgeClass('status', cell.getValue())}">${cell.getValue()}</span>`},
        {title:'Prioritas', field:'priority', width:130, hozAlign:'center', formatter:cell=>`<span class="badge ${badgeClass('priority', cell.getValue())}">${cell.getValue()}</span>`},
        {title:'Aksi', field:'actions', width:130, hozAlign:'center', headerSort:false, frozen:true, formatter:(cell)=>{
          const row = cell.getRow().getData();
          return `
            <div class="d-flex justify-content-center gap-1">
              <button class="btn btn-sm btn-outline-primary funnel-action-view" data-id="${row.id}" title="Lihat"><i class="fa-solid fa-eye"></i></button>
              <button class="btn btn-sm btn-outline-warning funnel-action-edit" data-id="${row.id}" title="Edit Tahap"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-sm btn-outline-success funnel-action-convert" data-id="${row.id}" title="Konversi"><i class="fa-solid fa-arrow-right-arrow-left"></i></button>
            </div>`;
        }}
      ]
    });

    // Pastikan tidak ada header filter/input bar yang muncul di tabel daftar funnel
    setTimeout(() => {
      document.querySelectorAll('#funnel-daftar-grid .tabulator-header-filter').forEach((el) => {
        el.style.display = 'none';
        el.innerHTML = '';
      });
      funnelTable?.redraw?.(true);
    }, 0);
    document.getElementById('funnel-search')?.addEventListener('input', (e)=>{
      const term=(e.target.value||'').toLowerCase();
      funnelTable.setFilter((data)=> JSON.stringify(data).toLowerCase().includes(term));
    });
    document.getElementById('btnFunnelApplyQuick')?.addEventListener('click', ()=>{
      const stage = document.getElementById('funnel-stage-filter')?.value || '';
      const status = document.getElementById('funnel-status-filter')?.value || '';
      const priority = document.getElementById('funnel-priority-filter')?.value || '';
      const wilayah = document.getElementById('funnel-wilayah-filter')?.value || '';
      const principal = document.getElementById('funnel-principal-filter')?.value || '';
      funnelTable.setFilter((data)=> (!stage || data.stage===stage) && (!status || data.status===status) && (!priority || data.priority===priority) && (!wilayah || data.wilayah===wilayah) && (!principal || data.principal===principal));
    });
    document.getElementById('btnFunnelResetQuick')?.addEventListener('click', ()=>{
      ['funnel-search','funnel-stage-filter','funnel-status-filter','funnel-priority-filter','funnel-wilayah-filter','funnel-principal-filter'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
      funnelTable.clearFilter();
    });
    document.getElementById('funnel-daftar-grid')?.addEventListener('click', (e)=>{
      const btn = e.target.closest('button'); if(!btn) return;
      const id = btn.dataset.id; const record = readRecords().find(r=>r.id===id); if(!record) return;
      if (btn.classList.contains('funnel-action-view')) openFunnelDetail(record);
      if (btn.classList.contains('funnel-action-convert')) openConvertModal(record);
      if (btn.classList.contains('funnel-action-edit')) {
        document.getElementById('quick-update-id').value = record.id;
        document.getElementById('quick-update-stage').value = record.stage;
        document.getElementById('quick-update-status').value = record.status;
        document.getElementById('quick-update-action').value = record.nextAction || '';
        const m = document.getElementById('quickUpdateModal');
        if (m && typeof bootstrap !== 'undefined') new bootstrap.Modal(m).show();
      }
    });
    document.getElementById('saveQuickUpdate')?.addEventListener('click', ()=>{
      const id = document.getElementById('quick-update-id').value;
      const data = readRecords();
      const row = data.find(r=>r.id===id);
      if (!row) return;
      row.stage = document.getElementById('quick-update-stage').value;
      row.status = document.getElementById('quick-update-status').value;
      row.nextAction = document.getElementById('quick-update-action').value;
      row.lastUpdate = new Date().toISOString();
      row.followUpHistory = row.followUpHistory || [];
      row.followUpHistory.unshift({date:new Date().toISOString(), note:`Update tahap: ${row.stage} / ${row.status}`});
      saveRecords(data);
      getBridge()?.replaceCollection?.('funnels', data).catch(() => {});
      funnelTable?.replaceData?.(data);
      bootstrap.Modal.getInstance(document.getElementById('quickUpdateModal'))?.hide();
      getFeedback()?.toast?.('Update funnel berhasil disimpan.', 'success') || alert('Update funnel berhasil disimpan.');
    });
    document.getElementById('btnConvertFromDetail')?.addEventListener('click', ()=>{
      const modalEl = document.getElementById('funnelDetailModal');
      const id = modalEl?.dataset.recordId;
      const record = readRecords().find(r=>r.id===id);
      if (!record) return;
      const detailInstance = modalEl && typeof bootstrap !== 'undefined' ? bootstrap.Modal.getInstance(modalEl) : null;
      detailInstance?.hide();
      setTimeout(() => openConvertModal(record), detailInstance ? 180 : 0);
    });
    document.getElementById('btnEditFromDetail')?.addEventListener('click', ()=>{
      const id = document.getElementById('funnelDetailModal').dataset.recordId; const record = readRecords().find(r=>r.id===id); if(!record) return;
      document.getElementById('quick-update-id').value = record.id;
      document.getElementById('quick-update-stage').value = record.stage;
      document.getElementById('quick-update-status').value = record.status;
      document.getElementById('quick-update-action').value = record.nextAction || '';
      bootstrap.Modal.getInstance(document.getElementById('funnelDetailModal'))?.hide();
      new bootstrap.Modal(document.getElementById('quickUpdateModal')).show();
    });
  }

  function setSelectOrCreate(labelText, value) {
    const labels = [...document.querySelectorAll('label.form-label')];
    const label = labels.find(l => l.textContent.trim() === labelText);
    if (!label) return;
    const field = label.parentElement.querySelector('input, select');
    if (!field) return;
    if (field.tagName === 'SELECT') {
      const exists = [...field.options].some(opt => opt.textContent.trim() === value || opt.value === value);
      if (!exists) {
        const opt = document.createElement('option'); opt.value = value; opt.textContent = value; field.appendChild(opt);
      }
      field.value = value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  function prefillPesananFromFunnel() {
    if (!document.getElementById('pesananForm')) return;
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(CONVERT_KEY) || 'null'); } catch (_) {}
    if (!draft) return;
    window.__CONVERTED_FUNNEL_DRAFT__ = draft;
    try { sessionStorage.setItem(CONVERT_KEY + 'Active', JSON.stringify(draft)); } catch (_) {}
    setSelectOrCreate('Kabupaten/Kota', draft.kabupatenKota);
    setSelectOrCreate('Satuan Kerja', draft.satker);
    setSelectOrCreate('Kode RUP', draft.kodeRup);
    setSelectOrCreate('Nama Pengadaan', draft.namaPengadaan);
    setSelectOrCreate('Pelaksana', draft.pelaksana);
    setSelectOrCreate('Distributor', draft.distributor || '');
    setSelectOrCreate('Pemasok', draft.pemasok);
    setSelectOrCreate('Principal', draft.principal);
    setSelectOrCreate('Penggarap', draft.penggarap);
    setSelectOrCreate('PIC Omset', draft.picOmset);
    const form = document.getElementById('pesananForm');
    if (form && !document.getElementById('funnelConvertedAlert')) {
      const alert = document.createElement('div');
      alert.id='funnelConvertedAlert';
      alert.className='alert alert-primary border border-primary-subtle mb-3';
      alert.innerHTML=`<i class="fa-solid fa-circle-info me-2"></i>Data funnel <strong>${draft.id}</strong> berhasil dibawa ke Form Pesanan. Lengkapi dokumen dan nomor PO resmi sebelum simpan.`;
      form.prepend(alert);
    }
    localStorage.removeItem(CONVERT_KEY);
  }

  function initInputPage() {
    if (!document.getElementById('funnelInputPage')) return;
    document.getElementById('funnel-input-date').value = new Date().toISOString().slice(0,10);
    window.DataSystemMasterData?.bindFunnelForm?.().catch((error) => console.warn('[bindFunnelForm]', error));
    document.getElementById('btnSaveFunnelDraft')?.addEventListener('click', (e)=>{ e.preventDefault(); saveFunnelForm('Aktif'); });
    document.getElementById('btnSaveFunnelOpen')?.addEventListener('click', (e)=>{ e.preventDefault(); saveFunnelForm('Aktif', true); });
  }
  async function saveFunnelForm(status, openDetail) {
    const get = id => document.getElementById(id)?.value || '';
    const data = readRecords();
    const id = 'FUN-' + new Date().toISOString().replace(/[-:TZ.]/g,'').slice(2,10);
    const record = {
      id,
      inputDate: get('funnel-input-date'), namaPengadaan: get('funnel-name'), kodeRup: get('funnel-rup'), wilayah: get('funnel-wilayah'), kabupatenKota: get('funnel-kabkota'), instansi: get('funnel-instansi'), satker: get('funnel-satker'), sumberPeluang: get('funnel-source'), principal: get('funnel-principal'), pemasok: get('funnel-pemasok'), distributor: get('funnel-distributor'), pelaksana: get('funnel-pelaksana'), picOmset: get('funnel-pic'), penggarap: get('funnel-penggarap'), estimasiBrutto: Number(get('funnel-brutto').replace(/\D/g,'')) || 0, estimasiNetto: Number(get('funnel-netto').replace(/\D/g,'')) || 0, estimasiNegosiasi: Number(get('funnel-nego').replace(/\D/g,'')) || 0, estimasiMarginPct: Number(get('funnel-margin').replace(',','.')) || 0, estimasiQty: Number(get('funnel-qty').replace(/\D/g,'')) || 0, stage: get('funnel-stage'), probability: Number(get('funnel-probability')) || 0, targetClosing: get('funnel-closing'), nextAction: get('funnel-next-action'), followUpDate: get('funnel-followup-date'), status, priority: get('funnel-priority'), riskNote: get('funnel-risk'), notes: get('funnel-notes'), converted:false, convertedOrderNo:'', lastUpdate:new Date().toISOString(), followUpHistory:[{date:new Date().toISOString(), note:'Funnel dibuat'}]
    };
    const duplicateReport = await getBridge()?.checkDuplicates?.('funnel', record);
    if (duplicateReport?.decision === 'block') {
      alert(formatIssueList('Funnel terdeteksi duplikat dan diblokir.', duplicateReport.matches.map((item) => item.message)));
      return;
    }
    if (duplicateReport?.decision === 'warn') {
      const proceed = await (getFeedback()?.confirm?.(formatIssueList('Ada indikasi funnel mirip dengan data lain:', duplicateReport.matches.map((item) => item.message)) + '\n\nTetap simpan funnel?', { title: 'Indikasi duplikasi funnel', variant: 'warning', confirmText: 'Tetap simpan', cancelText: 'Batal' }) ?? Promise.resolve(window.confirm(formatIssueList('Ada indikasi funnel mirip dengan data lain:', duplicateReport.matches.map((item) => item.message)) + '\n\nTetap simpan funnel?')));
      if (!proceed) return;
    }
    data.unshift(record); saveRecords(data);
    getBridge()?.upsertOne?.('funnels', record).catch(() => {});
    if (openDetail) {
      let handled = false;
      try {
        handled = !!window.DataSystemNavigation?.navigate?.('funnel-daftar.html');
      } catch (_error) {
        handled = false;
      }
      if (!handled) window.location.href = 'funnel-daftar.html';
    } else getFeedback()?.toast?.('Funnel berhasil disimpan.', 'success') || alert('Funnel berhasil disimpan.');
  }

  function initConvertModal() {
    document.getElementById('convert-mode-new')?.addEventListener('change', () => toggleConvertExisting());
    document.getElementById('convert-mode-link')?.addEventListener('change', () => toggleConvertExisting());
    document.getElementById('convert-existing-search')?.addEventListener('input', applyConvertOrderFilters);
    document.getElementById('convert-existing-status-filter')?.addEventListener('change', applyConvertOrderFilters);
    document.getElementById('convert-existing-wilayah-filter')?.addEventListener('change', applyConvertOrderFilters);
    document.getElementById('convert-existing-kabkota-filter')?.addEventListener('change', applyConvertOrderFilters);
    document.getElementById('btnConfirmFunnelConvert')?.addEventListener('click', async () => {
      const id = document.getElementById('convert-funnel-id')?.value;
      const record = readRecords().find((r) => r.id === id);
      if (!record) return;
      const isLink = document.getElementById('convert-mode-link')?.checked;
      const modalEl = document.getElementById('funnelConvertModal');
      const modalInstance = modalEl && typeof bootstrap !== 'undefined' ? bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl) : null;
      if (isLink) {
        const selectedRows = convertOrderTable ? convertOrderTable.getSelectedData() : [];
        const selected = selectedRows?.[0];
        const orderNo = selected?.orderNo || '';
        if (!orderNo) { alert('Pilih satu pesanan pada tabel yang akan ditautkan.'); return; }
        modalInstance?.hide();
        await linkToExistingOrder(record, orderNo);
      } else {
        modalInstance?.hide();
        await convertToOrder(record);
      }
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    initSidebarFunnelActive();
    initDashboardPage();
    initDaftarPage();
    initInputPage();
    initConvertModal();
    prefillPesananFromFunnel();
  });
})();
