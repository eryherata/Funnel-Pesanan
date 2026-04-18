
import { Router } from 'express';
import { requireWriteAccess, getActorName } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { buildPageMeta, normalizePagination, sendCreated, sendOk } from '../utils/api-response.js';
import { bulkReplaceOrders, listOrders, upsertOrder } from '../repositories/orders.repository.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const paging = normalizePagination(req.query);
  const result = await listOrders({
    q: req.query.q,
    statusPesanan: req.query.statusPesanan || req.query.status_pesanan,
    statusPengiriman: req.query.statusPengiriman || req.query.status_pengiriman,
    pic: req.query.pic,
    wilayah: req.query.wilayah,
    page: paging.page,
    pageSize: paging.pageSize,
  });
  sendOk(req, res, result.rows, buildPageMeta(result.total, result.page, result.pageSize));
}));

router.post('/', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await upsertOrder({ ...(req.body || {}), updated_by: getActorName(req, req.body?.updated_by) });
  sendCreated(req, res, data);
}));

router.post('/bulk-replace', requireWriteAccess, asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows.map((item) => ({ ...item, updated_by: getActorName(req, item?.updated_by || req.body?.updated_by) })) : [];
  const data = await bulkReplaceOrders(rows);
  sendOk(req, res, data, { total: data.length });
}));

export default router;
