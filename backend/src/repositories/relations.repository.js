import { pool } from '../db/pool.js';
import { writeAuditLog } from '../utils/audit.js';
import { validateFunnelConversion } from '../utils/status-dictionary.js';

export async function listFunnelOrderLinks(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.funnelId) {
    clauses.push('l.funnel_id = ?');
    params.push(filters.funnelId);
  }
  if (filters.orderNo) {
    clauses.push('l.order_no = ?');
    params.push(filters.orderNo);
  }
  if (filters.orderId) {
    clauses.push('l.order_id = ?');
    params.push(filters.orderId);
  }
  const [rows] = await pool.query(
    `SELECT l.id, l.funnel_id, l.order_id, l.order_no, l.link_type, l.is_primary, l.linked_by, l.linked_at, l.note,
            f.nama_pengadaan AS funnel_name, f.stage AS funnel_stage, o.nama_pengadaan AS order_name
       FROM funnel_order_links l
       LEFT JOIN funnels f ON f.id = l.funnel_id
       LEFT JOIN orders o ON o.id = l.order_id
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY l.linked_at DESC, l.id DESC`,
    params,
  );
  return rows.map((row) => ({
    id: row.id,
    funnel_id: row.funnel_id,
    order_id: row.order_id,
    order_no: row.order_no,
    link_type: row.link_type,
    is_primary: Boolean(row.is_primary),
    linked_by: row.linked_by,
    linked_at: row.linked_at,
    note: row.note,
    funnel_name: row.funnel_name,
    funnel_stage: row.funnel_stage,
    order_name: row.order_name,
  }));
}

export async function linkFunnelOrder(payload = {}) {
  const funnelId = payload.funnelId || payload.funnel_id || null;
  const orderNo = payload.orderNo || payload.order_no || null;
  const actorName = payload.actorName || payload.actor_name || 'system';
  const linkType = payload.linkType || payload.link_type || 'link';
  const note = payload.note || null;
  const allowMultipleOrders = Boolean(payload.allowMultipleOrders || payload.allow_multiple_orders);
  const forceReassign = Boolean(payload.forceReassign || payload.force_reassign);

  if (!funnelId || !orderNo) {
    const error = new Error('funnelId dan orderNo wajib diisi.');
    error.status = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [funnelRows] = await connection.execute('SELECT id, nama_pengadaan, payload_json, converted_order_no FROM funnels WHERE id = ? LIMIT 1', [funnelId]);
    if (!funnelRows.length) {
      const error = new Error(`Funnel ${funnelId} tidak ditemukan.`);
      error.status = 404;
      throw error;
    }
    const funnel = funnelRows[0];
    const funnelPayload = funnel.payload_json || {};
    const [existingRelations] = await connection.execute(
      'SELECT order_no FROM funnel_order_links WHERE funnel_id = ? ORDER BY linked_at DESC, id DESC',
      [funnelId],
    );
    funnelPayload.relatedOrders = existingRelations.map((item) => ({ orderNo: item.order_no }));
    funnelPayload.convertedOrderNo = funnel.converted_order_no || funnelPayload.convertedOrderNo || null;

    const conversionValidation = validateFunnelConversion(funnelPayload, {
      targetOrderNo: orderNo,
      allowMultipleOrders,
    });
    if (!conversionValidation.ok) {
      const error = new Error(conversionValidation.errors.join(' '));
      error.status = 400;
      error.payload = conversionValidation;
      throw error;
    }

    const [orderRows] = await connection.execute('SELECT id, po_number, nama_pengadaan, payload_json, funnel_id FROM orders WHERE po_number = ? LIMIT 1', [orderNo]);
    if (!orderRows.length) {
      const error = new Error(`Order ${orderNo} tidak ditemukan.`);
      error.status = 404;
      throw error;
    }
    const order = orderRows[0];
    if (order.funnel_id && String(order.funnel_id) !== String(funnelId) && !forceReassign) {
      const error = new Error(`Order ${orderNo} sudah tertaut ke funnel ${order.funnel_id}. Lepaskan relasi lama terlebih dahulu.`);
      error.status = 409;
      throw error;
    }

    await connection.execute(
      `INSERT INTO funnel_order_links (funnel_id, order_id, order_no, link_type, is_primary, linked_by, note)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE link_type = VALUES(link_type), linked_by = VALUES(linked_by), note = VALUES(note), linked_at = CURRENT_TIMESTAMP`,
      [funnelId, order.id, orderNo, linkType, actorName, note],
    );

    await connection.execute(
      `UPDATE funnels
          SET converted = 1,
              converted_order_no = ?,
              updated_by = ?,
              last_update_at = CURRENT_TIMESTAMP,
              payload_json = JSON_SET(COALESCE(payload_json, JSON_OBJECT()), '$.converted', true, '$.convertedOrderNo', ?, '$.lastUpdate', DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s'))
        WHERE id = ?`,
      [orderNo, actorName, orderNo, funnelId],
    );

    await connection.execute(
      `UPDATE orders
          SET funnel_id = ?,
              source_funnel_code = ?,
              source_funnel_name = ?,
              updated_by = ?,
              last_update_at = CURRENT_TIMESTAMP,
              payload_json = JSON_SET(COALESCE(payload_json, JSON_OBJECT()), '$.funnel_id', ?, '$.source_funnel_id', ?, '$.source_funnel_code', ?, '$.source_funnel_name', ?)
        WHERE id = ?`,
      [funnelId, funnelId, funnel.nama_pengadaan || null, actorName, funnelId, funnelId, funnelId, funnel.nama_pengadaan || null, order.id],
    );

    await writeAuditLog(connection, {
      entityType: 'funnel',
      entityId: funnelId,
      actionType: 'link_order',
      actorName,
      summary: `Funnel ${funnelId} ditautkan ke order ${orderNo}`,
      snapshot: { orderNo, linkType, note },
    });
    await writeAuditLog(connection, {
      entityType: 'order',
      entityId: order.id,
      actionType: 'link_funnel',
      actorName,
      summary: `Order ${orderNo} ditautkan ke funnel ${funnelId}`,
      snapshot: { funnelId, linkType, note },
    });

    await connection.commit();
    return {
      funnel_id: funnelId,
      order_id: order.id,
      order_no: orderNo,
      link_type: linkType,
      linked_by: actorName,
      funnel_name: funnel.nama_pengadaan,
      order_name: order.nama_pengadaan,
      warnings: conversionValidation.warnings || [],
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
