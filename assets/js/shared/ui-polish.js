(function (window, document) {
  'use strict';

  function getPage() {
    return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function getQueryValue() {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch (_error) {
      return '';
    }
  }

  function setQueryValue(value, targetPage) {
    const url = new URL(targetPage || window.location.href, window.location.origin);
    if (value) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    return url.pathname.split('/').pop() + (url.search ? url.search : '');
  }

  function dispatchInput(node) {
    if (!node) return;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
    node.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter' }));
  }

  function applyLocalSearch(selector, value) {
    const field = document.querySelector(selector);
    if (!field) return false;
    field.value = value;
    dispatchInput(field);
    return true;
  }

  function filterMasterPage(value) {
    const master = window.DataSystemMasterData;
    if (!master?.filterActiveTable) return false;
    master.filterActiveTable(value);
    return true;
  }

  function resolveSearchAction(page) {
    switch (page) {
      case 'data-pesanan.html':
        return { type: 'local', selector: '#search-pesanan', placeholder: 'Cari pesanan, PO, instansi, principal...' };
      case 'funnel-daftar.html':
        return { type: 'local', selector: '#funnel-search', placeholder: 'Cari funnel, pengadaan, instansi, principal...' };
      case 'index.html':
        return { type: 'local', selector: '#ops-filter-search', placeholder: 'Cari order aktif, instansi, principal...' };
      case 'logistik-sla.html':
        return { type: 'local', selector: '#ship-filter-search', placeholder: 'Cari resi, PO, instansi, ekspedisi...' };
      case 'database-master.html':
        return { type: 'master', placeholder: 'Cari data di tab master yang sedang aktif...' };
      case 'funnel-dashboard.html':
        return { type: 'redirect', target: 'funnel-daftar.html', placeholder: 'Cari funnel lalu buka Daftar Funnel...' };
      case 'funnel-input.html':
        return { type: 'redirect', target: 'funnel-daftar.html', placeholder: 'Cari funnel existing di Daftar Funnel...' };
      case 'input-pesanan.html':
        return { type: 'redirect', target: 'data-pesanan.html', placeholder: 'Cari pesanan existing di Daftar Pesanan...' };
      case 'kalkulator-b2b.html':
      case 'kalkulator-distributor.html':
        return { type: 'redirect', target: 'data-pesanan.html', placeholder: 'Cari pesanan terkait kalkulasi...' };
      default:
        return { type: 'redirect', target: 'data-pesanan.html', placeholder: 'Cari data pesanan atau funnel...' };
    }
  }

  function performSearch(action, value) {
    const query = String(value || '').trim();
    if (!action) return;
    if (action.type === 'local') {
      applyLocalSearch(action.selector, query);
      return;
    }
    if (action.type === 'master') {
      filterMasterPage(query);
      return;
    }
    if (action.type === 'redirect') {
      window.location.href = setQueryValue(query, action.target);
    }
  }

  function wireTopbarSearch() {
    const input = document.querySelector('.topbar .search-box');
    if (!input || input.dataset.dsTopbarSearch === 'true') return;
    input.dataset.dsTopbarSearch = 'true';
    const page = getPage();
    const action = resolveSearchAction(page);
    if (action?.placeholder) input.placeholder = action.placeholder;

    let debounceTimer = null;
    const runSearch = function (forceRedirect) {
      const value = input.value || '';
      if (forceRedirect && action?.type === 'redirect') {
        performSearch(action, value);
        return;
      }
      if (action?.type === 'local' || action?.type === 'master') {
        performSearch(action, value);
      }
    };

    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      performSearch(action, input.value || '');
    });

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { runSearch(false); }, 180);
    });

    const presetQuery = getQueryValue();
    if (presetQuery) {
      input.value = presetQuery;
      setTimeout(function () { runSearch(false); }, 60);
    }

    document.addEventListener('masters:active-tab-changed', function () {
      if (page === 'database-master.html' && input.value.trim()) filterMasterPage(input.value.trim());
    });
  }

  function bindOrderTemplateButtons() {
    document.querySelectorAll('[data-import-template-target]').forEach(function (button) {
      if (button.dataset.dsTemplateBound === 'true') return;
      button.dataset.dsTemplateBound = 'true';
      button.addEventListener('click', function (event) {
        event.preventDefault();
        const target = button.dataset.importTemplateTarget;
        if (window.DataSystemImportCenter?.downloadTemplate) {
          window.DataSystemImportCenter.downloadTemplate(target);
        }
      });
    });
  }



  function storageGet(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (_error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, String(value)); } catch (_error) {}
  }

  function makeChipButton(label, isActive, onClick, extraClass) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm ' + (isActive ? 'btn-primary' : 'btn-outline-primary bg-surface') + (extraClass ? ' ' + extraClass : '');
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function ensureSectionNav(container, items) {
    if (!container || !Array.isArray(items) || !items.length || container.querySelector('.ds-section-nav')) return;
    const nav = document.createElement('div');
    nav.className = 'ds-section-nav mt-3';
    const label = document.createElement('span');
    label.className = 'ds-section-nav-label';
    label.textContent = 'Navigasi cepat';
    nav.appendChild(label);
    items.forEach(function (item) {
      if (!item?.target || !item?.label) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-sm btn-outline-primary bg-surface';
      button.textContent = item.label;
      button.addEventListener('click', function () {
        item.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.appendChild(button);
    });
    container.appendChild(nav);
  }

  function setupDashboardQuickNav() {
    const page = getPage();
    if (!['index.html', 'funnel-dashboard.html', 'logistik-sla.html'].includes(page)) return;
    const titleBlock = document.querySelector('.page-title')?.parentElement;
    if (!titleBlock) return;
    const cards = [...document.querySelectorAll('.phoenix-card .card-header-custom h5')]
      .map(function (heading) { return ({ heading, text: (heading.textContent || '').replace(/\s+/g, ' ').trim() }); })
      .filter(function (item) { return item.text && item.text.length >= 6; });
    const items = [];
    const seen = new Set();
    cards.forEach(function (item) {
      if (items.length >= 5) return;
      const normalized = item.text.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      const card = item.heading.closest('.phoenix-card');
      if (!card) return;
      card.classList.add('ds-section-anchor');
      if (!card.id) card.id = 'ds-section-' + items.length;
      items.push({ label: item.text, target: card });
    });
    ensureSectionNav(titleBlock, items);
  }

  function setupInputPesananDensity() {
    if (getPage() !== 'input-pesanan.html') return;
    const workflowCard = document.getElementById('order-workflow-card');
    const workflowBody = workflowCard?.querySelector('.card-body-custom');
    if (!workflowBody || workflowBody.querySelector('.ds-density-toolbar')) return;
    const state = {
      mode: storageGet('ds:order-density:mode', 'focus'),
      summaries: storageGet('ds:order-density:summaries', '0') !== '0',
    };
    const previewRow = [...document.querySelectorAll('.main-content .container-fluid > .row.g-3.mb-3')].find(function (row) {
      return row.querySelector('#order-form-checklist-preview') || row.querySelector('#order-form-history-preview');
    });
    if (previewRow) previewRow.id = 'order-preview-row';
    const summaryBlocks = [];
    [...document.querySelectorAll('.main-content h5')].forEach(function (heading) {
      const text = (heading.textContent || '').toLowerCase();
      if (text.includes('ringkasan kalkulasi dasar') || text.includes('ringkasan kalkulasi rabat')) {
        heading.classList.add('ds-order-summary-block');
        if (heading.nextElementSibling) heading.nextElementSibling.classList.add('ds-order-summary-block');
        summaryBlocks.push(heading);
      }
    });
    workflowCard.classList.add('ds-sticky-card');

    const toolbar = document.createElement('div');
    toolbar.className = 'ds-density-toolbar ds-order-density-toolbar mt-3';
    const left = document.createElement('div');
    left.className = 'ds-density-toolbar-group';
    const right = document.createElement('div');
    right.className = 'ds-density-toolbar-group';
    const hint = document.createElement('div');
    hint.className = 'ds-density-toolbar-hint';
    right.appendChild(hint);
    toolbar.appendChild(left);
    toolbar.appendChild(right);
    workflowBody.appendChild(toolbar);

    function render() {
      document.body.classList.toggle('ds-order-focus-mode', state.mode === 'focus');
      document.body.classList.toggle('ds-order-hide-summary', !state.summaries);
      left.innerHTML = '';
      left.appendChild(makeChipButton('Fokus Tahap', state.mode === 'focus', function () {
        state.mode = 'focus';
        storageSet('ds:order-density:mode', state.mode);
        render();
      }));
      left.appendChild(makeChipButton('Tampilan Lengkap', state.mode === 'full', function () {
        state.mode = 'full';
        storageSet('ds:order-density:mode', state.mode);
        render();
      }));
      left.appendChild(makeChipButton(state.summaries ? 'Sembunyikan Ringkasan' : 'Tampilkan Ringkasan', false, function () {
        state.summaries = !state.summaries;
        storageSet('ds:order-density:summaries', state.summaries ? '1' : '0');
        render();
      }));
      hint.textContent = state.mode === 'focus'
        ? 'Mode fokus menyembunyikan panel sekunder agar user lebih cepat menyelesaikan tahap aktif.'
        : 'Mode lengkap menampilkan seluruh panel pendukung dan ringkasan.';
      if (previewRow) previewRow.classList.toggle('ds-order-preview-row', true);
      summaryBlocks.forEach(function (node) { node.classList.add('ds-order-summary-block'); });
    }
    render();
  }

  function setupDaftarPesananDensity() {
    if (getPage() !== 'data-pesanan.html') return;
    const cards = [...document.querySelectorAll('.phoenix-card')];
    const filterCard = cards.find(function (card) {
      return /pencarian\s*&\s*filter/i.test(card.querySelector('.card-header-custom h5')?.textContent || '');
    });
    const tableCard = cards.find(function (card) {
      return /semua transaksi pesanan/i.test(card.querySelector('.card-header-custom h5')?.textContent || '');
    });
    const exceptionCard = cards.find(function (card) {
      return /exception center/i.test(card.querySelector('.card-header-custom h5')?.textContent || '');
    });
    if (!filterCard || filterCard.querySelector('.ds-density-toolbar')) return;
    if (tableCard) tableCard.classList.add('ds-orders-main-card');
    if (exceptionCard) exceptionCard.classList.add('ds-orders-exception-card');
    const utilityRow = filterCard.querySelector('.d-flex.flex-wrap.justify-content-between.align-items-center.gap-3.mt-3');
    if (utilityRow) utilityRow.classList.add('ds-orders-secondary-toolbar');
    const state = {
      mode: storageGet('ds:orders-density:mode', 'focus'),
      exception: storageGet('ds:orders-density:exception', '0') !== '0'
    };
    const body = filterCard.querySelector('.card-body-custom');
    const toolbar = document.createElement('div');
    toolbar.className = 'ds-density-toolbar mb-3';
    const left = document.createElement('div');
    left.className = 'ds-density-toolbar-group';
    const right = document.createElement('div');
    right.className = 'ds-density-toolbar-group';
    const hint = document.createElement('div');
    hint.className = 'ds-density-toolbar-hint';
    right.appendChild(hint);
    toolbar.appendChild(left);
    toolbar.appendChild(right);
    body.prepend(toolbar);

    if (exceptionCard && !exceptionCard.querySelector('.ds-collapse-exception-btn')) {
      const header = exceptionCard.querySelector('.card-header-custom');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-outline-primary bg-surface ds-collapse-exception-btn';
      btn.innerHTML = '<i class="fa-solid fa-eye-slash me-2"></i>Sembunyikan';
      btn.addEventListener('click', function () {
        state.exception = !state.exception;
        storageSet('ds:orders-density:exception', state.exception ? '1' : '0');
        render();
      });
      header.appendChild(btn);
    }

    function render() {
      document.body.classList.toggle('ds-orders-focus-mode', state.mode === 'focus');
      document.body.classList.toggle('ds-orders-hide-exception', !state.exception);
      left.innerHTML = '';
      left.appendChild(makeChipButton('Fokus Tabel', state.mode === 'focus', function () {
        state.mode = 'focus';
        storageSet('ds:orders-density:mode', state.mode);
        render();
      }));
      left.appendChild(makeChipButton('Semua Panel', state.mode === 'full', function () {
        state.mode = 'full';
        storageSet('ds:orders-density:mode', state.mode);
        render();
      }));
      left.appendChild(makeChipButton(state.exception ? 'Sembunyikan Exception' : 'Tampilkan Exception', false, function () {
        state.exception = !state.exception;
        storageSet('ds:orders-density:exception', state.exception ? '1' : '0');
        render();
      }));
      hint.textContent = state.mode === 'focus'
        ? 'Mode fokus mempertahankan tabel utama dan menyederhanakan toolbar sekunder.'
        : 'Mode lengkap menampilkan seluruh toolbar, summary chip, dan exception center.';
      const btn = exceptionCard?.querySelector('.ds-collapse-exception-btn');
      if (btn) btn.innerHTML = state.exception
        ? '<i class="fa-solid fa-eye-slash me-2"></i>Sembunyikan'
        : '<i class="fa-solid fa-eye me-2"></i>Tampilkan';
    }
    render();
  }

  function setupModalHierarchy() {
    const wideModalIds = ['detailPesananModal', 'funnelDetailModal', 'funnelConvertModal', 'filterPesananModal', 'bulkUpdatePesananModal'];
    wideModalIds.forEach(function (id) {
      document.querySelector('#' + id + ' .modal-dialog')?.classList.add('ds-modal-wide');
    });
    const mediumModalIds = ['savedViewModal', 'statusModal', 'opsFilterModal', 'shipFilterModal'];
    mediumModalIds.forEach(function (id) {
      document.querySelector('#' + id + ' .modal-dialog')?.classList.add('ds-modal-form');
    });
    document.querySelectorAll('.modal-dialog-scrollable .modal-content').forEach(function (content) {
      content.classList.add('ds-modal-sticky-shell');
    });
  }


  function setupHeaderActionBars() {
    document.body.classList.add('ds-spacious-layout');

    const pageTitle = document.querySelector('.page-title');
    const pageHeader = pageTitle?.closest('.d-flex');
    if (pageHeader && !pageHeader.classList.contains('ds-page-header')) {
      pageHeader.classList.add('ds-page-header');
      const children = Array.from(pageHeader.children).filter(Boolean);
      const meta = children.find(function (node) { return node.querySelector?.('.page-title'); }) || children[0];
      const actions = children.find(function (node) { return node !== meta; });
      if (meta) meta.classList.add('ds-page-header-meta');
      if (actions) actions.classList.add('ds-page-header-actions');
    }

    document.querySelectorAll('.phoenix-card').forEach(function (card) {
      const header = card.querySelector('.card-header-custom');
      const titleText = normalizeHeadingText(header?.querySelector('h5'));
      if (!header) return;

      const hasToolbarBody = !!card.querySelector('.page-toolbar-inline, .dashboard-toolbar-inline, .funnel-filter-toolbar, .exception-center-toolbar, .ds-context-toolbar, .b2b2-report-toolbar, .dist3-report-toolbar');
      if (hasToolbarBody || titleText.includes('pencarian') || titleText.includes('filter')) {
        card.classList.add('ds-action-bar-card');
      }
      card.querySelectorAll('.page-toolbar-inline, .dashboard-toolbar-inline, .funnel-filter-toolbar, .exception-center-toolbar, .ds-context-toolbar, .b2b2-report-toolbar, .dist3-report-toolbar').forEach(function (node) {
        node.classList.add('ds-toolbar-layout');
      });

      const children = Array.from(header.children).filter(Boolean);
      const meta = children.find(function (node) { return node.querySelector?.('h5'); }) || (header.querySelector('h5')?.parentElement === header ? header.querySelector('h5') : null);
      const hasControls = children.some(function (node) {
        return node !== meta && (node.matches?.('.btn, .badge, .input-group, .form-control, .form-select, .filters') || node.querySelector?.('.btn, .badge, .input-group, .form-control, .form-select, .filters'));
      });
      if (meta) meta.classList.add('ds-card-header-meta');
      const note = meta?.querySelector?.('.small.text-muted') || header.querySelector('.small.text-muted');
      if (note) note.classList.add('ds-card-header-note');
      const title = meta?.querySelector?.('h5') || header.querySelector('h5');
      if (title) title.classList.add('ds-card-header-title');

      if (hasControls) {
        header.classList.add('ds-card-header-actionbar');
        children.forEach(function (node) {
          if (node !== meta && (node.matches?.('.btn, .badge, .input-group, .form-control, .form-select, .filters, .d-flex') || node.querySelector?.('.btn, .badge, .input-group, .form-control, .form-select, .filters'))) {
            node.classList.add('ds-card-header-actions');
          }
        });
      }
    });
  }

  function setupModalSpacingPolish() {
    document.querySelectorAll('.modal').forEach(function (modal) {
      modal.classList.add('ds-modal-shell');
      const dialog = modal.querySelector('.modal-dialog');
      if (!dialog) return;
      if (dialog.classList.contains('modal-lg') || dialog.classList.contains('modal-xl') || dialog.classList.contains('modal-fullscreen')) {
        dialog.classList.add('ds-modal-large');
      }
      modal.querySelectorAll('.modal-footer').forEach(function (footer) {
        footer.classList.add('ds-modal-footer-actions');
      });
      modal.querySelectorAll('.modal-body .phoenix-card').forEach(function (card) {
        card.classList.add('ds-modal-card');
      });
    });
  }


  function getTableHosts(root) {
    return Array.from((root || document).querySelectorAll('[id$="-grid"], [id$="Table"], #convert-existing-table, #exception-center-grid'))
      .filter(function (node) { return node && !node.classList.contains('tabulator'); });
  }

  function decorateTableRegion(host) {
    if (!host) return null;
    host.classList.add('ds-table-host');
    const region = host.closest('.card-body-custom, .modal-body, .tab-pane, .offcanvas-body') || host.parentElement;
    if (region) region.classList.add('ds-table-scroll-region');
    return region;
  }

  function syncTableOverflowState(root) {
    getTableHosts(root).forEach(function (host) {
      const region = decorateTableRegion(host);
      const table = host.querySelector('.tabulator') || (host.classList.contains('tabulator') ? host : null);
      const holder = table?.querySelector('.tabulator-tableholder') || null;
      const reference = holder || table || host;
      const hasOverflow = !!(reference && reference.scrollWidth > (reference.clientWidth + 12));
      host.classList.toggle('ds-table-has-overflow', hasOverflow);
      if (region) region.classList.toggle('ds-table-has-overflow', hasOverflow);
    });
  }

  function setupTableOverflowPolishSafe() {
    const run = function (root) { syncTableOverflowState(root || document); };
    getTableHosts(document).forEach(decorateTableRegion);
    [180, 520, 1100].forEach(function (delay) {
      window.setTimeout(function () { run(document); }, delay);
    });
    let resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { run(document); }, 140);
    });
    document.addEventListener('shown.bs.modal', function (event) {
      const modal = event.target;
      if (!modal?.classList?.contains('modal')) return;
      [80, 220].forEach(function (delay) {
        window.setTimeout(function () { run(modal); }, delay);
      });
    });
    document.addEventListener('app:sidebar-changed', function () {
      window.setTimeout(function () { run(document); }, 220);
    });
  }

  function setupPageSpacingRhythm() {
    document.body.classList.add('ds-page-rhythm');
    document.querySelectorAll('.main-content .container-fluid > h5, .main-content .container-fluid form > h5, .main-content .order-stage-section > h5').forEach(function (heading) {
      heading.classList.add('ds-section-heading');
    });
    document.querySelectorAll('.main-content .phoenix-card .card-body-custom > .row.g-2, .main-content .phoenix-card .card-body-custom > .row.g-3, .main-content .phoenix-card .card-body-custom > .row.g-4, .main-content .phoenix-card .card-body-custom > .row.g-5').forEach(function (row) {
      row.classList.add('ds-section-grid');
    });
    document.querySelectorAll('.main-content .phoenix-card .card-body-custom > .row + .row').forEach(function (row) {
      row.classList.add('ds-section-grid-next');
    });
  }

  function setupModalRuntimePolishSafe() {
    document.querySelectorAll('.modal').forEach(function (modal) {
      const dialog = modal.querySelector('.modal-dialog');
      const body = modal.querySelector('.modal-body');
      if (!dialog || !body) return;
      const hasTable = !!modal.querySelector('.table-responsive, .tabulator, [id$="-grid"], [id$="Table"], #convert-existing-table, #exception-center-grid');
      const hasCards = !!modal.querySelector('.phoenix-card');
      modal.classList.toggle('ds-modal-has-table', hasTable);
      modal.classList.toggle('ds-modal-has-cards', hasCards);
      if (hasTable) dialog.classList.add('ds-modal-table-dialog');
      body.querySelectorAll(':scope > .row, :scope > form, :scope > .phoenix-card, :scope > .alert, :scope > .table-responsive, :scope > [id$="-grid"], :scope > [id$="Table"], :scope > #convert-existing-table, :scope > #exception-center-grid').forEach(function (node) {
        node.classList.add('ds-modal-block');
      });
      body.querySelectorAll(':scope > form > .row').forEach(function (row) {
        row.classList.add('ds-modal-form-grid');
      });
    });
  }

  function setupActionFooterLayout() {
    const footers = Array.from(document.querySelectorAll('.action-footer'));
    const mainContent = document.getElementById('mainContent');
    if (!mainContent || !footers.length) return;

    function syncFooterMetrics() {
      let maxHeight = 0;
      footers.forEach(function (footer) {
        footer.classList.add('ds-action-footer-shell');
        const buttons = footer.querySelectorAll('.btn');
        footer.classList.toggle('ds-action-footer-compact', buttons.length <= 2);
        footer.classList.toggle('ds-action-footer-dense', buttons.length >= 4);
        maxHeight = Math.max(maxHeight, Math.ceil(footer.getBoundingClientRect().height || 0));
      });
      const offset = Math.max(maxHeight || 0, 110);
      document.documentElement.style.setProperty('--footer-offset', offset + 'px');
      document.body.classList.add('ds-has-action-footer');
    }

    syncFooterMetrics();
    window.addEventListener('resize', syncFooterMetrics);
    window.addEventListener('load', syncFooterMetrics);
    document.addEventListener('app:sidebar-changed', function () { window.setTimeout(syncFooterMetrics, 180); });
    document.addEventListener('shown.bs.modal', function () { window.setTimeout(syncFooterMetrics, 100); });
    document.addEventListener('hidden.bs.modal', function () { window.setTimeout(syncFooterMetrics, 100); });
  }

  function flattenChartValues(values, output) {
    if (!Array.isArray(values)) return output;
    values.forEach(function (item) {
      if (Array.isArray(item)) {
        flattenChartValues(item, output);
        return;
      }
      if (item && typeof item === 'object') {
        if ('y' in item) output.push(item.y);
        else if ('value' in item) output.push(item.value);
        else if ('r' in item) output.push(item.r);
        else output.push(item);
        return;
      }
      output.push(item);
    });
    return output;
  }

  function chartHasMeaningfulData(chart) {
    const datasets = chart?.data?.datasets || [];
    if (!datasets.length) return false;
    let points = 0;
    let nonZero = 0;
    datasets.forEach(function (dataset) {
      flattenChartValues(Array.isArray(dataset?.data) ? dataset.data : [], []).forEach(function (value) {
        if (value == null || value === '') return;
        if (typeof value === 'number') {
          points += 1;
          if (Math.abs(value) > 0) nonZero += 1;
          return;
        }
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          points += 1;
          if (Math.abs(parsed) > 0) nonZero += 1;
          return;
        }
        if (String(value).trim()) {
          points += 1;
          nonZero += 1;
        }
      });
    });
    return points > 0 && nonZero > 0;
  }

  function getCardHeadingText(node) {
    return (node?.closest?.('.phoenix-card')?.querySelector('.card-header-custom h5')?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function buildChartEmptyMarkup(label) {
    return [
      '<div class="ds-chart-empty-inner">',
      '  <div class="ds-chart-empty-kicker">' + escapeHtml(label || 'Visualisasi') + '</div>',
      '  <div class="ds-chart-empty-icon"><i class="fa-solid fa-chart-column"></i></div>',
      '  <div class="ds-chart-empty-title">Belum ada data yang bisa divisualkan</div>',
      '  <div class="ds-chart-empty-note">Ubah filter, periode, atau lengkapi data terkait agar grafik dapat ditampilkan dengan rapi.</div>',
      '</div>'
    ].join('');
  }

  function refreshDashboardChartStates() {
    if (typeof Chart === 'undefined') return;
    document.querySelectorAll('.phoenix-card canvas').forEach(function (canvas) {
      const shell = canvas.parentElement || canvas;
      if (!shell) return;
      shell.classList.add('ds-chart-shell');
      const chart = typeof Chart.getChart === 'function' ? Chart.getChart(canvas) : null;
      const hasData = chartHasMeaningfulData(chart);
      let empty = shell.querySelector('.ds-chart-empty');
      if (hasData) {
        canvas.style.display = '';
        shell.classList.remove('ds-chart-is-empty');
        if (empty) empty.remove();
        return;
      }
      shell.classList.add('ds-chart-is-empty');
      canvas.style.display = 'none';
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'ds-chart-empty';
        shell.appendChild(empty);
      }
      empty.innerHTML = buildChartEmptyMarkup(getCardHeadingText(canvas));
    });
  }

  function scheduleDashboardChartStateRefresh() {
    [80, 260, 720].forEach(function (delay) {
      window.setTimeout(refreshDashboardChartStates, delay);
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function decorateTabulatorPlaceholder(host) {
    const tabulator = host?.querySelector?.('.tabulator');
    if (!tabulator) return;
    const apply = function () {
      tabulator.querySelectorAll('.tabulator-placeholder').forEach(function (node) {
        if (node.dataset.dsDecorated === 'true') return;
        node.dataset.dsDecorated = 'true';
        const title = (node.textContent || '').trim() || 'Belum ada data';
        node.innerHTML = [
          '<div class="ds-table-empty">',
          '  <div class="ds-table-empty-icon"><i class="fa-regular fa-folder-open"></i></div>',
          '  <div class="ds-table-empty-title">' + escapeHtml(title) + '</div>',
          '  <div class="ds-table-empty-note">Coba ubah filter, import data, atau tambahkan data baru untuk melanjutkan.</div>',
          '</div>'
        ].join('');
      });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(tabulator, { childList: true, subtree: true });
  }

  function setupTableLoadingStates() {
    const hosts = Array.from(document.querySelectorAll('[id$="-grid"], [id$="Table"], #convert-existing-table, #exception-center-grid'))
      .filter(function (node) { return node && !node.classList.contains('tabulator'); });
    hosts.forEach(function (host) {
      const body = host.closest('.card-body-custom') || host.parentElement;
      if (!body || body.dataset.dsTableStateBound === 'true') return;
      body.dataset.dsTableStateBound = 'true';
      body.classList.add('ds-table-card-body', 'ds-is-loading');
      const heading = body.closest('.phoenix-card')?.querySelector('.card-header-custom h5');
      if (heading && !body.dataset.loadingLabel) body.dataset.loadingLabel = (heading.textContent || '').replace(/\s+/g, ' ').trim();
      const markReady = function () {
        body.classList.remove('ds-is-loading');
        decorateTabulatorPlaceholder(host);
      };
      const observer = new MutationObserver(function () {
        if (host.querySelector('.tabulator')) {
          observer.disconnect();
          markReady();
        }
      });
      observer.observe(host, { childList: true, subtree: true });
      window.setTimeout(markReady, 2200);
    });
  }

  function setupMasterWorkspacePolish() {
    if (getPage() !== 'database-master.html') return;
    const tabs = document.getElementById('masterTabs');
    if (!tabs || document.getElementById('ds-master-stats-strip')) return;
    const service = window.DataSystemMasterData;
    const strip = document.createElement('div');
    strip.id = 'ds-master-stats-strip';
    strip.className = 'ds-master-stats-strip';
    strip.innerHTML = [
      '<div class="ds-master-workspace-card">',
      '  <div class="ds-master-workspace-meta">',
      '    <div class="ds-master-workspace-title">Workspace master data</div>',
      '    <div class="ds-master-workspace-note">Toolbar, import/export, dan pencarian kini mengikuti tab aktif agar user tidak salah konteks.</div>',
      '  </div>',
      '  <div class="ds-master-tab-stat-list">',
      '    <div class="ds-master-tab-stat" data-entity="principals"><span>Principal</span><strong>0</strong></div>',
      '    <div class="ds-master-tab-stat" data-entity="partners"><span>Mitra</span><strong>0</strong></div>',
      '    <div class="ds-master-tab-stat" data-entity="owners"><span>Owner</span><strong>0</strong></div>',
      '    <div class="ds-master-tab-stat" data-entity="locations"><span>Lokasi</span><strong>0</strong></div>',
      '  </div>',
      '</div>'
    ].join('');
    tabs.insertAdjacentElement('afterend', strip);

    const map = {
      principals: '#tab-produk',
      partners: '#tab-mitra',
      owners: '#tab-owner',
      locations: '#tab-satker'
    };

    function update() {
      const entities = ['principals', 'partners', 'owners', 'locations'];
      entities.forEach(function (entity) {
        const stat = service?.getEntityStats?.(entity) || { total: 0 };
        const stripItem = strip.querySelector('.ds-master-tab-stat[data-entity="' + entity + '"] strong');
        if (stripItem) stripItem.textContent = String(stat.total || 0);
        const tabButton = tabs.querySelector('[data-bs-target="' + map[entity] + '"]');
        if (!tabButton) return;
        let badge = tabButton.querySelector('.ds-tab-count-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'ds-tab-count-badge';
          tabButton.appendChild(badge);
        }
        badge.textContent = String(stat.total || 0);
      });
    }

    update();
    document.addEventListener('masters:stats-updated', update);
  }



  function normalizeHeadingText(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function findCardByKeywords(keywords) {
    const list = Array.isArray(keywords) ? keywords : [keywords];
    return [...document.querySelectorAll('.phoenix-card')].find(function (card) {
      const text = normalizeHeadingText(card.querySelector('.card-header-custom h5'));
      return text && list.some(function (keyword) { return text.includes(String(keyword).toLowerCase()); });
    }) || null;
  }

  function setupWorkspaceConsistency() {
    const page = getPage();
    const configByPage = {
      'data-pesanan.html': {
        filter: ['pencarian & filter'],
        main: ['semua transaksi pesanan'],
        note: 'Gunakan search cepat untuk scan data harian. Buka filter global saat perlu narrowing yang lebih detail.'
      },
      'funnel-daftar.html': {
        filter: ['pencarian & filter'],
        main: ['semua funnel / pipeline'],
        note: 'Gunakan search untuk menemukan peluang, lalu lanjutkan dengan update tahap atau konversi ke pesanan.'
      },
      'index.html': {
        filter: ['pencarian & filter'],
        main: ['order aktif'],
        note: 'Dashboard ini paling efektif bila search dipakai untuk scan cepat, lalu insight detail dibuka saat dibutuhkan.'
      },
      'logistik-sla.html': {
        filter: ['pencarian & filter'],
        main: ['daftar pemantauan pengiriman'],
        note: 'Gunakan filter global untuk mempersempit exception pengiriman, lalu fokus ke daftar monitoring di bawah.'
      }
    };
    const config = configByPage[page];
    if (!config) return;
    const filterCard = findCardByKeywords(config.filter);
    const mainCard = findCardByKeywords(config.main);
    if (!filterCard || !mainCard || filterCard.querySelector('.ds-workspace-helper')) return;
    filterCard.classList.add('ds-workspace-filter-card');
    mainCard.classList.add('ds-workspace-main-card');
    const body = filterCard.querySelector('.card-body-custom') || filterCard;
    const helper = document.createElement('div');
    helper.className = 'ds-workspace-helper';
    helper.innerHTML = [
      '<div class="ds-workspace-helper-note">' + escapeHtml(config.note) + '</div>',
      '<div class="ds-workspace-helper-actions">',
      '  <button type="button" class="btn btn-sm btn-outline-primary bg-surface ds-scroll-to-results"><i class="fa-solid fa-arrow-down-wide-short me-2"></i>Lompat ke hasil</button>',
      '  <button type="button" class="btn btn-sm btn-outline-secondary bg-surface ds-focus-results-toggle"><i class="fa-solid fa-bullseye me-2"></i>Fokus hasil</button>',
      '</div>'
    ].join('');
    body.appendChild(helper);
    helper.querySelector('.ds-scroll-to-results')?.addEventListener('click', function () {
      mainCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    helper.querySelector('.ds-focus-results-toggle')?.addEventListener('click', function () {
      document.body.classList.toggle('ds-workspace-focus-results');
      const active = document.body.classList.contains('ds-workspace-focus-results');
      helper.querySelector('.ds-focus-results-toggle').innerHTML = active
        ? '<i class="fa-solid fa-eye me-2"></i>Tampilkan semua'
        : '<i class="fa-solid fa-bullseye me-2"></i>Fokus hasil';
      if (active) mainCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function setupDashboardCompactMode() {
    const page = getPage();
    const configByPage = {
      'index.html': {
        compactNote: 'Mode ringkas menjaga KPI dan daftar kerja utama tetap dominan. Insight sekunder bisa dibuka saat dibutuhkan.',
        secondary: ['owner performance', 'shipment mendatang', 'exception manajerial ringkas']
      },
      'funnel-dashboard.html': {
        compactNote: 'Mode ringkas menampilkan kesehatan pipeline utama terlebih dahulu. Analisis owner dan taxonomy bisa dibuka saat review mendalam.',
        secondary: ['owner performance', 'reason lost taxonomy', 'pipeline stagnan bernilai besar', 'forecast accuracy detail']
      },
      'logistik-sla.html': {
        compactNote: 'Mode ringkas mempertahankan KPI logistik inti dan daftar monitoring. Taxonomy dan exception detail bisa dibuka saat investigasi.',
        secondary: ['reason delay taxonomy', 'exception manajerial ringkas', 'backlog outstanding per ekspedisi']
      }
    };
    const config = configByPage[page];
    if (!config) return;
    const titleBlock = document.querySelector('.page-title')?.parentElement;
    if (!titleBlock || titleBlock.querySelector('.ds-dashboard-density-toolbar')) return;
    const cards = [...document.querySelectorAll('.phoenix-card')];
    const secondaryCards = cards.filter(function (card) {
      const text = normalizeHeadingText(card.querySelector('.card-header-custom h5'));
      return text && config.secondary.some(function (keyword) { return text.includes(keyword); });
    });
    if (!secondaryCards.length) return;
    secondaryCards.forEach(function (card) { card.classList.add('ds-dashboard-secondary-card'); });
    const storageKey = 'ds:dashboard-density:' + page;
    const state = { mode: storageGet(storageKey, 'compact') };

    const toolbar = document.createElement('div');
    toolbar.className = 'ds-density-toolbar ds-dashboard-density-toolbar mt-3';
    toolbar.innerHTML = '<div class="ds-density-toolbar-group"></div><div class="ds-density-toolbar-group"><div class="ds-density-toolbar-hint"></div></div>';
    titleBlock.appendChild(toolbar);
    const left = toolbar.querySelector('.ds-density-toolbar-group');
    const hint = toolbar.querySelector('.ds-density-toolbar-hint');

    function render() {
      document.body.classList.toggle('ds-dashboard-compact', state.mode === 'compact');
      left.innerHTML = '';
      left.appendChild(makeChipButton('Mode Ringkas', state.mode === 'compact', function () {
        state.mode = 'compact';
        storageSet(storageKey, state.mode);
        render();
      }));
      left.appendChild(makeChipButton('Analisis Lengkap', state.mode === 'full', function () {
        state.mode = 'full';
        storageSet(storageKey, state.mode);
        render();
      }));
      if (state.mode === 'compact') {
        left.appendChild(makeChipButton('Lihat insight sekunder', false, function () {
          state.mode = 'full';
          storageSet(storageKey, state.mode);
          render();
          secondaryCards[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }));
      }
      hint.textContent = config.compactNote;
    }
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireTopbarSearch();
    bindOrderTemplateButtons();
    setupHeaderActionBars();
    setupDashboardQuickNav();
    setupDashboardCompactMode();
    setupWorkspaceConsistency();
    setupInputPesananDensity();
    setupDaftarPesananDensity();
    setupModalHierarchy();
    setupModalSpacingPolish();
    setupModalRuntimePolishSafe();
    setupActionFooterLayout();
    setupTableLoadingStates();
    setupTableOverflowPolishSafe();
    setupPageSpacingRhythm();
    setupMasterWorkspacePolish();
    scheduleDashboardChartStateRefresh();
  });

  window.addEventListener('ds:dashboard-rendered', scheduleDashboardChartStateRefresh);

  window.DataSystemUiPolish = {
    performSearch,
    bindOrderTemplateButtons,
    resolveSearchAction,
    syncTableOverflowState,
  };
})(window, document);
