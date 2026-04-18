# Update Pantauan Pesanan

Versi ini mempertahankan tampilan halaman asli, tetapi fondasi CSS dan JavaScript sudah dipisah agar lebih mudah dirawat.

## Struktur utama
- `index.html`, `input-pesanan.html`, `data-pesanan.html`, `database-master.html`, `logistik-sla.html`, `kalkulator-b2b.html`, `kalkulator-distributor.html`
- `assets/css/` untuk stylesheet yang dipecah per area
- `assets/js/core/` untuk logic global seperti theme, sidebar, formatter, plugin
- `assets/js/pages/` untuk logic per halaman
- `assets/js/shared/` untuk helper yang dipakai lintas halaman
- `assets/js/data/` untuk mock data demo

## Catatan
- UI sengaja dipertahankan mengikuti project asli.
- Navigasi memakai multi-page biasa agar lebih stabil.
- `assets/js/script.js` tetap tersedia agar kompatibel dengan HTML asli, lalu memuat `assets/js/app.js` sebagai module.


## Sprint 1 foundation
- `backend/` berisi fondasi API Express + MySQL.
- `assets/js/shared/api-bridge.js` menambahkan mode data `auto / local / api`.
- Frontend tetap bisa berjalan tanpa backend, tetapi bila API aktif data akan disinkronkan ke MySQL.


## Sprint 5 Tahap 1
- Backend menambah auth/role dasar, request id, response envelope konsisten, serta pagination/filter untuk API funnel & order.


## Cleanup final & UAT
- Dokumen UAT per modul tersedia di `docs/UAT-CHECKLIST-PER-MODUL.md`.
- Template sign-off tersedia di `docs/UAT-SIGNOFF-TEMPLATE.md`.
- Template defect log tersedia di `docs/UAT-DEFECT-LOG-TEMPLATE.csv`.
- Known limitations dirangkum di `docs/KNOWN-LIMITATIONS.md`.
