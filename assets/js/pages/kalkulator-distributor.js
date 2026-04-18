import { parseRp, formatRp, ceilTo } from '../core/formatters.js';

export function initKalkulatorDistributorPage() {
  const calcQty3 = document.getElementById('calc-qty-3');
  if (!calcQty3) return;

  const PPH22_RATE = 0.015;
  const PPH_BADAN_RATE = 0.22;

  const getPPN = (gross, isPPN = true) => (!isPPN || gross <= 0 ? 0 : Math.floor((gross / 1.11) * 0.11));
  const getPPH22 = (gross, isPPN = true) => (gross <= 0 ? 0 : Math.floor(((isPPN ? gross / 1.11 : gross)) * PPH22_RATE));

  function getBaseContext() {
    const qty = Math.max(1, parseInt(calcQty3.value, 10) || 1);
    const tayangBrgSat = parseRp(document.getElementById('calc-tayang-brg').value);
    const tayangKrmSat = parseRp(document.getElementById('calc-tayang-krm').value);
    const negoBrgSat = parseRp(document.getElementById('calc-nego-brg').value);
    const negoKrmSat = parseRp(document.getElementById('calc-nego-krm').value);
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
      qty, isPPN, tayangBrg, tayangKrm, tayangTot, negoTot, kontrakBrg, kontrakKrm, kontrakTot,
      eKontrakBrg: getPPN(kontrakBrg, isPPN), eKontrakTot: getPPN(kontrakTot, isPPN), eTayangBrg: getPPN(tayangBrg, isPPN), eTayangTot: getPPN(tayangTot, isPPN),
      fKontrakBrg: getPPH22(kontrakBrg, isPPN), fKontrakTot: getPPH22(kontrakTot, isPPN), fTayangBrg: getPPH22(tayangBrg, isPPN), fTayangTot: getPPH22(tayangTot, isPPN),
    };
  }

  const getPengaliValue = (ctx, key) => ({ 'KONTRAK BARANG': ctx.kontrakBrg, 'TOTAL KONTRAK': ctx.kontrakTot, 'TAYANG BARANG': ctx.tayangBrg, 'TOTAL TAYANG': ctx.tayangTot }[key] || 0);
  const getPengaliPPN = (ctx, key) => ({ 'KONTRAK BARANG': ctx.eKontrakBrg, 'TOTAL KONTRAK': ctx.eKontrakTot, 'TAYANG BARANG': ctx.eTayangBrg, 'TOTAL TAYANG': ctx.eTayangTot }[key] || 0);
  const getPengaliPPH = (ctx, key) => ({ 'KONTRAK BARANG': ctx.fKontrakBrg, 'TOTAL KONTRAK': ctx.fKontrakTot, 'TAYANG BARANG': ctx.fTayangBrg, 'TOTAL TAYANG': ctx.fTayangTot }[key] || 0);

  function calcBasisValue(ctx, pengali, dari, isNego = 'TIDAK') {
    const harga = getPengaliValue(ctx, pengali);
    const ppn = getPengaliPPN(ctx, pengali);
    const pph = getPengaliPPH(ctx, pengali);
    let hitung = 0;
    switch (dari) {
      case 'SP2D': hitung = harga - ppn - pph; break;
      case 'DPP': hitung = harga - ppn; break;
      default: hitung = harga; break;
    }
    if (isNego === 'YA') hitung -= ctx.negoTot;
    return hitung;
  }

  function calcFeeRows(ctx) {
    let feePelaksanaTotal = 0;
    let feeDistributorTotal = 0;
    document.querySelectorAll('.fee-row-3').forEach((row) => {
      const pct = (parseFloat(row.querySelector('.fee-pct-3').value) || 0) / 100;
      const pengali = row.querySelector('.fee-source-3').value || 'TOTAL KONTRAK';
      const dari = row.querySelector('.fee-base-3').value || 'SP2D';
      const isNego = row.querySelector('.fee-nego-3').value || 'TIDAK';
      const dibebankan = row.querySelector('.fee-target-3').value || 'pelaksana';
      const nilai = calcBasisValue(ctx, pengali, dari, isNego) * pct;
      if (dibebankan === 'distributor') feeDistributorTotal += nilai; else feePelaksanaTotal += nilai;
    });
    return { feePelaksanaTotal, feeDistributorTotal };
  }

  function hitungLayerPemasok(ctx) {
    const hppPrinInputSat = parseRp(document.getElementById('calc-hpp-prin-3').value);
    const hppPrinInputTotal = hppPrinInputSat * ctx.qty;
    const ppnPrinStatus = document.querySelector('input[name="ppnPrin3"]:checked')?.value || 'include';
    const basisPrin = document.getElementById('calc-basis-prin-3').value || 'TAYANG';
    const labaPrinPct = (parseFloat(document.getElementById('calc-laba-prin-pct-3').value) || 0) / 100;
    const roundPrin = Math.max(1, parseInt(document.getElementById('calc-round-prin').value, 10) || 1);

    let hargaIpvBase = 0;
    if (basisPrin === 'HPP') {
      const baseNet = hppPrinInputTotal + (hppPrinInputTotal * labaPrinPct);
      hargaIpvBase = ppnPrinStatus === 'include' ? baseNet : baseNet * 1.11;
    } else if (basisPrin === 'TAYANG') {
      const labaFromTayang = ctx.tayangTot * labaPrinPct;
      const baseNet = hppPrinInputTotal + labaFromTayang;
      hargaIpvBase = ppnPrinStatus === 'include' ? baseNet : baseNet * 1.11;
    } else {
      const safePct = Math.min(labaPrinPct, 0.999999);
      const baseNet = hppPrinInputTotal / Math.max(0.0001, (1 - safePct));
      hargaIpvBase = ppnPrinStatus === 'include' ? baseNet : baseNet * 1.11;
    }

    const hargaIpvTotal = ceilTo(hargaIpvBase, roundPrin);
    const hppPrinModalAkhir = ppnPrinStatus === 'include' ? hppPrinInputTotal : (hppPrinInputTotal + getPPN(hppPrinInputTotal, ctx.isPPN));
    return { hargaIpvTotal, hppPrinModalAkhir };
  }

  function hitungLayerDistributor(ctx, hargaIpvTotal) {
    const roundDist = Math.max(1, parseInt(document.getElementById('calc-round-dist').value, 10) || 1);
    const labaDist1Pct = (parseFloat(document.getElementById('calc-laba-dist-1').value) || 0) / 100;
    const d59 = labaDist1Pct * hargaIpvTotal;
    const crossLabaPct = (parseFloat(document.getElementById('calc-laba-dist-2').value) || 0) / 100;
    const crossPengali = document.getElementById('calc-cross-pengali').value || 'TOTAL KONTRAK';
    const crossDari = document.getElementById('calc-cross-dari').value || 'SP2D';
    const d60 = calcBasisValue(ctx, crossPengali, crossDari, 'TIDAK') * crossLabaPct;
    const b60 = hargaIpvTotal > 0 ? (d60 / hargaIpvTotal) : 0;
    let b61 = 0;
    if (ctx.isPPN && hargaIpvTotal > 0) {
      const ppnFactor = 0.11 / 1.11;
      const numerator = ((0.05 / (1 - 0.22)) * (d60 + (labaDist1Pct * hargaIpvTotal))) + d60 + (hargaIpvTotal * ((ppnFactor * labaDist1Pct) - ((1 - ppnFactor) * b60)));
      const divisor = (1 - ppnFactor) * hargaIpvTotal;
      b61 = divisor !== 0 ? (numerator / divisor) : 0;
    } else if (hargaIpvTotal > 0) {
      b61 = ((d59 + d60) * (0.05 / (1 - 0.22))) / hargaIpvTotal;
    }
    const b62 = labaDist1Pct + b60 + b61;
    const hargaCvTotal = ceilTo(hargaIpvTotal + (hargaIpvTotal * b62), roundDist);
    return { hargaCvTotal };
  }

  function hitungLayerPelaksana(ctx, hargaCvTotal, feePelaksanaTotal) {
    const acuanLaba = document.getElementById('calc-base-laba-cv').value || 'KONTRAK';
    const restitusiPct = (parseFloat(document.getElementById('calc-restitusi-pct').value) || 100) / 100;
    let acuanHarga = ctx.kontrakTot, acuanPPN = ctx.eKontrakTot, acuanPPH = ctx.fKontrakTot;
    if (acuanLaba === 'BARANG') { acuanHarga = ctx.tayangBrg; acuanPPN = ctx.eTayangBrg; acuanPPH = ctx.fTayangBrg; }
    if (acuanLaba === 'TOTAL') { acuanHarga = ctx.tayangTot; acuanPPN = ctx.eTayangTot; acuanPPH = ctx.fTayangTot; }
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

  const paint = (id, value) => { const el = document.getElementById(id); if (el) el.innerText = value; };

  function runKalkulator3Layer() {
    const ctx = getBaseContext();
    paint('lbl-total-kontrak-3', formatRp(ctx.kontrakTot));
    const pemasok = hitungLayerPemasok(ctx);
    paint('lbl-harga-jual-ipv', formatRp(pemasok.hargaIpvTotal / ctx.qty));
    const fee = calcFeeRows(ctx);
    const distributor = hitungLayerDistributor(ctx, pemasok.hargaIpvTotal);
    paint('lbl-harga-jual-cv-3', formatRp(distributor.hargaCvTotal / ctx.qty));

    const pelaksana = hitungLayerPelaksana(ctx, distributor.hargaCvTotal, fee.feePelaksanaTotal);
    paint('res-laba-kotor-cv', formatRp(pelaksana.labaKotorCv));
    paint('res-fee-cv-3', '- ' + formatRp(fee.feePelaksanaTotal));
    paint('res-selisih-ppn-cv-3', '- ' + formatRp(pelaksana.selisihPpnCv));
    paint('res-laba-cv-3', formatRp(pelaksana.labaBersihCv));
    paint('res-sp2d-3', formatRp(pelaksana.sp2dCair));
    paint('res-cashout-cv', '- ' + formatRp(pelaksana.cashOutCv));
    paint('res-saldo-kas-cv', formatRp(pelaksana.saldoKasSementara));
    paint('res-restitusi-cv', '+ ' + formatRp(pelaksana.nilaiRestitusi));
    paint('res-saldo-cv-3', formatRp(pelaksana.saldoAkhirCv));
    const lblKurangBayar = document.getElementById('lbl-kurang-bayar');
    const elPph29 = document.getElementById('res-pph29-cv-3');
    if (pelaksana.kurangBayarPajak > 0) {
      lblKurangBayar.innerText = 'PPh 29 (Kurang Bayar)';
      elPph29.innerText = '- ' + formatRp(Math.abs(pelaksana.kurangBayarPajak));
      elPph29.className = 'text-danger fw-bold';
    } else {
      lblKurangBayar.innerText = 'PPh 29 (Restitusi/Lebih)';
      elPph29.innerText = '+ ' + formatRp(Math.abs(pelaksana.kurangBayarPajak));
      elPph29.className = 'text-success fw-bold';
    }

    const reportDist = hitungLayerDistributorReport(ctx, pemasok.hargaIpvTotal, distributor.hargaCvTotal, fee.feeDistributorTotal);
    paint('res-cashin-dist-3', formatRp(distributor.hargaCvTotal));
    paint('res-hpp-dist-3', '- ' + formatRp(pemasok.hargaIpvTotal));
    paint('res-fee-dist-3', '- ' + formatRp(fee.feeDistributorTotal));
    paint('res-selisih-ppn-dist-3', '- ' + formatRp(reportDist.selisihPpnDist));
    paint('res-laba-dist-3', formatRp(reportDist.labaBersihDist));
    paint('res-pph-badan-dist-3', '- ' + formatRp(reportDist.pphBadanDist));
    paint('res-saldo-dist-3', formatRp(reportDist.saldoAkhirDist));

    paint('res-cashin-prin-3', formatRp(pemasok.hargaIpvTotal));
    paint('res-hpp-prin-3', '- ' + formatRp(pemasok.hppPrinModalAkhir));
    paint('res-laba-prin-3', formatRp(pemasok.hargaIpvTotal - pemasok.hppPrinModalAkhir));
  }

  function addFeeRow() {
    const feeContainer = document.getElementById('fee-container-3');
    const row = document.createElement('tr');
    row.className = 'fee-row-3';
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

  document.addEventListener('input', (event) => { if (event.target?.classList.contains('calc-input-3')) runKalkulator3Layer(); });
  document.addEventListener('change', (event) => { if (event.target?.classList.contains('calc-input-3')) runKalkulator3Layer(); });
  document.getElementById('btn-add-fee-3')?.addEventListener('click', () => { addFeeRow(); runKalkulator3Layer(); });
  document.getElementById('fee-container-3')?.addEventListener('click', (event) => {
    const btn = event.target.closest('.btn-remove-fee-3');
    if (btn) { btn.closest('tr')?.remove(); runKalkulator3Layer(); }
  });

  window.resetKalkulatorDistributor3 = function resetKalkulatorDistributor3() {
    document.querySelectorAll('.calc-input-3').forEach((input) => {
      if (input.type === 'radio') return;
      if (input.tagName === 'SELECT') input.selectedIndex = 0;
      else if (input.id === 'calc-qty-3') input.value = '1';
      else if (input.id === 'calc-restitusi-pct') input.value = '100';
      else if (input.id === 'calc-round-prin' || input.id === 'calc-round-dist') input.value = '1';
      else input.value = '';
    });
    document.querySelector('input[name="ppnPrin3"][value="include"]')?.click();
    document.getElementById('fee-container-3').innerHTML = '';
    runKalkulator3Layer();
  };

  runKalkulator3Layer();
}
