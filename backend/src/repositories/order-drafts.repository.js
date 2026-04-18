import { pool } from '../db/pool.js';
import { writeAuditLog } from '../utils/audit.js';

function normalizeOrderDraft(rawDraft) {
  const payload = { ...(rawDraft || {}) };
  const draftId = payload.id || payload.draft_id || `DRAFT-${Date.now()}`;
  const draftCode = payload.draft_code || payload.draftCode || payload.po_number || payload.nama_pengadaan || draftId;
  const draftPayload = payload.payload_json || payload.payload || payload.order || payload;
  return {
    id: draftId,
    draft_code: draftCode,
    po_number: draftPayload.po_number || payload.po_number || null,
    satker: draftPayload.satker || payload.satker || null,
    nama_pengadaan: draftPayload.nama_pengadaan || draftPayload.namaPengadaan || payload.nama_pengadaan || payload.namaPengadaan || null,
    principal: draftPayload.principal || payload.principal || null,
    entry_stage: draftPayload.entry_stage || payload.entry_stage || payload.entryStage || 'header',
    status_target: draftPayload.status_pesanan || payload.status_target || payload.statusTarget || 'Baru',
    source_funnel_id: draftPayload.funnel_id || payload.source_funnel_id || payload.sourceFunnelId || null,
    updated_by: payload.updated_by || payload.updatedBy || draftPayload.updated_by || 'Form Pesanan',
    last_saved_at: payload.last_saved_at || payload.lastSavedAt || new Date().toISOString(),
    payload_json: {
      ...draftPayload,
      id: draftId,
      draft_id: draftId,
      draft_code: draftCode,
      entry_stage: draftPayload.entry_stage || payload.entry_stage || payload.entryStage || 'header',
      updated_by: payload.updated_by || payload.updatedBy || draftPayload.updated_by || 'Form Pesanan',
      last_saved_at: payload.last_saved_at || payload.lastSavedAt || new Date().toISOString(),
      entry_mode: 'draft',
      is_draft: true,
    },
  };
}

export async function listOrderDrafts() {
  const [rows] = await pool.query('SELECT payload_json AS payloadJson FROM order_drafts ORDER BY updated_at DESC, created_at DESC');
  return rows.map((row) => row.payloadJson || {});
}

export async function upsertOrderDraft(rawDraft) {
  const draft = normalizeOrderDraft(rawDraft);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO order_drafts (
        id, draft_code, po_number, satker, nama_pengadaan, principal, entry_stage, status_target, source_funnel_id, updated_by, last_saved_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        draft_code = VALUES(draft_code), po_number = VALUES(po_number), satker = VALUES(satker), nama_pengadaan = VALUES(nama_pengadaan),
        principal = VALUES(principal), entry_stage = VALUES(entry_stage), status_target = VALUES(status_target), source_funnel_id = VALUES(source_funnel_id),
        updated_by = VALUES(updated_by), last_saved_at = VALUES(last_saved_at), payload_json = VALUES(payload_json), updated_at = CURRENT_TIMESTAMP`,
      [
        draft.id,
        draft.draft_code,
        draft.po_number,
        draft.satker,
        draft.nama_pengadaan,
        draft.principal,
        draft.entry_stage,
        draft.status_target,
        draft.source_funnel_id,
        draft.updated_by,
        draft.last_saved_at,
        JSON.stringify(draft.payload_json),
      ],
    );

    await writeAuditLog(connection, {
      entityType: 'order_draft',
      entityId: draft.id,
      actionType: 'save',
      actorName: draft.updated_by,
      summary: `Menyimpan draft order ${draft.draft_code}`,
      snapshot: { draft_code: draft.draft_code, po_number: draft.po_number, entry_stage: draft.entry_stage },
    });

    await connection.commit();
    return draft.payload_json;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteOrderDraft(draftId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT payload_json AS payloadJson FROM order_drafts WHERE id = ? LIMIT 1', [draftId]);
    await connection.execute('DELETE FROM order_drafts WHERE id = ?', [draftId]);
    await writeAuditLog(connection, {
      entityType: 'order_draft',
      entityId: draftId,
      actionType: 'delete',
      actorName: 'Form Pesanan',
      summary: `Menghapus draft order ${draftId}`,
      snapshot: rows?.[0]?.payloadJson || null,
    });
    await connection.commit();
    return { id: draftId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
