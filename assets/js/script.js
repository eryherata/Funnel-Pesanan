(() => {
  // assets/js/core/theme.js
  var listeners = /* @__PURE__ */ new Set();
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || localStorage.getItem("theme") || "light";
  }
  function onThemeChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  function notify(theme) {
    listeners.forEach((callback) => callback(theme));
    document.dispatchEvent(new CustomEvent("app:theme-changed", { detail: { theme } }));
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    const icon = document.getElementById("themeIcon");
    if (icon) {
      icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
    notify(theme);
  }
  function initTheme() {
    applyTheme(getTheme());
    const themeToggleBtn = document.getElementById("themeToggle");
    if (!themeToggleBtn || themeToggleBtn.dataset.bound === "true") return;
    themeToggleBtn.dataset.bound = "true";
    themeToggleBtn.addEventListener("click", () => {
      applyTheme(getTheme() === "light" ? "dark" : "light");
    });
  }


function enhanceSidebarMenus() {
  const ensureSubmenu = (collapseId, headerText, items) => {
    const collapse = document.getElementById(collapseId);
    if (!collapse) return;
    let list = collapse.querySelector('.sidebar-sub-menu');
    if (!list) return;
    const existing = new Map();
    list.querySelectorAll('a.sidebar-sub-item').forEach((a) => existing.set(a.getAttribute('href'), a));
    const activeHref = (window.location.pathname.split('/').pop() || 'index.html');
    list.innerHTML = '';
    const header = document.createElement('li');
    header.className = 'sidebar-popup-header';
    header.textContent = headerText;
    list.appendChild(header);
    items.forEach((item) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.className = 'sidebar-sub-item ajax-link';
      if (item.href === activeHref) a.classList.add('active');
      a.textContent = item.label;
      li.appendChild(a);
      list.appendChild(li);
    });
  };
  ensureSubmenu('menuDashboard', 'Dashboard', [
    { href: 'funnel-dashboard.html', label: 'Funnel' },
    { href: 'index.html', label: 'Analitik Penjualan' },
    { href: 'logistik-sla.html', label: 'Logistik & SLA' }
  ]);
  ensureSubmenu('menuInputData', 'Manajemen Data', [
    { href: 'funnel-input.html', label: 'Funnel Baru' },
    { href: 'funnel-daftar.html', label: 'Daftar Funnel' },
    { href: 'input-pesanan.html', label: 'Pesanan Baru' },
    { href: 'data-pesanan.html', label: 'Daftar Pesanan' },
    { href: 'database-master.html', label: 'Database Master' }
  ]);
}

  // assets/js/core/sidebar.js
  function syncSidebarActiveState() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".sidebar-sub-item").forEach((link) => link.classList.remove("active"));
    const activeLink = document.querySelector(`.sidebar-sub-item[href="${currentPage}"]`);
    if (!activeLink) return;
    activeLink.classList.add("active");
    const parentCollapse = activeLink.closest(".collapse");
    if (!parentCollapse) return;
    const trigger = document.querySelector(`.sidebar-nav-item[href="#${parentCollapse.id}"]`);
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    if (typeof bootstrap !== "undefined" && bootstrap.Collapse) {
      let instance = bootstrap.Collapse.getInstance(parentCollapse);
      if (!instance) instance = new bootstrap.Collapse(parentCollapse, { toggle: false });
      instance.show();
    } else {
      parentCollapse.classList.add("show");
    }
  }
  function initSidebar() {
    enhanceSidebarMenus();
    syncSidebarActiveState();
    const savedSidebar = localStorage.getItem("sidebar") || "expanded";
    if (savedSidebar === "collapsed") {
      document.body.classList.add("sidebar-collapsed");
      const toggleText = document.getElementById("toggleText");
      if (toggleText) toggleText.innerText = "Besarkan Tampilan";
    }
    const sidebarToggleBtn = document.getElementById("sidebarToggle");
    if (!sidebarToggleBtn || sidebarToggleBtn.dataset.bound === "true") return;
    sidebarToggleBtn.dataset.bound = "true";
    sidebarToggleBtn.addEventListener("click", () => {
      const isCollapsed = document.body.classList.toggle("sidebar-collapsed");
      const toggleText = document.getElementById("toggleText");
      if (toggleText) toggleText.innerText = isCollapsed ? "Besarkan Tampilan" : "Kecilkan Tampilan";
      localStorage.setItem("sidebar", isCollapsed ? "collapsed" : "expanded");
      document.dispatchEvent(new CustomEvent("app:sidebar-changed", { detail: { collapsed: isCollapsed } }));
    });
  }

  function sameAppPage(url) {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin !== window.location.origin) return false;
      const path = target.pathname.split('/').pop() || 'index.html';
      return /\.html$/i.test(path);
    } catch (_) {
      return false;
    }
  }
  function startPageTransition() {
    document.body.classList.add('ds-page-transitioning');
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.classList.add('loading');
    return mainContent;
  }
  function navigateToPage(target, options = {}) {
    if (!target) return;
    const resolved = new URL(target, window.location.href);
    if (resolved.href === window.location.href && !options.force) return;
    startPageTransition();
    try {
      sessionStorage.setItem('ds:last-page-nav', JSON.stringify({ href: resolved.href, at: Date.now() }));
    } catch (_) {}
    const method = options.replace ? 'replace' : 'assign';
    window.setTimeout(() => window.location[method](resolved.href), options.delay ?? 90);
  }
  function reloadCurrentPage() {
    startPageTransition();
    window.setTimeout(() => window.location.reload(), 90);
  }
  function initNavigationUX() {
    if (document.body.dataset.navBound === 'true') return;
    document.body.dataset.navBound = 'true';
    document.addEventListener('click', function (event) {
      const link = event.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#') || link.target === '_blank' || link.hasAttribute('download')) return;
      if (link.dataset.bsToggle || link.getAttribute('role') === 'button') return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (!sameAppPage(href)) return;
      const resolved = new URL(href, window.location.href);
      if (resolved.href === window.location.href) return;
      event.preventDefault();
      navigateToPage(resolved.href);
    }, true);
    window.addEventListener('pageshow', () => {
      document.body.classList.remove('ds-page-transitioning');
      document.getElementById('mainContent')?.classList.remove('loading');
    });
    window.addEventListener('load', () => {
      document.body.classList.remove('ds-page-transitioning');
      document.getElementById('mainContent')?.classList.remove('loading');
    });
    window.DataSystemNavigation = {
      navigate: navigateToPage,
      reloadPage: reloadCurrentPage,
      startTransition: startPageTransition
    };
  }

  // assets/js/core/formatters.js
  var formatRp = (num) => "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(num) || 0));
  var parseRp = (value) => parseInt(String(value || "0").replace(/\D/g, ""), 10) || 0;
  var formatPct = (num, digits = 2) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(Number(num) || 0) + "%";
  var ceilTo = (value, step = 1) => {
    const safeStep = Math.max(1, parseInt(step, 10) || 1);
    return Math.ceil((Number(value) || 0) / safeStep) * safeStep;
  };

  // assets/js/core/plugins.js
  var choicesInstances = [];
  function initPlugins() {
    initSearchableDropdowns();
    initDatepickers();
    initMoneyInputs();
    initFileZones();
  }
  function initSearchableDropdowns() {
    if (typeof Choices === "undefined") return;
    choicesInstances.forEach((instance) => instance.destroy());
    choicesInstances = [];
    document.querySelectorAll(".searchable-dropdown").forEach((el) => {
      choicesInstances.push(new Choices(el, {
        searchEnabled: true,
        searchPlaceholderValue: "Cari...",
        itemSelectText: "",
        shouldSort: false
      }));
    });
  }
  function initDatepickers() {
    if (typeof flatpickr === "undefined") return;
    document.querySelectorAll(".datepicker").forEach((el) => {
      if (el._flatpickr) el._flatpickr.destroy();
      flatpickr(el, { dateFormat: "d/m/Y", allowInput: true });
    });
  }
  function formatInputCurrency(input) {
    const raw = parseRp(input.value);
    input.value = raw ? new Intl.NumberFormat("id-ID").format(raw).replace(/^/, "Rp ") : "";
  }
  function initMoneyInputs() {
    document.querySelectorAll(".format-uang, .calc-uang").forEach((input) => {
      if (input.dataset.currencyBound === "true") return;
      input.dataset.currencyBound = "true";
      input.addEventListener("keyup", () => formatInputCurrency(input));
      input.addEventListener("blur", () => formatInputCurrency(input));
    });
  }
  function initFileZones() {
    document.querySelectorAll(".file-drop-zone, .excel-drop-zone").forEach((zone) => {
      if (zone.dataset.bound === "true") return;
      zone.dataset.bound = "true";
      const input = zone.querySelector('input[type="file"]');
      if (!input) return;
      input.addEventListener("change", () => {
        const fileName = input.files?.[0]?.name || "Pilih File";
        const textEl = zone.querySelector("p, h6");
        const iconEl = zone.querySelector("i");
        if (textEl) {
          textEl.innerText = fileName;
          textEl.style.color = input.files?.[0] ? "var(--primary-color)" : "var(--text-muted)";
        }
        if (iconEl) {
          iconEl.className = input.files?.[0] ? "fa-solid fa-check-circle" : "fa-solid fa-cloud-arrow-up";
          iconEl.style.color = input.files?.[0] ? "var(--primary-color)" : "var(--text-muted)";
        }
      });
    });
  }

  // assets/js/data/mock-data.js
  var dashboardData = {
    trendLabels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
    trendKontrak: [150, 200, 320, 290, 450, 580],
    trendProfit: [25, 30, 45, 40, 65, 80],
    marginShare: [45, 35, 20],
    topSatkerLabels: ["Dinkes", "Disdik", "RSUD", "PUPR", "Setda"],
    topSatkerValues: [520, 480, 350, 210, 150]
  };
  var logistikRows = [
    { po: "PO-041", satker: "Dinas Pendidikan", ekspedisi: "JNE Cargo", tgl: "20 Apr 2026", status: "Tepat Waktu", prog: 90 },
    { po: "PO-045", satker: "RSUD Klaten", ekspedisi: "Indah Cargo", tgl: "25 Apr 2026", status: "Perjalanan", prog: 60 },
    { po: "PO-048", satker: "Dinas PUPR", ekspedisi: "Sentral Cargo", tgl: "15 Apr 2026", status: "Rawan", prog: 30 }
  ];
  var pesananRows = [
    { po: "PO-058", satker: "Dinas Pendidikan", tgl: "08 Apr 2026", nilai: 125e6, status: "Selesai" },
    { po: "PO-059", satker: "RSUD Klaten", tgl: "08 Apr 2026", nilai: 45e7, status: "Dikirim" },
    { po: "PO-060", satker: "Dinas PUPR Kota", tgl: "07 Apr 2026", nilai: 355e6, status: "Penyiapan" }
  ];
  var masterProdukRows = [
    { id: 1, kode: "PRD-001", nama: "Laptop Asus Core i5", kategori: "Elektronik", principal: "Asus" }
  ];
  var masterMitraRows = [
    { id: 1, tipe: "Distributor", nama: "PT Distribusi Makmur", kontak: "Bpk. Andi" }
  ];
  var masterSatkerRows = [
    { id: 1, wilayah: "Jakarta", instansi: "Dinas Pendidikan", alamat: "Jl. Sudirman No. 1" }
  ];
  var productRows = [
    { id: 1, principal: "Asus", kategori: "Elektronik", kode: "PRD-001", nama: "Laptop Asus Core i5", qty: 10, hpp_pem_sat: 8e6, hpp_dis_sat: 85e5, hpp_pel_sat: 9e6, kon_sat: 1e7, pel_fm_p: 5, dis_fm_p: 2, pem_fm_p: 1 }
  ];

  // assets/js/shared/charts.js
  var registry = /* @__PURE__ */ new Map();
  function colors() {
    const dark = getTheme() === "dark";
    return {
      grid: dark ? "#222834" : "#e3ebf6",
      tick: dark ? "#b3c0d1" : "#5e6e82"
    };
  }
  function createManagedChart(key, canvasId, factory) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return null;
    if (registry.has(key)) registry.get(key).destroy();
    const instance = factory(canvas.getContext("2d"), colors());
    registry.set(key, instance);
    return instance;
  }
  onThemeChange(() => {
    registry.forEach((chart) => chart.destroy());
    registry.clear();
    document.dispatchEvent(new CustomEvent("app:charts-refresh"));
  });

  // assets/js/pages/dashboard.js
  function initDashboardPage() {
    if (!document.getElementById("trendComboChart")) return;
    const render = () => {
      createManagedChart("dashboard-trend", "trendComboChart", (ctx, colors2) => new Chart(ctx, {
        type: "bar",
        data: { labels: dashboardData.trendLabels, datasets: [
          { type: "line", label: "Profit Bersih", data: dashboardData.trendProfit, borderColor: "#00d27a", backgroundColor: "#00d27a", borderWidth: 3, tension: 0.4, yAxisID: "y1" },
          { type: "bar", label: "Total Kontrak", data: dashboardData.trendKontrak, backgroundColor: "#2c7be5", borderRadius: 4, barPercentage: 0.5, yAxisID: "y" }
        ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { color: colors2.tick, usePointStyle: true } } }, scales: { x: { grid: { display: false }, ticks: { color: colors2.tick } }, y: { type: "linear", display: true, position: "left", grid: { color: colors2.grid }, ticks: { color: colors2.tick, callback: (v) => "Rp" + v + "Jt" } }, y1: { type: "linear", display: true, position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#00d27a", callback: (v) => "Rp" + v + "Jt" } } } }
      }));
      createManagedChart("dashboard-margin", "marginDoughnutChart", (ctx) => new Chart(ctx, {
        type: "doughnut",
        data: { labels: ["Pelaksana", "Distributor", "Pemasok"], datasets: [{ data: dashboardData.marginShare, backgroundColor: ["#2c7be5", "#00d27a", "#f5803e"], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "75%", plugins: { legend: { display: false } } }
      }));
      createManagedChart("dashboard-top-satker", "topSatkerChart", (ctx, colors2) => new Chart(ctx, {
        type: "bar",
        data: { labels: dashboardData.topSatkerLabels, datasets: [{ label: "Kontrak", data: dashboardData.topSatkerValues, backgroundColor: "rgba(245, 128, 62, 0.8)", hoverBackgroundColor: "#f5803e", borderRadius: 4, barPercentage: 0.6 }] },
        options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: colors2.grid }, ticks: { color: colors2.tick } }, y: { grid: { display: false }, ticks: { color: colors2.tick } } } }
      }));
    };
    render();
    document.addEventListener("app:charts-refresh", render);
  }

  // assets/js/pages/logistik-sla.js
  function initLogistikPage() {
    if (!document.getElementById("slaChart")) return;
    const renderCharts = () => {
      createManagedChart("logistik-sla", "slaChart", (ctx, colors2) => new Chart(ctx, {
        type: "line",
        data: { labels: ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"], datasets: [
          { label: "Tepat Waktu", data: [90, 92, 95, 93], borderColor: "#00d27a", backgroundColor: "rgba(0, 210, 122, 0.1)", fill: true, tension: 0.4 },
          { label: "Terlambat", data: [10, 8, 5, 7], borderColor: "#e63757", backgroundColor: "transparent", borderDash: [5, 5], tension: 0.4 }
        ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { color: colors2.tick } } }, scales: { y: { grid: { color: colors2.grid }, ticks: { color: colors2.tick, callback: (v) => v + "%" } }, x: { grid: { display: false }, ticks: { color: colors2.tick } } } }
      }));
      createManagedChart("logistik-doughnut", "logistikDoughnutChart", (ctx) => new Chart(ctx, {
        type: "doughnut",
        data: { labels: ["Perjalanan", "Penyiapan", "Tiba"], datasets: [{ data: [45, 12, 124], backgroundColor: ["#2c7be5", "#f5803e", "#00d27a"], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "70%", plugins: { legend: { display: false } } }
      }));
    };
    renderCharts();
    document.addEventListener("app:charts-refresh", renderCharts);
    if (typeof Tabulator !== "undefined" && document.getElementById("logistik-grid")) {
      new Tabulator("#logistik-grid", {
        data: logistikRows,
        layout: "fitColumns",
        columns: [
          { title: "No. PO", field: "po", width: 100, cssClass: "fw-bold text-primary" },
          { title: "Satuan Kerja", field: "satker", minWidth: 200 },
          { title: "Ekspedisi", field: "ekspedisi", width: 150 },
          { title: "Target Tiba", field: "tgl", width: 120 },
          { title: "Status", field: "status", width: 150, formatter: (cell) => {
            const val = cell.getValue();
            const color = val === "Rawan" ? "danger" : val === "Tepat Waktu" ? "success" : "primary";
            return `<span class="badge bg-${color}-subtle text-${color} border border-${color}">${val}</span>`;
          } },
          { title: "Progress (%)", field: "prog", formatter: "progress", formatterParams: { color: ["#e63757", "#f5803e", "#00d27a"] } }
        ]
      });
    }
  }

  // assets/js/core/tabulator-helpers.js
  var rpFormatter = (cell) => formatRp(cell.getValue() || 0);
  var pctFormatter = (cell) => `${cell.getValue() || 0}%`;
  function createCurrencyEditor() {
    return function currencyEditor(cell, onRendered, success, cancel) {
      const input = document.createElement("input");
      input.type = "text";
      input.style.textAlign = "right";
      input.value = cell.getValue() ? new Intl.NumberFormat("id-ID").format(cell.getValue()) : "";
      onRendered(() => {
        input.focus();
        input.select();
      });
      input.addEventListener("keyup", () => {
        const raw = input.value.replace(/\D/g, "");
        input.value = raw ? new Intl.NumberFormat("id-ID").format(raw) : "";
      });
      input.addEventListener("blur", () => success(parseInt(input.value.replace(/\D/g, ""), 10) || 0));
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") success(parseInt(input.value.replace(/\D/g, ""), 10) || 0);
        if (event.key === "Escape") cancel();
      });
      return input;
    };
  }
  function createPercentEditor() {
    return function percentEditor(cell, onRendered, success, cancel) {
      const input = document.createElement("input");
      input.type = "text";
      input.style.textAlign = "center";
      input.value = cell.getValue() || 0;
      onRendered(() => {
        input.focus();
        input.select();
      });
      input.addEventListener("keyup", () => {
        input.value = input.value.replace(/[^0-9.]/g, "");
      });
      input.addEventListener("blur", () => success(parseFloat(input.value) || 0));
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") success(parseFloat(input.value) || 0);
        if (event.key === "Escape") cancel();
      });
      return input;
    };
  }
  function createQtyEditor() {
    return function qtyEditor(cell, onRendered, success, cancel) {
      const input = document.createElement("input");
      input.type = "text";
      input.style.textAlign = "center";
      input.value = cell.getValue() || 1;
      onRendered(() => {
        input.focus();
        input.select();
      });
      input.addEventListener("keyup", () => {
        input.value = input.value.replace(/\D/g, "");
      });
      input.addEventListener("blur", () => success(parseInt(input.value, 10) || 1));
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") success(parseInt(input.value, 10) || 1);
        if (event.key === "Escape") cancel();
      });
      return input;
    };
  }

  // assets/js/shared/product-table.js
  function netKontrak(row) {
    return ((row.kon_sat || 0) + (row.kon_kirim_sat || 0) - (row.kon_nego_sat || 0) - (row.kon_nego_kirim_sat || 0)) * (row.qty || 0);
  }
  function createProductTable(selector) {
    if (typeof Tabulator === "undefined" || !document.querySelector(selector)) return null;
    const currencyEditor = createCurrencyEditor();
    const percentEditor = createPercentEditor();
    const qtyEditor = createQtyEditor();
    return new Tabulator(selector, {
      data: JSON.parse(JSON.stringify(productRows)),
      layout: "fitDataFill",
      reactiveData: true,
      columnHeaderVertAlign: "middle",
      headerHozAlign: "center",
      columns: [
        { title: "No.", formatter: "rownum", width: 50, hozAlign: "center", headerSort: false },
        { title: "Aksi", formatter: () => "<i class='fa-solid fa-trash text-danger' style='cursor:pointer;'></i>", width: 50, hozAlign: "center", headerSort: false, cellClick: (e, cell) => cell.getRow().delete() },
        { title: "Principal", field: "principal", editor: "input", width: 150 },
        { title: "Kategori Produk", field: "kategori", editor: "input", width: 150 },
        { title: "Kode Produk", field: "kode", editor: "input", width: 120 },
        { title: "Nama Produk", field: "nama", editor: "input", width: 250 },
        { title: "Qty", field: "qty", editor: qtyEditor, width: 80, hozAlign: "center" },
        { title: "HPP", columns: [
          { title: "Pemasok", columns: [{ title: "Satuan", field: "hpp_pem_sat", editor: currencyEditor, formatter: rpFormatter, width: 120 }, { title: "Jumlah", field: "hpp_pem_jum", formatter: rpFormatter, width: 120, mutator: (v, d) => (d.qty || 0) * (d.hpp_pem_sat || 0) }] },
          { title: "Distributor", columns: [{ title: "Satuan", field: "hpp_dis_sat", editor: currencyEditor, formatter: rpFormatter, width: 120 }, { title: "Jumlah", field: "hpp_dis_jum", formatter: rpFormatter, width: 120, mutator: (v, d) => (d.qty || 0) * (d.hpp_dis_sat || 0) }] },
          { title: "Pelaksana", columns: [{ title: "Satuan", field: "hpp_pel_sat", editor: currencyEditor, formatter: rpFormatter, width: 120 }, { title: "Jumlah", field: "hpp_pel_jum", formatter: rpFormatter, width: 120, mutator: (v, d) => (d.qty || 0) * (d.hpp_pel_sat || 0) }] }
        ] },
        { title: "RAB", columns: [
          { title: "Harga Satuan", field: "rab_sat", editor: currencyEditor, formatter: rpFormatter, width: 130 },
          { title: "Biaya Kirim Sat", field: "rab_kirim_sat", editor: currencyEditor, formatter: rpFormatter, width: 130 },
          { title: "Jml Harga + Kirim", field: "rab_jum", formatter: rpFormatter, width: 170, mutator: (v, d) => (d.qty || 0) * ((d.rab_sat || 0) + (d.rab_kirim_sat || 0)) }
        ] },
        { title: "Tayang", columns: [
          { title: "Harga Satuan", field: "tayang_sat", editor: currencyEditor, formatter: rpFormatter, width: 130 },
          { title: "Biaya Kirim Sat", field: "tayang_kirim_sat", editor: currencyEditor, formatter: rpFormatter, width: 130 },
          { title: "Jml Harga + Kirim", field: "tayang_jum", formatter: rpFormatter, width: 170, mutator: (v, d) => (d.qty || 0) * ((d.tayang_sat || 0) + (d.tayang_kirim_sat || 0)) }
        ] },
        { title: "Kontrak", columns: [
          { title: "Harga Satuan", field: "kon_sat", editor: currencyEditor, formatter: rpFormatter, width: 130 },
          { title: "Biaya Kirim Sat", field: "kon_kirim_sat", editor: currencyEditor, formatter: rpFormatter, width: 130 },
          { title: "Nego Barang Sat", field: "kon_nego_sat", editor: currencyEditor, formatter: rpFormatter, width: 130 },
          { title: "Nego Kirim Sat", field: "kon_nego_kirim_sat", editor: currencyEditor, formatter: rpFormatter, width: 130 },
          { title: "Jml Harga + Kirim - Nego", field: "kon_jum", formatter: rpFormatter, width: 190, mutator: (v, d) => netKontrak(d) }
        ] },
        ...["pem", "dis", "pel"].map((prefix) => ({
          title: `Rabat/Discount ${prefix === "pem" ? "Pemasok" : prefix === "dis" ? "Distributor" : "Pelaksana"}`,
          columns: ["fm", "bsr", "bop", "disc"].map((type) => ({
            title: type.toUpperCase(),
            columns: [
              { title: "%", field: `${prefix}_${type}_p`, editor: percentEditor, formatter: pctFormatter, width: 60 },
              { title: "Rp", field: `${prefix}_${type}_rp`, formatter: rpFormatter, width: 110, mutator: (v, d) => netKontrak(d) * ((d[`${prefix}_${type}_p`] || 0) / 100) }
            ]
          })).concat([{ title: "JUMLAH", columns: [
            { title: "%", field: `${prefix}_jum_p`, formatter: pctFormatter, width: 70, mutator: (v, d) => (d[`${prefix}_fm_p`] || 0) + (d[`${prefix}_bsr_p`] || 0) + (d[`${prefix}_bop_p`] || 0) + (d[`${prefix}_disc_p`] || 0) },
            { title: "Rp", field: `${prefix}_jum_rp`, formatter: rpFormatter, width: 120, mutator: (v, d) => (d[`${prefix}_fm_rp`] || 0) + (d[`${prefix}_bsr_rp`] || 0) + (d[`${prefix}_bop_rp`] || 0) + (d[`${prefix}_disc_rp`] || 0) }
          ] }])
        })),
        { title: "Jumlah Keseluruhan Rabat", columns: ["fm", "bsr", "bop", "disc"].map((type) => ({
          title: type.toUpperCase(),
          columns: [
            { title: "%", field: `tot_${type}_p`, formatter: pctFormatter, width: 60, mutator: (v, d) => (d[`pel_${type}_p`] || 0) + (d[`dis_${type}_p`] || 0) + (d[`pem_${type}_p`] || 0) },
            { title: "Rp", field: `tot_${type}_rp`, formatter: rpFormatter, width: 110, mutator: (v, d) => (d[`pel_${type}_rp`] || 0) + (d[`dis_${type}_rp`] || 0) + (d[`pem_${type}_rp`] || 0) }
          ]
        })).concat([{ title: "JUMLAH", columns: [
          { title: "%", field: "tot_jum_p", formatter: pctFormatter, width: 70, mutator: (v, d) => (d.tot_fm_p || 0) + (d.tot_bsr_p || 0) + (d.tot_bop_p || 0) + (d.tot_disc_p || 0) },
          { title: "Rp", field: "tot_jum_rp", formatter: rpFormatter, width: 130, cssClass: "text-success fw-bold", mutator: (v, d) => (d.tot_fm_rp || 0) + (d.tot_bsr_rp || 0) + (d.tot_bop_rp || 0) + (d.tot_disc_rp || 0) }
        ] }]) }
      ]
    });
  }
  function updateSummaryCards(table) {
    if (!table) return;
    const data = table.getData();
    let hppPel = 0, hppDis = 0, hppPem = 0, rabSat = 0, rabKirim = 0, rabTot = 0, tayangSat = 0, tayangKirim = 0, tayangTot = 0;
    let konSat = 0, konKirim = 0, konTot = 0, konNegoBrg = 0, konNegoKirim = 0, konNegoTot = 0, pelRp = 0, disRp = 0, pemRp = 0;
    data.forEach((row) => {
      const qty = row.qty || 1;
      hppPel += (row.hpp_pel_sat || 0) * qty;
      hppDis += (row.hpp_dis_sat || 0) * qty;
      hppPem += (row.hpp_pem_sat || 0) * qty;
      rabSat += (row.rab_sat || 0) * qty;
      rabKirim += (row.rab_kirim_sat || 0) * qty;
      rabTot += ((row.rab_sat || 0) + (row.rab_kirim_sat || 0)) * qty;
      tayangSat += (row.tayang_sat || 0) * qty;
      tayangKirim += (row.tayang_kirim_sat || 0) * qty;
      tayangTot += ((row.tayang_sat || 0) + (row.tayang_kirim_sat || 0)) * qty;
      konSat += (row.kon_sat || 0) * qty;
      konKirim += (row.kon_kirim_sat || 0) * qty;
      konTot += ((row.kon_sat || 0) + (row.kon_kirim_sat || 0)) * qty;
      konNegoBrg += (row.kon_nego_sat || 0) * qty;
      konNegoKirim += (row.kon_nego_kirim_sat || 0) * qty;
      konNegoTot += ((row.kon_nego_sat || 0) + (row.kon_nego_kirim_sat || 0)) * qty;
      const rowNet = netKontrak(row);
      pelRp += rowNet * (((row.pel_fm_p || 0) + (row.pel_bsr_p || 0) + (row.pel_bop_p || 0) + (row.pel_disc_p || 0)) / 100);
      disRp += rowNet * (((row.dis_fm_p || 0) + (row.dis_bsr_p || 0) + (row.dis_bop_p || 0) + (row.dis_disc_p || 0)) / 100);
      pemRp += rowNet * (((row.pem_fm_p || 0) + (row.pem_bsr_p || 0) + (row.pem_bop_p || 0) + (row.pem_disc_p || 0)) / 100);
    });
    const netKon = konTot - konNegoTot;
    const bind = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.innerText = value;
    };
    bind("sum-hpp-pem", formatRp(hppPem));
    bind("sum-hpp-dis", formatRp(hppDis));
    bind("sum-hpp-pel", formatRp(hppPel));
    bind("sum-rab-brg", formatRp(rabSat));
    bind("sum-rab-krm", formatRp(rabKirim));
    bind("sum-rab-tot", formatRp(rabTot));
    bind("sum-tayang-brg", formatRp(tayangSat));
    bind("sum-tayang-krm", formatRp(tayangKirim));
    bind("sum-tayang-tot", formatRp(tayangTot));
    bind("sum-kon-brg", formatRp(konSat));
    bind("sum-kon-krm", formatRp(konKirim));
    bind("sum-kon-tot", formatRp(konTot));
    bind("sum-nego-brg", formatRp(konNegoBrg));
    bind("sum-nego-krm", formatRp(konNegoKirim));
    bind("sum-nego-tot", formatRp(konNegoTot));
    bind("pct-pel", formatPct(netKon ? pelRp / netKon * 100 : 0));
    bind("rp-pel", formatRp(pelRp));
    bind("pct-dis", formatPct(netKon ? disRp / netKon * 100 : 0));
    bind("rp-dis", formatRp(disRp));
    bind("pct-pem", formatPct(netKon ? pemRp / netKon * 100 : 0));
    bind("rp-pem", formatRp(pemRp));
    bind("pct-tot", formatPct(netKon ? (pelRp + disRp + pemRp) / netKon * 100 : 0));
    bind("rp-tot", formatRp(pelRp + disRp + pemRp));
  }

  // assets/js/pages/data-pesanan.js
  function initDataPesananPage() {
    const useAdvanced = !!window.__USE_ADVANCED_DAFTAR_PESANAN__ || !!document.getElementById("filterPesananModal");
    if ((!document.getElementById("daftar-pesanan-grid") && !document.getElementById("edit-product-grid")) || typeof Tabulator === "undefined") return;
    if (!useAdvanced && document.getElementById("daftar-pesanan-grid")) {
    const table = new Tabulator("#daftar-pesanan-grid", {
      data: JSON.parse(JSON.stringify(pesananRows)),
      layout: "fitColumns",
      pagination: "local",
      paginationSize: 10,
      columns: [
        { title: "No.", formatter: "rownum", width: 60, hozAlign: "center" },
        { title: "No. PO", field: "po", width: 130, cssClass: "fw-bold text-primary" },
        { title: "Instansi / Satuan Kerja", field: "satker", minWidth: 250 },
        { title: "Tanggal", field: "tgl", width: 130 },
        { title: "Nilai Kontrak", field: "nilai", width: 180, formatter: rpFormatter, cssClass: "fw-bold text-custom" },
        { title: "Status", field: "status", width: 140, formatter: (cell) => {
          const val = cell.getValue();
          const color = val === "Selesai" ? "success" : val === "Dikirim" ? "primary" : "warning";
          return `<span class="badge bg-${color}-subtle text-${color} border border-${color}">${val}</span>`;
        } },
        { title: "Aksi", width: 180, hozAlign: "center", headerSort: false, formatter: (cell) => {
          const po = cell.getRow().getData().po;
          return `<button class="btn btn-sm btn-info-subtle text-info border-info py-0 px-2 me-1 btn-view-data" data-po="${po}" data-bs-toggle="modal" data-bs-target="#viewModal" title="Lihat Ringkasan"><i class="fa-solid fa-eye"></i></button>
                <button class="btn btn-sm btn-custom-outline py-0 px-2 me-1 btn-edit-data" data-po="${po}" data-bs-toggle="modal" data-bs-target="#editModal" title="Edit Seluruh Data"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-primary py-0 px-2 btn-update-status" data-po="${po}" data-bs-toggle="modal" data-bs-target="#statusModal" title="Update Status Pengiriman"><i class="fa-solid fa-truck-fast"></i></button>`;
        } }
      ]
    });
    const searchInput = document.getElementById("search-pesanan");
    if (searchInput) {
      searchInput.addEventListener("keyup", function() {
        table.setFilter([[{ field: "po", type: "like", value: this.value }, { field: "satker", type: "like", value: this.value }]]);
      });
    }
    document.getElementById("daftar-pesanan-grid").addEventListener("click", (event) => {
      const statusBtn = event.target.closest(".btn-update-status");
      const viewBtn = event.target.closest(".btn-view-data");
      const editBtn = event.target.closest(".btn-edit-data");
      if (statusBtn) document.getElementById("modal-po-title").innerText = statusBtn.dataset.po;
      if (viewBtn) document.getElementById("view-po-title").innerText = viewBtn.dataset.po;
      if (editBtn) document.getElementById("edit-po-title").innerText = editBtn.dataset.po;
    });
    }
    const editTable = createProductTable("#edit-product-grid");
    const editModal = document.getElementById("editModal");
    if (editModal) {
      editModal.addEventListener("shown.bs.modal", () => editTable?.redraw());
    }
    const addBtn = document.getElementById("edit-add-row-btn");
    if (addBtn && editTable) addBtn.addEventListener("click", () => editTable.addRow({}));
  }

  // assets/js/pages/database-master.js
  function initDatabaseMasterPage() {
    if (window.__USE_ENHANCED_MASTER_PAGE__ && window.DataSystemMasterData?.initDatabaseMasterPageEnhanced) {
      window.DataSystemMasterData.initDatabaseMasterPageEnhanced().catch((error) => console.warn('[master-page-enhanced]', error));
    }
    if (typeof Tabulator === "undefined" || !document.getElementById("master-produk-grid")) return;
    const produkTable = new Tabulator("#master-produk-grid", {
      data: JSON.parse(JSON.stringify(masterProdukRows)),
      layout: "fitColumns",
      columns: [
        { title: "Kode", field: "kode", width: 120, editor: "input" },
        { title: "Nama Produk", field: "nama", minWidth: 250, editor: "input" },
        { title: "Kategori", field: "kategori", width: 150, editor: "input" },
        { title: "Principal", field: "principal", width: 150, editor: "input" },
        { title: "Aksi", formatter: () => "<button class='btn btn-sm btn-custom-outline py-0'><i class='fa-solid fa-trash text-danger'></i></button>", width: 80, hozAlign: "center", cellClick: (e, cell) => cell.getRow().delete() }
      ]
    });
    const mitraTable = new Tabulator("#master-mitra-grid", {
      data: JSON.parse(JSON.stringify(masterMitraRows)),
      layout: "fitColumns",
      columns: [
        { title: "Tipe Mitra", field: "tipe", width: 150, editor: "list", editorParams: { values: ["Pelaksana", "Distributor", "Pemasok"] } },
        { title: "Nama Perusahaan", field: "nama", minWidth: 250, editor: "input" },
        { title: "Kontak / PIC", field: "kontak", minWidth: 200, editor: "input" },
        { title: "Aksi", formatter: () => "<button class='btn btn-sm btn-custom-outline py-0'><i class='fa-solid fa-trash text-danger'></i></button>", width: 80, hozAlign: "center", cellClick: (e, cell) => cell.getRow().delete() }
      ]
    });
    const satkerTable = window.__USE_ENHANCED_MASTER_PAGE__ ? null : new Tabulator("#master-satker-grid", {
      data: JSON.parse(JSON.stringify(masterSatkerRows)),
      layout: "fitColumns",
      columns: [
        { title: "Wilayah", field: "wilayah", width: 150, editor: "input" },
        { title: "Nama Instansi / Satker", field: "instansi", minWidth: 250, editor: "input" },
        { title: "Alamat Lengkap", field: "alamat", minWidth: 250, editor: "input" },
        { title: "Aksi", formatter: () => "<button class='btn btn-sm btn-custom-outline py-0'><i class='fa-solid fa-trash text-danger'></i></button>", width: 80, hozAlign: "center", cellClick: (e, cell) => cell.getRow().delete() }
      ]
    });
    document.getElementById("btn-add-produk")?.addEventListener("click", () => produkTable.addRow({}));
    document.getElementById("btn-add-mitra")?.addEventListener("click", () => mitraTable.addRow({}));
    if (!window.__USE_ENHANCED_MASTER_PAGE__) document.getElementById("btn-add-satker")?.addEventListener("click", () => satkerTable.addRow({}));
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach((tab) => {
      tab.addEventListener("shown.bs.tab", () => {
        produkTable.redraw();
        mitraTable.redraw();
        satkerTable?.redraw();
      });
    });
  }

  // assets/js/pages/input-pesanan.js
  var ORDERS_STORAGE_KEYS = ["ordersData", "datasystem_orders"];
  var ORDER_DRAFT_STORAGE_KEYS = ["ds_order_drafts"];
  var ACTIVE_FUNNEL_CONVERT_KEY = "dsFunnelConversionDraftActive";
  var FUNNEL_STORAGE_KEY = "dsFunnelPipelineRecords";
  var ORDER_ENTRY_STAGES = {
    header: {
      label: 'Header',
      helper: 'Lengkapi identitas order, dokumen dasar, relasi principal, dan tim yang menangani order.'
    },
    execution: {
      label: 'Eksekusi',
      helper: 'Isi dokumen rantai pasok, target logistik, item produk, dan kalkulasi agar order siap diproses.'
    },
    closing: {
      label: 'Closing',
      helper: 'Gunakan tahap ini untuk update pengiriman, serah terima, BAST, dan detail penerima.'
    }
  };
  var activeOrderEntryStage = 'header';
  var activeOrderDraftId = null;
  var activeOrderEntityId = null;
  var activeOrderPoNumber = null;
  var activeOrderPreviousStatus = null;
  var activeSourceFunnelContext = null;

  function getBridge() {
    return window.DataSystemBridge || null;
  }
  function getWorkflow() {
    return window.DataSystemWorkflow || null;
  }
  function getDictionary() {
    return window.DataSystemDictionary || null;
  }
  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    } catch (_error) {
      return fallback;
    }
  }
  function normalizeOrderIdentity(row, index = 0) {
    const raw = row?.po_number || row?.po || row?.no_po || row?.order_no || row?.nomor_po || row?.id || index + 1;
    return String(raw || `ORDER-${index + 1}`).trim().toLowerCase();
  }
  function normalizeDraftIdentity(row, index = 0) {
    const raw = row?.id || row?.draft_id || row?.draft_code || row?.po_number || index + 1;
    return String(raw || `DRAFT-${index + 1}`).trim().toLowerCase();
  }
  function dedupeOrderRows(rows) {
    const result = [];
    const seen = /* @__PURE__ */ new Set();
    (Array.isArray(rows) ? rows : []).forEach((row, index) => {
      if (!row || typeof row !== "object") return;
      const key = normalizeOrderIdentity(row, index);
      if (seen.has(key)) return;
      seen.add(key);
      result.push(row);
    });
    return result;
  }
  function dedupeDraftRows(rows) {
    const result = [];
    const seen = /* @__PURE__ */ new Set();
    (Array.isArray(rows) ? rows : []).forEach((row, index) => {
      if (!row || typeof row !== "object") return;
      const key = normalizeDraftIdentity(row, index);
      if (seen.has(key)) return;
      seen.add(key);
      result.push(row);
    });
    return result;
  }
  function getPersistedOrdersRaw() {
    const bridgeOrders = getBridge()?.getCachedCollection?.("orders");
    const sources = [bridgeOrders, window.__ORDERS_DATA__, window.__APP_PESANAN_ROWS, window.ordersData, window.daftarPesananData, window.dashboardOrders];
    ORDERS_STORAGE_KEYS.forEach((key) => {
      const parsed = safeJsonParse(localStorage.getItem(key), []);
      if (Array.isArray(parsed) && parsed.length) sources.push(parsed);
    });
    const merged = [];
    sources.forEach((source) => {
      if (Array.isArray(source) && source.length) merged.push(...source);
    });
    return dedupeOrderRows(merged);
  }
  function persistOrdersRaw(rows) {
    const safeRows = dedupeOrderRows(rows);
    ORDERS_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, JSON.stringify(safeRows)));
    window.__ORDERS_DATA__ = safeRows;
    window.ordersData = safeRows;
    window.daftarPesananData = safeRows;
    window.dashboardOrders = safeRows;
    getBridge()?.setCachedCollection?.("orders", safeRows);
  }
  function getPersistedDraftsRaw() {
    const bridgeDrafts = getBridge()?.getCachedCollection?.('orderDrafts');
    const sources = [bridgeDrafts, window.__ORDER_DRAFTS__];
    ORDER_DRAFT_STORAGE_KEYS.forEach((key) => {
      const parsed = safeJsonParse(localStorage.getItem(key), []);
      if (Array.isArray(parsed) && parsed.length) sources.push(parsed);
    });
    const merged = [];
    sources.forEach((source) => {
      if (Array.isArray(source) && source.length) merged.push(...source);
    });
    return dedupeDraftRows(merged);
  }
  function persistDraftsRaw(rows) {
    const safeRows = dedupeDraftRows(rows);
    ORDER_DRAFT_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, JSON.stringify(safeRows)));
    window.__ORDER_DRAFTS__ = safeRows;
    getBridge()?.setCachedCollection?.('orderDrafts', safeRows);
    return safeRows;
  }
  function removeDraftById(draftId) {
    const next = getPersistedDraftsRaw().filter((row, index) => normalizeDraftIdentity(row, index) !== String(draftId || '').trim().toLowerCase());
    persistDraftsRaw(next);
    getBridge()?.deleteOne?.('orderDrafts', draftId).catch((error) => console.warn('[draft-delete]', error));
  }
  function normalizeLabelText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
  function formatIssueList(title, items) {
    const rows = Array.isArray(items) ? items.filter(Boolean) : [];
    return rows.length ? title + "\n- " + rows.join("\n- ") : title;
  }
  function findFieldByLabel(labelText) {
    const target = normalizeLabelText(labelText);
    const labels = [...document.querySelectorAll("#pesananForm label.form-label")];
    const label = labels.find((item) => normalizeLabelText(item.textContent) === target);
    if (!label) return null;
    return label.parentElement?.querySelector("input, select, textarea") || null;
  }
  function getSelectedOptionText(field) {
    if (!field || field.tagName !== "SELECT") return "";
    const option = field.options[field.selectedIndex];
    return normalizeLabelText(option?.textContent || "");
  }
  function isPlaceholderText(value) {
    return /^(pilih|cari)(\b|\s|\.)/i.test(String(value || ""));
  }
  function getFieldDisplayValue(labelText) {
    const field = findFieldByLabel(labelText);
    if (!field) return "";
    if (field.tagName === "SELECT") {
      const optionText = getSelectedOptionText(field);
      if (optionText && !isPlaceholderText(optionText)) return optionText;
      return normalizeLabelText(field.value || "");
    }
    return normalizeLabelText(field.value || "");
  }
  function ensureSelectOption(field, value) {
    if (!field || field.tagName !== 'SELECT') return;
    const normalizedValue = normalizeLabelText(value);
    if (!normalizedValue) {
      field.value = '';
      return;
    }
    const existing = [...field.options].find((option) => normalizeLabelText(option.textContent) === normalizedValue || normalizeLabelText(option.value) === normalizedValue);
    if (existing) {
      field.value = existing.value;
      return;
    }
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    field.appendChild(option);
    field.value = value;
  }
  function formatDateForForm(value) {
    const raw = normalizeLabelText(value);
    if (!raw || raw === '-') return '';
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) return raw;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const [yyyy, mm, dd] = raw.slice(0, 10).split('-');
      return `${dd}/${mm}/${yyyy}`;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : new Intl.DateTimeFormat('en-GB').format(parsed);
  }
  function setFieldDisplayValue(labelText, value) {
    const field = findFieldByLabel(labelText);
    if (!field) return;
    if (field.tagName === 'SELECT') {
      ensureSelectOption(field, value);
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    field.value = field.classList.contains('datepicker') ? formatDateForForm(value) : (value ?? '');
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function getCheckedRadioLabel(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    if (!checked) return "";
    const wrapper = checked.closest(".form-check");
    return normalizeLabelText(wrapper?.querySelector("label")?.textContent || checked.value || "");
  }
  function setRadioByLabel(name, expectedLabel) {
    if (!expectedLabel) return;
    document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      const wrapper = input.closest('.form-check');
      const text = normalizeLabelText(wrapper?.querySelector('label')?.textContent || input.value || '');
      input.checked = text === normalizeLabelText(expectedLabel);
    });
  }
  function normalizeDateInput(value) {
    const raw = normalizeLabelText(value);
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
  }
  function getMoneySummaryValue(id) {
    return parseRp(document.getElementById(id)?.textContent || "0");
  }
  function buildOrderItems(tableData) {
    return (Array.isArray(tableData) ? tableData : []).map((row, index) => {
      const qty = Number(row.qty || 0) || 1;
      const tayangUnit = Number(row.tayang_sat || 0) + Number(row.tayang_kirim_sat || 0);
      const kontrakUnit = Number(row.kon_sat || 0) + Number(row.kon_kirim_sat || 0);
      const negoUnit = Number(row.kon_nego_sat || 0) + Number(row.kon_nego_kirim_sat || 0);
      const hppUnit = Number(row.hpp_pel_sat || row.hpp_dis_sat || row.hpp_pem_sat || 0);
      return {
        product_code: row.product_code || row.kode_barang || row.kode || `ITEM-${String(index + 1).padStart(3, "0")}`,
        product_name: row.product_name || row.nama_barang || row.nama || `Item ${index + 1}`,
        category: row.category || row.kategori || "-",
        qty,
        hpp_total: hppUnit * qty,
        tayang_total: tayangUnit * qty,
        kontrak_total: kontrakUnit * qty,
        nego_total: negoUnit * qty,
      };
    }).filter((item) => item.product_name || item.qty || item.kontrak_total || item.hpp_total);
  }
  function createAutoPoNumber(existingRows) {
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const existing = /* @__PURE__ */ new Set((Array.isArray(existingRows) ? existingRows : []).map((row, index) => normalizeOrderIdentity(row, index)));
    let counter = Math.max((Array.isArray(existingRows) ? existingRows.length : 0) + 1, 1);
    let poNumber = "";
    do {
      poNumber = `PO-${year}-${String(counter).padStart(3, "0")}`;
      counter += 1;
    } while (existing.has(poNumber.toLowerCase()));
    return poNumber;
  }
  function hasDuplicatePo(existingRows, poNumber, currentId) {
    const target = String(poNumber || "").trim().toLowerCase();
    if (!target) return false;
    return (Array.isArray(existingRows) ? existingRows : []).some((row, index) => {
      const sameRecord = currentId && String(row?.id || '').trim() === String(currentId || '').trim();
      if (sameRecord) return false;
      return normalizeOrderIdentity(row, index) === target;
    });
  }
  function validateDraftConversionGuard(draft, orderNo) {
    if (!draft?.id) return { ok: true, errors: [], warnings: [] };
    return getWorkflow()?.validateFunnelConversion?.(draft, { mode: "create", targetOrderNo: orderNo }) || { ok: true, errors: [], warnings: [] };
  }
  function getDocumentStatus(inputId) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput) return 'Belum';
    if (fileInput?.files?.length) return 'Sudah';
    return String(fileInput.dataset.uploaded || '').trim() === 'Sudah' ? 'Sudah' : 'Belum';
  }
  function markFileInputStatus(inputId, status) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput) return;
    fileInput.dataset.uploaded = status === 'Sudah' ? 'Sudah' : 'Belum';
    const zone = fileInput.closest('.file-drop-zone');
    if (!zone) return;
    const textEl = zone.querySelector('p, h6');
    const iconEl = zone.querySelector('i');
    if (status === 'Sudah') {
      if (textEl) {
        textEl.innerText = 'Dokumen sudah tersimpan';
        textEl.style.color = 'var(--primary-color)';
      }
      if (iconEl) {
        iconEl.className = 'fa-solid fa-check-circle';
        iconEl.style.color = 'var(--primary-color)';
      }
    }
  }
  function computeOrderCompleteness(order) {
    if (!order.items?.length) return "Belum Ada Kalkulasi";
    const required = [order.po_number, order.po_date, order.satker, order.nama_pengadaan, order.principal, order.pemasok, order.pelaksana];
    if (required.some((value) => !normalizeLabelText(value))) return "Data Kurang";
    const docs = [order.doc_po_pel, order.doc_po_dis, order.doc_po_pem, order.doc_sj];
    if (docs.some((value) => value !== "Sudah")) return "Dokumen Kurang";
    return "Lengkap";
  }
  function updateFunnelConversionStatus(funnelDraft, orderNo) {
    if (!funnelDraft?.id) return;
    const rows = safeJsonParse(localStorage.getItem(FUNNEL_STORAGE_KEY), []);
    if (!Array.isArray(rows) || !rows.length) return;
    const target = rows.find((row) => row.id === funnelDraft.id);
    if (!target) return;
    target.converted = true;
    target.convertedOrderNo = orderNo;
    target.status = "Closed Won";
    target.stage = "Menang / Deal";
    target.lastUpdate = (/* @__PURE__ */ new Date()).toISOString();
    target.relatedOrders = Array.isArray(target.relatedOrders) ? target.relatedOrders.filter((item) => String(item.orderNo || item.order_no || "") !== orderNo) : [];
    target.relatedOrders.unshift({
      orderNo,
      linkType: "create",
      linkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      linkedBy: "Form Pesanan"
    });
    target.followUpHistory = Array.isArray(target.followUpHistory) ? target.followUpHistory : [];
    target.followUpHistory.unshift({
      date: (/* @__PURE__ */ new Date()).toISOString(),
      note: `Dikonversi menjadi pesanan ${orderNo}`,
    });
    localStorage.setItem(FUNNEL_STORAGE_KEY, JSON.stringify(rows));
    getBridge()?.setCachedCollection?.("funnels", rows);
  }
  function buildOrderFromForm(table, options) {
    const opts = options || {};
    const draft = safeJsonParse(sessionStorage.getItem(ACTIVE_FUNNEL_CONVERT_KEY), null) || window.__CONVERTED_FUNNEL_DRAFT__ || null;
    const funnelContext = draft || activeSourceFunnelContext || null;
    const existingRows = getPersistedOrdersRaw();
    const poNumber = getFieldDisplayValue("No. Surat Pesanan / P.O") || activeOrderPoNumber || (opts.entryMode === 'draft' ? `DRAFT-PO-${Date.now()}` : createAutoPoNumber(existingRows));
    const satker = getFieldDisplayValue("Satuan Kerja");
    const kabupatenKota = getFieldDisplayValue("Kabupaten/Kota");
    const items = buildOrderItems(table?.getData?.() || []);
    const bruttoFromSummary = getMoneySummaryValue("sum-tayang-tot");
    const nettoFromSummary = getMoneySummaryValue("sum-kon-tot");
    const negosiasi = getMoneySummaryValue("sum-nego-tot");
    const tayangBarang = getMoneySummaryValue("sum-tayang-brg");
    const tayangOngkir = getMoneySummaryValue("sum-tayang-krm");
    const kontrakBarang = getMoneySummaryValue("sum-kon-brg");
    const kontrakOngkir = getMoneySummaryValue("sum-kon-krm");
    const brutto = bruttoFromSummary || nettoFromSummary + negosiasi;
    const statusTarget = getWorkflow()?.normalizeOrderStatus?.(document.getElementById('order-status-target')?.value || 'Baru') || 'Baru';
    const shippingTarget = getWorkflow()?.normalizeShippingStatus?.(document.getElementById('input-status-pengiriman')?.value || 'Belum Diproses') || 'Belum Diproses';
    const order = {
      id: activeOrderEntityId || `${poNumber}-${Date.now()}`,
      po_number: poNumber,
      po_date: normalizeDateInput(getFieldDisplayValue("Tanggal P.O")),
      kode_rup: getFieldDisplayValue("Kode RUP"),
      wilayah: funnelContext?.wilayah || getFieldDisplayValue("Wilayah") || "-",
      kabkota: kabupatenKota || funnelContext?.kabupatenKota || funnelContext?.kabkota || "-",
      kabupaten_kota: kabupatenKota || funnelContext?.kabupatenKota || funnelContext?.kabkota || "-",
      kabupatenKota: kabupatenKota || funnelContext?.kabupatenKota || funnelContext?.kabkota || "-",
      instansi: getFieldDisplayValue("Instansi / Dinas") || funnelContext?.instansi || satker || "-",
      satker: satker || funnelContext?.satker || "-",
      nama_pengadaan: getFieldDisplayValue("Nama Pengadaan") || funnelContext?.namaPengadaan || funnelContext?.nama_pengadaan || "-",
      principal: getFieldDisplayValue("Principal") || funnelContext?.principal || "-",
      pemasok: getFieldDisplayValue("Pemasok") || funnelContext?.pemasok || "-",
      distributor: getFieldDisplayValue("Distributor") || funnelContext?.distributor || "-",
      pelaksana: getFieldDisplayValue("Pelaksana") || funnelContext?.pelaksana || "-",
      pic: getFieldDisplayValue("PIC Omset") || funnelContext?.picOmset || funnelContext?.pic || "-",
      penggarap: getFieldDisplayValue("Penggarap") || funnelContext?.penggarap || "-",
      sumber_dana: getFieldDisplayValue("Sumber Dana") || "-",
      ppn_mode: getCheckedRadioLabel("ppn") || "Termasuk PPN",
      kontrak_selesai_date: normalizeDateInput(getFieldDisplayValue("Tgl Kontrak Selesai")),
      brutto,
      netto: nettoFromSummary,
      negosiasi,
      tayang_barang: tayangBarang,
      tayang_ongkir: tayangOngkir,
      kontrak_barang: kontrakBarang,
      kontrak_ongkir: kontrakOngkir,
      status_pesanan: statusTarget,
      status_pengiriman: shippingTarget,
      sla_status: statusTarget === 'Bermasalah' || shippingTarget === 'Terkendala' ? 'Overdue' : 'On Track',
      kelengkapan: "Lengkap",
      prioritas: "Normal",
      funnel_id: funnelContext?.id || funnelContext?.funnel_id || funnelContext?.source_funnel_id || null,
      source_funnel_id: funnelContext?.id || funnelContext?.funnel_id || funnelContext?.source_funnel_id || null,
      source_funnel_code: funnelContext?.id || funnelContext?.funnel_id || funnelContext?.source_funnel_id || null,
      source_funnel_name: funnelContext?.namaPengadaan || funnelContext?.nama_pengadaan || funnelContext?.source_funnel_name || null,
      last_update_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_by: "Form Pesanan",
      target_prep: normalizeDateInput(getFieldDisplayValue("Batas Penyiapan Barang")),
      target_arrive_1: normalizeDateInput(getFieldDisplayValue("Batas Tiba di Tujuan Pertama")),
      target_arrive_final: normalizeDateInput(getFieldDisplayValue("Batas Tiba di Tujuan Akhir")),
      sales_number: normalizeLabelText(document.getElementById('input-sales-number')?.value || '-') || '-',
      resi: normalizeLabelText(document.getElementById('input-resi')?.value || '-') || '-',
      receiver: normalizeLabelText(document.getElementById('input-receiver')?.value || '-') || '-',
      actual_sent: normalizeDateInput(document.getElementById('input-actual-sent')?.value || ''),
      actual_received: normalizeDateInput(document.getElementById('input-actual-received')?.value || ''),
      issue_note: normalizeLabelText(document.getElementById('input-issue-note')?.value || '-') || '-',
      doc_po_pel: getDocumentStatus("doc1"),
      doc_po_dis: getDocumentStatus("doc2"),
      doc_po_pem: getDocumentStatus("doc3"),
      doc_sj: getDocumentStatus("doc4"),
      doc_bast: document.getElementById('input-doc-bast')?.value || 'Belum',
      nota_oldist: getFieldDisplayValue("No. Nota Oldist") || "-",
      nota_oldist_date: normalizeDateInput(getFieldDisplayValue("Tgl Nota Oldist")),
      nota_erp: getFieldDisplayValue("Nota ERP") || "-",
      entry_stage: activeOrderEntryStage,
      entry_mode: opts.entryMode || 'final',
      draft_id: activeOrderDraftId || null,
      items,
    };
    order.kelengkapan = computeOrderCompleteness(order);
    return { order, draft: funnelContext, existingRows };
  }

  async function renderOrderOpsPreview(order) {
    const checklistBox = document.getElementById('order-form-checklist-preview');
    const historyBox = document.getElementById('order-form-history-preview');
    if (checklistBox) {
      const checklist = getWorkflow()?.getDocumentChecklist?.(order) || [];
      checklistBox.innerHTML = getWorkflow()?.renderDocumentChecklist?.(checklist) || 'Checklist belum tersedia.';
    }
    if (historyBox) {
      if (!order?.id && !order?.po_number) {
        historyBox.textContent = 'Riwayat perubahan akan tampil saat order sudah pernah disimpan atau draft aktif.';
      } else {
        historyBox.innerHTML = '<div class="text-muted small">Memuat riwayat perubahan...</div>';
        try {
          const rows = await getBridge()?.getAuditLogs?.({ limit: 20 });
          const filtered = (Array.isArray(rows) ? rows : []).filter((log) => String(log.entity_type || '').toLowerCase() === 'order' && (String(log.entity_id || '') === String(order.id) || String(log.entity_id || '') === String(order.po_number))).slice(0, 8);
          historyBox.innerHTML = getWorkflow()?.renderStatusHistory?.(filtered) || '<div class="text-muted small">Belum ada riwayat.</div>';
        } catch (_error) {
          historyBox.innerHTML = '<div class="text-muted small">Riwayat belum tersedia.</div>';
        }
      }
    }
  }

  function refreshOrderOpsPreview(table) {
    try {
      const built = buildOrderFromForm(table, { entryMode: 'preview' });
      renderOrderOpsPreview(built.order);
    } catch (_error) {}
  }

  function refreshDraftState(message, type) {
    const target = document.getElementById('order-draft-state');
    if (!target) return;
    target.textContent = message || 'Belum ada draft aktif';
    target.classList.toggle('text-success', type === 'success');
    target.classList.toggle('text-warning', type === 'warning');
  }
  function classifyOrderStageSections() {
    const form = document.getElementById('pesananForm');
    if (!form || form.dataset.stageBound === 'true') return;
    form.dataset.stageBound = 'true';
    const children = [...form.children].filter((child) => child.nodeType === 1);
    const firstRow = children.find((child) => child.matches('.row.g-3.mb-3'));
    if (firstRow) {
      [...firstRow.children].forEach((col) => {
        const title = normalizeLabelText(col.querySelector('.card-header-custom h5')?.textContent || '');
        col.dataset.orderStage = /(^1\.|^2\.|^3\.|^4\.)/.test(title) ? 'header' : 'execution';
      });
    }
    children.forEach((child) => {
      if (child.dataset.orderStage || child.getAttribute('data-order-stage')) return;
      if (child.matches('h5, .row')) child.dataset.orderStage = 'execution';
    });
  }
  function renderOrderStageVisibility() {
    const form = document.getElementById('pesananForm');
    if (!form) return;
    const active = activeOrderEntryStage;
    form.querySelectorAll('[data-order-stage]').forEach((node) => {
      const stage = node.getAttribute('data-order-stage') || node.dataset.orderStage;
      node.classList.toggle('order-stage-section-hidden', stage !== active);
    });
    const firstRow = form.querySelector('.row.g-3.mb-3');
    if (firstRow) {
      const hasVisible = [...firstRow.children].some((child) => !child.classList.contains('order-stage-section-hidden'));
      firstRow.classList.toggle('order-stage-section-hidden', !hasVisible && active !== 'closing');
      if (active === 'closing') firstRow.classList.add('order-stage-section-hidden');
    }
  }
  function setOrderStage(stage) {
    if (!ORDER_ENTRY_STAGES[stage]) return;
    activeOrderEntryStage = stage;
    const meta = ORDER_ENTRY_STAGES[stage];
    document.getElementById('order-stage-badge') && (document.getElementById('order-stage-badge').textContent = meta.label);
    document.getElementById('order-stage-helper') && (document.getElementById('order-stage-helper').textContent = meta.helper);
    document.querySelectorAll('#order-stage-switch .stage-btn').forEach((btn) => {
      const isActive = btn.dataset.stage === stage;
      btn.classList.toggle('btn-primary', isActive);
      btn.classList.toggle('btn-outline-primary', !isActive);
      btn.classList.toggle('is-active', isActive);
    });
    const sequence = Object.keys(ORDER_ENTRY_STAGES);
    const index = sequence.indexOf(stage);
    const prevBtn = document.getElementById('order-stage-prev-btn');
    const nextBtn = document.getElementById('order-stage-next-btn');
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) {
      nextBtn.disabled = index >= sequence.length - 1;
      nextBtn.innerHTML = index >= sequence.length - 1 ? 'Tahap Terakhir' : 'Lanjut Tahap Berikutnya<i class="fa-solid fa-arrow-right ms-2"></i>';
    }
    renderOrderStageVisibility();
  }
  function populateOrderWorkflowDropdowns() {
    const dict = getDictionary()?.getStatusDictionary?.() || {};
    const orderSelect = document.getElementById('order-status-target');
    const shippingSelect = document.getElementById('input-status-pengiriman');
    if (orderSelect && !orderSelect.dataset.seeded) {
      orderSelect.innerHTML = (dict.orderStatus || ['Baru']).map((item) => `<option value="${item}">${item}</option>`).join('');
      orderSelect.value = 'Baru';
      orderSelect.dataset.seeded = 'true';
    }
    if (shippingSelect && !shippingSelect.dataset.seeded) {
      shippingSelect.innerHTML = (dict.shippingStatus || ['Belum Diproses']).map((item) => `<option value="${item}">${item}</option>`).join('');
      shippingSelect.value = 'Belum Diproses';
      shippingSelect.dataset.seeded = 'true';
    }
  }
  function convertItemsForGrid(items) {
    return (Array.isArray(items) ? items : []).map((item) => {
      const qty = Number(item.qty || 0) || 1;
      return {
        product_code: item.product_code || '',
        product_name: item.product_name || '',
        category: item.category || '-',
        qty,
        hpp_pel_sat: Math.round(Number(item.hpp_total || 0) / qty),
        tayang_sat: Math.round(Number(item.tayang_total || 0) / qty),
        kon_sat: Math.round(Number(item.kontrak_total || 0) / qty),
        kon_nego_sat: Math.round(Number(item.nego_total || 0) / qty),
      };
    });
  }
  function fillOrderFormFromRecord(record, table, options) {
    const row = record?.payload_json || record?.payload || record || {};
    activeOrderDraftId = options?.mode === 'draft' ? (row.draft_id || row.id || activeOrderDraftId) : null;
    activeOrderEntityId = options?.mode === 'order' ? (row.id || activeOrderEntityId) : (row.id && row.entry_mode !== 'draft' ? row.id : activeOrderEntityId);
    activeOrderPoNumber = row.po_number || row.po || activeOrderPoNumber;
    activeOrderPreviousStatus = row.status_pesanan || row.status_order || activeOrderPreviousStatus;
    activeSourceFunnelContext = row.funnel_id || row.source_funnel_id || row.source_funnel_name ? {
      id: row.funnel_id || row.source_funnel_id || null,
      funnel_id: row.funnel_id || row.source_funnel_id || null,
      source_funnel_id: row.source_funnel_id || row.funnel_id || null,
      namaPengadaan: row.source_funnel_name || row.nama_pengadaan || row.namaPengadaan || null,
      nama_pengadaan: row.source_funnel_name || row.nama_pengadaan || row.namaPengadaan || null,
      satker: row.satker || null,
      instansi: row.instansi || null,
      principal: row.principal || null,
      penggarap: row.penggarap || null,
      picOmset: row.pic || row.pic_omset || null,
      kabupatenKota: row.kabupatenKota || row.kabkota || row.kabupaten_kota || null,
      kabkota: row.kabkota || row.kabupatenKota || row.kabupaten_kota || null,
      wilayah: row.wilayah || null
    } : activeSourceFunnelContext;
    setFieldDisplayValue('Wilayah', row.wilayah || '');
    setFieldDisplayValue('Kabupaten/Kota', row.kabkota || row.kabupatenKota || row.kabupaten_kota || '');
    setFieldDisplayValue('Instansi / Dinas', row.instansi || '');
    setFieldDisplayValue('Satuan Kerja', row.satker || row.instansi || '');
    setFieldDisplayValue('Kode RUP', row.kode_rup || row.kodeRup || '');
    setFieldDisplayValue('Nama Pengadaan', row.nama_pengadaan || row.namaPengadaan || '');
    setFieldDisplayValue('No. Surat Pesanan / P.O', row.po_number || row.po || '');
    setFieldDisplayValue('Tanggal P.O', row.po_date || '');
    setFieldDisplayValue('Tgl Kontrak Selesai', row.kontrak_selesai_date || '');
    setFieldDisplayValue('Sumber Dana', row.sumber_dana || '');
    setFieldDisplayValue('Pelaksana', row.pelaksana || '');
    setFieldDisplayValue('Distributor', row.distributor || '');
    setFieldDisplayValue('Pemasok', row.pemasok || '');
    setFieldDisplayValue('Principal', row.principal || '');
    setFieldDisplayValue('Penggarap', row.penggarap || '');
    setFieldDisplayValue('PIC Omset', row.pic || row.pic_omset || '');
    setFieldDisplayValue('No. Nota Oldist', row.nota_oldist || '');
    setFieldDisplayValue('Tgl Nota Oldist', row.nota_oldist_date || '');
    setFieldDisplayValue('Nota ERP', row.nota_erp || '');
    setRadioByLabel('ppn', row.ppn_mode || 'Termasuk PPN');
    if (document.getElementById('order-status-target')) document.getElementById('order-status-target').value = getWorkflow()?.normalizeOrderStatus?.(row.status_pesanan || 'Baru') || 'Baru';
    if (document.getElementById('input-status-pengiriman')) document.getElementById('input-status-pengiriman').value = getWorkflow()?.normalizeShippingStatus?.(row.status_pengiriman || 'Belum Diproses') || 'Belum Diproses';
    if (document.getElementById('input-sales-number')) document.getElementById('input-sales-number').value = row.sales_number && row.sales_number !== '-' ? row.sales_number : '';
    if (document.getElementById('input-resi')) document.getElementById('input-resi').value = row.resi && row.resi !== '-' ? row.resi : '';
    if (document.getElementById('input-actual-sent')) document.getElementById('input-actual-sent').value = formatDateForForm(row.actual_sent || '');
    if (document.getElementById('input-actual-received')) document.getElementById('input-actual-received').value = formatDateForForm(row.actual_received || '');
    if (document.getElementById('input-receiver')) document.getElementById('input-receiver').value = row.receiver && row.receiver !== '-' ? row.receiver : '';
    if (document.getElementById('input-issue-note')) document.getElementById('input-issue-note').value = row.issue_note && row.issue_note !== '-' ? row.issue_note : '';
    if (document.getElementById('input-doc-bast')) document.getElementById('input-doc-bast').value = row.doc_bast || 'Belum';
    markFileInputStatus('doc1', row.doc_po_pel || 'Belum');
    markFileInputStatus('doc2', row.doc_po_dis || 'Belum');
    markFileInputStatus('doc3', row.doc_po_pem || 'Belum');
    markFileInputStatus('doc4', row.doc_sj || 'Belum');
    if (table?.setData) table.setData(convertItemsForGrid(row.items || []));
    updateSummaryCards(table);
    refreshOrderOpsPreview(table);
    initSearchableDropdowns();
    initDatepickers();
    setOrderStage(row.entry_stage && ORDER_ENTRY_STAGES[row.entry_stage] ? row.entry_stage : (options?.mode === 'order' ? 'execution' : 'header'));
    refreshDraftState(options?.mode === 'draft' ? `Draft aktif: ${row.draft_code || row.po_number || row.nama_pengadaan || row.id}` : `Sedang edit order ${row.po_number || row.id}`, options?.mode === 'draft' ? 'warning' : 'success');
  }
  function prefillOrderFormFromFunnelDraft() {
    const draft = safeJsonParse(sessionStorage.getItem(ACTIVE_FUNNEL_CONVERT_KEY), null) || window.__CONVERTED_FUNNEL_DRAFT__ || null;
    const funnelContext = draft || activeSourceFunnelContext || null;
    if (!draft) return;
    if (!getFieldDisplayValue('Nama Pengadaan')) setFieldDisplayValue('Nama Pengadaan', draft.namaPengadaan || '');
    if (!getFieldDisplayValue('Satuan Kerja')) setFieldDisplayValue('Satuan Kerja', draft.satker || draft.instansi || '');
    if (!getFieldDisplayValue('Kode RUP')) setFieldDisplayValue('Kode RUP', draft.kodeRup || draft.kode_rup || '');
    if (!getFieldDisplayValue('Kabupaten/Kota')) setFieldDisplayValue('Kabupaten/Kota', draft.kabupatenKota || draft.kabkota || '');
    if (!getFieldDisplayValue('Principal')) setFieldDisplayValue('Principal', draft.principal || '');
    if (!getFieldDisplayValue('Pemasok')) setFieldDisplayValue('Pemasok', draft.pemasok || '');
    if (!getFieldDisplayValue('Distributor')) setFieldDisplayValue('Distributor', draft.distributor || '');
    if (!getFieldDisplayValue('Pelaksana')) setFieldDisplayValue('Pelaksana', draft.pelaksana || '');
    if (!getFieldDisplayValue('Penggarap')) setFieldDisplayValue('Penggarap', draft.penggarap || '');
    if (!getFieldDisplayValue('PIC Omset')) setFieldDisplayValue('PIC Omset', draft.picOmset || draft.pic_omset || '');
    initSearchableDropdowns();
  }
  function hydrateInputPesananContext(table) {
    const params = new URLSearchParams(window.location.search || '');
    const draftId = params.get('draft');
    const poNumber = params.get('po');
    if (draftId) {
      const draft = getPersistedDraftsRaw().find((row, index) => normalizeDraftIdentity(row, index) === String(draftId).trim().toLowerCase());
      if (draft) {
        fillOrderFormFromRecord(draft, table, { mode: 'draft' });
        return;
      }
    }
    if (poNumber) {
      const order = getPersistedOrdersRaw().find((row) => String(row?.po_number || row?.po || '').trim().toLowerCase() === String(poNumber).trim().toLowerCase());
      if (order) {
        fillOrderFormFromRecord(order, table, { mode: 'order' });
        return;
      }
    }
    prefillOrderFormFromFunnelDraft();
    setOrderStage('header');
  }
  function buildDraftFromCurrentForm(table) {
    const built = buildOrderFromForm(table, { entryMode: 'draft' });
    const draftId = activeOrderDraftId || `DRAFT-${Date.now()}`;
    const order = built.order;
    return {
      ...order,
      id: draftId,
      draft_id: draftId,
      draft_code: order.po_number || order.nama_pengadaan || draftId,
      entry_stage: activeOrderEntryStage,
      entry_mode: 'draft',
      is_draft: true,
      last_saved_at: new Date().toISOString(),
    };
  }
  function validateCurrentOrderStage(table) {
    const built = buildOrderFromForm(table, { entryMode: 'stage-check' });
    const validation = getWorkflow()?.validateOrderEntryStage?.(built.order, activeOrderEntryStage, { relaxed: false }) || { ok: true, errors: [] };
    return validation;
  }
  function initInputPesananPage() {
    if (!document.getElementById("product-grid")) return;
    const table = createProductTable("#product-grid");
    if (!table) return;
    table.on("dataChanged", () => { updateSummaryCards(table); refreshOrderOpsPreview(table); });
    table.on("cellEdited", () => { updateSummaryCards(table); refreshOrderOpsPreview(table); });
    table.on("rowDeleted", () => { updateSummaryCards(table); refreshOrderOpsPreview(table); });
    document.getElementById("add-row-btn")?.addEventListener("click", () => table.addRow({}));

    populateOrderWorkflowDropdowns();
    window.DataSystemMasterData?.bindOrderForm?.().catch((error) => console.warn('[bindOrderForm]', error));
    classifyOrderStageSections();
    hydrateInputPesananContext(table);
    renderOrderStageVisibility();
    refreshOrderOpsPreview(table);

    document.querySelectorAll('#order-stage-switch .stage-btn').forEach((btn) => {
      btn.addEventListener('click', () => { setOrderStage(btn.dataset.stage); refreshOrderOpsPreview(table); });
    });
    document.getElementById('order-stage-prev-btn')?.addEventListener('click', () => {
      const sequence = Object.keys(ORDER_ENTRY_STAGES);
      const index = sequence.indexOf(activeOrderEntryStage);
      if (index > 0) setOrderStage(sequence[index - 1]);
      refreshOrderOpsPreview(table);
    });
    document.getElementById('order-stage-next-btn')?.addEventListener('click', () => {
      const validation = validateCurrentOrderStage(table);
      if (!validation.ok) {
        alert(formatIssueList(`Tahap ${ORDER_ENTRY_STAGES[activeOrderEntryStage].label} belum lengkap.`, validation.errors));
        return;
      }
      const sequence = Object.keys(ORDER_ENTRY_STAGES);
      const index = sequence.indexOf(activeOrderEntryStage);
      if (index < sequence.length - 1) setOrderStage(sequence[index + 1]);
      refreshOrderOpsPreview(table);
    });
    document.getElementById('save-draft-btn')?.addEventListener('click', async () => {
      refreshOrderOpsPreview(table);
      const draftPayload = buildDraftFromCurrentForm(table);
      activeOrderDraftId = draftPayload.id;
      const nextDrafts = [draftPayload, ...getPersistedDraftsRaw().filter((row, index) => normalizeDraftIdentity(row, index) !== normalizeDraftIdentity(draftPayload, 0))];
      persistDraftsRaw(nextDrafts);
      getBridge()?.upsertOne?.('orderDrafts', draftPayload).catch((error) => console.warn('[draft-upsert]', error));
      getBridge()?.appendAuditLog?.({
        entityType: 'order_draft',
        entityId: draftPayload.id,
        actionType: 'save',
        actorName: 'Form Pesanan',
        summary: `Menyimpan draft ${draftPayload.draft_code}`,
        snapshot: { po_number: draftPayload.po_number, entry_stage: draftPayload.entry_stage }
      });
      refreshDraftState(`Draft tersimpan: ${draftPayload.draft_code} • ${new Date().toLocaleString('id-ID')}`, 'success');
      window.DataSystemFeedback?.toast?.(`Draft ${draftPayload.draft_code} berhasil disimpan.`, "success") || alert(`Draft ${draftPayload.draft_code} berhasil disimpan.`);
    });
    document.getElementById('cancel-order-btn')?.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.DataSystemNavigation?.navigate?.('data-pesanan.html') || (window.location.href = 'data-pesanan.html');
      }
    });

    document.querySelectorAll('#pesananForm input, #pesananForm select, #pesananForm textarea, #order-status-target').forEach((field) => {
      field.addEventListener('change', () => refreshOrderOpsPreview(table));
      field.addEventListener('input', () => refreshOrderOpsPreview(table));
    });

    const saveBtn = document.getElementById("save-data-btn");
    if (saveBtn && saveBtn.dataset.bound !== "true") {
      saveBtn.dataset.bound = "true";
      saveBtn.addEventListener("click", async () => {
        const { order, draft, existingRows } = buildOrderFromForm(table, { entryMode: 'final' });
        const poFilledManually = !!getFieldDisplayValue("No. Surat Pesanan / P.O");
        if (poFilledManually && hasDuplicatePo(existingRows, order.po_number, activeOrderEntityId)) {
          alert(`Nomor PO ${order.po_number} sudah ada. Gunakan nomor lain agar tidak duplikat.`);
          return;
        }
        const draftGuard = validateDraftConversionGuard(draft, order.po_number);
        if (!draftGuard.ok) {
          alert(formatIssueList("Funnel sumber belum memenuhi syarat konversi.", draftGuard.errors));
          return;
        }
        if (draftGuard.warnings?.length) {
          const proceedDraft = await (window.DataSystemFeedback?.confirm?.(formatIssueList("Ada catatan pada funnel sumber:", draftGuard.warnings) + "\n\nTetap simpan pesanan?", { title: "Konfirmasi simpan pesanan", variant: "warning", confirmText: "Tetap simpan", cancelText: "Batal" }) ?? Promise.resolve(window.confirm(formatIssueList("Ada catatan pada funnel sumber:", draftGuard.warnings) + "\n\nTetap simpan pesanan?")));
          if (!proceedDraft) return;
        }
        const duplicateReport = await getBridge()?.checkDuplicates?.("order", order);
        if (duplicateReport?.decision === "block") {
          alert(formatIssueList("Order terdeteksi duplikat dan diblokir.", duplicateReport.matches.map((item) => item.message)));
          return;
        }
        if (duplicateReport?.decision === "warn") {
          const proceedDuplicate = await (window.DataSystemFeedback?.confirm?.(formatIssueList("Ada indikasi order mirip dengan data lain:", duplicateReport.matches.map((item) => item.message)) + "\n\nTetap simpan order?", { title: "Indikasi duplikasi order", variant: "warning", confirmText: "Tetap simpan", cancelText: "Batal" }) ?? Promise.resolve(window.confirm(formatIssueList("Ada indikasi order mirip dengan data lain:", duplicateReport.matches.map((item) => item.message)) + "\n\nTetap simpan order?")));
          if (!proceedDuplicate) return;
        }
        const validation = getWorkflow()?.validateOrderWorkflow?.(order, activeOrderPreviousStatus || null);
        if (validation && !validation.ok) {
          alert(formatIssueList('Data pesanan belum bisa disimpan.', validation.errors));
          return;
        }
        const merged = dedupeOrderRows([order, ...existingRows.filter((row) => String(row?.id || '') !== String(activeOrderEntityId || ''))]);
        persistOrdersRaw(merged);
        getBridge()?.upsertOne?.("orders", order).catch((error) => console.warn("[order-upsert]", error));
        if (draft?.id) {
          updateFunnelConversionStatus(draft, order.po_number);
          getBridge()?.linkFunnelOrder?.({
            funnelId: draft.id,
            orderNo: order.po_number,
            orderId: order.id,
            actorName: "Form Pesanan",
            linkType: activeOrderEntityId ? 'update' : 'create',
            funnelName: draft.namaPengadaan || null,
            orderName: order.nama_pengadaan || null,
            note: activeOrderEntityId ? 'Order diperbarui dari form pesanan' : 'Order dibuat dari modal konversi funnel'
          }).catch((error) => console.warn("[order-link-funnel]", error));
        }
        getBridge()?.appendAuditLog?.({
          entityType: "order",
          entityId: order.id,
          actionType: activeOrderEntityId ? 'update' : 'create',
          actorName: "Form Pesanan",
          summary: `${activeOrderEntityId ? 'Memperbarui' : 'Membuat'} order ${order.po_number}`,
          snapshot: { po_number: order.po_number, funnel_id: order.funnel_id || null, entry_stage: order.entry_stage }
        });
        if (activeOrderDraftId) {
          removeDraftById(activeOrderDraftId);
          activeOrderDraftId = null;
        }
        activeOrderEntityId = order.id;
        activeOrderPoNumber = order.po_number;
        activeOrderPreviousStatus = order.status_pesanan;
        sessionStorage.removeItem(ACTIVE_FUNNEL_CONVERT_KEY);
        window.__CONVERTED_FUNNEL_DRAFT__ = null;
        activeSourceFunnelContext = draft || activeSourceFunnelContext;
        refreshDraftState(`Order ${order.po_number} sudah tersimpan final`, 'success');
        window.DataSystemFeedback?.toast?.(`Data pesanan ${order.po_number} berhasil disimpan.`, "success") || alert(`Data pesanan ${order.po_number} berhasil disimpan.`);
      });
    }
    updateSummaryCards(table);
    refreshOrderOpsPreview(table);
  }

  // assets/js/pages/kalkulator-b2b.js
  function initKalkulatorB2BPage() {
    const calcQty = document.getElementById("calc-qty");
    if (!calcQty) return;
    const PPN_RATE = 0.11;
    const PPH22_RATE = 0.015;
    const PPH_BADAN_RATE = 0.22;
    function runKalkulatorB2B() {
      const qty = parseInt(calcQty.value, 10) || 1;
      const tayangSat = parseRp(document.getElementById("calc-tayang").value);
      const negoSat = parseRp(document.getElementById("calc-nego").value);
      const hppProdSat = parseRp(document.getElementById("calc-hpp-prod").value);
      const ppnProdStatus = document.querySelector('input[name="ppnProd"]:checked')?.value || "include";
      const labaProdPct = (parseFloat(document.getElementById("calc-laba-prod-pct").value) || 0) / 100;
      const basisLaba = document.getElementById("calc-basis-laba").value;
      const kontrakSat = tayangSat - negoSat;
      const kontrakTotal = kontrakSat * qty;
      const tayangTotal = tayangSat * qty;
      document.getElementById("lbl-total-kontrak").innerText = formatRp(kontrakTotal);
      const dppTayangSat = tayangSat / (1 + PPN_RATE);
      const dppHppProdSat = ppnProdStatus === "include" ? hppProdSat / (1 + PPN_RATE) : hppProdSat;
      let dppJualCvSat = 0;
      let labaProdSat = 0;
      if (basisLaba === "jual_cv") {
        dppJualCvSat = dppHppProdSat / Math.max(1e-4, 1 - labaProdPct);
        labaProdSat = dppJualCvSat * labaProdPct;
      } else if (basisLaba === "hpp") {
        labaProdSat = dppHppProdSat * labaProdPct;
        dppJualCvSat = dppHppProdSat + labaProdSat;
      } else {
        labaProdSat = dppTayangSat * labaProdPct;
        dppJualCvSat = dppHppProdSat + labaProdSat;
      }
      const hargaJualCvSat = dppJualCvSat * (1 + PPN_RATE);
      document.getElementById("lbl-harga-jual-cv").innerText = formatRp(hargaJualCvSat);
      const hppCvTotal = hargaJualCvSat * qty;
      const dppKontrak = kontrakTotal / (1 + PPN_RATE);
      const ppnKeluaran = kontrakTotal - dppKontrak;
      const pph22 = dppKontrak * PPH22_RATE;
      const sp2d = kontrakTotal - ppnKeluaran - pph22;
      document.getElementById("res-kontrak-total").innerText = formatRp(kontrakTotal);
      document.getElementById("res-ppn-out").innerText = "- " + formatRp(ppnKeluaran);
      document.getElementById("res-pph22").innerText = "- " + formatRp(pph22);
      document.getElementById("res-sp2d").innerText = formatRp(sp2d);
      const dppHppCvTotal = hppCvTotal / (1 + PPN_RATE);
      const ppnMasukanCv = hppCvTotal - dppHppCvTotal;
      const selisihPpn = ppnKeluaran - ppnMasukanCv;
      document.getElementById("res-hpp-cv-total").innerText = "- " + formatRp(hppCvTotal);
      document.getElementById("res-selisih-ppn").innerText = "- " + formatRp(selisihPpn);
      let totalFee = 0;
      document.querySelectorAll(".fee-row").forEach((row) => {
        const pct = parseFloat(row.querySelector(".fee-pct").value) || 0;
        const source = row.querySelector(".fee-source").value;
        const base = row.querySelector(".fee-base").value;
        let targetValue = source === "tayang" ? tayangTotal : kontrakTotal;
        if (base === "dpp") targetValue = targetValue / (1 + PPN_RATE);
        totalFee += targetValue * (pct / 100);
      });
      document.getElementById("res-total-fee").innerText = "- " + formatRp(totalFee);
      const labaKotorCv = kontrakTotal - hppCvTotal;
      const labaBersihCv = labaKotorCv - totalFee - selisihPpn;
      const pphBadanTotal = labaBersihCv > 0 ? labaBersihCv * PPH_BADAN_RATE : 0;
      const pph29 = pphBadanTotal - pph22;
      let saldoAkhirCv = labaBersihCv - pphBadanTotal;
      document.getElementById("res-laba-cv").innerText = formatRp(labaBersihCv);
      document.getElementById("res-pph-badan").innerText = "- " + formatRp(pphBadanTotal);
      document.getElementById("res-kredit-pajak").innerText = "+ " + formatRp(pph22);
      const lblPph29 = document.getElementById("lbl-kurang-bayar");
      const resPph29 = document.getElementById("res-pph29");
      if (pph29 > 0) {
        lblPph29.innerText = "PPh 29 (Kurang Bayar)";
        resPph29.innerText = "- " + formatRp(Math.abs(pph29));
        resPph29.className = "text-danger fw-bold";
      } else {
        lblPph29.innerText = "PPh 29 (Lebih Bayar/Restitusi)";
        resPph29.innerText = "+ " + formatRp(Math.abs(pph29));
        resPph29.className = "text-success fw-bold";
        saldoAkhirCv = labaBersihCv - pphBadanTotal + Math.abs(pph29);
      }
      document.getElementById("res-saldo-cv").innerText = formatRp(saldoAkhirCv);
      const hppProdTotalIncPpn = dppHppProdSat * (1 + PPN_RATE) * qty;
      document.getElementById("res-cashin-prod").innerText = formatRp(hppCvTotal);
      document.getElementById("res-hpp-prod-total").innerText = "- " + formatRp(hppProdTotalIncPpn);
      document.getElementById("res-laba-kotor-prod").innerText = formatRp(labaProdSat * qty);
    }
    document.addEventListener("input", (event) => {
      if (event.target?.classList.contains("calc-input")) runKalkulatorB2B();
    });
    document.addEventListener("change", (event) => {
      if (event.target?.classList.contains("calc-input")) runKalkulatorB2B();
    });
    const feeContainer = document.getElementById("fee-container");
    document.getElementById("btn-add-fee")?.addEventListener("click", () => {
      const row = document.createElement("tr");
      row.className = "fee-row";
      row.innerHTML = `
      <td><input type="text" class="form-control form-control-sm fee-name" placeholder="Nama Biaya"></td>
      <td><input type="number" class="form-control form-control-sm calc-input fee-pct" value="0" step="0.1"></td>
      <td><select class="form-select form-select-sm calc-input fee-source"><option value="tayang">Harga Tayang</option><option value="kontrak">Harga Kontrak</option></select></td>
      <td><select class="form-select form-select-sm calc-input fee-base"><option value="dpp">DPP (Non-PPN)</option><option value="gross">Gross (Inc. PPN)</option></select></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger btn-remove-fee"><i class="fa-solid fa-trash"></i></button></td>`;
      feeContainer.appendChild(row);
    });
    feeContainer?.addEventListener("click", (event) => {
      const btn = event.target.closest(".btn-remove-fee");
      if (btn) {
        btn.closest("tr")?.remove();
        runKalkulatorB2B();
      }
    });
    window.resetKalkulatorB2B = function resetKalkulatorB2B() {
      document.querySelectorAll(".calc-input").forEach((input) => {
        if (input.type === "radio") return;
        if (input.tagName === "SELECT") input.selectedIndex = 0;
        else if (input.id === "calc-qty") input.value = "1";
        else input.value = "";
      });
      document.querySelector('input[name="ppnProd"][value="include"]')?.click();
      feeContainer.innerHTML = "";
      runKalkulatorB2B();
    };
    runKalkulatorB2B();
  }

  // assets/js/pages/kalkulator-distributor.js
  function initKalkulatorDistributorPage() {
    const calcQty3 = document.getElementById("calc-qty-3");
    if (!calcQty3) return;
    const PPH22_RATE = 0.015;
    const PPH_BADAN_RATE = 0.22;
    const getPPN = (gross, isPPN = true) => !isPPN || gross <= 0 ? 0 : Math.floor(gross / 1.11 * 0.11);
    const getPPH22 = (gross, isPPN = true) => gross <= 0 ? 0 : Math.floor((isPPN ? gross / 1.11 : gross) * PPH22_RATE);
    function getBaseContext() {
      const qty = Math.max(1, parseInt(calcQty3.value, 10) || 1);
      const tayangBrgSat = parseRp(document.getElementById("calc-tayang-brg").value);
      const tayangKrmSat = parseRp(document.getElementById("calc-tayang-krm").value);
      const negoBrgSat = parseRp(document.getElementById("calc-nego-brg").value);
      const negoKrmSat = parseRp(document.getElementById("calc-nego-krm").value);
      const tayangBrg = tayangBrgSat * qty;
      const tayangKrm = tayangKrmSat * qty;
      const tayangTot = tayangBrg + tayangKrm;
      const negoBrg = negoBrgSat * qty;
      const negoKrm = negoKrmSat * qty;
      const negoTot = negoBrg + negoKrm;
      const kontrakBrg = (tayangBrgSat - negoBrgSat) * qty;
      const kontrakKrm = (tayangKrmSat - negoKrmSat) * qty;
      const kontrakTot = kontrakBrg + kontrakKrm;
      const isPPN = true;
      return {
        qty,
        isPPN,
        tayangBrg,
        tayangKrm,
        tayangTot,
        negoTot,
        kontrakBrg,
        kontrakKrm,
        kontrakTot,
        eKontrakBrg: getPPN(kontrakBrg, isPPN),
        eKontrakTot: getPPN(kontrakTot, isPPN),
        eTayangBrg: getPPN(tayangBrg, isPPN),
        eTayangTot: getPPN(tayangTot, isPPN),
        fKontrakBrg: getPPH22(kontrakBrg, isPPN),
        fKontrakTot: getPPH22(kontrakTot, isPPN),
        fTayangBrg: getPPH22(tayangBrg, isPPN),
        fTayangTot: getPPH22(tayangTot, isPPN)
      };
    }
    const getPengaliValue = (ctx, key) => ({ "KONTRAK BARANG": ctx.kontrakBrg, "TOTAL KONTRAK": ctx.kontrakTot, "TAYANG BARANG": ctx.tayangBrg, "TOTAL TAYANG": ctx.tayangTot })[key] || 0;
    const getPengaliPPN = (ctx, key) => ({ "KONTRAK BARANG": ctx.eKontrakBrg, "TOTAL KONTRAK": ctx.eKontrakTot, "TAYANG BARANG": ctx.eTayangBrg, "TOTAL TAYANG": ctx.eTayangTot })[key] || 0;
    const getPengaliPPH = (ctx, key) => ({ "KONTRAK BARANG": ctx.fKontrakBrg, "TOTAL KONTRAK": ctx.fKontrakTot, "TAYANG BARANG": ctx.fTayangBrg, "TOTAL TAYANG": ctx.fTayangTot })[key] || 0;
    function calcBasisValue(ctx, pengali, dari, isNego = "TIDAK") {
      const harga = getPengaliValue(ctx, pengali);
      const ppn = getPengaliPPN(ctx, pengali);
      const pph = getPengaliPPH(ctx, pengali);
      let hitung = 0;
      switch (dari) {
        case "SP2D":
          hitung = harga - ppn - pph;
          break;
        case "DPP":
          hitung = harga - ppn;
          break;
        default:
          hitung = harga;
          break;
      }
      if (isNego === "YA") hitung -= ctx.negoTot;
      return hitung;
    }
    function calcFeeRows(ctx) {
      let feePelaksanaTotal = 0;
      let feeDistributorTotal = 0;
      document.querySelectorAll(".fee-row-3").forEach((row) => {
        const pct = (parseFloat(row.querySelector(".fee-pct-3").value) || 0) / 100;
        const pengali = row.querySelector(".fee-source-3").value || "TOTAL KONTRAK";
        const dari = row.querySelector(".fee-base-3").value || "SP2D";
        const isNego = row.querySelector(".fee-nego-3").value || "TIDAK";
        const dibebankan = row.querySelector(".fee-target-3").value || "pelaksana";
        const nilai = calcBasisValue(ctx, pengali, dari, isNego) * pct;
        if (dibebankan === "distributor") feeDistributorTotal += nilai;
        else feePelaksanaTotal += nilai;
      });
      return { feePelaksanaTotal, feeDistributorTotal };
    }
    function hitungLayerPemasok(ctx) {
      const hppPrinInputSat = parseRp(document.getElementById("calc-hpp-prin-3").value);
      const hppPrinInputTotal = hppPrinInputSat * ctx.qty;
      const ppnPrinStatus = document.querySelector('input[name="ppnPrin3"]:checked')?.value || "include";
      const basisPrin = document.getElementById("calc-basis-prin-3").value || "TAYANG";
      const labaPrinPct = (parseFloat(document.getElementById("calc-laba-prin-pct-3").value) || 0) / 100;
      const roundPrin = Math.max(1, parseInt(document.getElementById("calc-round-prin").value, 10) || 1);
      let hargaIpvBase = 0;
      if (basisPrin === "HPP") {
        const baseNet = hppPrinInputTotal + hppPrinInputTotal * labaPrinPct;
        hargaIpvBase = ppnPrinStatus === "include" ? baseNet : baseNet * 1.11;
      } else if (basisPrin === "TAYANG") {
        const labaFromTayang = ctx.tayangTot * labaPrinPct;
        const baseNet = hppPrinInputTotal + labaFromTayang;
        hargaIpvBase = ppnPrinStatus === "include" ? baseNet : baseNet * 1.11;
      } else {
        const safePct = Math.min(labaPrinPct, 0.999999);
        const baseNet = hppPrinInputTotal / Math.max(1e-4, 1 - safePct);
        hargaIpvBase = ppnPrinStatus === "include" ? baseNet : baseNet * 1.11;
      }
      const hargaIpvTotal = ceilTo(hargaIpvBase, roundPrin);
      const hppPrinModalAkhir = ppnPrinStatus === "include" ? hppPrinInputTotal : hppPrinInputTotal + getPPN(hppPrinInputTotal, ctx.isPPN);
      return { hargaIpvTotal, hppPrinModalAkhir };
    }
    function hitungLayerDistributor(ctx, hargaIpvTotal) {
      const roundDist = Math.max(1, parseInt(document.getElementById("calc-round-dist").value, 10) || 1);
      const labaDist1Pct = (parseFloat(document.getElementById("calc-laba-dist-1").value) || 0) / 100;
      const d59 = labaDist1Pct * hargaIpvTotal;
      const crossLabaPct = (parseFloat(document.getElementById("calc-laba-dist-2").value) || 0) / 100;
      const crossPengali = document.getElementById("calc-cross-pengali").value || "TOTAL KONTRAK";
      const crossDari = document.getElementById("calc-cross-dari").value || "SP2D";
      const d60 = calcBasisValue(ctx, crossPengali, crossDari, "TIDAK") * crossLabaPct;
      const b60 = hargaIpvTotal > 0 ? d60 / hargaIpvTotal : 0;
      let b61 = 0;
      if (ctx.isPPN && hargaIpvTotal > 0) {
        const ppnFactor = 0.11 / 1.11;
        const numerator = 0.05 / (1 - 0.22) * (d60 + labaDist1Pct * hargaIpvTotal) + d60 + hargaIpvTotal * (ppnFactor * labaDist1Pct - (1 - ppnFactor) * b60);
        const divisor = (1 - ppnFactor) * hargaIpvTotal;
        b61 = divisor !== 0 ? numerator / divisor : 0;
      } else if (hargaIpvTotal > 0) {
        b61 = (d59 + d60) * (0.05 / (1 - 0.22)) / hargaIpvTotal;
      }
      const b62 = labaDist1Pct + b60 + b61;
      const hargaCvTotal = ceilTo(hargaIpvTotal + hargaIpvTotal * b62, roundDist);
      return { hargaCvTotal };
    }
    function hitungLayerPelaksana(ctx, hargaCvTotal, feePelaksanaTotal) {
      const acuanLaba = document.getElementById("calc-base-laba-cv").value || "KONTRAK";
      const restitusiPct = (parseFloat(document.getElementById("calc-restitusi-pct").value) || 100) / 100;
      let acuanHarga = ctx.kontrakTot, acuanPPN = ctx.eKontrakTot, acuanPPH = ctx.fKontrakTot;
      if (acuanLaba === "BARANG") {
        acuanHarga = ctx.tayangBrg;
        acuanPPN = ctx.eTayangBrg;
        acuanPPH = ctx.fTayangBrg;
      }
      if (acuanLaba === "TOTAL") {
        acuanHarga = ctx.tayangTot;
        acuanPPN = ctx.eTayangTot;
        acuanPPH = ctx.fTayangTot;
      }
      const labaKotorCv = acuanHarga - hargaCvTotal;
      const ppnInCv = getPPN(hargaCvTotal, ctx.isPPN);
      const selisihPpnCv = acuanPPN - ppnInCv;
      const labaBersihCv = labaKotorCv - feePelaksanaTotal - selisihPpnCv;
      const pph29Laba = labaBersihCv > 0 ? Math.floor(labaBersihCv * PPH_BADAN_RATE) : 0;
      const sp2dCair = acuanHarga - acuanPPN - acuanPPH;
      const cashOutCv = hargaCvTotal + feePelaksanaTotal;
      const saldoKasSementara = sp2dCair - cashOutCv;
      const nilaiRestitusi = ppnInCv * restitusiPct;
      const kurangBayarPajak = pph29Laba - acuanPPH;
      const saldoAkhirCv = saldoKasSementara + nilaiRestitusi - kurangBayarPajak;
      return { labaKotorCv, selisihPpnCv, labaBersihCv, sp2dCair, cashOutCv, saldoKasSementara, nilaiRestitusi, kurangBayarPajak, saldoAkhirCv };
    }
    function hitungLayerDistributorReport(ctx, hargaIpvTotal, hargaCvTotal, feeDistributorTotal) {
      const ppnInDist = getPPN(hargaIpvTotal, ctx.isPPN);
      const ppnInCv = getPPN(hargaCvTotal, ctx.isPPN);
      const selisihPpnDist = ppnInCv - ppnInDist;
      const labaBersihDist = hargaCvTotal - hargaIpvTotal - feeDistributorTotal - selisihPpnDist;
      const pphBadanDist = labaBersihDist > 0 ? Math.floor(labaBersihDist * PPH_BADAN_RATE) : 0;
      const saldoAkhirDist = labaBersihDist - pphBadanDist;
      return { selisihPpnDist, labaBersihDist, pphBadanDist, saldoAkhirDist };
    }
    const paint = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.innerText = value;
    };
    function runKalkulator3Layer() {
      const ctx = getBaseContext();
      paint("lbl-total-kontrak-3", formatRp(ctx.kontrakTot));
      const pemasok = hitungLayerPemasok(ctx);
      paint("lbl-harga-jual-ipv", formatRp(pemasok.hargaIpvTotal / ctx.qty));
      const fee = calcFeeRows(ctx);
      const distributor = hitungLayerDistributor(ctx, pemasok.hargaIpvTotal);
      paint("lbl-harga-jual-cv-3", formatRp(distributor.hargaCvTotal / ctx.qty));
      const pelaksana = hitungLayerPelaksana(ctx, distributor.hargaCvTotal, fee.feePelaksanaTotal);
      paint("res-laba-kotor-cv", formatRp(pelaksana.labaKotorCv));
      paint("res-fee-cv-3", "- " + formatRp(fee.feePelaksanaTotal));
      paint("res-selisih-ppn-cv-3", "- " + formatRp(pelaksana.selisihPpnCv));
      paint("res-laba-cv-3", formatRp(pelaksana.labaBersihCv));
      paint("res-sp2d-3", formatRp(pelaksana.sp2dCair));
      paint("res-cashout-cv", "- " + formatRp(pelaksana.cashOutCv));
      paint("res-saldo-kas-cv", formatRp(pelaksana.saldoKasSementara));
      paint("res-restitusi-cv", "+ " + formatRp(pelaksana.nilaiRestitusi));
      paint("res-saldo-cv-3", formatRp(pelaksana.saldoAkhirCv));
      const lblKurangBayar = document.getElementById("lbl-kurang-bayar");
      const elPph29 = document.getElementById("res-pph29-cv-3");
      if (pelaksana.kurangBayarPajak > 0) {
        lblKurangBayar.innerText = "PPh 29 (Kurang Bayar)";
        elPph29.innerText = "- " + formatRp(Math.abs(pelaksana.kurangBayarPajak));
        elPph29.className = "text-danger fw-bold";
      } else {
        lblKurangBayar.innerText = "PPh 29 (Restitusi/Lebih)";
        elPph29.innerText = "+ " + formatRp(Math.abs(pelaksana.kurangBayarPajak));
        elPph29.className = "text-success fw-bold";
      }
      const reportDist = hitungLayerDistributorReport(ctx, pemasok.hargaIpvTotal, distributor.hargaCvTotal, fee.feeDistributorTotal);
      paint("res-cashin-dist-3", formatRp(distributor.hargaCvTotal));
      paint("res-hpp-dist-3", "- " + formatRp(pemasok.hargaIpvTotal));
      paint("res-fee-dist-3", "- " + formatRp(fee.feeDistributorTotal));
      paint("res-selisih-ppn-dist-3", "- " + formatRp(reportDist.selisihPpnDist));
      paint("res-laba-dist-3", formatRp(reportDist.labaBersihDist));
      paint("res-pph-badan-dist-3", "- " + formatRp(reportDist.pphBadanDist));
      paint("res-saldo-dist-3", formatRp(reportDist.saldoAkhirDist));
      paint("res-cashin-prin-3", formatRp(pemasok.hargaIpvTotal));
      paint("res-hpp-prin-3", "- " + formatRp(pemasok.hppPrinModalAkhir));
      paint("res-laba-prin-3", formatRp(pemasok.hargaIpvTotal - pemasok.hppPrinModalAkhir));
    }
    function addFeeRow() {
      const feeContainer = document.getElementById("fee-container-3");
      const row = document.createElement("tr");
      row.className = "fee-row-3";
      row.innerHTML = `
      <td><input type="text" class="form-control px-1 py-1 fee-name-3" placeholder="Nama Biaya" style="font-size: 0.8rem;"></td>
      <td><input type="number" class="form-control px-1 py-1 calc-input-3 fee-pct-3" value="0" step="0.001" style="font-size: 0.8rem;"></td>
      <td><select class="form-select px-1 py-1 calc-input-3 fee-source-3" style="font-size: 0.8rem;"><option value="TOTAL KONTRAK">Total Kontrak</option><option value="KONTRAK BARANG">Kontrak Barang</option><option value="TOTAL TAYANG">Total Tayang</option><option value="TAYANG BARANG">Tayang Barang</option></select></td>
      <td><select class="form-select px-1 py-1 calc-input-3 fee-base-3" style="font-size: 0.8rem;"><option value="SP2D">SP2D</option><option value="DPP">DPP</option><option value="TAYANG">TAYANG</option><option value="KONTRAK">KONTRAK</option></select></td>
      <td><select class="form-select px-1 py-1 calc-input-3 fee-nego-3" style="font-size: 0.8rem;"><option value="TIDAK">TIDAK</option><option value="YA">YA</option></select></td>
      <td><select class="form-select px-1 py-1 calc-input-3 fee-target-3" style="font-size: 0.8rem;"><option value="pelaksana">Pelaksana</option><option value="distributor">Distributor</option></select></td>
      <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 btn-remove-fee-3"><i class="fa-solid fa-trash"></i></button></td>`;
      feeContainer.appendChild(row);
    }
    document.addEventListener("input", (event) => {
      if (event.target?.classList.contains("calc-input-3")) runKalkulator3Layer();
    });
    document.addEventListener("change", (event) => {
      if (event.target?.classList.contains("calc-input-3")) runKalkulator3Layer();
    });
    document.getElementById("btn-add-fee-3")?.addEventListener("click", () => {
      addFeeRow();
      runKalkulator3Layer();
    });
    document.getElementById("fee-container-3")?.addEventListener("click", (event) => {
      const btn = event.target.closest(".btn-remove-fee-3");
      if (btn) {
        btn.closest("tr")?.remove();
        runKalkulator3Layer();
      }
    });
    window.resetKalkulatorDistributor3 = function resetKalkulatorDistributor3() {
      document.querySelectorAll(".calc-input-3").forEach((input) => {
        if (input.type === "radio") return;
        if (input.tagName === "SELECT") input.selectedIndex = 0;
        else if (input.id === "calc-qty-3") input.value = "1";
        else if (input.id === "calc-restitusi-pct") input.value = "100";
        else if (input.id === "calc-round-prin" || input.id === "calc-round-dist") input.value = "1";
        else input.value = "";
      });
      document.querySelector('input[name="ppnPrin3"][value="include"]')?.click();
      document.getElementById("fee-container-3").innerHTML = "";
      runKalkulator3Layer();
    };
    runKalkulator3Layer();
  }

  // assets/js/app.js
  function initApp() {
    initTheme();
    initSidebar();
    initNavigationUX();
    initPlugins();
    initDashboardPage();
    initLogistikPage();
    initDataPesananPage();
    initDatabaseMasterPage();
    initInputPesananPage();
    initKalkulatorB2BPage();
    initKalkulatorDistributorPage();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
