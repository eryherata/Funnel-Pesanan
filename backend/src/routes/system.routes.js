import { Router } from 'express';
import { getActorName, requireAuth, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendOk } from '../utils/api-response.js';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { exportSystemBackup, restoreSystemBackup } from '../repositories/system.repository.js';

const router = Router();

router.get('/runtime-status', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  sendOk(req, res, {
    service: 'pantauan-pesanan-api',
    version: 'sprint5-step6',
    database: 'ok',
    auth_required: env.authRequired,
    trust_proxy: env.trustProxy,
    import_limits: {
      max_rows: env.importMaxRows,
      max_errors: env.importMaxErrors,
    },
    session_ttl_days: env.sessionTtlDays,
    app_origin: env.appOrigin,
  }, { scope: 'runtime' });
}));

router.get('/backup', requireAuth, requirePermission('backups', 'export'), asyncHandler(async (req, res) => {
  const data = await exportSystemBackup(getActorName(req, 'system'));
  sendOk(req, res, data, { scope: 'backend' });
}));

router.post('/restore', requireAuth, requirePermission('backups', 'restore'), asyncHandler(async (req, res) => {
  const mode = String(req.body?.mode || req.query?.mode || 'replace').trim().toLowerCase();
  const data = await restoreSystemBackup(req.body?.bundle || req.body, getActorName(req, 'system'), { mode });
  sendOk(req, res, data, { scope: 'backend' });
}));

export default router;
