export const dashboardData = {
  trendLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
  trendKontrak: [150, 200, 320, 290, 450, 580],
  trendProfit: [25, 30, 45, 40, 65, 80],
  marginShare: [45, 35, 20],
  topSatkerLabels: ['Dinkes', 'Disdik', 'RSUD', 'PUPR', 'Setda'],
  topSatkerValues: [520, 480, 350, 210, 150],
};

export const logistikRows = [
  { po: 'PO-041', satker: 'Dinas Pendidikan', ekspedisi: 'JNE Cargo', tgl: '20 Apr 2026', status: 'Tepat Waktu', prog: 90 },
  { po: 'PO-045', satker: 'RSUD Klaten', ekspedisi: 'Indah Cargo', tgl: '25 Apr 2026', status: 'Perjalanan', prog: 60 },
  { po: 'PO-048', satker: 'Dinas PUPR', ekspedisi: 'Sentral Cargo', tgl: '15 Apr 2026', status: 'Rawan', prog: 30 },
];

export const pesananRows = [
  { po: 'PO-058', satker: 'Dinas Pendidikan', tgl: '08 Apr 2026', nilai: 125000000, status: 'Selesai' },
  { po: 'PO-059', satker: 'RSUD Klaten', tgl: '08 Apr 2026', nilai: 450000000, status: 'Dikirim' },
  { po: 'PO-060', satker: 'Dinas PUPR Kota', tgl: '07 Apr 2026', nilai: 355000000, status: 'Penyiapan' },
];

export const masterProdukRows = [
  { id: 1, kode: 'PRD-001', nama: 'Laptop Asus Core i5', kategori: 'Elektronik', principal: 'Asus' },
];
export const masterMitraRows = [
  { id: 1, tipe: 'Distributor', nama: 'PT Distribusi Makmur', kontak: 'Bpk. Andi' },
];
export const masterSatkerRows = [
  { id: 1, wilayah: 'Jakarta', instansi: 'Dinas Pendidikan', alamat: 'Jl. Sudirman No. 1' },
];

export const productRows = [
  { id: 1, principal: 'Asus', kategori: 'Elektronik', kode: 'PRD-001', nama: 'Laptop Asus Core i5', qty: 10, hpp_pem_sat: 8000000, hpp_dis_sat: 8500000, hpp_pel_sat: 9000000, kon_sat: 10000000, pel_fm_p: 5, dis_fm_p: 2, pem_fm_p: 1 },
];
