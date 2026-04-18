# Pantauan Pesanan Backend

Backend Node.js + Express + MySQL untuk web **Update Pantauan Pesanan**.

## Fitur utama backend saat ini
- auth/role dasar dengan session token
- role matrix per modul
- filter + pagination untuk order dan funnel
- import preview + import API
- backup/restore server (`merge` dan `replace`)
- request id, security headers dasar, response envelope konsisten
- runtime status dan smoke test script

## Menjalankan backend
1. Salin `.env.example` menjadi `.env`
2. Import `sql/schema.sql`
3. Jalankan:
   - `npm install`
   - `npm run preflight`
   - `npm run dev`

## Script penting
- `npm run preflight` → cek kesiapan konfigurasi dasar
- `npm run smoke` → smoke test endpoint inti
- `npm run check` → syntax check seluruh file backend dan script

## Akun seed
Saat schema diimport, user default berikut dibuat:
- `admin` / `admin123` → role `admin`
- `opslead` / `ops12345` → role `editor`
- `viewer` / `viewer123` → role `viewer`

Segera ganti password akun admin setelah deploy pertama.

## Auth
Jika `AUTH_REQUIRED=false`, endpoint tulis masih bisa dipakai tanpa login sehingga frontend lama tetap kompatibel.

Jika `AUTH_REQUIRED=true`, endpoint tulis memerlukan Bearer token dari login dan role akan divalidasi per modul.

## Endpoint operasional penting
- `GET /api/health`
- `GET /api/system/runtime-status`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/permissions`
- `GET /api/system/backup`
- `POST /api/system/restore`
- `POST /api/import/orders`
- `POST /api/import/funnels`
- `POST /api/import/masters/:entity`

## Header penting
- `Authorization: Bearer <token>`
- `X-Actor-Name: <nama>` untuk fallback actor saat auth belum diwajibkan
- `X-Request-Id: <custom-id>` opsional

## Dokumen opsional
- `docs/DEPLOY-END-TO-END.md`
- `docs/SMOKE-TEST-CHECKLIST.md`
- `docs/RELEASE-CHECKLIST.md`

## UAT & release readiness
Dokumen yang dipakai sebelum sign-off produksi:
- `docs/UAT-CHECKLIST-PER-MODUL.md`
- `docs/UAT-SIGNOFF-TEMPLATE.md`
- `docs/UAT-DEFECT-LOG-TEMPLATE.csv`
- `docs/KNOWN-LIMITATIONS.md`
