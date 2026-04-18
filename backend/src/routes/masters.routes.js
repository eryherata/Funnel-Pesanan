
import { Router } from 'express';
import { requireWriteAccess, getActorName } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  deleteMasterLocation,
  deleteMasterOwner,
  deleteMasterPartner,
  deleteMasterPrincipal,
  getMasterBootstrap,
  listMasterLocations,
  listMasterOwners,
  listMasterPartners,
  listMasterPrincipals,
  upsertMasterLocation,
  upsertMasterOwner,
  upsertMasterPartner,
  upsertMasterPrincipal,
  validateMasterEntity,
} from '../repositories/masters.repository.js';
import { sendCreated, sendOk } from '../utils/api-response.js';

const router = Router();

router.get('/bootstrap', asyncHandler(async (req, res) => {
  const data = await getMasterBootstrap();
  sendOk(req, res, data);
}));

router.post('/validate', asyncHandler(async (req, res) => {
  const data = await validateMasterEntity(req.body || {});
  sendOk(req, res, data);
}));

router.get('/locations', asyncHandler(async (req, res) => {
  const data = await listMasterLocations({ wilayah: req.query?.wilayah, kabkota: req.query?.kabkota });
  sendOk(req, res, data, { total: data.length });
}));

router.post('/locations', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await upsertMasterLocation({ ...(req.body || {}), updated_by: getActorName(req, req.body?.updated_by) });
  sendCreated(req, res, data);
}));

router.delete('/locations/:locationId', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await deleteMasterLocation(req.params.locationId);
  sendOk(req, res, data);
}));

router.get('/principals', asyncHandler(async (req, res) => {
  const data = await listMasterPrincipals();
  sendOk(req, res, data, { total: data.length });
}));

router.post('/principals', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await upsertMasterPrincipal({ ...(req.body || {}), updated_by: getActorName(req, req.body?.updated_by) });
  sendCreated(req, res, data);
}));

router.delete('/principals/:principalId', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await deleteMasterPrincipal(req.params.principalId);
  sendOk(req, res, data);
}));

router.get('/owners', asyncHandler(async (req, res) => {
  const data = await listMasterOwners();
  sendOk(req, res, data, { total: data.length });
}));

router.post('/owners', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await upsertMasterOwner({ ...(req.body || {}), updated_by: getActorName(req, req.body?.updated_by) });
  sendCreated(req, res, data);
}));

router.delete('/owners/:ownerId', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await deleteMasterOwner(req.params.ownerId);
  sendOk(req, res, data);
}));

router.get('/partners', asyncHandler(async (req, res) => {
  const data = await listMasterPartners({ partnerType: req.query?.partnerType || req.query?.partner_type });
  sendOk(req, res, data, { total: data.length });
}));

router.post('/partners', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await upsertMasterPartner({ ...(req.body || {}), updated_by: getActorName(req, req.body?.updated_by) });
  sendCreated(req, res, data);
}));

router.delete('/partners/:partnerId', requireWriteAccess, asyncHandler(async (req, res) => {
  const data = await deleteMasterPartner(req.params.partnerId);
  sendOk(req, res, data);
}));

export default router;
