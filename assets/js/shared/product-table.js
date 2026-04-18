import { rpFormatter, pctFormatter, createCurrencyEditor, createPercentEditor, createQtyEditor } from '../core/tabulator-helpers.js';
import { formatRp, formatPct } from '../core/formatters.js';
import { productRows } from '../data/mock-data.js';

function netKontrak(row) {
  return (((row.kon_sat || 0) + (row.kon_kirim_sat || 0) - (row.kon_nego_sat || 0) - (row.kon_nego_kirim_sat || 0)) * (row.qty || 0));
}

export function createProductTable(selector) {
  if (typeof Tabulator === 'undefined' || !document.querySelector(selector)) return null;
  const currencyEditor = createCurrencyEditor();
  const percentEditor = createPercentEditor();
  const qtyEditor = createQtyEditor();

  return new Tabulator(selector, {
    data: JSON.parse(JSON.stringify(productRows)),
    layout: 'fitDataFill',
    reactiveData: true,
    columnHeaderVertAlign: 'middle',
    headerHozAlign: 'center',
    columns: [
      { title: 'No.', formatter: 'rownum', width: 50, hozAlign: 'center', headerSort: false },
      { title: 'Aksi', formatter: () => "<i class='fa-solid fa-trash text-danger' style='cursor:pointer;'></i>", width: 50, hozAlign: 'center', headerSort: false, cellClick: (e, cell) => cell.getRow().delete() },
      { title: 'Principal', field: 'principal', editor: 'input', width: 150 },
      { title: 'Kategori Produk', field: 'kategori', editor: 'input', width: 150 },
      { title: 'Kode Produk', field: 'kode', editor: 'input', width: 120 },
      { title: 'Nama Produk', field: 'nama', editor: 'input', width: 250 },
      { title: 'Qty', field: 'qty', editor: qtyEditor, width: 80, hozAlign: 'center' },
      { title: 'HPP', columns: [
        { title: 'Pemasok', columns: [{ title: 'Satuan', field: 'hpp_pem_sat', editor: currencyEditor, formatter: rpFormatter, width: 120 }, { title: 'Jumlah', field: 'hpp_pem_jum', formatter: rpFormatter, width: 120, mutator: (v, d) => (d.qty || 0) * (d.hpp_pem_sat || 0) }] },
        { title: 'Distributor', columns: [{ title: 'Satuan', field: 'hpp_dis_sat', editor: currencyEditor, formatter: rpFormatter, width: 120 }, { title: 'Jumlah', field: 'hpp_dis_jum', formatter: rpFormatter, width: 120, mutator: (v, d) => (d.qty || 0) * (d.hpp_dis_sat || 0) }] },
        { title: 'Pelaksana', columns: [{ title: 'Satuan', field: 'hpp_pel_sat', editor: currencyEditor, formatter: rpFormatter, width: 120 }, { title: 'Jumlah', field: 'hpp_pel_jum', formatter: rpFormatter, width: 120, mutator: (v, d) => (d.qty || 0) * (d.hpp_pel_sat || 0) }] },
      ] },
      { title: 'RAB', columns: [
        { title: 'Harga Satuan', field: 'rab_sat', editor: currencyEditor, formatter: rpFormatter, width: 130 },
        { title: 'Biaya Kirim Sat', field: 'rab_kirim_sat', editor: currencyEditor, formatter: rpFormatter, width: 130 },
        { title: 'Jml Harga + Kirim', field: 'rab_jum', formatter: rpFormatter, width: 170, mutator: (v, d) => (d.qty || 0) * ((d.rab_sat || 0) + (d.rab_kirim_sat || 0)) },
      ] },
      { title: 'Tayang', columns: [
        { title: 'Harga Satuan', field: 'tayang_sat', editor: currencyEditor, formatter: rpFormatter, width: 130 },
        { title: 'Biaya Kirim Sat', field: 'tayang_kirim_sat', editor: currencyEditor, formatter: rpFormatter, width: 130 },
        { title: 'Jml Harga + Kirim', field: 'tayang_jum', formatter: rpFormatter, width: 170, mutator: (v, d) => (d.qty || 0) * ((d.tayang_sat || 0) + (d.tayang_kirim_sat || 0)) },
      ] },
      { title: 'Kontrak', columns: [
        { title: 'Harga Satuan', field: 'kon_sat', editor: currencyEditor, formatter: rpFormatter, width: 130 },
        { title: 'Biaya Kirim Sat', field: 'kon_kirim_sat', editor: currencyEditor, formatter: rpFormatter, width: 130 },
        { title: 'Nego Barang Sat', field: 'kon_nego_sat', editor: currencyEditor, formatter: rpFormatter, width: 130 },
        { title: 'Nego Kirim Sat', field: 'kon_nego_kirim_sat', editor: currencyEditor, formatter: rpFormatter, width: 130 },
        { title: 'Jml Harga + Kirim - Nego', field: 'kon_jum', formatter: rpFormatter, width: 190, mutator: (v, d) => netKontrak(d) },
      ] },
      ...['pem', 'dis', 'pel'].map((prefix) => ({
        title: `Rabat/Discount ${prefix === 'pem' ? 'Pemasok' : prefix === 'dis' ? 'Distributor' : 'Pelaksana'}`,
        columns: ['fm', 'bsr', 'bop', 'disc'].map((type) => ({
          title: type.toUpperCase(),
          columns: [
            { title: '%', field: `${prefix}_${type}_p`, editor: percentEditor, formatter: pctFormatter, width: 60 },
            { title: 'Rp', field: `${prefix}_${type}_rp`, formatter: rpFormatter, width: 110, mutator: (v, d) => netKontrak(d) * ((d[`${prefix}_${type}_p`] || 0) / 100) },
          ],
        })).concat([{ title: 'JUMLAH', columns: [
          { title: '%', field: `${prefix}_jum_p`, formatter: pctFormatter, width: 70, mutator: (v, d) => (d[`${prefix}_fm_p`] || 0) + (d[`${prefix}_bsr_p`] || 0) + (d[`${prefix}_bop_p`] || 0) + (d[`${prefix}_disc_p`] || 0) },
          { title: 'Rp', field: `${prefix}_jum_rp`, formatter: rpFormatter, width: 120, mutator: (v, d) => (d[`${prefix}_fm_rp`] || 0) + (d[`${prefix}_bsr_rp`] || 0) + (d[`${prefix}_bop_rp`] || 0) + (d[`${prefix}_disc_rp`] || 0) },
        ] }]),
      })),
      { title: 'Jumlah Keseluruhan Rabat', columns: ['fm', 'bsr', 'bop', 'disc'].map((type) => ({
        title: type.toUpperCase(),
        columns: [
          { title: '%', field: `tot_${type}_p`, formatter: pctFormatter, width: 60, mutator: (v, d) => (d[`pel_${type}_p`] || 0) + (d[`dis_${type}_p`] || 0) + (d[`pem_${type}_p`] || 0) },
          { title: 'Rp', field: `tot_${type}_rp`, formatter: rpFormatter, width: 110, mutator: (v, d) => (d[`pel_${type}_rp`] || 0) + (d[`dis_${type}_rp`] || 0) + (d[`pem_${type}_rp`] || 0) },
        ],
      })).concat([{ title: 'JUMLAH', columns: [
        { title: '%', field: 'tot_jum_p', formatter: pctFormatter, width: 70, mutator: (v, d) => (d.tot_fm_p || 0) + (d.tot_bsr_p || 0) + (d.tot_bop_p || 0) + (d.tot_disc_p || 0) },
        { title: 'Rp', field: 'tot_jum_rp', formatter: rpFormatter, width: 130, cssClass: 'text-success fw-bold', mutator: (v, d) => (d.tot_fm_rp || 0) + (d.tot_bsr_rp || 0) + (d.tot_bop_rp || 0) + (d.tot_disc_rp || 0) },
      ] }]) },
    ],
  });
}

export function updateSummaryCards(table) {
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
  const bind = (id, value) => { const el = document.getElementById(id); if (el) el.innerText = value; };

  bind('sum-hpp-pem', formatRp(hppPem));
  bind('sum-hpp-dis', formatRp(hppDis));
  bind('sum-hpp-pel', formatRp(hppPel));
  bind('sum-rab-brg', formatRp(rabSat));
  bind('sum-rab-krm', formatRp(rabKirim));
  bind('sum-rab-tot', formatRp(rabTot));
  bind('sum-tayang-brg', formatRp(tayangSat));
  bind('sum-tayang-krm', formatRp(tayangKirim));
  bind('sum-tayang-tot', formatRp(tayangTot));
  bind('sum-kon-brg', formatRp(konSat));
  bind('sum-kon-krm', formatRp(konKirim));
  bind('sum-kon-tot', formatRp(konTot));
  bind('sum-nego-brg', formatRp(konNegoBrg));
  bind('sum-nego-krm', formatRp(konNegoKirim));
  bind('sum-nego-tot', formatRp(konNegoTot));
  bind('pct-pel', formatPct(netKon ? (pelRp / netKon) * 100 : 0));
  bind('rp-pel', formatRp(pelRp));
  bind('pct-dis', formatPct(netKon ? (disRp / netKon) * 100 : 0));
  bind('rp-dis', formatRp(disRp));
  bind('pct-pem', formatPct(netKon ? (pemRp / netKon) * 100 : 0));
  bind('rp-pem', formatRp(pemRp));
  bind('pct-tot', formatPct(netKon ? ((pelRp + disRp + pemRp) / netKon) * 100 : 0));
  bind('rp-tot', formatRp(pelRp + disRp + pemRp));
}
