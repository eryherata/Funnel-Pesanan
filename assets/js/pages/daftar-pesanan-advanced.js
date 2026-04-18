(function () {
  'use strict';

  const IDR = new Intl.NumberFormat('id-ID');
  const SHORT_IDR = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function getBridge() { return window.DataSystemBridge || null; }
  function getWorkflow() { return window.DataSystemWorkflow || null; }
  function getFeedback() { return window.DataSystemFeedback || null; }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatCurrency(value) {
    const num = Number(value || 0);
    return `Rp ${IDR.format(num)}`;
  }

  function formatCurrencyShort(value) {
    const num = Number(value || 0);
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000_000) return `Rp ${SHORT_IDR.format(num / 1_000_000_000_000)} T`;
    if (abs >= 1_000_000_000) return `Rp ${SHORT_IDR.format(num / 1_000_000_000)} M`;
    if (abs >= 1_000_000) return `Rp ${SHORT_IDR.format(num / 1_000_000)} Jt`;
    if (abs >= 1_000) return `Rp ${SHORT_IDR.format(num / 1_000)} Rb`;
    return `Rp ${IDR.format(num)}`;
  }

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function compactText(primary, secondary) {
    const p = escapeHtml(primary || '-');
    const s = secondary ? `<div class="small text-muted text-truncate">${escapeHtml(secondary)}</div>` : '';
    return `<div class="fw-semibold text-truncate">${p}</div>${s}`;
  }

  function badgeClass(type, value) {
    const map = {
      order: {
        'Baru': 'bg-primary-subtle text-primary border border-primary-subtle',
        'Validasi Data': 'bg-warning-subtle text-warning border border-warning-subtle',
        'Lengkap Dokumen': 'bg-info-subtle text-info border border-info-subtle',
        'Diproses': 'bg-primary-subtle text-primary border border-primary-subtle',
        'Siap Kirim': 'bg-success-subtle text-success border border-success-subtle',
        'Dalam Pengiriman': 'bg-primary-subtle text-primary border border-primary-subtle',
        'Selesai': 'bg-success-subtle text-success border border-success-subtle',
        'Bermasalah': 'bg-danger-subtle text-danger border border-danger-subtle'
      },
      ship: {
        'Belum Diproses': 'bg-secondary text-white border border-secondary',
        'Penyiapan': 'bg-warning-subtle text-warning border border-warning-subtle',
        'Dalam Perjalanan': 'bg-primary-subtle text-primary border border-primary-subtle',
        'Tiba': 'bg-info-subtle text-info border border-info-subtle',
        'BAST': 'bg-success-subtle text-success border border-success-subtle',
        'Terkendala': 'bg-danger-subtle text-danger border border-danger-subtle',
        'Retur': 'bg-danger-subtle text-danger border border-danger-subtle'
      },
      sla: {
        'On Track': 'bg-success-subtle text-success border border-success-subtle',
        'H-7': 'bg-info-subtle text-info border border-info-subtle',
        'H-3': 'bg-warning-subtle text-warning border border-warning-subtle',
        'H-1': 'bg-warning-subtle text-warning border border-warning-subtle',
        'Overdue': 'bg-danger-subtle text-danger border border-danger-subtle'
      },
      completeness: {
        'Lengkap': 'bg-success-subtle text-success border border-success-subtle',
        'Data Kurang': 'bg-warning-subtle text-warning border border-warning-subtle',
        'Dokumen Kurang': 'bg-warning-subtle text-warning border border-warning-subtle',
        'Belum Ada Kalkulasi': 'bg-danger-subtle text-danger border border-danger-subtle'
      },
      priority: {
        'Normal': 'bg-success-subtle text-success border border-success-subtle',
        'Perlu Perhatian': 'bg-warning-subtle text-warning border border-warning-subtle',
        'Tinggi': 'bg-danger-subtle text-danger border border-danger-subtle',
        'Kritis': 'bg-danger text-white border border-danger'
      }
    };
    return (map[type] && map[type][value]) || 'bg-primary-subtle text-primary border border-primary-subtle';
  }

  function badgeHtml(type, value) {
    return `<span class="badge ${badgeClass(type, value)}">${escapeHtml(value || '-')}</span>`;
  }

  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    } catch (_error) {
      return fallback;
    }
  }

  function normalizeOrderStatus(value) {
    return getWorkflow()?.normalizeOrderStatus?.(value) || value || 'Baru';
  }

  function normalizeShippingStatus(value) {
    return getWorkflow()?.normalizeShippingStatus?.(value) || value || 'Belum Diproses';
  }

  function getOrderIdentity(raw, index) {
    return String(raw?.po_number ?? raw?.po ?? raw?.no_po ?? raw?.order_no ?? raw?.nomor_po ?? raw?.id ?? index + 1).trim().toLowerCase();
  }

  function toIso(dateString) {
    if (!dateString) return null;
    const text = String(dateString).trim();
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`).toISOString();
    }
    const d = new Date(text);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function getDemoOrders() {
    return [
      {
        id: 1,
        po_number: 'PO-2026-001',
        po_date: '2026-04-04',
        kode_rup: '54219871',
        wilayah: 'Sulawesi Selatan',
        kabkota: 'Makassar',
        instansi: 'Dinas Pendidikan Provinsi Sulawesi Selatan',
        satker: 'Bidang Sarpras SMA/SMK',
        nama_pengadaan: 'Pengadaan Perangkat Laboratorium Komputer SMA',
        principal: 'PT Prima Teknologi',
        pemasok: 'CV Sumber Digital Nusantara',
        distributor: 'PT Distribusi Timur',
        pelaksana: 'CV Pelaksana Mandiri',
        pic: 'Dery Yonata',
        penggarap: 'Tim Government A',
        sumber_dana: 'APBD',
        ppn_mode: 'PPN',
        kontrak_selesai_date: '2026-05-15',
        brutto: 3150000000,
        netto: 2990000000,
        negosiasi: 160000000,
        tayang_barang: 3000000000,
        tayang_ongkir: 150000000,
        kontrak_barang: 2850000000,
        kontrak_ongkir: 140000000,
        status_pesanan: 'Diproses',
        status_pengiriman: 'Penyiapan',
        sla_status: 'H-3',
        kelengkapan: 'Belum Ada Kalkulasi',
        prioritas: 'Tinggi',
        last_update_at: '2026-04-15T09:30:00',
        updated_by: 'Admin Operasional',
        target_prep: '2026-04-20',
        target_arrive_1: '2026-04-25',
        target_arrive_final: '2026-04-28',
        sales_number: 'SO-26-1001',
        resi: '-',
        receiver: '-',
        actual_sent: '-',
        actual_received: '-',
        issue_note: 'Menunggu kalkulasi final dan approval principal',
        doc_po_pel: 'Sudah',
        doc_po_dis: 'Belum',
        doc_po_pem: 'Belum',
        doc_sj: 'Belum',
        doc_bast: 'Belum',
        nota_oldist: 'OLD-9901',
        nota_oldist_date: '2026-04-06',
        nota_erp: 'ERP-21091',
        items: [
          { product_code: 'LAB-CPU-01', product_name: 'CPU Lab Core i7', category: 'Komputer', qty: 40, hpp_total: 980000000, tayang_total: 1080000000, kontrak_total: 1020000000, nego_total: 60000000 },
          { product_code: 'LAB-MON-02', product_name: 'Monitor 24 Inch', category: 'Monitor', qty: 40, hpp_total: 340000000, tayang_total: 400000000, kontrak_total: 380000000, nego_total: 20000000 },
          { product_code: 'LAB-NET-03', product_name: 'Switch dan Rack Network', category: 'Networking', qty: 5, hpp_total: 180000000, tayang_total: 210000000, kontrak_total: 195000000, nego_total: 15000000 }
        ]
      },
      {
        id: 2,
        po_number: 'PO-2026-002',
        po_date: '2026-04-02',
        kode_rup: '54219872',
        wilayah: 'Jawa Barat',
        kabkota: 'Bandung',
        instansi: 'Dinas Kesehatan Kota Bandung',
        satker: 'Bidang Penunjang Medik',
        nama_pengadaan: 'Pengadaan Alat Kesehatan Puskesmas',
        principal: 'PT Medika Sehat',
        pemasok: 'PT Karya Alkes Nusantara',
        distributor: 'PT Distribusi Medika',
        pelaksana: 'CV Sarana Sehat',
        pic: 'Ria Kurnia',
        penggarap: 'Tim Government B',
        sumber_dana: 'DAK',
        ppn_mode: 'PPN',
        kontrak_selesai_date: '2026-05-10',
        brutto: 1850000000,
        netto: 1765000000,
        negosiasi: 85000000,
        tayang_barang: 1720000000,
        tayang_ongkir: 130000000,
        kontrak_barang: 1640000000,
        kontrak_ongkir: 125000000,
        status_pesanan: 'Siap Kirim',
        status_pengiriman: 'Belum Diproses',
        sla_status: 'On Track',
        kelengkapan: 'Lengkap',
        prioritas: 'Normal',
        last_update_at: '2026-04-15T13:00:00',
        updated_by: 'Admin Penjualan',
        target_prep: '2026-04-18',
        target_arrive_1: '2026-04-23',
        target_arrive_final: '2026-04-26',
        sales_number: 'SO-26-1002',
        resi: '-',
        receiver: '-',
        actual_sent: '-',
        actual_received: '-',
        issue_note: '-',
        doc_po_pel: 'Sudah',
        doc_po_dis: 'Sudah',
        doc_po_pem: 'Sudah',
        doc_sj: 'Belum',
        doc_bast: 'Belum',
        nota_oldist: 'OLD-9902',
        nota_oldist_date: '2026-04-05',
        nota_erp: 'ERP-21092',
        items: [
          { product_code: 'KES-TEN-01', product_name: 'Tensimeter Digital', category: 'Alkes', qty: 120, hpp_total: 350000000, tayang_total: 420000000, kontrak_total: 400000000, nego_total: 20000000 },
          { product_code: 'KES-NBL-02', product_name: 'Nebulizer Portable', category: 'Alkes', qty: 80, hpp_total: 420000000, tayang_total: 490000000, kontrak_total: 470000000, nego_total: 20000000 }
        ]
      },
      {
        id: 3,
        po_number: 'PO-2026-003',
        po_date: '2026-03-28',
        kode_rup: '54219873',
        wilayah: 'Jawa Timur',
        kabkota: 'Surabaya',
        instansi: 'Dinas Sosial Kota Surabaya',
        satker: 'Bidang Rehabilitasi Sosial',
        nama_pengadaan: 'Pengadaan Perlengkapan Balai Sosial',
        principal: 'PT Sumber Kesejahteraan',
        pemasok: 'CV Nusantara Supply',
        distributor: 'PT Distribusi Nasional',
        pelaksana: 'CV Harmoni Sejahtera',
        pic: 'Aldi Ramadhan',
        penggarap: 'Tim Tender C',
        sumber_dana: 'APBD',
        ppn_mode: 'NON PPN',
        kontrak_selesai_date: '2026-04-30',
        brutto: 965000000,
        netto: 950000000,
        negosiasi: 15000000,
        tayang_barang: 910000000,
        tayang_ongkir: 55000000,
        kontrak_barang: 898000000,
        kontrak_ongkir: 52000000,
        status_pesanan: 'Dalam Pengiriman',
        status_pengiriman: 'Dalam Perjalanan',
        sla_status: 'H-1',
        kelengkapan: 'Lengkap',
        prioritas: 'Perlu Perhatian',
        last_update_at: '2026-04-16T07:20:00',
        updated_by: 'PIC Logistik',
        target_prep: '2026-04-02',
        target_arrive_1: '2026-04-08',
        target_arrive_final: '2026-04-16',
        sales_number: 'SO-26-1003',
        resi: 'JNE88923177',
        receiver: '-',
        actual_sent: '2026-04-10',
        actual_received: '-',
        issue_note: 'Shipment transit satu hari lebih lambat',
        doc_po_pel: 'Sudah',
        doc_po_dis: 'Sudah',
        doc_po_pem: 'Sudah',
        doc_sj: 'Sudah',
        doc_bast: 'Belum',
        nota_oldist: 'OLD-9903',
        nota_oldist_date: '2026-03-30',
        nota_erp: 'ERP-21093',
        items: [
          { product_code: 'SOS-MTR-01', product_name: 'Kasur Lipat Multi Guna', category: 'Perlengkapan', qty: 300, hpp_total: 430000000, tayang_total: 470000000, kontrak_total: 463000000, nego_total: 7000000 },
          { product_code: 'SOS-LMR-02', product_name: 'Lemari Besi', category: 'Furniture', qty: 20, hpp_total: 220000000, tayang_total: 260000000, kontrak_total: 255000000, nego_total: 5000000 }
        ]
      },
      {
        id: 4,
        po_number: 'PO-2026-004',
        po_date: '2026-03-25',
        kode_rup: '54219874',
        wilayah: 'DKI Jakarta',
        kabkota: 'Jakarta Pusat',
        instansi: 'Dinas Perhubungan DKI Jakarta',
        satker: 'Bidang Sarana Angkutan',
        nama_pengadaan: 'Pengadaan Perangkat Monitoring Armada',
        principal: 'PT Telematika Nusantara',
        pemasok: 'PT Karya Teknologi Logis',
        distributor: 'PT Metro Distribusi',
        pelaksana: 'CV Integrasi Perkasa',
        pic: 'Dery Yonata',
        penggarap: 'Tim Government A',
        sumber_dana: 'APBD',
        ppn_mode: 'PPN',
        kontrak_selesai_date: '2026-05-20',
        brutto: 4280000000,
        netto: 4095000000,
        negosiasi: 185000000,
        tayang_barang: 4100000000,
        tayang_ongkir: 180000000,
        kontrak_barang: 3925000000,
        kontrak_ongkir: 170000000,
        status_pesanan: 'Validasi Data',
        status_pengiriman: 'Belum Diproses',
        sla_status: 'H-7',
        kelengkapan: 'Data Kurang',
        prioritas: 'Perlu Perhatian',
        last_update_at: '2026-04-15T16:40:00',
        updated_by: 'Admin Operasional',
        target_prep: '2026-04-24',
        target_arrive_1: '2026-04-30',
        target_arrive_final: '2026-05-05',
        sales_number: 'SO-26-1004',
        resi: '-',
        receiver: '-',
        actual_sent: '-',
        actual_received: '-',
        issue_note: 'Nama penerima tujuan akhir belum final',
        doc_po_pel: 'Belum',
        doc_po_dis: 'Belum',
        doc_po_pem: 'Belum',
        doc_sj: 'Belum',
        doc_bast: 'Belum',
        nota_oldist: '-',
        nota_oldist_date: '-',
        nota_erp: '-',
        items: [
          { product_code: 'TRK-GPS-01', product_name: 'GPS Tracker Fleet', category: 'Telematika', qty: 150, hpp_total: 2200000000, tayang_total: 2450000000, kontrak_total: 2350000000, nego_total: 100000000 },
          { product_code: 'TRK-DVR-02', product_name: 'Mobile DVR 4CH', category: 'Telematika', qty: 150, hpp_total: 930000000, tayang_total: 1080000000, kontrak_total: 1030000000, nego_total: 50000000 }
        ]
      },
      {
        id: 5,
        po_number: 'PO-2026-005',
        po_date: '2026-03-18',
        kode_rup: '54219875',
        wilayah: 'Kalimantan Timur',
        kabkota: 'Samarinda',
        instansi: 'Dinas Pekerjaan Umum Provinsi Kalimantan Timur',
        satker: 'Bidang Bina Marga',
        nama_pengadaan: 'Pengadaan Peralatan Survey Jalan',
        principal: 'PT Geotek Survey',
        pemasok: 'CV Survey Mandala',
        distributor: 'PT Borneo Distribusi',
        pelaksana: 'CV Infrastruktur Utama',
        pic: 'Maya Lestari',
        penggarap: 'Tim Project D',
        sumber_dana: 'APBD',
        ppn_mode: 'PPN',
        kontrak_selesai_date: '2026-04-25',
        brutto: 1220000000,
        netto: 1190000000,
        negosiasi: 30000000,
        tayang_barang: 1160000000,
        tayang_ongkir: 60000000,
        kontrak_barang: 1135000000,
        kontrak_ongkir: 55000000,
        status_pesanan: 'Selesai',
        status_pengiriman: 'BAST',
        sla_status: 'On Track',
        kelengkapan: 'Lengkap',
        prioritas: 'Normal',
        last_update_at: '2026-04-14T11:05:00',
        updated_by: 'PIC Logistik',
        target_prep: '2026-03-28',
        target_arrive_1: '2026-04-02',
        target_arrive_final: '2026-04-08',
        sales_number: 'SO-26-1005',
        resi: 'TIKI99102831',
        receiver: 'Budi Santoso',
        actual_sent: '2026-03-31',
        actual_received: '2026-04-06',
        issue_note: '-',
        doc_po_pel: 'Sudah',
        doc_po_dis: 'Sudah',
        doc_po_pem: 'Sudah',
        doc_sj: 'Sudah',
        doc_bast: 'Sudah',
        nota_oldist: 'OLD-9905',
        nota_oldist_date: '2026-03-20',
        nota_erp: 'ERP-21095',
        items: [
          { product_code: 'SVY-GPS-01', product_name: 'GPS Geodetic', category: 'Survey', qty: 10, hpp_total: 620000000, tayang_total: 680000000, kontrak_total: 670000000, nego_total: 10000000 },
          { product_code: 'SVY-TOT-02', product_name: 'Total Station', category: 'Survey', qty: 5, hpp_total: 310000000, tayang_total: 360000000, kontrak_total: 350000000, nego_total: 10000000 }
        ]
      }
    ];
  }


  function normalizeOrder(raw, index) {
    raw = window.DataSystemMasterNormalizer?.normalizeRow?.(raw) || raw;
    const brutto = Number(raw.brutto ?? raw.brutto_value ?? raw.nilai_tayang ?? raw.tayang_total ?? raw.nilai ?? 0);
    const netto = Number(raw.netto ?? raw.netto_value ?? raw.nilai_kontrak ?? raw.kontrak_total ?? raw.nilai ?? 0);
    const negosiasi = Number(raw.negosiasi ?? raw.nego_value ?? Math.max(brutto - netto, 0));
    return {
      id: raw.id ?? index + 1,
      po_number: raw.po_number ?? raw.po ?? `PO-${String(index + 1).padStart(4, '0')}`,
      po_date: raw.po_date ?? raw.tgl_iso ?? raw.po_date_iso ?? raw.created_at ?? null,
      kode_rup: raw.kode_rup ?? raw.rup_code ?? '-',
      wilayah: raw.wilayah ?? raw.region ?? '-',
      kabkota: raw.kabkota ?? raw.kabupaten_kota ?? raw.city ?? '-',
      instansi: raw.instansi ?? raw.dinas ?? raw.institution ?? '-',
      satker: raw.satker ?? raw.satuan_kerja ?? '-',
      nama_pengadaan: raw.nama_pengadaan ?? raw.namaPaket ?? raw.package_name ?? '-',
      principal: raw.principal ?? '-',
      pemasok: raw.pemasok ?? raw.supplier ?? '-',
      distributor: raw.distributor ?? '-',
      pelaksana: raw.pelaksana ?? raw.executor ?? '-',
      pic: raw.pic ?? raw.pic_omset ?? '-',
      penggarap: raw.penggarap ?? '-',
      sumber_dana: raw.sumber_dana ?? '-',
      ppn_mode: raw.ppn_mode ?? raw.ppn ?? '-',
      kontrak_selesai_date: raw.kontrak_selesai_date ?? raw.tgl_kontrak_selesai ?? '-',
      brutto,
      netto,
      negosiasi,
      tayang_barang: Number(raw.tayang_barang ?? 0),
      tayang_ongkir: Number(raw.tayang_ongkir ?? 0),
      kontrak_barang: Number(raw.kontrak_barang ?? 0),
      kontrak_ongkir: Number(raw.kontrak_ongkir ?? 0),
      status_pesanan: normalizeOrderStatus(raw.status_pesanan ?? raw.order_status ?? raw.status ?? raw.tahap ?? 'Baru'),
      status_pengiriman: normalizeShippingStatus(raw.status_pengiriman ?? raw.shipment_status ?? raw.shipment_stage ?? 'Belum Diproses'),
      sla_status: raw.sla_status ?? 'On Track',
      kelengkapan: raw.kelengkapan ?? raw.completeness ?? 'Lengkap',
      prioritas: raw.prioritas ?? raw.priority ?? 'Normal',
      last_update_at: raw.last_update_at ?? raw.updated_at ?? raw.last_update_iso ?? raw.po_date,
      updated_by: raw.updated_by ?? raw.editor ?? 'System',
      target_prep: raw.target_prep ?? raw.batas_prep ?? '-',
      target_arrive_1: raw.target_arrive_1 ?? raw.batas_tiba_awal ?? '-',
      target_arrive_final: raw.target_arrive_final ?? raw.batas_tiba_akhir ?? '-',
      sales_number: raw.sales_number ?? raw.nomor_penjualan ?? '-',
      resi: raw.resi ?? raw.resi_number ?? '-',
      receiver: raw.receiver ?? raw.nama_penerima ?? '-',
      actual_sent: raw.actual_sent ?? raw.actual_sent_date ?? '-',
      actual_received: raw.actual_received ?? raw.actual_received_date ?? '-',
      issue_note: raw.issue_note ?? raw.catatan_kendala ?? '-',
      doc_po_pel: raw.doc_po_pel ?? '-',
      doc_po_dis: raw.doc_po_dis ?? '-',
      doc_po_pem: raw.doc_po_pem ?? '-',
      doc_sj: raw.doc_sj ?? '-',
      doc_bast: raw.doc_bast ?? '-',
      nota_oldist: raw.nota_oldist ?? '-',
      nota_oldist_date: raw.nota_oldist_date ?? '-',
      nota_erp: raw.nota_erp ?? '-',
      funnel_id: raw.funnel_id ?? raw.source_funnel_id ?? null,
      source_funnel_id: raw.source_funnel_id ?? raw.funnel_id ?? null,
      source_funnel_code: raw.source_funnel_code ?? raw.sourceFunnelCode ?? raw.funnel_id ?? null,
      source_funnel_name: raw.source_funnel_name ?? raw.sourceFunnelName ?? null,
      funnel_links: Array.isArray(raw.funnel_links) ? raw.funnel_links : [],
      items: Array.isArray(raw.items) ? raw.items : [],
      issue_entries: Array.isArray(raw.issue_entries) ? raw.issue_entries : []
    };
  }

  function getOrdersData() {
    const sources = [
      getBridge()?.getCachedCollection?.('orders'),
      window.__ORDERS_DATA__,
      window.__APP_PESANAN_ROWS,
      window.ordersData,
      window.daftarPesananData,
      window.dashboardOrders,
      safeJsonParse(localStorage.getItem('ordersData'), []),
      safeJsonParse(localStorage.getItem('datasystem_orders'), []),
    ];

    const merged = [];
    const seen = new Set();
    sources.forEach((src) => {
      if (!Array.isArray(src) || !src.length) return;
      src.forEach((row, index) => {
        const identity = getOrderIdentity(row, index);
        if (seen.has(identity)) return;
        seen.add(identity);
        merged.push(row);
      });
    });

    const raw = merged.length ? merged : getDemoOrders();
    return raw.map(normalizeOrder);
  }

  function persistOrdersData(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    localStorage.setItem('ordersData', JSON.stringify(safeRows));
    localStorage.setItem('datasystem_orders', JSON.stringify(safeRows));
    window.__ORDERS_DATA__ = safeRows;
    window.ordersData = safeRows;
    window.daftarPesananData = safeRows;
    window.dashboardOrders = safeRows;
    getBridge()?.setCachedCollection?.('orders', safeRows);
  }

  function findOrderByPo(po) {
    return orders.find((item) => String(item.po_number || '').trim().toLowerCase() === String(po || '').trim().toLowerCase());
  }

  function computeCompleteness(order) {
    if (!(Array.isArray(order?.items) && order.items.length)) return 'Belum Ada Kalkulasi';
    const required = [order.po_number, order.po_date, order.satker, order.nama_pengadaan, order.principal, order.pemasok, order.pelaksana];
    if (required.some((value) => !String(value || '').trim() || String(value || '').trim() === '-')) return 'Data Kurang';
    const docs = [order.doc_po_pel, order.doc_po_dis, order.doc_po_pem];
    if (docs.some((value) => String(value || '') !== 'Sudah')) return 'Dokumen Kurang';
    return 'Lengkap';
  }


  function getIssueIdentity(item, index) {
    return String(item?.id || item?.issue_id || item?.created_at || index + 1).trim().toLowerCase();
  }

  function getOrderIssuesCache() {
    const sources = [getBridge()?.getCachedCollection?.('orderIssues'), window.__ORDER_ISSUES__, safeJsonParse(localStorage.getItem('ds_order_issues'), [])];
    const merged = [];
    const seen = new Set();
    sources.forEach((src) => {
      if (!Array.isArray(src)) return;
      src.forEach((row, index) => {
        const key = getIssueIdentity(row, index);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(row);
      });
    });
    return merged;
  }

  function persistOrderIssues(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    orderIssues = safeRows;
    localStorage.setItem('ds_order_issues', JSON.stringify(safeRows));
    window.__ORDER_ISSUES__ = safeRows;
    getBridge()?.setCachedCollection?.('orderIssues', safeRows);
  }

  function mergeIssueIntoOrder(order, issueRows) {
    const normalizedRows = getWorkflow()?.getIssueEntries?.(order, issueRows) || [];
    return { ...order, issue_entries: normalizedRows };
  }

  function syncOrderIssueEntries(order) {
    const issueRows = getOrderIssuesCache().filter((item) => String(item?.order_no || '').trim().toLowerCase() === String(order?.po_number || '').trim().toLowerCase());
    const mergedOrder = mergeIssueIntoOrder(order, issueRows);
    const orderIndex = orders.findIndex((item) => String(item.id) === String(order.id));
    if (orderIndex >= 0) orders[orderIndex] = mergedOrder;
    persistOrdersData(orders);
    return mergedOrder;
  }

  function renderOrderIssueSummary(items) {
    const list = getWorkflow()?.getIssueEntries?.({}, items) || [];
    const openRows = list.filter((item) => String(item.status || 'Open').toLowerCase() === 'open');
    const target = document.getElementById('detail-issue-summary');
    if (!target) return;
    if (!openRows.length) {
      target.className = 'issue-summary-chip';
      target.innerHTML = '<i class="fa-solid fa-shield"></i><span>Tidak ada blocker aktif</span>';
      return;
    }
    const hasCritical = openRows.some((item) => ['Kritis', 'Tinggi'].includes(getWorkflow()?.normalizeIssueSeverity?.(item.severity)));
    target.className = 'issue-summary-chip ' + (hasCritical ? 'is-critical' : 'is-open');
    target.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><span>' + openRows.length + ' blocker / exception aktif</span>';
  }

  async function loadOrderIssues(order) {
    const box = document.getElementById('detail-order-issues');
    if (!box || !order) return;
    box.innerHTML = '<div class="text-muted small">Memuat blocker & exception...</div>';
    try {
      const rows = await getBridge()?.refreshCollection?.('orderIssues', { silent: true }).catch(() => getOrderIssuesCache());
      orderIssues = Array.isArray(rows) && rows.length ? rows : getOrderIssuesCache();
    } catch (_error) {
      orderIssues = getOrderIssuesCache();
    }
    const related = orderIssues.filter((item) => String(item?.order_no || '').trim().toLowerCase() === String(order.po_number || '').trim().toLowerCase());
    const mergedOrder = mergeIssueIntoOrder(order, related);
    const normalized = getWorkflow()?.getIssueEntries?.(mergedOrder, related) || [];
    box.innerHTML = getWorkflow()?.renderIssueList?.(normalized) || '<div class="text-muted small">Belum ada blocker atau exception aktif.</div>';
    renderOrderIssueSummary(normalized);
  }

  function renderDocumentChecklist(order) {
    const box = document.getElementById('detail-document-checklist');
    if (!box || !order) return;
    const items = getWorkflow()?.getDocumentChecklist?.(order) || [];
    box.innerHTML = getWorkflow()?.renderDocumentChecklist?.(items) || '<div class="text-muted small">Checklist belum tersedia.</div>';
  }

  async function loadOrderAuditTrail(order) {
    const box = document.getElementById('detail-order-audit');
    const historyBox = document.getElementById('detail-order-history');
    if (!box || !order) return;
    box.innerHTML = '<div class="text-muted small">Memuat audit trail...</div>';
    if (historyBox) historyBox.innerHTML = '<div class="text-muted small">Memuat riwayat status...</div>';
    try {
      const rows = await getBridge()?.getAuditLogs?.({ limit: 80 });
      const filtered = (Array.isArray(rows) ? rows : []).filter((log) => {
        if (String(log.entity_type || '').toLowerCase() !== 'order') return false;
        const entityId = String(log.entity_id || '');
        return entityId === String(order.id) || entityId === String(order.po_number);
      }).slice(0, 16);
      box.innerHTML = getWorkflow()?.renderAuditList?.(filtered) || '<div class="text-muted small">Belum ada audit trail.</div>';
      const historyRows = filtered.filter((log) => ['status_update', 'issue_upsert', 'issue_resolved', 'create', 'update'].includes(String(log.action_type || '').toLowerCase()));
      if (historyBox) historyBox.innerHTML = getWorkflow()?.renderStatusHistory?.(historyRows) || '<div class="text-muted small">Belum ada riwayat status.</div>';
    } catch (_error) {
      box.innerHTML = '<div class="text-muted small">Audit trail tidak tersedia.</div>';
      if (historyBox) historyBox.innerHTML = '<div class="text-muted small">Riwayat status tidak tersedia.</div>';
    }
  }

  async function loadOrderRelations(order) {
    setElementText('detail-source-funnel', order.source_funnel_code || order.source_funnel_id || '-');
    setElementText('detail-source-funnel-name', order.source_funnel_name || '-');
    const countEl = document.getElementById('detail-funnel-link-count');
    let links = Array.isArray(order.funnel_links) ? order.funnel_links : [];
    try {
      const bridgeLinks = await getBridge()?.getFunnelOrderLinks?.({ orderNo: order.po_number });
      if (Array.isArray(bridgeLinks) && bridgeLinks.length) {
        links = bridgeLinks.map((item) => ({
          funnelId: item.funnel_id || item.funnelId,
          funnelName: item.funnel_name || item.funnelName,
          linkType: item.link_type || item.linkType,
          linkedAt: item.linked_at || item.linkedAt,
          linkedBy: item.linked_by || item.linkedBy,
        }));
      }
    } catch (_error) {}
    if (countEl) countEl.textContent = String(links.length || 0);
    if (!order.source_funnel_name && links[0]?.funnelName) setElementText('detail-source-funnel-name', links[0].funnelName);
    if (!order.source_funnel_code && links[0]?.funnelId) setElementText('detail-source-funnel', links[0].funnelId);
  }

  function getSavedViewIdentity(item, index) {
    return String(item?.id || item?.view_id || item?.name || index + 1).trim().toLowerCase();
  }

  function getSavedViewsCache() {
    const sources = [getBridge()?.getCachedCollection?.('savedViews'), window.__SAVED_VIEWS__, safeJsonParse(localStorage.getItem('ds_saved_views'), [])];
    const merged = [];
    const seen = new Set();
    sources.forEach((src) => {
      if (!Array.isArray(src)) return;
      src.forEach((row, index) => {
        const key = getSavedViewIdentity(row, index);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(row);
      });
    });
    return merged;
  }

  function persistSavedViews(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    savedViews = safeRows;
    localStorage.setItem('ds_saved_views', JSON.stringify(safeRows));
    window.__SAVED_VIEWS__ = safeRows;
    getBridge()?.setCachedCollection?.('savedViews', safeRows);
    refreshSavedViewDropdown();
    updateActiveViewChip();
  }

  function getCurrentFilterState() {
    const ids = [
      'search-pesanan','filter-po-date-range','filter-wilayah','filter-kabkota','filter-instansi','filter-pengadaan','filter-po-number','filter-kode-rup',
      'filter-principal','filter-pemasok','filter-distributor','filter-pelaksana','filter-pic','filter-penggarap','filter-brutto','filter-netto','filter-negosiasi',
      'filter-pajak','filter-status-pesanan','filter-status-pengiriman','filter-sla','filter-kelengkapan-global'
    ];
    const state = { filters: {}, exceptionCenter: {} };
    ids.forEach((id) => {
      const el = document.getElementById(id);
      state.filters[id] = el ? el.value : '';
    });
    state.exceptionCenter.search = document.getElementById('issue-search-input')?.value || '';
    state.exceptionCenter.status = document.getElementById('issue-status-filter')?.value || 'Open';
    state.exceptionCenter.severity = document.getElementById('issue-severity-filter')?.value || '';
    return state;
  }

  function applyFilterState(state, options) {
    const safeState = state || {};
    Object.entries(safeState.filters || {}).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = value || '';
      if (el.tagName === 'SELECT') {
        if (el.choicesInstance && typeof el.choicesInstance.setChoiceByValue === 'function') {
          try { el.choicesInstance.removeActiveItems(); } catch (_error) {}
          if (value) { try { el.choicesInstance.setChoiceByValue(String(value)); } catch (_error) {} }
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    if (document.getElementById('issue-search-input')) document.getElementById('issue-search-input').value = safeState.exceptionCenter?.search || '';
    if (document.getElementById('issue-status-filter')) document.getElementById('issue-status-filter').value = safeState.exceptionCenter?.status ?? 'Open';
    if (document.getElementById('issue-severity-filter')) document.getElementById('issue-severity-filter').value = safeState.exceptionCenter?.severity || '';
    applyFilters(options);
    refreshExceptionCenter();
  }

  function getActiveFilterCount(state) {
    const safeState = state || getCurrentFilterState();
    let count = 0;
    Object.values(safeState.filters || {}).forEach((value) => { if (String(value || '').trim()) count += 1; });
    if (String(safeState.exceptionCenter?.search || '').trim()) count += 1;
    if (String(safeState.exceptionCenter?.status || '').trim() && String(safeState.exceptionCenter?.status || '').trim() !== 'Open') count += 1;
    if (String(safeState.exceptionCenter?.severity || '').trim()) count += 1;
    return count;
  }

  function refreshSavedViewDropdown() {
    const select = document.getElementById('saved-view-select');
    if (!select) return;
    const currentValue = activeSavedViewId || select.value;
    const rows = getSavedViewsCache().slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id'));
    select.innerHTML = '<option value="">Pilih view tersimpan</option>' + rows.map((row, index) => {
      const id = row.id || `view-${index + 1}`;
      return `<option value="${escapeHtml(id)}">${escapeHtml(row.name || id)}</option>`;
    }).join('');
    if (currentValue) select.value = currentValue;
  }

  function updateActiveViewChip() {
    const chip = document.getElementById('active-view-chip');
    if (!chip) return;
    const rows = getSavedViewsCache();
    const active = rows.find((row, index) => getSavedViewIdentity(row, index) === String(activeSavedViewId || '').trim().toLowerCase() || String(row.id || '') === String(activeSavedViewId || ''));
    const filterCount = getActiveFilterCount();
    const label = active ? escapeHtml(active.name || 'View tersimpan') : (filterCount ? 'Custom' : 'Standar');
    chip.innerHTML = `<i class="fa-solid fa-bookmark text-primary"></i><span>View aktif: <strong>${label}</strong></span>`;
  }

  function renderSelectionSummary() {
    const chip = document.getElementById('bulk-selection-chip');
    const info = document.getElementById('bulk-update-selection-info');
    const selected = ordersTable?.getSelectedData?.() || [];
    const label = `${selected.length} pesanan dipilih`;
    if (chip) chip.innerHTML = `<i class="fa-solid fa-list-check text-primary"></i><span>${label}</span>`;
    if (info) info.textContent = selected.length ? `${selected.length} pesanan akan diperbarui bersamaan. Pastikan perubahan status masih sesuai rule workflow.` : 'Belum ada pesanan yang dipilih. Pilih baris di tabel pesanan terlebih dahulu.';
  }

  function syncOrderInMemory(nextOrder) {
    const idx = orders.findIndex((item) => String(item.id) === String(nextOrder.id) || String(item.po_number) === String(nextOrder.po_number));
    if (idx >= 0) orders[idx] = nextOrder;
    else orders.unshift(nextOrder);
    persistOrdersData(orders);
    if (ordersTable) ordersTable.replaceData(orders);
  }

  function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  let orders = [];
  let ordersTable = null;
  let itemTable = null;
  let exceptionTable = null;
  let detailModal = null;
  let orderIssues = [];
  let savedViews = [];
  let activeFilters = [];
  let activeSavedViewId = null;

  function buildQuickText(order) {
    return [
      order.po_number,
      order.nama_pengadaan,
      order.instansi,
      order.satker,
      order.principal,
      order.pemasok,
      order.pelaksana,
      order.penggarap,
      order.pic,
      order.resi,
      order.kode_rup,
      order.wilayah,
      order.kabkota,
      order.status_pesanan,
      order.status_pengiriman,
    ].join(' ').toLowerCase();
  }

  function buildTableFilters() {
    const search = (document.getElementById('search-pesanan')?.value || '').trim().toLowerCase();
    const orderStatus = document.getElementById('quick-status-pesanan')?.value || '';
    const shipStatus = document.getElementById('quick-status-kirim')?.value || '';
    const completeness = document.getElementById('quick-kelengkapan')?.value || '';

    const filters = [];
    if (search) {
      filters.push((data) => buildQuickText(data).includes(search));
    }
    if (orderStatus) filters.push((data) => data.status_pesanan === orderStatus);
    if (shipStatus) filters.push((data) => data.status_pengiriman === shipStatus);
    if (completeness) filters.push((data) => data.kelengkapan === completeness);

    const modalMap = [
      ['filter-wilayah', 'wilayah'],
      ['filter-kabkota', 'kabkota'],
      ['filter-instansi', 'instansi'],
      ['filter-principal', 'principal'],
      ['filter-pemasok', 'pemasok'],
      ['filter-distributor', 'distributor'],
      ['filter-pelaksana', 'pelaksana'],
      ['filter-pic', 'pic'],
      ['filter-penggarap', 'penggarap'],
      ['filter-status-pesanan', 'status_pesanan'],
      ['filter-status-pengiriman', 'status_pengiriman'],
      ['filter-sla', 'sla_status'],
      ['filter-kelengkapan-global', 'kelengkapan'],
      ['filter-pajak', 'ppn_mode'],
    ];

    modalMap.forEach(([id, field]) => {
      const val = document.getElementById(id)?.value || '';
      if (val) filters.push((data) => String(data[field] || '') === val);
    });

    const textMap = [
      ['filter-pengadaan', 'nama_pengadaan'],
      ['filter-po-number', 'po_number'],
      ['filter-kode-rup', 'kode_rup'],
    ];

    textMap.forEach(([id, field]) => {
      const val = (document.getElementById(id)?.value || '').trim().toLowerCase();
      if (val) filters.push((data) => String(data[field] || '').toLowerCase().includes(val));
    });

    return filters;
  }

  function applyFilters(options) {
    if (!ordersTable) return;
    activeFilters = buildTableFilters();
    if (!activeFilters.length) {
      ordersTable.clearFilter(true);
    } else {
      ordersTable.setFilter((data) => activeFilters.every((fn) => fn(data)));
    }
    ordersTable.setPage(1);
    ordersTable.redraw(true);
    if (!options?.preserveActiveView) activeSavedViewId = null;
    updateActiveViewChip();
    renderSelectionSummary();
  }

  function resetFilters() {
    [
      'search-pesanan',
      'quick-status-pesanan',
      'quick-status-kirim',
      'quick-kelengkapan',
      'filter-po-date-range',
      'filter-wilayah',
      'filter-kabkota',
      'filter-instansi',
      'filter-pengadaan',
      'filter-po-number',
      'filter-kode-rup',
      'filter-principal',
      'filter-pemasok',
      'filter-distributor',
      'filter-pelaksana',
      'filter-pic',
      'filter-penggarap',
      'filter-brutto',
      'filter-netto',
      'filter-negosiasi',
      'filter-pajak',
      'filter-status-pesanan',
      'filter-status-pengiriman',
      'filter-sla',
      'filter-kelengkapan-global'
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
        if (el.choicesInstance) {
          try { el.choicesInstance.removeActiveItems(); } catch (_error) {}
        }
      }
      else el.value = '';
    });
    applyFilters();
    document.getElementById('issue-search-input') && (document.getElementById('issue-search-input').value = '');
    document.getElementById('issue-status-filter') && (document.getElementById('issue-status-filter').value = 'Open');
    document.getElementById('issue-severity-filter') && (document.getElementById('issue-severity-filter').value = '');
    activeSavedViewId = null;
    refreshExceptionCenter();
  }

  function ensureItemTable(items) {
    const target = document.getElementById('detail-item-pesanan-grid');
    if (!target || typeof Tabulator === 'undefined') return;
    if (itemTable) {
      itemTable.replaceData(items);
      itemTable.redraw(true);
      return;
    }

    itemTable = new Tabulator(target, {
      data: items,
      layout: 'fitColumns',
      pagination: false,
      placeholder: 'Belum ada item pesanan',
      columns: [
        { title: 'Kode', field: 'product_code', width: 130 },
        { title: 'Nama Produk', field: 'product_name', minWidth: 220 },
        { title: 'Kategori', field: 'category', width: 140 },
        { title: 'Qty', field: 'qty', hozAlign: 'center', width: 90 },
        { title: 'HPP', field: 'hpp_total', hozAlign: 'right', formatter: (cell) => formatCurrencyShort(cell.getValue()) },
        { title: 'Tayang', field: 'tayang_total', hozAlign: 'right', formatter: (cell) => formatCurrencyShort(cell.getValue()) },
        { title: 'Kontrak', field: 'kontrak_total', hozAlign: 'right', formatter: (cell) => formatCurrencyShort(cell.getValue()) },
        { title: 'Nego', field: 'nego_total', hozAlign: 'right', formatter: (cell) => formatCurrencyShort(cell.getValue()) },
      ]
    });
  }

  function fillDetailModal(order) {
    setElementText('detailPesananSubTitle', `${order.po_number} • ${order.nama_pengadaan}`);
    setElementText('detail-po-number', order.po_number);
    setElementText('detail-po-date', formatDate(order.po_date));
    setElementText('detail-rup', order.kode_rup);
    setElementText('detail-pengadaan', order.nama_pengadaan);
    setElementText('detail-wilayah', order.wilayah);
    setElementText('detail-kabkota', order.kabkota);
    setElementText('detail-instansi', order.instansi);
    setElementText('detail-satker', order.satker);
    setElementText('detail-sumber-dana', order.sumber_dana);
    setElementText('detail-ppn', order.ppn_mode);
    setElementText('detail-kontrak-selesai', formatDate(order.kontrak_selesai_date));

    setElementText('detail-principal', order.principal);
    setElementText('detail-pemasok', order.pemasok);
    setElementText('detail-distributor', order.distributor);
    setElementText('detail-pelaksana', order.pelaksana);
    setElementText('detail-pic', order.pic);
    setElementText('detail-penggarap', order.penggarap);

    setElementText('detail-brutto', formatCurrency(order.brutto));
    setElementText('detail-netto', formatCurrency(order.netto));
    setElementText('detail-negosiasi', formatCurrency(order.negosiasi));
    setElementText('detail-tayang-barang', formatCurrency(order.tayang_barang));
    setElementText('detail-tayang-ongkir', formatCurrency(order.tayang_ongkir));
    setElementText('detail-kontrak-barang', formatCurrency(order.kontrak_barang));
    setElementText('detail-kontrak-ongkir', formatCurrency(order.kontrak_ongkir));

    setElementText('detail-status-pesanan', order.status_pesanan);
    setElementText('detail-status-kirim', order.status_pengiriman);
    setElementText('detail-sla', order.sla_status);
    setElementText('detail-kelengkapan', order.kelengkapan);
    setElementText('detail-prioritas', order.prioritas);
    setElementText('detail-last-update', formatDateTime(order.last_update_at));
    setElementText('detail-updated-by', order.updated_by);

    setElementText('detail-target-prep', formatDate(order.target_prep));
    setElementText('detail-target-arrive-1', formatDate(order.target_arrive_1));
    setElementText('detail-target-arrive-final', formatDate(order.target_arrive_final));
    setElementText('detail-sales-number', order.sales_number);
    setElementText('detail-resi', order.resi);
    setElementText('detail-receiver', order.receiver);
    setElementText('detail-actual-sent', formatDate(order.actual_sent));
    setElementText('detail-actual-received', formatDate(order.actual_received));
    setElementText('detail-issue-note', order.issue_note);

    setElementText('detail-doc-po-pel', order.doc_po_pel);
    setElementText('detail-doc-po-dis', order.doc_po_dis);
    setElementText('detail-doc-po-pem', order.doc_po_pem);
    setElementText('detail-doc-sj', order.doc_sj);
    setElementText('detail-doc-bast', order.doc_bast);
    setElementText('detail-nota-oldist', order.nota_oldist);
    setElementText('detail-nota-oldist-date', formatDate(order.nota_oldist_date));
    setElementText('detail-nota-erp', order.nota_erp);
    loadOrderRelations(order);
    loadOrderAuditTrail(order);
    loadOrderIssues(order);
    renderDocumentChecklist(order);

    ensureItemTable(order.items || []);
  }

  function openDetail(order) {
    fillDetailModal(order);
    const modalEl = document.getElementById('detailPesananModal');
    if (!modalEl || typeof bootstrap === 'undefined') return;
    detailModal = detailModal || new bootstrap.Modal(modalEl);
    detailModal.show();
    setTimeout(() => { if (itemTable) itemTable.redraw(true); }, 120);
  }

  function actionButtonsFormatter(cell) {
    const row = cell.getRow().getData();
    return `
      <div class="d-flex gap-1 justify-content-center align-items-center flex-nowrap">
        <button type="button" class="btn btn-sm btn-outline-primary action-icon-btn btn-view-order" data-order-id="${row.id}" title="Lihat Detail" aria-label="Lihat Detail">
          <i class="fa-solid fa-eye"></i>
        </button>
        <button type="button" class="btn btn-sm btn-outline-warning action-icon-btn btn-edit-order" data-order-id="${row.id}" title="Edit Pesanan" aria-label="Edit Pesanan">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button type="button" class="btn btn-sm btn-outline-success action-icon-btn btn-update-order" data-order-id="${row.id}" title="Update Status" aria-label="Update Status">
          <i class="fa-solid fa-truck-fast"></i>
        </button>
      </div>
    `;
  }

  function buildMainTable() {
    const target = document.getElementById('daftar-pesanan-grid');
    if (!target || typeof Tabulator === 'undefined') return;

    ordersTable = new Tabulator(target, {
      data: orders,
      layout: 'fitDataStretch',
      placeholder: 'Belum ada data pesanan',
      selectableRows: true,
      selectableRowsPersistence: true,
      pagination: true,
      paginationSize: 10,
      paginationSizeSelector: [10, 25, 50, 100],
      movableColumns: true,
      responsiveLayout: false,
      rowHeight: 54,
      initialSort: [{ column: 'po_date', dir: 'desc' }],
      columns: [
        { formatter: 'rowSelection', titleFormatter: 'rowSelection', hozAlign: 'center', headerSort: false, width: 54, minWidth: 54, frozen: true },
        { title: 'No', formatter: 'rownum', hozAlign: 'center', width: 70, frozen: true },
        {
          title: 'No. PO', field: 'po_number', minWidth: 180, frozen: true,
          formatter: (cell) => compactText(cell.getRow().getData().po_number, `Kode RUP: ${cell.getRow().getData().kode_rup}`)
        },
        {
          title: 'Tanggal PO', field: 'po_date', width: 150,
          formatter: (cell) => compactText(formatDate(cell.getValue()), cell.getRow().getData().sumber_dana)
        },
        {
          title: 'Wilayah', field: 'wilayah', minWidth: 170,
          formatter: (cell) => compactText(cell.getValue(), cell.getRow().getData().kabkota)
        },
        {
          title: 'Instansi / Satker', field: 'instansi', minWidth: 260,
          formatter: (cell) => compactText(cell.getValue(), cell.getRow().getData().satker)
        },
        {
          title: 'Nama Pengadaan', field: 'nama_pengadaan', minWidth: 260,
          formatter: (cell) => compactText(cell.getValue(), '')
        },
        { title: 'Principal', field: 'principal', minWidth: 180 },
        { title: 'Pemasok', field: 'pemasok', minWidth: 190 },
        { title: 'Pelaksana', field: 'pelaksana', minWidth: 180 },
        {
          title: 'PIC / Penggarap', field: 'pic', minWidth: 180,
          formatter: (cell) => compactText(cell.getValue(), cell.getRow().getData().penggarap)
        },
        { title: 'Brutto', field: 'brutto', hozAlign: 'right', minWidth: 140, formatter: (cell) => formatCurrencyShort(cell.getValue()) },
        { title: 'Netto', field: 'netto', hozAlign: 'right', minWidth: 140, formatter: (cell) => formatCurrencyShort(cell.getValue()) },
        { title: 'Nego', field: 'negosiasi', hozAlign: 'right', minWidth: 140, formatter: (cell) => formatCurrencyShort(cell.getValue()) },
        { title: 'Status Pesanan', field: 'status_pesanan', hozAlign: 'center', minWidth: 150, formatter: (cell) => badgeHtml('order', cell.getValue()) },
        { title: 'Status Pengiriman', field: 'status_pengiriman', hozAlign: 'center', minWidth: 160, formatter: (cell) => badgeHtml('ship', cell.getValue()) },
        { title: 'SLA', field: 'sla_status', hozAlign: 'center', minWidth: 120, formatter: (cell) => badgeHtml('sla', cell.getValue()) },
        { title: 'Kelengkapan', field: 'kelengkapan', hozAlign: 'center', minWidth: 160, formatter: (cell) => badgeHtml('completeness', cell.getValue()) },
        {
          title: 'Last Update', field: 'last_update_at', minWidth: 180,
          formatter: (cell) => compactText(formatDateTime(cell.getValue()), cell.getRow().getData().updated_by)
        },
        {
          title: 'Aksi', field: 'actions', width: 124, minWidth: 124, maxWidth: 124, hozAlign: 'center', frozen: true,
          headerSort: false, formatter: actionButtonsFormatter, cellClick: function (e, cell) {
            const btn = e.target.closest('button');
            if (!btn) return;
            const data = cell.getRow().getData();
            if (btn.classList.contains('btn-view-order')) openDetail(data);
            if (btn.classList.contains('btn-edit-order')) openExternalModal('editModal', 'edit-po-title', data.po_number);
            if (btn.classList.contains('btn-update-order')) openExternalModal('statusModal', 'modal-po-title', data.po_number);
          }
        }
      ],
      rowDblClick: function (e, row) {
        openDetail(row.getData());
      },
      rowSelectionChanged: function () {
        renderSelectionSummary();
      }
    });
    renderSelectionSummary();
  }

  function openExternalModal(modalId, titleId, po) {
    const modalEl = document.getElementById(modalId);
    const titleEl = document.getElementById(titleId);
    if (titleEl) titleEl.textContent = po || '-';
    if (modalId === 'statusModal') {
      const order = findOrderByPo(po);
      if (order) {
        document.getElementById('status-order-id').value = order.id || '';
        document.getElementById('status-order-status').value = order.status_pesanan || 'Baru';
        document.getElementById('status-sales-number').value = order.sales_number && order.sales_number !== '-' ? order.sales_number : '';
        document.getElementById('status-resi').value = order.resi && order.resi !== '-' ? order.resi : '';
        document.getElementById('status-shipping-status').value = order.status_pengiriman || 'Belum Diproses';
        document.getElementById('status-actual-sent').value = order.actual_sent && order.actual_sent !== '-' ? formatDate(order.actual_sent) : '';
        document.getElementById('status-actual-received').value = order.actual_received && order.actual_received !== '-' ? formatDate(order.actual_received) : '';
        document.getElementById('status-receiver').value = order.receiver && order.receiver !== '-' ? order.receiver : '';
        document.getElementById('status-issue-note').value = order.issue_note && order.issue_note !== '-' ? order.issue_note : '';
        const openIssue = (getWorkflow()?.getIssueEntries?.(order, order.issue_entries || []) || []).find((item) => String(item.status || 'Open').toLowerCase() === 'open');
        document.getElementById('status-create-issue').checked = false;
        document.getElementById('status-issue-type').value = openIssue?.issue_type || 'Exception';
        document.getElementById('status-issue-severity').value = openIssue?.severity || 'Sedang';
        document.getElementById('status-issue-owner').value = openIssue?.owner_name && openIssue.owner_name !== '-' ? openIssue.owner_name : '';
        document.getElementById('status-issue-due-date').value = openIssue?.due_date ? formatDate(openIssue.due_date) : '';
      }
    }
    if (!modalEl || typeof bootstrap === 'undefined') return;
    if (detailModal) detailModal.hide();
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    setTimeout(() => modal.show(), detailModal ? 180 : 0);
  }

  function initFilterButtons() {
    document.getElementById('btnQuickFilterPesanan')?.addEventListener('click', applyFilters);
    document.getElementById('btnApplyGlobalFilterPesanan')?.addEventListener('click', applyFilters);
    document.getElementById('btnResetFilterPesanan')?.addEventListener('click', resetFilters);
    document.getElementById('btnResetGlobalFilterPesanan')?.addEventListener('click', resetFilters);
    document.getElementById('btnRefreshPesanan')?.addEventListener('click', function () {
      if (ordersTable) {
        ordersTable.replaceData(orders);
        applyFilters();
      }
      refreshExceptionCenter();
    });
    document.getElementById('btnRefreshExceptionCenter')?.addEventListener('click', refreshExceptionCenter);
    document.getElementById('btnExportPesanan')?.addEventListener('click', function () {
      if (ordersTable) ordersTable.download('csv', 'daftar-pesanan.csv');
    });
    document.getElementById('search-pesanan')?.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applyFilters();
    });
    document.getElementById('search-pesanan')?.addEventListener('input', function () {
      if (!this.value) applyFilters();
    });
    ['issue-search-input','issue-status-filter','issue-severity-filter'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', function () { activeSavedViewId = null; refreshExceptionCenter(); updateActiveViewChip(); });
      document.getElementById(id)?.addEventListener('change', function () { activeSavedViewId = null; refreshExceptionCenter(); updateActiveViewChip(); });
    });
  }

  function initSavedViews() {
    savedViews = getSavedViewsCache();
    refreshSavedViewDropdown();
    const defaultView = savedViews.find((row) => Number(row?.is_default || row?.isDefault || 0) === 1);
    if (defaultView) {
      activeSavedViewId = defaultView.id || defaultView.view_id || getSavedViewIdentity(defaultView, 0);
      applyFilterState(defaultView.filter_state || defaultView.filterState || {}, { preserveActiveView: true });
    } else {
      updateActiveViewChip();
    }

    document.getElementById('btnSaveCurrentView')?.addEventListener('click', async function () {
      const name = (document.getElementById('saved-view-name')?.value || '').trim();
      if (!name) { alert('Nama view wajib diisi.'); return; }
      const note = (document.getElementById('saved-view-note')?.value || '').trim();
      const isDefault = Number(document.getElementById('saved-view-default')?.value || 0) === 1;
      const payload = {
        id: 'VIEW-' + Date.now(),
        name,
        note,
        page_key: 'data-pesanan',
        is_default: isDefault ? 1 : 0,
        filter_state: getCurrentFilterState(),
        updated_at: new Date().toISOString(),
      };
      let rows = getSavedViewsCache().filter((item) => String(item.name || '').trim().toLowerCase() !== name.toLowerCase());
      if (isDefault) rows = rows.map((item) => ({ ...item, is_default: 0 }));
      rows.unshift(payload);
      persistSavedViews(rows);
      activeSavedViewId = payload.id;
      updateActiveViewChip();
      getBridge()?.upsertOne?.('savedViews', payload).catch((error) => console.warn('[saved-view-upsert]', error));
      const modalEl = document.getElementById('savedViewModal');
      if (modalEl && typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      document.getElementById('saved-view-name').value = '';
      document.getElementById('saved-view-note').value = '';
      document.getElementById('saved-view-default').value = '0';
    });

    document.getElementById('btnApplySavedView')?.addEventListener('click', function () {
      const selectedId = document.getElementById('saved-view-select')?.value || '';
      if (!selectedId) return;
      const row = getSavedViewsCache().find((item, index) => getSavedViewIdentity(item, index) === selectedId.toLowerCase() || String(item.id || '') === selectedId);
      if (!row) return;
      activeSavedViewId = row.id || selectedId;
      applyFilterState(row.filter_state || row.filterState || {}, { preserveActiveView: true });
      updateActiveViewChip();
    });

    document.getElementById('btnDeleteSavedView')?.addEventListener('click', async function () {
      const selectedId = document.getElementById('saved-view-select')?.value || '';
      if (!selectedId) return;
      const current = getSavedViewsCache();
      const row = current.find((item, index) => getSavedViewIdentity(item, index) === selectedId.toLowerCase() || String(item.id || '') === selectedId);
      if (!row) return;
      const proceed = await (getFeedback()?.confirm?.(`Hapus view "${row.name || selectedId}"?`, { title: 'Hapus saved view', variant: 'warning', confirmText: 'Ya, hapus', cancelText: 'Batal' }) ?? Promise.resolve(window.confirm(`Hapus view "${row.name || selectedId}"?`)));
      if (!proceed) return;
      persistSavedViews(current.filter((item, index) => !(getSavedViewIdentity(item, index) === selectedId.toLowerCase() || String(item.id || '') === selectedId)));
      try { await getBridge()?.deleteOne?.('savedViews', selectedId); } catch (_error) {}
      if (String(activeSavedViewId || '') === selectedId) activeSavedViewId = null;
      refreshSavedViewDropdown();
      updateActiveViewChip();
    });
  }

  async function refreshExceptionCenter() {
    try {
      const rows = await getBridge()?.refreshCollection?.('orderIssues', { silent: true }).catch(() => getOrderIssuesCache());
      orderIssues = Array.isArray(rows) && rows.length ? rows : getOrderIssuesCache();
    } catch (_error) {
      orderIssues = getOrderIssuesCache();
    }
    const search = (document.getElementById('issue-search-input')?.value || '').trim().toLowerCase();
    const status = document.getElementById('issue-status-filter')?.value || '';
    const severity = document.getElementById('issue-severity-filter')?.value || '';
    const filtered = orderIssues.filter((item) => {
      const passStatus = !status || String(item.status || 'Open') === status;
      const passSeverity = !severity || String(item.severity || '') === severity;
      const hay = [item.order_no, item.title, item.description, item.owner_name, item.issue_type].join(' ').toLowerCase();
      const passSearch = !search || hay.includes(search);
      return passStatus && passSeverity && passSearch;
    });
    const openRows = orderIssues.filter((item) => String(item.status || 'Open') === 'Open');
    const criticalRows = openRows.filter((item) => ['Kritis', 'Tinggi'].includes(getWorkflow()?.normalizeIssueSeverity?.(item.severity) || item.severity));
    const overdueRows = openRows.filter((item) => {
      if (!item.due_date) return false;
      const due = new Date(item.due_date);
      return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
    });
    const ownerCount = new Set(openRows.map((item) => String(item.owner_name || '').trim()).filter(Boolean)).size;
    setElementText('exception-open-count', String(openRows.length));
    setElementText('exception-critical-count', String(criticalRows.length));
    setElementText('exception-overdue-count', String(overdueRows.length));
    setElementText('exception-owner-count', String(ownerCount));
    if (exceptionTable) {
      exceptionTable.replaceData(filtered);
      return;
    }
    const target = document.getElementById('exception-center-grid');
    if (!target || typeof Tabulator === 'undefined') return;
    exceptionTable = new Tabulator(target, {
      data: filtered,
      layout: 'fitDataStretch',
      placeholder: 'Belum ada exception / blocker yang sesuai filter.',
      pagination: true,
      paginationSize: 8,
      columns: [
        { title: 'Order', field: 'order_no', minWidth: 150, formatter: (cell) => compactText(cell.getValue(), findOrderByPo(cell.getValue())?.nama_pengadaan || '-') },
        { title: 'Tipe', field: 'issue_type', width: 130 },
        { title: 'Severity', field: 'severity', width: 130, formatter: (cell) => badgeHtml('priority', getWorkflow()?.normalizeIssueSeverity?.(cell.getValue()) || cell.getValue()) },
        { title: 'Judul / Catatan', field: 'title', minWidth: 280, formatter: (cell) => compactText(cell.getValue(), cell.getRow().getData().description || '-') },
        { title: 'Owner', field: 'owner_name', minWidth: 160 },
        { title: 'Due Date', field: 'due_date', width: 140, formatter: (cell) => formatDate(cell.getValue()) },
        { title: 'Status', field: 'status', width: 120, formatter: (cell) => badgeHtml(String(cell.getValue() || '') === 'Resolved' ? 'completeness' : 'sla', cell.getValue() || 'Open') },
        { title: 'Aksi', field: 'actions', width: 180, hozAlign: 'center', headerSort: false, formatter: function (cell) {
            const row = cell.getRow().getData();
            const disabled = String(row.status || 'Open') === 'Resolved' ? 'disabled' : '';
            return `<div class="d-flex gap-1 justify-content-center"><button type="button" class="btn btn-sm btn-outline-primary btn-issue-open-order" data-order-no="${escapeHtml(row.order_no || '')}"><i class="fa-solid fa-eye"></i></button><button type="button" class="btn btn-sm btn-outline-success btn-issue-resolve" data-issue-id="${escapeHtml(row.id || '')}" ${disabled}><i class="fa-solid fa-check"></i></button></div>`;
          },
          cellClick: async function (e, cell) {
            const btn = e.target.closest('button');
            if (!btn) return;
            const data = cell.getRow().getData();
            if (btn.classList.contains('btn-issue-open-order')) {
              const order = findOrderByPo(data.order_no);
              if (order) openDetail(order);
            }
            if (btn.classList.contains('btn-issue-resolve')) {
              const nextIssue = { ...data, status: 'Resolved', resolved_at: new Date().toISOString() };
              persistOrderIssues([nextIssue, ...getOrderIssuesCache().filter((item, index) => getIssueIdentity(item, index) !== getIssueIdentity(data, 0))]);
              const order = findOrderByPo(data.order_no);
              if (order) {
                order.issue_entries = (Array.isArray(order.issue_entries) ? order.issue_entries : []).map((item, index) => getIssueIdentity(item, index) === getIssueIdentity(data, 0) ? { ...item, status: 'Resolved', resolved_at: nextIssue.resolved_at } : item);
                syncOrderIssueEntries(order);
              }
              try { await getBridge()?.upsertOne?.('orderIssues', nextIssue); } catch (_error) {}
              getBridge()?.appendAuditLog?.({ entityType: 'order', entityId: order?.id || data.order_no, actionType: 'issue_resolved', actorName: 'Exception Center', summary: `Issue ${data.title} diselesaikan dari exception center`, snapshot: nextIssue });
              refreshExceptionCenter();
              if (order && document.getElementById('detail-po-number')?.textContent === order.po_number) fillDetailModal(order);
            }
          }
        }
      ]
    });
  }

  async function applyBulkUpdate() {
    const selectedRows = ordersTable?.getSelectedData?.() || [];
    if (!selectedRows.length) { alert('Pilih minimal satu pesanan terlebih dahulu.'); return; }
    const statusPesanan = document.getElementById('bulk-status-pesanan')?.value || '';
    const statusKirim = document.getElementById('bulk-status-kirim')?.value || '';
    const prioritas = document.getElementById('bulk-priority')?.value || '';
    const pic = (document.getElementById('bulk-pic')?.value || '').trim();
    const penggarap = (document.getElementById('bulk-penggarap')?.value || '').trim();
    const issueNote = (document.getElementById('bulk-issue-note')?.value || '').trim();
    const targetPrep = toIso(document.getElementById('bulk-target-prep')?.value || '');
    const targetArriveFinal = toIso(document.getElementById('bulk-target-arrive-final')?.value || '');
    let success = 0;
    const failed = [];
    for (const row of selectedRows) {
      const previous = { ...row };
      const next = { ...row };
      if (statusPesanan) next.status_pesanan = statusPesanan;
      if (statusKirim) next.status_pengiriman = statusKirim;
      if (prioritas) next.prioritas = prioritas;
      if (pic) next.pic = pic;
      if (penggarap) next.penggarap = penggarap;
      if (issueNote) next.issue_note = issueNote;
      if (targetPrep) next.target_prep = targetPrep;
      if (targetArriveFinal) next.target_arrive_final = targetArriveFinal;
      next.updated_by = 'Bulk Update Operasional';
      next.last_update_at = new Date().toISOString();
      next.kelengkapan = computeCompleteness(next);
      const validation = getWorkflow()?.validateOrderWorkflow?.(next, previous.status_pesanan);
      if (validation && !validation.ok) {
        failed.push(`${row.po_number}: ${validation.errors.join(', ')}`);
        continue;
      }
      syncOrderInMemory(next);
      success += 1;
      getBridge()?.appendAuditLog?.({ entityType: 'order', entityId: next.id, actionType: 'bulk_update', actorName: 'Bulk Update Operasional', summary: `Bulk update untuk ${next.po_number}`, snapshot: { previousStatus: previous.status_pesanan, nextStatus: next.status_pesanan, prioritas: next.prioritas } });
      try { await getBridge()?.upsertOne?.('orders', next); } catch (_error) {}
    }
    ordersTable?.deselectRow();
    renderSelectionSummary();
    refreshExceptionCenter();
    const modalEl = document.getElementById('bulkUpdatePesananModal');
    if (modalEl && typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    getFeedback()?.toast?.(`Bulk update selesai. Berhasil: ${success}${failed.length ? ` • Gagal: ${failed.length}` : ''}`, failed.length ? 'warning' : 'success', { delay: 4200 }) || alert(`Bulk update selesai. Berhasil: ${success}${failed.length ? `\nGagal: ${failed.length}\n- ${failed.join('\n- ')}` : ''}`);
  }

  function initBulkActions() {
    document.getElementById('btnApplyBulkUpdate')?.addEventListener('click', applyBulkUpdate);
    document.getElementById('btnOpenBulkUpdateModal')?.addEventListener('click', renderSelectionSummary);
  }

  function initDropdowns() {
    if (typeof Choices === 'undefined') return;
    document.querySelectorAll('.searchable-dropdown').forEach((el) => {
      if (el.dataset.choicesApplied === '1') return;
      el.dataset.choicesApplied = '1';
      el.choicesInstance = new Choices(el, { searchEnabled: true, itemSelectText: '', shouldSort: false });
    });
  }

  function initDatepicker() {
    if (typeof flatpickr === 'undefined') return;
    const rangeEl = document.getElementById('filter-po-date-range');
    if (rangeEl && !rangeEl._flatpickr) {
      flatpickr(rangeEl, { mode: 'range', dateFormat: 'd/m/Y' });
    }
    ['status-actual-sent','status-actual-received','status-issue-due-date','bulk-target-prep','bulk-target-arrive-final'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el._flatpickr) flatpickr(el, { dateFormat: 'd/m/Y' });
    });
  }

  function wireDetailButtons() {
    document.getElementById('btnEditPesananFromDetail')?.addEventListener('click', function () {
      const po = document.getElementById('detail-po-number')?.textContent || '';
      openExternalModal('editModal', 'edit-po-title', po);
    });
    document.getElementById('btnUpdateStatusFromDetail')?.addEventListener('click', function () {
      const po = document.getElementById('detail-po-number')?.textContent || '';
      openExternalModal('statusModal', 'modal-po-title', po);
    });
  }



  function initIssueActionHandlers() {
    document.getElementById('detailPesananModal')?.addEventListener('click', async function (event) {
      const resolveBtn = event.target.closest('.resolve-order-issue');
      const deleteBtn = event.target.closest('.delete-order-issue');
      if (!resolveBtn && !deleteBtn) return;
      const po = document.getElementById('detail-po-number')?.textContent || '';
      const order = findOrderByPo(po);
      if (!order) return;
      const issueId = resolveBtn?.dataset.issueId || deleteBtn?.dataset.issueId;
      const currentIssues = getOrderIssuesCache();
      const current = currentIssues.find((item, index) => getIssueIdentity(item, index) === String(issueId || '').trim().toLowerCase());
      if (!current) return;
      if (resolveBtn) {
        const nextIssue = { ...current, status: 'Resolved', resolved_at: new Date().toISOString() };
        persistOrderIssues([nextIssue, ...currentIssues.filter((item, index) => getIssueIdentity(item, index) !== String(issueId || '').trim().toLowerCase())]);
        order.issue_entries = (Array.isArray(order.issue_entries) ? order.issue_entries : []).map((item, index) => getIssueIdentity(item, index) === String(issueId || '').trim().toLowerCase() ? { ...item, status: 'Resolved', resolved_at: new Date().toISOString() } : item);
        syncOrderIssueEntries(order);
        try { await getBridge()?.upsertOne?.('orderIssues', nextIssue); } catch (_error) {}
        getBridge()?.appendAuditLog?.({ entityType: 'order', entityId: order.id, actionType: 'issue_resolved', actorName: 'Detail Pesanan', summary: `Issue ${nextIssue.title} diselesaikan`, snapshot: nextIssue });
      }
      if (deleteBtn) {
        const proceed = await (getFeedback()?.confirm?.('Hapus blocker / exception ini?', { title: 'Hapus blocker / exception', variant: 'warning', confirmText: 'Ya, hapus', cancelText: 'Batal' }) ?? Promise.resolve(window.confirm('Hapus blocker / exception ini?')));
        if (!proceed) return;
        persistOrderIssues(currentIssues.filter((item, index) => getIssueIdentity(item, index) !== String(issueId || '').trim().toLowerCase()));
        order.issue_entries = (Array.isArray(order.issue_entries) ? order.issue_entries : []).filter((item, index) => getIssueIdentity(item, index) !== String(issueId || '').trim().toLowerCase());
        syncOrderIssueEntries(order);
        try { await getBridge()?.deleteOne?.('orderIssues', issueId); } catch (_error) {}
        getBridge()?.appendAuditLog?.({ entityType: 'order', entityId: order.id, actionType: 'issue_delete', actorName: 'Detail Pesanan', summary: `Issue ${current.title} dihapus`, snapshot: current });
      }
      fillDetailModal(syncOrderIssueEntries(order));
      refreshExceptionCenter();
    });
  }

  function initStatusModal() {
    document.getElementById('btnSaveStatusUpdate')?.addEventListener('click', async function () {
      const orderId = document.getElementById('status-order-id')?.value || '';
      const orderIndex = orders.findIndex((item) => String(item.id) === String(orderId));
      if (orderIndex < 0) return;
      const previous = { ...orders[orderIndex] };
      const next = { ...orders[orderIndex] };
      next.status_pesanan = document.getElementById('status-order-status')?.value || previous.status_pesanan;
      next.status_pengiriman = document.getElementById('status-shipping-status')?.value || previous.status_pengiriman;
      next.sales_number = document.getElementById('status-sales-number')?.value || '-';
      next.resi = document.getElementById('status-resi')?.value || '-';
      next.actual_sent = toIso(document.getElementById('status-actual-sent')?.value || '') || previous.actual_sent || '-';
      next.actual_received = toIso(document.getElementById('status-actual-received')?.value || '') || previous.actual_received || '-';
      next.receiver = document.getElementById('status-receiver')?.value || '-';
      next.issue_note = document.getElementById('status-issue-note')?.value || '-';
      if (document.getElementById('upload-sj')?.files?.length) next.doc_sj = 'Sudah';
      if (document.getElementById('upload-bast')?.files?.length) next.doc_bast = 'Sudah';
      next.updated_by = 'Update Status Modal';
      next.last_update_at = new Date().toISOString();
      const createIssue = !!document.getElementById('status-create-issue')?.checked;
      const issueNote = document.getElementById('status-issue-note')?.value || '-';
      next.kelengkapan = computeCompleteness(next);
      next.issue_entries = Array.isArray(previous.issue_entries) ? [...previous.issue_entries] : [];
      const validation = getWorkflow()?.validateOrderWorkflow?.(next, previous.status_pesanan);
      if (validation && !validation.ok) {
        alert('Perubahan status belum bisa disimpan\n- ' + validation.errors.join('\n- '));
        return;
      }
      if (createIssue && issueNote && issueNote !== '-') {
        const issuePayload = {
          id: 'ISS-' + Date.now(),
          order_id: next.id,
          order_no: next.po_number,
          issue_type: document.getElementById('status-issue-type')?.value || 'Exception',
          severity: document.getElementById('status-issue-severity')?.value || 'Sedang',
          title: (document.getElementById('status-issue-type')?.value || 'Exception') + ' - ' + next.po_number,
          description: issueNote,
          owner_name: document.getElementById('status-issue-owner')?.value || next.pic || next.penggarap || 'Tim Operasional',
          due_date: toIso(document.getElementById('status-issue-due-date')?.value || ''),
          status: 'Open',
          created_at: new Date().toISOString(),
        };
        next.issue_entries = [issuePayload, ...next.issue_entries.filter((item, index) => getIssueIdentity(item, index) !== getIssueIdentity(issuePayload, 0))];
        persistOrderIssues([issuePayload, ...getOrderIssuesCache().filter((item, index) => getIssueIdentity(item, index) !== getIssueIdentity(issuePayload, 0))]);
        getBridge()?.upsertOne?.('orderIssues', issuePayload).catch((error) => console.warn('[order-issue-upsert]', error));
      }
      orders[orderIndex] = next;
      persistOrdersData(orders);
      ordersTable?.replaceData(orders);
      fillDetailModal(syncOrderIssueEntries(next));
      getBridge()?.appendAuditLog?.({
        entityType: 'order',
        entityId: next.id,
        actionType: 'status_update',
        actorName: 'Update Status Modal',
        summary: `Status order ${next.po_number} diubah menjadi ${next.status_pesanan}`,
        snapshot: { previousStatus: previous.status_pesanan, nextStatus: next.status_pesanan, shippingStatus: next.status_pengiriman, issueCreated: createIssue },
      });
      try {
        await getBridge()?.upsertOne?.('orders', next);
      } catch (error) {
        alert(error?.message || 'Gagal sinkron ke API, tetapi perubahan lokal sudah tersimpan.');
      }
      const modalEl = document.getElementById('statusModal');
      if (modalEl && typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      refreshExceptionCenter();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('daftar-pesanan-grid')) return;
    orders = getOrdersData();
    savedViews = getSavedViewsCache();
    initDropdowns();
    initDatepicker();
    buildMainTable();
    initFilterButtons();
    initSavedViews();
    initBulkActions();
    wireDetailButtons();
    initIssueActionHandlers();
    initStatusModal();
    orderIssues = getOrderIssuesCache();
    refreshExceptionCenter();
    getBridge()?.refreshCollection?.('orders', { silent: true }).then((rows) => {
      if (!Array.isArray(rows) || !rows.length) return;
      orders = getOrdersData();
      if (ordersTable) {
        ordersTable.replaceData(orders);
        renderSelectionSummary();
      }
    }).catch(() => {});
    getBridge()?.refreshCollection?.('savedViews', { silent: true }).then((rows) => {
      if (Array.isArray(rows) && rows.length) {
        savedViews = rows;
        persistSavedViews(rows);
      }
    }).catch(() => {});
  });
})();
