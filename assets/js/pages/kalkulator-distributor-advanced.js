(function () {
  const qtyInput = document.getElementById('dist3-qty');
  if (!qtyInput) return;

  const PPH22_RATE = 0.015;
  const singleDefaultFeeRow = { name: 'FM1', pct: 20, pengali: 'TAYANG BARANG', basis: 'DPP', nego: 'YA' };
  const feeBody = document.getElementById('dist3-fee-body');

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
    return (Number(value) || 0) / base * 100;
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

  function rowMarkup(row = {}) {
    const safe = {
      name: row.name || '',
      pct: row.pct ?? 0,
      pengali: row.pengali || 'TAYANG BARANG',
      basis: row.basis || 'DPP',
      nego: row.nego || 'TIDAK'
    };
    return `
      <tr class="dist3-fee-row">
        <td><input type="text" class="form-control form-control-sm dist3-input dist3-fee-name name-input" value="${safe.name}"></td>
        <td><input type="number" class="form-control form-control-sm dist3-input dist3-no-spinner dist3-fee-pct" value="${safe.pct}" step="0.001"></td>
        <td>
          <select class="form-select form-select-sm dist3-input dist3-fee-pengali">
            <option value="KONTRAK BARANG" ${safe.pengali === 'KONTRAK BARANG' ? 'selected' : ''}>KONTRAK BARANG</option>
            <option value="TOTAL KONTRAK" ${safe.pengali === 'TOTAL KONTRAK' ? 'selected' : ''}>TOTAL KONTRAK</option>
            <option value="TAYANG BARANG" ${safe.pengali === 'TAYANG BARANG' ? 'selected' : ''}>TAYANG BARANG</option>
            <option value="TOTAL TAYANG" ${safe.pengali === 'TOTAL TAYANG' ? 'selected' : ''}>TOTAL TAYANG</option>
          </select>
        </td>
        <td>
          <select class="form-select form-select-sm dist3-input dist3-fee-basis">
            <option value="SP2D" ${safe.basis === 'SP2D' ? 'selected' : ''}>SP2D</option>
            <option value="DPP" ${safe.basis === 'DPP' ? 'selected' : ''}>DPP</option>
            <option value="TAYANG" ${safe.basis === 'TAYANG' ? 'selected' : ''}>TAYANG</option>
            <option value="KONTRAK" ${safe.basis === 'KONTRAK' ? 'selected' : ''}>KONTRAK</option>
          </select>
        </td>
        <td>
          <select class="form-select form-select-sm dist3-input dist3-fee-nego">
            <option value="YA" ${safe.nego === 'YA' ? 'selected' : ''}>YA</option>
            <option value="TIDAK" ${safe.nego === 'TIDAK' ? 'selected' : ''}>TIDAK</option>
          </select>
        </td>
        <td class="text-end fw-bold text-custom dist3-fee-value">Rp 0</td>
        <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger dist3-remove-fee"><i class="fa-solid fa-trash"></i></button></td>
      </tr>
    `;
  }

  function ensureAtLeastOneFeeRow() {
    if (!feeBody.children.length) feeBody.insertAdjacentHTML('beforeend', rowMarkup(singleDefaultFeeRow));
  }

  function addFeeRow(row = {}) {
    feeBody.insertAdjacentHTML('beforeend', rowMarkup(row));
  }

  function readCtx() {
    const modePajak = document.getElementById('dist3-tax-mode').value;
    const qty = Math.max(1, parseQuantity(qtyInput.value) || 1);
    const pagu = parseCurrency(document.getElementById('dist3-pagu').value);

    const kontrakBarang = parseCurrency(document.getElementById('dist3-kontrak-barang').value) * qty;
    const kontrakOngkir = parseCurrency(document.getElementById('dist3-kontrak-ongkir').value) * qty;
    const negoBarang = parseCurrency(document.getElementById('dist3-nego-barang').value) * qty;
    const negoOngkir = parseCurrency(document.getElementById('dist3-nego-ongkir').value) * qty;
    const tayangBarang = parseCurrency(document.getElementById('dist3-tayang-barang').value) * qty;
    const tayangOngkir = parseCurrency(document.getElementById('dist3-tayang-ongkir').value) * qty;

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
    const hppUnit = parseCurrency(document.getElementById('dist3-hpp-pemasok').value);
    const D80 = hppUnit * ctx.qty;
    const C79 = document.getElementById('dist3-principal-tax').value;
    const H77 = Math.max(1, parseInt(document.getElementById('dist3-principal-round').value, 10) || 1);
    const C83 = document.getElementById('dist3-principal-basis').value;
    const B84 = parsePercent(document.getElementById('dist3-principal-bk').value);
    const B85 = parsePercent(document.getElementById('dist3-principal-fm').value);
    const B86 = parsePercent(document.getElementById('dist3-principal-profit').value);
    const B87 = B84 + B85 + B86;

    const preliminarySell = ceilTo((C79 === 'Include' ? (D80 + (D80 * B87)) : (D80 + (D80 * B87)) * 1.11), H77);
    let D84 = 0, D85 = 0, D86 = 0;
    if (C83 === 'HPP') {
      D84 = B84 * D80; D85 = B85 * D80; D86 = B86 * D80;
    } else if (C83 === 'JUAL KE DISTRIBUTOR') {
      D84 = B84 * preliminarySell; D85 = B85 * preliminarySell; D86 = B86 * preliminarySell;
    } else {
      D84 = B84 * ctx.D4; D85 = B85 * ctx.D4; D86 = B86 * ctx.D4;
    }

    const D87 = D84 + D85 + D86;
    const E87 = D80 > 0 ? D87 / D80 : 0;
    const D77 = ceilTo((C79 === 'Include' ? (D80 + (D80 * E87)) : (D80 + (D80 * E87)) * 1.11), H77);
    const E77 = ctx.modePajak === 'PPN' ? (C79 === 'Include' ? getPPN(D77, ctx.modePajak) : 0) : 0;
    const E80 = ctx.modePajak === 'PPN' ? (C79 === 'Include' ? getPPN(D80, ctx.modePajak) : 0) : 0;

    return { hppUnit, D80, C79, H77, C83, B84, B85, B86, B87, D84, D85, D86, D87, E87, D77, E77, E80 };
  }

  function calcPelaksanaFeeRows(ctx) {
    ensureAtLeastOneFeeRow();
    return Array.from(document.querySelectorAll('.dist3-fee-row')).map((row) => {
      const name = row.querySelector('.dist3-fee-name').value || 'Biaya';
      const pct = parsePercent(row.querySelector('.dist3-fee-pct').value);
      const pengali = row.querySelector('.dist3-fee-pengali').value;
      const basis = row.querySelector('.dist3-fee-basis').value;
      const nego = row.querySelector('.dist3-fee-nego').value;
      const value = calcFeeValue(ctx, pct, pengali, basis, nego);
      row.querySelector('.dist3-fee-value').innerText = formatCurrency(value);
      return { name, pct, pengali, basis, nego, value };
    });
  }

  function calcDistributor(ctx, supplier, feeRows) {
    const C56 = document.getElementById('dist3-distributor-tax').value;
    const H54 = Math.max(1, parseInt(document.getElementById('dist3-distributor-round').value, 10) || 1);
    const B59 = parsePercent(document.getElementById('dist3-distributor-ongkir').value);
    const H60 = parsePercent(document.getElementById('dist3-distributor-fm1').value);
    const fm1Row = feeRows[0] || { pengali: 'TAYANG BARANG', basis: 'DPP' };

    const D57 = supplier.D77;
    const E57 = ctx.modePajak === 'PPN' ? (C56 === 'Include' ? getPPN(D57, ctx.modePajak) : 0) : 0;
    const D59 = B59 * D57;
    const G60 = calcFeeValue(ctx, H60, fm1Row.pengali, fm1Row.basis, 'TIDAK');
    const D60 = G60;
    const B60 = D57 > 0 ? D60 / D57 : 0;

    let B61 = 0;
    if (D57 > 0) {
      if (ctx.modePajak === 'PPN') {
        B61 = (((0.05 / (1 - 0.22)) * (G60 + (B59 * D57))) + G60 + D57 * (((0.11 / 1.11) * B59) - ((1 - (0.11 / 1.11)) * B60))) / ((1 - (0.11 / 1.11)) * D57);
      } else {
        B61 = ((D59 + D60) * (0.05 / (1 - 0.22))) / D57;
      }
    }

    const D61 = B61 * D57;
    const B62 = B59 + B60 + B61;
    const D54 = ceilTo((C56 === 'Include' ? (D57 + (D57 * B62)) : (D57 + (D57 * B62)) * 1.11), H54);
    const E54 = ctx.modePajak === 'PPN' ? getPPN(D54, ctx.modePajak) : 0;
    return { C56, H54, B59, H60, D57, E57, D59, G60, D60, B60, B61, D61, B62, D54, E54, fm1Row };
  }

  function calcPelaksana(ctx, distributor, feeRows) {
    const E36 = document.getElementById('dist3-cashin-basis').value;
    const B46 = parsePercent(document.getElementById('dist3-restitusi').value);
    const D20 = distributor.D54;
    const E20 = ctx.modePajak === 'PPN' ? getPPN(D20, ctx.modePajak) : 0;
    const D21 = E36 === 'KONTRAK' ? (ctx.D10 - D20) : E36 === 'BARANG' ? (ctx.D17 - D20) : (ctx.D19 - D20);
    const values = feeRows.map((r) => r.value);
    while (values.length < 6) values.push(0);
    const [D23, D24, D25, D26, D27, D28] = values;
    const D29 = E36 === 'KONTRAK' ? (ctx.E10 - E20) : E36 === 'BARANG' ? (ctx.E17 - E20) : (ctx.E19 - E20);
    const D30 = D21 - D23 - D24 - D26 - D27 - D28 - D29 - D25;
    const D31 = -Math.floor(0.22 * D30);
    const D36 = E36 === 'KONTRAK' ? (ctx.D10 - ctx.E10 - ctx.F10) : E36 === 'BARANG' ? (ctx.D17 - ctx.E17 - ctx.F17) : (ctx.D19 - ctx.E19 - ctx.F19);
    const D20Kirim = ctx.D9;
    const D45 = D36 - D20 - D20Kirim - D23 - D24 - D26 - D27 - D28 - D25;
    const D46 = E20 * B46;
    const D47 = D45 + D46;
    const D48 = E36 === 'KONTRAK' ? (D31 + ctx.F10) : E36 === 'BARANG' ? (D31 + ctx.F17) : (D31 + ctx.F19);
    const D49 = D47 + D48;
    return { E36, D20, D20Kirim, E20, D21, D23, D24, D25, D26, D27, D28, D29, D30, D31, D36, D45, D46, D47, D48, D49 };
  }

  function calcDistributorReport(distributor) {
    const D65 = distributor.D54;
    const D66 = distributor.D57;
    const D67 = distributor.D59;
    const D68 = distributor.D60;
    const D69 = distributor.E54 - distributor.E57;
    const D70 = D65 - D66 - D67 - D68 - D69;
    const D71 = -Math.floor(D70 * 0.22);
    const D72 = D71 + D70;
    const autoBalancePct = (D68 + D67) > 0 ? (D72 / (D68 + D67)) * 100 : 0;
    const saldoPct = D65 > 0 ? (D72 / D65) * 100 : 0;
    return { D65, D66, D67, D68, D69, D70, D71, D72, autoBalancePct, saldoPct };
  }

  function calcPrincipalReport(ctx, supplier) {
    const D90 = supplier.D77;
    const D91 = supplier.D80;
    const D92 = supplier.D84;
    const D93 = supplier.D85;
    const D94 = supplier.E77 - supplier.E80;
    const D95 = D90 - D91 - D92 - D93 - D94;
    const D96 = -Math.floor(D95 * 0.22);
    const D97 = D96 + D95;
    let basisValue = supplier.D80;
    if (supplier.C83 === 'JUAL KE DISTRIBUTOR') basisValue = supplier.D77;
    else if (supplier.C83 === 'TAYANG') basisValue = ctx.D4;
    const B95 = basisValue > 0 ? (D95 / basisValue) : 0;
    const B97 = basisValue > 0 ? (D97 / basisValue) : 0;
    const pctCashin = basisValue > 0 ? (D90 / basisValue) : 0;
    const pctHpp = basisValue > 0 ? (D91 / basisValue) : 0;
    const pctTax = basisValue > 0 ? (Math.abs(D96) / basisValue) : 0;
    return { D90, D91, D92, D93, D94, D95, D96, D97, B95, B97, basisValue, pctCashin, pctHpp, pctTax };
  }

  function paint(id, value) {
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
      return `<div class="dist3-breakdown-item"><span class="dist3-breakdown-label">${item.label}</span><div class="dist3-breakdown-right"><span class="dist3-breakdown-value">${sign}${formatCurrency(abs)}</span><span class="dist3-breakdown-pct">${pct}</span></div></div>`;
    });
    el.innerHTML = rows.length ? rows.join('') : '<div class="dist3-breakdown-item"><span class="dist3-breakdown-label">Belum ada komponen cash out tambahan</span><div class="dist3-breakdown-right"><span class="dist3-breakdown-value">- Rp 0</span><span class="dist3-breakdown-pct">0,00%</span></div></div>';
  }

  function getPelaksanaBasisLabel(value) {
    if (value === 'KONTRAK') return 'Basis persen: Total Kontrak';
    if (value === 'BARANG') return 'Basis persen: Tayang Barang';
    return 'Basis persen: Total Tayang';
  }

  function getPemasokBasisLabel(value) {
    if (value === 'HPP') return 'Basis persen: HPP Pemasok';
    if (value === 'JUAL KE DISTRIBUTOR') return 'Basis persen: Harga Jual ke Distributor';
    return 'Basis persen: Nilai Tayang';
  }

  function render() {
    ensureAtLeastOneFeeRow();
    const ctx = readCtx();
    const feeRows = calcPelaksanaFeeRows(ctx);
    const supplier = calcSupplier(ctx);
    const distributor = calcDistributor(ctx, supplier, feeRows);
    const pelaksana = calcPelaksana(ctx, distributor, feeRows);
    const distributorReport = calcDistributorReport(distributor);
    const principalReport = calcPrincipalReport(ctx, supplier);

    paint('dist3-total-kontrak', formatCurrency(ctx.D10));
    paint('dist3-total-nego', formatCurrency(ctx.D15));
    paint('dist3-total-tayang', formatCurrency(ctx.D19));
    paint('dist3-principal-sell', formatCurrency(supplier.D77));
    paint('dist3-distributor-sell', formatCurrency(distributor.D54));
    paint('dist3-fm1-source-label', `${distributor.fm1Row.pengali} • ${distributor.fm1Row.basis}`);
    paint('dist3-locked-label', formatPercent(distributorReport.autoBalancePct, 4));

    paint('dist3-summary-principal', formatCurrency(supplier.D77));
    paint('dist3-summary-distributor', formatCurrency(distributor.D54));
    paint('dist3-summary-pelaksana', formatCurrency(pelaksana.D49));
    paint('dist3-note-pelaksana-basis', getPelaksanaBasisLabel(pelaksana.E36));
    paint('dist3-note-distributor-basis', 'Basis persen: Harga Jual ke Pelaksana');
    paint('dist3-note-pemasok-basis', getPemasokBasisLabel(supplier.C83));

    const totalFee = feeRows.reduce((sum, row) => sum + row.value, 0);
    const pelaksanaBase = pelaksana.E36 === 'KONTRAK' ? ctx.D10 : pelaksana.E36 === 'BARANG' ? ctx.D17 : ctx.D19;
    const totalKontrakBase = ctx.D10 || 1;

    paint('dist3-res-kontrak-barang', formatCurrency(ctx.D8));
    paint('dist3-pct-kontrak-barang', formatPercent(percentOf(ctx.D8, totalKontrakBase), 2));
    paint('dist3-res-kontrak-ongkir', formatCurrency(ctx.D9));
    paint('dist3-pct-kontrak-ongkir', formatPercent(percentOf(ctx.D9, totalKontrakBase), 2));
    paint('dist3-res-total-kontrak-report', formatCurrency(ctx.D10));
    paint('dist3-pct-total-kontrak-report', formatPercent(percentOf(ctx.D10, totalKontrakBase), 2));
    paint('dist3-res-sp2d', formatCurrency(pelaksana.D36));
    paint('dist3-pct-sp2d', formatPercent(percentOf(pelaksana.D36, pelaksanaBase), 2));
    paint('dist3-res-cashout', '- ' + formatCurrency(pelaksana.D20 + pelaksana.D20Kirim + totalFee));
    paint('dist3-pct-cashout', formatPercent(percentOf(pelaksana.D20 + pelaksana.D20Kirim + totalFee, pelaksanaBase), 2));
    renderBreakdown('dist3-cashout-breakdown', [
      { label: 'HPP Pelaksana', value: pelaksana.D20 },
      { label: 'Biaya Kirim Kontrak', value: pelaksana.D20Kirim },
      ...feeRows.map((row) => ({ label: row.name || 'Biaya', value: row.value }))
    ], pelaksanaBase);
    paint('dist3-res-saldo-kas', formatCurrency(pelaksana.D45));
    paint('dist3-pct-saldo-kas', formatPercent(percentOf(pelaksana.D45, pelaksanaBase), 2));
    paint('dist3-res-restitusi', '+ ' + formatCurrency(pelaksana.D46));
    paint('dist3-pct-restitusi', formatPercent(percentOf(pelaksana.D46, pelaksanaBase), 2));
    paint('dist3-res-saldo-plus-restitusi', formatCurrency(pelaksana.D47));
    paint('dist3-pct-saldo-plus-restitusi', formatPercent(percentOf(pelaksana.D47, pelaksanaBase), 2));
    paint('dist3-res-saldo-akhir', formatCurrency(pelaksana.D49));
    paint('dist3-pct-saldo-akhir', formatPercent(percentOf(pelaksana.D49, pelaksanaBase), 2));

    const taxLabel = document.getElementById('dist3-res-tax-label');
    const taxValue = document.getElementById('dist3-res-pph29');
    if (taxLabel && taxValue) {
      const pctPph29 = formatPercent(percentOf(Math.abs(pelaksana.D48), pelaksanaBase), 2);
      paint('dist3-pct-pph29', pctPph29);
      if (pelaksana.D48 < 0) {
        taxLabel.innerText = 'PPh 29 / Kurang Bayar';
        taxValue.innerText = '- ' + formatCurrency(Math.abs(pelaksana.D48));
        taxValue.className = 'dist3-report-value text-danger';
      } else {
        taxLabel.innerText = 'Kredit / Lebih Bayar PPh';
        taxValue.innerText = '+ ' + formatCurrency(Math.abs(pelaksana.D48));
        taxValue.className = 'dist3-report-value text-success';
      }
    }

    const distBase = distributorReport.D65 || 0;
    paint('dist3-res-cashin-dist', formatCurrency(distributorReport.D65));
    paint('dist3-pct-cashin-dist', formatPercent(percentOf(distributorReport.D65, distBase || 1), 2));
    paint('dist3-res-hpp-dist', '- ' + formatCurrency(distributorReport.D66));
    paint('dist3-pct-hpp-dist', formatPercent(percentOf(distributorReport.D66, distBase || 1), 2));
    paint('dist3-res-ongkir-dist', '- ' + formatCurrency(distributorReport.D67));
    paint('dist3-pct-ongkir-dist', formatPercent(percentOf(distributorReport.D67, distBase || 1), 2));
    paint('dist3-res-fm1-dist', '- ' + formatCurrency(distributorReport.D68));
    paint('dist3-pct-fm1-dist', formatPercent(percentOf(distributorReport.D68, distBase || 1), 2));
    paint('dist3-res-selisih-ppn-dist', '- ' + formatCurrency(distributorReport.D69));
    paint('dist3-pct-selisih-ppn-dist', formatPercent(percentOf(distributorReport.D69, distBase || 1), 2));
    paint('dist3-res-laba-dist', formatCurrency(distributorReport.D70));
    paint('dist3-pct-laba-dist', formatPercent(percentOf(distributorReport.D70, distBase || 1), 2));
    paint('dist3-res-pph-badan-dist', '- ' + formatCurrency(Math.abs(distributorReport.D71)));
    paint('dist3-pct-pph-badan-dist', formatPercent(percentOf(Math.abs(distributorReport.D71), distBase || 1), 2));
    paint('dist3-res-saldo-dist', formatCurrency(distributorReport.D72));
    paint('dist3-pct-saldo-dist', formatPercent(distributorReport.saldoPct, 2));

    paint('dist3-res-cashin-principal', formatCurrency(principalReport.D90));
    paint('dist3-pct-cashin-principal', formatPercent(principalReport.pctCashin * 100, 2));
    paint('dist3-res-hpp-principal', '- ' + formatCurrency(principalReport.D91));
    paint('dist3-pct-hpp-principal', formatPercent(principalReport.pctHpp * 100, 2));
    paint('dist3-res-laba-principal', formatCurrency(principalReport.D95));
    paint('dist3-pct-laba-principal', formatPercent(principalReport.B95 * 100, 2));
    paint('dist3-res-pph-badan-principal', '- ' + formatCurrency(Math.abs(principalReport.D96)));
    paint('dist3-pct-pph-badan-principal', formatPercent(principalReport.pctTax * 100, 2));
    paint('dist3-res-saldo-principal', formatCurrency(principalReport.D97));
    paint('dist3-pct-saldo-principal', formatPercent(principalReport.B97 * 100, 2));
  }

  function setDemoData() {
    document.getElementById('dist3-tax-mode').value = 'PPN';
    document.getElementById('dist3-qty').value = formatQuantity(1);
    document.getElementById('dist3-pagu').value = 'Rp 200.000.000';
    document.getElementById('dist3-kontrak-barang').value = 'Rp 195.550.000';
    document.getElementById('dist3-kontrak-ongkir').value = '';
    document.getElementById('dist3-nego-barang').value = 'Rp 2.000.000';
    document.getElementById('dist3-nego-ongkir').value = '';
    document.getElementById('dist3-tayang-barang').value = 'Rp 197.550.000';
    document.getElementById('dist3-tayang-ongkir').value = '';
    document.getElementById('dist3-hpp-pemasok').value = 'Rp 87.500.000';
    document.getElementById('dist3-principal-tax').value = 'Include';
    document.getElementById('dist3-principal-round').value = '100';
    document.getElementById('dist3-principal-basis').value = 'HPP';
    document.getElementById('dist3-principal-bk').value = '0';
    document.getElementById('dist3-principal-fm').value = '0';
    document.getElementById('dist3-principal-profit').value = '10';
    document.getElementById('dist3-distributor-tax').value = 'Include';
    document.getElementById('dist3-distributor-round').value = '100';
    document.getElementById('dist3-distributor-ongkir').value = '0';
    document.getElementById('dist3-distributor-fm1').value = '15';
    document.getElementById('dist3-cashin-basis').value = 'KONTRAK';
    document.getElementById('dist3-restitusi').value = '100';
    feeBody.innerHTML = '';
    addFeeRow(singleDefaultFeeRow);
    render();
  }

  function resetAll() {
    document.querySelectorAll('.dist3-input').forEach((input) => {
      if (input.tagName === 'SELECT') input.selectedIndex = 0;
      else if (input.type === 'number') input.value = '';
      else input.value = '';
    });
    document.getElementById('dist3-qty').value = formatQuantity(1);
    document.getElementById('dist3-pagu').value = 'Rp 0';
    document.getElementById('dist3-principal-round').value = '100';
    document.getElementById('dist3-distributor-round').value = '100';
    document.getElementById('dist3-restitusi').value = '100';
    feeBody.innerHTML = '';
    addFeeRow(singleDefaultFeeRow);
    render();
  }

  document.addEventListener('input', function (event) {
    if (event.target && event.target.classList.contains('dist3-currency')) applyCurrencyFormatting(event.target);
    if (event.target && event.target.classList.contains('dist3-quantity')) {
      const rawQty = parseQuantity(event.target.value);
      event.target.value = rawQty ? formatQuantity(rawQty) : '';
    }
    if (event.target && event.target.classList.contains('dist3-input')) render();
  });

  document.addEventListener('change', function (event) {
    if (event.target && event.target.classList.contains('dist3-input')) render();
  });

  document.getElementById('dist3-restore-defaults').addEventListener('click', setDemoData);
  document.getElementById('dist3-add-fee-row').addEventListener('click', function () {
    addFeeRow({ name: 'Biaya Baru', pct: 0, pengali: 'TAYANG BARANG', basis: 'DPP', nego: 'TIDAK' });
    render();
  });
  feeBody.addEventListener('click', function (event) {
    const btn = event.target.closest('.dist3-remove-fee');
    if (!btn) return;
    btn.closest('tr').remove();
    ensureAtLeastOneFeeRow();
    render();
  });
  document.getElementById('dist3-reset').addEventListener('click', resetAll);

  qtyInput.value = formatQuantity(parseQuantity(qtyInput.value) || 1);
  addFeeRow(singleDefaultFeeRow);
  render();
})();
