import { parseRp, formatRp } from '../core/formatters.js';

export function initKalkulatorB2BPage() {
  const calcQty = document.getElementById('calc-qty');
  if (!calcQty) return;

  const PPN_RATE = 0.11;
  const PPH22_RATE = 0.015;
  const PPH_BADAN_RATE = 0.22;

  function runKalkulatorB2B() {
    const qty = parseInt(calcQty.value, 10) || 1;
    const tayangSat = parseRp(document.getElementById('calc-tayang').value);
    const negoSat = parseRp(document.getElementById('calc-nego').value);
    const hppProdSat = parseRp(document.getElementById('calc-hpp-prod').value);

    const ppnProdStatus = document.querySelector('input[name="ppnProd"]:checked')?.value || 'include';
    const labaProdPct = (parseFloat(document.getElementById('calc-laba-prod-pct').value) || 0) / 100;
    const basisLaba = document.getElementById('calc-basis-laba').value;

    const kontrakSat = tayangSat - negoSat;
    const kontrakTotal = kontrakSat * qty;
    const tayangTotal = tayangSat * qty;
    document.getElementById('lbl-total-kontrak').innerText = formatRp(kontrakTotal);

    const dppTayangSat = tayangSat / (1 + PPN_RATE);
    const dppHppProdSat = ppnProdStatus === 'include' ? (hppProdSat / (1 + PPN_RATE)) : hppProdSat;

    let dppJualCvSat = 0;
    let labaProdSat = 0;
    if (basisLaba === 'jual_cv') {
      dppJualCvSat = dppHppProdSat / Math.max(0.0001, (1 - labaProdPct));
      labaProdSat = dppJualCvSat * labaProdPct;
    } else if (basisLaba === 'hpp') {
      labaProdSat = dppHppProdSat * labaProdPct;
      dppJualCvSat = dppHppProdSat + labaProdSat;
    } else {
      labaProdSat = dppTayangSat * labaProdPct;
      dppJualCvSat = dppHppProdSat + labaProdSat;
    }

    const hargaJualCvSat = dppJualCvSat * (1 + PPN_RATE);
    document.getElementById('lbl-harga-jual-cv').innerText = formatRp(hargaJualCvSat);

    const hppCvTotal = hargaJualCvSat * qty;
    const dppKontrak = kontrakTotal / (1 + PPN_RATE);
    const ppnKeluaran = kontrakTotal - dppKontrak;
    const pph22 = dppKontrak * PPH22_RATE;
    const sp2d = kontrakTotal - ppnKeluaran - pph22;
    document.getElementById('res-kontrak-total').innerText = formatRp(kontrakTotal);
    document.getElementById('res-ppn-out').innerText = '- ' + formatRp(ppnKeluaran);
    document.getElementById('res-pph22').innerText = '- ' + formatRp(pph22);
    document.getElementById('res-sp2d').innerText = formatRp(sp2d);

    const dppHppCvTotal = hppCvTotal / (1 + PPN_RATE);
    const ppnMasukanCv = hppCvTotal - dppHppCvTotal;
    const selisihPpn = ppnKeluaran - ppnMasukanCv;
    document.getElementById('res-hpp-cv-total').innerText = '- ' + formatRp(hppCvTotal);
    document.getElementById('res-selisih-ppn').innerText = '- ' + formatRp(selisihPpn);

    let totalFee = 0;
    document.querySelectorAll('.fee-row').forEach((row) => {
      const pct = parseFloat(row.querySelector('.fee-pct').value) || 0;
      const source = row.querySelector('.fee-source').value;
      const base = row.querySelector('.fee-base').value;
      let targetValue = source === 'tayang' ? tayangTotal : kontrakTotal;
      if (base === 'dpp') targetValue = targetValue / (1 + PPN_RATE);
      totalFee += targetValue * (pct / 100);
    });
    document.getElementById('res-total-fee').innerText = '- ' + formatRp(totalFee);

    const labaKotorCv = kontrakTotal - hppCvTotal;
    const labaBersihCv = labaKotorCv - totalFee - selisihPpn;
    const pphBadanTotal = labaBersihCv > 0 ? (labaBersihCv * PPH_BADAN_RATE) : 0;
    const pph29 = pphBadanTotal - pph22;
    let saldoAkhirCv = labaBersihCv - pphBadanTotal;

    document.getElementById('res-laba-cv').innerText = formatRp(labaBersihCv);
    document.getElementById('res-pph-badan').innerText = '- ' + formatRp(pphBadanTotal);
    document.getElementById('res-kredit-pajak').innerText = '+ ' + formatRp(pph22);
    const lblPph29 = document.getElementById('lbl-kurang-bayar');
    const resPph29 = document.getElementById('res-pph29');
    if (pph29 > 0) {
      lblPph29.innerText = 'PPh 29 (Kurang Bayar)';
      resPph29.innerText = '- ' + formatRp(Math.abs(pph29));
      resPph29.className = 'text-danger fw-bold';
    } else {
      lblPph29.innerText = 'PPh 29 (Lebih Bayar/Restitusi)';
      resPph29.innerText = '+ ' + formatRp(Math.abs(pph29));
      resPph29.className = 'text-success fw-bold';
      saldoAkhirCv = labaBersihCv - pphBadanTotal + Math.abs(pph29);
    }
    document.getElementById('res-saldo-cv').innerText = formatRp(saldoAkhirCv);

    const hppProdTotalIncPpn = dppHppProdSat * (1 + PPN_RATE) * qty;
    document.getElementById('res-cashin-prod').innerText = formatRp(hppCvTotal);
    document.getElementById('res-hpp-prod-total').innerText = '- ' + formatRp(hppProdTotalIncPpn);
    document.getElementById('res-laba-kotor-prod').innerText = formatRp(labaProdSat * qty);
  }

  document.addEventListener('input', (event) => {
    if (event.target?.classList.contains('calc-input')) runKalkulatorB2B();
  });
  document.addEventListener('change', (event) => {
    if (event.target?.classList.contains('calc-input')) runKalkulatorB2B();
  });

  const feeContainer = document.getElementById('fee-container');
  document.getElementById('btn-add-fee')?.addEventListener('click', () => {
    const row = document.createElement('tr');
    row.className = 'fee-row';
    row.innerHTML = `
      <td><input type="text" class="form-control form-control-sm fee-name" placeholder="Nama Biaya"></td>
      <td><input type="number" class="form-control form-control-sm calc-input fee-pct" value="0" step="0.1"></td>
      <td><select class="form-select form-select-sm calc-input fee-source"><option value="tayang">Harga Tayang</option><option value="kontrak">Harga Kontrak</option></select></td>
      <td><select class="form-select form-select-sm calc-input fee-base"><option value="dpp">DPP (Non-PPN)</option><option value="gross">Gross (Inc. PPN)</option></select></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger btn-remove-fee"><i class="fa-solid fa-trash"></i></button></td>`;
    feeContainer.appendChild(row);
  });
  feeContainer?.addEventListener('click', (event) => {
    const btn = event.target.closest('.btn-remove-fee');
    if (btn) { btn.closest('tr')?.remove(); runKalkulatorB2B(); }
  });

  window.resetKalkulatorB2B = function resetKalkulatorB2B() {
    document.querySelectorAll('.calc-input').forEach((input) => {
      if (input.type === 'radio') return;
      if (input.tagName === 'SELECT') input.selectedIndex = 0;
      else if (input.id === 'calc-qty') input.value = '1';
      else input.value = '';
    });
    document.querySelector('input[name="ppnProd"][value="include"]')?.click();
    feeContainer.innerHTML = '';
    runKalkulatorB2B();
  };

  runKalkulatorB2B();
}
