import { pool } from '../db/pool.js';
import { writeAuditLog } from '../utils/audit.js';

function normalizeIssue(payload = {}) {
  return {
    id: payload.id || payload.issue_id || `ISS-${Date.now()}`,
    order_id: payload.order_id || payload.orderId || null,
    order_no: payload.order_no || payload.orderNo || payload.po_number || null,
    issue_type: payload.issue_type || payload.type || 'Exception',
    severity: payload.severity || 'Sedang',
    title: payload.title || payload.summary || payload.issue_type || 'Issue',
    description: payload.description || payload.note || payload.catatan || null,
    owner_name: payload.owner_name || payload.ownerName || payload.owner || null,
    due_date: payload.due_date || payload.dueDate || null,
    status: payload.status || 'Open',
    resolved_at: payload.resolved_at || payload.resolvedAt || null,
    snapshot_json: payload.snapshot_json || payload.snapshot || payload || null,
  };
}

export async function listOrderIssues(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.orderNo) { clauses.push('order_no = ?'); params.push(filters.orderNo); }
  if (filters.status) { clauses.push('status = ?'); params.push(filters.status); }
  const sql = `SELECT id, order_id, order_no, issue_type, severity, title, description, owner_name, due_date, status, resolved_at, snapshot_json AS snapshotJson, created_at, updated_at
    FROM order_issues ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY FIELD(status,'Open','Resolved'), FIELD(severity,'Kritis','Tinggi','Sedang','Rendah'), COALESCE(due_date, '2999-12-31') ASC, updated_at DESC`;
  const [rows] = await pool.query(sql, params);
  return rows.map((row) => ({ ...row, snapshot_json: row.snapshotJson }));
}

export async function upsertOrderIssue(rawIssue) {
  const issue = normalizeIssue(rawIssue);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO order_issues (id, order_id, order_no, issue_type, severity, title, description, owner_name, due_date, status, resolved_at, snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE order_id = VALUES(order_id), order_no = VALUES(order_no), issue_type = VALUES(issue_type), severity = VALUES(severity), title = VALUES(title), description = VALUES(description), owner_name = VALUES(owner_name), due_date = VALUES(due_date), status = VALUES(status), resolved_at = VALUES(resolved_at), snapshot_json = VALUES(snapshot_json), updated_at = CURRENT_TIMESTAMP`,
      [issue.id, issue.order_id, issue.order_no, issue.issue_type, issue.severity, issue.title, issue.description, issue.owner_name, issue.due_date, issue.status, issue.resolved_at, JSON.stringify(issue.snapshot_json)]
    );
    await writeAuditLog(connection, {
      entityType: 'order',
      entityId: issue.order_id || issue.order_no,
      actionType: issue.status === 'Resolved' ? 'issue_resolved' : 'issue_upsert',
      actorName: issue.owner_name || 'system',
      summary: `${issue.status === 'Resolved' ? 'Menyelesaikan' : 'Memperbarui'} ${issue.issue_type} ${issue.title} pada order ${issue.order_no}`,
      snapshot: issue,
    });
    await connection.commit();
    return issue;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteOrderIssue(issueId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT order_id, order_no, issue_type, title FROM order_issues WHERE id = ? LIMIT 1', [issueId]);
    await connection.execute('DELETE FROM order_issues WHERE id = ?', [issueId]);
    if (rows.length) {
      const item = rows[0];
      await writeAuditLog(connection, {
        entityType: 'order',
        entityId: item.order_id || item.order_no,
        actionType: 'issue_delete',
        actorName: 'system',
        summary: `Menghapus ${item.issue_type} ${item.title} pada order ${item.order_no}`,
        snapshot: { issueId },
      });
    }
    await connection.commit();
    return { id: issueId, deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
