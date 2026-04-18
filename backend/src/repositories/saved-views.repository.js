import { pool } from '../db/pool.js';
import { writeAuditLog } from '../utils/audit.js';

function normalizeSavedView(payload = {}) {
  return {
    id: payload.id || payload.view_id || `VIEW-${Date.now()}`,
    page_key: payload.page_key || payload.pageKey || 'data-pesanan',
    name: payload.name || 'View',
    note: payload.note || null,
    is_default: Number(payload.is_default ?? payload.isDefault ?? 0) === 1 ? 1 : 0,
    filter_state: payload.filter_state || payload.filterState || {},
    updated_by: payload.updated_by || payload.updatedBy || 'system',
  };
}

export async function listSavedViews(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.pageKey) {
    clauses.push('page_key = ?');
    params.push(filters.pageKey);
  }
  const sql = `SELECT id, page_key AS pageKey, name, note, is_default AS isDefault, filter_state_json AS filterState, updated_by AS updatedBy, created_at, updated_at
    FROM saved_views ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY is_default DESC, updated_at DESC, name ASC`;
  const [rows] = await pool.query(sql, params);
  return rows.map((row) => ({
    ...row,
    page_key: row.pageKey,
    is_default: row.isDefault,
    filter_state: typeof row.filterState === 'string' ? JSON.parse(row.filterState || '{}') : (row.filterState || {}),
    updated_by: row.updatedBy,
  }));
}

export async function upsertSavedView(rawView) {
  const view = normalizeSavedView(rawView);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (view.is_default) {
      await connection.execute('UPDATE saved_views SET is_default = 0 WHERE page_key = ? AND id <> ?', [view.page_key, view.id]);
    }
    await connection.execute(
      `INSERT INTO saved_views (id, page_key, name, note, is_default, filter_state_json, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE page_key = VALUES(page_key), name = VALUES(name), note = VALUES(note), is_default = VALUES(is_default), filter_state_json = VALUES(filter_state_json), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`,
      [view.id, view.page_key, view.name, view.note, view.is_default, JSON.stringify(view.filter_state), view.updated_by]
    );
    await writeAuditLog(connection, {
      entityType: 'saved_view',
      entityId: view.id,
      actionType: 'upsert',
      actorName: view.updated_by,
      summary: `Menyimpan view ${view.name} untuk halaman ${view.page_key}`,
      snapshot: view,
    });
    await connection.commit();
    return view;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteSavedView(savedViewId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id, name, page_key FROM saved_views WHERE id = ? LIMIT 1', [savedViewId]);
    await connection.execute('DELETE FROM saved_views WHERE id = ?', [savedViewId]);
    if (rows.length) {
      await writeAuditLog(connection, {
        entityType: 'saved_view',
        entityId: rows[0].id,
        actionType: 'delete',
        actorName: 'system',
        summary: `Menghapus view ${rows[0].name} dari halaman ${rows[0].page_key}`,
        snapshot: rows[0],
      });
    }
    await connection.commit();
    return { id: savedViewId, deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
