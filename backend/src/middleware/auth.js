
import { env } from '../config/env.js';
import { getSessionByToken } from '../repositories/auth.repository.js';
import { roleMeets } from '../utils/auth.js';
import { canRole, getPermissionsContext } from '../utils/permissions.js';

function extractBearerToken(req) {
  const raw = req.headers.authorization || req.headers.Authorization || '';
  if (String(raw).startsWith('Bearer ')) return String(raw).slice(7).trim();
  return req.headers['x-auth-token'] || null;
}

export async function attachAuth(req, _res, next) {
  const token = extractBearerToken(req);
  req.auth = null;
  if (!token) return next();
  try {
    req.auth = await getSessionByToken(token);
  } catch (error) {
    return next(error);
  }
  next();
}

export function getActorName(req, fallback = 'system') {
  return req?.auth?.user?.display_name || req?.auth?.user?.username || req?.headers?.['x-actor-name'] || fallback;
}

export function requireAuth(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({
      ok: false,
      message: 'Autentikasi dibutuhkan.',
      details: { code: 'AUTH_REQUIRED', requestId: req.requestId || null },
    });
  }
  next();
}

export function requireRole(requiredRole = 'viewer') {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        ok: false,
        message: 'Autentikasi dibutuhkan.',
        details: { code: 'AUTH_REQUIRED', requestId: req.requestId || null },
      });
    }
    if (!roleMeets(requiredRole, req.auth.user.role)) {
      return res.status(403).json({
        ok: false,
        message: 'Akses role tidak mencukupi.',
        details: { code: 'ROLE_FORBIDDEN', requiredRole, currentRole: req.auth.user.role, requestId: req.requestId || null },
      });
    }
    next();
  };
}


export function requirePermission(moduleKey, action = 'read') {
  return (req, res, next) => {
    if (!env.authRequired && !req.auth) return next();
    if (!req.auth) {
      return res.status(401).json({
        ok: false,
        message: 'Autentikasi dibutuhkan.',
        details: { code: 'AUTH_REQUIRED', requestId: req.requestId || null },
      });
    }
    const role = req.auth?.user?.role || 'viewer';
    if (!canRole(role, moduleKey, action)) {
      return res.status(403).json({
        ok: false,
        message: 'Akses modul tidak mencukupi.',
        details: {
          code: 'MODULE_FORBIDDEN',
          moduleKey,
          action,
          role,
          permissions: getPermissionsContext(role),
          requestId: req.requestId || null,
        },
      });
    }
    next();
  };
}

export function requireWriteAccess(req, res, next) {
  if (!env.authRequired && !req.auth) return next();
  return requireRole('editor')(req, res, next);
}
