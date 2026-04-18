
import { Router } from 'express';
import { requireWriteAccess, getActorName } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { deleteOrderIssue, listOrderIssues, upsertOrderIssue } from '../repositories/order-issues.repository.js';
import { sendCreated, sendOk } from '../utils/api-response.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const data = await listOrderIssues({ orderNo: req.query.orderNo, status: req.query.status });
  sendOk(req, res, data, { total: data.length });
}));

router.post('/', requireWriteAccess, asyncHandler(async (req, res) => {
  const body = { ...(req.body || {}) };
  if (!body.owner_name && !body.ownerName && !body.owner) body.owner_name = getActorName(req);
  const data = await upsertOrderIssue(body);
  sendCreated(req, res, data);
}));

router.delete('/:issueId', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await deleteOrderIssue(req.params.issueId);
  sendOk(req, res, data);
}));

export default router;
