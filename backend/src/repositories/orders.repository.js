
import { pool } from '../db/pool.js';
import { normalizeOrder } from '../utils/normalizers.js';
import { writeAuditLog } from '../utils/audit.js';
import { validateOrderWorkflow } from '../utils/order-status.js';
import { validateFunnelConversion } from '../utils/status-dictionary.js';
import { listFunnelOrderLinks } from './relations.repository.js';

function enrichOrders(rows, links) {
  const byOrder = new Map();
  (links || []).forEach((link) => {
    const key = String(link.order_no || '').trim().toLowerCase();
    if (!key) return;
    const list = byOrder.get(key) || [];
    list.push(link);
    byOrder.set(key, list);
  });
  return (rows || []).map((row) => {
    const payload = row.payloadJson || {};
    const relations = byOrder.get(String(payload.po_number || '').trim().toLowerCase()) || [];
    const primary = relations[0] || null;
    return {
      ...payload,
      funnel_id: payload.funnel_id || primary?.funnel_id || null,
      source_funnel_id: payload.source_funnel_id || primary?.funnel_id || null,
      source_funnel_code: payload.source_funnel_code || primary?.funnel_id || null,
      source_funnel_name: payload.source_funnel_name || primary?.funnel_name || null,
      funnel_links: relations.map((item) => ({
        funnelId: item.funnel_id,
        funnelName: item.funnel_name,
        linkType: item.link_type,
        linkedAt: item.linked_at,
        linkedBy: item.linked_by,
      })),
    };
  });
}

function buildOrderFilter(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.statusPesanan) {
    clauses.push('status_pesanan = ?');
    params.push(filters.statusPesanan);
  }
  if (filters.statusPengiriman) {
    clauses.push('status_pengiriman = ?');
    params.push(filters.statusPengiriman);
  }
  if (filters.pic) {
    clauses.push('pic = ?');
    params.push(filters.pic);
  }
  if (filters.wilayah) {
    clauses.push('wilayah = ?');
    params.push(filters.wilayah);
  }
  if (filters.q) {
    const q = `%${String(filters.q).trim()}%`;
    clauses.push('(po_number LIKE ? OR kode_rup LIKE ? OR nama_pengadaan LIKE ? OR satker LIKE ? OR instansi LIKE ? OR principal LIKE ? OR pic LIKE ? OR penggarap LIKE ?)');
    params.push(q, q, q, q, q, q, q, q);
  }
  return { whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export async function listOrders(filters = {}) {
  const { whereSql, params } = buildOrderFilter(filters);
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(filters.pageSize || filters.limit || 500)));
  const offset = (page - 1) * pageSize;

  const [[{ total }], rows, links] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM orders ${whereSql}`, params).then(([result]) => result),
    pool.query(
      `SELECT payload_json AS payloadJson
         FROM orders
         ${whereSql}
        ORDER BY COALESCE(po_date, created_at) DESC, created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    ).then(([result]) => result),
    listFunnelOrderLinks(),
  ]);

  return {
    rows: enrichOrders(rows, links),
    total,
    page,
    pageSize,
  };
}

export async function upsertOrder(rawOrder) {
  const order = normalizeOrder(rawOrder);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      `SELECT id, payload_json AS payloadJson, status_pesanan, funnel_id FROM orders WHERE po_number = ? LIMIT 1`,
      [order.po_number],
    );

    const isUpdate = existing.length > 0;
    const entityId = isUpdate ? existing[0].id : order.id;
    const previousPayload = existing?.[0]?.payloadJson || {};
    const previousStatus = previousPayload?.status_pesanan || existing?.[0]?.status_pesanan || null;
    const validation = validateOrderWorkflow(order.payload_json, previousStatus);
    if (!validation.ok) {
      const error = new Error(validation.errors.join(' '));
      error.status = 400;
      error.payload = validation;
      throw error;
    }

    if (isUpdate && existing[0].funnel_id && order.funnel_id && String(existing[0].funnel_id) !== String(order.funnel_id)) {
      const error = new Error(`Order ${order.po_number} sudah tertaut ke funnel ${existing[0].funnel_id}. Re-assign lintas funnel diblokir pada Sprint 1.`);
      error.status = 409;
      throw error;
    }

    if (order.funnel_id) {
      const [funnelRows] = await connection.execute(
        'SELECT id, payload_json, converted_order_no FROM funnels WHERE id = ? LIMIT 1',
        [order.funnel_id],
      );
      if (!funnelRows.length) {
        const error = new Error(`Funnel ${order.funnel_id} tidak ditemukan.`);
        error.status = 404;
        throw error;
      }
      const funnelPayload = funnelRows[0].payload_json || {};
      const [relationRows] = await connection.execute(
        'SELECT order_no FROM funnel_order_links WHERE funnel_id = ? ORDER BY linked_at DESC, id DESC',
        [order.funnel_id],
      );
      funnelPayload.relatedOrders = relationRows.map((item) => ({ orderNo: item.order_no }));
      funnelPayload.convertedOrderNo = funnelRows[0].converted_order_no || funnelPayload.convertedOrderNo || null;
      const funnelValidation = validateFunnelConversion(funnelPayload, {
        targetOrderNo: order.po_number,
        allowMultipleOrders: false,
      });
      if (!funnelValidation.ok) {
        const error = new Error(funnelValidation.errors.join(' '));
        error.status = 400;
        error.payload = funnelValidation;
        throw error;
      }
    }

    await connection.execute(
      `INSERT INTO orders (
        id, po_number, po_date, kode_rup, wilayah, kabkota, instansi, satker, nama_pengadaan,
        principal, pemasok, distributor, pelaksana, pic, penggarap, sumber_dana, ppn_mode,
        brutto, netto, negosiasi, status_pesanan, status_pengiriman, sla_status, kelengkapan,
        prioritas, funnel_id, source_funnel_code, source_funnel_name, updated_by, last_update_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        po_date = VALUES(po_date), kode_rup = VALUES(kode_rup), wilayah = VALUES(wilayah), kabkota = VALUES(kabkota),
        instansi = VALUES(instansi), satker = VALUES(satker), nama_pengadaan = VALUES(nama_pengadaan),
        principal = VALUES(principal), pemasok = VALUES(pemasok), distributor = VALUES(distributor), pelaksana = VALUES(pelaksana),
        pic = VALUES(pic), penggarap = VALUES(penggarap), sumber_dana = VALUES(sumber_dana), ppn_mode = VALUES(ppn_mode),
        brutto = VALUES(brutto), netto = VALUES(netto), negosiasi = VALUES(negosiasi), status_pesanan = VALUES(status_pesanan),
        status_pengiriman = VALUES(status_pengiriman), sla_status = VALUES(sla_status), kelengkapan = VALUES(kelengkapan),
        prioritas = VALUES(prioritas), funnel_id = VALUES(funnel_id), source_funnel_code = VALUES(source_funnel_code), source_funnel_name = VALUES(source_funnel_name), updated_by = VALUES(updated_by),
        last_update_at = VALUES(last_update_at), payload_json = VALUES(payload_json), updated_at = CURRENT_TIMESTAMP`,
      [
        entityId, order.po_number, order.po_date, order.kode_rup, order.wilayah, order.kabkota, order.instansi, order.satker,
        order.nama_pengadaan, order.principal, order.pemasok, order.distributor, order.pelaksana, order.pic, order.penggarap,
        order.sumber_dana, order.ppn_mode, order.brutto, order.netto, order.negosiasi, order.status_pesanan,
        order.status_pengiriman, order.sla_status, order.kelengkapan, order.prioritas, order.funnel_id,
        order.source_funnel_code, order.source_funnel_name, order.updated_by, order.last_update_at, JSON.stringify(order.payload_json),
      ],
    );

    await connection.execute(`DELETE FROM order_items WHERE order_id = ?`, [entityId]);
    for (const [index, item] of order.items.entries()) {
      await connection.execute(
        `INSERT INTO order_items (
          order_id, line_no, product_code, product_name, category, qty, hpp_total, tayang_total, kontrak_total, nego_total, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entityId,
          index + 1,
          item.product_code || null,
          item.product_name || null,
          item.category || null,
          Number(item.qty || 0),
          Number(item.hpp_total || 0),
          Number(item.tayang_total || 0),
          Number(item.kontrak_total || 0),
          Number(item.nego_total || 0),
          JSON.stringify(item),
        ],
      );
    }

    if (order.funnel_id) {
      await connection.execute(
        `INSERT INTO funnel_order_links (funnel_id, order_id, order_no, link_type, is_primary, linked_by)
         VALUES (?, ?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE link_type = VALUES(link_type), linked_by = VALUES(linked_by), linked_at = CURRENT_TIMESTAMP`,
        [order.funnel_id, entityId, order.po_number, isUpdate ? 'update' : 'create', order.updated_by],
      );
      await connection.execute(
        `UPDATE funnels
            SET converted = 1,
                converted_order_no = ?,
                updated_by = ?,
                last_update_at = CURRENT_TIMESTAMP,
                payload_json = JSON_SET(COALESCE(payload_json, JSON_OBJECT()), '$.converted', true, '$.convertedOrderNo', ?, '$.lastUpdate', DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s'))
          WHERE id = ?`,
        [order.po_number, order.updated_by, order.po_number, order.funnel_id],
      );
      await writeAuditLog(connection, {
        entityType: 'funnel',
        entityId: order.funnel_id,
        actionType: 'link_order',
        actorName: order.updated_by,
        summary: `Funnel ${order.funnel_id} ditautkan ke order ${order.po_number}`,
        snapshot: { orderNo: order.po_number, source: 'order_upsert' },
      });
    }

    await writeAuditLog(connection, {
      entityType: 'order',
      entityId,
      actionType: isUpdate ? 'update' : 'create',
      actorName: order.updated_by,
      summary: `${isUpdate ? 'Memperbarui' : 'Membuat'} order ${order.po_number}`,
      snapshot: order.payload_json,
    });

    await connection.commit();
    return order.payload_json;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function bulkReplaceOrders(rows) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM order_items');
    await connection.query('DELETE FROM funnel_order_links');
    await connection.query('DELETE FROM orders');
    for (const row of rows || []) {
      const order = normalizeOrder(row);
      const validation = validateOrderWorkflow(order.payload_json, null);
      if (!validation.ok) {
        const error = new Error(`Order ${order.po_number}: ${validation.errors.join(' ')}`);
        error.status = 400;
        throw error;
      }
      await connection.execute(
        `INSERT INTO orders (
          id, po_number, po_date, kode_rup, wilayah, kabkota, instansi, satker, nama_pengadaan,
          principal, pemasok, distributor, pelaksana, pic, penggarap, sumber_dana, ppn_mode,
          brutto, netto, negosiasi, status_pesanan, status_pengiriman, sla_status, kelengkapan,
          prioritas, funnel_id, source_funnel_code, source_funnel_name, updated_by, last_update_at, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id, order.po_number, order.po_date, order.kode_rup, order.wilayah, order.kabkota, order.instansi, order.satker,
          order.nama_pengadaan, order.principal, order.pemasok, order.distributor, order.pelaksana, order.pic, order.penggarap,
          order.sumber_dana, order.ppn_mode, order.brutto, order.netto, order.negosiasi, order.status_pesanan,
          order.status_pengiriman, order.sla_status, order.kelengkapan, order.prioritas, order.funnel_id,
          order.source_funnel_code, order.source_funnel_name, order.updated_by, order.last_update_at, JSON.stringify(order.payload_json),
        ],
      );
      for (const [index, item] of order.items.entries()) {
        await connection.execute(
          `INSERT INTO order_items (order_id, line_no, product_code, product_name, category, qty, hpp_total, tayang_total, kontrak_total, nego_total, payload_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [order.id, index + 1, item.product_code || null, item.product_name || null, item.category || null, Number(item.qty || 0), Number(item.hpp_total || 0), Number(item.tayang_total || 0), Number(item.kontrak_total || 0), Number(item.nego_total || 0), JSON.stringify(item)],
        );
      }
    }
    await writeAuditLog(connection, {
      entityType: 'order',
      entityId: 'bulk',
      actionType: 'bulk_replace',
      actorName: 'system',
      summary: `Mengganti seluruh dataset order (${(rows || []).length} baris)`,
      snapshot: { totalRows: (rows || []).length },
    });
    await connection.commit();
    return rows || [];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
