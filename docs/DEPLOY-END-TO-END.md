# Deploy End-to-End — Web Update Pantauan Pesanan

Dokumen ini merangkum alur deploy frontend + backend Node.js/Express + MySQL untuk lingkungan staging atau production.

## 1. Persiapan server
- Node.js 20+ disarankan
- MySQL 8+
- Nginx atau reverse proxy setara
- domain/subdomain untuk frontend dan backend
- akses shell untuk menjalankan `npm install` dan service manager

## 2. Setup database
1. Buat database baru, misalnya `pantauan_pesanan`.
2. Buat user aplikasi dengan hak akses seperlunya.
3. Import `backend/sql/schema.sql`.
4. Pastikan akun seed hanya dipakai untuk awal setup, lalu ganti password admin.

## 3. Setup backend
1. Masuk ke folder `backend/`.
2. Salin `.env.production.example` menjadi `.env`.
3. Isi variabel utama:
   - `APP_ORIGIN`
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
   - `AUTH_REQUIRED=true`
4. Jalankan:
   - `npm install`
   - `npm run preflight`
   - `npm start`
5. Pastikan endpoint berikut merespons:
   - `/api/health`
   - `/api/system/runtime-status`

## 4. Reverse proxy
Contoh umum:
- frontend dilayani dari domain utama
- backend di-proxy ke `/api` atau subdomain API

Pastikan:
- header `Authorization` diteruskan
- `X-Forwarded-For` dan `X-Forwarded-Proto` diteruskan
- `TRUST_PROXY=true` di backend bila berada di balik proxy

## 5. Setup frontend
- Deploy isi frontend ke web root atau static hosting
- Bila backend berada di domain/subdomain berbeda, atur `API base URL` dari modal **Auth & Permission**
- Untuk production, set mode data ke `api` atau `auto`

## 6. Verifikasi awal
Sebelum user memakai sistem, lakukan:
1. login backend sebagai admin
2. cek daftar funnel
3. cek daftar pesanan
4. cek backup server
5. cek import preview
6. cek restore mode `merge` pada bundle dummy

## 6A. UAT sebelum go-live
- Jalankan checklist per modul pada `docs/UAT-CHECKLIST-PER-MODUL.md`
- Simpan hasil sign-off pada `docs/UAT-SIGNOFF-TEMPLATE.md`
- Catat semua defect di `docs/UAT-DEFECT-LOG-TEMPLATE.csv`
- Pastikan `docs/KNOWN-LIMITATIONS.md` dipahami user operasional

## 7. Go-live checklist singkat
- `AUTH_REQUIRED=true`
- password akun seed diganti
- backup database aktif
- smoke test lulus
- APP_ORIGIN tidak lagi `*`
- restore hanya untuk admin
- operator sudah tahu prosedur backup dan export
