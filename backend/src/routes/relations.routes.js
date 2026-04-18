
import { Router } from 'express';
import { requireWriteAccess, getActorName } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { linkFunnelOrder, listFunnelOrderLinks } from '../repositories/relations.repository.js';
import { sendCreated, sendOk } from '../utils/api-response.js';

const router = Router();

router.get('/funnel-order', asyncHandler(async (req, res) => {
  const data = await listFunnelOrderLinks({
    funnelId: req.query.funnelId,
    orderNo: req.query.orderNo,
    orderId: req.query.orderId,
  });
  sendOk(req, res, data, { total: data.length });
}));

router.post('/funnel-order', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await linkFunnelOrder({ ...(req.body || {}), actorName: getActorName(req, req.body?.actorName || req.body?.linked_by) });
  sendCreated(req, res, data);
}));

export default router;
