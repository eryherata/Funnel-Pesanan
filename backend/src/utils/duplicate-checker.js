function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function compact(text) {
  return normalizeText(valueOrEmpty(text)).replace(/[^a-z0-9]+/g, ' ').trim();
}

function valueOrEmpty(value) {
  return value == null ? '' : String(value);
}

function buildDecision(matches) {
  if (matches.some((item) => item.severity === 'block')) return 'block';
  if (matches.some((item) => item.severity === 'warn')) return 'warn';
  return 'ok';
}

export function checkOrderDuplicates(candidate, rows = []) {
  const currentId = normalizeText(candidate?.id);
  const poNumber = normalizeText(candidate?.po_number || candidate?.po || candidate?.order_no || candidate?.nomor_po);
  const kodeRup = normalizeText(candidate?.kode_rup || candidate?.kodeRup);
  const satker = compact(candidate?.satker || candidate?.instansi);
  const pengadaan = compact(candidate?.nama_pengadaan || candidate?.namaPengadaan || candidate?.pengadaan);
  const matches = [];

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const rowId = normalizeText(row?.id);
    const sameRecord = currentId && rowId && currentId === rowId;
    if (sameRecord) return;
    const rowPo = normalizeText(row?.po_number || row?.po || row?.order_no || row?.nomor_po);
    const rowRup = normalizeText(row?.kode_rup || row?.kodeRup);
    const rowSatker = compact(row?.satker || row?.instansi);
    const rowPengadaan = compact(row?.nama_pengadaan || row?.namaPengadaan || row?.pengadaan);

    if (poNumber && rowPo && poNumber === rowPo) {
      matches.push({
        severity: 'block',
        code: 'ORDER_PO_DUPLICATE',
        message: `Nomor PO ${rowPo.toUpperCase()} sudah dipakai oleh order lain.`,
        record: { id: row?.id || null, po_number: row?.po_number || row?.po || row?.order_no || row?.nomor_po || null, nama_pengadaan: row?.nama_pengadaan || row?.namaPengadaan || null },
      });
      return;
    }

    if (kodeRup && rowRup && kodeRup === rowRup && satker && rowSatker && satker === rowSatker) {
      matches.push({
        severity: 'warn',
        code: 'ORDER_RUP_SATKER_DUPLICATE',
        message: `Ada order lain dengan kombinasi Kode RUP dan satker yang sama.`,
        record: { id: row?.id || null, po_number: row?.po_number || row?.po || row?.order_no || row?.nomor_po || null, nama_pengadaan: row?.nama_pengadaan || row?.namaPengadaan || null },
      });
    }

    if (pengadaan && rowPengadaan && satker && rowSatker && pengadaan === rowPengadaan && satker === rowSatker) {
      matches.push({
        severity: 'warn',
        code: 'ORDER_PROCUREMENT_DUPLICATE',
        message: `Nama pengadaan dan satker mirip dengan order lain.`,
        record: { id: row?.id || null, po_number: row?.po_number || row?.po || row?.order_no || row?.nomor_po || null, nama_pengadaan: row?.nama_pengadaan || row?.namaPengadaan || null },
      });
    }
  });

  return { entityType: 'order', decision: buildDecision(matches), matches };
}

export function checkFunnelDuplicates(candidate, rows = []) {
  const currentId = normalizeText(candidate?.id);
  const kodeRup = normalizeText(candidate?.kode_rup || candidate?.kodeRup);
  const satker = compact(candidate?.satker || candidate?.instansi);
  const pengadaan = compact(candidate?.nama_pengadaan || candidate?.namaPengadaan || candidate?.pengadaan);
  const matches = [];

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const rowId = normalizeText(row?.id);
    const sameRecord = currentId && rowId && currentId === rowId;
    if (sameRecord) return;
    const rowRup = normalizeText(row?.kode_rup || row?.kodeRup);
    const rowSatker = compact(row?.satker || row?.instansi);
    const rowPengadaan = compact(row?.nama_pengadaan || row?.namaPengadaan || row?.pengadaan);

    if (kodeRup && rowRup && kodeRup === rowRup) {
      matches.push({
        severity: 'warn',
        code: 'FUNNEL_RUP_DUPLICATE',
        message: `Ada funnel lain dengan Kode RUP yang sama.`,
        record: { id: row?.id || null, kode_rup: row?.kode_rup || row?.kodeRup || null, nama_pengadaan: row?.nama_pengadaan || row?.namaPengadaan || null },
      });
    }

    if (pengadaan && rowPengadaan && satker && rowSatker && pengadaan === rowPengadaan && satker === rowSatker) {
      matches.push({
        severity: 'warn',
        code: 'FUNNEL_PROCUREMENT_DUPLICATE',
        message: `Nama pengadaan dan satker mirip dengan funnel lain.`,
        record: { id: row?.id || null, kode_rup: row?.kode_rup || row?.kodeRup || null, nama_pengadaan: row?.nama_pengadaan || row?.namaPengadaan || null },
      });
    }
  });

  return { entityType: 'funnel', decision: buildDecision(matches), matches };
}
