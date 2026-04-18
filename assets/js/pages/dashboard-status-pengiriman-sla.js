(function () {
  'use strict';

  function initShipmentDashboard() {
    var bridge = window.DashboardDataBridge;
    if (!bridge || !document.getElementById('ship-kpi-active')) return;

    var allOrders = bridge.getNormalizedOrders();
    var charts = {};
    var tables = {};
    var latestFiltered = [];
    var latestExceptionRows = [];
    var latestDocRows = [];

    function getThemeColors() {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      return {
        text: isDark ? '#e3ebf6' : '#31374a',
        muted: isDark ? '#b3c0d1' : '#5e6e82',
        grid: isDark ? '#222834' : '#e3ebf6',
        primary: '#2c7be5',
        success: '#00d27a',
        warning: '#f5803e',
        danger: '#e63757'
      };
    }

    function setText(id, value) { var el = document.getElementById(id); if (el) el.textContent = value; }

    function initTooltips() {
      if (typeof bootstrap === 'undefined' || !bootstrap.Tooltip) return;
      document.querySelectorAll('.dashboard-kpi-compact-card[data-bs-toggle="tooltip"]').forEach(function (el) {
        var existing = bootstrap.Tooltip.getInstance(el);
        if (existing) existing.dispose();
        new bootstrap.Tooltip(el, { trigger: 'hover', boundary: document.body });
      });
    }

    function showModal(id, onShown) {
      if (typeof bootstrap === 'undefined') return;
      var el = document.getElementById(id);
      if (!el) return;
      var instance = bootstrap.Modal.getOrCreateInstance(el);
      if (onShown) {
        var handler = function () {
          el.removeEventListener('shown.bs.modal', handler);
          setTimeout(function () { onShown(); }, 60);
        };
        el.addEventListener('shown.bs.modal', handler);
      }
      instance.show();
    }

    function hideModal(id, onHidden) {
      if (typeof bootstrap === 'undefined') return;
      var el = document.getElementById(id);
      if (!el) return;
      var instance = bootstrap.Modal.getOrCreateInstance(el);
      if (onHidden) {
        var handler = function () {
          el.removeEventListener('hidden.bs.modal', handler);
          setTimeout(function () { onHidden(); }, 40);
        };
        el.addEventListener('hidden.bs.modal', handler);
      }
      instance.hide();
    }

    function openShipmentActionModal(poNumber, sourceModalId) {
      var row = latestFiltered.find(function (item) { return item.po_number === poNumber; }) || allOrders.find(function (item) { return item.po_number === poNumber; });
      if (!row) return;
      setText('ship-modal-po', row.po_number || '-');
      setText('ship-modal-instansi', row.instansi || row.satker || '-');
      setText('ship-modal-principal', row.principal || '-');
      setText('ship-modal-pemasok', row.pemasok || '-');
      setText('ship-modal-pic', row.pic_omset || '-');
      setText('ship-modal-status', row.shipping_status || '-');
      setText('ship-modal-resi', row.resi_number || '-');
      setText('ship-modal-updated', row.last_update_at instanceof Date ? row.last_update_at.toLocaleString('id-ID') : '-');
      setText('ship-modal-summary', row.issue_note || ('SLA: ' + (row.sla_status || '-') + ' • Netto: ' + bridge.formatCompactRupiah(row.netto_value || 0)));
      var viewLink = document.getElementById('ship-modal-view-link');
      var editLink = document.getElementById('ship-modal-edit-link');
      if (viewLink) viewLink.href = 'data-pesanan.html?po=' + encodeURIComponent(poNumber);
      if (editLink) editLink.href = 'input-pesanan.html?po=' + encodeURIComponent(poNumber);
      if (sourceModalId) {
        hideModal(sourceModalId, function () { showModal('shipActionModal'); });
      } else {
        showModal('shipActionModal');
      }
    }

    function openExceptionModal() {
      showModal('shipExceptionModal', function () {
        createTable('shipExceptionModal', 'shipExceptionModalTable', [
          { title: 'No PO', field: 'po_number', minWidth: 130, cssClass: 'fw-bold text-primary' },
          { title: 'Instansi', field: 'instansi', minWidth: 220 },
          { title: 'Masalah', field: 'issue', minWidth: 260 },
          { title: 'Status', field: 'status', minWidth: 150, formatter: badgeFormatter({ 'Selesai': 'success', 'Terkendala': 'danger', 'Dalam Perjalanan': 'warning', 'Penyiapan': 'primary', 'Belum Diproses': 'primary', 'Tiba': 'success' }) },
          { title: 'SLA', field: 'sla', minWidth: 110, formatter: badgeFormatter({ 'On Time': 'success', 'Rawan': 'warning', 'Overdue': 'danger', 'Belum Valid': 'primary' }) },
          { title: 'PIC', field: 'pic', minWidth: 120 },
          { title: 'Prioritas', field: 'priority', minWidth: 110, formatter: badgeFormatter({ 'Tinggi': 'danger', 'Sedang': 'warning' }) },
          { title: 'Update Terakhir', field: 'updated_at', minWidth: 180, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleString('id-ID') : '-'; } },
          { title: 'Aksi', field: 'po_number', minWidth: 140, hozAlign: 'center', formatter: function (cell) { return '<button class="btn btn-sm btn-outline-primary bg-surface ship-order-action-btn" data-po="' + (cell.getValue() || '') + '">Lihat / Update</button>'; } }
        ], latestExceptionRows, { pagination: true, paginationSize: 10, layout: 'fitColumns' });
        if (tables.shipExceptionModal) { tables.shipExceptionModal.setPage(1); tables.shipExceptionModal.redraw(true); setTimeout(function(){ tables.shipExceptionModal && tables.shipExceptionModal.redraw(true); }, 80); }
      });
    }

    function openDocsModal() {
      showModal('shipDocsModal', function () {
        createTable('shipDocsModal', 'shipDocsModalTable', [
          { title: 'Item', field: 'metric', minWidth: 180 },
          { title: 'Jumlah', field: 'value', width: 100, hozAlign: 'right' },
          { title: 'Catatan', field: 'note', minWidth: 220 }
        ], latestDocRows, { pagination: true, paginationSize: 10, layout: 'fitColumns' });
        if (tables.shipDocsModal) { tables.shipDocsModal.setPage(1); tables.shipDocsModal.redraw(true); setTimeout(function(){ tables.shipDocsModal && tables.shipDocsModal.redraw(true); }, 80); }
      });
    }
    function fillSelect(id, items, defaultLabel) {
      var el = document.getElementById(id); if (!el) return;
      var current = el.value; el.innerHTML = '';
      var first = document.createElement('option'); first.value = defaultLabel; first.textContent = defaultLabel; el.appendChild(first);
      items.forEach(function (item) { var opt = document.createElement('option'); opt.value = item; opt.textContent = item; el.appendChild(opt); });
      if ([].slice.call(el.options).some(function (o) { return o.value === current; })) el.value = current;
    }

    function refreshFilterOptions(data) {
      fillSelect('ship-filter-region', bridge.uniqueValues(data, 'kabupaten_kota'), 'Semua Wilayah');
      fillSelect('ship-filter-principal', bridge.uniqueValues(data, 'principal'), 'Semua Principal');
      fillSelect('ship-filter-supplier', bridge.uniqueValues(data, 'pemasok'), 'Semua Pemasok');
      fillSelect('ship-filter-executor', bridge.uniqueValues(data, 'pelaksana'), 'Semua Pelaksana');
      fillSelect('ship-filter-pic', bridge.uniqueValues(data, 'pic_omset'), 'Semua PIC');
    }

    function getFilters() {
      return {
        period: document.getElementById('ship-filter-period')?.value || 'Bulan Ini',
        region: document.getElementById('ship-filter-region')?.value || 'Semua Wilayah',
        principal: document.getElementById('ship-filter-principal')?.value || 'Semua Principal',
        supplier: document.getElementById('ship-filter-supplier')?.value || 'Semua Pemasok',
        executor: document.getElementById('ship-filter-executor')?.value || 'Semua Pelaksana',
        pic: document.getElementById('ship-filter-pic')?.value || 'Semua PIC',
        status: document.getElementById('ship-filter-status')?.value || 'Semua Status',
        sla: document.getElementById('ship-filter-sla')?.value || 'Semua',
        docs: document.getElementById('ship-filter-docs')?.value || 'Semua',
        search: (document.getElementById('ship-filter-search')?.value || '').toLowerCase().trim()
      };
    }

    function applyFilters() {
      var f = getFilters();
      return bridge.filterByPeriod(allOrders, f.period, 'po_date').filter(function (row) {
        if (f.region !== 'Semua Wilayah' && row.kabupaten_kota !== f.region) return false;
        if (f.principal !== 'Semua Principal' && row.principal !== f.principal) return false;
        if (f.supplier !== 'Semua Pemasok' && row.pemasok !== f.supplier) return false;
        if (f.executor !== 'Semua Pelaksana' && row.pelaksana !== f.executor) return false;
        if (f.pic !== 'Semua PIC' && row.pic_omset !== f.pic) return false;
        if (f.status !== 'Semua Status' && row.shipping_status !== f.status) return false;
        if (f.sla !== 'Semua' && row.sla_status !== f.sla) return false;
        if (f.docs !== 'Semua') {
          if (f.docs === 'Resi Belum Ada' && row.resi_number) return false;
          if (f.docs === 'SJ Belum Upload' && row.delivery_note_uploaded) return false;
          if (f.docs === 'BAST Belum Upload' && row.bast_uploaded) return false;
        }
        if (f.search) {
          var hay = [row.po_number, row.resi_number, row.instansi, row.sales_number, row.principal, row.pemasok].join(' ').toLowerCase();
          if (hay.indexOf(f.search) === -1) return false;
        }
        return true;
      });
    }

    function summarize(data) {
      var s = { active: 0, notSent: 0, inTransit: 0, arrived: 0, complete: 0, issue: 0, brutto: 0, netto: 0, noResi: 0, noSj: 0, noBast: 0 };
      data.forEach(function (row) {
        s.active++; s.brutto += row.brutto_value || 0; s.netto += row.netto_value || 0;
        if (!row.resi_number) s.noResi++;
        if (!row.delivery_note_uploaded) s.noSj++;
        if (!row.bast_uploaded) s.noBast++;
        switch (row.shipping_status) {
          case 'Belum Diproses':
          case 'Penyiapan': s.notSent++; break;
          case 'Dalam Perjalanan': s.inTransit++; break;
          case 'Tiba': s.arrived++; break;
          case 'Selesai': s.complete++; break;
          case 'Terkendala': s.issue++; break;
        }
      });
      return s;
    }

    function statusCounts(data) { var labels = ['Belum Diproses', 'Penyiapan', 'Dalam Perjalanan', 'Tiba', 'Selesai', 'Terkendala']; return labels.map(function (label) { return data.filter(function (row) { return row.shipping_status === label; }).length; }); }
    function slaCounts(data) { var labels = ['On Time', 'Rawan', 'Overdue', 'Belum Valid']; return labels.map(function (label) { return data.filter(function (row) { return row.sla_status === label; }).length; }); }
    function buildRootCauseRows(data) {
      var map = {};
      data.filter(function (row) {
        return row.sla_status === 'Overdue' || row.shipping_status === 'Terkendala' || !row.resi_number || !row.delivery_note_uploaded || (!row.bast_uploaded && (row.shipping_status === 'Tiba' || row.shipping_status === 'Selesai'));
      }).forEach(function (row) {
        var cause = bridge.classifyDelayRootCause ? bridge.classifyDelayRootCause(row) : (row.issue_cause || row.issue_note || 'Perlu klarifikasi lanjutan');
        if (!map[cause]) map[cause] = { cause: cause, orders: 0, outstanding: 0, overdue: 0 };
        map[cause].orders += 1;
        map[cause].outstanding += bridge.getOutstandingValue ? bridge.getOutstandingValue(row) : (row.status_order === 'Selesai' ? 0 : (row.netto_value || 0));
        if (row.sla_status === 'Overdue') map[cause].overdue += 1;
      });
      return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) { return b.orders - a.orders || b.outstanding - a.outstanding; });
    }
    function issueCauseCounts(data) {
      var rows = buildRootCauseRows(data).slice(0, 6);
      return { labels: rows.map(function (row) { return row.cause; }), values: rows.map(function (row) { return row.orders; }) };
    }
    function buildBacklogExpedition(data) {
      var map = {};
      data.filter(function (row) { return row.status_order !== 'Selesai'; }).forEach(function (row) {
        var ekspedisi = row.ekspedisi_name || 'Belum ditetapkan';
        if (!map[ekspedisi]) map[ekspedisi] = { expedition: ekspedisi, value: 0 };
        map[ekspedisi].value += bridge.getOutstandingValue ? bridge.getOutstandingValue(row) : (row.netto_value || 0);
      });
      return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 6);
    }
    function buildShipmentForecastRows(data) {
      var buckets = ['<=7 hari', '8-14 hari', '15-30 hari', '>30 hari', 'Belum valid'];
      var map = {};
      buckets.forEach(function (bucket) { map[bucket] = { bucket: bucket, count: 0, outstanding: 0 }; });
      data.filter(function (row) { return row.status_order !== 'Selesai'; }).forEach(function (row) {
        var forecastDate = bridge.getShipmentForecastDate ? bridge.getShipmentForecastDate(row) : (row.target_arrive_final || row.target_prep_date || null);
        var days = bridge.getDaysUntil ? bridge.getDaysUntil(forecastDate, new Date()) : null;
        var bucket = bridge.getForecastBucket ? bridge.getForecastBucket(days, 'shipment') : 'Belum valid';
        if (!map[bucket]) map[bucket] = { bucket: bucket, count: 0, outstanding: 0 };
        map[bucket].count += 1;
        map[bucket].outstanding += bridge.getOutstandingValue ? bridge.getOutstandingValue(row) : (row.netto_value || 0);
      });
      return buckets.map(function (bucket) { return map[bucket]; });
    }

    function buildDelayTaxonomyRows(data) {
      var map = {};
      data.filter(function (row) {
        return row.status_order !== 'Selesai' || row.sla_status === 'Overdue' || row.shipping_status === 'Terkendala';
      }).forEach(function (row) {
        var taxonomy = bridge.classifyDelayTaxonomy ? bridge.classifyDelayTaxonomy(row) : 'Lainnya / perlu klarifikasi';
        if (!map[taxonomy]) map[taxonomy] = { taxonomy: taxonomy, orders: 0, overdue: 0, noResi: 0, noSj: 0, noBast: 0, outstanding: 0 };
        map[taxonomy].orders += 1;
        map[taxonomy].outstanding += bridge.getOutstandingValue ? bridge.getOutstandingValue(row) : (row.netto_value || 0);
        if (row.sla_status === 'Overdue') map[taxonomy].overdue += 1;
        if (!row.resi_number) map[taxonomy].noResi += 1;
        if (!row.delivery_note_uploaded) map[taxonomy].noSj += 1;
        if (!row.bast_uploaded) map[taxonomy].noBast += 1;
      });
      return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) { return b.orders - a.orders || b.outstanding - a.outstanding; });
    }

    function buildShipmentAccuracyRows(data) {
      var labels = ['Lebih Cepat', 'Sesuai Forecast', 'Mundur 1-30 hari', 'Mundur >30 hari', 'Belum valid'];
      var map = {};
      labels.forEach(function (label) { map[label] = { label: label, count: 0 }; });
      data.filter(function (row) { return row.status_order === 'Selesai'; }).forEach(function (row) {
        var label = bridge.getForecastAccuracyLabel ? bridge.getForecastAccuracyLabel(row.target_arrive_final, row.actual_received_date, 'shipment') : 'Belum valid';
        if (!map[label]) map[label] = { label: label, count: 0 };
        map[label].count += 1;
      });
      return labels.map(function (label) { return map[label]; });
    }

    function buildManagerialExceptionRows(data) {
      var taxonomyRows = buildDelayTaxonomyRows(data).slice(0, 6);
      var issues = bridge.getNormalizedOrderIssues ? bridge.getNormalizedOrderIssues() : [];
      var openIssues = issues.filter(function (item) { return String(item.status || 'Open').toLowerCase() !== 'resolved'; });
      var critical = openIssues.filter(function (item) { return ['Kritis', 'Tinggi'].indexOf(bridge.normalizeIssueSeverity ? bridge.normalizeIssueSeverity(item.severity) : item.severity) !== -1; }).length;
      var overdue = openIssues.filter(function (item) { return item.due_date instanceof Date && !isNaN(item.due_date.getTime()) && item.due_date < new Date(); }).length;
      return taxonomyRows.map(function (item) {
        return {
          category: item.taxonomy,
          orders: item.orders,
          overdue_orders: item.overdue,
          outstanding: item.outstanding,
          note: 'Issue terbuka ' + openIssues.length + ' • Kritis ' + critical + ' • Overdue ' + overdue
        };
      });
    }

    function createOrUpdateChart(key, canvasId, configFactory) {
      var canvas = document.getElementById(canvasId); if (!canvas || typeof Chart === 'undefined') return;
      if (charts[key]) charts[key].destroy();
      charts[key] = new Chart(canvas.getContext('2d'), configFactory());
    }

    function renderCharts(data) {
      var colors = getThemeColors();
      createOrUpdateChart('status', 'shipStatusChart', function () {
        return { type: 'doughnut', data: { labels: ['Belum Diproses', 'Penyiapan', 'Dalam Perjalanan', 'Tiba', 'Selesai', 'Terkendala'], datasets: [{ data: statusCounts(data), backgroundColor: [colors.muted, colors.primary, colors.warning, '#20c997', colors.success, colors.danger], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: colors.text } } } } };
      });
      createOrUpdateChart('sla', 'shipSlaChart', function () {
        return { type: 'bar', data: { labels: ['On Time', 'Rawan', 'Overdue', 'Belum Valid'], datasets: [{ label: 'Jumlah', data: slaCounts(data), backgroundColor: [colors.success, colors.warning, colors.danger, colors.muted], borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: colors.text }, grid: { display: false } }, y: { ticks: { color: colors.muted }, grid: { color: colors.grid } } } } };
      });
      var causeSummary = issueCauseCounts(data);
      createOrUpdateChart('issue', 'shipIssueCauseChart', function () {
        return { type: 'pie', data: { labels: causeSummary.labels, datasets: [{ data: causeSummary.values, backgroundColor: [colors.warning, '#6f42c1', colors.danger, colors.primary, '#20c997', '#198754'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: colors.text, boxWidth: 12 } } } } };
      });
      var backlogExpedition = buildBacklogExpedition(data);
      createOrUpdateChart('backlogExpedition', 'shipBacklogExpeditionChart', function () {
        return { type: 'bar', data: { labels: backlogExpedition.map(function (row) { return row.expedition; }), datasets: [{ label: 'Outstanding Netto', data: backlogExpedition.map(function (row) { return row.value; }), backgroundColor: colors.primary, borderRadius: 6 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: colors.muted, callback: function (v) { return bridge.formatCompactRupiah(v); } }, grid: { color: colors.grid } }, y: { ticks: { color: colors.text }, grid: { display: false } } } } };
      });
      var shipmentForecast = buildShipmentForecastRows(data);
      createOrUpdateChart('shipmentForecast', 'shipShipmentForecastChart', function () {
        return {
          type: 'bar',
          data: {
            labels: shipmentForecast.map(function (row) { return row.bucket; }),
            datasets: [
              { label: 'Jumlah Order', data: shipmentForecast.map(function (row) { return row.count; }), backgroundColor: colors.success, borderRadius: 6, yAxisID: 'y' },
              { label: 'Outstanding Netto', data: shipmentForecast.map(function (row) { return row.outstanding; }), backgroundColor: colors.warning, borderRadius: 6, yAxisID: 'y1' }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: colors.text } } },
            scales: {
              x: { ticks: { color: colors.text }, grid: { display: false } },
              y: { position: 'left', ticks: { color: colors.muted }, grid: { color: colors.grid } },
              y1: { position: 'right', ticks: { color: colors.muted, callback: function (v) { return bridge.formatCompactRupiah(v); } }, grid: { display: false } }
            }
          }
        };
      });

      var shipmentAccuracy = buildShipmentAccuracyRows(data);
      createOrUpdateChart('forecastAccuracy', 'shipForecastAccuracyChart', function () {
        return {
          type: 'doughnut',
          data: { labels: shipmentAccuracy.map(function (item) { return item.label; }), datasets: [{ data: shipmentAccuracy.map(function (item) { return item.count; }), backgroundColor: ['#39afd1', colors.success, colors.warning, colors.danger, colors.muted], borderWidth: 0 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: colors.text } } } }
        };
      });
    }

    function createTable(key, containerId, columns, data, options) {
      var container = document.getElementById(containerId);
      if (!container || typeof Tabulator === 'undefined') { bridge.createEmptyMessage(containerId, 'Tabulator belum tersedia.'); return; }
      if (tables[key]) tables[key].destroy();
      tables[key] = new Tabulator('#' + containerId, Object.assign({ data: data, layout: 'fitColumns', responsiveLayout: false, movableColumns: true,
        paginationButtonCount: 5,
        paginationCounter: 'rows', placeholder: 'Belum ada data', columns: columns }, options || {}));
    }

    function badgeFormatter(map, fallback) { return function (cell) {
      var v = cell.getValue(); var cls = map[v] || fallback || 'primary';
      return '<span class="badge bg-' + cls + '-subtle text-' + cls + ' border border-' + cls + '">' + v + '</span>';
    }; }

    function renderTables(data) {
      createTable('shipMonitor', 'shipMonitoringTable', [
        { title: 'No PO', field: 'po_number', minWidth: 130, frozen: true, cssClass: 'fw-bold text-primary' },
        { title: 'Instansi / Satker', field: 'instansi', minWidth: 220 },
        { title: 'Principal', field: 'principal', minWidth: 120 },
        { title: 'Pemasok', field: 'pemasok', minWidth: 140 },
        { title: 'No Penjualan', field: 'sales_number', minWidth: 130 },
        { title: 'No Resi', field: 'resi_number', minWidth: 140, formatter: function (cell) { return cell.getValue() || '-'; } },
        { title: 'Status', field: 'shipping_status', minWidth: 150, formatter: badgeFormatter({ 'Selesai': 'success', 'Terkendala': 'danger', 'Dalam Perjalanan': 'warning', 'Penyiapan': 'primary', 'Belum Diproses': 'primary', 'Tiba': 'success' }) },
        { title: 'Tgl Kirim', field: 'actual_sent_date', minWidth: 120, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleDateString('id-ID') : '-'; } },
        { title: 'Tgl Terima', field: 'actual_received_date', minWidth: 120, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleDateString('id-ID') : '-'; } },
        { title: 'Penerima', field: 'receiver_name', minWidth: 140, formatter: function (cell) { return cell.getValue() || '-'; } },
        { title: 'Target Akhir', field: 'target_arrive_final', minWidth: 120, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleDateString('id-ID') : '-'; } },
        { title: 'SLA', field: 'sla_status', minWidth: 110, formatter: badgeFormatter({ 'On Time': 'success', 'Rawan': 'warning', 'Overdue': 'danger', 'Belum Valid': 'primary' }) }
      ], data, { pagination: true, paginationSize: 10 });

      var exceptions = data.filter(function (row) { return !row.resi_number || !row.delivery_note_uploaded || !row.bast_uploaded || row.sla_status === 'Overdue' || row.shipping_status === 'Terkendala'; }).map(function (row) {
        return { po_number: row.po_number, instansi: row.instansi, issue: row.issue_cause || row.issue_note || 'Perlu tindak lanjut', status: row.shipping_status, sla: row.sla_status, pic: row.pic_omset, priority: row.sla_status === 'Overdue' || row.shipping_status === 'Terkendala' ? 'Tinggi' : 'Sedang', updated_at: row.last_update_at };
      });
      latestExceptionRows = exceptions.slice();

      createTable('shipException', 'shipExceptionTable', [
        { title: 'No PO', field: 'po_number', minWidth: 130, widthGrow: 1, cssClass: 'fw-bold text-primary' },
        { title: 'Instansi', field: 'instansi', minWidth: 220, widthGrow: 1.8 },
        { title: 'Masalah', field: 'issue', minWidth: 240, widthGrow: 1.8 },
        { title: 'Status', field: 'status', minWidth: 150, widthGrow: 1, formatter: badgeFormatter({ 'Selesai': 'success', 'Terkendala': 'danger', 'Dalam Perjalanan': 'warning', 'Penyiapan': 'primary', 'Belum Diproses': 'primary', 'Tiba': 'success' }) },
        { title: 'SLA', field: 'sla', minWidth: 110, widthGrow: 0.9, formatter: badgeFormatter({ 'On Time': 'success', 'Rawan': 'warning', 'Overdue': 'danger', 'Belum Valid': 'primary' }) },
        { title: 'PIC', field: 'pic', minWidth: 120, widthGrow: 0.8 },
        { title: 'Prioritas', field: 'priority', minWidth: 110, widthGrow: 0.8, formatter: badgeFormatter({ 'Tinggi': 'danger', 'Sedang': 'warning' }) },
        { title: 'Update Terakhir', field: 'updated_at', minWidth: 170, widthGrow: 1.2, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleString('id-ID') : '-'; } },
        { title: 'Aksi', field: 'po_number', minWidth: 140, widthGrow: 0.8, hozAlign: 'center', formatter: function (cell) { return '<button class="btn btn-sm btn-outline-primary bg-surface ship-order-action-btn" data-po="' + (cell.getValue() || '') + '">Lihat / Update</button>'; } }
      ], exceptions, { pagination: true, paginationSize: 10 });

      var rootCauseRows = buildRootCauseRows(data);
      createTable('shipRootCause', 'shipRootCauseTable', [
        { title: 'Root Cause', field: 'cause', minWidth: 220, cssClass: 'fw-semibold text-primary' },
        { title: 'Order', field: 'orders', width: 90, hozAlign: 'right' },
        { title: 'Overdue', field: 'overdue', width: 95, hozAlign: 'right' },
        { title: 'Outstanding Netto', field: 'outstanding', minWidth: 150, hozAlign: 'right', formatter: function (cell) { return bridge.formatCompactRupiah(cell.getValue()); } }
      ], rootCauseRows, { pagination: false, layout: 'fitColumns' });

      var delayTaxonomyRows = buildDelayTaxonomyRows(data);
      createTable('shipDelayTaxonomy', 'shipDelayTaxonomyTable', [
        { title: 'Taxonomy', field: 'taxonomy', minWidth: 220, cssClass: 'fw-semibold text-primary' },
        { title: 'Order', field: 'orders', width: 90, hozAlign: 'right' },
        { title: 'Overdue', field: 'overdue', width: 90, hozAlign: 'right' },
        { title: 'No Resi', field: 'noResi', width: 90, hozAlign: 'right' },
        { title: 'No SJ', field: 'noSj', width: 80, hozAlign: 'right' },
        { title: 'No BAST', field: 'noBast', width: 95, hozAlign: 'right' },
        { title: 'Outstanding', field: 'outstanding', minWidth: 140, hozAlign: 'right', formatter: function (cell) { return bridge.formatCompactRupiah(cell.getValue()); } }
      ], delayTaxonomyRows, { pagination: false, layout: 'fitColumns' });

      var docSummary = [
        { metric: 'Resi Belum Ada', value: data.filter(function (row) { return !row.resi_number; }).length, note: 'Nomor resi kosong' },
        { metric: 'SJ Belum Upload', value: data.filter(function (row) { return !row.delivery_note_uploaded; }).length, note: 'Surat jalan belum tersedia' },
        { metric: 'BAST Belum Upload', value: data.filter(function (row) { return !row.bast_uploaded; }).length, note: 'Bukti serah terima belum lengkap' },
        { metric: 'Update > 3 Hari', value: data.filter(function (row) { return row.last_update_at && ((new Date().getTime() - row.last_update_at.getTime()) / 86400000) > 3; }).length, note: 'Perlu follow up' }
      ];

      latestDocRows = docSummary.slice();

      createTable('shipDocs', 'shipDocSummaryTable', [
        { title: 'Item', field: 'metric', minWidth: 180 },
        { title: 'Jumlah', field: 'value', width: 100, hozAlign: 'right' },
        { title: 'Catatan', field: 'note', minWidth: 220 }
      ], docSummary, { pagination: true, paginationSize: 10 });
    }

    function wireTableSearch(inputId, tableKey, fields) {
      var input = document.getElementById(inputId); if (!input) return;
      input.addEventListener('input', function () {
        var tbl = tables[tableKey]; if (!tbl) return;
        var value = input.value.toLowerCase().trim();
        if (!value) { tbl.clearFilter(true); return; }
        tbl.setFilter(function (rowData) {
          var hay = fields.map(function (f) { return rowData[f] || ''; }).join(' ').toLowerCase();
          return hay.indexOf(value) !== -1;
        });
      });
    }


    function applyQuickTableFilter(inputId, tableKey, fields) {
      var input = document.getElementById(inputId);
      var tbl = tables[tableKey];
      if (!input || !tbl) return;
      var value = (input.value || '').toLowerCase().trim();
      tbl.clearFilter(true);
      if (value) {
        tbl.setFilter(function (rowData) {
          var hay = fields.map(function (f) { return String(rowData[f] || ''); }).join(' ').toLowerCase();
          return hay.indexOf(value) !== -1;
        });
      }
      if (tbl.setPage) tbl.setPage(1);
      tbl.redraw(true);
      setTimeout(function () { tbl.redraw(true); }, 40);
    }

    function renderKpis(summary) {
      setText('ship-kpi-active', summary.active.toLocaleString('id-ID'));
      setText('ship-kpi-not-sent', summary.notSent.toLocaleString('id-ID'));
      setText('ship-kpi-in-transit', summary.inTransit.toLocaleString('id-ID'));
      setText('ship-kpi-arrived', summary.arrived.toLocaleString('id-ID'));
      setText('ship-kpi-complete', summary.complete.toLocaleString('id-ID'));
      setText('ship-kpi-issue', summary.issue.toLocaleString('id-ID'));
      setText('ship-kpi-brutto', bridge.formatCompactRupiah(summary.brutto));
      setText('ship-kpi-netto', bridge.formatCompactRupiah(summary.netto));
      setText('ship-kpi-no-resi', summary.noResi.toLocaleString('id-ID'));
      setText('ship-kpi-no-sj', summary.noSj.toLocaleString('id-ID'));
      setText('ship-kpi-no-bast', summary.noBast.toLocaleString('id-ID'));
    }

    function refresh() {
      var filtered = applyFilters();
      latestFiltered = filtered.slice();
      renderKpis(summarize(filtered));
      renderCharts(filtered);
      renderTables(filtered);
      initTooltips();
      try { window.dispatchEvent(new CustomEvent('ds:dashboard-rendered', { detail: { page: 'logistik-sla.html', records: filtered.length } })); } catch (_error) {}
    }

    function resetFilters() {
      var defaults = {
        'ship-filter-period': 'Bulan Ini',
        'ship-filter-region': 'Semua Wilayah',
        'ship-filter-principal': 'Semua Principal',
        'ship-filter-supplier': 'Semua Pemasok',
        'ship-filter-executor': 'Semua Pelaksana',
        'ship-filter-pic': 'Semua PIC',
        'ship-filter-status': 'Semua Status',
        'ship-filter-sla': 'Semua',
        'ship-filter-docs': 'Semua'
      };
      Object.keys(defaults).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = defaults[id]; });
      var search = document.getElementById('ship-filter-search'); if (search) search.value = '';
      var search2 = document.getElementById('ship-monitoring-search'); if (search2) search2.value = '';
      refresh();
    }

    refreshFilterOptions(allOrders);
    ['ship-filter-period','ship-filter-region','ship-filter-principal','ship-filter-supplier','ship-filter-executor','ship-filter-pic','ship-filter-status','ship-filter-sla','ship-filter-docs','ship-filter-search'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', refresh);
    });
    ['ship-reset-filters-top','ship-reset-filters-toolbar','ship-reset-filters-modal'].forEach(function (id) { var btn = document.getElementById(id); if (btn) btn.addEventListener('click', resetFilters); });
    wireTableSearch('ship-monitoring-search', 'shipMonitor', ['po_number', 'instansi', 'sales_number', 'resi_number', 'principal', 'pemasok']);
    var shipMonitoringSearch = document.getElementById('ship-monitoring-search');
    if (shipMonitoringSearch) { shipMonitoringSearch.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); applyQuickTableFilter('ship-monitoring-search', 'shipMonitor', ['po_number', 'instansi', 'sales_number', 'resi_number', 'principal', 'pemasok']); } }); }

    var shipMonitoringQuickBtn = document.getElementById('ship-monitoring-filter-quick');
    if (shipMonitoringQuickBtn) {
      shipMonitoringQuickBtn.addEventListener('click', function () {
        applyQuickTableFilter('ship-monitoring-search', 'shipMonitor', ['po_number', 'instansi', 'sales_number', 'resi_number', 'principal', 'pemasok']);
      });
    }

    var shipExceptionViewAllBtn = document.getElementById('ship-exception-view-all');
    if (shipExceptionViewAllBtn) shipExceptionViewAllBtn.addEventListener('click', openExceptionModal);

    var shipDocsViewAllBtn = document.getElementById('ship-docs-view-all');
    if (shipDocsViewAllBtn) shipDocsViewAllBtn.addEventListener('click', openDocsModal);

    document.addEventListener('click', function (e) {
      var orderBtn = e.target.closest('.ship-order-action-btn');
      if (orderBtn) {
        e.preventDefault();
        var sourceModalId = orderBtn.closest('#shipExceptionModal') ? 'shipExceptionModal' : '';
        openShipmentActionModal(orderBtn.getAttribute('data-po'), sourceModalId);
      }
    });

    refresh();

    var observer = new MutationObserver(function () { renderCharts(applyFilters()); initTooltips(); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initShipmentDashboard);
  else initShipmentDashboard();
  window.initShipmentDashboard = initShipmentDashboard;
})();