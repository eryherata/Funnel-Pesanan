
import crypto from 'crypto';

function sanitizePath(path) {
  return String(path || '/').replace(/[^a-z0-9/_-]+/gi, '').slice(0, 48) || 'req';
}

export function requestContext(req, res, next) {
  const requestId = req.headers['x-request-id'] || `${sanitizePath(req.path).replace(/[\/]/g, '-')}-${crypto.randomUUID()}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    console[level === 'error' ? 'error' : 'log'](
      `[api:${level}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms requestId=${requestId}`
    );
  });
  next();
}

export function basicSecurityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
}
