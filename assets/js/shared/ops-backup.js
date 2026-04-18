(function (window, document) {
  'use strict';

  const bridge = () => window.DataSystemBridge || null;
  const feedback = () => window.DataSystemFeedback || null;
  const masterData = () => window.DataSystemMasterData || null;

  function isPage(name) {
    return (location.pathname.split('/').pop() || '').toLowerCase() === name.toLowerCase();
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function toCsv(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const keys = Array.from(list.reduce(function (set, row) {
      Object.keys(row || {}).forEach(function (key) {
        if (typeof row[key] !== 'object') set.add(key);
      });
      return set;
    }, new Set()));
    const escapeCell = function (value) {
      const text = String(value == null ? '' : value);
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const lines = [keys.map(escapeCell).join(',')];
    list.forEach(function (row) {
      lines.push(keys.map(function (key) { return escapeCell(row?.[key]); }).join(','));
    });
    return '\ufeff' + lines.join('\n');
  }

  async function exportOrdersCsv() {
    const rows = await bridge()?.refreshCollection?.('orders', { silent: true }) || bridge()?.getCachedCollection?.('orders') || [];
    downloadBlob('orders-export-' + new Date().toISOString().slice(0, 10) + '.csv', new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    feedback()?.toast?.('Export CSV pesanan berhasil dibuat.', 'success');
  }

  async function exportBackupJson() {
    const bundle = await bridge()?.exportBackupBundle?.({ refresh: true });
    if (!bundle) {
      feedback()?.alert?.('Gagal membuat backup.', { title: 'Backup gagal', variant: 'danger' });
      return;
    }
    downloadBlob('pantauan-pesanan-backup-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json', new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
    feedback()?.toast?.('Backup JSON berhasil diunduh.', 'success');
  }

  async function exportAllMasterCsv() {
    const service = masterData();
    const entities = [
      { entity: 'principals', label: 'Principal' },
      { entity: 'partners', label: 'Mitra' },
      { entity: 'owners', label: 'Owner' },
      { entity: 'locations', label: 'Lokasi' }
    ];
    const available = entities.map(function (item) {
      return { ...item, rows: service?.getExportRows?.(item.entity) || [] };
    }).filter(function (item) { return item.rows.length; });
    if (!available.length) {
      feedback()?.alert?.('Belum ada data master yang bisa diexport.', { title: 'Export belum tersedia', variant: 'warning' });
      return;
    }
    available.forEach(function (item, index) {
      window.setTimeout(function () {
        const filename = 'master-' + item.entity + '-' + new Date().toISOString().slice(0, 10) + '.csv';
        downloadBlob(filename, new Blob([toCsv(item.rows)], { type: 'text/csv;charset=utf-8' }));
      }, index * 180);
    });
    feedback()?.toast?.('Export semua master dimulai untuk ' + available.length + ' entitas.', 'success');
  }

  async function restoreBackupFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const proceed = await feedback()?.confirm?.('Restore backup akan menimpa cache lokal aktif. Lanjutkan?', {
        title: 'Restore backup lokal',
        variant: 'warning',
        confirmText: 'Ya, restore',
        cancelText: 'Batal'
      });
      if (!proceed) return;
      await bridge()?.restoreBackupBundle?.(payload, { syncApi: true });
      feedback()?.toast?.('Backup berhasil di-restore. Halaman akan dimuat ulang.', 'success', { delay: 2500 });
      setTimeout(function () { window.DataSystemNavigation?.reloadPage?.() || window.location.reload(); }, 700);
    } catch (error) {
      console.error('[ops-backup restore]', error);
      feedback()?.alert?.('File backup tidak valid atau gagal diproses.', { title: 'Restore gagal', variant: 'danger' });
    }
  }

  function ensureHiddenFileInput(id, onChange) {
    let input = document.getElementById(id);
    if (input) return input;
    input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.id = id;
    input.hidden = true;
    input.addEventListener('change', function (event) {
      const file = event.target.files?.[0];
      onChange(file);
      event.target.value = '';
    });
    document.body.appendChild(input);
    return input;
  }

  function getMasterStats() {
    const service = masterData();
    const entity = service?.getActiveTabEntity?.() || 'principals';
    const activeStats = service?.getEntityStats?.(entity) || { total: 0, active: 0, inactive: 0, withAlias: 0 };
    return {
      active: activeStats,
      entities: {
        principals: service?.getEntityStats?.('principals') || { total: 0 },
        partners: service?.getEntityStats?.('partners') || { total: 0 },
        owners: service?.getEntityStats?.('owners') || { total: 0 },
        locations: service?.getEntityStats?.('locations') || { total: 0 }
      }
    };
  }

  function getMasterContext() {
    const service = masterData();
    const entity = service?.getActiveTabEntity?.() || 'principals';
    return {
      entity,
      label: service?.getEntityLabel?.(entity) || 'Master',
      rows: service?.getExportRows?.(entity) || []
    };
  }

  function updateMasterToolLabels() {
    const context = getMasterContext();
    const stats = getMasterStats();
    const exportBtn = document.getElementById('btnMasterExportCsv');
    const importBtn = document.getElementById('btnMasterContextImport');
    const templateBtn = document.getElementById('btnMasterContextTemplate');
    const hint = document.getElementById('master-tool-context-hint');
    const badge = document.getElementById('master-active-context-badge');
    const search = document.getElementById('dsMasterInlineSearch');
    const searchLabel = document.getElementById('dsMasterInlineSearchLabel');
    const rowCount = document.getElementById('master-active-row-count');
    const activeCount = document.getElementById('master-active-active-count');
    const aliasCount = document.getElementById('master-active-alias-count');
    const coverageCount = document.getElementById('master-total-coverage-count');
    const saveModeBadge = document.getElementById('master-save-mode-badge');
    const searchStateBadge = document.getElementById('master-search-state-badge');
    const exportAllBtn = document.getElementById('btnMasterExportAllCsv');
    const totals = Object.values(stats.entities || {}).reduce(function (sum, item) { return sum + Number(item?.total || 0); }, 0);
    const searchKeyword = masterData()?.getSearchKeyword?.(context.entity) || search?.value || '';
    const saveModeMap = {
      principals: 'Autosave sel',
      partners: 'Autosave sel',
      owners: 'Autosave sel',
      locations: 'Simpan massal'
    };

    if (exportBtn) {
      exportBtn.innerHTML = '<i class="fa-solid fa-file-export me-2"></i>Export ' + context.label + ' CSV';
      exportBtn.disabled = !context.rows.length;
    }
    if (importBtn) importBtn.innerHTML = '<i class="fa-solid fa-file-import me-2"></i>Import ' + context.label;
    if (templateBtn) templateBtn.innerHTML = '<i class="fa-solid fa-download me-2"></i>Template ' + context.label;
    if (hint) hint.textContent = context.rows.length
      ? context.rows.length + ' baris aktif siap diexport untuk tab ' + context.label + '.'
      : 'Belum ada data aktif pada tab ' + context.label + '. Tambahkan data baru, import CSV/Excel, atau restore backup.';
    if (badge) badge.textContent = context.label;
    if (search) search.placeholder = 'Cari ' + context.label.toLowerCase() + ' aktif...';
    if (searchLabel) searchLabel.textContent = 'Cari cepat ' + context.label;
    if (rowCount) rowCount.textContent = String(stats.active?.visible || stats.active?.total || 0);
    if (activeCount) activeCount.textContent = String(stats.active?.active || 0);
    if (aliasCount) aliasCount.textContent = String(stats.active?.withAlias || 0);
    if (coverageCount) coverageCount.textContent = String(totals);
    if (saveModeBadge) saveModeBadge.textContent = saveModeMap[context.entity] || 'Mode standar';
    if (searchStateBadge) searchStateBadge.textContent = searchKeyword ? 'Filter aktif' : 'Tanpa filter';
    if (exportAllBtn) exportAllBtn.disabled = totals === 0;
  }

  function wireDataPesananTools() {
    const toolbar = document.querySelector('.page-toolbar-inline .d-flex.flex-wrap.gap-2.ms-auto');
    if (!toolbar || document.getElementById('btnOpsExportCsv')) return;
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.id = 'btnOpsExportCsv';
    exportBtn.className = 'btn btn-outline-primary bg-surface';
    exportBtn.innerHTML = '<i class="fa-solid fa-file-csv me-2"></i>Export CSV';
    exportBtn.addEventListener('click', exportOrdersCsv);

    const backupBtn = document.createElement('button');
    backupBtn.type = 'button';
    backupBtn.id = 'btnOpsBackupJson';
    backupBtn.className = 'btn btn-outline-secondary bg-surface';
    backupBtn.innerHTML = '<i class="fa-solid fa-box-archive me-2"></i>Backup JSON';
    backupBtn.addEventListener('click', exportBackupJson);

    toolbar.appendChild(exportBtn);
    toolbar.appendChild(backupBtn);
  }

  function wireMasterTools() {
    const header = document.querySelector('.main-content .container-fluid.pb-4 > .d-flex.justify-content-between.align-items-center.mb-4');
    if (!header || document.getElementById('btnMasterBackupJson')) return;
    header.classList.add('flex-wrap', 'gap-3');
    const toolsWrap = document.createElement('div');
    toolsWrap.className = 'ds-context-toolbar ds-context-toolbar-sticky ms-auto';
    toolsWrap.innerHTML = [
      '<div class="d-flex flex-wrap gap-2 justify-content-end align-items-center">',
      '  <span class="badge rounded-pill text-bg-primary align-self-center" id="master-active-context-badge">Principal</span>',
      '  <span class="badge rounded-pill text-bg-light border align-self-center ds-master-inline-badge" id="master-save-mode-badge">Autosave sel</span>',
      '  <span class="badge rounded-pill text-bg-light border align-self-center ds-master-inline-badge" id="master-search-state-badge">Tanpa filter</span>',
      '  <button type="button" class="btn btn-outline-primary bg-surface" id="btnMasterContextTemplate"><i class="fa-solid fa-download me-2"></i>Template Principal</button>',
      '  <button type="button" class="btn btn-outline-primary bg-surface" id="btnMasterContextImport"><i class="fa-solid fa-file-import me-2"></i>Import Principal</button>',
      '  <button type="button" class="btn btn-outline-primary bg-surface" id="btnMasterExportCsv"><i class="fa-solid fa-file-export me-2"></i>Export Principal CSV</button>',
      '  <button type="button" class="btn btn-outline-primary bg-surface" id="btnMasterExportAllCsv"><i class="fa-solid fa-file-zipper me-2"></i>Export Semua CSV</button>',
      '  <button type="button" class="btn btn-outline-secondary bg-surface" id="btnMasterBackupJson"><i class="fa-solid fa-box-archive me-2"></i>Backup JSON</button>',
      '  <button type="button" class="btn btn-outline-success bg-surface" id="btnMasterRestoreJson"><i class="fa-solid fa-file-import me-2"></i>Restore Backup</button>',
      '</div>',
      '<div class="ds-context-toolbar-helper">',
      '  <div class="ds-master-toolbar-search">',
      '    <div class="small text-muted fw-semibold" id="dsMasterInlineSearchLabel">Cari cepat Principal</div>',
      '    <div class="input-group input-group-sm">',
      '      <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>',
      '      <input type="text" class="form-control" id="dsMasterInlineSearch" placeholder="Cari principal aktif...">',
      '      <button type="button" class="btn btn-outline-secondary bg-surface" id="btnMasterInlineSearchClear"><i class="fa-solid fa-xmark"></i></button>',
      '    </div>',
      '  </div>',
      '  <div class="ds-master-toolbar-stats">',
      '    <div class="ds-master-stat-chip"><span>Baris tampil</span><strong id="master-active-row-count">0</strong></div>',
      '    <div class="ds-master-stat-chip"><span>Aktif status</span><strong id="master-active-active-count">0</strong></div>',
      '    <div class="ds-master-stat-chip"><span>Punya alias</span><strong id="master-active-alias-count">0</strong></div>',
      '    <div class="ds-master-stat-chip"><span>Cakupan master</span><strong id="master-total-coverage-count">0</strong></div>',
      '  </div>',
      '</div>',
      '<div class="small text-muted text-end mt-2" id="master-tool-context-hint"></div>'
    ].join('');
    header.appendChild(toolsWrap);

    document.getElementById('btnMasterBackupJson')?.addEventListener('click', exportBackupJson);
    document.getElementById('btnMasterExportAllCsv')?.addEventListener('click', exportAllMasterCsv);
    document.getElementById('btnMasterExportCsv')?.addEventListener('click', async function () {
      const context = getMasterContext();
      if (!context.rows.length) {
        feedback()?.alert?.('Belum ada data ' + context.label + ' yang bisa diexport.', { title: 'Export belum tersedia', variant: 'warning' });
        return;
      }
      const filename = 'master-' + String(context.entity || 'data').replace(/_/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      downloadBlob(filename, new Blob([toCsv(context.rows)], { type: 'text/csv;charset=utf-8' }));
      feedback()?.toast?.('Export ' + context.label + ' berhasil dibuat.', 'success');
    });
    document.getElementById('btnMasterContextTemplate')?.addEventListener('click', function () {
      const context = getMasterContext();
      window.DataSystemImportCenter?.downloadTemplate?.(context.entity);
    });
    document.getElementById('btnMasterContextImport')?.addEventListener('click', function () {
      const context = getMasterContext();
      window.DataSystemImportCenter?.openModal?.(context.entity);
    });

    const searchInput = document.getElementById('dsMasterInlineSearch');
    const searchClear = document.getElementById('btnMasterInlineSearchClear');
    const applySearch = function () {
      masterData()?.filterActiveTable?.(searchInput?.value || '');
      updateMasterToolLabels();
    };
    searchInput?.addEventListener('input', applySearch);
    searchInput?.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      applySearch();
    });
    searchClear?.addEventListener('click', function () {
      if (!searchInput) return;
      searchInput.value = '';
      applySearch();
      searchInput.focus();
    });

    const restoreInput = ensureHiddenFileInput('ds-restore-backup-input', restoreBackupFile);
    document.getElementById('btnMasterRestoreJson')?.addEventListener('click', function () { restoreInput.click(); });
    updateMasterToolLabels();
    document.addEventListener('masters:active-tab-changed', function () {
      applySearch();
      updateMasterToolLabels();
    });
    document.addEventListener('masters:stats-updated', updateMasterToolLabels);
    document.addEventListener('masters:filter-changed', updateMasterToolLabels);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (isPage('data-pesanan.html')) wireDataPesananTools();
    if (isPage('database-master.html')) wireMasterTools();
  });

  window.DataSystemOpsBackup = {
    exportOrdersCsv,
    exportBackupJson,
    restoreBackupFile,
    updateMasterToolLabels,
    getMasterContext,
    exportAllMasterCsv,
  };
})(window, document);
