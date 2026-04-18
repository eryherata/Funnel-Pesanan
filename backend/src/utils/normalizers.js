
import { normalizeOrderStatus, normalizeShippingStatus } from './order-status.js';

export function normalizeOrder(order) {
  const payload = { ...(order || {}) };
  const items = Array.isArray(payload.items) ? payload.items : [];
  const poNumber = payload.po_number || payload.po || payload.no_po || payload.order_no || payload.nomor_po || null;
  const sourceFunnelId = payload.funnel_id || payload.source_funnel_id || payload.sourceFunnelId || null;
  const sourceFunnelCode = payload.source_funnel_code || payload.sourceFunnelCode || sourceFunnelId || null;
  const sourceFunnelName = payload.source_funnel_name || payload.sourceFunnelName || null;
  return {
    id: payload.id || `${poNumber || 'ORDER'}-${Date.now()}`,
    po_number: poNumber,
    po_date: payload.po_date || null,
    kode_rup: payload.kode_rup || payload.kodeRup || payload.rup_code || null,
    wilayah: payload.wilayah || null,
    kabkota: payload.kabkota || payload.kabupatenKota || payload.kabupaten_kota || null,
    instansi: payload.instansi || null,
    satker: payload.satker || null,
    nama_pengadaan: payload.nama_pengadaan || payload.namaPengadaan || payload.pengadaan || null,
    principal: payload.principal || null,
    pemasok: payload.pemasok || null,
    distributor: payload.distributor || null,
    pelaksana: payload.pelaksana || null,
    pic: payload.pic || payload.pic_omset || null,
    penggarap: payload.penggarap || null,
    sumber_dana: payload.sumber_dana || null,
    ppn_mode: payload.ppn_mode || null,
    brutto: Number(payload.brutto || payload.brutto_value || 0),
    netto: Number(payload.netto || payload.netto_value || 0),
    negosiasi: Number(payload.negosiasi || 0),
    status_pesanan: normalizeOrderStatus(payload.status_pesanan || payload.status_order || payload.status || 'Baru'),
    status_pengiriman: normalizeShippingStatus(payload.status_pengiriman || payload.shipping_status || 'Belum Diproses'),
    sla_status: payload.sla_status || 'On Track',
    kelengkapan: payload.kelengkapan || 'Data Kurang',
    prioritas: payload.prioritas || payload.priority || 'Normal',
    funnel_id: sourceFunnelId,
    source_funnel_code: sourceFunnelCode,
    source_funnel_name: sourceFunnelName,
    updated_by: payload.updated_by || payload.updatedBy || 'system',
    last_update_at: payload.last_update_at || payload.lastUpdate || new Date().toISOString(),
    items,
    payload_json: {
      ...payload,
      po_number: poNumber,
      status_pesanan: normalizeOrderStatus(payload.status_pesanan || payload.status_order || payload.status || 'Baru'),
      status_pengiriman: normalizeShippingStatus(payload.status_pengiriman || payload.shipping_status || 'Belum Diproses'),
      funnel_id: sourceFunnelId,
      source_funnel_id: sourceFunnelId,
      source_funnel_code: sourceFunnelCode,
      source_funnel_name: sourceFunnelName,
      items,
    },
  };
}

export function normalizeFunnel(funnel) {
  const payload = { ...(funnel || {}) };
  const relatedOrders = Array.isArray(payload.relatedOrders) ? payload.relatedOrders : [];
  return {
    id: payload.id || `FUN-${Date.now()}`,
    input_date: payload.inputDate || payload.input_date || new Date().toISOString().slice(0, 10),
    kode_rup: payload.kodeRup || payload.kode_rup || null,
    nama_pengadaan: payload.namaPengadaan || payload.nama_pengadaan || null,
    wilayah: payload.wilayah || null,
    kabkota: payload.kabupatenKota || payload.kabkota || payload.kabupaten_kota || null,
    instansi: payload.instansi || null,
    satker: payload.satker || null,
    sumber_peluang: payload.sumberPeluang || payload.sumber_peluang || null,
    principal: payload.principal || null,
    pemasok: payload.pemasok || null,
    distributor: payload.distributor || null,
    pelaksana: payload.pelaksana || null,
    pic_omset: payload.picOmset || payload.pic_omset || null,
    penggarap: payload.penggarap || null,
    estimasi_brutto: Number(payload.estimasiBrutto || payload.estimasi_brutto || 0),
    estimasi_netto: Number(payload.estimasiNetto || payload.estimasi_netto || 0),
    estimasi_negosiasi: Number(payload.estimasiNegosiasi || payload.estimasi_negosiasi || 0),
    estimasi_margin_pct: Number(payload.estimasiMarginPct || payload.estimasi_margin_pct || 0),
    estimasi_qty: Number(payload.estimasiQty || payload.estimasi_qty || 0),
    stage: payload.stage || 'Lead Masuk',
    probability: Number(payload.probability || 0),
    target_closing: payload.targetClosing || payload.target_closing || null,
    follow_up_date: payload.followUpDate || payload.follow_up_date || null,
    next_action: payload.nextAction || payload.next_action || null,
    status: payload.status || 'Aktif',
    priority: payload.priority || 'Normal',
    converted: Boolean(payload.converted || relatedOrders.length),
    converted_order_no: payload.convertedOrderNo || payload.converted_order_no || relatedOrders?.[0]?.orderNo || null,
    updated_by: payload.updatedBy || payload.updated_by || 'system',
    last_update_at: payload.lastUpdate || payload.last_update_at || new Date().toISOString(),
    payload_json: {
      ...payload,
      relatedOrders,
      converted: Boolean(payload.converted || relatedOrders.length),
      convertedOrderNo: payload.convertedOrderNo || payload.converted_order_no || relatedOrders?.[0]?.orderNo || null,
    },
  };
}
