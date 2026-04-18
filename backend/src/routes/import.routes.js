import { Router } from 'express';
import { env } from '../config/env.js';
import { getActorName, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendOk } from '../utils/api-response.js';
import { upsertOrder } from '../repositories/orders.repository.js';
import { upsertFunnel } from '../repositories/funnels.repository.js';
import { upsertMasterLocation, upsertMasterOwner, upsertMasterPartner, upsertMasterPrincipal } from '../repositories/masters.repository.js';
import { getImportTemplate, listImportTemplates, toTemplateCsv, validateImportRows } from '../utils/import-templates.js';

const router = Router();

function ensureRows(req) {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) {
    const error = new Error('Rows import kosong.');
    error.status = 400;
    throw error;
  }
  if (rows.length > env.importMaxRows) {
    const error = new Error(`Maksimal import ${env.importMaxRows} baris per proses.`);
    error.status = 400;
    throw error;
  }
  return rows;
}


router.get('/templates', requirePermission('settings', 'read'), asyncHandler(async (req, res) => {
  sendOk(req, res, { templates: listImportTemplates() });
}));

router.get('/templates/:target', requirePermission('settings', 'read'), asyncHandler(async (req, res) => {
  const target = String(req.params.target || '').trim().toLowerCase();
  const template = getImportTemplate(target);
  if (!template) {
    const error = new Error('Template import tidak dikenali.');
    error.status = 404;
    throw error;
  }
  if (String(req.query?.format || '').trim().toLowerCase() === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    res.send(toTemplateCsv(target));
    return;
  }
  sendOk(req, res, template);
}));

router.post('/orders', requirePermission('orders', 'import'), asyncHandler(async (req, res) => {
  const rows = ensureRows(req);
  const validation = validateImportRows('orders', rows);
  const preview = {
    target: 'orders',
    rows: validation.rows.length,
    normalizedPreview: validation.rows.slice(0, 5),
    errors: validation.errors.slice(0, env.importMaxErrors),
    warnings: validation.warnings.slice(0, env.importMaxErrors),
  };
  const dryRun = Boolean(req.body?.dryRun ?? req.query?.dryRun);
  if (dryRun) {
    sendOk(req, res, { dryRun: true, imported: 0, ...preview });
    return;
  }
  if (preview.errors.length) {
    const error = new Error('Validasi import orders gagal.');
    error.status = 400;
    error.payload = { errors: preview.errors, warnings: preview.warnings };
    throw error;
  }
  const imported = [];
  for (const row of validation.rows) {
    imported.push(await upsertOrder({ ...row, updated_by: getActorName(req, row?.updated_by) }));
  }
  sendOk(req, res, { dryRun: false, imported: imported.length, ...preview, warnings: preview.warnings });
}));

router.post('/funnels', requirePermission('funnels', 'import'), asyncHandler(async (req, res) => {
  const rows = ensureRows(req);
  const validation = validateImportRows('funnels', rows);
  const dryRun = Boolean(req.body?.dryRun ?? req.query?.dryRun);
  const preview = {
    target: 'funnels',
    rows: validation.rows.length,
    normalizedPreview: validation.rows.slice(0, 5),
    errors: validation.errors.slice(0, env.importMaxErrors),
    warnings: validation.warnings.slice(0, env.importMaxErrors),
  };
  if (dryRun) {
    sendOk(req, res, { dryRun: true, imported: 0, ...preview });
    return;
  }
  if (preview.errors.length) {
    const error = new Error('Validasi import funnels gagal.');
    error.status = 400;
    error.payload = { errors: preview.errors, warnings: preview.warnings };
    throw error;
  }
  const imported = [];
  for (const row of validation.rows) {
    imported.push(await upsertFunnel({ ...row, updated_by: getActorName(req, row?.updated_by) }));
  }
  sendOk(req, res, { dryRun: false, imported: imported.length, ...preview, warnings: preview.warnings });
}));

router.post('/masters/:entity', requirePermission('masters', 'import'), asyncHandler(async (req, res) => {
  const rows = ensureRows(req);
  const entity = String(req.params.entity || '').trim().toLowerCase();
  const dryRun = Boolean(req.body?.dryRun ?? req.query?.dryRun);
  const actor = getActorName(req, 'system');
  const importers = {
    locations: upsertMasterLocation,
    principals: upsertMasterPrincipal,
    partners: upsertMasterPartner,
    owners: upsertMasterOwner,
  };
  const importer = importers[entity];
  if (!importer) {
    const error = new Error('Entity master import tidak dikenali.');
    error.status = 400;
    throw error;
  }
  const validation = validateImportRows(entity, rows);
  const preview = {
    target: entity,
    rows: validation.rows.length,
    normalizedPreview: validation.rows.slice(0, 5),
    errors: validation.errors.slice(0, env.importMaxErrors),
    warnings: validation.warnings.slice(0, env.importMaxErrors),
  };
  if (dryRun) {
    sendOk(req, res, { dryRun: true, imported: 0, ...preview });
    return;
  }
  if (preview.errors.length) {
    const error = new Error('Validasi import master gagal.');
    error.status = 400;
    error.payload = { errors: preview.errors, warnings: preview.warnings };
    throw error;
  }
  let imported = 0;
  const runtimeErrors = [];
  for (let index = 0; index < validation.rows.length; index += 1) {
    try {
      await importer({ ...validation.rows[index], updated_by: actor });
      imported += 1;
    } catch (error) {
      runtimeErrors.push({ row: index + 1, message: error.message });
    }
  }
  sendOk(req, res, { dryRun: false, imported, ...preview, errors: runtimeErrors.slice(0, env.importMaxErrors), warnings: preview.warnings });
}));

export default router;
