import { pool } from '../db/pool.js';
import { getMasterBootstrap } from './masters.repository.js';
import { normalizeFunnel, normalizeOrder } from '../utils/normalizers.js';
import { writeAuditLog } from '../utils/audit.js';

function asJson(value) {
  return value == null ? null : JSON.stringify(value);
}

async function listPayloadRows(tableName) {
  const [rows] = await pool.query(`SELECT payload_json AS payloadJson FROM ${tableName} ORDER BY updated_at DESC, created_at DESC`);
  return rows.map((row) => row.payloadJson || {});
}

async function resetAllData(connection) {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query('DELETE FROM order_items');
  await connection.query('DELETE FROM funnel_order_links');
  await connection.query('DELETE FROM order_drafts');
  await connection.query('DELETE FROM order_issues');
  await connection.query('DELETE FROM saved_views');
  await connection.query('DELETE FROM orders');
  await connection.query('DELETE FROM funnels');
  await connection.query('DELETE FROM master_locations');
  await connection.query('DELETE FROM master_principals');
  await connection.query('DELETE FROM master_owners');
  await connection.query('DELETE FROM master_partners');
  await connection.query('DELETE FROM audit_logs');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function upsertFunnelRow(connection, raw, actorName) {
  const funnel = normalizeFunnel(raw);
  await connection.execute(
    `INSERT INTO funnels (
      id, input_date, kode_rup, nama_pengadaan, wilayah, kabkota, instansi, satker,
      sumber_peluang, principal, pemasok, distributor, pelaksana, pic_omset, penggarap,
      estimasi_brutto, estimasi_netto, estimasi_negosiasi, estimasi_margin_pct, estimasi_qty,
      stage, probability, target_closing, follow_up_date, next_action, status, priority,
      converted, converted_order_no, updated_by, last_update_at, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      input_date = VALUES(input_date), kode_rup = VALUES(kode_rup), nama_pengadaan = VALUES(nama_pengadaan), wilayah = VALUES(wilayah), kabkota = VALUES(kabkota),
      instansi = VALUES(instansi), satker = VALUES(satker), sumber_peluang = VALUES(sumber_peluang), principal = VALUES(principal), pemasok = VALUES(pemasok),
      distributor = VALUES(distributor), pelaksana = VALUES(pelaksana), pic_omset = VALUES(pic_omset), penggarap = VALUES(penggarap),
      estimasi_brutto = VALUES(estimasi_brutto), estimasi_netto = VALUES(estimasi_netto), estimasi_negosiasi = VALUES(estimasi_negosiasi),
      estimasi_margin_pct = VALUES(estimasi_margin_pct), estimasi_qty = VALUES(estimasi_qty), stage = VALUES(stage), probability = VALUES(probability),
      target_closing = VALUES(target_closing), follow_up_date = VALUES(follow_up_date), next_action = VALUES(next_action), status = VALUES(status), priority = VALUES(priority),
      converted = VALUES(converted), converted_order_no = VALUES(converted_order_no), updated_by = VALUES(updated_by), last_update_at = VALUES(last_update_at), payload_json = VALUES(payload_json)`,
    [
      funnel.id, funnel.input_date, funnel.kode_rup, funnel.nama_pengadaan, funnel.wilayah, funnel.kabkota,
      funnel.instansi, funnel.satker, funnel.sumber_peluang, funnel.principal, funnel.pemasok, funnel.distributor,
      funnel.pelaksana, funnel.pic_omset, funnel.penggarap, funnel.estimasi_brutto, funnel.estimasi_netto,
      funnel.estimasi_negosiasi, funnel.estimasi_margin_pct, funnel.estimasi_qty, funnel.stage, funnel.probability,
      funnel.target_closing, funnel.follow_up_date, funnel.next_action, funnel.status, funnel.priority,
      funnel.converted ? 1 : 0, funnel.converted_order_no, funnel.updated_by || actorName, funnel.last_update_at, asJson(funnel.payload_json),
    ],
  );
}

async function upsertOrderRow(connection, raw, actorName, mode) {
  const order = normalizeOrder(raw);
  await connection.execute(
    `INSERT INTO orders (
      id, po_number, po_date, kode_rup, wilayah, kabkota, instansi, satker, nama_pengadaan,
      principal, pemasok, distributor, pelaksana, pic, penggarap, sumber_dana, ppn_mode,
      brutto, netto, negosiasi, status_pesanan, status_pengiriman, sla_status, kelengkapan,
      prioritas, funnel_id, source_funnel_code, source_funnel_name, updated_by, last_update_at, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      po_date = VALUES(po_date), kode_rup = VALUES(kode_rup), wilayah = VALUES(wilayah), kabkota = VALUES(kabkota), instansi = VALUES(instansi), satker = VALUES(satker),
      nama_pengadaan = VALUES(nama_pengadaan), principal = VALUES(principal), pemasok = VALUES(pemasok), distributor = VALUES(distributor), pelaksana = VALUES(pelaksana),
      pic = VALUES(pic), penggarap = VALUES(penggarap), sumber_dana = VALUES(sumber_dana), ppn_mode = VALUES(ppn_mode), brutto = VALUES(brutto), netto = VALUES(netto),
      negosiasi = VALUES(negosiasi), status_pesanan = VALUES(status_pesanan), status_pengiriman = VALUES(status_pengiriman), sla_status = VALUES(sla_status), kelengkapan = VALUES(kelengkapan),
      prioritas = VALUES(prioritas), funnel_id = VALUES(funnel_id), source_funnel_code = VALUES(source_funnel_code), source_funnel_name = VALUES(source_funnel_name),
      updated_by = VALUES(updated_by), last_update_at = VALUES(last_update_at), payload_json = VALUES(payload_json)`,
    [
      order.id, order.po_number, order.po_date, order.kode_rup, order.wilayah, order.kabkota, order.instansi, order.satker,
      order.nama_pengadaan, order.principal, order.pemasok, order.distributor, order.pelaksana, order.pic, order.penggarap,
      order.sumber_dana, order.ppn_mode, order.brutto, order.netto, order.negosiasi, order.status_pesanan,
      order.status_pengiriman, order.sla_status, order.kelengkapan, order.prioritas, order.funnel_id,
      order.source_funnel_code, order.source_funnel_name, order.updated_by || actorName, order.last_update_at, asJson(order.payload_json),
    ],
  );

  if (mode === 'merge') {
    await connection.execute('DELETE FROM order_items WHERE order_id = ?', [order.id]);
  }

  for (const [index, item] of (order.items || []).entries()) {
    await connection.execute(
      `INSERT INTO order_items (
        order_id, line_no, product_code, product_name, category, qty, hpp_total, tayang_total, kontrak_total, nego_total, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        order.id,
        index + 1,
        item.product_code || null,
        item.product_name || null,
        item.category || null,
        Number(item.qty || 0),
        Number(item.hpp_total || 0),
        Number(item.tayang_total || 0),
        Number(item.kontrak_total || 0),
        Number(item.nego_total || 0),
        asJson(item),
      ],
    );
  }
}

async function upsertLinkRow(connection, row, actorName) {
  await connection.execute(
    `INSERT INTO funnel_order_links (id, funnel_id, order_id, order_no, link_type, is_primary, linked_by, linked_at, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       order_id = VALUES(order_id), link_type = VALUES(link_type), is_primary = VALUES(is_primary), linked_by = VALUES(linked_by), linked_at = VALUES(linked_at), note = VALUES(note)`,
    [row.id || null, row.funnel_id || null, row.order_id || null, row.order_no || null, row.link_type || 'link', row.is_primary ? 1 : 0, row.linked_by || actorName, row.linked_at || new Date(), row.note || null],
  );
}

async function upsertDraftRow(connection, row, actorName) {
  const draft = row || {};
  await connection.execute(
    `INSERT INTO order_drafts (id, draft_code, po_number, satker, nama_pengadaan, principal, entry_stage, status_target, source_funnel_id, updated_by, last_saved_at, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       draft_code = VALUES(draft_code), po_number = VALUES(po_number), satker = VALUES(satker), nama_pengadaan = VALUES(nama_pengadaan), principal = VALUES(principal),
       entry_stage = VALUES(entry_stage), status_target = VALUES(status_target), source_funnel_id = VALUES(source_funnel_id), updated_by = VALUES(updated_by),
       last_saved_at = VALUES(last_saved_at), payload_json = VALUES(payload_json)`,
    [draft.id || draft.draft_id || `DRAFT-${Date.now()}`, draft.draft_code || draft.po_number || null, draft.po_number || null, draft.satker || null, draft.nama_pengadaan || draft.namaPengadaan || null, draft.principal || null, draft.entry_stage || 'header', draft.status_target || draft.status_pesanan || 'Baru', draft.source_funnel_id || draft.funnel_id || null, draft.updated_by || actorName, draft.last_saved_at || new Date(), asJson(draft)],
  );
}

async function upsertIssueRow(connection, row, actorName) {
  const issue = row || {};
  await connection.execute(
    `INSERT INTO order_issues (id, order_id, order_no, issue_type, severity, title, description, owner_name, due_date, status, resolved_at, snapshot_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       order_id = VALUES(order_id), order_no = VALUES(order_no), issue_type = VALUES(issue_type), severity = VALUES(severity), title = VALUES(title),
       description = VALUES(description), owner_name = VALUES(owner_name), due_date = VALUES(due_date), status = VALUES(status), resolved_at = VALUES(resolved_at), snapshot_json = VALUES(snapshot_json)`,
    [issue.id || `ISS-${Date.now()}`, issue.order_id || issue.orderId || null, issue.order_no || issue.orderNo || null, issue.issue_type || issue.type || 'Exception', issue.severity || 'Sedang', issue.title || issue.summary || 'Issue', issue.description || null, issue.owner_name || issue.ownerName || null, issue.due_date || issue.dueDate || null, issue.status || 'Open', issue.resolved_at || issue.resolvedAt || null, asJson(issue.snapshot_json || issue.snapshot || issue)],
  );
}

async function upsertSavedViewRow(connection, row, actorName) {
  const view = row || {};
  await connection.execute(
    `INSERT INTO saved_views (id, page_key, name, note, is_default, filter_state_json, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       page_key = VALUES(page_key), name = VALUES(name), note = VALUES(note), is_default = VALUES(is_default), filter_state_json = VALUES(filter_state_json), updated_by = VALUES(updated_by)`,
    [view.id || `VIEW-${Date.now()}`, view.page_key || view.pageKey || 'data-pesanan', view.name || 'View', view.note || null, Number(view.is_default ?? view.isDefault ?? 0) ? 1 : 0, asJson(view.filter_state || view.filterState || {}), view.updated_by || view.updatedBy || actorName],
  );
}

async function upsertLocationRow(connection, row) {
  await connection.execute(
    `INSERT INTO master_locations (id, wilayah, kabkota, instansi, satker, alias_json, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       wilayah = VALUES(wilayah), kabkota = VALUES(kabkota), instansi = VALUES(instansi), satker = VALUES(satker), alias_json = VALUES(alias_json), is_active = VALUES(is_active)`,
    [row.id || `LOC-${Date.now()}`, row.wilayah || '', row.kabkota || '', row.instansi || null, row.satker || null, asJson(row.alias_json || row.aliases || []), Number(row.is_active ?? row.isActive ?? 1) ? 1 : 0],
  );
}

async function upsertPrincipalRow(connection, row) {
  await connection.execute(
    `INSERT INTO master_principals (id, principal_code, principal_name, category, alias_json, is_active)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       principal_code = VALUES(principal_code), principal_name = VALUES(principal_name), category = VALUES(category), alias_json = VALUES(alias_json), is_active = VALUES(is_active)`,
    [row.id || null, row.principal_code || row.code || null, row.principal_name || row.name || row.principal || '', row.category || null, asJson(row.alias_json || row.aliases || []), Number(row.is_active ?? row.isActive ?? 1) ? 1 : 0],
  );
}

async function upsertOwnerRow(connection, row) {
  await connection.execute(
    `INSERT INTO master_owners (id, owner_name, owner_role, team_name, wilayah, email, phone, alias_json, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       owner_name = VALUES(owner_name), owner_role = VALUES(owner_role), team_name = VALUES(team_name), wilayah = VALUES(wilayah), email = VALUES(email), phone = VALUES(phone), alias_json = VALUES(alias_json), is_active = VALUES(is_active)`,
    [row.id || null, row.owner_name || row.name || '', row.owner_role || row.role || null, row.team_name || row.team || null, row.wilayah || null, row.email || null, row.phone || row.telepon || null, asJson(row.alias_json || row.aliases || []), Number(row.is_active ?? row.isActive ?? 1) ? 1 : 0],
  );
}

async function upsertPartnerRow(connection, row) {
  await connection.execute(
    `INSERT INTO master_partners (id, partner_name, partner_type, principal_name, wilayah, kabkota, contact_name, contact_phone, alias_json, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       partner_name = VALUES(partner_name), partner_type = VALUES(partner_type), principal_name = VALUES(principal_name), wilayah = VALUES(wilayah), kabkota = VALUES(kabkota), contact_name = VALUES(contact_name), contact_phone = VALUES(contact_phone), alias_json = VALUES(alias_json), is_active = VALUES(is_active)`,
    [row.id || null, row.partner_name || row.name || '', row.partner_type || row.type || 'Pemasok', row.principal_name || row.principal || null, row.wilayah || null, row.kabkota || null, row.contact_name || row.contact || null, row.contact_phone || row.phone || null, asJson(row.alias_json || row.aliases || []), Number(row.is_active ?? row.isActive ?? 1) ? 1 : 0],
  );
}

async function upsertAuditRow(connection, row, actorName) {
  await connection.execute(
    `INSERT INTO audit_logs (id, entity_type, entity_id, action_type, actor_name, summary, snapshot_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       entity_type = VALUES(entity_type), entity_id = VALUES(entity_id), action_type = VALUES(action_type), actor_name = VALUES(actor_name), summary = VALUES(summary), snapshot_json = VALUES(snapshot_json), created_at = VALUES(created_at)`,
    [row.id || null, row.entity_type || row.entityType || 'system', row.entity_id || row.entityId || '-', row.action_type || row.actionType || 'restore', row.actor_name || row.actorName || actorName, row.summary || '-', asJson(row.snapshot_json || row.snapshot || null), row.created_at || row.createdAt || new Date()],
  );
}

export async function exportSystemBackup(actorName = 'system') {
  const [funnels, orders, drafts, issues, views, links, auditLogs, mastersBootstrap] = await Promise.all([
    listPayloadRows('funnels'),
    listPayloadRows('orders'),
    listPayloadRows('order_drafts'),
    listPayloadRows('order_issues'),
    listPayloadRows('saved_views'),
    pool.query(`SELECT id, funnel_id, order_id, order_no, link_type, is_primary, linked_by, linked_at, note FROM funnel_order_links ORDER BY linked_at DESC, id DESC`).then(([rows]) => rows),
    pool.query(`SELECT id, entity_type, entity_id, action_type, actor_name, summary, snapshot_json AS snapshot_json, created_at FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 5000`).then(([rows]) => rows),
    getMasterBootstrap(),
  ]);

  return {
    schema_version: 'sprint5-step4',
    exported_at: new Date().toISOString(),
    exported_by: actorName,
    source: { mode: 'api', backend: true },
    data: {
      funnels,
      orders,
      orderDrafts: drafts,
      orderIssues: issues,
      savedViews: views,
      links,
      auditLogs,
      mastersBootstrap,
    },
  };
}

export async function restoreSystemBackup(bundle = {}, actorName = 'system', options = {}) {
  const payload = bundle?.data ? bundle : { data: bundle || {} };
  const data = payload.data || {};
  const mode = String(options.mode || 'replace').trim().toLowerCase() === 'merge' ? 'merge' : 'replace';
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (mode === 'replace') {
      await resetAllData(connection);
    }

    for (const raw of (Array.isArray(data.funnels) ? data.funnels : [])) {
      await upsertFunnelRow(connection, raw, actorName);
    }

    for (const raw of (Array.isArray(data.orders) ? data.orders : [])) {
      await upsertOrderRow(connection, raw, actorName, mode);
    }

    for (const row of (Array.isArray(data.links) ? data.links : [])) {
      await upsertLinkRow(connection, row, actorName);
    }

    for (const row of (Array.isArray(data.orderDrafts) ? data.orderDrafts : [])) {
      await upsertDraftRow(connection, row, actorName);
    }

    for (const row of (Array.isArray(data.orderIssues) ? data.orderIssues : [])) {
      await upsertIssueRow(connection, row, actorName);
    }

    for (const row of (Array.isArray(data.savedViews) ? data.savedViews : [])) {
      await upsertSavedViewRow(connection, row, actorName);
    }

    const masters = data.mastersBootstrap || {};
    for (const row of (Array.isArray(masters.locations) ? masters.locations : [])) {
      await upsertLocationRow(connection, row);
    }
    for (const row of (Array.isArray(masters.principals) ? masters.principals : [])) {
      await upsertPrincipalRow(connection, row);
    }
    for (const row of (Array.isArray(masters.owners) ? masters.owners : [])) {
      await upsertOwnerRow(connection, row);
    }
    for (const row of (Array.isArray(masters.partners) ? masters.partners : [])) {
      await upsertPartnerRow(connection, row);
    }

    for (const row of (Array.isArray(data.auditLogs) ? data.auditLogs : [])) {
      await upsertAuditRow(connection, row, actorName);
    }

    await writeAuditLog(connection, {
      entityType: 'system_backup',
      entityId: 'restore',
      actionType: mode === 'merge' ? 'restore_merge' : 'restore_replace',
      actorName,
      summary: mode === 'merge'
        ? 'Melakukan restore backend-side dengan mode merge.'
        : 'Melakukan restore backend-side dengan mode replace.',
      snapshot: { schema_version: payload.schema_version || null, mode },
    });

    await connection.commit();
    return {
      ok: true,
      mode,
      restored_at: new Date().toISOString(),
      counts: {
        funnels: Array.isArray(data.funnels) ? data.funnels.length : 0,
        orders: Array.isArray(data.orders) ? data.orders.length : 0,
        orderDrafts: Array.isArray(data.orderDrafts) ? data.orderDrafts.length : 0,
        orderIssues: Array.isArray(data.orderIssues) ? data.orderIssues.length : 0,
        savedViews: Array.isArray(data.savedViews) ? data.savedViews.length : 0,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
