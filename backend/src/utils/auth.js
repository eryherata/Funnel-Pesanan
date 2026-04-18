
import crypto from 'crypto';

export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || '')).digest('hex');
}

export function verifyPassword(password, passwordHash) {
  return hashPassword(password) === String(passwordHash || '');
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (['admin', 'administrator'].includes(value)) return 'admin';
  if (['editor', 'ops', 'operator'].includes(value)) return 'editor';
  return 'viewer';
}

export function roleMeets(requiredRole, actualRole) {
  const rank = { viewer: 1, editor: 2, admin: 3 };
  return (rank[normalizeRole(actualRole)] || 0) >= (rank[normalizeRole(requiredRole)] || 0);
}
