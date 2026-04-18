
import { pool } from '../db/pool.js';

export async function listAuditLogs(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.entityType) {
    clauses.push('entity_type = ?');
    params.push(filters.entityType);
  }
  if (filters.entityId) {
    clauses.push('entity_id = ?');
    params.push(filters.entityId);
  }
  const limit = Number(filters.limit || 50);
  const sql = `SELECT id, entity_type, entity_id, action_type, actor_name, summary, snapshot_json AS snapshotJson, created_at
    FROM audit_logs
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY created_at DESC, id DESC
    LIMIT ?`;
  const [rows] = await pool.query(sql, [...params, Math.min(Math.max(limit, 1), 200)]);
  return rows.map((row) => ({
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    action_type: row.action_type,
    actor_name: row.actor_name,
    summary: row.summary,
    snapshot_json: row.snapshotJson,
    created_at: row.created_at,
  }));
}
