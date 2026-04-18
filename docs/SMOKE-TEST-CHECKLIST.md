# Smoke Test Checklist

Jalankan setelah deploy baru, restore besar, atau perubahan konfigurasi backend.

## Otomatis
Di folder `backend/`:
- `npm run preflight`
- `npm run smoke`

Environment opsional:
- `SMOKE_BASE_URL`
- `SMOKE_USERNAME`
- `SMOKE_PASSWORD`

## Manual
### Backend
- [ ] `/api/health` = OK
- [ ] `/api/system/runtime-status` = OK
- [ ] login admin berhasil
- [ ] `GET /api/orders` berhasil
- [ ] `GET /api/funnels` berhasil
- [ ] `GET /api/masters/bootstrap` berhasil
- [ ] `GET /api/system/backup` berhasil untuk admin

### Frontend
- [ ] topbar status API terlihat benar
- [ ] login dari modal **Auth & Permission** berhasil
- [ ] mode baca saja muncul saat role viewer
- [ ] Daftar Pesanan terbuka
- [ ] Daftar Funnel terbuka
- [ ] Dashboard utama terbuka
- [ ] import preview berjalan
- [ ] export CSV berjalan
- [ ] backup JSON frontend berjalan

### Workflow inti
- [ ] buat funnel baru
- [ ] konversi funnel ke pesanan
- [ ] simpan draft pesanan
- [ ] update status pesanan
- [ ] buat blocker/exception
- [ ] resolve blocker/exception
- [ ] saved view bisa dibuat dan dipakai ulang

### Dashboard
- [ ] Dashboard Funnel memuat aging dan win rate
- [ ] Dashboard Operasional memuat backlog dan exception summary
- [ ] Dashboard Logistik memuat root cause delay dan forecast accuracy

## Catatan
Smoke test tidak menggantikan UAT. Setelah smoke test lulus, lanjutkan validasi bisnis memakai `docs/UAT-CHECKLIST-PER-MODUL.md`.
