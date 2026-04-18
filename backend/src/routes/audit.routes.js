
import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { listAuditLogs } from '../repositories/audit.repository.js';
import { sendOk } from '../utils/api-response.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const data = await listAuditLogs({
    entityType: req.query.entityType,
    entityId: req.query.entityId,
    limit: req.query.limit,
  });
  sendOk(req, res, data, { total: data.length });
}));

export default router;
