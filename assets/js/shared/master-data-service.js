(function (window) {
  'use strict';

  const CACHE_KEY = 'ds_master_bootstrap_cache';
  const FALLBACK = {
    locations: [
      { id: 'LOC-001', wilayah: 'DKI Jakarta', kabkota: 'Jakarta Pusat', instansi: 'Dinas Pendidikan DKI Jakarta', satker: 'Bidang Sarpras', is_active: 1 },
      { id: 'LOC-002', wilayah: 'DKI Jakarta', kabkota: 'Jakarta Selatan', instansi: 'Dinas Kesehatan DKI Jakarta', satker: 'UPT Pengadaan', is_active: 1 },
      { id: 'LOC-003', wilayah: 'Jawa Barat', kabkota: 'Bandung', instansi: 'Dinas Kesehatan Prov. Jawa Barat', satker: 'UPT Puskesmas', is_active: 1 },
      { id: 'LOC-004', wilayah: 'Jawa Tengah', kabkota: 'Semarang', instansi: 'RSUD Semarang', satker: 'Pengadaan Alkes', is_active: 1 },
    ],
    principals: [
      { id: 'PR-001', principal_name: 'Asus', principal_code: 'ASUS', category: 'Notebook', is_active: 1 },
      { id: 'PR-002', principal_name: 'Acer', principal_code: 'ACER', category: 'Notebook', is_active: 1 },
      { id: 'PR-003', principal_name: 'Epson', principal_code: 'EPSON', category: 'Printer', is_active: 1 },
      { id: 'PR-004', principal_name: 'Lenovo', principal_code: 'LENOVO', category: 'Notebook', is_active: 1 },
    ],
    owners: [
      { id: 'OWN-001', owner_name: 'Lina', owner_role: 'PIC Omset', team_name: 'Gov A', wilayah: 'DKI Jakarta', is_active: 1 },
      { id: 'OWN-002', owner_name: 'Raka', owner_role: 'PIC Omset', team_name: 'Gov B', wilayah: 'Jawa Barat', is_active: 1 },
      { id: 'OWN-003', owner_name: 'Bimo', owner_role: 'Penggarap', team_name: 'Delivery Squad', wilayah: 'Jawa Tengah', is_active: 1 },
      { id: 'OWN-004', owner_name: 'Tyo', owner_role: 'Penggarap', team_name: 'Delivery Squad', wilayah: 'DKI Jakarta', is_active: 1 },
    ],
    partners: [
      { id: 'PT-001', partner_name: 'PT Pemasok Nusantara', partner_type: 'Pemasok', principal_name: 'Asus', wilayah: 'DKI Jakarta', kabkota: 'Jakarta Pusat', contact_name: 'Andi', is_active: 1 },
      { id: 'PT-002', partner_name: 'PT Distribusi Makmur', partner_type: 'Distributor', principal_name: 'Asus', wilayah: 'DKI Jakarta', kabkota: 'Jakarta Selatan', contact_name: 'Budi', is_active: 1 },
      { id: 'PT-003', partner_name: 'CV Cakra Niaga', partner_type: 'Pelaksana', principal_name: 'Asus', wilayah: 'Jawa Barat', kabkota: 'Bandung', contact_name: 'Citra', is_active: 1 },
    ],
  };

  const state = { bootstrap: null, tables: {}, activeTabEntity: 'principals', searchKeywords: { principals: '', partners: '', owners: '', locations: '' } };

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function compactKey() {
    return Array.from(arguments).map((value) => normalizeText(value).toLowerCase()).join('::');
  }

  function dedupe(rows, identity) {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).filter((row, index) => {
      const key = identity(row, index);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getBridge() {
    return window.DataSystemBridge || null;
  }

  function getFeedback() {
    return window.DataSystemFeedback || null;
  }

  function getNormalizer() {
    return window.DataSystemMasterNormalizer || null;
  }

  function aliasText(value) {
    const parsed = getNormalizer()?.parseAliases?.(value) || [];
    return parsed.join(', ');
  }

  function withAliasText(rows) {
    return (Array.isArray(rows) ? rows : []).map(function (row) {
      return { ...row, aliases_text: aliasText(row.aliases_text || row.alias_json || row.aliases || row.alias) };
    });
  }

  function readCachedBootstrap() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (_error) {}
    return null;
  }

  function writeCachedBootstrap(data) {
    state.bootstrap = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    try {
      getBridge()?.writeLocalRows?.('masters', data.locations || []);
    } catch (_error) {}
    return data;
  }

  function observeRows() {
    const bridge = getBridge();
    const funnels = bridge?.getCachedCollection?.('funnels') || window.__FUNNEL_PIPELINE_DATA__ || [];
    const orders = bridge?.getCachedCollection?.('orders') || window.__ORDERS_DATA__ || [];
    const locations = [];
    const principals = [];
    const owners = [];
    const partners = [];

    [].concat(funnels || [], orders || []).forEach((row) => {
      const wilayah = normalizeText(row.wilayah || row.region || row.provinsi);
      const kabkota = normalizeText(row.kabkota || row.kabupatenKota || row.kabupaten_kota);
      const instansi = normalizeText(row.instansi || row.instansi_satker || row.nama_instansi);
      const satker = normalizeText(row.satker || row.satuan_kerja);
      if (wilayah && kabkota) locations.push({ id: row.location_id || '', wilayah, kabkota, instansi: instansi || null, satker: satker || null, is_active: 1 });

      const principal = normalizeText(row.principal || row.principal_name);
      if (principal) principals.push({ id: '', principal_name: principal, principal_code: principal.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 16), category: row.principal_category || null, is_active: 1 });

      const pic = normalizeText(row.pic || row.picOmset || row.pic_omset);
      const penggarap = normalizeText(row.penggarap);
      if (pic) owners.push({ id: '', owner_name: pic, owner_role: 'PIC Omset', team_name: row.team_name || row.team || null, wilayah: wilayah || null, is_active: 1 });
      if (penggarap) owners.push({ id: '', owner_name: penggarap, owner_role: 'Penggarap', team_name: row.team_name || row.team || null, wilayah: wilayah || null, is_active: 1 });

      const pemasok = normalizeText(row.pemasok);
      const distributor = normalizeText(row.distributor);
      const pelaksana = normalizeText(row.pelaksana);
      if (pemasok) partners.push({ id: '', partner_name: pemasok, partner_type: 'Pemasok', principal_name: principal || null, wilayah: wilayah || null, kabkota: kabkota || null, contact_name: row.pemasok_pic || null, is_active: 1 });
      if (distributor) partners.push({ id: '', partner_name: distributor, partner_type: 'Distributor', principal_name: principal || null, wilayah: wilayah || null, kabkota: kabkota || null, contact_name: row.distributor_pic || null, is_active: 1 });
      if (pelaksana) partners.push({ id: '', partner_name: pelaksana, partner_type: 'Pelaksana', principal_name: principal || null, wilayah: wilayah || null, kabkota: kabkota || null, contact_name: row.pelaksana_pic || null, is_active: 1 });
    });

    return { locations, principals, owners, partners };
  }

  function buildHierarchy(rows) {
    const locations = Array.isArray(rows) ? rows : [];
    return {
      wilayahOptions: dedupe(locations, (row) => compactKey(row.wilayah)).map((row) => row.wilayah),
      kabkotaOptions: dedupe(locations, (row) => compactKey(row.wilayah, row.kabkota)).map((row) => ({ wilayah: row.wilayah, kabkota: row.kabkota })),
      instansiOptions: dedupe(locations.filter((row) => row.instansi), (row) => compactKey(row.wilayah, row.kabkota, row.instansi)).map((row) => ({ wilayah: row.wilayah, kabkota: row.kabkota, instansi: row.instansi })),
      satkerOptions: dedupe(locations.filter((row) => row.satker), (row) => compactKey(row.wilayah, row.kabkota, row.instansi, row.satker)).map((row) => ({ wilayah: row.wilayah, kabkota: row.kabkota, instansi: row.instansi, satker: row.satker })),
    };
  }

  function buildPartnerHierarchy(data) {
    const principalRows = Array.isArray(data.principals) ? data.principals : [];
    const partnerRows = Array.isArray(data.partners) ? data.partners : [];
    const ownerRows = Array.isArray(data.owners) ? data.owners : [];
    return {
      principalOptions: dedupe(principalRows.filter((row) => normalizeText(row.principal_name)), (row) => compactKey(row.principal_name)).map((row) => row.principal_name),
      pemasokOptions: dedupe(partnerRows.filter((row) => /pemasok/i.test(row.partner_type || '') && normalizeText(row.partner_name)), (row) => compactKey(row.partner_name)).map((row) => row.partner_name),
      distributorOptions: dedupe(partnerRows.filter((row) => /distributor/i.test(row.partner_type || '') && normalizeText(row.partner_name)), (row) => compactKey(row.partner_name)).map((row) => row.partner_name),
      pelaksanaOptions: dedupe(partnerRows.filter((row) => /pelaksana/i.test(row.partner_type || '') && normalizeText(row.partner_name)), (row) => compactKey(row.partner_name)).map((row) => row.partner_name),
      picOptions: dedupe(ownerRows.filter((row) => /pic/i.test(row.owner_role || '') && normalizeText(row.owner_name)), (row) => compactKey(row.owner_name)).map((row) => row.owner_name),
      penggarapOptions: dedupe(ownerRows.filter((row) => /penggarap/i.test(row.owner_role || '') && normalizeText(row.owner_name)), (row) => compactKey(row.owner_name)).map((row) => row.owner_name),
    };
  }

  function mergeBootstrap(base, observed) {
    const normalizer = getNormalizer();
    const merged = {
      locations: dedupe([].concat(base.locations || [], observed.locations || []), (row) => normalizer?.canonicalByType?.('location', [row.wilayah, row.kabkota, row.instansi, row.satker].filter(Boolean).join(' / ')) || compactKey(row.wilayah, row.kabkota, row.instansi, row.satker)),
      principals: dedupe([].concat(base.principals || [], observed.principals || []), (row) => normalizer?.canonicalByType?.('principal', row.principal_name || row.name) || compactKey(row.principal_name || row.name)),
      owners: dedupe([].concat(base.owners || [], observed.owners || []), (row) => (normalizer?.canonicalByType?.('owner', row.owner_name || row.name) || compactKey(row.owner_name || row.name)) + '::' + compactKey(row.owner_role || row.role)),
      partners: dedupe([].concat(base.partners || [], observed.partners || []), (row) => (normalizer?.canonicalByType?.('partner', row.partner_name || row.nama || row.name) || compactKey(row.partner_name || row.nama || row.name)) + '::' + compactKey(row.partner_type || row.tipe || row.type)),
    };
    merged.hierarchy = buildHierarchy(merged.locations);
    merged.partnerHierarchy = buildPartnerHierarchy(merged);
    return merged;
  }

  async function loadBootstrap(force) {
    if (state.bootstrap && !force) return state.bootstrap;
    let base = readCachedBootstrap() || FALLBACK;
    try {
      const remote = await getBridge()?.getMastersBootstrap?.({ silent: true });
      if (remote && typeof remote === 'object' && (Array.isArray(remote.locations) || Array.isArray(remote.principals) || Array.isArray(remote.partners))) base = remote;
    } catch (_error) {}
    const merged = mergeBootstrap(base || FALLBACK, observeRows());
    return writeCachedBootstrap(merged);
  }

  function setSelectOptions(select, values, placeholder) {
    if (!select) return;
    const currentValue = select.value;
    const currentText = select.options[select.selectedIndex]?.textContent || currentValue;
    const rows = Array.isArray(values) ? values.filter(Boolean) : [];
    select.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder || 'Pilih';
    select.appendChild(placeholderOption);
    dedupe(rows, (value) => compactKey(value)).forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    const wanted = normalizeText(currentValue || currentText);
    if (wanted) {
      const match = Array.from(select.options).find((option) => compactKey(option.value) === compactKey(wanted) || compactKey(option.textContent) === compactKey(wanted));
      if (match) select.value = match.value;
    }
  }

  function resolveField(selectorOrEl) {
    if (!selectorOrEl) return null;
    if (typeof selectorOrEl !== 'string') return selectorOrEl;
    if (selectorOrEl.startsWith('#')) return document.querySelector(selectorOrEl);
    const byId = document.getElementById(selectorOrEl);
    if (byId) return byId;
    const labels = Array.from(document.querySelectorAll('label.form-label'));
    const label = labels.find((item) => normalizeText(item.textContent) === normalizeText(selectorOrEl));
    return label?.parentElement?.querySelector('input, select, textarea') || null;
  }

  function syncLocationCascade(fields) {
    const wilayahField = resolveField(fields.wilayah);
    const kabkotaField = resolveField(fields.kabkota);
    const instansiField = resolveField(fields.instansi);
    const satkerField = resolveField(fields.satker);
    const hierarchy = (state.bootstrap || FALLBACK).hierarchy || buildHierarchy((state.bootstrap || FALLBACK).locations || []);

    if (wilayahField?.tagName === 'SELECT') setSelectOptions(wilayahField, hierarchy.wilayahOptions, 'Pilih Wilayah');
    const wilayah = normalizeText(wilayahField?.value);
    if (kabkotaField?.tagName === 'SELECT') {
      const kabkotaValues = hierarchy.kabkotaOptions.filter((row) => !wilayah || normalizeText(row.wilayah) === wilayah).map((row) => row.kabkota);
      setSelectOptions(kabkotaField, kabkotaValues, 'Pilih Kabupaten / Kota');
    }
    const kabkota = normalizeText(kabkotaField?.value);
    if (instansiField?.tagName === 'SELECT') {
      const instansiValues = hierarchy.instansiOptions.filter((row) => (!wilayah || normalizeText(row.wilayah) === wilayah) && (!kabkota || normalizeText(row.kabkota) === kabkota)).map((row) => row.instansi);
      setSelectOptions(instansiField, instansiValues, 'Pilih Instansi / Dinas');
    }
    const instansi = normalizeText(instansiField?.value);
    if (satkerField?.tagName === 'SELECT') {
      const satkerValues = hierarchy.satkerOptions.filter((row) => (!wilayah || normalizeText(row.wilayah) === wilayah) && (!kabkota || normalizeText(row.kabkota) === kabkota) && (!instansi || normalizeText(row.instansi) === instansi)).map((row) => row.satker);
      setSelectOptions(satkerField, satkerValues, 'Pilih Satuan Kerja');
    }
  }

  async function bindLocationFields(fields) {
    await loadBootstrap();
    const wilayahField = resolveField(fields.wilayah);
    const kabkotaField = resolveField(fields.kabkota);
    const instansiField = resolveField(fields.instansi);
    syncLocationCascade(fields);
    [wilayahField, kabkotaField, instansiField].forEach((field) => {
      if (!field || field.dataset.masterBound === 'true') return;
      field.dataset.masterBound = 'true';
      field.addEventListener('change', function () { syncLocationCascade(fields); });
    });
  }

  function bindEntitySelect(selectRef, values, placeholder) {
    const select = resolveField(selectRef);
    if (select?.tagName === 'SELECT') setSelectOptions(select, values, placeholder);
  }

  async function bindFunnelForm() {
    if (!document.getElementById('funnelForm')) return null;
    const data = await loadBootstrap();
    await bindLocationFields({ wilayah: '#funnel-wilayah', kabkota: '#funnel-kabkota', instansi: '#funnel-instansi', satker: '#funnel-satker' });
    const hierarchy = data.partnerHierarchy || buildPartnerHierarchy(data);
    bindEntitySelect('#funnel-principal', hierarchy.principalOptions, 'Pilih Principal');
    bindEntitySelect('#funnel-pemasok', hierarchy.pemasokOptions, 'Pilih Pemasok');
    bindEntitySelect('#funnel-distributor', hierarchy.distributorOptions, 'Pilih Distributor');
    bindEntitySelect('#funnel-pelaksana', hierarchy.pelaksanaOptions, 'Pilih Pelaksana');
    bindEntitySelect('#funnel-pic', hierarchy.picOptions, 'Pilih PIC Omset');
    bindEntitySelect('#funnel-penggarap', hierarchy.penggarapOptions, 'Pilih Penggarap');
    return data;
  }

  async function bindOrderForm() {
    if (!document.getElementById('pesananForm')) return null;
    const data = await loadBootstrap();
    await bindLocationFields({ wilayah: 'Wilayah', kabkota: 'Kabupaten/Kota', instansi: 'Instansi / Dinas', satker: 'Satuan Kerja' });
    const hierarchy = data.partnerHierarchy || buildPartnerHierarchy(data);
    bindEntitySelect('Principal', hierarchy.principalOptions, 'Pilih Principal');
    bindEntitySelect('Pemasok', hierarchy.pemasokOptions, 'Pilih Pemasok');
    bindEntitySelect('Distributor', hierarchy.distributorOptions, 'Pilih Distributor');
    bindEntitySelect('Pelaksana', hierarchy.pelaksanaOptions, 'Pilih Pelaksana');
    bindEntitySelect('PIC Omset', hierarchy.picOptions, 'Pilih PIC Omset');
    bindEntitySelect('Penggarap', hierarchy.penggarapOptions, 'Pilih Penggarap');
    return data;
  }

  function buildDeleteFormatter(iconClass) {
    return () => `<button class="btn btn-sm btn-custom-outline py-0"><i class="fa-solid ${iconClass || 'fa-trash'} text-danger"></i></button>`;
  }


  function getActiveTabEntity() {
    const activeTab = document.querySelector('button[data-bs-toggle="tab"].active');
    const target = activeTab?.getAttribute('data-bs-target') || '';
    const mapping = {
      '#tab-produk': 'principals',
      '#tab-mitra': 'partners',
      '#tab-owner': 'owners',
      '#tab-satker': 'locations'
    };
    state.activeTabEntity = mapping[target] || state.activeTabEntity || 'principals';
    return state.activeTabEntity;
  }

  function getEntityLabel(entity) {
    return {
      principals: 'Principal',
      partners: 'Mitra & Vendor',
      owners: 'PIC & Penggarap',
      locations: 'Instansi & Satker'
    }[entity] || 'Master';
  }

  function getTableByEntity(entity) {
    return state.tables?.[entity] || null;
  }

  function getExportRows(entity) {
    const key = entity || getActiveTabEntity();
    return (getTableByEntity(key)?.getData?.() || []).map(function (row) {
      const clean = { ...row };
      delete clean._children;
      return clean;
    });
  }

  function filterTableByKeyword(table, fields, keyword) {
    if (!table?.setFilter) return;
    const query = normalizeText(keyword).toLowerCase();
    if (!query) {
      table.clearFilter(true);
      return;
    }
    table.setFilter(function (data) {
      return (fields || []).some(function (field) {
        return normalizeText(data?.[field]).toLowerCase().includes(query);
      });
    });
  }

  function filterActiveTable(keyword) {
    const entity = getActiveTabEntity();
    const query = normalizeText(keyword);
    state.searchKeywords[entity] = query;
    const fieldsByEntity = {
      principals: ['principal_code', 'principal_name', 'category', 'aliases_text'],
      partners: ['partner_type', 'partner_name', 'principal_name', 'wilayah', 'kabkota', 'contact_name', 'aliases_text'],
      owners: ['owner_name', 'owner_role', 'team_name', 'wilayah', 'email', 'phone', 'aliases_text'],
      locations: ['wilayah', 'kabkota', 'instansi', 'satker', 'aliases_text']
    };
    filterTableByKeyword(getTableByEntity(entity), fieldsByEntity[entity] || [], query);
    window.setTimeout(function () {
      emitMasterStats();
      document.dispatchEvent(new CustomEvent('masters:filter-changed', {
        detail: {
          entity: entity,
          label: getEntityLabel(entity),
          keyword: query
        }
      }));
    }, 0);
  }

  function getSearchKeyword(entity) {
    const key = entity || getActiveTabEntity();
    return normalizeText(state.searchKeywords?.[key]);
  }

  function getEntityStats(entity) {
    const key = entity || getActiveTabEntity();
    const table = getTableByEntity(key);
    const rows = Array.isArray(table?.getData?.()) ? table.getData() : withAliasText(((state.bootstrap || readCachedBootstrap() || FALLBACK)?.[key] || []));
    const total = rows.length;
    const visible = Number(table?.getDataCount?.('active')) || total;
    const active = rows.filter(function (row) { return Number(row?.is_active ?? 1) !== 0; }).length;
    const withAlias = rows.filter(function (row) { return normalizeText(row?.aliases_text || row?.alias || row?.aliases); }).length;
    return {
      entity: key,
      label: getEntityLabel(key),
      total: total,
      visible: visible,
      active: active,
      inactive: Math.max(0, total - active),
      withAlias: withAlias
    };
  }

  function emitMasterStats() {
    const entities = ['principals', 'partners', 'owners', 'locations'];
    const summary = {};
    entities.forEach(function (entity) { summary[entity] = getEntityStats(entity); });
    document.dispatchEvent(new CustomEvent('masters:stats-updated', {
      detail: {
        activeEntity: getActiveTabEntity(),
        activeLabel: getEntityLabel(getActiveTabEntity()),
        entities: summary
      }
    }));
  }

  async function initDatabaseMasterPageEnhanced() {
    if (typeof Tabulator === 'undefined' || !document.getElementById('master-satker-grid')) return false;
    const bridge = getBridge();
    const data = await loadBootstrap(true);
    const info = document.getElementById('master-location-governance-info');
    const coverage = getNormalizer()?.getCoverageSummary?.(data);
    if (info) info.textContent = `Single source of truth aktif • ${data.locations.length} lokasi • ${data.principals.length} principal • ${data.partners.length} mitra • ${data.owners.length} owner • alias principal ${coverage?.principals?.withAlias || 0}, mitra ${coverage?.partners?.withAlias || 0}, owner ${coverage?.owners?.withAlias || 0}.`;

    const redrawAll = () => {
      principalTable?.redraw?.();
      partnerTable?.redraw?.();
      ownerTable?.redraw?.();
      locationTable?.redraw?.();
    };

    const principalTable = document.getElementById('master-principal-grid') ? new Tabulator('#master-principal-grid', {
      data: JSON.parse(JSON.stringify(withAliasText(data.principals || []))),
      layout: 'fitColumns',
      reactiveData: true,
      placeholder: 'Belum ada master principal.',
      columns: [
        { title: 'Kode', field: 'principal_code', width: 140, editor: 'input' },
        { title: 'Nama Principal', field: 'principal_name', minWidth: 220, editor: 'input' },
        { title: 'Kategori', field: 'category', width: 150, editor: 'input' },
        { title: 'Alias', field: 'aliases_text', minWidth: 220, editor: 'input', headerTooltip: 'Pisahkan alias dengan koma' },
        { title: 'Aktif', field: 'is_active', width: 90, hozAlign: 'center', formatter: (cell) => Number(cell.getValue()) ? 'Ya' : 'Tidak', editor: 'list', editorParams: { values: { 1: 'Ya', 0: 'Tidak' } } },
        { title: 'Aksi', width: 90, hozAlign: 'center', formatter: buildDeleteFormatter(), cellClick: async (_e, cell) => {
          const row = cell.getRow().getData();
          if (!row.id) return;
          const proceed = await getFeedback()?.confirm?.(`Hapus principal ${row.principal_name}?`, { title: 'Hapus principal', variant: 'warning', confirmText: 'Ya, hapus', cancelText: 'Batal' });
          if (!proceed) return;
          await bridge?.deleteMasterPrincipal?.(row.id);
          cell.getRow().delete();
          await loadBootstrap(true);
          emitMasterStats();
        } },
      ],
      cellEdited: async function (cell) {
        const row = { ...cell.getRow().getData() };
        if (!normalizeText(row.principal_name)) return;
        const duplicate = getNormalizer()?.checkMasterDuplicate?.('principal', row, { principals: principalTable.getData(), partners: partnerTable?.getData?.() || [], owners: ownerTable?.getData?.() || [], locations: locationTable?.getData?.() || [] });
        if (duplicate?.decision === 'block') { getFeedback()?.alert?.('Principal duplikat: ' + (duplicate.matches?.[0]?.record?.principal_name || 'master lain'), { title: 'Duplikat principal', variant: 'warning' }); cell.restoreOldValue?.(); return; }
        const response = await bridge?.upsertMasterPrincipal?.({ ...row, aliases: row.aliases_text });
        if (response?.data?.id) cell.getRow().update({ id: response.data.id });
        await loadBootstrap(true);
        emitMasterStats();
      },
    }) : null;

    const partnerTable = document.getElementById('master-mitra-grid') ? new Tabulator('#master-mitra-grid', {
      data: JSON.parse(JSON.stringify(withAliasText(data.partners || []))),
      layout: 'fitColumns',
      reactiveData: true,
      placeholder: 'Belum ada master mitra.',
      columns: [
        { title: 'Tipe Mitra', field: 'partner_type', width: 150, editor: 'list', editorParams: { values: ['Pelaksana', 'Distributor', 'Pemasok'] } },
        { title: 'Nama Mitra', field: 'partner_name', minWidth: 220, editor: 'input' },
        { title: 'Principal', field: 'principal_name', width: 160, editor: 'list', editorParams: { values: (data.partnerHierarchy || buildPartnerHierarchy(data)).principalOptions || [] } },
        { title: 'Wilayah', field: 'wilayah', width: 150, editor: 'list', editorParams: { values: (data.hierarchy || buildHierarchy(data.locations || [])).wilayahOptions || [] } },
        { title: 'Kab/Kota', field: 'kabkota', width: 160, editor: 'input' },
        { title: 'Kontak / PIC', field: 'contact_name', width: 160, editor: 'input' },
        { title: 'Alias', field: 'aliases_text', minWidth: 220, editor: 'input', headerTooltip: 'Pisahkan alias dengan koma' },
        { title: 'Aktif', field: 'is_active', width: 90, hozAlign: 'center', formatter: (cell) => Number(cell.getValue()) ? 'Ya' : 'Tidak', editor: 'list', editorParams: { values: { 1: 'Ya', 0: 'Tidak' } } },
        { title: 'Aksi', width: 90, hozAlign: 'center', formatter: buildDeleteFormatter(), cellClick: async (_e, cell) => {
          const row = cell.getRow().getData();
          if (!row.id) return;
          const proceed = await getFeedback()?.confirm?.(`Hapus mitra ${row.partner_name}?`, { title: 'Hapus mitra', variant: 'warning', confirmText: 'Ya, hapus', cancelText: 'Batal' });
          if (!proceed) return;
          await bridge?.deleteMasterPartner?.(row.id);
          cell.getRow().delete();
          await loadBootstrap(true);
          emitMasterStats();
        } },
      ],
      cellEdited: async function (cell) {
        const row = { ...cell.getRow().getData() };
        if (!normalizeText(row.partner_name) || !normalizeText(row.partner_type)) return;
        const duplicate = getNormalizer()?.checkMasterDuplicate?.('partner', row, { principals: principalTable?.getData?.() || [], partners: partnerTable.getData(), owners: ownerTable?.getData?.() || [], locations: locationTable?.getData?.() || [] });
        if (duplicate?.decision === 'block') { getFeedback()?.alert?.('Mitra duplikat: ' + (duplicate.matches?.[0]?.record?.partner_name || 'master lain'), { title: 'Duplikat mitra', variant: 'warning' }); cell.restoreOldValue?.(); return; }
        const response = await bridge?.upsertMasterPartner?.({ ...row, aliases: row.aliases_text });
        if (response?.data?.id) cell.getRow().update({ id: response.data.id });
        await loadBootstrap(true);
        emitMasterStats();
      },
    }) : null;

    const ownerTable = document.getElementById('master-owner-grid') ? new Tabulator('#master-owner-grid', {
      data: JSON.parse(JSON.stringify(withAliasText(data.owners || []))),
      layout: 'fitColumns',
      reactiveData: true,
      placeholder: 'Belum ada PIC / Penggarap.',
      columns: [
        { title: 'Nama', field: 'owner_name', minWidth: 180, editor: 'input' },
        { title: 'Role', field: 'owner_role', width: 150, editor: 'list', editorParams: { values: ['PIC Omset', 'Penggarap'] } },
        { title: 'Tim', field: 'team_name', width: 150, editor: 'input' },
        { title: 'Wilayah', field: 'wilayah', width: 150, editor: 'list', editorParams: { values: (data.hierarchy || buildHierarchy(data.locations || [])).wilayahOptions || [] } },
        { title: 'Email', field: 'email', minWidth: 190, editor: 'input' },
        { title: 'Telepon', field: 'phone', width: 130, editor: 'input' },
        { title: 'Alias', field: 'aliases_text', minWidth: 220, editor: 'input', headerTooltip: 'Pisahkan alias dengan koma' },
        { title: 'Aktif', field: 'is_active', width: 90, hozAlign: 'center', formatter: (cell) => Number(cell.getValue()) ? 'Ya' : 'Tidak', editor: 'list', editorParams: { values: { 1: 'Ya', 0: 'Tidak' } } },
        { title: 'Aksi', width: 90, hozAlign: 'center', formatter: buildDeleteFormatter(), cellClick: async (_e, cell) => {
          const row = cell.getRow().getData();
          if (!row.id) return;
          const proceed = await getFeedback()?.confirm?.(`Hapus ${row.owner_role} ${row.owner_name}?`, { title: 'Hapus owner', variant: 'warning', confirmText: 'Ya, hapus', cancelText: 'Batal' });
          if (!proceed) return;
          await bridge?.deleteMasterOwner?.(row.id);
          cell.getRow().delete();
          await loadBootstrap(true);
          emitMasterStats();
        } },
      ],
      cellEdited: async function (cell) {
        const row = { ...cell.getRow().getData() };
        if (!normalizeText(row.owner_name) || !normalizeText(row.owner_role)) return;
        const duplicate = getNormalizer()?.checkMasterDuplicate?.('owner', row, { principals: principalTable?.getData?.() || [], partners: partnerTable?.getData?.() || [], owners: ownerTable.getData(), locations: locationTable?.getData?.() || [] });
        if (duplicate?.decision === 'block') { getFeedback()?.alert?.('Owner duplikat: ' + (duplicate.matches?.[0]?.record?.owner_name || 'master lain'), { title: 'Duplikat owner', variant: 'warning' }); cell.restoreOldValue?.(); return; }
        const response = await bridge?.upsertMasterOwner?.({ ...row, aliases: row.aliases_text });
        if (response?.data?.id) cell.getRow().update({ id: response.data.id });
        await loadBootstrap(true);
        emitMasterStats();
      },
    }) : null;

    const locationTable = new Tabulator('#master-satker-grid', {
      data: JSON.parse(JSON.stringify(withAliasText(data.locations || []))),
      layout: 'fitColumns',
      reactiveData: true,
      placeholder: 'Belum ada master lokasi.',
      columns: [
        { title: 'Wilayah', field: 'wilayah', width: 160, editor: 'input' },
        { title: 'Kabupaten / Kota', field: 'kabkota', width: 180, editor: 'input' },
        { title: 'Instansi / Dinas', field: 'instansi', minWidth: 240, editor: 'input' },
        { title: 'Satuan Kerja', field: 'satker', minWidth: 220, editor: 'input' },
        { title: 'Alias Lokasi', field: 'aliases_text', minWidth: 220, editor: 'input', headerTooltip: 'Pisahkan alias dengan koma' },
        { title: 'Aktif', field: 'is_active', width: 90, hozAlign: 'center', formatter: (cell) => Number(cell.getValue()) ? 'Ya' : 'Tidak', editor: 'list', editorParams: { values: { 1: 'Ya', 0: 'Tidak' } } },
        { title: 'Aksi', width: 90, hozAlign: 'center', formatter: buildDeleteFormatter(), cellClick: async (_e, cell) => {
          const row = cell.getRow().getData();
          if (!row.id) return;
          const proceed = await getFeedback()?.confirm?.(`Hapus master lokasi ${row.wilayah} / ${row.kabkota}?`, { title: 'Hapus master lokasi', variant: 'warning', confirmText: 'Ya, hapus', cancelText: 'Batal' });
          if (!proceed) return;
          await bridge?.deleteMasterLocation?.(row.id);
          cell.getRow().delete();
          await loadBootstrap(true);
          emitMasterStats();
        } },
      ],
      cellEdited: async function (cell) {
        const row = { ...cell.getRow().getData() };
        if (!row.id) row.id = `LOC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        if (!normalizeText(row.wilayah) || !normalizeText(row.kabkota)) return;
        const duplicate = getNormalizer()?.checkMasterDuplicate?.('location', row, { principals: principalTable?.getData?.() || [], partners: partnerTable?.getData?.() || [], owners: ownerTable?.getData?.() || [], locations: locationTable.getData() });
        if (duplicate?.decision === 'block') { getFeedback()?.alert?.('Lokasi duplikat dengan master yang sudah ada.', { title: 'Duplikat lokasi', variant: 'warning' }); cell.restoreOldValue?.(); return; }
        await bridge?.upsertMasterLocation?.({ ...row, aliases: row.aliases_text });
        await loadBootstrap(true);
        emitMasterStats();
      },
    });


    state.tables = {
      principals: principalTable,
      partners: partnerTable,
      owners: ownerTable,
      locations: locationTable,
    };
    getActiveTabEntity();
    emitMasterStats();

    document.getElementById('btn-add-principal')?.addEventListener('click', function () {
      principalTable?.addRow({ principal_name: '', principal_code: '', category: '', aliases_text: '', is_active: 1 }, true);
      emitMasterStats();
    });
    document.getElementById('btn-add-mitra')?.addEventListener('click', function () {
      partnerTable?.addRow({ partner_name: '', partner_type: 'Pelaksana', principal_name: '', wilayah: '', kabkota: '', contact_name: '', aliases_text: '', is_active: 1 }, true);
      emitMasterStats();
    });
    document.getElementById('btn-add-owner')?.addEventListener('click', function () {
      ownerTable?.addRow({ owner_name: '', owner_role: 'PIC Omset', team_name: '', wilayah: '', email: '', phone: '', aliases_text: '', is_active: 1 }, true);
      emitMasterStats();
    });
    document.getElementById('btn-add-satker')?.addEventListener('click', function () {
      locationTable.addRow({ id: `LOC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, wilayah: '', kabkota: '', instansi: '', satker: '', aliases_text: '', is_active: 1 }, true);
      emitMasterStats();
    });

    document.getElementById('btn-refresh-master-locations')?.addEventListener('click', async function () {
      const fresh = await loadBootstrap(true);
      principalTable?.replaceData(JSON.parse(JSON.stringify(withAliasText(fresh.principals || []))));
      partnerTable?.replaceData(JSON.parse(JSON.stringify(withAliasText(fresh.partners || []))));
      ownerTable?.replaceData(JSON.parse(JSON.stringify(withAliasText(fresh.owners || []))));
      locationTable.replaceData(JSON.parse(JSON.stringify(withAliasText(fresh.locations || []))));
      const freshCoverage = getNormalizer()?.getCoverageSummary?.(fresh);
      if (info) info.textContent = `Single source of truth aktif • ${fresh.locations.length} lokasi • ${fresh.principals.length} principal • ${fresh.partners.length} mitra • ${fresh.owners.length} owner • alias principal ${freshCoverage?.principals?.withAlias || 0}, mitra ${freshCoverage?.partners?.withAlias || 0}, owner ${freshCoverage?.owners?.withAlias || 0}.`;
      redrawAll();
      emitMasterStats();
    });

    document.getElementById('btn-save-master-locations')?.addEventListener('click', async function () {
      const tasks = [];
      principalTable?.getData().forEach((row) => {
        if (normalizeText(row.principal_name)) tasks.push(bridge?.upsertMasterPrincipal?.({ ...row, aliases: row.aliases_text }));
      });
      partnerTable?.getData().forEach((row) => {
        if (normalizeText(row.partner_name) && normalizeText(row.partner_type)) tasks.push(bridge?.upsertMasterPartner?.({ ...row, aliases: row.aliases_text }));
      });
      ownerTable?.getData().forEach((row) => {
        if (normalizeText(row.owner_name) && normalizeText(row.owner_role)) tasks.push(bridge?.upsertMasterOwner?.({ ...row, aliases: row.aliases_text }));
      });
      locationTable.getData().forEach((row) => {
        if (normalizeText(row.wilayah) && normalizeText(row.kabkota)) tasks.push(bridge?.upsertMasterLocation?.({ ...row, aliases: row.aliases_text }));
      });
      await Promise.all(tasks.filter(Boolean));
      await loadBootstrap(true);
      emitMasterStats();
      getFeedback()?.toast?.('Master Principal / Mitra / PIC-Penggarap / Lokasi berhasil disimpan.', 'success');
    });

    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach((tab) => {
      tab.addEventListener('shown.bs.tab', function () {
        getActiveTabEntity();
        redrawAll();
        document.dispatchEvent(new CustomEvent('masters:active-tab-changed', { detail: { entity: state.activeTabEntity, label: getEntityLabel(state.activeTabEntity) } }));
        emitMasterStats();
      });
    });

    document.dispatchEvent(new CustomEvent('masters:active-tab-changed', { detail: { entity: getActiveTabEntity(), label: getEntityLabel(getActiveTabEntity()) } }));
    emitMasterStats();
    return true;
  }

  window.DataSystemMasterData = {
    loadBootstrap,
    bindFunnelForm,
    bindOrderForm,
    bindLocationFields,
    initDatabaseMasterPageEnhanced,
    getState: function () { return state.bootstrap || readCachedBootstrap() || FALLBACK; },
    getActiveTabEntity,
    getEntityLabel,
    getExportRows,
    filterActiveTable,
    getEntityStats,
    getSearchKeyword,
    emitMasterStats,
    getTables: function () { return state.tables || {}; },
  };
})(window);
