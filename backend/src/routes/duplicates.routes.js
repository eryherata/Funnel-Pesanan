
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../utils/async-handler.js';
import { checkFunnelDuplicates, checkOrderDuplicates } from '../utils/duplicate-checker.js';
import { sendOk } from '../utils/api-response.js';

const router = Router();

router.post('/check', asyncHandler(async (req, res) => {
  const entityType = String(req.body?.entityType || req.body?.entity || '').trim().toLowerCase();
  const row = req.body?.row || req.body?.payload || req.body || {};
  if (!entityType) {
    const error = new Error('entityType wajib diisi.');
    error.status = 400;
    throw error;
  }

  if (entityType === 'order' || entityType === 'orders') {
    const [rows] = await pool.query('SELECT payload_json AS payloadJson FROM orders ORDER BY updated_at DESC');
    const report = checkOrderDuplicates(row, rows.map((item) => item.payloadJson || {}));
    return sendOk(req, res, report);
  }

  if (entityType === 'funnel' || entityType === 'funnels') {
    const [rows] = await pool.query('SELECT payload_json AS payloadJson FROM funnels ORDER BY updated_at DESC');
    const report = checkFunnelDuplicates(row, rows.map((item) => item.payloadJson || {}));
    return sendOk(req, res, report);
  }

  const error = new Error('entityType hanya mendukung order atau funnel.');
  error.status = 400;
  throw error;
}));

export default router;
