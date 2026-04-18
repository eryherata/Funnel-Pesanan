(function (window, document) {
  'use strict';

  const bridge = () => window.DataSystemBridge || null;
  const feedback = () => window.DataSystemFeedback || null;
  const state = { modal: null };

  const BLOCKED_SELECTORS = [
    'a[href="input-pesanan.html"]',
    'a[href="funnel-input.html"]',
    '#btnOpenBulkUpdateModal',
    '#btnUpdateStatusFromDetail',
    '#btnSaveStatusUpdate',
    '#btn-add-principal',
    '#btn-add-mitra',
    '#btn-add-owner',
    '#btn-add-satker',
    '#btn-save-master-locations',
    '#save-draft-btn',
    '#save-data-btn',
    '#add-row-btn',
    '#btnSaveFunnelDraft',
    '#btnSaveFunnelOpen',
    '#btnConvertFromDetail',
    '.btn-edit-order',
    '.btn-update-order',
    '.btn-convert-funnel',
    '.btn-quick-update',
    '.btn-delete-order',
    '.btn-delete-issue',
    '.btn-resolve-issue',
    '.ops-order-action-btn',
    '[data-role-min="editor"]'
  ].join(',');

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function safeText(value, fallback) {
    const text = String(value || '').trim();
    return text || fallback;
  }

  function getRuntime() {
    return bridge()?.getRuntimeStatus?.() || { config: {}, availability: 'unknown', auth: {}, permissions: null, health: null };
  }

  function getAuth() {
    return bridge()?.loadAuth?.() || getRuntime().auth || {};
  }

  function getPermissions() {
    return bridge()?.loadPermissions?.() || getRuntime().permissions || null;
  }

  function roleRank(role) {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'admin') return 3;
    if (normalized === 'editor') return 2;
    return 1;
  }

  function getEffectiveRole() {
    const runtime = getRuntime();
    const userRole = String(runtime?.auth?.user?.role || '').trim().toLowerCase();
    if (userRole) return userRole;
    if (runtime?.availability === 'online' && runtime?.health?.auth_required) return 'viewer';
    return 'editor';
  }

  function isReadOnlyMode() {
    return roleRank(getEffectiveRole()) < roleRank('editor');
  }

  function can(moduleKey, action) {
    const permissions = getPermissions();
    if (permissions?.modules?.[moduleKey]?.[action] != null) return Boolean(permissions.modules[moduleKey][action]);
    return action === 'read' ? true : !isReadOnlyMode();
  }

  function updateAvatar() {
    const img = document.querySelector('.topbar-right img[alt="Profile"]');
    if (!img) return;
    const auth = getAuth();
    const name = safeText(auth?.user?.display_name || auth?.user?.username, 'Guest User');
    img.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=2c7be5&color=fff';
    img.alt = name;
    img.title = name;
  }

  function ensureBanner() {
    let banner = document.getElementById('ds-readonly-banner');
    if (banner) return banner;
    banner = el('div', 'ds-readonly-banner', '<i class="fa-solid fa-eye me-2"></i><span>Mode baca saja aktif. Login sebagai editor/admin untuk mengubah data.</span>');
    banner.id = 'ds-readonly-banner';
    document.body.appendChild(banner);
    return banner;
  }

  function toggleFormReadOnly(readOnly) {
    if (!(location.pathname.endsWith('input-pesanan.html') || location.pathname.endsWith('funnel-input.html'))) return;
    document.querySelectorAll('input, select, textarea, button').forEach(function (node) {
      if (node.closest('#ds-auth-modal')) return;
      if (node.id === 'themeToggle') return;
      if (node.closest('.topbar-right')) return;
      const isWriteButton = node.matches('#save-draft-btn, #save-data-btn, #add-row-btn, #btnSaveFunnelDraft, #btnSaveFunnelOpen');
      if (readOnly) {
        if (isWriteButton || ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName)) {
          node.disabled = true;
          node.dataset.roleDisabled = 'true';
          node.classList.add('ds-role-disabled');
        }
      } else if (node.dataset.roleDisabled === 'true') {
        node.disabled = false;
        node.classList.remove('ds-role-disabled');
        delete node.dataset.roleDisabled;
      }
    });
  }

  function applyPermissionState() {
    const readOnly = isReadOnlyMode();
    document.documentElement.setAttribute('data-ds-role', getEffectiveRole());
    ensureBanner().style.display = readOnly ? 'flex' : 'none';
    toggleFormReadOnly(readOnly);

    document.querySelectorAll(BLOCKED_SELECTORS).forEach(function (node) {
      if (readOnly) {
        node.classList.add('ds-role-disabled');
        node.setAttribute('aria-disabled', 'true');
        node.setAttribute('title', 'Butuh role editor/admin');
        if (node.tagName === 'BUTTON') node.disabled = true;
      } else {
        node.classList.remove('ds-role-disabled');
        node.removeAttribute('aria-disabled');
        if (node.tagName === 'BUTTON' && node.dataset.roleDisabled !== 'true') node.disabled = false;
      }
    });
  }

  function ensureTopbarButton() {
    const topbar = document.querySelector('.topbar-right');
    if (!topbar) return null;
    let btn = document.getElementById('ds-auth-trigger');
    if (btn) return btn;
    btn = el('button', 'btn btn-outline-primary btn-sm ds-auth-trigger', '<i class="fa-solid fa-user-shield me-2"></i><span>Auth</span>');
    btn.id = 'ds-auth-trigger';
    btn.type = 'button';
    btn.addEventListener('click', function () {
      const modal = ensureModal();
      renderAuthState();
      if (window.bootstrap?.Modal) {
        state.modal = state.modal || new bootstrap.Modal(modal);
        state.modal.show();
      } else {
        modal.style.display = 'block';
      }
    });
    const profileImg = topbar.querySelector('img[alt="Profile"]');
    topbar.insertBefore(btn, profileImg || null);
    return btn;
  }

  function ensureModal() {
    let modal = document.getElementById('ds-auth-modal');
    if (modal) return modal;
    modal = el('div', 'modal fade');
    modal.id = 'ds-auth-modal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = [
      '<div class="modal-dialog modal-dialog-centered modal-lg">',
      '  <div class="modal-content">',
      '    <div class="modal-header">',
      '      <h5 class="modal-title"><i class="fa-solid fa-user-shield me-2 text-primary"></i>Auth & Permission</h5>',
      '      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>',
      '    </div>',
      '    <div class="modal-body">',
      '      <div id="ds-auth-alert" class="alert alert-info border border-info-subtle py-2 mb-3">Memuat status koneksi...</div>',
      '      <div class="row g-3 mb-3">',
      '        <div class="col-md-6"><label class="form-label">Mode Data</label><select class="form-select" id="ds-auth-mode"><option value="auto">Auto</option><option value="local">Local</option><option value="api">API</option></select></div>',
      '        <div class="col-md-6"><label class="form-label">Base URL API</label><input class="form-control" id="ds-auth-api-base" placeholder="http://localhost:3000/api"></div>',
      '      </div>',
      '      <div class="d-grid gap-2 mb-3"><button type="button" class="btn btn-outline-primary" id="ds-auth-save-config"><i class="fa-solid fa-plug-circle-check me-2"></i>Simpan Konfigurasi Koneksi</button></div>',
      '      <div class="ds-auth-user-box mb-3">',
      '        <div class="small text-muted mb-1">Sesi aktif</div>',
      '        <div class="fw-semibold" id="ds-auth-user-name">Guest</div>',
      '        <div class="small text-muted" id="ds-auth-user-role">Role: viewer</div>',
      '      </div>',
      '      <div class="ds-auth-user-box mb-3">',
      '        <div class="small text-muted mb-2">Role matrix per modul</div>',
      '        <div class="d-flex flex-wrap gap-2" id="ds-auth-permission-chips"></div>',
      '      </div>',
      '      <form id="ds-auth-login-form">',
      '        <div class="row g-3">',
      '          <div class="col-md-6"><label class="form-label">Username</label><input class="form-control" id="ds-auth-username" autocomplete="username" placeholder="admin"></div>',
      '          <div class="col-md-6"><label class="form-label">Password</label><input type="password" class="form-control" id="ds-auth-password" autocomplete="current-password" placeholder="••••••••"></div>',
      '        </div>',
      '        <div class="small text-muted mt-2">Akun default: admin/admin123, opslead/ops12345, viewer/viewer123</div>',
      '      </form>',
      '    </div>',
      '    <div class="modal-footer">',
      '      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Tutup</button>',
      '      <button type="button" class="btn btn-outline-danger d-none" id="ds-auth-logout"><i class="fa-solid fa-right-from-bracket me-2"></i>Logout</button>',
      '      <button type="button" class="btn btn-primary" id="ds-auth-login"><i class="fa-solid fa-right-to-bracket me-2"></i>Login</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);

    modal.querySelector('#ds-auth-save-config').addEventListener('click', async function () {
      const config = bridge()?.saveConfig?.({
        mode: modal.querySelector('#ds-auth-mode').value,
        apiBaseUrl: modal.querySelector('#ds-auth-api-base').value.trim() || 'http://localhost:3000/api'
      });
      await bridge()?.ping?.();
      try { if (getAuth()?.token) await bridge()?.getPermissions?.(); } catch (_error) {}
      renderAuthState();
      feedback()?.toast?.('Konfigurasi koneksi disimpan ke mode ' + String(config?.mode || 'auto').toUpperCase() + '.', 'success');
    });

    modal.querySelector('#ds-auth-login').addEventListener('click', async function () {
      const username = modal.querySelector('#ds-auth-username').value.trim();
      const password = modal.querySelector('#ds-auth-password').value;
      if (!username || !password) return feedback()?.alert?.('Username dan password wajib diisi.', { title: 'Login belum lengkap', variant: 'warning' });
      try {
        await bridge()?.login?.(username, password);
        await bridge()?.ping?.();
        try { await bridge()?.me?.(); } catch (_error) {}
        try { await bridge()?.getPermissions?.(); } catch (_error) {}
        renderAuthState();
        applyPermissionState();
      } catch (error) {
        feedback()?.alert?.(error?.message || 'Login gagal.', { title: 'Login gagal', variant: 'danger' });
      }
    });

    modal.querySelector('#ds-auth-logout').addEventListener('click', async function () {
      await bridge()?.logout?.();
      await bridge()?.ping?.();
      renderAuthState();
      applyPermissionState();
    });

    modal.addEventListener('hidden.bs.modal', function () {
      modal.querySelector('#ds-auth-password').value = '';
    });

    return modal;
  }

  function renderPermissionChips(container) {
    const permissions = getPermissions();
    const modules = permissions?.modules || {};
    container.innerHTML = Object.keys(modules).map(function (moduleKey) {
      const actions = Object.keys(modules[moduleKey] || {}).filter(function (action) { return modules[moduleKey][action]; });
      return '<span class="badge rounded-pill text-bg-light border">' + moduleKey + ': ' + (actions.join(', ') || '-') + '</span>';
    }).join('') || '<span class="small text-muted">Permission matrix akan tampil setelah login ke API.</span>';
  }

  function renderAuthState() {
    const runtime = getRuntime();
    const auth = getAuth();
    const btn = ensureTopbarButton();
    const modal = ensureModal();
    updateAvatar();

    const userName = safeText(auth?.user?.display_name || auth?.user?.username, 'Guest / Belum Login');
    const role = safeText(getEffectiveRole(), 'viewer');
    const availabilityLabel = runtime?.availability === 'online' ? 'API online' : runtime?.availability === 'local' ? 'Local mode' : runtime?.availability === 'offline' ? 'Fallback local' : 'Belum terhubung';
    const authRequired = Boolean(runtime?.health?.auth_required);

    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-user-shield me-2"></i><span>' + userName.split(' ')[0] + ' • ' + role + '</span>';
      btn.classList.toggle('btn-outline-warning', isReadOnlyMode());
      btn.classList.toggle('btn-outline-primary', !isReadOnlyMode());
    }

    modal.querySelector('#ds-auth-alert').className = 'alert ' + (isReadOnlyMode() ? 'alert-warning' : 'alert-info') + ' border py-2 mb-3';
    modal.querySelector('#ds-auth-alert').innerHTML = '<div class="fw-semibold mb-1">' + availabilityLabel + '</div><div class="small">Auth required: ' + (authRequired ? 'Ya' : 'Tidak') + ' • Effective role: ' + role + '</div>';
    modal.querySelector('#ds-auth-user-name').textContent = userName;
    modal.querySelector('#ds-auth-user-role').textContent = 'Role efektif: ' + role;
    modal.querySelector('#ds-auth-mode').value = runtime?.config?.mode || 'auto';
    modal.querySelector('#ds-auth-api-base').value = runtime?.config?.apiBaseUrl || 'http://localhost:3000/api';
    modal.querySelector('#ds-auth-logout').classList.toggle('d-none', !auth?.token);
    modal.querySelector('#ds-auth-login').innerHTML = auth?.token ? '<i class="fa-solid fa-rotate me-2"></i>Refresh Sesi' : '<i class="fa-solid fa-right-to-bracket me-2"></i>Login';
    renderPermissionChips(modal.querySelector('#ds-auth-permission-chips'));
  }

  async function bootstrapAuthUi() {
    ensureTopbarButton();
    ensureModal();
    try {
      await bridge()?.ping?.();
      if (getAuth()?.token) {
        try { await bridge()?.me?.(); } catch (_error) { bridge()?.clearAuth?.(); }
        try { await bridge()?.getPermissions?.(); } catch (_error) {}
      }
    } catch (_error) {}
    renderAuthState();
    applyPermissionState();
  }

  const style = document.createElement('style');
  style.textContent = [
    '.ds-auth-trigger{white-space:nowrap;border-radius:999px;font-weight:700}',
    '.ds-readonly-banner{position:fixed;left:18px;bottom:18px;z-index:1075;display:none;align-items:center;gap:.5rem;padding:.7rem 1rem;border-radius:14px;background:rgba(254,243,199,.96);color:#92400e;border:1px solid #f59e0b;box-shadow:0 10px 25px rgba(15,23,42,.16)}',
    '.ds-role-disabled{opacity:.55 !important;cursor:not-allowed !important}',
    'html[data-theme="dark"] .ds-readonly-banner{background:rgba(69,26,3,.96);color:#fed7aa;border-color:#fb923c}',
    '.ds-auth-user-box{padding:.85rem 1rem;border:1px solid var(--border-color, #dbe4f0);border-radius:1rem;background:var(--bg-surface, #f8fafc)}',
    '#ds-auth-modal .modal-content{border-radius:1.2rem}',
    'html[data-theme="dark"] #ds-auth-modal .ds-auth-user-box{background:rgba(15,23,42,.55)}',
    '.ds-auth-user-box .badge{font-weight:600}'
  ].join('');
  document.head.appendChild(style);

  document.addEventListener('ds:bridge:auth', function () { renderAuthState(); applyPermissionState(); });
  document.addEventListener('ds:bridge:permissions', function () { renderAuthState(); applyPermissionState(); });
  document.addEventListener('ds:bridge:health', function () { renderAuthState(); applyPermissionState(); });
  document.addEventListener('click', function (event) {
    const permissionNode = event.target.closest('[data-permission-module][data-permission-action]');
    if (permissionNode && !can(permissionNode.dataset.permissionModule, permissionNode.dataset.permissionAction || 'read')) {
      event.preventDefault();
      event.stopPropagation();
      feedback()?.alert?.('Role saat ini belum punya izin untuk aksi ' + permissionNode.dataset.permissionAction + ' pada modul ' + permissionNode.dataset.permissionModule + '.', { title: 'Akses ditolak', variant: 'warning' });
      return;
    }
    if (!isReadOnlyMode()) return;
    const blocked = event.target.closest(BLOCKED_SELECTORS);
    if (!blocked || blocked.closest('#ds-auth-modal')) return;
    event.preventDefault();
    event.stopPropagation();
    feedback()?.alert?.('Mode baca saja aktif. Login sebagai editor/admin untuk melakukan perubahan.', { title: 'Mode baca saja', variant: 'warning' });
  }, true);

  document.addEventListener('DOMContentLoaded', bootstrapAuthUi);

  window.DataSystemAuthUi = { renderAuthState, applyPermissionState, bootstrapAuthUi, can };
})(window, document);
