import { pool } from '../db/pool.js';
import { getStatusDictionary } from '../utils/status-dictionary.js';
import { writeAuditLog } from '../utils/audit.js';
import {
  aliasesFromJson,
  aliasesToJson,
  checkMasterDuplicate,
  resolveCanonicalValue,
} from '../utils/master-normalizer.js';

function clean(value) {
  return String(value || '').trim();
}

function optional(value) {
  const text = clean(value);
  return text || null;
}

function uniq(rows, keyGetter) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const key = keyGetter(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeLocation(payload = {}) {
  return {
    id: payload.id || payload.location_id || null,
    wilayah: clean(payload.wilayah || payload.region),
    kabkota: clean(payload.kabkota || payload.kabupatenKota || payload.kabupaten_kota || payload.city),
    instansi: optional(payload.instansi || payload.instansi_name || payload.nama_instansi),
    satker: optional(payload.satker || payload.satuan_kerja),
    alias_json: aliasesToJson(payload.alias_json || payload.aliases || payload.alias || payload.aliases_text),
    is_active: Number(payload.is_active ?? payload.isActive ?? 1),
  };
}

function normalizePrincipal(payload = {}) {
  const principalName = clean(payload.principal_name || payload.name || payload.principal);
  const principalCode = clean(payload.principal_code || payload.code || principalName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 32));
  return {
    id: payload.id || null,
    principal_name: principalName,
    principal_code: principalCode || null,
    category: optional(payload.category || payload.principal_category),
    alias_json: aliasesToJson(payload.alias_json || payload.aliases || payload.alias || payload.aliases_text),
    is_active: Number(payload.is_active ?? payload.isActive ?? 1),
  };
}

function normalizeOwner(payload = {}) {
  return {
    id: payload.id || null,
    owner_name: clean(payload.owner_name || payload.name),
    owner_role: clean(payload.owner_role || payload.role),
    team_name: optional(payload.team_name || payload.team),
    wilayah: optional(payload.wilayah || payload.region),
    email: optional(payload.email),
    phone: optional(payload.phone || payload.contact_phone),
    alias_json: aliasesToJson(payload.alias_json || payload.aliases || payload.alias || payload.aliases_text),
    is_active: Number(payload.is_active ?? payload.isActive ?? 1),
  };
}

function normalizePartner(payload = {}) {
  return {
    id: payload.id || null,
    partner_name: clean(payload.partner_name || payload.nama || payload.name),
    partner_type: clean(payload.partner_type || payload.tipe || payload.type),
    principal_name: optional(payload.principal_name || payload.principal),
    wilayah: optional(payload.wilayah || payload.region),
    kabkota: optional(payload.kabkota || payload.kabupatenKota || payload.kabupaten_kota || payload.city),
    contact_name: optional(payload.contact_name || payload.kontak || payload.pic),
    contact_phone: optional(payload.contact_phone || payload.phone),
    alias_json: aliasesToJson(payload.alias_json || payload.aliases || payload.alias || payload.aliases_text),
    is_active: Number(payload.is_active ?? payload.isActive ?? 1),
  };
}

function buildLocationHierarchy(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const wilayahOptions = uniq(list, (row) => clean(row.wilayah).toLowerCase()).map((row) => row.wilayah);
  const kabkotaOptions = uniq(list, (row) => `${clean(row.wilayah).toLowerCase()}::${clean(row.kabkota).toLowerCase()}`)
    .map((row) => ({ wilayah: row.wilayah, kabkota: row.kabkota }));
  const instansiOptions = uniq(list.filter((row) => row.instansi), (row) => `${clean(row.wilayah).toLowerCase()}::${clean(row.kabkota).toLowerCase()}::${clean(row.instansi).toLowerCase()}`)
    .map((row) => ({ wilayah: row.wilayah, kabkota: row.kabkota, instansi: row.instansi }));
  const satkerOptions = uniq(list.filter((row) => row.satker), (row) => `${clean(row.wilayah).toLowerCase()}::${clean(row.kabkota).toLowerCase()}::${clean(row.instansi).toLowerCase()}::${clean(row.satker).toLowerCase()}`)
    .map((row) => ({ wilayah: row.wilayah, kabkota: row.kabkota, instansi: row.instansi, satker: row.satker }));
  return { wilayahOptions, kabkotaOptions, instansiOptions, satkerOptions };
}

function buildPartnerHierarchy(partners, principals, owners) {
  const activePartners = (Array.isArray(partners) ? partners : []).filter((row) => Number(row.is_active ?? 1) === 1);
  const activeOwners = (Array.isArray(owners) ? owners : []).filter((row) => Number(row.is_active ?? 1) === 1);
  const activePrincipals = (Array.isArray(principals) ? principals : []).filter((row) => Number(row.is_active ?? 1) === 1);
  const pickNames = (rows, field) => uniq(rows.filter((row) => clean(row[field])), (row) => clean(row[field]).toLowerCase()).map((row) => row[field]);
  return {
    principalOptions: pickNames(activePrincipals, 'principal_name'),
    pemasokOptions: pickNames(activePartners.filter((row) => /pemasok/i.test(row.partner_type)), 'partner_name'),
    distributorOptions: pickNames(activePartners.filter((row) => /distributor/i.test(row.partner_type)), 'partner_name'),
    pelaksanaOptions: pickNames(activePartners.filter((row) => /pelaksana/i.test(row.partner_type)), 'partner_name'),
    picOptions: pickNames(activeOwners.filter((row) => /pic/i.test(row.owner_role)), 'owner_name'),
    penggarapOptions: pickNames(activeOwners.filter((row) => /penggarap/i.test(row.owner_role)), 'owner_name'),
  };
}

function buildNormalizationMaps(principals, partners, owners, locations) {
  return {
    principals: (principals || []).map((row) => ({ id: row.id, canonical_name: row.principal_name, aliases: aliasesFromJson(row.alias_json) })),
    partners: (partners || []).map((row) => ({ id: row.id, canonical_name: row.partner_name, partner_type: row.partner_type, aliases: aliasesFromJson(row.alias_json) })),
    owners: (owners || []).map((row) => ({ id: row.id, canonical_name: row.owner_name, owner_role: row.owner_role, aliases: aliasesFromJson(row.alias_json) })),
    locations: (locations || []).map((row) => ({ id: row.id, wilayah: row.wilayah, kabkota: row.kabkota, instansi: row.instansi, satker: row.satker, aliases: aliasesFromJson(row.alias_json) })),
  };
}

async function ensureNoDuplicate(connection, type, entity, options = {}) {
  let existing = [];
  if (type === 'principal') {
    [existing] = await connection.query('SELECT id, principal_name, alias_json FROM master_principals');
  } else if (type === 'partner') {
    [existing] = await connection.query('SELECT id, partner_name, partner_type, alias_json FROM master_partners');
  } else if (type === 'owner') {
    [existing] = await connection.query('SELECT id, owner_name, owner_role, alias_json FROM master_owners');
  } else if (type === 'location') {
    [existing] = await connection.query('SELECT id, wilayah, kabkota, instansi, satker, alias_json FROM master_locations');
  }
  const report = checkMasterDuplicate(type, entity, existing, options);
  if (report.decision === 'block') {
    throw new Error(report.matches[0]?.message || 'Data master duplikat dengan entitas yang sudah ada.');
  }
  return report;
}

export async function listMasterLocations(filters = {}) {
  const clauses = ['is_active = 1'];
  const params = [];
  if (filters.wilayah) { clauses.push('wilayah = ?'); params.push(filters.wilayah); }
  if (filters.kabkota) { clauses.push('kabkota = ?'); params.push(filters.kabkota); }
  const [rows] = await pool.query(
    `SELECT id, wilayah, kabkota, instansi, satker, alias_json, is_active, created_at, updated_at
       FROM master_locations
      WHERE ${clauses.join(' AND ')}
      ORDER BY wilayah, kabkota, instansi, satker`,
    params,
  );
  return rows;
}

export async function upsertMasterLocation(rawLocation) {
  const location = normalizeLocation(rawLocation);
  if (!location.wilayah) throw new Error('Wilayah wajib diisi.');
  if (!location.kabkota) throw new Error('Kabupaten/Kota wajib diisi.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const locationId = location.id || `LOC-${Date.now()}`;
    await ensureNoDuplicate(connection, 'location', { ...location, id: locationId });
    await connection.execute(
      `INSERT INTO master_locations (id, wilayah, kabkota, instansi, satker, alias_json, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE wilayah = VALUES(wilayah), kabkota = VALUES(kabkota), instansi = VALUES(instansi), satker = VALUES(satker), alias_json = VALUES(alias_json), is_active = VALUES(is_active), updated_at = CURRENT_TIMESTAMP`,
      [locationId, location.wilayah, location.kabkota, location.instansi, location.satker, location.alias_json, location.is_active ? 1 : 0],
    );
    await writeAuditLog(connection, {
      entityType: 'master_location',
      entityId: locationId,
      actionType: location.id ? 'update' : 'create',
      actorName: rawLocation.updated_by || rawLocation.updatedBy || 'system',
      summary: `${location.id ? 'Memperbarui' : 'Menambah'} master lokasi ${location.wilayah} / ${location.kabkota}`,
      snapshot: { ...location, id: locationId },
    });
    await connection.commit();
    return { ...location, id: locationId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteMasterLocation(locationId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id, wilayah, kabkota, instansi, satker, alias_json FROM master_locations WHERE id = ? LIMIT 1', [locationId]);
    await connection.execute('DELETE FROM master_locations WHERE id = ?', [locationId]);
    if (rows.length) {
      const item = rows[0];
      await writeAuditLog(connection, {
        entityType: 'master_location',
        entityId: item.id,
        actionType: 'delete',
        actorName: 'system',
        summary: `Menghapus master lokasi ${item.wilayah} / ${item.kabkota}`,
        snapshot: item,
      });
    }
    await connection.commit();
    return { id: locationId, deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listMasterPrincipals() {
  const [rows] = await pool.query(
    `SELECT id, principal_name, principal_code, category, alias_json, is_active, created_at, updated_at
       FROM master_principals
      ORDER BY principal_name`,
  );
  return rows;
}

export async function upsertMasterPrincipal(rawPrincipal) {
  const principal = normalizePrincipal(rawPrincipal);
  if (!principal.principal_name) throw new Error('Nama principal wajib diisi.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const existingRows = (await connection.query('SELECT id, principal_name, alias_json FROM master_principals'))[0];
    const resolvedName = resolveCanonicalValue('principal', principal.principal_name, existingRows) || principal.principal_name;
    principal.principal_name = resolvedName;
    await ensureNoDuplicate(connection, 'principal', principal);
    if (principal.id) {
      await connection.execute(
        `UPDATE master_principals
            SET principal_name = ?, principal_code = ?, category = ?, alias_json = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [principal.principal_name, principal.principal_code, principal.category, principal.alias_json, principal.is_active ? 1 : 0, principal.id],
      );
    } else {
      const [result] = await connection.execute(
        `INSERT INTO master_principals (principal_name, principal_code, category, alias_json, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [principal.principal_name, principal.principal_code, principal.category, principal.alias_json, principal.is_active ? 1 : 0],
      );
      principal.id = result.insertId;
    }
    await writeAuditLog(connection, {
      entityType: 'master_principal',
      entityId: String(principal.id),
      actionType: rawPrincipal.id ? 'update' : 'create',
      actorName: rawPrincipal.updated_by || rawPrincipal.updatedBy || 'system',
      summary: `${rawPrincipal.id ? 'Memperbarui' : 'Menambah'} principal ${principal.principal_name}`,
      snapshot: principal,
    });
    await connection.commit();
    return principal;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteMasterPrincipal(principalId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id, principal_name, principal_code, alias_json FROM master_principals WHERE id = ? LIMIT 1', [principalId]);
    await connection.execute('DELETE FROM master_principals WHERE id = ?', [principalId]);
    if (rows.length) {
      await writeAuditLog(connection, {
        entityType: 'master_principal',
        entityId: String(principalId),
        actionType: 'delete',
        actorName: 'system',
        summary: `Menghapus principal ${rows[0].principal_name}`,
        snapshot: rows[0],
      });
    }
    await connection.commit();
    return { id: principalId, deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listMasterOwners() {
  const [rows] = await pool.query(
    `SELECT id, owner_name, owner_role, team_name, wilayah, email, phone, alias_json, is_active, created_at, updated_at
       FROM master_owners
      ORDER BY owner_role, owner_name`,
  );
  return rows;
}

export async function upsertMasterOwner(rawOwner) {
  const owner = normalizeOwner(rawOwner);
  if (!owner.owner_name) throw new Error('Nama owner wajib diisi.');
  if (!owner.owner_role) throw new Error('Role owner wajib diisi.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const existingRows = (await connection.query('SELECT id, owner_name, owner_role, alias_json FROM master_owners'))[0];
    owner.owner_name = resolveCanonicalValue('owner', owner.owner_name, existingRows, { ownerRole: owner.owner_role }) || owner.owner_name;
    await ensureNoDuplicate(connection, 'owner', owner, { ownerRole: owner.owner_role });
    if (owner.id) {
      await connection.execute(
        `UPDATE master_owners
            SET owner_name = ?, owner_role = ?, team_name = ?, wilayah = ?, email = ?, phone = ?, alias_json = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [owner.owner_name, owner.owner_role, owner.team_name, owner.wilayah, owner.email, owner.phone, owner.alias_json, owner.is_active ? 1 : 0, owner.id],
      );
    } else {
      const [result] = await connection.execute(
        `INSERT INTO master_owners (owner_name, owner_role, team_name, wilayah, email, phone, alias_json, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [owner.owner_name, owner.owner_role, owner.team_name, owner.wilayah, owner.email, owner.phone, owner.alias_json, owner.is_active ? 1 : 0],
      );
      owner.id = result.insertId;
    }
    await writeAuditLog(connection, {
      entityType: 'master_owner',
      entityId: String(owner.id),
      actionType: rawOwner.id ? 'update' : 'create',
      actorName: rawOwner.updated_by || rawOwner.updatedBy || 'system',
      summary: `${rawOwner.id ? 'Memperbarui' : 'Menambah'} ${owner.owner_role} ${owner.owner_name}`,
      snapshot: owner,
    });
    await connection.commit();
    return owner;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteMasterOwner(ownerId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id, owner_name, owner_role, alias_json FROM master_owners WHERE id = ? LIMIT 1', [ownerId]);
    await connection.execute('DELETE FROM master_owners WHERE id = ?', [ownerId]);
    if (rows.length) {
      await writeAuditLog(connection, {
        entityType: 'master_owner',
        entityId: String(ownerId),
        actionType: 'delete',
        actorName: 'system',
        summary: `Menghapus ${rows[0].owner_role} ${rows[0].owner_name}`,
        snapshot: rows[0],
      });
    }
    await connection.commit();
    return { id: ownerId, deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listMasterPartners(filters = {}) {
  const clauses = ['1=1'];
  const params = [];
  if (filters.partnerType) { clauses.push('partner_type = ?'); params.push(filters.partnerType); }
  const [rows] = await pool.query(
    `SELECT id, partner_name, partner_type, principal_name, wilayah, kabkota, contact_name, contact_phone, alias_json, is_active, created_at, updated_at
       FROM master_partners
      WHERE ${clauses.join(' AND ')}
      ORDER BY partner_type, partner_name`,
    params,
  );
  return rows;
}

export async function upsertMasterPartner(rawPartner) {
  const partner = normalizePartner(rawPartner);
  if (!partner.partner_name) throw new Error('Nama mitra wajib diisi.');
  if (!partner.partner_type) throw new Error('Tipe mitra wajib diisi.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const existingRows = (await connection.query('SELECT id, partner_name, partner_type, alias_json FROM master_partners'))[0];
    partner.partner_name = resolveCanonicalValue('partner', partner.partner_name, existingRows, { partnerType: partner.partner_type }) || partner.partner_name;
    await ensureNoDuplicate(connection, 'partner', partner, { partnerType: partner.partner_type });
    if (partner.id) {
      await connection.execute(
        `UPDATE master_partners
            SET partner_name = ?, partner_type = ?, principal_name = ?, wilayah = ?, kabkota = ?, contact_name = ?, contact_phone = ?, alias_json = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [partner.partner_name, partner.partner_type, partner.principal_name, partner.wilayah, partner.kabkota, partner.contact_name, partner.contact_phone, partner.alias_json, partner.is_active ? 1 : 0, partner.id],
      );
    } else {
      const [result] = await connection.execute(
        `INSERT INTO master_partners (partner_name, partner_type, principal_name, wilayah, kabkota, contact_name, contact_phone, alias_json, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [partner.partner_name, partner.partner_type, partner.principal_name, partner.wilayah, partner.kabkota, partner.contact_name, partner.contact_phone, partner.alias_json, partner.is_active ? 1 : 0],
      );
      partner.id = result.insertId;
    }
    await writeAuditLog(connection, {
      entityType: 'master_partner',
      entityId: String(partner.id),
      actionType: rawPartner.id ? 'update' : 'create',
      actorName: rawPartner.updated_by || rawPartner.updatedBy || 'system',
      summary: `${rawPartner.id ? 'Memperbarui' : 'Menambah'} ${partner.partner_type} ${partner.partner_name}`,
      snapshot: partner,
    });
    await connection.commit();
    return partner;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteMasterPartner(partnerId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id, partner_name, partner_type, alias_json FROM master_partners WHERE id = ? LIMIT 1', [partnerId]);
    await connection.execute('DELETE FROM master_partners WHERE id = ?', [partnerId]);
    if (rows.length) {
      await writeAuditLog(connection, {
        entityType: 'master_partner',
        entityId: String(partnerId),
        actionType: 'delete',
        actorName: 'system',
        summary: `Menghapus ${rows[0].partner_type} ${rows[0].partner_name}`,
        snapshot: rows[0],
      });
    }
    await connection.commit();
    return { id: partnerId, deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function validateMasterEntity(payload = {}) {
  const type = String(payload.type || payload.entityType || '').toLowerCase();
  if (!type) throw new Error('Tipe master wajib diisi.');
  if (type === 'principal') {
    const rows = await listMasterPrincipals();
    return checkMasterDuplicate('principal', normalizePrincipal(payload.row || payload), rows);
  }
  if (type === 'partner') {
    const partner = normalizePartner(payload.row || payload);
    const rows = await listMasterPartners({ partnerType: partner.partner_type || payload.partnerType });
    return checkMasterDuplicate('partner', partner, rows, { partnerType: partner.partner_type || payload.partnerType });
  }
  if (type === 'owner') {
    const owner = normalizeOwner(payload.row || payload);
    const rows = await listMasterOwners();
    return checkMasterDuplicate('owner', owner, rows, { ownerRole: owner.owner_role || payload.ownerRole });
  }
  if (type === 'location') {
    const rows = await listMasterLocations({ wilayah: payload.row?.wilayah || payload.wilayah, kabkota: payload.row?.kabkota || payload.kabkota });
    return checkMasterDuplicate('location', normalizeLocation(payload.row || payload), rows);
  }
  throw new Error('Tipe master tidak dikenali.');
}

export async function getMasterBootstrap() {
  const [locations, principals, owners, partners] = await Promise.all([
    listMasterLocations(),
    listMasterPrincipals(),
    listMasterOwners(),
    listMasterPartners(),
  ]);
  return {
    locations,
    principals,
    owners,
    partners,
    hierarchy: buildLocationHierarchy(locations),
    partnerHierarchy: buildPartnerHierarchy(partners, principals, owners),
    normalization: buildNormalizationMaps(principals, partners, owners, locations),
    dictionaries: getStatusDictionary(),
  };
}
