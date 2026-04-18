(function(){
  const state = { charts: [], tables: [] };
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const SUPPLIER_BY_PRINCIPAL = {
    Lenovo: 'PT Sumber Teknologi Nusantara',
    HP: 'PT Inovasi Digital Mandiri',
    Asus: 'PT Cipta Elektronik Nusantara',
    Acer: 'PT Global Komputindo',
    Epson: 'PT Print Solusi Indonesia',
    Canon: 'PT Nusantara Imaging Supply',
    Brother: 'PT Kantor Cerdas Abadi'
  };

  const getRows = () => Array.isArray(window.__APP_PESANAN_ROWS) ? window.__APP_PESANAN_ROWS.map(r => ({
    ...r,
    pemasok: r.pemasok || SUPPLIER_BY_PRINCIPAL[r.principal] || `PT ${r.principal || 'Pemasok'} Indonesia`
  })) : [];

  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const fmtPct = (n, d = 1) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n) || 0) + '%';
  const colorSet = () => {
    const dark = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
    return { grid: dark ? '#222834' : '#e3ebf6', tick: dark ? '#b3c0d1' : '#5e6e82' };
  };
  const destroyAll = () => {
    state.charts.forEach(c => c && c.destroy && c.destroy());
    state.tables.forEach(t => t && t.destroy && t.destroy());
    state.charts = [];
    state.tables = [];
  };
  const makeChart = (id, config) => {
    const el = document.getElementById(id);
    if (!el || typeof Chart === 'undefined') return null;
    const chart = new Chart(el.getContext('2d'), config);
    state.charts.push(chart);
    return chart;
  };
  const createTable = (id, columns, rows, opts = {}) => {
    if (typeof Tabulator === 'undefined') return;
    const el = document.getElementById(id);
    if (!el) return;
    if (el._tabulator) el._tabulator.destroy();
    const table = new Tabulator(el, {
      data: rows,
      layout: opts.layout || 'fitColumns',
      responsiveLayout: false,
      placeholder: 'Belum ada data',
      pagination: opts.pagination ?? true,
      paginationSize: opts.paginationSize || 7,
      movableColumns: false,
      headerSort: false,
      rowHeight: 46,
      columns
    });
    state.tables.push(table);
  };

  function getReferenceDate(rows) {
    const dated = rows.map(r => new Date(r.tgl_iso || r.last_update_iso || Date.now())).filter(d => !isNaN(d));
    return dated.length ? new Date(Math.max(...dated.map(d => d.getTime()))) : new Date();
  }
  function isSameMonth(date, ref) {
    return date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
  }
  function startOfMonthsBack(ref, monthsBack) {
    return new Date(ref.getFullYear(), ref.getMonth() - monthsBack, 1);
  }
  function riskStatus(row) {
    const overdue = row.sla_target_iso && row.eta_iso && new Date(row.eta_iso) > new Date(row.sla_target_iso) && !row.on_time;
    if (overdue) return 'Overdue';
    if (row.risiko === 'SLA Rawan' || ['Prioritas','Kritis','Perlu Follow Up'].includes(row.resi_status)) return 'Rawan';
    return 'On Track';
  }

  function applyFilters(baseRows) {
    const ref = getReferenceDate(baseRows);
    const period = document.getElementById('filter-log-period')?.value || 'month';
    const region = document.getElementById('filter-log-region')?.value || '';
    const supplier = document.getElementById('filter-log-supplier')?.value || '';
    const vendor = document.getElementById('filter-log-vendor')?.value || '';
    const status = document.getElementById('filter-log-status')?.value || '';
    const sla = document.getElementById('filter-log-sla')?.value || '';
    const pic = document.getElementById('filter-log-pic')?.value || '';

    return baseRows.filter(row => {
      const dt = new Date(row.tgl_iso || row.last_update_iso || Date.now());
      if (period === 'month' && !isSameMonth(dt, ref)) return false;
      if (period === '3months' && dt < startOfMonthsBack(ref, 2)) return false;
      if (period === 'year' && dt.getFullYear() !== ref.getFullYear()) return false;
      if (region && row.wilayah !== region) return false;
      if (supplier && row.pemasok !== supplier) return false;
      if (vendor && row.ekspedisi !== vendor) return false;
      if (status && (row.shipment_stage !== status && row.shipment_status !== status)) return false;
      if (sla && riskStatus(row) !== sla) return false;
      if (pic && row.pic !== pic) return false;
      return true;
    });
  }

  function populateSelect(id, values) {
    const el = document.getElementById(id);
    if (!el) return;
    const first = el.querySelector('option');
    const firstValue = first ? first.value : '';
    const firstText = first ? first.textContent : 'Semua';
    const current = el.value;
    el.innerHTML = `<option value="${firstValue}">${firstText}</option>` + values.map(v => `<option value="${String(v).replace(/"/g,'&quot;')}">${v}</option>`).join('');
    if (values.includes(current)) el.value = current;
  }
  function hydrateFilterOptions() {
    const rows = getRows();
    const unique = key => Array.from(new Set(rows.map(r => r[key]).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
    populateSelect('filter-log-region', unique('wilayah'));
    populateSelect('filter-log-supplier', unique('pemasok'));
    populateSelect('filter-log-vendor', unique('ekspedisi'));
    populateSelect('filter-log-status', Array.from(new Set(rows.map(r => r.shipment_stage || r.shipment_status).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b))));
    populateSelect('filter-log-pic', unique('pic'));
  }

  function complianceBuckets(rows) {
    const map = {};
    rows.forEach(r => {
      const d = new Date(r.tgl_iso || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      if (!map[key]) map[key] = { label: MONTHS[d.getMonth()], total: 0, ontime: 0 };
      map[key].total += 1;
      if (r.on_time && r.in_full) map[key].ontime += 1;
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).map(([,v]) => ({ label: v.label, pct: v.total ? (v.ontime / v.total) * 100 : 0 }));
  }

  function aggregate(filteredRows) {
    const active = filteredRows.filter(r => !['Closed'].includes(r.shipment_stage) && !['Closing'].includes(r.status));
    const delivered = filteredRows.filter(r => ['Tiba','BAST','Closed'].includes(r.shipment_stage) || ['Selesai','Closing'].includes(r.status));
    const otif = delivered.length ? delivered.filter(r => r.on_time && r.in_full).length / delivered.length * 100 : 0;
    const onTime = filteredRows.filter(r => riskStatus(r) === 'On Track').length;
    const risk = filteredRows.filter(r => riskStatus(r) === 'Rawan').length;
    const overdue = filteredRows.filter(r => riskStatus(r) === 'Overdue').length;
    const leadRows = filteredRows.filter(r => Number(r.lead_time) > 0);
    const lead = leadRows.length ? leadRows.reduce((s,r)=>s+Number(r.lead_time||0),0) / leadRows.length : 0;
    const compliance = complianceBuckets(filteredRows.filter(r => Number(r.lead_time) > 0));
    const stageOrder = ['Belum Diproses','Packing','Siap Kirim','Perjalanan','Tiba','BAST','Closed'];
    const backlogValues = stageOrder.map(stage => filteredRows.filter(r => (r.shipment_stage || r.shipment_status) === stage).length);

    const vendors = Object.values(filteredRows.reduce((acc, r) => {
      const key = r.ekspedisi || '-';
      if (!acc[key]) acc[key] = { vendor: key, shipment: 0, on: 0, lead: 0, leadCount: 0, klaim: 0 };
      acc[key].shipment += 1;
      if (r.on_time) acc[key].on += 1;
      if (Number(r.lead_time) > 0) { acc[key].lead += Number(r.lead_time); acc[key].leadCount += 1; }
      acc[key].klaim += Number(r.claim_count || 0);
      return acc;
    }, {})).map(v => ({ vendor: v.vendor, shipment: v.shipment, sla: v.shipment ? (v.on / v.shipment) * 100 : 0, lead: v.leadCount ? (v.lead / v.leadCount) : 0, klaim: v.klaim })).sort((a,b)=>b.sla-a.sla);

    const vendorChartLabels = vendors.slice(0, 5).map(v => v.vendor);
    const vendorChartValues = vendors.slice(0, 5).map(v => Number(v.sla.toFixed(1)));

    const causeMap = {};
    filteredRows.filter(r => r.delay_cause).forEach(r => { causeMap[r.delay_cause] = (causeMap[r.delay_cause] || 0) + 1; });
    const delayCauseLabels = Object.keys(causeMap);
    const delayCauseValues = delayCauseLabels.map(k => causeMap[k]);
    const topDelay = delayCauseLabels.length ? delayCauseLabels.sort((a,b)=>causeMap[b]-causeMap[a])[0] : '-';

    const monitoring = filteredRows.map(r => ({
      po: r.po,
      satker: r.satker,
      principal: r.principal,
      pemasok: r.pemasok,
      vendor: r.ekspedisi,
      tglKontrak: r.tgl,
      eta: r.eta,
      sla: r.sla_target,
      status: r.shipment_stage || r.shipment_status,
      updated: r.last_update,
      pic: r.pic,
      risiko: riskStatus(r)
    })).sort((a,b)=>String(b.updated).localeCompare(String(a.updated)));

    const resi = filteredRows.filter(r => r.resi && r.resi !== '-' && r.resi_status && r.resi_status !== 'Normal').map(r => ({
      resi: r.resi,
      vendor: r.ekspedisi,
      po: r.po,
      pemasok: r.pemasok,
      lastUpdate: r.resi_last_update,
      aging: r.resi_aging_hours ? `>${r.resi_aging_hours} jam` : '-',
      status: r.resi_status
    }));

    const ref = getReferenceDate(filteredRows);
    const h7 = filteredRows.filter(r => r.sla_target_iso).filter(r => {
      const diff = Math.ceil((new Date(r.sla_target_iso) - ref) / 86400000);
      return diff >= 4 && diff <= 7;
    }).length;
    const h3 = filteredRows.filter(r => r.sla_target_iso).filter(r => {
      const diff = Math.ceil((new Date(r.sla_target_iso) - ref) / 86400000);
      return diff >= 2 && diff <= 3;
    }).length;
    const h1 = filteredRows.filter(r => r.sla_target_iso).filter(r => {
      const diff = Math.ceil((new Date(r.sla_target_iso) - ref) / 86400000);
      return diff >= 0 && diff <= 1;
    }).length;
    const resiStale = filteredRows.filter(r => Number(r.resi_aging_hours || 0) >= 24).length;
    const claimTotal = filteredRows.reduce((s,r)=>s+Number(r.claim_count || 0), 0);
    const bestVendor = vendors[0]?.vendor || '-';

    return {
      active: active.length, otif, onTime, risk, overdue, lead,
      complianceLabels: compliance.map(x => x.label), complianceActual: compliance.map(x => Number(x.pct.toFixed(1))), complianceTarget: compliance.map(() => 92),
      backlogLabels: stageOrder, backlogValues,
      vendorChartLabels, vendorChartValues,
      delayCauseLabels, delayCauseValues, topDelay,
      monitoring, vendors, resi,
      h7, h3, h1, resiStale, claimTotal, bestVendor
    };
  }

  function badgeStatus(v) {
    const map = { 'On Track':'success', Rawan:'warning', Overdue:'danger', Perjalanan:'primary', Packing:'warning', 'Siap Kirim':'info', 'Belum Diproses':'secondary', Tiba:'success', BAST:'success', Closed:'success', 'Perlu Follow Up':'primary', Prioritas:'warning', Kritis:'danger', 'Belum Ada Resi':'secondary' };
    const tone = map[v] || 'secondary';
    return `<span class="badge bg-${tone}-subtle text-${tone} border border-${tone}-subtle">${v}</span>`;
  }

  function render() {
    destroyAll();
    if (!document.getElementById('slaComplianceChart')) return;
    const filteredRows = applyFilters(getRows());
    const data = aggregate(filteredRows);
    const colors = colorSet();

    setText('kpi-shipment-active', new Intl.NumberFormat('id-ID').format(data.active));
    setText('kpi-otif', fmtPct(data.otif,1));
    setText('kpi-on-time', new Intl.NumberFormat('id-ID').format(data.onTime));
    setText('kpi-risk-sla', new Intl.NumberFormat('id-ID').format(data.risk));
    setText('kpi-overdue', new Intl.NumberFormat('id-ID').format(data.overdue));
    setText('kpi-lead-time', new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(data.lead) + ' hari');
    setText('log-best-vendor', data.bestVendor);
    setText('log-top-delay', data.topDelay);
    setText('log-due-7', new Intl.NumberFormat('id-ID').format(data.h7));
    setText('log-due-3', new Intl.NumberFormat('id-ID').format(data.h3));
    setText('log-due-1', new Intl.NumberFormat('id-ID').format(data.h1));
    setText('log-due-over', new Intl.NumberFormat('id-ID').format(data.overdue));
    setText('log-resi-stale', new Intl.NumberFormat('id-ID').format(data.resiStale));
    setText('log-claim-total', new Intl.NumberFormat('id-ID').format(data.claimTotal));

    makeChart('slaComplianceChart', {
      type: 'line',
      data: { labels: data.complianceLabels, datasets: [
        { label: 'SLA Aktual', data: data.complianceActual, borderColor: '#2c7be5', backgroundColor: 'rgba(44,123,229,0.12)', fill: true, tension: .35, borderWidth: 3, pointRadius: 3 },
        { label: 'Target', data: data.complianceTarget, borderColor: '#00d27a', backgroundColor: 'transparent', borderDash: [6,6], tension: 0, borderWidth: 2, pointRadius: 0 }
      ] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: colors.tick, usePointStyle: true } } }, scales: { y: { grid: { color: colors.grid }, ticks: { color: colors.tick, callback: v => `${v}%` }, suggestedMin: 70, suggestedMax: 100 }, x: { grid: { display:false }, ticks: { color: colors.tick } } } }
    });

    makeChart('backlogStageChart', {
      type: 'doughnut',
      data: { labels: data.backlogLabels, datasets: [{ data: data.backlogValues, backgroundColor: ['#adb5bd','#f6ad55','#17a2b8','#2c7be5','#00d27a','#20c997','#198754'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }
    });

    makeChart('slaVendorRegionChart', {
      type: 'bar',
      data: { labels: data.vendorChartLabels, datasets: [{ label: 'SLA %', data: data.vendorChartValues, backgroundColor: '#2c7be5', borderRadius: 8 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display:false } }, scales: { x: { grid: { color: colors.grid }, ticks: { color: colors.tick, callback: v => `${v}%` }, suggestedMin: 60, suggestedMax: 100 }, y: { grid: { display:false }, ticks: { color: colors.tick } } } }
    });

    makeChart('delayCauseChart', {
      type: 'doughnut',
      data: { labels: data.delayCauseLabels, datasets: [{ data: data.delayCauseValues, backgroundColor: ['#e63757','#f5803e','#2c7be5','#6f42c1','#20c997','#adb5bd'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }
    });

    createTable('vendorPerformanceTable', [
      { title:'Vendor', field:'vendor', minWidth:150 },
      { title:'Shipment', field:'shipment', hozAlign:'center', width:90 },
      { title:'SLA', field:'sla', hozAlign:'right', formatter: cell => fmtPct(cell.getValue(),1) },
      { title:'Lead Time', field:'lead', hozAlign:'right', formatter: cell => `${Number(cell.getValue()).toFixed(1)} hari` },
      { title:'Klaim', field:'klaim', hozAlign:'center', width:80 }
    ], data.vendors, { pagination:true, paginationSize:6 });

    createTable('shipmentMonitoringGrid', [
      { title:'No PO', field:'po', width:120, cssClass:'fw-bold text-primary' },
      { title:'Satker / Instansi', field:'satker', minWidth:220 },
      { title:'Principal', field:'principal', width:120 },
      { title:'Pemasok', field:'pemasok', minWidth:200 },
      { title:'Vendor', field:'vendor', minWidth:140 },
      { title:'ETA', field:'eta', width:120 },
      { title:'SLA', field:'sla', width:120 },
      { title:'Status', field:'status', width:130, formatter: cell => badgeStatus(cell.getValue()) },
      { title:'Last Update', field:'updated', minWidth:150 },
      { title:'PIC', field:'pic', width:100 },
      { title:'Risiko', field:'risiko', width:120, formatter: cell => badgeStatus(cell.getValue()) }
    ], data.monitoring, { pagination:true, paginationSize:8 });

    createTable('resiMonitoringTable', [
      { title:'Resi', field:'resi', minWidth:130, cssClass:'fw-bold text-primary' },
      { title:'Vendor', field:'vendor', minWidth:120 },
      { title:'PO', field:'po', minWidth:120 },
      { title:'Pemasok', field:'pemasok', minWidth:200 },
      { title:'Last Update', field:'lastUpdate', minWidth:140 },
      { title:'Aging', field:'aging', width:100 },
      { title:'Status', field:'status', width:150, formatter: cell => badgeStatus(cell.getValue()) }
    ], data.resi, { pagination:true, paginationSize:6 });
  }

  function bindEvents() {
    ['filter-log-period','filter-log-region','filter-log-supplier','filter-log-vendor','filter-log-status','filter-log-sla','filter-log-pic'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset.bound !== 'true') {
        el.dataset.bound = 'true';
        el.addEventListener('change', render);
      }
    });
    const reset = document.getElementById('btnResetLogFilters');
    if (reset && reset.dataset.bound !== 'true') {
      reset.dataset.bound = 'true';
      reset.addEventListener('click', () => {
        ['filter-log-period','filter-log-region','filter-log-supplier','filter-log-vendor','filter-log-status','filter-log-sla','filter-log-pic'].forEach(id => {
          const el = document.getElementById(id);
          if (!el) return;
          el.selectedIndex = 0;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }
  }

  function init() {
    if (!document.getElementById('slaComplianceChart')) return;
    bindEvents();
    render();
  }

  if (document.getElementById('slaComplianceChart')) {
    try { hydrateFilterOptions(); } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('app:theme-changed', render);
})();
