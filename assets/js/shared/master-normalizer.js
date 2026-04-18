(function (window) {
  'use strict';

  const BOOTSTRAP_CACHE_KEY = 'ds_master_bootstrap_cache';
  const PREFIXES = ['pt', 'cv', 'ud', 'pd', 'firma', 'fa', 'perum', 'yayasan'];

  function text(value) {
    return String(value || '').trim();
  }

  function parseAliases(value) {
    if (Array.isArray(value)) return value.map(text).filter(Boolean);
    if (value && typeof value === 'object') return Object.values(value).map(text).filter(Boolean);
    return text(value)
      .split(/[,;\n|]+/)
      .map(text)
      .filter(Boolean);
  }

  function baseCanonical(value) {
    return text(value)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' dan ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripPrefixes(value) {
    let current = baseCanonical(value);
    let changed = true;
    while (changed) {
      changed = false;
      for (const prefix of PREFIXES) {
        if (current === prefix) continue;
        if (current.startsWith(prefix + ' ')) {
          current = current.slice(prefix.length + 1).trim();
          changed = true;
        }
      }
    }
    return current;
  }

  function canonicalByType(type, value) {
    const entity = String(type || '').toLowerCase();
    if (/partner|pemasok|distributor|pelaksana/.test(entity)) return stripPrefixes(value);
    if (/principal/.test(entity)) return baseCanonical(value);
    if (/owner|pic|penggarap/.test(entity)) return baseCanonical(value).replace(/\b(mr|mrs|ibu|bpk|bapak|saudara)\b/g, '').replace(/\s+/g, ' ').trim();
    if (/wilayah|kabkota|instansi|satker|location/.test(entity)) return baseCanonical(value);
    return baseCanonical(value);
  }

  function readBootstrap() {
    try {
      const parsed = JSON.parse(localStorage.getItem(BOOTSTRAP_CACHE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function getCollection(type, bootstrap) {
    const data = bootstrap || readBootstrap();
    const entity = String(type || '').toLowerCase();
    if (/principal/.test(entity)) return Array.isArray(data.principals) ? data.principals : [];
    if (/partner|pemasok|distributor|pelaksana/.test(entity)) return Array.isArray(data.partners) ? data.partners : [];
    if (/owner|pic|penggarap/.test(entity)) return Array.isArray(data.owners) ? data.owners : [];
    if (/location|wilayah|kabkota|instansi|satker/.test(entity)) return Array.isArray(data.locations) ? data.locations : [];
    return [];
  }

  function getRowPrimaryValue(type, row) {
    const entity = String(type || '').toLowerCase();
    if (/principal/.test(entity)) return text(row?.principal_name || row?.name || row?.principal);
    if (/partner|pemasok|distributor|pelaksana/.test(entity)) return text(row?.partner_name || row?.name || row?.nama);
    if (/owner|pic|penggarap/.test(entity)) return text(row?.owner_name || row?.name);
    if (/wilayah/.test(entity)) return text(row?.wilayah);
    if (/kabkota/.test(entity)) return text(row?.kabkota || row?.kabupatenKota || row?.kabupaten_kota);
    if (/instansi/.test(entity)) return text(row?.instansi);
    if (/satker/.test(entity)) return text(row?.satker);
    return '';
  }

  function getRowAliases(row) {
    return parseAliases(row?.aliases || row?.alias_json || row?.alias || row?.aliases_text);
  }

  function getScopedRows(type, bootstrap, options) {
    const rows = getCollection(type, bootstrap);
    const entity = String(type || '').toLowerCase();
    if (/partner/.test(entity) && options?.partnerType) {
      return rows.filter((row) => canonicalByType('partnerType', row?.partner_type) === canonicalByType('partnerType', options.partnerType));
    }
    if (/owner/.test(entity) && options?.ownerRole) {
      return rows.filter((row) => canonicalByType('ownerRole', row?.owner_role) === canonicalByType('ownerRole', options.ownerRole));
    }
    return rows;
  }

  function matchMaster(type, value, bootstrap, options) {
    const incoming = canonicalByType(type, value);
    if (!incoming) return null;
    const rows = getScopedRows(type, bootstrap, options);
    for (const row of rows) {
      const primary = canonicalByType(type, getRowPrimaryValue(type, row));
      if (primary && primary === incoming) return row;
      const aliases = getRowAliases(row);
      if (aliases.some((alias) => canonicalByType(type, alias) === incoming)) return row;
    }
    return null;
  }

  function resolveCanonical(type, value, bootstrap, options) {
    const match = matchMaster(type, value, bootstrap, options);
    if (!match) return text(value);
    return getRowPrimaryValue(type, match) || text(value);
  }

  function normalizeRow(row, bootstrap) {
    const source = { ...(row || {}) };
    const next = { ...(row || {}) };
    const principal = resolveCanonical('principal', source.principal || source.principal_name, bootstrap);
    if (principal) {
      if ('principal' in next || source.principal || source.principal_name) next.principal = principal;
      if ('principal_name' in next || source.principal_name) next.principal_name = principal;
    }
    const pemasok = resolveCanonical('partner', source.pemasok, bootstrap, { partnerType: 'Pemasok' });
    if (pemasok) next.pemasok = pemasok;
    const distributor = resolveCanonical('partner', source.distributor, bootstrap, { partnerType: 'Distributor' });
    if (distributor) next.distributor = distributor;
    const pelaksana = resolveCanonical('partner', source.pelaksana, bootstrap, { partnerType: 'Pelaksana' });
    if (pelaksana) next.pelaksana = pelaksana;
    const pic = resolveCanonical('owner', source.pic || source.pic_omset || source.picOmset, bootstrap, { ownerRole: 'PIC Omset' });
    if (pic) {
      if ('pic' in next || source.pic) next.pic = pic;
      if ('pic_omset' in next || source.pic_omset || source.picOmset) next.pic_omset = pic;
      if ('picOmset' in next || source.picOmset) next.picOmset = pic;
    }
    const penggarap = resolveCanonical('owner', source.penggarap, bootstrap, { ownerRole: 'Penggarap' });
    if (penggarap) next.penggarap = penggarap;
    next.wilayah = resolveCanonical('wilayah', source.wilayah || source.region || source.provinsi, bootstrap) || source.wilayah || source.region || source.provinsi;
    next.kabkota = resolveCanonical('kabkota', source.kabkota || source.kabupatenKota || source.kabupaten_kota || source.city, bootstrap) || source.kabkota || source.kabupatenKota || source.kabupaten_kota || source.city;
    if (source.instansi || source.nama_instansi) next.instansi = resolveCanonical('instansi', source.instansi || source.nama_instansi, bootstrap) || source.instansi || source.nama_instansi;
    if (source.satker || source.satuan_kerja) next.satker = resolveCanonical('satker', source.satker || source.satuan_kerja, bootstrap) || source.satker || source.satuan_kerja;
    return next;
  }

  function normalizeRows(rows, bootstrap) {
    const list = Array.isArray(rows) ? rows : [];
    return list.map((row) => normalizeRow(row, bootstrap));
  }

  function checkMasterDuplicate(type, row, bootstrap) {
    const entity = String(type || '').toLowerCase();
    const primary = getRowPrimaryValue(entity, row);
    const canonicalPrimary = canonicalByType(entity, primary);
    const aliases = parseAliases(row?.aliases || row?.alias_json || row?.alias || row?.aliases_text).map((item) => canonicalByType(entity, item)).filter(Boolean);
    if (!canonicalPrimary && !aliases.length) return { decision: 'ok', matches: [] };
    const currentId = text(row?.id);
    const rows = getScopedRows(entity, bootstrap, {
      partnerType: row?.partner_type,
      ownerRole: row?.owner_role,
    });
    const matches = [];
    rows.forEach((item) => {
      if (currentId && text(item?.id) === currentId) return;
      const itemPrimary = canonicalByType(entity, getRowPrimaryValue(entity, item));
      const itemAliases = getRowAliases(item).map((alias) => canonicalByType(entity, alias));
      const allItemKeys = [itemPrimary].concat(itemAliases).filter(Boolean);
      if (canonicalPrimary && allItemKeys.includes(canonicalPrimary)) {
        matches.push({ severity: 'block', code: 'MASTER_DUPLICATE_PRIMARY', message: 'Nama utama bentrok dengan master yang sudah ada.', record: item });
        return;
      }
      if (aliases.some((alias) => allItemKeys.includes(alias))) {
        matches.push({ severity: 'warn', code: 'MASTER_DUPLICATE_ALIAS', message: 'Alias bentrok dengan master yang sudah ada.', record: item });
      }
    });
    return { decision: matches.some((item) => item.severity === 'block') ? 'block' : matches.length ? 'warn' : 'ok', matches };
  }

  function getCoverageSummary(bootstrap) {
    const data = bootstrap || readBootstrap();
    const summarize = (rows, keyField) => {
      const list = Array.isArray(rows) ? rows : [];
      const withAlias = list.filter((row) => getRowAliases(row).length).length;
      const unique = new Set(list.map((row) => canonicalByType(keyField, row?.[keyField] || row?.principal_name || row?.partner_name || row?.owner_name)).filter(Boolean)).size;
      return { total: list.length, withAlias, unique };
    };
    return {
      principals: summarize(data.principals, 'principal_name'),
      partners: summarize(data.partners, 'partner_name'),
      owners: summarize(data.owners, 'owner_name'),
      locations: summarize(data.locations, 'kabkota'),
    };
  }

  window.DataSystemMasterNormalizer = {
    parseAliases,
    canonicalByType,
    resolveCanonical,
    normalizeRow,
    normalizeRows,
    checkMasterDuplicate,
    getCoverageSummary,
    readBootstrap,
  };
})(window);
