(function () {
  'use strict';

  function initOperationalDashboard() {
    var bridge = window.DashboardDataBridge;
    if (!bridge || !document.getElementById('ops-kpi-total-orders')) return;

    var allOrders = bridge.getNormalizedOrders();
    var charts = {};
    var tables = {};
    var latestFiltered = [];
    var latestActivityRows = [];

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

    function setText(id, value) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    }

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

    function openOrderActionModal(poNumber) {
      var row = latestFiltered.find(function (item) { return item.po_number === poNumber; }) || allOrders.find(function (item) { return item.po_number === poNumber; });
      if (!row) return;
      setText('ops-modal-po', row.po_number || '-');
      setText('ops-modal-instansi', row.instansi || row.satker || '-');
      setText('ops-modal-principal', row.principal || '-');
      setText('ops-modal-pemasok', row.pemasok || '-');
      setText('ops-modal-pic', row.pic_omset || '-');
      setText('ops-modal-status-order', row.status_order || '-');
      setText('ops-modal-status-ship', row.shipping_status || '-');
      setText('ops-modal-updated', row.last_update_at instanceof Date ? row.last_update_at.toLocaleString('id-ID') : '-');
      setText('ops-modal-summary', row.issue_note || ('Netto: ' + bridge.formatCompactRupiah(row.netto_value || 0) + ' • Nego: ' + bridge.formatCompactRupiah(row.nego_value || 0)));
      var viewLink = document.getElementById('ops-modal-view-link');
      var editLink = document.getElementById('ops-modal-edit-link');
      if (viewLink) viewLink.href = 'data-pesanan.html?po=' + encodeURIComponent(poNumber);
      if (editLink) editLink.href = 'input-pesanan.html?po=' + encodeURIComponent(poNumber);
      showModal('opsOrderActionModal');
    }

    function openActivityModal() {
      showModal('opsActivityModal', function () {
        createTable('opsActivityModal', 'opsActivityModalTable', [
          { title: 'No PO', field: 'po_number', minWidth: 130, cssClass: 'fw-bold text-primary' },
          { title: 'Aktivitas', field: 'activity', minWidth: 230 },
          { title: 'PIC', field: 'actor', minWidth: 120 },
          { title: 'Waktu', field: 'updated_at', minWidth: 190, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleString('id-ID') : '-'; } },
          { title: 'Ringkasan', field: 'summary', minWidth: 420 }
        ], latestActivityRows, { pagination: true, paginationSize: 10, layout: 'fitColumns' });
        if (tables.opsActivityModal) { tables.opsActivityModal.setPage(1); tables.opsActivityModal.redraw(true); setTimeout(function(){ tables.opsActivityModal && tables.opsActivityModal.redraw(true); }, 80); }
      });
    }

    function fillSelect(id, items, defaultLabel) {
      var el = document.getElementById(id);
      if (!el) return;
      var current = el.value;
      el.innerHTML = '';
      var first = document.createElement('option');
      first.textContent = defaultLabel;
      first.value = defaultLabel;
      el.appendChild(first);
      items.forEach(function (item) {
        var opt = document.createElement('option');
        opt.textContent = item;
        opt.value = item;
        el.appendChild(opt);
      });
      if ([].slice.call(el.options).some(function (o) { return o.value === current; })) {
        el.value = current;
      }
    }

    function refreshFilterOptions(data) {
      fillSelect('ops-filter-region', bridge.uniqueValues(data, 'kabupaten_kota'), 'Semua Wilayah');
      fillSelect('ops-filter-satker', bridge.uniqueValues(data, 'satker'), 'Semua Satker');
      fillSelect('ops-filter-principal', bridge.uniqueValues(data, 'principal'), 'Semua Principal');
      fillSelect('ops-filter-supplier', bridge.uniqueValues(data, 'pemasok'), 'Semua Pemasok');
      fillSelect('ops-filter-executor', bridge.uniqueValues(data, 'pelaksana'), 'Semua Pelaksana');
      fillSelect('ops-filter-pic', bridge.uniqueValues(data, 'pic_omset'), 'Semua PIC');
    }

    function getFilters() {
      return {
        period: document.getElementById('ops-filter-period')?.value || 'Bulan Ini',
        region: document.getElementById('ops-filter-region')?.value || 'Semua Wilayah',
        satker: document.getElementById('ops-filter-satker')?.value || 'Semua Satker',
        principal: document.getElementById('ops-filter-principal')?.value || 'Semua Principal',
        supplier: document.getElementById('ops-filter-supplier')?.value || 'Semua Pemasok',
        executor: document.getElementById('ops-filter-executor')?.value || 'Semua Pelaksana',
        pic: document.getElementById('ops-filter-pic')?.value || 'Semua PIC',
        status: document.getElementById('ops-filter-order-status')?.value || 'Semua Status',
        completeness: document.getElementById('ops-filter-completeness')?.value || 'Semua',
        search: (document.getElementById('ops-filter-search')?.value || '').toLowerCase().trim()
      };
    }

    function applyFilters() {
      var f = getFilters();
      return bridge.filterByPeriod(allOrders, f.period, 'po_date').filter(function (row) {
        if (f.region !== 'Semua Wilayah' && row.kabupaten_kota !== f.region) return false;
        if (f.satker !== 'Semua Satker' && row.satker !== f.satker) return false;
        if (f.principal !== 'Semua Principal' && row.principal !== f.principal) return false;
        if (f.supplier !== 'Semua Pemasok' && row.pemasok !== f.supplier) return false;
        if (f.executor !== 'Semua Pelaksana' && row.pelaksana !== f.executor) return false;
        if (f.pic !== 'Semua PIC' && row.pic_omset !== f.pic) return false;
        if (f.status !== 'Semua Status' && row.status_order !== f.status) return false;
        if (f.completeness !== 'Semua') {
          if (f.completeness === 'Lengkap' && !(row.data_completeness === 'Lengkap' && row.document_completeness === 'Lengkap')) return false;
          if (f.completeness === 'Belum Lengkap' && row.data_completeness === 'Lengkap') return false;
          if (f.completeness === 'Dokumen Belum Lengkap' && row.document_completeness === 'Lengkap') return false;
        }
        if (f.search) {
          var hay = [row.po_number, row.instansi, row.satker, row.kode_rup, row.nama_pengadaan, row.principal, row.pemasok].join(' ').toLowerCase();
          if (hay.indexOf(f.search) === -1) return false;
        }
        return true;
      });
    }

    function summarize(data) {
      var summary = {
        totalOrders: data.length, brutto: 0, netto: 0, nego: 0, margin: 0,
        outstanding: 0, newly: 0, processing: 0, ready: 0, problem: 0,
        incompleteData: 0, incompleteDocs: 0, invalidTarget: 0, noCalc: 0,
        overdue: 0, avgAgingDays: 0, outstandingNetto: 0, topBacklogOwnerLabel: '-'
      };
      var agingTotal = 0;
      var agingCount = 0;
      var ownerMap = {};
      data.forEach(function (row) {
        summary.brutto += row.brutto_value || 0;
        summary.netto += row.netto_value || 0;
        summary.nego += row.nego_value || 0;
        summary.margin += row.margin_value || 0;
        if (row.status_order !== 'Selesai') {
          summary.outstanding++;
          summary.outstandingNetto += bridge.getOutstandingValue ? bridge.getOutstandingValue(row) : (row.netto_value || 0);
          var aging = getOrderAgingDays(row);
          agingTotal += aging;
          agingCount += 1;
          var ownerKey = row.pic_omset || row.penggarap || 'Belum ditetapkan';
          ownerMap[ownerKey] = (ownerMap[ownerKey] || 0) + (bridge.getOutstandingValue ? bridge.getOutstandingValue(row) : (row.netto_value || 0));
        }
        if (row.sla_status === 'Overdue') summary.overdue++;
        if (row.status_order === 'Baru') summary.newly++;
        if (row.status_order === 'Diproses') summary.processing++;
        if (row.status_order === 'Siap Kirim') summary.ready++;
        if (row.risk_flag || row.status_order === 'Bermasalah') summary.problem++;
        if (row.data_completeness !== 'Lengkap') summary.incompleteData++;
        if (row.document_completeness !== 'Lengkap') summary.incompleteDocs++;
        if (!row.target_arrive_final || !row.target_prep_date) summary.invalidTarget++;
        if (row.no_calculation) summary.noCalc++;
      });
      summary.marginPct = summary.netto ? (summary.margin / summary.netto) * 100 : 0;
      summary.avgAgingDays = agingCount ? Math.round(agingTotal / agingCount) : 0;
      var bestOwner = Object.keys(ownerMap).sort(function (a, b) { return ownerMap[b] - ownerMap[a]; })[0];
      if (bestOwner) summary.topBacklogOwnerLabel = bestOwner + ' • ' + bridge.formatCompactRupiah(ownerMap[bestOwner] || 0);
      return summary;
    }

    function buildMonthlySeries(data) {
      var map = {};
      data.forEach(function (row) {
        if (!row.po_date) return;
        var key = row.po_date.getFullYear() + '-' + ('0' + (row.po_date.getMonth() + 1)).slice(-2);
        if (!map[key]) map[key] = { label: row.po_date.toLocaleString('id-ID', { month: 'short', year: '2-digit' }), brutto: 0, netto: 0 };
        map[key].brutto += row.brutto_value || 0;
        map[key].netto += row.netto_value || 0;
      });
      return Object.keys(map).sort().map(function (k) { return map[k]; });
    }

    function buildFunnel(data) {
      var stages = ['Baru', 'Diproses', 'Siap Kirim', 'Dalam Pengiriman', 'Selesai', 'Bermasalah'];
      return stages.map(function (stage) {
        return data.filter(function (row) { return row.status_order === stage; }).length;
      });
    }

    function buildLeakage(data) {
      var brutto = 0, nego = 0, ongkir = 0, fee = 0, netto = 0;
      data.forEach(function (row) {
        brutto += row.brutto_value || 0;
        nego += row.nego_value || 0;
        ongkir += row.ongkir_value || 0;
        fee += row.fee_total || 0;
        netto += row.netto_value || 0;
      });
      return [brutto, nego, ongkir, fee, Math.max(netto - fee, 0)];
    }

    function getOrderAgingDays(row) {
      return bridge.getOrderAgingDays ? bridge.getOrderAgingDays(row) : 0;
    }

    function buildOrderAgingBuckets(data) {
      var labels = ['0-7 hari', '8-14 hari', '15-30 hari', '31-60 hari', '>60 hari'];
      var counts = {};
      labels.forEach(function (label) { counts[label] = 0; });
      data.filter(function (row) { return row.status_order !== 'Selesai'; }).forEach(function (row) {
        var label = bridge.getAgeBucket ? bridge.getAgeBucket(getOrderAgingDays(row), 'order') : '0-7 hari';
        counts[label] = (counts[label] || 0) + 1;
      });
      return { labels: labels, values: labels.map(function (label) { return counts[label] || 0; }) };
    }

    function buildOutstandingByOwner(data) {
      var map = {};
      data.filter(function (row) { return row.status_order !== 'Selesai'; }).forEach(function (row) {
        var key = row.pic_omset || row.penggarap || 'Belum ditetapkan';
        if (!map[key]) map[key] = { owner: key, value: 0, count: 0, overdue: 0 };
        map[key].value += bridge.getOutstandingValue ? bridge.getOutstandingValue(row) : (row.netto_value || 0);
        map[key].count += 1;
        if (row.sla_status === 'Overdue') map[key].overdue += 1;
      });
      return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) { return b.value - a.value; });
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

    function buildOwnerPerformanceRows(data) {
      var map = {};
      data.forEach(function (row) {
        var key = row.pic_omset || row.penggarap || 'Belum ditetapkan';
        if (!map[key]) map[key] = { owner: key, active: 0, completed: 0, ontime: 0, overdue: 0, outstanding: 0, avgAging: 0, _agingTotal: 0, _agingCount: 0 };
        if (row.status_order === 'Selesai') {
          map[key].completed += 1;
          if (row.sla_status === 'On Time') map[key].ontime += 1;
        } else {
          map[key].active += 1;
          map[key].outstanding += bridge.getOutstandingValue ? bridge.getOutstandingValue(row) : (row.netto_value || 0);
          map[key]._agingTotal += getOrderAgingDays(row);
          map[key]._agingCount += 1;
          if (row.sla_status === 'Overdue') map[key].overdue += 1;
        }
      });
      return Object.keys(map).map(function (key) {
        var row = map[key];
        row.avgAging = row._agingCount ? Math.round(row._agingTotal / row._agingCount) : 0;
        row.ontimeRate = row.completed ? (row.ontime / row.completed) * 100 : 0;
        delete row._agingTotal;
        delete row._agingCount;
        return row;
      }).sort(function (a, b) { return b.outstanding - a.outstanding || b.active - a.active || a.owner.localeCompare(b.owner); });
    }

    function buildForecastAccuracyRows() {
      var funnels = bridge.getNormalizedFunnels ? bridge.getNormalizedFunnels() : [];
      var wonFunnels = funnels.filter(function (row) { return /won|deal|menang/i.test(String((row.status || '') + ' ' + (row.stage || ''))); });
      var closedOrders = allOrders.filter(function (row) { return row.status_order === 'Selesai'; });
      var funnelMeta = bridge.getForecastAccuracyRate
        ? bridge.getForecastAccuracyRate(wonFunnels, 'closing', function (row) { return row.targetClosing; }, function (row) { return row.closeDate || row.lastUpdate; })
        : { rate: 0, valid: 0, accurate: 0 };
      var shipmentMeta = bridge.getForecastAccuracyRate
        ? bridge.getForecastAccuracyRate(closedOrders, 'shipment', function (row) { return row.target_arrive_final; }, function (row) { return row.actual_received_date; })
        : { rate: 0, valid: 0, accurate: 0 };
      return [
        { stream: 'Closing Funnel', rate: funnelMeta.rate || 0, valid: funnelMeta.valid || 0, accurate: funnelMeta.accurate || 0 },
        { stream: 'Shipment Selesai', rate: shipmentMeta.rate || 0, valid: shipmentMeta.valid || 0, accurate: shipmentMeta.accurate || 0 }
      ];
    }

    function buildExecutiveSummaryRows() {
      var summary = bridge.getExecutiveSummary ? bridge.getExecutiveSummary() : null;
      if (!summary) return [];
      return [
        { stream: 'Funnel', metric: bridge.formatCompactRupiah(summary.funnel.weighted || 0), note: (summary.funnel.active || 0) + ' aktif • ' + (summary.funnel.stagnant || 0) + ' stagnan', health: Number(summary.funnel.forecastAccuracy || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%' },
        { stream: 'Order', metric: bridge.formatCompactRupiah(summary.order.outstanding || 0), note: (summary.order.active || 0) + ' aktif • ' + (summary.order.overdue || 0) + ' overdue', health: (summary.order.blocked || 0) + ' blocker' },
        { stream: 'Logistik', metric: (summary.logistic.inTransit || 0).toLocaleString('id-ID') + ' in transit', note: (summary.logistic.overdue || 0) + ' overdue • ' + (summary.logistic.noResi || 0) + ' belum resi', health: Number(summary.logistic.forecastAccuracy || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%' }
      ];
    }

    function buildExecutiveExceptionRows() {
      var summary = bridge.getExecutiveSummary ? bridge.getExecutiveSummary() : null;
      if (!summary) return [];
      var rows = (summary.exception.categories || []).map(function (item) {
        return { category: item.category, orders: item.orders, outstanding: item.outstanding, note: 'Open ' + (summary.exception.open || 0) + ' • Kritis ' + (summary.exception.critical || 0) + ' • Overdue ' + (summary.exception.overdue || 0) };
      });
      if (!rows.length) {
        rows = [{ category: 'Belum ada exception dominan', orders: summary.exception.open || 0, outstanding: 0, note: 'Kritis ' + (summary.exception.critical || 0) + ' • Overdue ' + (summary.exception.overdue || 0) }];
      }
      return rows.slice(0, 5);
    }

    function createOrUpdateChart(key, canvasId, configFactory) {
      var canvas = document.getElementById(canvasId);
      if (!canvas || typeof Chart === 'undefined') return;
      if (charts[key]) charts[key].destroy();
      charts[key] = new Chart(canvas.getContext('2d'), configFactory());
    }

    function renderCharts(data) {
      var colors = getThemeColors();
      var monthly = buildMonthlySeries(data);
      createOrUpdateChart('trend', 'opsTrendBruttoNettoChart', function () {
        return {
          type: 'bar',
          data: {
            labels: monthly.map(function (x) { return x.label; }),
            datasets: [
              { type: 'bar', label: 'Brutto', data: monthly.map(function (x) { return x.brutto; }), backgroundColor: colors.primary, borderRadius: 6 },
              { type: 'line', label: 'Netto', data: monthly.map(function (x) { return x.netto; }), borderColor: colors.success, backgroundColor: colors.success, borderWidth: 3, tension: 0.35 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: colors.text } } },
            scales: {
              x: { ticks: { color: colors.muted }, grid: { display: false } },
              y: { ticks: { color: colors.muted, callback: function (v) { return bridge.formatCompactRupiah(v); } }, grid: { color: colors.grid } }
            }
          }
        };
      });

      createOrUpdateChart('funnel', 'opsOrderFunnelChart', function () {
        return {
          type: 'bar',
          data: { labels: ['Baru', 'Diproses', 'Siap Kirim', 'Dalam Pengiriman', 'Selesai', 'Bermasalah'], datasets: [{ label: 'Jumlah PO', data: buildFunnel(data), backgroundColor: [colors.primary, colors.primary, colors.warning, colors.warning, colors.success, colors.danger], borderRadius: 6 }] },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: colors.muted }, grid: { color: colors.grid } }, y: { ticks: { color: colors.text }, grid: { display: false } } } }
        };
      });

      createOrUpdateChart('leakage', 'opsLeakageChart', function () {
        return {
          type: 'doughnut',
          data: { labels: ['Brutto', 'Negosiasi', 'Biaya Kirim', 'Fee', 'Netto Efektif'], datasets: [{ data: buildLeakage(data), backgroundColor: [colors.primary, colors.warning, '#6f42c1', '#20c997', colors.success], borderWidth: 0 }] },
          options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: colors.text, boxWidth: 12 } } } }
        };
      });

      var agingBuckets = buildOrderAgingBuckets(data);
      createOrUpdateChart('aging', 'opsOrderAgingChart', function () {
        return {
          type: 'bar',
          data: { labels: agingBuckets.labels, datasets: [{ label: 'Jumlah order', data: agingBuckets.values, backgroundColor: [colors.success, '#39afd1', colors.warning, '#6f42c1', colors.danger], borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: colors.text }, grid: { display: false } }, y: { ticks: { color: colors.muted }, grid: { color: colors.grid } } } }
        };
      });

      var backlogOwner = buildOutstandingByOwner(data).slice(0, 6);
      createOrUpdateChart('backlogOwner', 'opsBacklogOwnerChart', function () {
        return {
          type: 'bar',
          data: { labels: backlogOwner.map(function (item) { return item.owner; }), datasets: [{ label: 'Outstanding Netto', data: backlogOwner.map(function (item) { return item.value; }), backgroundColor: colors.primary, borderRadius: 6 }] },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: colors.muted, callback: function (v) { return bridge.formatCompactRupiah(v); } }, grid: { color: colors.grid } }, y: { ticks: { color: colors.text }, grid: { display: false } } } }
        };
      });

      var shipmentForecast = buildShipmentForecastRows(data);
      createOrUpdateChart('shipmentForecast', 'opsShipmentForecastChart', function () {
        return {
          type: 'bar',
          data: {
            labels: shipmentForecast.map(function (item) { return item.bucket; }),
            datasets: [
              { label: 'Jumlah Order', data: shipmentForecast.map(function (item) { return item.count; }), backgroundColor: colors.success, borderRadius: 6, yAxisID: 'y' },
              { label: 'Outstanding Netto', data: shipmentForecast.map(function (item) { return item.outstanding; }), backgroundColor: colors.warning, borderRadius: 6, yAxisID: 'y1' }
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

      var forecastAccuracy = buildForecastAccuracyRows();
      createOrUpdateChart('forecastAccuracy', 'opsForecastAccuracyChart', function () {
        return {
          type: 'bar',
          data: {
            labels: forecastAccuracy.map(function (item) { return item.stream; }),
            datasets: [
              { label: 'Accuracy %', data: forecastAccuracy.map(function (item) { return item.rate; }), backgroundColor: colors.primary, borderRadius: 6, yAxisID: 'y' },
              { label: 'Valid Sample', data: forecastAccuracy.map(function (item) { return item.valid; }), backgroundColor: colors.success, borderRadius: 6, yAxisID: 'y1' }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: colors.text } } },
            scales: {
              x: { ticks: { color: colors.text }, grid: { display: false } },
              y: { position: 'left', max: 100, ticks: { color: colors.muted, callback: function (v) { return v + '%'; } }, grid: { color: colors.grid } },
              y1: { position: 'right', ticks: { color: colors.muted }, grid: { display: false } }
            }
          }
        };
      });
    }

    function createTable(key, containerId, columns, data, options) {
      var container = document.getElementById(containerId);
      if (!container || typeof Tabulator === 'undefined') {
        bridge.createEmptyMessage(containerId, 'Tabulator belum tersedia.');
        return;
      }
      if (tables[key]) tables[key].destroy();
      tables[key] = new Tabulator('#' + containerId, Object.assign({
        data: data,
        layout: 'fitColumns',
        responsiveLayout: false,
        movableColumns: true,
        paginationButtonCount: 5,
        paginationCounter: 'rows',
        placeholder: 'Belum ada data',
        columns: columns
      }, options || {}));
    }

    function renderTables(data) {
      var moneyCol = function (title, field, width) {
        return { title: title, field: field, minWidth: width || 130, hozAlign: 'right', formatter: function (cell) { return bridge.formatCompactRupiah(cell.getValue()); } };
      };
      var badgeFormatter = function (map, fallback) { return function (cell) {
        var v = cell.getValue();
        var cls = map[v] || fallback || 'primary';
        return '<span class="badge bg-' + cls + '-subtle text-' + cls + ' border border-' + cls + '">' + v + '</span>';
      }; };

      var actionRows = data.filter(function (row) {
        return row.risk_flag || row.data_completeness !== 'Lengkap' || row.document_completeness !== 'Lengkap' || row.sla_status === 'Overdue';
      }).map(function (row) {
        return {
          po_number: row.po_number,
          po_date: row.po_date,
          instansi: row.instansi,
          principal: row.principal,
          issue: row.issue_note || (row.data_completeness !== 'Lengkap' ? 'Data belum lengkap' : (row.document_completeness !== 'Lengkap' ? 'Dokumen belum lengkap' : 'Perlu tindak lanjut')),
          pic: row.pic_omset,
          priority: row.sla_status === 'Overdue' ? 'Tinggi' : (row.risk_flag ? 'Sedang' : 'Normal'),
          updated_at: row.last_update_at
        };
      });

      createTable('opsAction', 'opsActionNeededTable', [
        { title: 'No PO', field: 'po_number', minWidth: 130, widthGrow: 1.1, frozen: true, cssClass: 'fw-bold text-primary' },
        { title: 'Instansi', field: 'instansi', minWidth: 240, widthGrow: 2 },
        { title: 'Principal', field: 'principal', minWidth: 130, widthGrow: 1 },
        { title: 'Masalah', field: 'issue', minWidth: 260, widthGrow: 2 },
        { title: 'PIC', field: 'pic', minWidth: 110, widthGrow: 0.9 },
        { title: 'Prioritas', field: 'priority', minWidth: 120, widthGrow: 0.9, hozAlign: 'center', formatter: badgeFormatter({ 'Tinggi': 'danger', 'Sedang': 'warning', 'Normal': 'primary' }) },
        { title: 'Update Terakhir', field: 'updated_at', minWidth: 170, widthGrow: 1.2, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleString('id-ID') : '-'; } },
        { title: 'Aksi', field: 'po_number', minWidth: 140, widthGrow: 0.8, hozAlign: 'center', formatter: function (cell) {
          var po = cell.getRow().getData().po_number || '';
          return '<button class="btn btn-sm btn-outline-primary bg-surface ops-order-action-btn" data-po="' + po + '">Lihat / Update</button>';
        } }
      ], actionRows, { pagination: true, paginationSize: 10 });

      createTable('opsActive', 'opsActiveOrdersTable', [
        { title: 'No PO', field: 'po_number', minWidth: 130, frozen: true, cssClass: 'fw-bold text-primary' },
        { title: 'Tanggal PO', field: 'po_date', minWidth: 120, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleDateString('id-ID') : '-'; } },
        { title: 'Instansi / Satker', field: 'instansi', minWidth: 220 },
        { title: 'Principal', field: 'principal', minWidth: 120 },
        { title: 'Pemasok', field: 'pemasok', minWidth: 160 },
        { title: 'Pelaksana', field: 'pelaksana', minWidth: 160 },
        { title: 'PIC', field: 'pic_omset', minWidth: 120 },
        moneyCol('Brutto', 'brutto_value'),
        moneyCol('Netto', 'netto_value'),
        moneyCol('Nego', 'nego_value'),
        { title: 'Status Pesanan', field: 'status_order', minWidth: 140, formatter: badgeFormatter({ 'Baru': 'primary', 'Diproses': 'warning', 'Siap Kirim': 'info', 'Dalam Pengiriman': 'primary', 'Selesai': 'success', 'Bermasalah': 'danger' }) },
        { title: 'Status Kirim', field: 'shipping_status', minWidth: 150, formatter: badgeFormatter({ 'Belum Diproses': 'primary', 'Penyiapan': 'warning', 'Dalam Perjalanan': 'primary', 'Tiba': 'success', 'Selesai': 'success', 'Terkendala': 'danger' }) },
        { title: 'Kelengkapan', field: 'data_completeness', minWidth: 140, formatter: function (cell) {
          var value = cell.getValue();
          var cls = value === 'Lengkap' ? 'success' : 'warning';
          return '<span class="badge bg-' + cls + '-subtle text-' + cls + ' border border-' + cls + '">' + value + '</span>';
        } },
        { title: 'Aksi', field: 'po_number', minWidth: 130, hozAlign: 'center', formatter: function (cell) {
          var po = cell.getRow().getData().po_number || '';
          return '<button class="btn btn-sm btn-outline-primary bg-surface ops-order-action-btn" data-po="' + po + '">Detail</button>';
        } }
      ], data, { pagination: true, paginationSize: 10 });

      var backlogRows = buildOutstandingByOwner(data).slice(0, 5);
      createTable('opsBacklog', 'opsBacklogTable', [
        { title: 'PIC', field: 'owner', minWidth: 160, cssClass: 'fw-semibold text-primary' },
        { title: 'Outstanding Netto', field: 'value', minWidth: 150, hozAlign: 'right', formatter: function (cell) { return bridge.formatCompactRupiah(cell.getValue()); } },
        { title: 'Jumlah Order', field: 'count', width: 110, hozAlign: 'right' },
        { title: 'Overdue', field: 'overdue', width: 100, hozAlign: 'right' }
      ], backlogRows, { pagination: false, layout: 'fitColumns' });

      var ownerPerformanceRows = buildOwnerPerformanceRows(data).slice(0, 8);
      createTable('opsOwnerPerformance', 'opsOwnerPerformanceTable', [
        { title: 'Owner', field: 'owner', minWidth: 150, cssClass: 'fw-semibold text-primary' },
        { title: 'Aktif', field: 'active', width: 80, hozAlign: 'right' },
        { title: 'Overdue', field: 'overdue', width: 90, hozAlign: 'right' },
        { title: 'Outstanding', field: 'outstanding', minWidth: 130, hozAlign: 'right', formatter: function (cell) { return bridge.formatCompactRupiah(cell.getValue()); } },
        { title: 'OTIF', field: 'ontimeRate', width: 90, hozAlign: 'right', formatter: function (cell) { return Number(cell.getValue() || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%'; } }
      ], ownerPerformanceRows, { pagination: false, layout: 'fitColumns' });

      var upcomingShipments = data.filter(function (row) { return row.status_order !== 'Selesai'; }).map(function (row) {
        var forecastDate = bridge.getShipmentForecastDate ? bridge.getShipmentForecastDate(row) : (row.target_arrive_final || row.target_prep_date || null);
        return {
          po_number: row.po_number,
          instansi: row.instansi,
          pic: row.pic_omset,
          status: row.shipping_status,
          forecast_date: forecastDate,
          days_left: bridge.getDaysUntil ? bridge.getDaysUntil(forecastDate, new Date()) : null,
          outstanding: bridge.getOutstandingValue ? bridge.getOutstandingValue(row) : (row.netto_value || 0)
        };
      }).sort(function (a, b) {
        var at = a.forecast_date && a.forecast_date.getTime ? a.forecast_date.getTime() : Number.MAX_SAFE_INTEGER;
        var bt = b.forecast_date && b.forecast_date.getTime ? b.forecast_date.getTime() : Number.MAX_SAFE_INTEGER;
        return at - bt;
      }).slice(0, 8);
      createTable('opsUpcomingShipment', 'opsUpcomingShipmentTable', [
        { title: 'No PO', field: 'po_number', minWidth: 120, cssClass: 'fw-semibold text-primary' },
        { title: 'Instansi', field: 'instansi', minWidth: 180 },
        { title: 'PIC', field: 'pic', minWidth: 100 },
        { title: 'Target', field: 'forecast_date', minWidth: 110, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleDateString('id-ID') : '-'; } },
        { title: 'Sisa', field: 'days_left', width: 85, hozAlign: 'right', formatter: function (cell) { var v = cell.getValue(); return (v == null || isNaN(v)) ? '-' : v + ' hari'; } },
        { title: 'Outstanding', field: 'outstanding', minWidth: 120, hozAlign: 'right', formatter: function (cell) { return bridge.formatCompactRupiah(cell.getValue()); } }
      ], upcomingShipments, { pagination: false, layout: 'fitColumns' });

      createTable('opsExecutiveSummary', 'opsExecutiveSummaryTable', [
        { title: 'Stream', field: 'stream', minWidth: 110, cssClass: 'fw-semibold text-primary' },
        { title: 'Headline', field: 'metric', minWidth: 130 },
        { title: 'Risiko', field: 'note', minWidth: 180 },
        { title: 'Health', field: 'health', minWidth: 100, hozAlign: 'right' }
      ], buildExecutiveSummaryRows(), { pagination: false, layout: 'fitColumns' });

      createTable('opsExecutiveException', 'opsExecutiveExceptionTable', [
        { title: 'Kategori', field: 'category', minWidth: 180, cssClass: 'fw-semibold text-primary' },
        { title: 'Order', field: 'orders', width: 80, hozAlign: 'right' },
        { title: 'Outstanding', field: 'outstanding', minWidth: 110, hozAlign: 'right', formatter: function (cell) { return bridge.formatCompactRupiah(cell.getValue()); } },
        { title: 'Ringkas', field: 'note', minWidth: 200 }
      ], buildExecutiveExceptionRows(), { pagination: false, layout: 'fitColumns' });

      var recentActivity = data.slice().sort(function (a, b) {
        return (b.last_update_at?.getTime?.() || 0) - (a.last_update_at?.getTime?.() || 0);
      }).map(function (row) {
        return {
          po_number: row.po_number,
          activity: row.issue_note ? 'Update status & kendala' : 'Perubahan data pesanan',
          actor: row.pic_omset,
          updated_at: row.last_update_at,
          summary: row.issue_note || ('Status order: ' + row.status_order + ' / Status kirim: ' + row.shipping_status)
        };
      });

      latestActivityRows = recentActivity;

      createTable('opsActivity', 'opsActivityLogTable', [
        { title: 'No PO', field: 'po_number', minWidth: 130, widthGrow: 1, cssClass: 'fw-bold text-primary' },
        { title: 'Aktivitas', field: 'activity', minWidth: 230, widthGrow: 1.4 },
        { title: 'PIC', field: 'actor', minWidth: 120, widthGrow: 0.8 },
        { title: 'Waktu', field: 'updated_at', minWidth: 190, widthGrow: 1.1, formatter: function (cell) { var d = cell.getValue(); return d instanceof Date ? d.toLocaleString('id-ID') : '-'; } },
        { title: 'Ringkasan', field: 'summary', minWidth: 420, widthGrow: 2 }
      ], recentActivity, { pagination: true, paginationSize: 10 });
    }

    function wireTableSearch(inputId, tableKey, fields) {
      var input = document.getElementById(inputId);
      if (!input) return;
      input.addEventListener('input', function () {
        var tbl = tables[tableKey];
        if (!tbl) return;
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
      setTimeout(function(){ tbl.redraw(true); }, 40);
    }

    function renderKpis(summary) {
      setText('ops-kpi-total-orders', summary.totalOrders.toLocaleString('id-ID'));
      setText('ops-kpi-brutto', bridge.formatCompactRupiah(summary.brutto));
      setText('ops-kpi-netto', bridge.formatCompactRupiah(summary.netto));
      setText('ops-kpi-nego', bridge.formatCompactRupiah(summary.nego));
      setText('ops-kpi-margin', bridge.formatPercent(summary.marginPct));
      setText('ops-kpi-outstanding', summary.outstanding.toLocaleString('id-ID'));
      setText('ops-kpi-new', summary.newly.toLocaleString('id-ID'));
      setText('ops-kpi-processing', summary.processing.toLocaleString('id-ID'));
      setText('ops-kpi-ready', summary.ready.toLocaleString('id-ID'));
      setText('ops-kpi-problem', summary.problem.toLocaleString('id-ID'));
      setText('ops-kpi-aging', summary.avgAgingDays.toLocaleString('id-ID') + ' hari');
      setText('ops-kpi-overdue', summary.overdue.toLocaleString('id-ID'));
      setText('ops-kpi-outstanding-netto', bridge.formatCompactRupiah(summary.outstandingNetto));
      setText('ops-kpi-top-pic', summary.topBacklogOwnerLabel || '-');
      setText('ops-incomplete-data', summary.incompleteData.toLocaleString('id-ID'));
      setText('ops-incomplete-docs', summary.incompleteDocs.toLocaleString('id-ID'));
      setText('ops-invalid-target', summary.invalidTarget.toLocaleString('id-ID'));
      setText('ops-no-calculation', summary.noCalc.toLocaleString('id-ID'));
    }

    function refresh() {
      var filtered = applyFilters();
      latestFiltered = filtered.slice();
      renderKpis(summarize(filtered));
      renderCharts(filtered);
      renderTables(filtered);
      initTooltips();
      try { window.dispatchEvent(new CustomEvent('ds:dashboard-rendered', { detail: { page: 'index.html', records: filtered.length } })); } catch (_error) {}
    }

    function resetFilters() {
      var defaults = {
        'ops-filter-period': 'Bulan Ini',
        'ops-filter-region': 'Semua Wilayah',
        'ops-filter-satker': 'Semua Satker',
        'ops-filter-principal': 'Semua Principal',
        'ops-filter-supplier': 'Semua Pemasok',
        'ops-filter-executor': 'Semua Pelaksana',
        'ops-filter-pic': 'Semua PIC',
        'ops-filter-order-status': 'Semua Status',
        'ops-filter-completeness': 'Semua'
      };
      Object.keys(defaults).forEach(function (id) {
        var el = document.getElementById(id); if (el) el.value = defaults[id];
      });
      var search = document.getElementById('ops-filter-search');
      if (search) search.value = '';
      var tblSearch1 = document.getElementById('ops-active-orders-search'); if (tblSearch1) tblSearch1.value = '';
      var tblSearch2 = document.getElementById('ops-action-needed-search'); if (tblSearch2) tblSearch2.value = '';
      refresh();
    }

    refreshFilterOptions(allOrders);
    ['ops-filter-period', 'ops-filter-region', 'ops-filter-satker', 'ops-filter-principal', 'ops-filter-supplier', 'ops-filter-executor', 'ops-filter-pic', 'ops-filter-order-status', 'ops-filter-completeness', 'ops-filter-search'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', refresh);
    });

    ['ops-reset-filters-top', 'ops-reset-filters-toolbar', 'ops-reset-filters-modal'].forEach(function (id) {
      var btn = document.getElementById(id); if (btn) btn.addEventListener('click', resetFilters);
    });

    wireTableSearch('ops-active-orders-search', 'opsActive', ['po_number', 'instansi', 'principal', 'pemasok', 'pelaksana']);
    wireTableSearch('ops-action-needed-search', 'opsAction', ['po_number', 'instansi', 'issue', 'pic']);
    var opsActiveSearch = document.getElementById('ops-active-orders-search'); if (opsActiveSearch) { opsActiveSearch.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); applyQuickTableFilter('ops-active-orders-search', 'opsActive', ['po_number', 'instansi', 'principal', 'pemasok', 'pelaksana']); } }); }
    var opsActionSearch = document.getElementById('ops-action-needed-search'); if (opsActionSearch) { opsActionSearch.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); applyQuickTableFilter('ops-action-needed-search', 'opsAction', ['po_number', 'instansi', 'issue', 'pic']); } }); }


    var activityViewAllBtn = document.getElementById('ops-activity-view-all');
    if (activityViewAllBtn) {
      activityViewAllBtn.addEventListener('click', openActivityModal);
    }

    document.addEventListener('click', function (e) {
      var orderBtn = e.target.closest('.ops-order-action-btn');
      if (orderBtn) {
        e.preventDefault();
        openOrderActionModal(orderBtn.getAttribute('data-po'));
      }
    });

    var opsActionQuickBtn = document.getElementById('ops-action-needed-filter-quick');
    if (opsActionQuickBtn) {
      opsActionQuickBtn.addEventListener('click', function () {
        applyQuickTableFilter('ops-action-needed-search', 'opsAction', ['po_number', 'instansi', 'issue', 'pic']);
      });
    }
    var opsActiveQuickBtn = document.getElementById('ops-active-orders-filter-quick');
    if (opsActiveQuickBtn) {
      opsActiveQuickBtn.addEventListener('click', function () {
        applyQuickTableFilter('ops-active-orders-search', 'opsActive', ['po_number', 'instansi', 'principal', 'pemasok', 'pelaksana']);
      });
    }

    refresh();

    var observer = new MutationObserver(function () { renderCharts(applyFilters()); initTooltips(); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initOperationalDashboard);
  else initOperationalDashboard();
  window.initOperationalDashboard = initOperationalDashboard;
})();