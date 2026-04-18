function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export const ORDER_STATUS_OPTIONS = [
  'Baru',
  'Validasi Data',
  'Diproses',
  'Siap Kirim',
  'Dalam Pengiriman',
  'Selesai',
  'Bermasalah',
];

export const SHIPPING_STATUS_OPTIONS = [
  'Belum Diproses',
  'Penyiapan',
  'Dalam Perjalanan',
  'Tiba',
  'BAST',
  'Terkendala',
];

export const FUNNEL_STAGE_OPTIONS = [
  'Lead Masuk',
  'Kualifikasi',
  'Tayang / Penawaran',
  'Negosiasi',
  'Menunggu Keputusan',
  'Menang / Deal',
  'Kalah / Batal',
];

export const FUNNEL_STATUS_OPTIONS = [
  'Aktif',
  'Pending',
  'Closed Won',
  'Closed Lost',
  'Arsip',
];

export const PRIORITY_OPTIONS = ['Rendah', 'Normal', 'Tinggi', 'Perlu Follow Up'];

export const ORDER_STATUS_TRANSITIONS = {
  Baru: ['Baru', 'Validasi Data', 'Diproses', 'Bermasalah'],
  'Validasi Data': ['Validasi Data', 'Diproses', 'Bermasalah'],
  Diproses: ['Diproses', 'Siap Kirim', 'Bermasalah'],
  'Siap Kirim': ['Siap Kirim', 'Dalam Pengiriman', 'Bermasalah'],
  'Dalam Pengiriman': ['Dalam Pengiriman', 'Selesai', 'Bermasalah'],
  Bermasalah: ['Bermasalah', 'Diproses', 'Siap Kirim', 'Dalam Pengiriman', 'Selesai'],
  Selesai: ['Selesai'],
};

export function normalizeOrderStatus(value) {
  const text = normalizeText(value);
  if (/(baru|draft)/.test(text)) return 'Baru';
  if (/(validasi|verifikasi)/.test(text)) return 'Validasi Data';
  if (/(siap kirim|ready)/.test(text)) return 'Siap Kirim';
  if (/(perjalanan|dikirim|transit)/.test(text)) return 'Dalam Pengiriman';
  if (/(selesai|bast|diterima|complete|closing)/.test(text)) return 'Selesai';
  if (/(kendala|masalah|retur|overdue|terlambat)/.test(text)) return 'Bermasalah';
  if (/(proses|diproses|approval|kontrak|penyiapan|nego|negosiasi)/.test(text)) return 'Diproses';
  return value || 'Baru';
}

export function normalizeShippingStatus(value) {
  const text = normalizeText(value);
  if (!text || /(belum|pending)/.test(text)) return 'Belum Diproses';
  if (/(siap|penyiapan|packing)/.test(text)) return 'Penyiapan';
  if (/(perjalanan|transit|dikirim)/.test(text)) return 'Dalam Perjalanan';
  if (/(tiba|sampai|diterima)/.test(text)) return 'Tiba';
  if (/(selesai|bast|complete)/.test(text)) return 'BAST';
  if (/(kendala|retur|masalah|stuck|overdue)/.test(text)) return 'Terkendala';
  return value || 'Belum Diproses';
}

export function normalizeFunnelStage(value) {
  const text = normalizeText(value);
  if (/(lead)/.test(text)) return 'Lead Masuk';
  if (/(kualifikasi|qualif)/.test(text)) return 'Kualifikasi';
  if (/(tayang|penawaran|proposal)/.test(text)) return 'Tayang / Penawaran';
  if (/(nego|negosiasi)/.test(text)) return 'Negosiasi';
  if (/(keputusan|approval|review akhir)/.test(text)) return 'Menunggu Keputusan';
  if (/(menang|deal|won|closing)/.test(text)) return 'Menang / Deal';
  if (/(kalah|batal|lost|cancel)/.test(text)) return 'Kalah / Batal';
  return value || 'Lead Masuk';
}

export function normalizeFunnelStatus(value) {
  const text = normalizeText(value);
  if (/(aktif|open)/.test(text)) return 'Aktif';
  if (/(pending|hold|tunda)/.test(text)) return 'Pending';
  if (/(won|menang|deal|closed won)/.test(text)) return 'Closed Won';
  if (/(lost|kalah|batal|closed lost)/.test(text)) return 'Closed Lost';
  if (/(arsip|archive)/.test(text)) return 'Arsip';
  return value || 'Aktif';
}

function isFilled(value) {
  return !(value === undefined || value === null || String(value).trim() === '' || String(value).trim() === '-');
}

export function validateFunnelConversion(funnel, options = {}) {
  const record = funnel || {};
  const stage = normalizeFunnelStage(record.stage || record.funnel_stage || 'Lead Masuk');
  const status = normalizeFunnelStatus(record.status || record.funnel_status || 'Aktif');
  const targetOrderNo = String(options.targetOrderNo || record.convertedOrderNo || record.converted_order_no || '').trim();
  const relatedOrders = Array.isArray(record.relatedOrders) ? record.relatedOrders : [];
  const existingOrderNos = relatedOrders
    .map((item) => String(item?.orderNo || item?.order_no || '').trim())
    .filter(Boolean);
  if (record.convertedOrderNo || record.converted_order_no) existingOrderNos.push(String(record.convertedOrderNo || record.converted_order_no || '').trim());

  const errors = [];
  const warnings = [];

  if (status === 'Closed Lost' || stage === 'Kalah / Batal') {
    errors.push('Funnel dengan status kalah/batal tidak boleh dikonversi ke pesanan.');
  }
  if (status === 'Arsip') {
    errors.push('Funnel arsip tidak boleh dikonversi sebelum diaktifkan kembali.');
  }

  [
    ['namaPengadaan', 'Nama pengadaan'],
    ['satker', 'Satuan kerja'],
    ['wilayah', 'Wilayah'],
    ['principal', 'Principal'],
    ['penggarap', 'Penggarap'],
  ].forEach(([key, label]) => {
    const value = record[key] ?? record[key.toLowerCase()] ?? record[key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)];
    if (!isFilled(value)) errors.push(`${label} wajib terisi sebelum funnel dikonversi.`);
  });

  if (existingOrderNos.length && targetOrderNo) {
    const uniqueOrders = [...new Set(existingOrderNos.map((item) => item.toLowerCase()))];
    if (!uniqueOrders.includes(targetOrderNo.toLowerCase()) && !options.allowMultipleOrders) {
      errors.push(`Funnel sudah tertaut ke order ${existingOrderNos[0]}. Mode multi-order belum diizinkan pada Sprint 1.`);
    }
  }

  if (stage === 'Lead Masuk' || stage === 'Kualifikasi') {
    warnings.push('Funnel masih berada di tahap awal. Pastikan peluang sudah matang sebelum dikonversi.');
  }
  const probability = Number(record.probability || 0);
  if (probability > 0 && probability < 40) {
    warnings.push('Probabilitas funnel masih di bawah 40%.');
  }

  return { ok: errors.length === 0, errors, warnings, stage, status };
}

export function getStatusDictionary() {
  return {
    orderStatus: ORDER_STATUS_OPTIONS,
    shippingStatus: SHIPPING_STATUS_OPTIONS,
    funnelStage: FUNNEL_STAGE_OPTIONS,
    funnelStatus: FUNNEL_STATUS_OPTIONS,
    priority: PRIORITY_OPTIONS,
    orderTransitions: ORDER_STATUS_TRANSITIONS,
  };
}
