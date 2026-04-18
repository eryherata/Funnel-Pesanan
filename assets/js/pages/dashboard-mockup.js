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

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const fullRp = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const compactRp = (n) => {
    const num = Number(n) || 0;
    const abs = Math.abs(num);
    const fmt = (v, d = 2) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
    if (abs >= 1e12) return `Rp ${fmt(num / 1e12)} T`;
    if (abs >= 1e9) return `Rp ${fmt(num / 1e9)} M`;
    if (abs >= 1e6) return `Rp ${fmt(num / 1e6)} Jt`;
    if (abs >= 1e3) return `Rp ${fmt(num / 1e3)} Rb`;
    return fullRp(num);
  };
  const fmtPct = (n, d = 1) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n) || 0) + '%';
  const compactCell = (n) => `<span title="${fullRp(n)}">${compactRp(n)}</span>`;
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
      paginationSize: opts.paginationSize || 6,
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

  function applyFilters(baseRows) {
    const ref = getReferenceDate(baseRows);
    const period = document.getElementById('filter-sales-period')?.value || 'month';
    const region = document.getElementById('filter-sales-region')?.value || '';
    const principal = document.getElementById('filter-sales-principal')?.value || '';
    const supplier = document.getElementById('filter-sales-supplier')?.value || '';
    const satker = document.getElementById('filter-sales-satker')?.value || '';
    const pic = document.getElementById('filter-sales-pic')?.value || '';
    const status = document.getElementById('filter-sales-status')?.value || '';

    return baseRows.filter(row => {
      const dt = new Date(row.tgl_iso || row.last_update_iso || Date.now());
      if (period === 'month' && !isSameMonth(dt, ref)) return false;
      if (period === '3months' && dt < startOfMonthsBack(ref, 2)) return false;
      if (period === 'year' && dt.getFullYear() !== ref.getFullYear()) return false;
      if (region && row.wilayah !== region) return false;
      if (principal && row.principal !== principal) return false;
      if (supplier && row.pemasok !== supplier) return false;
      if (satker && row.satker !== satker) return false;
      if (pic && row.pic !== pic) return false;
      if (status && ((row.tahap || row.status) !== status && row.status !== status)) return false;
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
    populateSelect('filter-sales-region', unique('wilayah'));
    populateSelect('filter-sales-principal', unique('principal'));
    populateSelect('filter-sales-supplier', unique('pemasok'));
    populateSelect('filter-sales-satker', unique('satker'));
    populateSelect('filter-sales-pic', unique('pic'));
    const statuses = Array.from(new Set(rows.map(r => r.tahap || r.status).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
    populateSelect('filter-sales-status', statuses);
  }

  function monthBuckets(rows, valueFn) {
    const map = new Map();
    rows.forEach(r => {
      const d = new Date(r.tgl_iso || r.last_update_iso || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      if (!map.has(key)) map.set(key, { label: MONTHS[d.getMonth()], total: 0, profit: 0 });
      const bucket = map.get(key);
      bucket.total += Number(valueFn(r) || 0);
    });
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([,v])=>v);
  }

  function aggregate(filteredRows) {
    const kontrakRows = filteredRows.filter(r => ['Kontrak','Dikirim','Selesai','Closing'].includes(r.status));
    const activeRows = filteredRows.filter(r => !['Selesai','Closing'].includes(r.status));
    const omzet = kontrakRows.reduce((s, r) => s + Number(r.nilai || 0), 0);
    const profit = kontrakRows.reduce((s, r) => s + Number(r.profit_bersih || 0), 0);
    const margin = omzet ? (profit / omzet) * 100 : 0;
    const tayang = activeRows.reduce((s, r) => s + Number(r.nilai_tayang || 0), 0);
    const outstanding = activeRows.length;
    const risikoRows = filteredRows.filter(r => ['Tinggi','Sedang'].includes(r.risiko_tingkat));
    const risiko = risikoRows.length;

    const omzetTrend = monthBuckets(kontrakRows, r => r.nilai);
    const profitTrend = monthBuckets(kontrakRows, r => r.profit_bersih);
    const trendLabels = omzetTrend.map(x => x.label);
    const trendOmzet = omzetTrend.map(x => x.total / 1e9);
    const trendProfit = profitTrend.map(x => x.total / 1e9);

    const funnelLabels = ['Peluang', 'Tayang', 'Negosiasi', 'Kontrak', 'Selesai Kirim', 'Closing'];
    const funnelValues = [
      Math.round(filteredRows.length * 1.15),
      filteredRows.filter(r => (r.tahap || r.status) === 'Tayang').length,
      filteredRows.filter(r => (r.tahap || r.status) === 'Negosiasi').length,
      filteredRows.filter(r => ['Kontrak','Dikirim'].includes(r.status)).length,
      filteredRows.filter(r => r.status === 'Selesai').length,
      filteredRows.filter(r => r.status === 'Closing').length
    ];

    const leakageEntries = [
      ['Nego', filteredRows.reduce((s,r)=>s+Number(r.nego||0),0)],
      ['Biaya Kirim', filteredRows.reduce((s,r)=>s+Number(r.biaya_kirim||0),0)],
      ['Fee Pelaksana', filteredRows.reduce((s,r)=>s+Number(r.fee_pelaksana||0),0)],
      ['Fee Distributor', filteredRows.reduce((s,r)=>s+Number(r.fee_distributor||0),0)],
      ['Fee Pemasok', filteredRows.reduce((s,r)=>s+Number(r.fee_pemasok||0),0)],
      ['Pajak', filteredRows.reduce((s,r)=>s+Number(r.pajak||0),0)]
    ];
    const leakageLargest = leakageEntries.slice().sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';

    const topSatker = Object.values(filteredRows.reduce((acc, r) => {
      const key = r.satker;
      if (!acc[key]) acc[key] = { satker: r.satker, omzet: 0, profit: 0, order: 0 };
      acc[key].omzet += Number(r.nilai || 0);
      acc[key].profit += Number(r.profit_bersih || 0);
      acc[key].order += 1;
      return acc;
    }, {})).map((r, idx) => ({ ...r, margin: r.omzet ? (r.profit / r.omzet) * 100 : 0 })).sort((a,b)=>b.omzet-a.omzet).slice(0,10).map((r,i)=>({...r, rank:i+1}));

    const principalRows = Object.values(filteredRows.reduce((acc, r) => {
      const key = r.principal;
      if (!acc[key]) acc[key] = { principal: r.principal, omzet: 0, profit: 0, pemasok: r.pemasok };
      acc[key].omzet += Number(r.nilai || 0);
      acc[key].profit += Number(r.profit_bersih || 0);
      return acc;
    }, {})).map(r => ({ ...r, margin: r.omzet ? (r.profit / r.omzet) * 100 : 0, kontribusi: omzet ? (r.omzet / omzet) * 100 : 0 })).sort((a,b)=>b.omzet-a.omzet);

    const regionRows = Object.values(filteredRows.reduce((acc, r) => {
      const key = `${r.wilayah} / ${r.pic}`;
      if (!acc[key]) acc[key] = { wilayahPic: key, omzet: 0, profit: 0, total: 0, converted: 0 };
      acc[key].omzet += Number(r.nilai || 0);
      acc[key].profit += Number(r.profit_bersih || 0);
      acc[key].total += 1;
      if (['Kontrak','Dikirim','Selesai','Closing'].includes(r.status)) acc[key].converted += 1;
      return acc;
    }, {})).map(r => ({ ...r, conversion: r.total ? (r.converted / r.total) * 100 : 0 })).sort((a,b)=>b.omzet-a.omzet);

    const risks = risikoRows.map(r => ({
      po: r.po,
      instansi: r.satker,
      principal: r.principal,
      nilai: r.nilai,
      margin: r.nilai ? (Number(r.profit_bersih || 0) / r.nilai) * 100 : 0,
      risiko: r.risiko,
      deadline: r.sla_target,
      pic: r.pic
    })).sort((a,b)=>b.nilai-a.nilai).slice(0,8);

    const recent = filteredRows.slice().sort((a,b)=>String(b.last_update_iso || '').localeCompare(String(a.last_update_iso || ''))).slice(0,8).map(r => ({ po:r.po, instansi:r.satker, tahap:r.tahap||r.status, nilai:r.nilai, updated:r.last_update }));

    const peakContract = omzetTrend.length ? trendLabels[trendOmzet.indexOf(Math.max(...trendOmzet))] : '-';
    const peakProfit = profitTrend.length ? trendLabels[trendProfit.indexOf(Math.max(...trendProfit))] : '-';
    const bestMargin = trendLabels.length ? trendLabels.reduce((best, label, idx) => {
      const ratio = trendOmzet[idx] ? trendProfit[idx] / trendOmzet[idx] : 0;
      return ratio > best.ratio ? { label, ratio } : best;
    }, { label: '-', ratio: -1 }).label : '-';

    return { omzet, profit, margin, tayang, outstanding, risiko, trendLabels, trendOmzet, trendProfit, funnelLabels, funnelValues, leakageEntries, leakageLargest, topSatker, principalRows, regionRows, risks, recent, peakContract, peakProfit, bestMargin };
  }

  function buildRiskBadge(v) {
    const map = { 'Margin Rendah': 'danger', 'Nego Tinggi': 'warning', 'SLA Rawan': 'warning', 'Belum Closing': 'primary', 'High Value': 'danger', 'Normal': 'success' };
    const tone = map[v] || 'secondary';
    return `<span class="badge bg-${tone}-subtle text-${tone} border border-${tone}-subtle">${v}</span>`;
  }
  function buildStageBadge(v) {
    const map = { Tayang:'primary', Negosiasi:'warning', Kontrak:'success', Dikirim:'info', 'Selesai Kirim':'info', Selesai:'success', Closing:'success', Penyiapan:'secondary' };
    const tone = map[v] || 'secondary';
    return `<span class="badge bg-${tone}-subtle text-${tone} border border-${tone}-subtle">${v}</span>`;
  }

  function render() {
    destroyAll();
    if (!document.getElementById('salesTrendChart')) return;
    const filteredRows = applyFilters(getRows());
    const data = aggregate(filteredRows);
    const colors = colorSet();

    setText('kpi-total-omzet', compactRp(data.omzet));
    setText('kpi-profit-bersih', compactRp(data.profit));
    setText('kpi-margin-bersih', fmtPct(data.margin,2));
    setText('kpi-nilai-tayang', compactRp(data.tayang));
    setText('kpi-outstanding-order', new Intl.NumberFormat('id-ID').format(data.outstanding));
    setText('kpi-order-risiko', new Intl.NumberFormat('id-ID').format(data.risiko));
    setText('sales-peak-contract', data.peakContract);
    setText('sales-peak-profit', data.peakProfit);
    setText('sales-best-margin', data.bestMargin);
    setText('sales-bottleneck', 'Negosiasi → Kontrak');
    setText('sales-leakage-largest', data.leakageLargest);

    makeChart('salesTrendChart', {
      data: {
        labels: data.trendLabels,
        datasets: [
          { type: 'bar', label: 'Omzet Kontrak', data: data.trendOmzet, backgroundColor: '#2c7be5', borderRadius: 8, barPercentage: .58, categoryPercentage: .72, yAxisID: 'y' },
          { type: 'line', label: 'Profit Bersih', data: data.trendProfit, borderColor: '#00d27a', backgroundColor: '#00d27a', pointRadius: 4, borderWidth: 3, tension: .35, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: colors.tick, usePointStyle: true } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.tick } },
          y: { position: 'left', grid: { color: colors.grid }, ticks: { color: colors.tick, callback: v => 'Rp ' + v + ' M' } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#00d27a', callback: v => 'Rp ' + v + ' M' } }
        }
      }
    });

    makeChart('salesFunnelChart', {
      type: 'bar',
      data: { labels: data.funnelLabels, datasets: [{ label: 'Jumlah Order', data: data.funnelValues, backgroundColor: ['#2c7be5','#4f92eb','#73a9f0','#98c0f5','#bdd7fa','#dce9fd'], borderRadius: 8 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display:false } }, scales: { x: { grid: { color: colors.grid }, ticks: { color: colors.tick } }, y: { grid: { display:false }, ticks: { color: colors.tick } } } }
    });

    makeChart('marginLeakageChart', {
      type: 'bar',
      data: { labels: data.leakageEntries.map(x => x[0]), datasets: [{ label: 'Nominal', data: data.leakageEntries.map(x => x[1] / 1e9), backgroundColor: ['#e63757','#f5803e','#f6ad55','#2c7be5','#00d27a','#6f42c1'], borderRadius: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display:false }, tooltip: { callbacks: { label: ctx => ' ' + fullRp(Number(ctx.raw) * 1e9) } } }, scales: { x: { grid: { display:false }, ticks: { color: colors.tick, maxRotation: 35, minRotation: 20 } }, y: { grid: { color: colors.grid }, ticks: { color: colors.tick, callback: v => 'Rp ' + v + ' M' } } } }
    });

    createTable('topSatkerTable', [
      { title:'#', field:'rank', width:60, hozAlign:'center' },
      { title:'Satker', field:'satker', minWidth:260 },
      { title:'Omzet', field:'omzet', hozAlign:'right', formatter: cell => compactCell(cell.getValue()) },
      { title:'Margin', field:'margin', hozAlign:'right', formatter: cell => fmtPct(cell.getValue(),1) },
      { title:'Order', field:'order', hozAlign:'center', width:90 }
    ], data.topSatker, { pagination:true, paginationSize:5 });

    createTable('principalContributionTable', [
      { title:'Principal', field:'principal', minWidth:150 },
      { title:'Pemasok', field:'pemasok', minWidth:220 },
      { title:'Omzet', field:'omzet', hozAlign:'right', formatter: cell => compactCell(cell.getValue()) },
      { title:'Margin', field:'margin', hozAlign:'right', formatter: cell => fmtPct(cell.getValue(),1) },
      { title:'Kontribusi', field:'kontribusi', hozAlign:'right', formatter: cell => fmtPct(cell.getValue(),1) }
    ], data.principalRows, { pagination:true, paginationSize:6 });

    createTable('regionPicContributionTable', [
      { title:'Wilayah / PIC', field:'wilayahPic', minWidth:260 },
      { title:'Omzet', field:'omzet', hozAlign:'right', formatter: cell => compactCell(cell.getValue()) },
      { title:'Profit', field:'profit', hozAlign:'right', formatter: cell => compactCell(cell.getValue()) },
      { title:'Conversion', field:'conversion', hozAlign:'right', formatter: cell => fmtPct(cell.getValue(),1) }
    ], data.regionRows, { pagination:true, paginationSize:7 });

    createTable('orderRiskTable', [
      { title:'No PO', field:'po', width:120, cssClass:'fw-bold text-primary' },
      { title:'Instansi', field:'instansi', minWidth:220 },
      { title:'Principal', field:'principal', width:120 },
      { title:'Nilai', field:'nilai', hozAlign:'right', formatter: cell => compactCell(cell.getValue()) },
      { title:'Margin', field:'margin', hozAlign:'right', formatter: cell => fmtPct(cell.getValue(),1) },
      { title:'Risiko', field:'risiko', minWidth:140, formatter: cell => buildRiskBadge(cell.getValue()) },
      { title:'Deadline', field:'deadline', width:120 },
      { title:'PIC', field:'pic', width:100 }
    ], data.risks, { pagination:true, paginationSize:5 });

    createTable('recentOrdersTable', [
      { title:'No PO', field:'po', width:120, cssClass:'fw-bold text-primary' },
      { title:'Instansi', field:'instansi', minWidth:180 },
      { title:'Tahap', field:'tahap', width:130, formatter: cell => buildStageBadge(cell.getValue()) },
      { title:'Nilai', field:'nilai', hozAlign:'right', formatter: cell => compactCell(cell.getValue()) },
      { title:'Update', field:'updated', minWidth:160 }
    ], data.recent, { pagination:true, paginationSize:5 });
  }

  function bindEvents() {
    ['filter-sales-period','filter-sales-region','filter-sales-principal','filter-sales-supplier','filter-sales-satker','filter-sales-pic','filter-sales-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset.bound !== 'true') {
        el.dataset.bound = 'true';
        el.addEventListener('change', render);
      }
    });
    const reset = document.getElementById('btnResetSalesFilters');
    if (reset && reset.dataset.bound !== 'true') {
      reset.dataset.bound = 'true';
      reset.addEventListener('click', () => {
        ['filter-sales-period','filter-sales-region','filter-sales-principal','filter-sales-supplier','filter-sales-satker','filter-sales-pic','filter-sales-status'].forEach(id => {
          const el = document.getElementById(id);
          if (!el) return;
          el.selectedIndex = 0;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }
  }

  function init() {
    if (!document.getElementById('salesTrendChart')) return;
    bindEvents();
    render();
  }

  if (document.getElementById('salesTrendChart')) {
    try { hydrateFilterOptions(); } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('app:theme-changed', render);
})();
