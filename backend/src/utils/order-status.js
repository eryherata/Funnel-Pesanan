import {
  ORDER_STATUS_TRANSITIONS,
  normalizeOrderStatus,
  normalizeShippingStatus,
} from './status-dictionary.js';

function isFilled(value) {
  return !(value === undefined || value === null || String(value).trim() === '' || String(value).trim() === '-');
}

export { normalizeOrderStatus, normalizeShippingStatus };

export function validateOrderWorkflow(order, previousStatus = null) {
  const nextStatus = normalizeOrderStatus(order?.status_pesanan || order?.status || 'Baru');
  const currentStatus = previousStatus ? normalizeOrderStatus(previousStatus) : null;
  const errors = [];

  if (currentStatus && ORDER_STATUS_TRANSITIONS[currentStatus] && !ORDER_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
    errors.push(`Transisi status dari ${currentStatus} ke ${nextStatus} tidak diizinkan.`);
  }

  const mustHave = {
    Baru: [
      ['po_number', 'Nomor PO'],
      ['po_date', 'Tanggal PO'],
      ['nama_pengadaan', 'Nama pengadaan'],
      ['satker', 'Satuan kerja'],
    ],
    'Validasi Data': [
      ['principal', 'Principal'],
      ['pemasok', 'Pemasok'],
      ['pelaksana', 'Pelaksana'],
    ],
    Diproses: [
      ['principal', 'Principal'],
      ['pemasok', 'Pemasok'],
      ['pelaksana', 'Pelaksana'],
    ],
    'Siap Kirim': [
      ['principal', 'Principal'],
      ['pemasok', 'Pemasok'],
      ['pelaksana', 'Pelaksana'],
    ],
    'Dalam Pengiriman': [
      ['resi', 'Nomor resi'],
      ['actual_sent', 'Tanggal aktual dikirim'],
    ],
    Selesai: [
      ['actual_received', 'Tanggal aktual diterima'],
      ['receiver', 'Nama penerima'],
    ],
  };

  (mustHave[nextStatus] || []).forEach(([key, label]) => {
    if (!isFilled(order?.[key])) errors.push(`${label} wajib diisi untuk status ${nextStatus}.`);
  });

  if (['Validasi Data', 'Diproses', 'Siap Kirim', 'Dalam Pengiriman', 'Selesai'].includes(nextStatus) && !(Array.isArray(order?.items) && order.items.length)) {
    errors.push(`Item pesanan wajib ada untuk status ${nextStatus}.`);
  }

  if (nextStatus === 'Siap Kirim') {
    ['doc_po_pel', 'doc_po_dis', 'doc_po_pem'].forEach((key) => {
      if (String(order?.[key] || '').trim() !== 'Sudah') {
        const labels = { doc_po_pel: 'PO Pelaksana → Distributor', doc_po_dis: 'PO Distributor → Pemasok', doc_po_pem: 'PO Pemasok → Principal' };
        errors.push(`${labels[key]} harus sudah tersedia untuk status Siap Kirim.`);
      }
    });
  }

  if (nextStatus === 'Dalam Pengiriman') {
    const shipping = normalizeShippingStatus(order?.status_pengiriman || order?.shipping_status || '');
    if (!['Dalam Perjalanan', 'Tiba', 'BAST'].includes(shipping)) {
      errors.push('Status pengiriman harus minimal "Dalam Perjalanan" untuk status Dalam Pengiriman.');
    }
  }

  if (nextStatus === 'Selesai') {
    if (String(order?.doc_bast || '').trim() !== 'Sudah') {
      errors.push('Dokumen BAST harus sudah tersedia untuk status Selesai.');
    }
    const shipping = normalizeShippingStatus(order?.status_pengiriman || order?.shipping_status || '');
    if (!['Tiba', 'BAST'].includes(shipping)) {
      errors.push('Status pengiriman harus Tiba atau BAST untuk status Selesai.');
    }
  }

  return { ok: errors.length === 0, errors, nextStatus, currentStatus };
}
