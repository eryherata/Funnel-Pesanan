
import { pool } from '../db/pool.js';
import { normalizeFunnel } from '../utils/normalizers.js';
import { writeAuditLog } from '../utils/audit.js';
import { listFunnelOrderLinks } from './relations.repository.js';

function enrichFunnels(rows, links) {
  const grouped = new Map();
  (links || []).forEach((link) => {
    const list = grouped.get(link.funnel_id) || [];
    list.push({
      orderNo: link.order_no,
      orderId: link.order_id,
      linkType: link.link_type,
      linkedAt: link.linked_at,
      linkedBy: link.linked_by,
      orderName: link.order_name,
    });
    grouped.set(link.funnel_id, list);
  });
  return (rows || []).map((row) => {
    const payload = row.payloadJson || {};
    const relatedOrders = grouped.get(payload.id) || [];
    return {
      ...payload,
      relatedOrders,
      converted: Boolean(payload.converted || relatedOrders.length),
      convertedOrderNo: payload.convertedOrderNo || relatedOrders?.[0]?.orderNo || payload.converted_order_no || '',
    };
  });
}

function buildFunnelFilter(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.stage) {
    clauses.push('stage = ?');
    params.push(filters.stage);
  }
  if (filters.status) {
    clauses.push('status = ?');
    params.push(filters.status);
  }
  if (filters.priority) {
    clauses.push('priority = ?');
    params.push(filters.priority);
  }
  if (filters.penggarap) {
    clauses.push('penggarap = ?');
    params.push(filters.penggarap);
  }
  if (filters.wilayah) {
    clauses.push('wilayah = ?');
    params.push(filters.wilayah);
  }
  if (filters.q) {
    const q = `%${String(filters.q).trim()}%`;
    clauses.push('(id LIKE ? OR kode_rup LIKE ? OR nama_pengadaan LIKE ? OR satker LIKE ? OR instansi LIKE ? OR principal LIKE ? OR penggarap LIKE ?)');
    params.push(q, q, q, q, q, q, q);
  }
  return { whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export async function listFunnels(filters = {}) {
  const { whereSql, params } = buildFunnelFilter(filters);
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(filters.pageSize || filters.limit || 500)));
  const offset = (page - 1) * pageSize;

  const [[{ total }], rows, links] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM funnels ${whereSql}`, params).then(([result]) => result),
    pool.query(
      `SELECT payload_json AS payloadJson
         FROM funnels
         ${whereSql}
        ORDER BY COALESCE(input_date, created_at) DESC, created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    ).then(([result]) => result),
    listFunnelOrderLinks(),
  ]);

  return {
    rows: enrichFunnels(rows, links),
    total,
    page,
    pageSize,
  };
}

export async function upsertFunnel(rawFunnel) {
  const funnel = normalizeFunnel(rawFunnel);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO funnels (
        id, input_date, kode_rup, nama_pengadaan, wilayah, kabkota, instansi, satker,
        sumber_peluang, principal, pemasok, distributor, pelaksana, pic_omset, penggarap,
        estimasi_brutto, estimasi_netto, estimasi_negosiasi, estimasi_margin_pct, estimasi_qty,
        stage, probability, target_closing, follow_up_date, next_action, status, priority,
        converted, converted_order_no, updated_by, last_update_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        input_date = VALUES(input_date), kode_rup = VALUES(kode_rup), nama_pengadaan = VALUES(nama_pengadaan),
        wilayah = VALUES(wilayah), kabkota = VALUES(kabkota), instansi = VALUES(instansi), satker = VALUES(satker),
        sumber_peluang = VALUES(sumber_peluang), principal = VALUES(principal), pemasok = VALUES(pemasok),
        distributor = VALUES(distributor), pelaksana = VALUES(pelaksana), pic_omset = VALUES(pic_omset),
        penggarap = VALUES(penggarap), estimasi_brutto = VALUES(estimasi_brutto), estimasi_netto = VALUES(estimasi_netto),
        estimasi_negosiasi = VALUES(estimasi_negosiasi), estimasi_margin_pct = VALUES(estimasi_margin_pct),
        estimasi_qty = VALUES(estimasi_qty), stage = VALUES(stage), probability = VALUES(probability),
        target_closing = VALUES(target_closing), follow_up_date = VALUES(follow_up_date), next_action = VALUES(next_action),
        status = VALUES(status), priority = VALUES(priority), converted = VALUES(converted),
        converted_order_no = VALUES(converted_order_no), updated_by = VALUES(updated_by),
        last_update_at = VALUES(last_update_at), payload_json = VALUES(payload_json), updated_at = CURRENT_TIMESTAMP`,
      [
        funnel.id, funnel.input_date, funnel.kode_rup, funnel.nama_pengadaan, funnel.wilayah, funnel.kabkota,
        funnel.instansi, funnel.satker, funnel.sumber_peluang, funnel.principal, funnel.pemasok, funnel.distributor,
        funnel.pelaksana, funnel.pic_omset, funnel.penggarap, funnel.estimasi_brutto, funnel.estimasi_netto,
        funnel.estimasi_negosiasi, funnel.estimasi_margin_pct, funnel.estimasi_qty, funnel.stage, funnel.probability,
        funnel.target_closing, funnel.follow_up_date, funnel.next_action, funnel.status, funnel.priority,
        funnel.converted ? 1 : 0, funnel.converted_order_no, funnel.updated_by, funnel.last_update_at, JSON.stringify(funnel.payload_json),
      ],
    );

    await writeAuditLog(connection, {
      entityType: 'funnel',
      entityId: funnel.id,
      actionType: 'upsert',
      actorName: funnel.updated_by,
      summary: `Menyimpan funnel ${funnel.id}`,
      snapshot: funnel.payload_json,
    });

    await connection.commit();
    return funnel.payload_json;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function bulkReplaceFunnels(rows) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM funnel_order_links');
    await connection.query('DELETE FROM funnels');
    for (const row of rows || []) {
      const funnel = normalizeFunnel(row);
      await connection.execute(
        `INSERT INTO funnels (
          id, input_date, kode_rup, nama_pengadaan, wilayah, kabkota, instansi, satker,
          sumber_peluang, principal, pemasok, distributor, pelaksana, pic_omset, penggarap,
          estimasi_brutto, estimasi_netto, estimasi_negosiasi, estimasi_margin_pct, estimasi_qty,
          stage, probability, target_closing, follow_up_date, next_action, status, priority,
          converted, converted_order_no, updated_by, last_update_at, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          funnel.id, funnel.input_date, funnel.kode_rup, funnel.nama_pengadaan, funnel.wilayah, funnel.kabkota,
          funnel.instansi, funnel.satker, funnel.sumber_peluang, funnel.principal, funnel.pemasok, funnel.distributor,
          funnel.pelaksana, funnel.pic_omset, funnel.penggarap, funnel.estimasi_brutto, funnel.estimasi_netto,
          funnel.estimasi_negosiasi, funnel.estimasi_margin_pct, funnel.estimasi_qty, funnel.stage, funnel.probability,
          funnel.target_closing, funnel.follow_up_date, funnel.next_action, funnel.status, funnel.priority,
          funnel.converted ? 1 : 0, funnel.converted_order_no, funnel.updated_by, funnel.last_update_at, JSON.stringify(funnel.payload_json),
        ],
      );
    }
    await writeAuditLog(connection, {
      entityType: 'funnel',
      entityId: 'bulk',
      actionType: 'bulk_replace',
      actorName: 'system',
      summary: `Mengganti seluruh dataset funnel (${(rows || []).length} baris)`,
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
