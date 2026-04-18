(function (window) {
  'use strict';

  const CONFIG_STORAGE_KEY = 'ds_app_config';
  const AUTH_STORAGE_KEY = 'ds_api_auth';
  const PERMISSIONS_STORAGE_KEY = 'ds_api_permissions';
  const CACHE_PREFIX = 'ds_api_cache_';
  const DEFAULT_CONFIG = {
    mode: 'auto',
    apiBaseUrl: 'http://localhost:3000/api',
  };
  const LOCAL_KEYS = {
    funnels: ['dsFunnelPipelineRecords'],
    orders: ['datasystem_orders', 'ordersData'],
    orderDrafts: ['ds_order_drafts'],
    masters: ['ds_master_cache'],
    mastersBootstrap: ['ds_master_bootstrap_cache'],
    links: ['ds_funnel_order_links'],
    auditLogs: ['ds_audit_logs'],
    orderIssues: ['ds_order_issues'],
    savedViews: ['ds_saved_views'],
  };
  const ENDPOINTS = {
    funnels: '/funnels',
    orders: '/orders',
    orderDrafts: '/order-drafts',
    masters: '/masters/bootstrap',
    auditLogs: '/audit-logs',
    links: '/relations/funnel-order',
    duplicates: '/duplicates/check',
    orderIssues: '/order-issues',
    savedViews: '/saved-views',
    authLogin: '/auth/login',
    authMe: '/auth/me',
    authLogout: '/auth/logout',
    authPermissions: '/auth/permissions',
    systemBackup: '/system/backup',
    systemRestore: '/system/restore',
    importOrders: '/import/orders',
    importFunnels: '/import/funnels',
    importTemplates: '/import/templates',
  };
  const state = {
    config: loadConfig(),
    availability: 'unknown',
    health: null,
    listeners: new Set(),
  };

  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    } catch (_error) {
      return fallback;
    }
  }

  function loadConfig() {
    const stored = safeJsonParse(localStorage.getItem(CONFIG_STORAGE_KEY), {});
    return { ...DEFAULT_CONFIG, ...(stored || {}) };
  }

  function loadAuth() {
    return safeJsonParse(localStorage.getItem(AUTH_STORAGE_KEY), {}) || {};
  }


  function loadPermissions() {
    return safeJsonParse(localStorage.getItem(PERMISSIONS_STORAGE_KEY), null);
  }

  function savePermissions(nextPermissions) {
    if (!nextPermissions) {
      localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
      emit('permissions', null);
      return null;
    }
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(nextPermissions));
    emit('permissions', nextPermissions);
    return nextPermissions;
  }

  function clearPermissions() {
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    emit('permissions', null);
  }

  function saveAuth(nextAuth) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth || {}));
    emit('auth', nextAuth || {});
    renderIndicator();
    return nextAuth || {};
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    clearPermissions();
    emit('auth', null);
    renderIndicator();
  }

  function saveConfig(nextConfig) {
    state.config = { ...state.config, ...(nextConfig || {}) };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state.config));
    emit('config', { ...state.config });
    renderIndicator();
    return { ...state.config };
  }

  function emit(type, detail) {
    state.listeners.forEach((handler) => {
      try {
        handler(type, detail);
      } catch (_error) {}
    });
    document.dispatchEvent(new CustomEvent('ds:bridge:' + type, { detail }));
  }

  function subscribe(handler) {
    state.listeners.add(handler);
    return function unsubscribe() {
      state.listeners.delete(handler);
    };
  }

  function normalizeType(type) {
    const lower = String(type || '').trim().toLowerCase();
    if (lower === 'master' || lower === 'masters') return 'masters';
    if (lower === 'masterbootstrap' || lower === 'mastersbootstrap' || lower === 'bootstrap') return 'mastersBootstrap';
    if (lower === 'orderdraft' || lower === 'orderdrafts' || lower === 'draft' || lower === 'drafts') return 'orderDrafts';
    if (lower === 'audit' || lower === 'auditlogs') return 'auditLogs';
    if (lower === 'orderissue' || lower === 'orderissues' || lower === 'issue' || lower === 'issues' || lower === 'blocker' || lower === 'blockers') return 'orderIssues';
    if (lower === 'link' || lower === 'links' || lower === 'relation' || lower === 'relations') return 'links';
    if (lower === 'savedview' || lower === 'savedviews' || lower === 'view' || lower === 'views') return 'savedViews';
    return lower;
  }

  function getRowIdentity(type, row, index) {
    const entity = normalizeType(type);
    if (entity === 'funnels') return String(row?.id || row?.kodeRup || row?.namaPengadaan || index + 1).trim().toLowerCase();
    if (entity === 'orders') return String(row?.po_number || row?.po || row?.order_no || row?.nomor_po || row?.id || index + 1).trim().toLowerCase();
    if (entity === 'orderDrafts') return String(row?.id || row?.draft_id || row?.draft_code || row?.po_number || index + 1).trim().toLowerCase();
    if (entity === 'links') return String(row?.funnel_id || row?.funnelId || '') + '::' + String(row?.order_no || row?.orderNo || row?.order_id || index + 1).trim().toLowerCase();
    if (entity === 'auditLogs') return String(row?.id || row?.created_at || row?.createdAt || '') + '::' + String(row?.entity_id || row?.entityId || index + 1).trim().toLowerCase();
    if (entity === 'orderIssues') return String(row?.id || row?.issue_id || row?.created_at || row?.createdAt || index + 1).trim().toLowerCase();
    if (entity === 'savedViews') return String(row?.id || row?.view_id || row?.name || index + 1).trim().toLowerCase();
    return String(row?.id || row?.code || row?.name || index + 1).trim().toLowerCase();
  }

  function getLocalRows(type) {
    const keys = LOCAL_KEYS[normalizeType(type)] || [];
    const merged = [];
    const seen = new Set();
    keys.forEach((key) => {
      const parsed = safeJsonParse(localStorage.getItem(key), []);
      if (!Array.isArray(parsed)) return;
      parsed.forEach((row, index) => {
        const identity = getRowIdentity(type, row, index);
        if (seen.has(identity)) return;
        seen.add(identity);
        merged.push(row);
      });
    });
    return merged;
  }

  function writeLocalRows(type, rows) {
    const entity = normalizeType(type);
    const safeRows = Array.isArray(rows) ? rows : [];
    const keys = LOCAL_KEYS[entity] || [];
    keys.forEach((key) => localStorage.setItem(key, JSON.stringify(safeRows)));
    if (entity === 'orders') {
      window.__ORDERS_DATA__ = safeRows;
      window.ordersData = safeRows;
      window.daftarPesananData = safeRows;
      window.dashboardOrders = safeRows;
    }
    if (entity === 'orderDrafts') {
      window.__ORDER_DRAFTS__ = safeRows;
    }
    if (entity === 'orderIssues') {
      window.__ORDER_ISSUES__ = safeRows;
    }
    if (entity === 'funnels') {
      window.__FUNNEL_PIPELINE_DATA__ = safeRows;
    }
    writeCache(entity, safeRows);
    emit(entity + ':updated', { source: 'local', rows: safeRows });
    return safeRows;
  }

  function getCacheKey(type) {
    return CACHE_PREFIX + normalizeType(type);
  }

  function writeCache(type, rows) {
    localStorage.setItem(getCacheKey(type), JSON.stringify(Array.isArray(rows) ? rows : []));
  }

  function getCachedCollection(type) {
    const entity = normalizeType(type);
    const fromCache = safeJsonParse(localStorage.getItem(getCacheKey(entity)), null);
    if (Array.isArray(fromCache) && fromCache.length) return fromCache;
    return getLocalRows(entity);
  }

  function setCachedCollection(type, rows) {
    return writeLocalRows(type, rows);
  }

  function joinUrl(base, path) {
    return String(base || '').replace(/\/+$/, '') + path;
  }

  async function request(path, options) {
    const config = loadConfig();
    const auth = loadAuth();
    const response = await fetch(joinUrl(config.apiBaseUrl, path), {
      headers: {
        'Content-Type': 'application/json',
        ...(auth?.token ? { Authorization: 'Bearer ' + auth.token } : {}),
        ...(auth?.user?.display_name ? { 'X-Actor-Name': auth.user.display_name } : {}),
        ...(options?.headers || {}),
      },
      ...options,
    });
    const text = await response.text();
    const data = text ? safeJsonParse(text, { message: text }) : null;
    if (!response.ok) {
      const error = new Error(data?.message || 'API request failed');
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  }

  async function ping() {
    const mode = loadConfig().mode;
    if (mode === 'local') {
      state.availability = 'local';
      state.health = { auth_required: false, mode: 'local' };
      renderIndicator();
      emit('health', state.health);
      return false;
    }
    try {
      const payload = await request('/health');
      state.health = payload?.data || null;
      state.availability = 'online';
      renderIndicator();
      emit('health', state.health);
      return true;
    } catch (_error) {
      state.health = null;
      state.availability = mode === 'api' ? 'error' : 'offline';
      renderIndicator();
      emit('health', state.health);
      return false;
    }
  }

  async function refreshCollection(type, options) {
    const entity = normalizeType(type);
    const mode = loadConfig().mode;
    if (mode === 'local') return getCachedCollection(entity);
    const endpoint = ENDPOINTS[entity];
    if (!endpoint) return getCachedCollection(entity);
    const apiAvailable = await ping();
    if (!apiAvailable) return getCachedCollection(entity);
    try {
      const payload = await request(endpoint);
      const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      writeLocalRows(entity, rows);
      if (!options?.silent) emit(entity + ':refreshed', { source: 'api', rows });
      return rows;
    } catch (_error) {
      return getCachedCollection(entity);
    }
  }

  async function replaceCollection(type, rows) {
    const entity = normalizeType(type);
    const safeRows = writeLocalRows(entity, rows);
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local', data: safeRows };
    const endpoint = ENDPOINTS[entity];
    if (!endpoint) return { ok: true, source: 'local', data: safeRows };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local', data: safeRows };
    const payload = await request(endpoint + '/bulk-replace', {
      method: 'POST',
      body: JSON.stringify({ rows: safeRows }),
    });
    return { ok: true, source: 'api', data: payload?.data || safeRows };
  }

  async function upsertOne(type, row) {
    const entity = normalizeType(type);
    const current = getCachedCollection(entity);
    const identity = getRowIdentity(entity, row, current.length);
    const merged = [...current.filter((item, index) => getRowIdentity(entity, item, index) !== identity), row];
    writeLocalRows(entity, merged);
    const mode = loadConfig().mode;
    const apiAvailable = mode === 'local' ? false : await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local', data: row };
    const endpoint = ENDPOINTS[entity];
    const payload = await request(endpoint, { method: 'POST', body: JSON.stringify(row) });
    return { ok: true, source: 'api', data: payload?.data || row };
  }

  function normalizeAuditEntry(entry) {
    return {
      id: entry?.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entity_type: entry?.entity_type || entry?.entityType || 'system',
      entity_id: entry?.entity_id || entry?.entityId || '-',
      action_type: entry?.action_type || entry?.actionType || 'update',
      actor_name: entry?.actor_name || entry?.actorName || 'system',
      summary: entry?.summary || '-',
      snapshot_json: entry?.snapshot_json || entry?.snapshot || null,
      created_at: entry?.created_at || entry?.createdAt || new Date().toISOString(),
    };
  }

  function appendAuditLogLocal(entry) {
    const rows = getCachedCollection('auditLogs');
    const normalized = normalizeAuditEntry(entry);
    writeLocalRows('auditLogs', [normalized, ...rows].slice(0, 300));
    return normalized;
  }


  function normalizePlainText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function compactKey(value) {
    return normalizePlainText(value).replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function buildDuplicateDecision(matches) {
    if ((matches || []).some((item) => item.severity === 'block')) return 'block';
    if ((matches || []).some((item) => item.severity === 'warn')) return 'warn';
    return 'ok';
  }

  function checkOrderDuplicatesLocal(row) {
    const current = getCachedCollection('orders');
    const currentId = normalizePlainText(row?.id);
    const poNumber = normalizePlainText(row?.po_number || row?.po || row?.order_no || row?.nomor_po);
    const kodeRup = normalizePlainText(row?.kode_rup || row?.kodeRup);
    const satker = compactKey(row?.satker || row?.instansi);
    const pengadaan = compactKey(row?.nama_pengadaan || row?.namaPengadaan || row?.pengadaan);
    const matches = [];
    (Array.isArray(current) ? current : []).forEach(function (item) {
      const sameRecord = currentId && normalizePlainText(item?.id) === currentId;
      if (sameRecord) return;
      const itemPo = normalizePlainText(item?.po_number || item?.po || item?.order_no || item?.nomor_po);
      const itemRup = normalizePlainText(item?.kode_rup || item?.kodeRup);
      const itemSatker = compactKey(item?.satker || item?.instansi);
      const itemPengadaan = compactKey(item?.nama_pengadaan || item?.namaPengadaan || item?.pengadaan);
      if (poNumber && itemPo && poNumber === itemPo) {
        matches.push({ severity: 'block', code: 'ORDER_PO_DUPLICATE', message: 'Nomor PO ' + (item?.po_number || item?.po || item?.order_no || item?.nomor_po || row?.po_number) + ' sudah dipakai oleh order lain.', record: item });
        return;
      }
      if (kodeRup && itemRup && satker && itemSatker && kodeRup === itemRup && satker === itemSatker) {
        matches.push({ severity: 'warn', code: 'ORDER_RUP_SATKER_DUPLICATE', message: 'Ada order lain dengan kombinasi Kode RUP dan satker yang sama.', record: item });
      }
      if (pengadaan && itemPengadaan && satker && itemSatker && pengadaan === itemPengadaan && satker === itemSatker) {
        matches.push({ severity: 'warn', code: 'ORDER_PROCUREMENT_DUPLICATE', message: 'Nama pengadaan dan satker mirip dengan order lain.', record: item });
      }
    });
    return { entityType: 'order', decision: buildDuplicateDecision(matches), matches: matches };
  }

  function checkFunnelDuplicatesLocal(row) {
    const current = getCachedCollection('funnels');
    const currentId = normalizePlainText(row?.id);
    const kodeRup = normalizePlainText(row?.kode_rup || row?.kodeRup);
    const satker = compactKey(row?.satker || row?.instansi);
    const pengadaan = compactKey(row?.nama_pengadaan || row?.namaPengadaan || row?.pengadaan);
    const matches = [];
    (Array.isArray(current) ? current : []).forEach(function (item) {
      const sameRecord = currentId && normalizePlainText(item?.id) === currentId;
      if (sameRecord) return;
      const itemRup = normalizePlainText(item?.kode_rup || item?.kodeRup);
      const itemSatker = compactKey(item?.satker || item?.instansi);
      const itemPengadaan = compactKey(item?.nama_pengadaan || item?.namaPengadaan || item?.pengadaan);
      if (kodeRup && itemRup && kodeRup === itemRup) {
        matches.push({ severity: 'warn', code: 'FUNNEL_RUP_DUPLICATE', message: 'Ada funnel lain dengan Kode RUP yang sama.', record: item });
      }
      if (pengadaan && itemPengadaan && satker && itemSatker && pengadaan === itemPengadaan && satker === itemSatker) {
        matches.push({ severity: 'warn', code: 'FUNNEL_PROCUREMENT_DUPLICATE', message: 'Nama pengadaan dan satker mirip dengan funnel lain.', record: item });
      }
    });
    return { entityType: 'funnel', decision: buildDuplicateDecision(matches), matches: matches };
  }

  function checkDuplicatesLocal(entityType, row) {
    const entity = normalizeType(entityType);
    if (entity === 'orders' || entity === 'order') return checkOrderDuplicatesLocal(row);
    return checkFunnelDuplicatesLocal(row);
  }

  async function getAuditLogs(options) {
    const filters = options || {};
    const localRows = getCachedCollection('auditLogs').filter((row) => {
      const byType = !filters.entityType || row.entity_type === filters.entityType;
      const byId = !filters.entityId || row.entity_id === filters.entityId;
      return byType && byId;
    });
    const mode = loadConfig().mode;
    if (mode === 'local') return localRows;
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return localRows;
    const params = new URLSearchParams();
    if (filters.entityType) params.set('entityType', filters.entityType);
    if (filters.entityId) params.set('entityId', filters.entityId);
    if (filters.limit) params.set('limit', String(filters.limit));
    try {
      const payload = await request(ENDPOINTS.auditLogs + (params.toString() ? '?' + params.toString() : ''));
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      if (!filters.entityType && !filters.entityId) writeLocalRows('auditLogs', rows);
      return rows;
    } catch (_error) {
      return localRows;
    }
  }

  function normalizeLinkEntry(entry) {
    return {
      id: entry?.id || `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      funnel_id: entry?.funnel_id || entry?.funnelId || null,
      order_id: entry?.order_id || entry?.orderId || null,
      order_no: entry?.order_no || entry?.orderNo || null,
      link_type: entry?.link_type || entry?.linkType || 'link',
      linked_by: entry?.linked_by || entry?.actorName || entry?.actor_name || 'system',
      linked_at: entry?.linked_at || entry?.linkedAt || new Date().toISOString(),
      funnel_name: entry?.funnel_name || entry?.funnelName || null,
      order_name: entry?.order_name || entry?.orderName || null,
      note: entry?.note || null,
    };
  }

  function getOrderNumber(row) {
    return row?.po_number || row?.po || row?.order_no || row?.nomor_po || row?.no_po || row?.id || '';
  }

  function syncRelationLocally(linkPayload) {
    const normalized = normalizeLinkEntry(linkPayload);
    const links = getCachedCollection('links');
    const nextLinks = [normalized, ...links.filter((row) => getRowIdentity('links', row, 0) !== getRowIdentity('links', normalized, 0))];
    writeLocalRows('links', nextLinks);

    const funnels = getCachedCollection('funnels').map((row) => {
      if (row?.id !== normalized.funnel_id) return row;
      const relatedOrders = Array.isArray(row.relatedOrders) ? row.relatedOrders.filter((item) => String(item.orderNo || item.order_no || '') !== normalized.order_no) : [];
      relatedOrders.unshift({
        orderNo: normalized.order_no,
        orderId: normalized.order_id,
        linkType: normalized.link_type,
        linkedAt: normalized.linked_at,
        linkedBy: normalized.linked_by,
      });
      return {
        ...row,
        relatedOrders,
        converted: true,
        convertedOrderNo: normalized.order_no,
        status: 'Closed Won',
        stage: 'Menang / Deal',
        lastUpdate: new Date().toISOString(),
      };
    });
    writeLocalRows('funnels', funnels);

    const funnel = funnels.find((row) => row?.id === normalized.funnel_id) || {};
    const orders = getCachedCollection('orders').map((row) => {
      if (String(getOrderNumber(row)).trim().toLowerCase() !== String(normalized.order_no || '').trim().toLowerCase()) return row;
      const funnelLinks = Array.isArray(row.funnel_links) ? row.funnel_links.filter((item) => String(item.funnelId || item.funnel_id || '') !== normalized.funnel_id) : [];
      funnelLinks.unshift({
        funnelId: normalized.funnel_id,
        funnelName: normalized.funnel_name || funnel.namaPengadaan || funnel.nama_pengadaan || null,
        linkType: normalized.link_type,
        linkedAt: normalized.linked_at,
        linkedBy: normalized.linked_by,
      });
      return {
        ...row,
        funnel_id: normalized.funnel_id,
        source_funnel_id: normalized.funnel_id,
        source_funnel_code: normalized.funnel_id,
        source_funnel_name: normalized.funnel_name || funnel.namaPengadaan || funnel.nama_pengadaan || null,
        funnel_links: funnelLinks,
        last_update_at: new Date().toISOString(),
      };
    });
    writeLocalRows('orders', orders);
    return normalized;
  }

  async function getFunnelOrderLinks(options) {
    const filters = options || {};
    const localRows = getCachedCollection('links').filter((row) => {
      const byFunnel = !filters.funnelId || row.funnel_id === filters.funnelId;
      const byOrder = !filters.orderNo || row.order_no === filters.orderNo;
      return byFunnel && byOrder;
    });
    const mode = loadConfig().mode;
    if (mode === 'local') return localRows;
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return localRows;
    const params = new URLSearchParams();
    if (filters.funnelId) params.set('funnelId', filters.funnelId);
    if (filters.orderNo) params.set('orderNo', filters.orderNo);
    try {
      const payload = await request(ENDPOINTS.links + (params.toString() ? '?' + params.toString() : ''));
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      if (!filters.funnelId && !filters.orderNo) writeLocalRows('links', rows);
      return rows;
    } catch (_error) {
      return localRows;
    }
  }

  async function linkFunnelOrder(payload) {
    const normalized = syncRelationLocally(payload);
    appendAuditLogLocal({
      entityType: 'funnel',
      entityId: normalized.funnel_id,
      actionType: 'link_order',
      actorName: normalized.linked_by,
      summary: `Funnel ${normalized.funnel_id} ditautkan ke order ${normalized.order_no}`,
      snapshot: normalized,
    });
    appendAuditLogLocal({
      entityType: 'order',
      entityId: normalized.order_id || normalized.order_no,
      actionType: 'link_funnel',
      actorName: normalized.linked_by,
      summary: `Order ${normalized.order_no} ditautkan ke funnel ${normalized.funnel_id}`,
      snapshot: normalized,
    });

    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local', data: normalized };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local', data: normalized };
    const response = await request(ENDPOINTS.links, { method: 'POST', body: JSON.stringify(payload) });
    return { ok: true, source: 'api', data: response?.data || normalized };
  }


  function readMasterBootstrapCache() {
    return safeJsonParse(localStorage.getItem('ds_master_bootstrap_cache'), null) || {};
  }

  function writeMasterBootstrapCache(data) {
    localStorage.setItem('ds_master_bootstrap_cache', JSON.stringify(data || {}));
    return data;
  }

  function upsertBootstrapEntity(entityKey, row) {
    const bootstrap = readMasterBootstrapCache();
    const current = Array.isArray(bootstrap[entityKey]) ? bootstrap[entityKey] : [];
    const identity = String(row?.id || `${entityKey}-${Date.now()}`).trim();
    const nextRow = { ...(row || {}), id: identity };
    bootstrap[entityKey] = [nextRow].concat(current.filter((item) => String(item?.id || '') !== identity));
    writeMasterBootstrapCache(bootstrap);
    return nextRow;
  }

  function deleteBootstrapEntity(entityKey, id) {
    const bootstrap = readMasterBootstrapCache();
    const current = Array.isArray(bootstrap[entityKey]) ? bootstrap[entityKey] : [];
    bootstrap[entityKey] = current.filter((item) => String(item?.id || '') !== String(id || ''));
    writeMasterBootstrapCache(bootstrap);
  }

  async function getMastersBootstrap(options) {
    const fallback = readMasterBootstrapCache();
    const mode = loadConfig().mode;
    if (mode === 'local') return fallback || { locations: getLocalRows('masters') };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return fallback || { locations: getLocalRows('masters') };
    try {
      const payload = await request('/masters/bootstrap');
      const data = payload?.data || {};
      writeMasterBootstrapCache(data);
      if (Array.isArray(data.locations)) writeLocalRows('masters', data.locations);
      if (!options?.silent) emit('masters:bootstrap', { source: 'api', data: data });
      return data;
    } catch (_error) {
      return fallback || { locations: getLocalRows('masters') };
    }
  }

  async function upsertMasterLocation(row) {
    const current = getLocalRows('masters');
    const id = String(row?.id || `LOC-${Date.now()}`);
    const normalized = {
      id,
      wilayah: String(row?.wilayah || '').trim(),
      kabkota: String(row?.kabkota || row?.kabupatenKota || row?.kabupaten_kota || '').trim(),
      instansi: String(row?.instansi || '').trim(),
      satker: String(row?.satker || '').trim(),
      is_active: row?.is_active === 0 ? 0 : 1,
    };
    const next = [normalized].concat(current.filter((item) => String(item?.id || '') !== id));
    writeLocalRows('masters', next);
    localStorage.removeItem('ds_master_bootstrap_cache');
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local', data: normalized };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local', data: normalized };
    const payload = await request('/masters/locations', { method: 'POST', body: JSON.stringify(normalized) });
    localStorage.removeItem('ds_master_bootstrap_cache');
    return { ok: true, source: 'api', data: payload?.data || normalized };
  }

  async function deleteMasterLocation(locationId) {
    const next = getLocalRows('masters').filter((item) => String(item?.id || '') !== String(locationId || ''));
    writeLocalRows('masters', next);
    localStorage.removeItem('ds_master_bootstrap_cache');
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local' };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local' };
    await request('/masters/locations/' + encodeURIComponent(locationId), { method: 'DELETE' });
    localStorage.removeItem('ds_master_bootstrap_cache');
    return { ok: true, source: 'api' };
  }

  async function upsertMasterPrincipal(row) {
    const cached = upsertBootstrapEntity('principals', row || {});
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local', data: cached };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local', data: row };
    const payload = await request('/masters/principals', { method: 'POST', body: JSON.stringify(row || {}) });
    localStorage.removeItem('ds_master_bootstrap_cache');
    return { ok: true, source: 'api', data: payload?.data || row };
  }

  async function deleteMasterPrincipal(principalId) {
    deleteBootstrapEntity('principals', principalId);
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local' };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local' };
    await request('/masters/principals/' + encodeURIComponent(principalId), { method: 'DELETE' });
    localStorage.removeItem('ds_master_bootstrap_cache');
    return { ok: true, source: 'api' };
  }

  async function upsertMasterOwner(row) {
    const cached = upsertBootstrapEntity('owners', row || {});
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local', data: cached };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local', data: row };
    const payload = await request('/masters/owners', { method: 'POST', body: JSON.stringify(row || {}) });
    localStorage.removeItem('ds_master_bootstrap_cache');
    return { ok: true, source: 'api', data: payload?.data || row };
  }

  async function deleteMasterOwner(ownerId) {
    deleteBootstrapEntity('owners', ownerId);
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local' };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local' };
    await request('/masters/owners/' + encodeURIComponent(ownerId), { method: 'DELETE' });
    localStorage.removeItem('ds_master_bootstrap_cache');
    return { ok: true, source: 'api' };
  }

  async function upsertMasterPartner(row) {
    const cached = upsertBootstrapEntity('partners', row || {});
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local', data: cached };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local', data: row };
    const payload = await request('/masters/partners', { method: 'POST', body: JSON.stringify(row || {}) });
    localStorage.removeItem('ds_master_bootstrap_cache');
    return { ok: true, source: 'api', data: payload?.data || row };
  }

  async function deleteMasterPartner(partnerId) {
    deleteBootstrapEntity('partners', partnerId);
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local' };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local' };
    await request('/masters/partners/' + encodeURIComponent(partnerId), { method: 'DELETE' });
    localStorage.removeItem('ds_master_bootstrap_cache');
    return { ok: true, source: 'api' };
  }

  async function checkDuplicates(entityType, row) {
    const localReport = checkDuplicatesLocal(entityType, row);
    const mode = loadConfig().mode;
    if (mode === 'local') return localReport;
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return localReport;
    try {
      const payload = await request(ENDPOINTS.duplicates, {
        method: 'POST',
        body: JSON.stringify({ entityType: entityType, row: row }),
      });
      return payload?.data || localReport;
    } catch (_error) {
      return localReport;
    }
  }




  async function validateMasterEntity(type, row) {
    const normalizer = window.DataSystemMasterNormalizer || null;
    const bootstrap = readMasterBootstrapCache();
    const localReport = normalizer?.checkMasterDuplicate?.(type, row, bootstrap) || { decision: 'ok', matches: [] };
    const mode = loadConfig().mode;
    if (mode === 'local') return localReport;
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return localReport;
    try {
      const payload = await request('/masters/validate', { method: 'POST', body: JSON.stringify({ type: type, row: row }) });
      return payload?.data || localReport;
    } catch (_error) {
      return localReport;
    }
  }

  async function deleteOne(type, identityValue) {
    const entity = normalizeType(type);
    const current = getCachedCollection(entity);
    const nextRows = current.filter(function (item, index) {
      return getRowIdentity(entity, item, index) !== String(identityValue || '').trim().toLowerCase();
    });
    writeLocalRows(entity, nextRows);
    const mode = loadConfig().mode;
    if (mode === 'local') return { ok: true, source: 'local' };
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return { ok: true, source: 'local' };
    const endpoint = ENDPOINTS[entity];
    if (!endpoint) return { ok: true, source: 'local' };
    try {
      await request(endpoint + '/' + encodeURIComponent(identityValue), { method: 'DELETE' });
      return { ok: true, source: 'api' };
    } catch (_error) {
      return { ok: true, source: 'local' };
    }
  }

  function getStatusLabel() {
    const auth = loadAuth();
    if (state.config.mode === 'local') return 'Local Mode';
    if (state.availability === 'online') return auth?.user?.username ? 'API • ' + auth.user.username : 'API Mode';
    if (state.availability === 'error') return 'API Error';
    if (state.availability === 'offline') return 'Fallback Local';
    return 'Mode Auto';
  }

  function getStatusClass() {
    if (state.config.mode === 'local') return 'local';
    if (state.availability === 'online') return 'online';
    if (state.availability === 'error') return 'error';
    if (state.availability === 'offline') return 'offline';
    return 'pending';
  }

  function ensureIndicator() {
    let indicator = document.getElementById('ds-data-source-indicator');
    if (indicator) return indicator;
    indicator = document.createElement('button');
    indicator.type = 'button';
    indicator.id = 'ds-data-source-indicator';
    indicator.className = 'ds-data-source-indicator';
    indicator.title = 'Klik untuk ganti mode data';
    indicator.addEventListener('click', function () {
      const nextMode = state.config.mode === 'auto' ? 'local' : state.config.mode === 'local' ? 'api' : 'auto';
      saveConfig({ mode: nextMode });
      ping();
      (window.DataSystemFeedback?.toast || window.alert)('Mode data diubah ke: ' + nextMode.toUpperCase() + '. Refresh halaman bila perlu.', 'info');
    });
    document.body.appendChild(indicator);
    return indicator;
  }

  function renderIndicator() {
    if (!document.body) return;
    const indicator = ensureIndicator();
    indicator.className = 'ds-data-source-indicator ' + getStatusClass();
    indicator.innerHTML = '<span class="dot"></span><span>' + getStatusLabel() + '</span>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderIndicator();
    ping();
  });

  const style = document.createElement('style');
  style.textContent = '\n.ds-data-source-indicator{position:fixed;right:18px;bottom:18px;z-index:1080;display:inline-flex;align-items:center;gap:.55rem;padding:.65rem .9rem;border-radius:999px;border:1px solid rgba(0,0,0,.08);font-size:.78rem;font-weight:700;box-shadow:0 10px 25px rgba(15,23,42,.16);background:rgba(255,255,255,.92);color:#0f172a;backdrop-filter:blur(8px)}\n.ds-data-source-indicator .dot{width:9px;height:9px;border-radius:999px;background:currentColor;display:inline-block;opacity:.9}\n.ds-data-source-indicator.online{background:#e8f5ff;color:#0f5ec7;border-color:#93c5fd}\n.ds-data-source-indicator.local{background:#fff7ed;color:#b45309;border-color:#fdba74}\n.ds-data-source-indicator.offline,.ds-data-source-indicator.pending{background:#f8fafc;color:#475569;border-color:#cbd5e1}\n.ds-data-source-indicator.error{background:#fef2f2;color:#b91c1c;border-color:#fca5a5}\nhtml[data-theme="dark"] .ds-data-source-indicator{background:rgba(15,23,42,.92);color:#e2e8f0;border-color:rgba(148,163,184,.3)}\nhtml[data-theme="dark"] .ds-data-source-indicator.online{background:#0f2748;color:#93c5fd;border-color:#1d4ed8}\nhtml[data-theme="dark"] .ds-data-source-indicator.local{background:#3b2506;color:#fdba74;border-color:#b45309}\nhtml[data-theme="dark"] .ds-data-source-indicator.offline,html[data-theme="dark"] .ds-data-source-indicator.pending{background:#111827;color:#cbd5e1;border-color:#334155}\nhtml[data-theme="dark"] .ds-data-source-indicator.error{background:#3f1317;color:#fca5a5;border-color:#991b1b}\n';
  document.head.appendChild(style);


  async function login(username, password) {
    const payload = await request(ENDPOINTS.authLogin, {
      method: 'POST',
      body: JSON.stringify({ username: username, password: password }),
    });
    const session = payload?.data || {};
    saveAuth(session);
    if (session?.permissions) savePermissions(session.permissions);
    return session;
  }

  async function me() {
    const payload = await request(ENDPOINTS.authMe);
    const session = payload?.data || {};
    const current = loadAuth();
    saveAuth({ ...current, ...session, token: current?.token || session?.token });
    if (session?.permissions) savePermissions(session.permissions);
    return session;
  }

  async function logout() {
    try {
      await request(ENDPOINTS.authLogout, { method: 'POST' });
    } catch (_error) {}
    clearAuth();
    return { logged_out: true };
  }


  async function getPermissions() {
    const mode = loadConfig().mode;
    if (mode === 'local') return loadPermissions() || null;
    const apiAvailable = await ping();
    if (!apiAvailable && mode !== 'api') return loadPermissions() || null;
    const payload = await request(ENDPOINTS.authPermissions);
    const permissions = payload?.data || null;
    if (permissions) savePermissions(permissions);
    return permissions;
  }

  async function exportServerBackup() {
    const payload = await request(ENDPOINTS.systemBackup);
    return payload?.data || null;
  }

  async function restoreServerBackup(bundle, options) {
    const opts = options || {};
    const payload = await request(ENDPOINTS.systemRestore, {
      method: 'POST',
      body: JSON.stringify({ bundle: bundle, mode: opts.mode || 'replace' }),
    });
    return payload?.data || null;
  }

  async function getImportTemplate(target) {
    const key = String(target || '').trim().toLowerCase();
    if (!key) throw new Error('Target template tidak dikenali.');
    const payload = await request(ENDPOINTS.importTemplates + '/' + encodeURIComponent(key));
    return payload?.data || null;
  }

  async function importRows(target, rows, options) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const opts = options || {};
    let endpoint = null;
    if (target === 'orders') endpoint = ENDPOINTS.importOrders;
    else if (target === 'funnels') endpoint = ENDPOINTS.importFunnels;
    else if (['locations', 'principals', 'partners', 'owners'].includes(String(target || '').trim().toLowerCase())) endpoint = '/import/masters/' + String(target || '').trim().toLowerCase();
    if (!endpoint) throw new Error('Target import tidak dikenali.');
    const payload = await request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ rows: safeRows, dryRun: Boolean(opts.dryRun) }),
    });
    return payload?.data || null;
  }

  function getRuntimeStatus() {
    return {
      config: { ...loadConfig() },
      availability: state.availability,
      health: state.health ? { ...state.health } : null,
      auth: loadAuth() || null,
      permissions: loadPermissions() || null,
    };
  }

  async function exportBackupBundle(options) {
    const opts = options || {};
    const refresh = opts.refresh !== false;
    if (refresh) {
      await ping();
      await Promise.allSettled([
        refreshCollection('funnels', { silent: true }),
        refreshCollection('orders', { silent: true }),
        refreshCollection('orderDrafts', { silent: true }),
        refreshCollection('orderIssues', { silent: true }),
        refreshCollection('savedViews', { silent: true }),
        getFunnelOrderLinks({}),
        getAuditLogs({ limit: 200 }),
        getMastersBootstrap({ silent: true }),
      ]);
    }
    const bootstrap = await getMastersBootstrap({ silent: true });
    return {
      schema_version: 'sprint5-step4',
      exported_at: new Date().toISOString(),
      source: getRuntimeStatus(),
      data: {
        funnels: getCachedCollection('funnels'),
        orders: getCachedCollection('orders'),
        orderDrafts: getCachedCollection('orderDrafts'),
        orderIssues: getCachedCollection('orderIssues'),
        savedViews: getCachedCollection('savedViews'),
        links: getCachedCollection('links'),
        auditLogs: getCachedCollection('auditLogs'),
        mastersBootstrap: bootstrap || readMasterBootstrapCache() || {},
      },
    };
  }

  async function syncMasterBootstrap(payload) {
    const incoming = payload || {};
    const current = await getMastersBootstrap({ silent: true });
    const nextLocations = Array.isArray(incoming.locations) ? incoming.locations : [];
    const nextPrincipals = Array.isArray(incoming.principals) ? incoming.principals : [];
    const nextOwners = Array.isArray(incoming.owners) ? incoming.owners : [];
    const nextPartners = Array.isArray(incoming.partners) ? incoming.partners : [];

    const deleteMissing = async function (list, nextList, deleter) {
      const nextIds = new Set((nextList || []).map(function (row) { return String(row?.id || '').trim(); }).filter(Boolean));
      for (const item of (list || [])) {
        const id = String(item?.id || '').trim();
        if (!id || nextIds.has(id)) continue;
        try { await deleter(id); } catch (_error) {}
      }
    };

    await deleteMissing(current?.locations, nextLocations, deleteMasterLocation);
    await deleteMissing(current?.principals, nextPrincipals, deleteMasterPrincipal);
    await deleteMissing(current?.owners, nextOwners, deleteMasterOwner);
    await deleteMissing(current?.partners, nextPartners, deleteMasterPartner);

    for (const row of nextLocations) await upsertMasterLocation(row);
    for (const row of nextPrincipals) await upsertMasterPrincipal(row);
    for (const row of nextOwners) await upsertMasterOwner(row);
    for (const row of nextPartners) await upsertMasterPartner(row);
    writeMasterBootstrapCache(incoming);
    if (Array.isArray(incoming.locations)) writeLocalRows('masters', incoming.locations);
    return incoming;
  }

  async function restoreBackupBundle(bundle, options) {
    const payload = bundle?.data ? bundle : { data: bundle || {} };
    const data = payload.data || {};
    const opts = { syncApi: true, ...(options || {}) };

    if (Array.isArray(data.funnels)) await replaceCollection('funnels', data.funnels);
    if (Array.isArray(data.orders)) await replaceCollection('orders', data.orders);

    if (Array.isArray(data.orderDrafts)) {
      writeLocalRows('orderDrafts', data.orderDrafts);
      if (opts.syncApi && state.config.mode !== 'local') {
        const current = await refreshCollection('orderDrafts', { silent: true });
        const nextIds = new Set(data.orderDrafts.map(function (row) { return String(row?.id || row?.draft_id || '').trim().toLowerCase(); }).filter(Boolean));
        for (const row of current) {
          const id = String(row?.id || row?.draft_id || '').trim();
          if (id && !nextIds.has(id.toLowerCase())) await deleteOne('orderDrafts', id);
        }
        for (const row of data.orderDrafts) await upsertOne('orderDrafts', row);
      }
    }

    if (Array.isArray(data.orderIssues)) {
      writeLocalRows('orderIssues', data.orderIssues);
      if (opts.syncApi && state.config.mode !== 'local') {
        const current = await refreshCollection('orderIssues', { silent: true });
        const nextIds = new Set(data.orderIssues.map(function (row) { return String(row?.id || row?.issue_id || '').trim().toLowerCase(); }).filter(Boolean));
        for (const row of current) {
          const id = String(row?.id || row?.issue_id || '').trim();
          if (id && !nextIds.has(id.toLowerCase())) await deleteOne('orderIssues', id);
        }
        for (const row of data.orderIssues) await upsertOne('orderIssues', row);
      }
    }

    if (Array.isArray(data.savedViews)) {
      writeLocalRows('savedViews', data.savedViews);
      if (opts.syncApi && state.config.mode !== 'local') {
        const current = await refreshCollection('savedViews', { silent: true });
        const nextIds = new Set(data.savedViews.map(function (row) { return String(row?.id || row?.view_id || '').trim().toLowerCase(); }).filter(Boolean));
        for (const row of current) {
          const id = String(row?.id || row?.view_id || '').trim();
          if (id && !nextIds.has(id.toLowerCase())) await deleteOne('savedViews', id);
        }
        for (const row of data.savedViews) await upsertOne('savedViews', row);
      }
    }

    if (Array.isArray(data.links)) {
      writeLocalRows('links', data.links);
      if (opts.syncApi && state.config.mode !== 'local') {
        for (const row of data.links) await linkFunnelOrder(row);
      }
    }

    if (Array.isArray(data.auditLogs)) {
      writeLocalRows('auditLogs', data.auditLogs);
    }

    if (data.mastersBootstrap && typeof data.mastersBootstrap === 'object') {
      writeMasterBootstrapCache(data.mastersBootstrap);
      if (Array.isArray(data.mastersBootstrap.locations)) writeLocalRows('masters', data.mastersBootstrap.locations);
      if (opts.syncApi && state.config.mode !== 'local') {
        await syncMasterBootstrap(data.mastersBootstrap);
      }
    }

    emit('backup:restored', { bundle: payload, options: opts });
    return { ok: true, restored_at: new Date().toISOString() };
  }

  window.DataSystemBridge = {
    loadConfig,
    saveConfig,
    subscribe,
    ping,
    getCachedCollection,
    setCachedCollection,
    refreshCollection,
    replaceCollection,
    upsertOne,
    deleteOne,
    getLocalRows,
    writeLocalRows,
    getAuditLogs,
    appendAuditLog: appendAuditLogLocal,
    getFunnelOrderLinks,
    linkFunnelOrder,
    checkDuplicates,
    getMastersBootstrap,
    upsertMasterLocation,
    deleteMasterLocation,
    upsertMasterPrincipal,
    deleteMasterPrincipal,
    upsertMasterOwner,
    deleteMasterOwner,
    upsertMasterPartner,
    deleteMasterPartner,
    validateMasterEntity,
    loadAuth,
    saveAuth,
    clearAuth,
    loadPermissions,
    savePermissions,
    clearPermissions,
    login,
    me,
    logout,
    getPermissions,
    getRuntimeStatus,
    exportServerBackup,
    restoreServerBackup,
    getImportTemplate,
    importRows,
    exportBackupBundle,
    restoreBackupBundle,
  };
})(window);
