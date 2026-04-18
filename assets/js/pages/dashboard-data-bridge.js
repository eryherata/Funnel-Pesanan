(function () {
  'use strict';

  function safeJsonParse(value) {
    if (!value || typeof value !== 'string') return null;
    try { return JSON.parse(value); } catch (e) { return null; }
  }

  function getFirstDefined(obj, keys, fallback) {
    if (!obj) return fallback;
    for (var i = 0; i < keys.length; i++) {
      var value = obj[keys[i]];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function parseNumber(value) {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      var cleaned = value.replace(/[^\d,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
      var num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    if (typeof value === 'string') {
      var iso = new Date(value);
      if (!isNaN(iso.getTime())) return iso;
      var m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) {
        var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        if (!isNaN(d.getTime())) return d;
      }
      var m2 = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m2) {
        var d2 = new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
        if (!isNaN(d2.getTime())) return d2;
      }
    }
    return null;
  }

  function normalizeIssueSeverity(value) {
    var text = String(value || '').toLowerCase();
    if (/(krit|critical)/.test(text)) return 'Kritis';
    if (/(tinggi|high)/.test(text)) return 'Tinggi';
    if (/(rendah|low)/.test(text)) return 'Rendah';
    return 'Sedang';
  }

  function compactText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function formatCompactRupiah(value) {
    var num = Number(value) || 0;
    var abs = Math.abs(num);
    var formatted;
    if (abs >= 1000000000) {
      formatted = (num / 1000000000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
    } else if (abs >= 1000000) {
      formatted = (num / 1000000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Jt';
    } else if (abs >= 1000) {
      formatted = (num / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Rb';
    } else {
      formatted = num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    }
    return 'Rp ' + formatted;
  }

  function formatPercent(value, digits) {
    var d = typeof digits === 'number' ? digits : 2;
    return (Number(value) || 0).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
  }

  function slugifyStatus(value) {
    var text = String(value || '').toLowerCase();
    if (/(baru|draft)/.test(text)) return 'Baru';
    if (/(proses|diproses|verifikasi|approval)/.test(text)) return 'Diproses';
    if (/(siap kirim|ready)/.test(text)) return 'Siap Kirim';
    if (/(perjalanan|dikirim|transit)/.test(text)) return 'Dalam Pengiriman';
    if (/(selesai|complete|bast|diterima)/.test(text)) return 'Selesai';
    if (/(kendala|masalah|retur|overdue|terlambat)/.test(text)) return 'Bermasalah';
    return value || 'Diproses';
  }

  function mapShippingStatus(value) {
    var text = String(value || '').toLowerCase();
    if (/(belum|pending)/.test(text)) return 'Belum Diproses';
    if (/(siap|penyiapan|packing)/.test(text)) return 'Penyiapan';
    if (/(perjalanan|transit|dikirim)/.test(text)) return 'Dalam Perjalanan';
    if (/(tiba|sampai|diterima)/.test(text)) return 'Tiba';
    if (/(selesai|bast|complete)/.test(text)) return 'Selesai';
    if (/(kendala|retur|masalah|stuck|overdue)/.test(text)) return 'Terkendala';
    return value || 'Belum Diproses';
  }

  function computeCompleteness(order) {
    var required = ['po_number', 'po_date', 'instansi', 'satker', 'principal', 'pemasok', 'pelaksana'];
    var missing = 0;
    for (var i = 0; i < required.length; i++) {
      if (!order[required[i]]) missing++;
    }
    if (missing === 0) return 'Lengkap';
    if (missing <= 2) return 'Belum Lengkap';
    return 'Perlu Validasi';
  }

  function computeDocCompleteness(order) {
    var missing = 0;
    if (!order.nota_oldist) missing++;
    if (!order.nota_erp) missing++;
    if (!order.delivery_note_uploaded) missing++;
    if (!order.bast_uploaded) missing++;
    if (missing === 0) return 'Lengkap';
    if (missing <= 2) return 'Dokumen Belum Lengkap';
    return 'Kritis';
  }

  function computeRisk(order) {
    if (order.status_order === 'Bermasalah') return true;
    if (order.data_completeness !== 'Lengkap') return true;
    if (order.document_completeness === 'Kritis') return true;
    if (order.netto_value > 0 && order.margin_pct < 8) return true;
    if (order.sla_status === 'Overdue') return true;
    return false;
  }

  function computeSlaStatus(order) {
    var today = new Date();
    var target = order.target_arrive_final;
    var received = order.actual_received_date;
    if (received && target) return received <= target ? 'On Time' : 'Overdue';
    if (!target) return 'Belum Valid';
    var ms = target.getTime() - today.getTime();
    var day = 24 * 60 * 60 * 1000;
    if (ms < 0) return 'Overdue';
    if (ms <= 3 * day) return 'Rawan';
    return 'On Time';
  }

  function deriveIssueCause(order) {
    if (!order.resi_number) return 'Belum ada resi';
    if (!order.delivery_note_uploaded) return 'SJ belum upload';
    if (!order.bast_uploaded && order.shipping_status === 'Selesai') return 'BAST belum upload';
    if (order.shipping_status === 'Terkendala') return order.issue_note || 'Pengiriman terkendala';
    if (!order.receiver_name && order.shipping_status === 'Tiba') return 'Data penerima belum lengkap';
    return '';
  }

  function generateFallbackOrders() {
    var base = [
      ['PO-2026-001','2026-01-12','Bandung','Dinas Pendidikan Kota Bandung','PR-01','PT Alpha Supplies','CV Maju Bersama','Bpk. Arif', 355000000,342500000,'Diproses','Penyiapan','JNE Cargo'],
      ['PO-2026-002','2026-01-18','Semarang','RSUD Semarang','PR-02','PT Beta Medika','CV Sehat Abadi','Ibu Rina', 520000000,498000000,'Siap Kirim','Belum Diproses','Sentral Cargo'],
      ['PO-2026-003','2026-02-03','Makassar','Dinas PUPR Sulsel','PR-01','PT Alpha Supplies','CV Konstruksi Prima','Bpk. Doni', 780000000,742000000,'Dalam Pengiriman','Dalam Perjalanan','Indah Cargo'],
      ['PO-2026-004','2026-02-11','Jakarta','Kementerian Kesehatan','PR-03','PT Gamma Health','CV Nusantara Medika','Ibu Maya', 1250000000,1195000000,'Selesai','Selesai','JNE Cargo'],
      ['PO-2026-005','2026-02-28','Yogyakarta','Dinas Pendidikan DIY','PR-04','PT Edukasi Utama','CV Cerdas Mandiri','Bpk. Rafi', 210000000,198000000,'Diproses','Penyiapan','Dakota'],
      ['PO-2026-006','2026-03-07','Surabaya','RSUD Dr. Soetomo','PR-02','PT Beta Medika','CV Sehat Abadi','Ibu Rina', 640000000,615000000,'Bermasalah','Terkendala','Sentral Cargo'],
      ['PO-2026-007','2026-03-12','Medan','Dinas Kesehatan Medan','PR-03','PT Gamma Health','CV Maju Bersama','Bpk. Arif', 450000000,432000000,'Siap Kirim','Belum Diproses','Lion Parcel'],
      ['PO-2026-008','2026-03-20','Solo','Dinas Sosial Surakarta','PR-05','PT Mitra Pangan','CV Pangan Makmur','Bpk. Yudha', 180000000,171500000,'Baru','Belum Diproses','J&T Cargo'],
      ['PO-2026-009','2026-03-26','Balikpapan','Dinas Pendidikan Balikpapan','PR-04','PT Edukasi Utama','CV Cerdas Mandiri','Bpk. Rafi', 390000000,376000000,'Dalam Pengiriman','Dalam Perjalanan','Dakota'],
      ['PO-2026-010','2026-04-02','Denpasar','RSUP Bali','PR-02','PT Beta Medika','CV Medika Sentosa','Ibu Nia', 870000000,835000000,'Diproses','Penyiapan','Sentral Cargo'],
      ['PO-2026-011','2026-04-04','Padang','Dinas PUPR Sumbar','PR-01','PT Alpha Supplies','CV Infrastruktur Andalan','Bpk. Doni', 730000000,702000000,'Siap Kirim','Belum Diproses','Indah Cargo'],
      ['PO-2026-012','2026-04-09','Bogor','Dinas Pendidikan Bogor','PR-04','PT Edukasi Utama','CV Cerdas Mandiri','Bpk. Rafi', 305000000,291000000,'Dalam Pengiriman','Dalam Perjalanan','JNE Cargo']
    ];

    return base.map(function (row, index) {
      var brutto = row[8];
      var netto = row[9];
      var poDate = parseDate(row[1]);
      var targetPrep = new Date(poDate.getFullYear(), poDate.getMonth(), poDate.getDate() + 7);
      var targetFirst = new Date(poDate.getFullYear(), poDate.getMonth(), poDate.getDate() + 12);
      var targetFinal = new Date(poDate.getFullYear(), poDate.getMonth(), poDate.getDate() + 18);
      var shippingStatus = row[11];
      var actualSent = /Dalam Perjalanan|Selesai|Tiba/.test(shippingStatus) ? new Date(poDate.getFullYear(), poDate.getMonth(), poDate.getDate() + 10) : null;
      var actualReceived = /Selesai|Tiba/.test(shippingStatus) ? new Date(poDate.getFullYear(), poDate.getMonth(), poDate.getDate() + 16) : null;
      return {
        id: index + 1,
        po_number: row[0],
        po_date: poDate,
        kabupaten_kota: row[2],
        satker: row[3],
        instansi: row[3],
        principal: row[4],
        pemasok: row[5],
        pelaksana: row[6],
        pic_omset: row[7],
        brutto_value: brutto,
        netto_value: netto || parseNumber(getFirstDefined(raw, ['nilai', 'nilai_po'], 0)),
        nego_value: brutto - netto,
        ongkir_value: Math.round(brutto * 0.02),
        margin_value: Math.round(netto * 0.11),
        margin_pct: (Math.round(netto * 0.11) / netto) * 100,
        status_order: row[10],
        shipping_status: row[11],
        ekspedisi_name: row[12],
        kode_rup: 'RUP-' + (1000 + index),
        nama_pengadaan: 'Pengadaan ' + row[3],
        sumber_dana: index % 2 === 0 ? 'APBD' : 'DAK',
        ppn_mode: 'PPN',
        distributor: 'PT Distribusi ' + (index % 3 === 0 ? 'Makmur' : 'Sentosa'),
        penggarap: row[7],
        nota_oldist: index % 4 === 0 ? '' : 'OLD-' + (200 + index),
        nota_erp: index % 5 === 0 ? '' : 'ERP-' + (500 + index),
        target_prep_date: targetPrep,
        target_arrive_first: targetFirst,
        target_arrive_final: targetFinal,
        sales_number: 'SO-' + (3000 + index),
        resi_number: /Belum Diproses|Penyiapan/.test(shippingStatus) ? '' : 'RESI-' + (9000 + index),
        actual_sent_date: actualSent,
        actual_received_date: actualReceived,
        receiver_name: actualReceived ? 'Penerima ' + (index + 1) : '',
        delivery_note_uploaded: index % 3 !== 0,
        bast_uploaded: /Selesai/.test(shippingStatus) && index % 4 !== 0,
        issue_note: row[10] === 'Bermasalah' ? 'Pengiriman terlambat dan butuh klarifikasi vendor' : '',
        last_update_at: new Date(2026, 3, Math.max(1, 10 + index)),
        fee_total: Math.round(netto * 0.03),
        no_calculation: index % 6 === 0
      };
    });
  }

  function normalizeOrder(raw, index) {
    var poDate = parseDate(getFirstDefined(raw, ['po_date', 'tanggal_po', 'poDate', 'tgl_po', 'tgl_iso', 'tgl', 'date'], null));
    var brutto = parseNumber(getFirstDefined(raw, ['brutto_value', 'brutto', 'nilai_tayang', 'tayang_total', 'total_tayang', 'gross_value'], 0));
    var netto = parseNumber(getFirstDefined(raw, ['netto_value', 'netto', 'nilai_kontrak', 'kontrak_total', 'total_kontrak', 'net_value'], 0));
    if (!brutto && netto) brutto = netto;
    if (!netto && brutto) netto = brutto;
    var marginValue = parseNumber(getFirstDefined(raw, ['margin_value', 'profit_bersih', 'net_profit', 'margin'], 0));
    var normalized = {
      id: getFirstDefined(raw, ['id'], index + 1),
      po_number: getFirstDefined(raw, ['po_number', 'po', 'no_po', 'nomor_po', 'poNumber'], 'PO-' + (index + 1)),
      po_date: poDate,
      kabupaten_kota: getFirstDefined(raw, ['kabupaten_kota', 'wilayah', 'region', 'kota'], ''),
      satker: getFirstDefined(raw, ['satker', 'satuan_kerja', 'instansi', 'dinas'], ''),
      instansi: getFirstDefined(raw, ['instansi', 'satker', 'satuan_kerja'], ''),
      principal: getFirstDefined(raw, ['principal'], ''),
      pemasok: getFirstDefined(raw, ['pemasok', 'supplier', 'vendor'], ''),
      pelaksana: getFirstDefined(raw, ['pelaksana', 'executor'], ''),
      distributor: getFirstDefined(raw, ['distributor'], ''),
      penggarap: getFirstDefined(raw, ['penggarap', 'pic'], ''),
      pic_omset: getFirstDefined(raw, ['pic_omset', 'pic', 'sales_pic'], ''),
      kode_rup: getFirstDefined(raw, ['kode_rup', 'rup'], ''),
      nama_pengadaan: getFirstDefined(raw, ['nama_pengadaan', 'pengadaan_name', 'judul'], ''),
      sumber_dana: getFirstDefined(raw, ['sumber_dana', 'fund_source'], ''),
      ppn_mode: getFirstDefined(raw, ['ppn_mode', 'pajak', 'tax_mode'], 'PPN'),
      nota_oldist: getFirstDefined(raw, ['nota_oldist'], ''),
      nota_erp: getFirstDefined(raw, ['nota_erp', 'erp'], ''),
      brutto_value: brutto,
      netto_value: netto || parseNumber(getFirstDefined(raw, ['nilai', 'nilai_po'], 0)),
      nego_value: parseNumber(getFirstDefined(raw, ['nego_value', 'negosiasi', 'nego_total'], Math.max(brutto - netto, 0))),
      ongkir_value: parseNumber(getFirstDefined(raw, ['ongkir_value', 'biaya_kirim', 'ongkir'], 0)),
      margin_value: marginValue || Math.round(netto * 0.1),
      margin_pct: 0,
      status_order: slugifyStatus(getFirstDefined(raw, ['status_order', 'status'], 'Diproses')),
      shipping_status: mapShippingStatus(getFirstDefined(raw, ['shipping_status', 'status_pengiriman', 'shipment_stage'], 'Belum Diproses')),
      ekspedisi_name: getFirstDefined(raw, ['ekspedisi_name', 'ekspedisi', 'vendor_ekspedisi'], ''),
      target_prep_date: parseDate(getFirstDefined(raw, ['target_prep_date', 'batas_penyiapan_barang'], null)),
      target_arrive_first: parseDate(getFirstDefined(raw, ['target_arrive_first', 'batas_tiba_tujuan_pertama'], null)),
      target_arrive_final: parseDate(getFirstDefined(raw, ['target_arrive_final', 'batas_tiba_tujuan_akhir', 'sla_target_iso', 'sla_target'], null)),
      sales_number: getFirstDefined(raw, ['sales_number', 'nomor_penjualan', 'so_number'], ''),
      resi_number: getFirstDefined(raw, ['resi_number', 'nomor_resi', 'resi'], ''),
      actual_sent_date: parseDate(getFirstDefined(raw, ['actual_sent_date', 'tgl_aktual_dikirim'], null)),
      actual_received_date: parseDate(getFirstDefined(raw, ['actual_received_date', 'tgl_aktual_diterima'], null)),
      receiver_name: getFirstDefined(raw, ['receiver_name', 'nama_penerima'], ''),
      delivery_note_uploaded: Boolean(getFirstDefined(raw, ['delivery_note_uploaded', 'surat_jalan', 'sj_uploaded'], false)),
      bast_uploaded: Boolean(getFirstDefined(raw, ['bast_uploaded', 'bast'], false)),
      issue_note: getFirstDefined(raw, ['issue_note', 'catatan_kendala', 'kendala', 'delay_cause'], ''),
      last_update_at: parseDate(getFirstDefined(raw, ['last_update_at', 'updated_at', 'last_update_iso', 'last_update'], null)),
      fee_total: parseNumber(getFirstDefined(raw, ['fee_total'], parseNumber(getFirstDefined(raw,['fee_pelaksana'],0))+parseNumber(getFirstDefined(raw,['fee_distributor'],0))+parseNumber(getFirstDefined(raw,['fee_pemasok'],0)) || Math.round(netto * 0.03))),
      no_calculation: Boolean(getFirstDefined(raw, ['no_calculation'], false))
    };

    normalized.margin_pct = normalized.netto_value ? (normalized.margin_value / normalized.netto_value) * 100 : 0;
    normalized.data_completeness = computeCompleteness(normalized);
    normalized.document_completeness = computeDocCompleteness(normalized);
    normalized.sla_status = computeSlaStatus(normalized);
    normalized.risk_flag = computeRisk(normalized);
    normalized.issue_cause = deriveIssueCause(normalized);
    return normalized;
  }

  function loadRawOrders() {
    var bridgeOrders = window.DataSystemBridge && typeof window.DataSystemBridge.getCachedCollection === 'function' ? window.DataSystemBridge.getCachedCollection('orders') : null;
    var sources = [bridgeOrders, window.__ORDERS_DATA__, window.__APP_PESANAN_ROWS, window.ordersData, window.daftarPesananData, window.mockOrders];
    var keys = ['datasystem_orders', 'ordersData', 'orders', 'pesananData', 'daftarPesananData', 'pantauanPesananData'];
    for (var i = 0; i < keys.length; i++) {
      var parsed = safeJsonParse(window.localStorage.getItem(keys[i]));
      if (Array.isArray(parsed) && parsed.length) sources.push(parsed);
    }
    var merged = [];
    var seen = {};
    sources.forEach(function (src) {
      if (!Array.isArray(src) || !src.length) return;
      src.forEach(function (row, index) {
        var identity = String((row && (row.po_number || row.po || row.no_po || row.order_no || row.nomor_po || row.id)) || ('order-' + (index + 1))).trim().toLowerCase();
        if (seen[identity]) return;
        seen[identity] = true;
        merged.push(row);
      });
    });
    return merged.length ? merged : generateFallbackOrders();
  }

  function getNormalizedOrders() {
    var raw = loadRawOrders();
    var normalizedByMaster = window.DataSystemMasterNormalizer && typeof window.DataSystemMasterNormalizer.normalizeRows === 'function'
      ? window.DataSystemMasterNormalizer.normalizeRows(raw)
      : raw;
    return normalizedByMaster.map(normalizeOrder);
  }

  function uniqueValues(data, field) {
    var seen = {};
    var out = [];
    data.forEach(function (row) {
      var value = row[field];
      if (!value) return;
      if (seen[value]) return;
      seen[value] = true;
      out.push(value);
    });
    return out.sort();
  }

  function filterByPeriod(data, periodLabel, dateField) {
    var label = String(periodLabel || '').toLowerCase();
    if (!label || /semua/.test(label)) return data.slice();
    var now = new Date();
    var start;
    if (/3 bulan/.test(label)) {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (/tahun/.test(label)) {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return data.filter(function (row) {
      var d = row[dateField] || row.po_date;
      return d instanceof Date && !isNaN(d.getTime()) && d >= start && d <= now;
    });
  }


  function computeAgingDays(startDate, endDate) {
    var start = parseDate(startDate);
    var end = parseDate(endDate) || new Date();
    if (!(start instanceof Date) || isNaN(start.getTime())) return 0;
    if (!(end instanceof Date) || isNaN(end.getTime())) end = new Date();
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
  }

  function getOrderAgingDays(order) {
    if (!order) return 0;
    return computeAgingDays(order.po_date || order.created_at, order.actual_received_date || new Date());
  }

  function getOutstandingValue(order) {
    if (!order) return 0;
    return order.status_order === 'Selesai' ? 0 : (Number(order.netto_value) || 0);
  }

  function classifyDelayTaxonomy(order) {
    if (!order) return 'Belum terklasifikasi';
    var note = String(order.issue_note || '').toLowerCase();
    var shipping = String(order.shipping_status || '').toLowerCase();
    var sla = String(order.sla_status || '').toLowerCase();
    if (!order.target_arrive_final) return 'Target / SLA belum valid';
    if (!order.resi_number || !order.delivery_note_uploaded || (!order.bast_uploaded && /tiba|selesai/.test(shipping))) return 'Dokumen pengiriman';
    if (/ekspedisi|kurir|armada|logistik|cargo|transit/.test(note) || /terkendala/.test(shipping)) return 'Ekspedisi / transport';
    if (/stok|barang|gudang|packing|penyiapan|produksi/.test(note)) return 'Kesiapan barang';
    if (/vendor|supplier|pelaksana|principal|mitra/.test(note)) return 'Vendor / mitra';
    if (/alamat|tujuan|penerima|site|lokasi/.test(note) || (!order.receiver_name && /tiba/.test(shipping))) return 'Koordinasi penerima';
    if (/approval|approve|administrasi|dokumen|sj|bast|invoice|faktur|kontrak/.test(note)) return 'Administrasi internal';
    if (/overdue/.test(sla)) return 'Lead time / SLA';
    return 'Lainnya / perlu klarifikasi';
  }

  function classifyDelayRootCause(order) {
    if (!order) return 'Belum terklasifikasi';
    var note = String(order.issue_note || '').toLowerCase();
    var shipping = String(order.shipping_status || '').toLowerCase();
    var sla = String(order.sla_status || '').toLowerCase();
    if (!order.target_arrive_final) return 'Target SLA belum valid';
    if (!order.resi_number) return 'Resi belum dibuat';
    if (!order.delivery_note_uploaded) return 'Surat jalan belum upload';
    if (!order.bast_uploaded && /selesai|tiba/.test(shipping)) return 'BAST belum upload';
    if (!order.receiver_name && /tiba/.test(shipping)) return 'Data penerima belum lengkap';
    if (/vendor|supplier|pelaksana/.test(note)) return 'Koordinasi vendor';
    if (/ekspedisi|kurir|armada|logistik|cargo/.test(note)) return 'Kendala ekspedisi';
    if (/stok|barang|gudang|packing|penyiapan/.test(note)) return 'Barang belum siap';
    if (/dokumen|sj|bast|invoice|faktur/.test(note)) return 'Dokumen belum lengkap';
    if (/alamat|tujuan|penerima|site/.test(note)) return 'Koordinasi lokasi penerima';
    if (/terkendala/.test(shipping)) return 'Kendala ekspedisi';
    if (/overdue/.test(sla)) return 'Lead time melebihi target';
    return 'Perlu klarifikasi lanjutan';
  }

  function classifyFunnelLostReason(funnel) {
    if (!funnel) return 'Belum terklasifikasi';
    var text = [funnel.status, funnel.stage, funnel.riskNote, funnel.notes, funnel.nextAction].join(' ').toLowerCase();
    if (!/lost|kalah|batal/.test(text)) return 'Aktif / belum lost';
    if (/harga|price|murah|diskon|kompetitor/.test(text)) return 'Kalah harga';
    if (/spesifikasi|teknis|brand|merk|produk/.test(text)) return 'Spesifikasi / teknis';
    if (/anggaran|budget|pagu|refocusing|dana/.test(text)) return 'Anggaran / pagu';
    if (/jadwal|timeline|waktu|mundur|terlambat/.test(text)) return 'Jadwal / timeline';
    if (/dokumen|syarat|administrasi|legal|izin/.test(text)) return 'Dokumen / administrasi';
    if (/vendor|principal|supplier|pelaksana|mitra/.test(text)) return 'Kesiapan mitra / vendor';
    if (/batal|cancel|arsip|tidak lanjut/.test(text)) return 'Dibatalkan / tidak lanjut';
    return 'Lainnya / belum terkategori';
  }

  function getDaysUntil(targetDate, baseDate) {
    var target = parseDate(targetDate);
    var base = parseDate(baseDate) || new Date();
    if (!(target instanceof Date) || isNaN(target.getTime())) return null;
    if (!(base instanceof Date) || isNaN(base.getTime())) base = new Date();
    return Math.floor((target.getTime() - base.getTime()) / 86400000);
  }

  function getForecastBucket(days, mode) {
    if (days == null || isNaN(days)) return 'Belum valid';
    var kind = String(mode || 'shipment').toLowerCase();
    if (kind === 'closing') {
      if (days <= 30) return '<=30 hari';
      if (days <= 60) return '31-60 hari';
      if (days <= 90) return '61-90 hari';
      return '>90 hari';
    }
    if (days <= 7) return '<=7 hari';
    if (days <= 14) return '8-14 hari';
    if (days <= 30) return '15-30 hari';
    return '>30 hari';
  }

  function getClosingForecastDate(funnel) {
    if (!funnel) return null;
    return parseDate(funnel.targetClosing || funnel.followUpDate || funnel.inputDate);
  }

  function getShipmentForecastDate(order) {
    if (!order || order.status_order === 'Selesai') return null;
    return parseDate(order.target_arrive_final || order.target_arrive_first || order.target_prep_date);
  }

  function getAgeBucket(days, mode) {
    var kind = String(mode || 'order').toLowerCase();
    if (kind === 'funnel') {
      if (days <= 7) return '0-7 hari';
      if (days <= 14) return '8-14 hari';
      if (days <= 30) return '15-30 hari';
      return '>30 hari';
    }
    if (days <= 7) return '0-7 hari';
    if (days <= 14) return '8-14 hari';
    if (days <= 30) return '15-30 hari';
    if (days <= 60) return '31-60 hari';
    return '>60 hari';
  }

  function normalizeFunnel(raw, index) {
    var stage = getFirstDefined(raw, ['stage', 'tahap', 'funnel_stage'], 'Lead Masuk');
    var status = getFirstDefined(raw, ['status', 'funnel_status'], 'Aktif');
    var closeDate = parseDate(getFirstDefined(raw, ['actual_close_date', 'actualCloseDate', 'close_date', 'closeDate', 'converted_at', 'convertedAt'], null));
    if (!closeDate && /won|deal|menang/.test(String(status + ' ' + stage).toLowerCase())) {
      closeDate = parseDate(getFirstDefined(raw, ['lastUpdate', 'updated_at', 'updatedAt'], null));
    }
    return {
      id: getFirstDefined(raw, ['id', 'funnel_id', 'code'], 'FUN-' + (index + 1)),
      inputDate: parseDate(getFirstDefined(raw, ['inputDate', 'created_at', 'createdAt', 'input_date', 'tanggal_input'], null)),
      namaPengadaan: getFirstDefined(raw, ['namaPengadaan', 'nama_pengadaan', 'pengadaan', 'judul'], ''),
      kodeRup: getFirstDefined(raw, ['kodeRup', 'kode_rup', 'rup'], ''),
      wilayah: getFirstDefined(raw, ['wilayah', 'region', 'province'], ''),
      kabupatenKota: getFirstDefined(raw, ['kabupatenKota', 'kabupaten_kota', 'kota', 'city'], ''),
      instansi: getFirstDefined(raw, ['instansi', 'dinas'], ''),
      satker: getFirstDefined(raw, ['satker', 'satuan_kerja'], ''),
      principal: getFirstDefined(raw, ['principal'], ''),
      pemasok: getFirstDefined(raw, ['pemasok', 'supplier', 'vendor'], ''),
      distributor: getFirstDefined(raw, ['distributor'], ''),
      pelaksana: getFirstDefined(raw, ['pelaksana', 'executor'], ''),
      picOmset: getFirstDefined(raw, ['picOmset', 'pic_omset', 'pic'], ''),
      penggarap: getFirstDefined(raw, ['penggarap', 'owner'], ''),
      estimasiBrutto: parseNumber(getFirstDefined(raw, ['estimasiBrutto', 'estimasi_brutto', 'brutto_value', 'gross_value'], 0)),
      estimasiNetto: parseNumber(getFirstDefined(raw, ['estimasiNetto', 'estimasi_netto', 'netto_value', 'net_value'], 0)),
      estimasiNegosiasi: parseNumber(getFirstDefined(raw, ['estimasiNegosiasi', 'estimasi_negosiasi', 'nego_value'], 0)),
      probability: parseNumber(getFirstDefined(raw, ['probability', 'probabilitas'], 0)),
      stage: stage,
      status: status,
      priority: getFirstDefined(raw, ['priority', 'prioritas'], ''),
      targetClosing: parseDate(getFirstDefined(raw, ['targetClosing', 'target_closing', 'closing_target', 'expected_close_date'], null)),
      followUpDate: parseDate(getFirstDefined(raw, ['followUpDate', 'follow_up_date', 'next_follow_up'], null)),
      converted: Boolean(getFirstDefined(raw, ['converted'], false)),
      convertedOrderNo: getFirstDefined(raw, ['convertedOrderNo', 'converted_order_no', 'order_no'], ''),
      riskNote: getFirstDefined(raw, ['riskNote', 'risk_note', 'risiko'], ''),
      notes: getFirstDefined(raw, ['notes', 'catatan'], ''),
      nextAction: getFirstDefined(raw, ['nextAction', 'next_action'], ''),
      lastUpdate: parseDate(getFirstDefined(raw, ['lastUpdate', 'updated_at', 'updatedAt'], null)),
      closeDate: closeDate
    };
  }

  function loadRawFunnels() {
    var bridgeFunnels = window.DataSystemBridge && typeof window.DataSystemBridge.getCachedCollection === 'function' ? window.DataSystemBridge.getCachedCollection('funnels') : null;
    var sources = [bridgeFunnels, window.__FUNNELS_DATA__, window.funnelData, window.daftarFunnelData, window.pipelineData];
    var keys = ['datasystem_funnels', 'funnelsData', 'funnelData', 'daftarFunnelData', 'pipelineData'];
    for (var i = 0; i < keys.length; i++) {
      var parsed = safeJsonParse(window.localStorage.getItem(keys[i]));
      if (Array.isArray(parsed) && parsed.length) sources.push(parsed);
    }
    var merged = [];
    var seen = {};
    sources.forEach(function (src) {
      if (!Array.isArray(src) || !src.length) return;
      src.forEach(function (row, index) {
        var identity = compactText((row && (row.id || row.funnel_id || row.code || row.namaPengadaan || row.nama_pengadaan)) || ('funnel-' + (index + 1)));
        if (seen[identity]) return;
        seen[identity] = true;
        merged.push(row);
      });
    });
    return merged;
  }

  function getNormalizedFunnels() {
    var raw = loadRawFunnels();
    var normalizedByMaster = window.DataSystemMasterNormalizer && typeof window.DataSystemMasterNormalizer.normalizeRows === 'function'
      ? window.DataSystemMasterNormalizer.normalizeRows(raw)
      : raw;
    return normalizedByMaster.map(normalizeFunnel);
  }

  function loadRawOrderIssues() {
    var bridgeIssues = window.DataSystemBridge && typeof window.DataSystemBridge.getCachedCollection === 'function' ? window.DataSystemBridge.getCachedCollection('orderIssues') : null;
    var sources = [bridgeIssues, window.__ORDER_ISSUES__];
    var keys = ['ds_order_issues', 'datasystem_order_issues', 'orderIssues'];
    for (var i = 0; i < keys.length; i++) {
      var parsed = safeJsonParse(window.localStorage.getItem(keys[i]));
      if (Array.isArray(parsed) && parsed.length) sources.push(parsed);
    }
    var merged = [];
    var seen = {};
    sources.forEach(function (src) {
      if (!Array.isArray(src) || !src.length) return;
      src.forEach(function (row, index) {
        var identity = compactText((row && (row.id || row.issue_id || row.title || row.created_at)) || ('issue-' + (index + 1)));
        if (seen[identity]) return;
        seen[identity] = true;
        merged.push(row);
      });
    });
    return merged;
  }

  function normalizeOrderIssue(raw, index) {
    return {
      id: getFirstDefined(raw, ['id', 'issue_id'], 'issue-' + (index + 1)),
      order_no: getFirstDefined(raw, ['order_no', 'po_number'], ''),
      issue_type: getFirstDefined(raw, ['issue_type', 'type'], 'Exception'),
      severity: normalizeIssueSeverity(getFirstDefined(raw, ['severity'], 'Sedang')),
      title: getFirstDefined(raw, ['title', 'summary'], 'Issue'),
      description: getFirstDefined(raw, ['description', 'note', 'catatan'], ''),
      owner_name: getFirstDefined(raw, ['owner_name', 'owner'], ''),
      due_date: parseDate(getFirstDefined(raw, ['due_date', 'target_resolution'], null)),
      status: getFirstDefined(raw, ['status'], 'Open'),
      resolved_at: parseDate(getFirstDefined(raw, ['resolved_at'], null)),
      created_at: parseDate(getFirstDefined(raw, ['created_at', 'createdAt'], null))
    };
  }

  function getNormalizedOrderIssues() {
    return loadRawOrderIssues().map(normalizeOrderIssue);
  }

  function getForecastAccuracyLabel(targetDate, actualDate, mode) {
    var target = parseDate(targetDate);
    var actual = parseDate(actualDate);
    if (!(target instanceof Date) || isNaN(target.getTime()) || !(actual instanceof Date) || isNaN(actual.getTime())) return 'Belum valid';
    var tolerance = String(mode || 'shipment').toLowerCase() === 'closing' ? 14 : 7;
    var diff = Math.round((actual.getTime() - target.getTime()) / 86400000);
    if (Math.abs(diff) <= tolerance) return 'Sesuai Forecast';
    if (diff < -tolerance) return 'Lebih Cepat';
    if (diff <= 30) return 'Mundur 1-30 hari';
    return 'Mundur >30 hari';
  }

  function getForecastAccuracyRate(rows, mode, targetAccessor, actualAccessor) {
    var data = Array.isArray(rows) ? rows : [];
    var valid = 0;
    var accurate = 0;
    data.forEach(function (row) {
      var label = getForecastAccuracyLabel(targetAccessor(row), actualAccessor(row), mode);
      if (label === 'Belum valid') return;
      valid += 1;
      if (label === 'Sesuai Forecast') accurate += 1;
    });
    return { valid: valid, accurate: accurate, rate: valid ? (accurate / valid) * 100 : 0 };
  }

  function getExecutiveSummary() {
    var orders = getNormalizedOrders();
    var funnels = getNormalizedFunnels();
    var issues = getNormalizedOrderIssues();
    var activeFunnels = funnels.filter(function (row) { return !/closed|won|lost|batal|arsip/i.test(String(row.status || '')); });
    var wonFunnels = funnels.filter(function (row) { return /won|deal|menang/i.test(String((row.status || '') + ' ' + (row.stage || ''))); });
    var activeOrders = orders.filter(function (row) { return row.status_order !== 'Selesai'; });
    var activeShipments = orders.filter(function (row) { return row.status_order !== 'Selesai'; });
    var openIssues = issues.filter(function (row) { return String(row.status || 'Open').toLowerCase() !== 'resolved'; });
    var funnelAccuracy = getForecastAccuracyRate(wonFunnels, 'closing', function (row) { return row.targetClosing; }, function (row) { return row.closeDate || row.lastUpdate; });
    var shipmentAccuracy = getForecastAccuracyRate(orders.filter(function (row) { return row.status_order === 'Selesai'; }), 'shipment', function (row) { return row.target_arrive_final; }, function (row) { return row.actual_received_date; });
    var criticalIssues = openIssues.filter(function (row) { return ['Kritis', 'Tinggi'].indexOf(normalizeIssueSeverity(row.severity)) !== -1; });
    var overdueIssues = openIssues.filter(function (row) { return row.due_date instanceof Date && !isNaN(row.due_date.getTime()) && row.due_date < new Date(); });
    var exceptionCategoryMap = {};
    activeOrders.forEach(function (row) {
      if (!(row.sla_status === 'Overdue' || row.shipping_status === 'Terkendala' || row.status_order === 'Bermasalah')) return;
      var category = classifyDelayTaxonomy(row);
      if (!exceptionCategoryMap[category]) exceptionCategoryMap[category] = { category: category, orders: 0, outstanding: 0 };
      exceptionCategoryMap[category].orders += 1;
      exceptionCategoryMap[category].outstanding += getOutstandingValue(row);
    });
    return {
      funnel: {
        active: activeFunnels.length,
        weighted: activeFunnels.reduce(function (sum, row) { return sum + ((Number(row.estimasiNetto) || 0) * ((Number(row.probability) || 0) / 100)); }, 0),
        stagnant: activeFunnels.filter(function (row) { return computeAgingDays(row.lastUpdate || row.inputDate, new Date()) > 14; }).length,
        overdueFollowUp: activeFunnels.filter(function (row) { return row.followUpDate instanceof Date && !isNaN(row.followUpDate.getTime()) && row.followUpDate < new Date(); }).length,
        conversionRate: (wonFunnels.length / Math.max(1, wonFunnels.length + funnels.filter(function (row) { return /lost|kalah|batal/i.test(String((row.status || '') + ' ' + (row.stage || ''))); }).length)) * 100,
        forecastAccuracy: funnelAccuracy.rate,
        forecastAccuracyValid: funnelAccuracy.valid
      },
      order: {
        active: activeOrders.length,
        outstanding: activeOrders.reduce(function (sum, row) { return sum + getOutstandingValue(row); }, 0),
        overdue: activeOrders.filter(function (row) { return row.sla_status === 'Overdue'; }).length,
        blocked: activeOrders.filter(function (row) { return row.status_order === 'Bermasalah' || row.shipping_status === 'Terkendala'; }).length
      },
      logistic: {
        active: activeShipments.length,
        inTransit: activeShipments.filter(function (row) { return row.shipping_status === 'Dalam Perjalanan'; }).length,
        noResi: activeShipments.filter(function (row) { return !row.resi_number; }).length,
        overdue: activeShipments.filter(function (row) { return row.sla_status === 'Overdue'; }).length,
        forecastAccuracy: shipmentAccuracy.rate,
        forecastAccuracyValid: shipmentAccuracy.valid
      },
      exception: {
        open: openIssues.length,
        critical: criticalIssues.length,
        overdue: overdueIssues.length,
        categories: Object.keys(exceptionCategoryMap).map(function (key) { return exceptionCategoryMap[key]; }).sort(function (a, b) { return b.orders - a.orders || b.outstanding - a.outstanding; }).slice(0, 5)
      }
    };
  }

  function createEmptyMessage(containerId, message) {
    var el = document.getElementById(containerId);
    if (el) {
      el.innerHTML = '<div class="text-center text-muted py-5">' + message + '</div>';
    }
  }

  window.DashboardDataBridge = {
    parseNumber: parseNumber,
    parseDate: parseDate,
    formatCompactRupiah: formatCompactRupiah,
    formatPercent: formatPercent,
    getFirstDefined: getFirstDefined,
    normalizeOrder: normalizeOrder,
    getNormalizedOrders: getNormalizedOrders,
    uniqueValues: uniqueValues,
    filterByPeriod: filterByPeriod,
    computeAgingDays: computeAgingDays,
    getOrderAgingDays: getOrderAgingDays,
    getOutstandingValue: getOutstandingValue,
    classifyDelayRootCause: classifyDelayRootCause,
    classifyDelayTaxonomy: classifyDelayTaxonomy,
    classifyFunnelLostReason: classifyFunnelLostReason,
    getDaysUntil: getDaysUntil,
    getForecastBucket: getForecastBucket,
    getClosingForecastDate: getClosingForecastDate,
    getShipmentForecastDate: getShipmentForecastDate,
    getAgeBucket: getAgeBucket,
    getNormalizedFunnels: getNormalizedFunnels,
    getNormalizedOrderIssues: getNormalizedOrderIssues,
    getForecastAccuracyLabel: getForecastAccuracyLabel,
    getForecastAccuracyRate: getForecastAccuracyRate,
    getExecutiveSummary: getExecutiveSummary,
    normalizeIssueSeverity: normalizeIssueSeverity,
    createEmptyMessage: createEmptyMessage
  };
})();
