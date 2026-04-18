
import { Router } from 'express';
import { requireWriteAccess, getActorName } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { deleteOrderDraft, listOrderDrafts, upsertOrderDraft } from '../repositories/order-drafts.repository.js';
import { sendCreated, sendOk } from '../utils/api-response.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const data = await listOrderDrafts();
  sendOk(req, res, data, { total: data.length });
}));

router.post('/', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await upsertOrderDraft({ ...(req.body || {}), updated_by: getActorName(req, req.body?.updated_by) });
  sendCreated(req, res, data);
}));

router.delete('/:draftId', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await deleteOrderDraft(req.params.draftId);
  sendOk(req, res, data);
}));

export default router;
