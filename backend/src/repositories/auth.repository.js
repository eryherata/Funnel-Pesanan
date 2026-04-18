
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { generateSessionToken, normalizeRole, verifyPassword } from '../utils/auth.js';

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: normalizeRole(row.role_name || row.role),
    is_active: Number(row.is_active ?? 1) === 1,
    last_login_at: row.last_login_at || null,
  };
}

export async function authenticateUser(username, password) {
  const [rows] = await pool.execute(
    `SELECT id, username, display_name, role_name, password_hash, is_active, last_login_at
       FROM app_users
      WHERE username = ? LIMIT 1`,
    [String(username || '').trim()],
  );
  const user = rows[0];
  if (!user || Number(user.is_active || 0) !== 1 || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + env.sessionTtlDays * 24 * 60 * 60 * 1000);

  await pool.execute(
    `INSERT INTO app_sessions (token, user_id, expires_at, last_seen_at)
     VALUES (?, ?, ?, NOW())`,
    [token, user.id, expiresAt],
  );
  await pool.execute(
    `UPDATE app_users SET last_login_at = NOW() WHERE id = ?`,
    [user.id],
  );

  return {
    user: mapUser(user),
    token,
    expires_at: expiresAt.toISOString(),
  };
}

export async function getSessionByToken(token) {
  if (!token) return null;
  const [rows] = await pool.execute(
    `SELECT s.token, s.expires_at, s.last_seen_at, u.id, u.username, u.display_name, u.role_name, u.is_active, u.last_login_at
       FROM app_sessions s
       JOIN app_users u ON u.id = s.user_id
      WHERE s.token = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
      LIMIT 1`,
    [token],
  );
  const row = rows[0];
  if (!row || Number(row.is_active || 0) !== 1) return null;
  await pool.execute(`UPDATE app_sessions SET last_seen_at = NOW() WHERE token = ?`, [token]);
  return {
    token: row.token,
    expires_at: row.expires_at,
    last_seen_at: row.last_seen_at,
    user: mapUser(row),
  };
}

export async function revokeSession(token) {
  if (!token) return false;
  await pool.execute(`UPDATE app_sessions SET revoked_at = NOW() WHERE token = ?`, [token]);
  return true;
}
