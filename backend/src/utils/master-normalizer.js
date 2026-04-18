function clean(value) {
  return String(value || '').trim();
}

function parseAliases(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).map(clean).filter(Boolean);
  const text = clean(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(clean).filter(Boolean);
  } catch (_error) {}
  return text.split(/[,;\n|]+/).map(clean).filter(Boolean);
}

function baseCanonical(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripPrefixes(value) {
  const prefixes = ['pt', 'cv', 'ud', 'pd', 'firma', 'fa', 'perum', 'yayasan'];
  let current = baseCanonical(value);
  let changed = true;
  while (changed) {
    changed = false;
    prefixes.forEach((prefix) => {
      if (current.startsWith(prefix + ' ')) {
        current = current.slice(prefix.length + 1).trim();
        changed = true;
      }
    });
  }
  return current;
}

export function canonicalByType(type, value) {
  const entity = String(type || '').toLowerCase();
  if (/partner|pemasok|distributor|pelaksana/.test(entity)) return stripPrefixes(value);
  if (/owner|pic|penggarap/.test(entity)) return baseCanonical(value).replace(/\b(mr|mrs|ibu|bpk|bapak|saudara)\b/g, '').replace(/\s+/g, ' ').trim();
  return baseCanonical(value);
}

export function aliasesToJson(value) {
  const aliases = parseAliases(value);
  return aliases.length ? JSON.stringify(aliases) : null;
}

export function aliasesFromJson(value) {
  return parseAliases(value);
}

export function getMasterPrimaryValue(type, row = {}) {
  const entity = String(type || '').toLowerCase();
  if (/principal/.test(entity)) return clean(row.principal_name || row.name || row.principal);
  if (/partner/.test(entity)) return clean(row.partner_name || row.name || row.nama);
  if (/owner/.test(entity)) return clean(row.owner_name || row.name);
  if (/location/.test(entity)) return [clean(row.wilayah), clean(row.kabkota), clean(row.instansi), clean(row.satker)].filter(Boolean).join(' / ');
  return '';
}

export function checkMasterDuplicate(type, row, existingRows = [], options = {}) {
  const entity = String(type || '').toLowerCase();
  const currentId = clean(row?.id);
  const primary = getMasterPrimaryValue(entity, row);
  const primaryCanonical = canonicalByType(entity, primary);
  const aliases = aliasesFromJson(row?.alias_json || row?.aliases || row?.alias).map((item) => canonicalByType(entity, item));
  const matches = [];
  (Array.isArray(existingRows) ? existingRows : []).forEach((item) => {
    if (currentId && clean(item?.id) === currentId) return;
    if (/partner/.test(entity) && options.partnerType && clean(item?.partner_type).toLowerCase() !== clean(options.partnerType).toLowerCase()) return;
    if (/owner/.test(entity) && options.ownerRole && clean(item?.owner_role).toLowerCase() !== clean(options.ownerRole).toLowerCase()) return;
    const itemPrimary = canonicalByType(entity, getMasterPrimaryValue(entity, item));
    const itemAliases = aliasesFromJson(item?.alias_json || item?.aliases || item?.alias).map((alias) => canonicalByType(entity, alias));
    const keys = [itemPrimary, ...itemAliases].filter(Boolean);
    if (primaryCanonical && keys.includes(primaryCanonical)) {
      matches.push({ severity: 'block', code: 'MASTER_DUPLICATE_PRIMARY', record: item, message: 'Nama utama bentrok dengan master yang sudah ada.' });
      return;
    }
    if (aliases.some((alias) => keys.includes(alias))) {
      matches.push({ severity: 'warn', code: 'MASTER_DUPLICATE_ALIAS', record: item, message: 'Alias bentrok dengan master yang sudah ada.' });
    }
  });
  return { decision: matches.some((item) => item.severity === 'block') ? 'block' : matches.length ? 'warn' : 'ok', matches };
}

export function resolveCanonicalValue(type, value, rows = [], options = {}) {
  const incoming = canonicalByType(type, value);
  if (!incoming) return clean(value);
  for (const row of Array.isArray(rows) ? rows : []) {
    if (/partner/.test(String(type || '').toLowerCase()) && options.partnerType && clean(row?.partner_type).toLowerCase() !== clean(options.partnerType).toLowerCase()) continue;
    if (/owner/.test(String(type || '').toLowerCase()) && options.ownerRole && clean(row?.owner_role).toLowerCase() !== clean(options.ownerRole).toLowerCase()) continue;
    const primary = canonicalByType(type, getMasterPrimaryValue(type, row));
    if (primary && primary === incoming) return getMasterPrimaryValue(type, row);
    const aliases = aliasesFromJson(row?.alias_json || row?.aliases || row?.alias).map((alias) => canonicalByType(type, alias));
    if (aliases.includes(incoming)) return getMasterPrimaryValue(type, row);
  }
  return clean(value);
}
