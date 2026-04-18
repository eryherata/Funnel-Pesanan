# Known Limitations

Dokumen ini merangkum batasan yang masih perlu diperhatikan saat UAT dan sebelum production hardening lanjutan.

## Frontend / UX
- Beberapa analitik dashboard masih rule-based, belum seluruhnya berasal dari event log yang granular.
- Restore backup paling aman dijalankan oleh admin saat traffic rendah.
- Untuk dataset sangat besar, tabel dan import preview masih mengandalkan browser client sehingga performa tergantung perangkat user.

## Backend
- Session masih berbasis tabel aplikasi sederhana, belum terhubung ke Redis atau session store terpisah.
- Rate limiting, audit immutability, dan rotating secrets belum di-hardening penuh untuk skala tinggi.
- Restore mode `replace` adalah operasi berisiko tinggi dan sebaiknya hanya dilakukan setelah backup penuh database dibuat.

## Data governance
- Normalisasi alias sudah tersedia, tetapi kualitas hasil tetap tergantung kedisiplinan pengisian master data.
- Import akan memvalidasi format dan enum, namun kualitas mapping awal dari file sumber tetap harus dicek saat preview.

## Rekomendasi operasional
- Wajib jalankan `npm run preflight` dan `npm run smoke` sebelum release.
- Wajib gunakan `docs/UAT-CHECKLIST-PER-MODUL.md` untuk sign-off user.
- Wajib simpan backup server dan backup database sebelum restore/import skala besar.
