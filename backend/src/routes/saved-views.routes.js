
import { Router } from 'express';
import { requireWriteAccess, getActorName } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { deleteSavedView, listSavedViews, upsertSavedView } from '../repositories/saved-views.repository.js';
import { sendCreated, sendOk } from '../utils/api-response.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const data = await listSavedViews({ pageKey: req.query.pageKey });
  sendOk(req, res, data, { total: data.length });
}));

router.post('/', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await upsertSavedView({ ...(req.body || {}), updated_by: getActorName(req, req.body?.updated_by) });
  sendCreated(req, res, data);
}));

router.delete('/:savedViewId', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await deleteSavedView(req.params.savedViewId);
  sendOk(req, res, data);
}));

export default router;
