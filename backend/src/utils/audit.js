export async function writeAuditLog(connection, payload) {
  const { entityType, entityId, actionType, actorName = 'system', summary = '', snapshot = null } = payload;
  await connection.execute(
    `INSERT INTO audit_logs (entity_type, entity_id, action_type, actor_name, summary, snapshot_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entityType, entityId, actionType, actorName, summary, snapshot ? JSON.stringify(snapshot) : null],
  );
}
