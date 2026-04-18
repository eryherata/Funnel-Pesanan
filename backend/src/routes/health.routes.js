
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendOk } from '../utils/api-response.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  sendOk(req, res, {
    service: 'pantauan-pesanan-api',
    auth_required: env.authRequired,
    database: 'ok',
    version: 'sprint5-step6',
    permissions_version: 'sprint5-step6',
  });
}));

export default router;
