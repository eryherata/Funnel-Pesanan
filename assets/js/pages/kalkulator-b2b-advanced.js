(function () {
  const qtyInput = document.getElementById('b2b2-qty');
  if (!qtyInput) return;

  const PPH22_RATE = 0.015;
  const defaultFeeRow = { name: 'FM1', pct: 20, pengali: 'TAYANG BARANG', basis: 'DPP', nego: 'YA' };
  const feeBody = document.getElementById('b2b2-fee-body');

  function parseCurrency(value) {
    return parseInt(String(value || '0').replace(/\D/g, ''), 10) || 0;
  }

  function parsePercent(value) {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num / 100 : 0;
  }

  function formatCurrency(number) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(Number(number) || 0));
  }

  function formatPercent(value, digits = 2) {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value) || 0) + '%';
  }

  function parseQuantity(value) {
    return parseInt(String(value || '0').replace(/\D/g, ''), 10) || 0;
  }

  function formatQuantity(number) {
    return new Intl.NumberFormat('id-ID').format(Math.round(Number(number) || 0));
  }

  function ceilTo(value, step) {
    const safeStep = Math.max(1, parseInt(step, 10) || 1);
    return Math.ceil((Number(value) || 0) / safeStep) * safeStep;
  }

  function percentOf(value, base) {
    if (!base) return 0;
    return ((Number(value) || 0) / base) * 100;
  }

  function getPPN(gross, mode) {
    if (mode !== 'PPN' || gross <= 0) return 0;
    return Math.floor((gross / 1.11) * 0.11);
  }

  function getPPH22(gross, mode) {
    if (gross <= 0) return 0;
    const basis = mode === 'PPN' ? (gross / 1.11) : gross;
    return Math.floor(basis * PPH22_RATE);
  }

  function applyCurrencyFormatting(input) {
    if (!input) return;
    const raw = parseCurrency(input.value);
    input.value = raw ? formatCurrency(raw) : '';
  }

  function applyQtyFormatting(input) {
    if (!input) return;
    const raw = parseQuantity(input.value);
    input.value = raw ? formatQuantity(raw) : '';
  }

  function rowMarkup(row = {}) {
    const safe = {
      name: row.name || '',
      pct: row.pct ?? 0,
      pengali: row.pengali || 'TAYANG BARANG',
      basis: row.basis || 'DPP',
      nego: row.nego || 'TIDAK'
    };
    return `
      <tr class="b2b2-fee-row">
        <td><input type="text" class="form-control form-control-sm b2b2-input b2b2-fee-name" value="${safe.name}"></td>
        <td><input type="number" class="form-control form-control-sm b2b2-input b2b2-no-spinner b2b2-fee-pct" value="${safe.pct}" step="0.001"></td>
        <td>
          <select class="form-select form-select-sm b2b2-input b2b2-fee-pengali">
            <option value="KONTRAK BARANG" ${safe.pengali === 'KONTRAK BARANG' ? 'selected' : ''}>KONTRAK BARANG</option>
            <option value="TOTAL KONTRAK" ${safe.pengali === 'TOTAL KONTRAK' ? 'selected' : ''}>TOTAL KONTRAK</option>
            <option value="TAYANG BARANG" ${safe.pengali === 'TAYANG BARANG' ? 'selected' : ''}>TAYANG BARANG</option>
            <option value="TOTAL TAYANG" ${safe.pengali === 'TOTAL TAYANG' ? 'selected' : ''}>TOTAL TAYANG</option>
          </select>
        </td>
        <td>
          <select class="form-select form-select-sm b2b2-input b2b2-fee-basis">
            <option value="SP2D" ${safe.basis === 'SP2D' ? 'selected' : ''}>SP2D</option>
            <option value="DPP" ${safe.basis === 'DPP' ? 'selected' : ''}>DPP</option>
            <option value="TAYANG" ${safe.basis === 'TAYANG' ? 'selected' : ''}>TAYANG</option>
            <option value="KONTRAK" ${safe.basis === 'KONTRAK' ? 'selected' : ''}>KONTRAK</option>
          </select>
        </td>
        <td>
          <select class="form-select form-select-sm b2b2-input b2b2-fee-nego">
            <option value="YA" ${safe.nego === 'YA' ? 'selected' : ''}>YA</option>
            <option value="TIDAK" ${safe.nego === 'TIDAK' ? 'selected' : ''}>TIDAK</option>
          </select>
        </td>
        <td class="text-end fw-bold text-custom b2b2-fee-value">Rp 0</td>
        <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger b2b2-remove-fee"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`;
  }

  function ensureAtLeastOneFeeRow() {
    if (!feeBody.children.length) feeBody.insertAdjacentHTML('beforeend', rowMarkup(defaultFeeRow));
  }

  function addFeeRow(row = {}) {
    feeBody.insertAdjacentHTML('beforeend', rowMarkup(row));
  }

  function readCtx() {
    const modePajak = document.getElementById('b2b2-tax-mode').value;
    const qty = Math.max(1, parseQuantity(qtyInput.value) || 1);
    const pagu = parseCurrency(document.getElementById('b2b2-pagu').value);

    const kontrakBarang = parseCurrency(document.getElementById('b2b2-kontrak-barang').value) * qty;
    const kontrakOngkir = parseCurrency(document.getElementById('b2b2-kontrak-ongkir').value) * qty;
    const negoBarang = parseCurrency(document.getElementById('b2b2-nego-barang').value) * qty;
    const negoOngkir = parseCurrency(document.getElementById('b2b2-nego-ongkir').value) * qty;
    const tayangBarang = parseCurrency(document.getElementById('b2b2-tayang-barang').value) * qty;
    const tayangOngkir = parseCurrency(document.getElementById('b2b2-tayang-ongkir').value) * qty;

    const D4 = tayangBarang;
    const D8 = kontrakBarang;
    const D9 = kontrakOngkir;
    const D10 = D8 + D9;
    const D13 = negoBarang;
    const D14 = negoOngkir;
    const D15 = D13 + D14;
    const D17 = tayangBarang;
    const D18 = tayangOngkir;
    const D19 = D17 + D18;

    return {
      modePajak, qty, pagu, D4, D8, D9, D10, D13, D14, D15, D17, D18, D19,
      E8: getPPN(D8, modePajak),
      E9: getPPN(D9, modePajak),
      E10: getPPN(D8, modePajak) + getPPN(D9, modePajak),
      E17: getPPN(D17, modePajak),
      E18: getPPN(D18, modePajak),
      E19: getPPN(D17, modePajak) + getPPN(D18, modePajak),
      F8: getPPH22(D8, modePajak),
      F9: getPPH22(D9, modePajak),
      F10: getPPH22(D8, modePajak) + getPPH22(D9, modePajak),
      F17: getPPH22(D17, modePajak),
      F18: getPPH22(D18, modePajak),
      F19: getPPH22(D17, modePajak) + getPPH22(D18, modePajak)
    };
  }

  function getReferenceValue(ctx, pengali) {
    switch (pengali) {
      case 'KONTRAK BARANG': return { harga: ctx.D8, ppn: ctx.E8, pph: ctx.F8 };
      case 'TOTAL KONTRAK': return { harga: ctx.D10, ppn: ctx.E10, pph: ctx.F10 };
      case 'TAYANG BARANG': return { harga: ctx.D17, ppn: ctx.E17, pph: ctx.F17 };
      case 'TOTAL TAYANG': return { harga: ctx.D19, ppn: ctx.E19, pph: ctx.F19 };
      default: return { harga: 0, ppn: 0, pph: 0 };
    }
  }

  function calcFeeValue(ctx, persen, pengali, basis, negoFlag) {
    const ref = getReferenceValue(ctx, pengali);
    const nego = negoFlag === 'YA' ? ctx.D15 : 0;
    let hitung = 0;
    switch (basis) {
      case 'SP2D': hitung = ref.harga - ref.ppn - ref.pph; break;
      case 'DPP': hitung = ref.harga - ref.ppn; break;
      case 'TAYANG':
      case 'KONTRAK':
      default: hitung = ref.harga; break;
    }
    return (hitung * persen) - nego;
  }

  function calcSupplier(ctx) {
    const hppUnit = parseCurrency(document.getElementById('b2b2-hpp-pemasok').value);
    const D80 = hppUnit * ctx.qty;
    const C79 = document.getElementById('b2b2-principal-tax').value;
    const H77 = Math.max(1, parseInt(document.getElementById('b2b2-principal-round').value, 10) || 1);
    const C83 = document.getElementById('b2b2-principal-basis').value;
    const B84 = parsePercent(document.getElementById('b2b2-principal-bk').value);
    const B85 = parsePercent(document.getElementById('b2b2-principal-fm').value);
    const B86 = parsePercent(document.getElementById('b2b2-principal-profit').value);
    const totalRate = B84 + B85 + B86;

    let D77 = 0;
    if (C83 === 'HPP') {
      D77 = ceilTo((C79 === 'Include' ? (D80 * (1 + totalRate)) : (D80 * (1 + totalRate)) * 1.11), H77);
    } else if (C83 === 'JUAL KE PELAKSANA') {
      const divisor = C79 === 'Include' ? (1 - totalRate) : (1 - (1.11 * totalRate));
      D77 = divisor > 0 ? ceilTo((C79 === 'Include' ? (D80 / divisor) : ((D80 * 1.11) / divisor)), H77) : 0;
    } else {
      const D87 = (B84 * ctx.D4) + (B85 * ctx.D4) + (B86 * ctx.D4);
      const E87 = D80 > 0 ? D87 / D80 : 0;
      D77 = ceilTo((C79 === 'Include' ? (D80 + (D80 * E87)) : (D80 + (D80 * E87)) * 1.11), H77);
    }

    let D84 = 0, D85 = 0, D86 = 0;
    if (C83 === 'HPP') {
      D84 = B84 * D80; D85 = B85 * D80; D86 = B86 * D80;
    } else if (C83 === 'JUAL KE PELAKSANA') {
      D84 = B84 * D77; D85 = B85 * D77; D86 = B86 * D77;
    } else {
      D84 = B84 * ctx.D4; D85 = B85 * ctx.D4; D86 = B86 * ctx.D4;
    }

    const D87 = D84 + D85 + D86;
    const E87 = D80 > 0 ? D87 / D80 : 0;
    const E77 = ctx.modePajak === 'PPN' ? getPPN(D77, ctx.modePajak) : 0;
    const E80 = ctx.modePajak === 'PPN' ? (C79 === 'Include' ? getPPN(D80, ctx.modePajak) : 0) : 0;

    return { hppUnit, D80, C79, H77, C83, B84, B85, B86, D84, D85, D86, D87, E87, D77, E77, E80 };
  }

  function calcPelaksanaFeeRows(ctx) {
    ensureAtLeastOneFeeRow();
    return Array.from(document.querySelectorAll('.b2b2-fee-row')).map((row) => {
      const name = row.querySelector('.b2b2-fee-name').value || 'Biaya';
      const pct = parsePercent(row.querySelector('.b2b2-fee-pct').value);
      const pengali = row.querySelector('.b2b2-fee-pengali').value;
      const basis = row.querySelector('.b2b2-fee-basis').value;
      const nego = row.querySelector('.b2b2-fee-nego').value;
      const value = calcFeeValue(ctx, pct, pengali, basis, nego);
      row.querySelector('.b2b2-fee-value').innerText = formatCurrency(value);
      return { name, pct, pengali, basis, nego, value };
    });
  }

  function calcPelaksana(ctx, supplier, feeRows) {
    const basisCashIn = document.getElementById('b2b2-cashin-basis').value;
    const restitusiPct = parsePercent(document.getElementById('b2b2-restitusi').value);
    const D20 = supplier.D77;
    const E20 = getPPN(D20, ctx.modePajak);
    const D21 = basisCashIn === 'KONTRAK' ? (ctx.D10 - D20) : (basisCashIn === 'BARANG' ? (ctx.D17 - D20) : (ctx.D19 - D20));
    const totalFee = feeRows.reduce((sum, row) => sum + row.value, 0);
    const D29 = basisCashIn === 'KONTRAK' ? (ctx.E10 - E20) : (basisCashIn === 'BARANG' ? (ctx.E17 - E20) : (ctx.E19 - E20));
    const D30 = D21 - totalFee - D29;
    const D31 = -Math.floor(Math.max(0, D30) * 0.22);
    const D32 = D30 + D31;
    const D36 = basisCashIn === 'KONTRAK' ? (ctx.D10 - ctx.E10 - ctx.F10) : (basisCashIn === 'BARANG' ? (ctx.D17 - ctx.E17 - ctx.F17) : (ctx.D19 - ctx.E19 - ctx.F19));
    const D20Kirim = ctx.D9;
    const D45 = D36 - D20 - D20Kirim - totalFee;
    const D46 = E20 * restitusiPct;
    const D47 = D45 + D46;
    const D48 = D31 + (basisCashIn === 'KONTRAK' ? ctx.F10 : (basisCashIn === 'BARANG' ? ctx.F17 : ctx.F19));
    const D49 = D47 + D48;
    const basisNominal = basisCashIn === 'KONTRAK' ? ctx.D10 : (basisCashIn === 'BARANG' ? ctx.D17 : ctx.D19);
    return { basisCashIn, restitusiPct, D20, D20Kirim, E20, D21, totalFee, D29, D30, D31, D32, D36, D45, D46, D47, D48, D49, basisNominal };
  }

  function calcSupplierReport(ctx, supplier) {
    const D90 = supplier.D77;
    const D91 = supplier.D80;
    const D92 = supplier.D84;
    const D93 = supplier.D85;
    const D94 = supplier.E77 - supplier.E80;
    const D95 = D90 - D91 - D92 - D93 - D94;
    const D96 = -Math.floor(Math.max(0, D95) * 0.22);
    const D97 = D95 + D96;
    let basisPercent = supplier.D80;
    let basisLabel = 'Basis persen: HPP Pemasok';
    if (supplier.C83 === 'JUAL KE PELAKSANA') {
      basisPercent = supplier.D77;
      basisLabel = 'Basis persen: Harga Jual ke Pelaksana';
    } else if (supplier.C83 === 'TAYANG') {
      basisPercent = ctx.D4;
      basisLabel = 'Basis persen: Nilai Tayang';
    }
    return { D95, D96, D97, basisPercent, basisLabel };
  }

  function updateText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  }


  function renderBreakdown(id, items, baseValue) {
    const el = document.getElementById(id);
    if (!el) return;
    const rows = (items || []).filter((item) => item && item.label).map((item) => {
      const abs = Math.abs(Number(item.value) || 0);
      const pct = formatPercent(percentOf(abs, baseValue), 2);
      const sign = item.prefix ?? '- ';
      return `<div class="b2b2-breakdown-item"><span class="b2b2-breakdown-label">${item.label}</span><div class="b2b2-breakdown-right"><span class="b2b2-breakdown-value">${sign}${formatCurrency(abs)}</span><span class="b2b2-breakdown-pct">${pct}</span></div></div>`;
    });
    el.innerHTML = rows.length ? rows.join('') : '<div class="b2b2-breakdown-item"><span class="b2b2-breakdown-label">Belum ada komponen cash out tambahan</span><div class="b2b2-breakdown-right"><span class="b2b2-breakdown-value">- Rp 0</span><span class="b2b2-breakdown-pct">0,00%</span></div></div>';
  }

  function render() {
    const ctx = readCtx();
    const supplier = calcSupplier(ctx);
    const feeRows = calcPelaksanaFeeRows(ctx);
    const pelaksana = calcPelaksana(ctx, supplier, feeRows);
    const supplierReport = calcSupplierReport(ctx, supplier);

    updateText('b2b2-total-kontrak', formatCurrency(ctx.D10));
    updateText('b2b2-total-nego', formatCurrency(ctx.D15));
    updateText('b2b2-total-tayang', formatCurrency(ctx.D19));
    updateText('b2b2-principal-sell', formatCurrency(supplier.D77));
    updateText('b2b2-summary-pagu', formatCurrency(ctx.pagu));
    updateText('b2b2-summary-sell', formatCurrency(supplier.D77));
    updateText('b2b2-summary-saldo-pemasok', formatCurrency(supplierReport.D97));
    updateText('b2b2-summary-saldo-pelaksana', formatCurrency(pelaksana.D49));

    const basisPelLabel = pelaksana.basisCashIn === 'KONTRAK' ? 'Basis persen: Total Kontrak' : (pelaksana.basisCashIn === 'BARANG' ? 'Basis persen: Tayang Barang' : 'Basis persen: Total Tayang');
    updateText('b2b2-note-pelaksana-basis', basisPelLabel);
    updateText('b2b2-note-pemasok-basis', supplierReport.basisLabel);

    const totalKontrakBase = ctx.D10 || 1;
    updateText('b2b2-res-kontrak-barang', formatCurrency(ctx.D8));
    updateText('b2b2-pct-kontrak-barang', formatPercent(percentOf(ctx.D8, totalKontrakBase)));
    updateText('b2b2-res-kontrak-ongkir', formatCurrency(ctx.D9));
    updateText('b2b2-pct-kontrak-ongkir', formatPercent(percentOf(ctx.D9, totalKontrakBase)));
    updateText('b2b2-res-total-kontrak-report', formatCurrency(ctx.D10));
    updateText('b2b2-pct-total-kontrak-report', formatPercent(percentOf(ctx.D10, totalKontrakBase)));
    updateText('b2b2-res-sp2d-pel', formatCurrency(pelaksana.D36));
    updateText('b2b2-res-cashout-pel', '- ' + formatCurrency(pelaksana.D20 + pelaksana.D20Kirim + pelaksana.totalFee));
    updateText('b2b2-res-saldo-kas-pel', formatCurrency(pelaksana.D45));
    updateText('b2b2-res-restitusi-pel', '+ ' + formatCurrency(pelaksana.D46));
    updateText('b2b2-res-saldo-plus-restitusi-pel', formatCurrency(pelaksana.D47));
    renderBreakdown('b2b2-cashout-breakdown', [
      { label: 'HPP Pelaksana', value: pelaksana.D20 },
      { label: 'Biaya Kirim Kontrak', value: pelaksana.D20Kirim },
      ...feeRows.map((row) => ({ label: row.name || 'Biaya', value: row.value }))
    ], pelaksana.basisNominal);

    const pph29El = document.getElementById('b2b2-res-pph29-pel');
    const pph29Label = document.getElementById('b2b2-pph29-label');
    if (pelaksana.D48 >= 0) {
      updateText('b2b2-res-pph29-pel', '+ ' + formatCurrency(Math.abs(pelaksana.D48)));
      if (pph29El) pph29El.className = 'b2b2-report-value text-success';
      if (pph29Label) pph29Label.innerText = 'Kredit / Lebih Bayar PPh';
    } else {
      updateText('b2b2-res-pph29-pel', '- ' + formatCurrency(Math.abs(pelaksana.D48)));
      if (pph29El) pph29El.className = 'b2b2-report-value';
      if (pph29Label) pph29Label.innerText = 'PPh 29 / Kurang Bayar';
    }
    updateText('b2b2-res-saldo-pel', formatCurrency(pelaksana.D49));

    updateText('b2b2-pct-sp2d-pel', formatPercent(percentOf(pelaksana.D36, pelaksana.basisNominal)));
    updateText('b2b2-pct-cashout-pel', formatPercent(percentOf(pelaksana.D20 + pelaksana.D20Kirim + pelaksana.totalFee, pelaksana.basisNominal)));
    updateText('b2b2-pct-saldo-kas-pel', formatPercent(percentOf(pelaksana.D45, pelaksana.basisNominal)));
    updateText('b2b2-pct-restitusi-pel', formatPercent(percentOf(pelaksana.D46, pelaksana.basisNominal)));
    updateText('b2b2-pct-saldo-plus-restitusi-pel', formatPercent(percentOf(pelaksana.D47, pelaksana.basisNominal)));
    updateText('b2b2-pct-pph29-pel', formatPercent(percentOf(Math.abs(pelaksana.D48), pelaksana.basisNominal)));
    updateText('b2b2-pct-saldo-pel', formatPercent(percentOf(pelaksana.D49, pelaksana.basisNominal)));

    updateText('b2b2-res-cashin-principal', formatCurrency(supplier.D77));
    updateText('b2b2-res-hpp-principal', '- ' + formatCurrency(supplier.D80));
    updateText('b2b2-res-laba-principal', formatCurrency(supplierReport.D95));
    updateText('b2b2-res-pph-badan-principal', '- ' + formatCurrency(Math.abs(supplierReport.D96)));
    updateText('b2b2-res-saldo-principal', formatCurrency(supplierReport.D97));

    updateText('b2b2-pct-cashin-principal', formatPercent(percentOf(supplier.D77, supplierReport.basisPercent)));
    updateText('b2b2-pct-hpp-principal', formatPercent(percentOf(supplier.D80, supplierReport.basisPercent)));
    updateText('b2b2-pct-laba-principal', formatPercent(percentOf(supplierReport.D95, supplierReport.basisPercent)));
    updateText('b2b2-pct-pph-badan-principal', formatPercent(percentOf(Math.abs(supplierReport.D96), supplierReport.basisPercent)));
    updateText('b2b2-pct-saldo-principal', formatPercent(percentOf(supplierReport.D97, supplierReport.basisPercent)));
  }

  function bindFormatting() {
    document.querySelectorAll('.b2b2-currency').forEach((input) => {
      if (input.dataset.boundCurrency) return;
      input.dataset.boundCurrency = '1';
      input.addEventListener('keyup', () => applyCurrencyFormatting(input));
      input.addEventListener('blur', () => applyCurrencyFormatting(input));
    });
    if (!qtyInput.dataset.boundQty) {
      qtyInput.dataset.boundQty = '1';
      qtyInput.addEventListener('keyup', () => applyQtyFormatting(qtyInput));
      qtyInput.addEventListener('blur', () => applyQtyFormatting(qtyInput));
    }
  }

  function resetForm() {
    document.getElementById('b2b2-tax-mode').value = 'PPN';
    qtyInput.value = '1';
    document.getElementById('b2b2-pagu').value = '';
    ['kontrak-barang','kontrak-ongkir','nego-barang','nego-ongkir','tayang-barang','tayang-ongkir','hpp-pemasok'].forEach((key) => {
      const el = document.getElementById(`b2b2-${key}`);
      if (el) el.value = '';
    });
    document.getElementById('b2b2-principal-tax').value = 'Include';
    document.getElementById('b2b2-principal-round').value = '100';
    document.getElementById('b2b2-principal-basis').value = 'HPP';
    document.getElementById('b2b2-principal-bk').value = '0';
    document.getElementById('b2b2-principal-fm').value = '0';
    document.getElementById('b2b2-principal-profit').value = '10';
    document.getElementById('b2b2-cashin-basis').value = 'KONTRAK';
    document.getElementById('b2b2-restitusi').value = '100';
    feeBody.innerHTML = '';
    ensureAtLeastOneFeeRow();
    render();
  }

  function fillDemoData() {
    document.getElementById('b2b2-tax-mode').value = 'PPN';
    qtyInput.value = formatQuantity(1);
    document.getElementById('b2b2-pagu').value = formatCurrency(200000000);
    document.getElementById('b2b2-kontrak-barang').value = formatCurrency(195550000);
    document.getElementById('b2b2-kontrak-ongkir').value = formatCurrency(0);
    document.getElementById('b2b2-nego-barang').value = formatCurrency(2000000);
    document.getElementById('b2b2-nego-ongkir').value = formatCurrency(0);
    document.getElementById('b2b2-tayang-barang').value = formatCurrency(197550000);
    document.getElementById('b2b2-tayang-ongkir').value = formatCurrency(0);
    document.getElementById('b2b2-hpp-pemasok').value = formatCurrency(87500000);
    document.getElementById('b2b2-principal-tax').value = 'Include';
    document.getElementById('b2b2-principal-round').value = '100';
    document.getElementById('b2b2-principal-basis').value = 'HPP';
    document.getElementById('b2b2-principal-bk').value = '0';
    document.getElementById('b2b2-principal-fm').value = '0';
    document.getElementById('b2b2-principal-profit').value = '10';
    document.getElementById('b2b2-cashin-basis').value = 'KONTRAK';
    document.getElementById('b2b2-restitusi').value = '100';
    feeBody.innerHTML = rowMarkup(defaultFeeRow);
    render();
  }

  document.addEventListener('input', (event) => {
    if (event.target && event.target.classList.contains('b2b2-input')) render();
  });
  document.addEventListener('change', (event) => {
    if (event.target && event.target.classList.contains('b2b2-input')) render();
  });

  feeBody.addEventListener('click', (event) => {
    const btn = event.target.closest('.b2b2-remove-fee');
    if (!btn) return;
    btn.closest('tr')?.remove();
    ensureAtLeastOneFeeRow();
    render();
  });

  document.getElementById('b2b2-add-fee-row').addEventListener('click', () => {
    addFeeRow({ name: 'Biaya Baru', pct: 0, pengali: 'TOTAL KONTRAK', basis: 'DPP', nego: 'TIDAK' });
    render();
  });
  document.getElementById('b2b2-reset-btn').addEventListener('click', resetForm);
  document.getElementById('b2b2-demo-btn').addEventListener('click', fillDemoData);

  bindFormatting();
  resetForm();
})();
