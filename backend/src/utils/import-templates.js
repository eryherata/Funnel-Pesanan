import {
  FUNNEL_STAGE_OPTIONS,
  FUNNEL_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  SHIPPING_STATUS_OPTIONS,
  normalizeFunnelStage,
  normalizeFunnelStatus,
  normalizeOrderStatus,
  normalizeShippingStatus,
} from './status-dictionary.js';

function asText(value) {
  return String(value == null ? '' : value).trim();
}

function hasValue(value) {
  return asText(value) !== '';
}

function isValidDate(value) {
  if (!hasValue(value)) return true;
  return !Number.isNaN(Date.parse(String(value)));
}

function isValidNumber(value) {
  if (!hasValue(value)) return true;
  return Number.isFinite(Number(String(value).replace(/,/g, '')));
}

function validateEnum(value, allowedValues, normalizer) {
  if (!hasValue(value)) return true;
  const normalized = normalizer ? normalizer(value) : value;
  return allowedValues.includes(normalized);
}

function normalizeNumberLike(value) {
  if (!hasValue(value)) return value;
  const numeric = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : value;
}

function csvEscape(value) {
  const raw = String(value == null ? '' : value);
  if (/[",\n]/.test(raw)) return '"' + raw.replace(/"/g, '""') + '"';
  return raw;
}

export const IMPORT_TEMPLATE_SPECS = {
  orders: {
    key: 'orders',
    label: 'Orders / Pesanan',
    filename: 'template-import-orders.csv',
    columns: [
      'po_number', 'po_date', 'kode_rup', 'wilayah', 'kabkota', 'instansi', 'satker', 'nama_pengadaan',
      'principal', 'pemasok', 'distributor', 'pelaksana', 'pic', 'penggarap', 'brutto', 'netto', 'negosiasi',
      'status_pesanan', 'status_pengiriman', 'prioritas', 'no_resi', 'tgl_aktual_dikirim', 'tgl_aktual_diterima', 'nama_penerima'
    ],
    required: ['po_number', 'nama_pengadaan'],
    sampleRows: [
      {
        po_number: 'PO-2026-001', po_date: '2026-04-18', kode_rup: 'RUP-778899', wilayah: 'Jawa Timur', kabkota: 'Kota Surabaya',
        instansi: 'Dinas Kesehatan', satker: 'UPTD Gudang Farmasi', nama_pengadaan: 'Pengadaan Alat Kesehatan Tahap 1', principal: 'Principal A',
        pemasok: 'PT Pemasok Sejahtera', distributor: 'PT Distributor Nusantara', pelaksana: 'PT Pelaksana Utama', pic: 'Dery', penggarap: 'Tim Surabaya',
        brutto: 150000000, netto: 140000000, negosiasi: 5000000, status_pesanan: 'Diproses', status_pengiriman: 'Penyiapan', prioritas: 'Normal',
        no_resi: '', tgl_aktual_dikirim: '', tgl_aktual_diterima: '', nama_penerima: ''
      },
    ],
    guidance: [
      'Gunakan satu baris untuk satu nomor PO.',
      'Format tanggal disarankan YYYY-MM-DD.',
      'Status Pesanan mengikuti kamus sistem.',
    ],
  },
  funnels: {
    key: 'funnels',
    label: 'Funnels / Pipeline',
    filename: 'template-import-funnels.csv',
    columns: [
      'id', 'kode_rup', 'nama_pengadaan', 'wilayah', 'kabkota', 'instansi', 'satker', 'sumber_peluang',
      'principal', 'pemasok', 'distributor', 'pelaksana', 'pic_omset', 'penggarap', 'stage', 'status', 'priority',
      'probability', 'target_closing', 'follow_up_date', 'next_action', 'estimasi_brutto', 'estimasi_netto', 'estimasi_negosiasi'
    ],
    required: ['id', 'nama_pengadaan'],
    sampleRows: [
      {
        id: 'FUN-2026-001', kode_rup: 'RUP-112233', nama_pengadaan: 'Pengadaan Perangkat Jaringan', wilayah: 'Jawa Barat', kabkota: 'Kota Bandung',
        instansi: 'Diskominfo', satker: 'Bidang Infrastruktur', sumber_peluang: 'E-Katalog', principal: 'Principal B', pemasok: 'PT Jaringan Prima',
        distributor: 'PT Distribusi Bandung', pelaksana: 'PT Implementasi Nusantara', pic_omset: 'Ayu', penggarap: 'Tim Bandung', stage: 'Negosiasi',
        status: 'Aktif', priority: 'Tinggi', probability: 65, target_closing: '2026-05-20', follow_up_date: '2026-04-25', next_action: 'Follow up negosiasi harga',
        estimasi_brutto: 320000000, estimasi_netto: 295000000, estimasi_negosiasi: 15000000
      },
    ],
    guidance: [
      'ID funnel harus unik dan stabil untuk menghindari duplikasi.',
      'Probability diisi 0-100.',
      'Stage dan Status mengikuti kamus funnel sistem.',
    ],
  },
  locations: {
    key: 'locations',
    label: 'Master Lokasi',
    filename: 'template-import-master-lokasi.csv',
    columns: ['wilayah', 'kabkota', 'instansi', 'satker', 'aliases_text'],
    required: ['wilayah', 'kabkota'],
    sampleRows: [{ wilayah: 'Jawa Timur', kabkota: 'Kota Surabaya', instansi: 'Dinas Kesehatan', satker: 'UPTD Gudang Farmasi', aliases_text: 'Surabaya, Kota SBY' }],
    guidance: ['Pisahkan alias dengan koma.', 'Minimal wilayah dan kabkota wajib diisi.'],
  },
  principals: {
    key: 'principals',
    label: 'Master Principal',
    filename: 'template-import-master-principal.csv',
    columns: ['principal_code', 'principal_name', 'category', 'aliases_text'],
    required: ['principal_name'],
    sampleRows: [{ principal_code: 'PRN-001', principal_name: 'Principal A', category: 'Alkes', aliases_text: 'PT Principal A, Principal-A' }],
    guidance: ['Kode principal opsional, tetapi bila diisi harus unik.'],
  },
  partners: {
    key: 'partners',
    label: 'Master Mitra / Vendor',
    filename: 'template-import-master-mitra.csv',
    columns: ['partner_name', 'partner_type', 'principal_name', 'wilayah', 'kabkota', 'contact_name', 'contact_phone', 'aliases_text'],
    required: ['partner_name', 'partner_type'],
    sampleRows: [{ partner_name: 'PT Distribusi Nusantara', partner_type: 'Distributor', principal_name: 'Principal A', wilayah: 'Jawa Timur', kabkota: 'Kota Surabaya', contact_name: 'Budi', contact_phone: '08123456789', aliases_text: 'Distribusi Nusantara, PT DN' }],
    guidance: ['Partner Type yang didukung: Pemasok, Distributor, Pelaksana.'],
  },
  owners: {
    key: 'owners',
    label: 'Master PIC / Penggarap',
    filename: 'template-import-master-owner.csv',
    columns: ['owner_name', 'owner_role', 'team_name', 'wilayah', 'email', 'phone', 'aliases_text'],
    required: ['owner_name'],
    sampleRows: [{ owner_name: 'Dery Yonata', owner_role: 'PIC Omset', team_name: 'Tim Surabaya', wilayah: 'Jawa Timur', email: 'dery@example.com', phone: '08129876543', aliases_text: 'Pak Dery, D Yonata' }],
    guidance: ['Role bersifat bebas, tetapi sebaiknya konsisten untuk analitik.'],
  },
};

function buildError(rowIndex, field, message, value) {
  return { row: rowIndex + 1, field, message, value: value == null ? '' : value };
}

function buildWarning(rowIndex, field, message, value) {
  return { row: rowIndex + 1, field, message, value: value == null ? '' : value };
}

function normalizeAliases(row) {
  const aliasesText = asText(row.aliases_text || row.alias || row.alias_lokasi);
  if (!aliasesText) return row;
  return { ...row, aliases_text: aliasesText };
}

function validateOrders(rows) {
  const errors = [];
  const warnings = [];
  const seenPo = new Set();
  const normalizedRows = rows.map((sourceRow, index) => {
    const row = {
      ...sourceRow,
      po_number: asText(sourceRow.po_number || sourceRow.po || sourceRow.no_po || sourceRow.nomor_po),
      nama_pengadaan: asText(sourceRow.nama_pengadaan || sourceRow.pengadaan),
      status_pesanan: hasValue(sourceRow.status_pesanan) ? normalizeOrderStatus(sourceRow.status_pesanan) : sourceRow.status_pesanan,
      status_pengiriman: hasValue(sourceRow.status_pengiriman) ? normalizeShippingStatus(sourceRow.status_pengiriman) : sourceRow.status_pengiriman,
      prioritas: hasValue(sourceRow.prioritas) ? asText(sourceRow.prioritas) : sourceRow.prioritas,
      brutto: normalizeNumberLike(sourceRow.brutto),
      netto: normalizeNumberLike(sourceRow.netto),
      negosiasi: normalizeNumberLike(sourceRow.negosiasi),
    };
    if (!row.po_number) errors.push(buildError(index, 'po_number', 'Nomor PO wajib diisi.', row.po_number));
    if (!row.nama_pengadaan) errors.push(buildError(index, 'nama_pengadaan', 'Nama pengadaan wajib diisi.', row.nama_pengadaan));
    if (row.po_number) {
      const compactPo = row.po_number.toLowerCase();
      if (seenPo.has(compactPo)) errors.push(buildError(index, 'po_number', 'Nomor PO duplikat dalam file import.', row.po_number));
      seenPo.add(compactPo);
    }
    if (!isValidDate(row.po_date)) errors.push(buildError(index, 'po_date', 'Format tanggal PO tidak valid.', row.po_date));
    if (!isValidDate(row.tgl_aktual_dikirim)) errors.push(buildError(index, 'tgl_aktual_dikirim', 'Format tanggal kirim aktual tidak valid.', row.tgl_aktual_dikirim));
    if (!isValidDate(row.tgl_aktual_diterima)) errors.push(buildError(index, 'tgl_aktual_diterima', 'Format tanggal diterima aktual tidak valid.', row.tgl_aktual_diterima));
    ['brutto', 'netto', 'negosiasi'].forEach((field) => {
      if (!isValidNumber(row[field])) errors.push(buildError(index, field, 'Nilai harus berupa angka.', row[field]));
    });
    if (!validateEnum(row.status_pesanan, ORDER_STATUS_OPTIONS, normalizeOrderStatus)) {
      errors.push(buildError(index, 'status_pesanan', 'Status pesanan tidak dikenali.', row.status_pesanan));
    }
    if (!validateEnum(row.status_pengiriman, SHIPPING_STATUS_OPTIONS, normalizeShippingStatus)) {
      errors.push(buildError(index, 'status_pengiriman', 'Status pengiriman tidak dikenali.', row.status_pengiriman));
    }
    if (!validateEnum(row.prioritas, PRIORITY_OPTIONS)) {
      warnings.push(buildWarning(index, 'prioritas', 'Prioritas tidak standar, akan tetap disimpan apa adanya.', row.prioritas));
    }
    if (hasValue(row.status_pengiriman) && !hasValue(row.status_pesanan)) {
      warnings.push(buildWarning(index, 'status_pesanan', 'Status pengiriman terisi tetapi status pesanan kosong.', row.status_pengiriman));
    }
    return row;
  });
  return { rows: normalizedRows, errors, warnings };
}

function validateFunnels(rows) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  const normalizedRows = rows.map((sourceRow, index) => {
    const row = {
      ...sourceRow,
      id: asText(sourceRow.id),
      nama_pengadaan: asText(sourceRow.nama_pengadaan || sourceRow.pengadaan),
      stage: hasValue(sourceRow.stage) ? normalizeFunnelStage(sourceRow.stage) : sourceRow.stage,
      status: hasValue(sourceRow.status) ? normalizeFunnelStatus(sourceRow.status) : sourceRow.status,
      priority: hasValue(sourceRow.priority || sourceRow.prioritas) ? asText(sourceRow.priority || sourceRow.prioritas) : sourceRow.priority,
      probability: normalizeNumberLike(sourceRow.probability),
      estimasi_brutto: normalizeNumberLike(sourceRow.estimasi_brutto),
      estimasi_netto: normalizeNumberLike(sourceRow.estimasi_netto),
      estimasi_negosiasi: normalizeNumberLike(sourceRow.estimasi_negosiasi),
    };
    if (!row.id) errors.push(buildError(index, 'id', 'ID funnel wajib diisi.', row.id));
    if (!row.nama_pengadaan) errors.push(buildError(index, 'nama_pengadaan', 'Nama pengadaan wajib diisi.', row.nama_pengadaan));
    if (row.id) {
      const compactId = row.id.toLowerCase();
      if (seenIds.has(compactId)) errors.push(buildError(index, 'id', 'ID funnel duplikat dalam file import.', row.id));
      seenIds.add(compactId);
    }
    if (!isValidDate(row.target_closing)) errors.push(buildError(index, 'target_closing', 'Format target closing tidak valid.', row.target_closing));
    if (!isValidDate(row.follow_up_date)) errors.push(buildError(index, 'follow_up_date', 'Format follow up date tidak valid.', row.follow_up_date));
    if (!isValidNumber(row.probability)) errors.push(buildError(index, 'probability', 'Probability harus berupa angka 0-100.', row.probability));
    const prob = Number(row.probability || 0);
    if (hasValue(row.probability) && (prob < 0 || prob > 100)) errors.push(buildError(index, 'probability', 'Probability harus berada pada rentang 0-100.', row.probability));
    ['estimasi_brutto', 'estimasi_netto', 'estimasi_negosiasi'].forEach((field) => {
      if (!isValidNumber(row[field])) errors.push(buildError(index, field, 'Nilai harus berupa angka.', row[field]));
    });
    if (!validateEnum(row.stage, FUNNEL_STAGE_OPTIONS, normalizeFunnelStage)) {
      errors.push(buildError(index, 'stage', 'Stage funnel tidak dikenali.', row.stage));
    }
    if (!validateEnum(row.status, FUNNEL_STATUS_OPTIONS, normalizeFunnelStatus)) {
      errors.push(buildError(index, 'status', 'Status funnel tidak dikenali.', row.status));
    }
    if (!validateEnum(row.priority, PRIORITY_OPTIONS)) {
      warnings.push(buildWarning(index, 'priority', 'Prioritas funnel tidak standar, akan tetap disimpan apa adanya.', row.priority));
    }
    return row;
  });
  return { rows: normalizedRows, errors, warnings };
}

function validateLocations(rows) {
  const errors = [];
  const warnings = [];
  const normalizedRows = rows.map((sourceRow, index) => {
    const row = normalizeAliases({
      ...sourceRow,
      wilayah: asText(sourceRow.wilayah),
      kabkota: asText(sourceRow.kabkota),
      instansi: asText(sourceRow.instansi),
      satker: asText(sourceRow.satker),
    });
    if (!row.wilayah) errors.push(buildError(index, 'wilayah', 'Wilayah wajib diisi.', row.wilayah));
    if (!row.kabkota) errors.push(buildError(index, 'kabkota', 'Kabupaten/Kota wajib diisi.', row.kabkota));
    if (!row.instansi && row.satker) warnings.push(buildWarning(index, 'instansi', 'Satker terisi tanpa instansi.', row.satker));
    return row;
  });
  return { rows: normalizedRows, errors, warnings };
}

function validatePrincipals(rows) {
  const errors = [];
  const warnings = [];
  const seenCodes = new Set();
  const normalizedRows = rows.map((sourceRow, index) => {
    const row = normalizeAliases({
      ...sourceRow,
      principal_code: asText(sourceRow.principal_code),
      principal_name: asText(sourceRow.principal_name || sourceRow.principal),
      category: asText(sourceRow.category),
    });
    if (!row.principal_name) errors.push(buildError(index, 'principal_name', 'Nama principal wajib diisi.', row.principal_name));
    if (row.principal_code) {
      const compactCode = row.principal_code.toLowerCase();
      if (seenCodes.has(compactCode)) errors.push(buildError(index, 'principal_code', 'Kode principal duplikat dalam file import.', row.principal_code));
      seenCodes.add(compactCode);
    }
    return row;
  });
  return { rows: normalizedRows, errors, warnings };
}

const PARTNER_TYPES = ['Pemasok', 'Distributor', 'Pelaksana'];

function normalizePartnerType(value) {
  const text = asText(value).toLowerCase();
  if (!text) return '';
  if (text.includes('dist')) return 'Distributor';
  if (text.includes('laksana') || text.includes('implement')) return 'Pelaksana';
  if (text.includes('pasok') || text.includes('vendor') || text.includes('supplier')) return 'Pemasok';
  return value;
}

function validatePartners(rows) {
  const errors = [];
  const warnings = [];
  const normalizedRows = rows.map((sourceRow, index) => {
    const row = normalizeAliases({
      ...sourceRow,
      partner_name: asText(sourceRow.partner_name || sourceRow.partner),
      partner_type: hasValue(sourceRow.partner_type) ? normalizePartnerType(sourceRow.partner_type) : sourceRow.partner_type,
      principal_name: asText(sourceRow.principal_name || sourceRow.principal),
      wilayah: asText(sourceRow.wilayah),
      kabkota: asText(sourceRow.kabkota),
      contact_name: asText(sourceRow.contact_name),
      contact_phone: asText(sourceRow.contact_phone),
    });
    if (!row.partner_name) errors.push(buildError(index, 'partner_name', 'Nama mitra/vendor wajib diisi.', row.partner_name));
    if (!row.partner_type) errors.push(buildError(index, 'partner_type', 'Tipe mitra wajib diisi.', row.partner_type));
    if (row.partner_type && !PARTNER_TYPES.includes(row.partner_type)) {
      errors.push(buildError(index, 'partner_type', 'Tipe mitra harus Pemasok, Distributor, atau Pelaksana.', row.partner_type));
    }
    return row;
  });
  return { rows: normalizedRows, errors, warnings };
}

function validateOwners(rows) {
  const errors = [];
  const warnings = [];
  const normalizedRows = rows.map((sourceRow, index) => {
    const row = normalizeAliases({
      ...sourceRow,
      owner_name: asText(sourceRow.owner_name || sourceRow.owner),
      owner_role: asText(sourceRow.owner_role || sourceRow.role),
      team_name: asText(sourceRow.team_name || sourceRow.team),
      wilayah: asText(sourceRow.wilayah),
      email: asText(sourceRow.email),
      phone: asText(sourceRow.phone),
    });
    if (!row.owner_name) errors.push(buildError(index, 'owner_name', 'Nama PIC/Penggarap wajib diisi.', row.owner_name));
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) warnings.push(buildWarning(index, 'email', 'Format email terlihat tidak standar.', row.email));
    return row;
  });
  return { rows: normalizedRows, errors, warnings };
}

const VALIDATORS = {
  orders: validateOrders,
  funnels: validateFunnels,
  locations: validateLocations,
  principals: validatePrincipals,
  partners: validatePartners,
  owners: validateOwners,
};

export function getImportTemplate(target) {
  const key = String(target || '').trim().toLowerCase();
  return IMPORT_TEMPLATE_SPECS[key] || null;
}

export function listImportTemplates() {
  return Object.values(IMPORT_TEMPLATE_SPECS);
}

export function validateImportRows(target, rows) {
  const key = String(target || '').trim().toLowerCase();
  const validator = VALIDATORS[key];
  if (!validator) {
    const error = new Error('Target import tidak dikenali.');
    error.status = 400;
    throw error;
  }
  return validator(Array.isArray(rows) ? rows : []);
}

export function toTemplateCsv(target) {
  const template = getImportTemplate(target);
  if (!template) return null;
  const lines = [];
  lines.push(template.columns.join(','));
  (template.sampleRows || []).forEach((row) => {
    lines.push(template.columns.map((column) => csvEscape(row[column] ?? '')).join(','));
  });
  return lines.join('\n');
}
