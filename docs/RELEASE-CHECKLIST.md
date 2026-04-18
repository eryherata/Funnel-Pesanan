# Release Checklist

## Sebelum release
- [ ] patch branch sudah direview
- [ ] `node --check` frontend/backend lulus
- [ ] `npm run preflight` lulus
- [ ] `npm run smoke` lulus di staging
- [ ] UAT per modul selesai dan sign-off tersimpan
- [ ] defect log UAT tidak menyisakan issue Critical/High
- [ ] backup database dibuat
- [ ] backup JSON server dibuat
- [ ] akun admin produksi aktif dan tervalidasi
- [ ] APP_ORIGIN sesuai domain target
- [ ] AUTH_REQUIRED sesuai kebijakan lingkungan

## Setelah release
- [ ] health endpoint hijau
- [ ] runtime-status hijau
- [ ] login admin berhasil
- [ ] viewer benar-benar read-only
- [ ] editor bisa menulis data
- [ ] backup server bisa diunduh
- [ ] import preview masih jalan
- [ ] dashboard terbuka tanpa error runtime

## Rollback minimum
- [ ] simpan bundle backup backend sebelum deploy
- [ ] simpan zip release sebelumnya
- [ ] siapkan langkah restore `replace`
- [ ] siapkan rollback service backend ke release sebelumnya

## Dokumen rujukan
- `docs/UAT-CHECKLIST-PER-MODUL.md`
- `docs/UAT-SIGNOFF-TEMPLATE.md`
- `docs/UAT-DEFECT-LOG-TEMPLATE.csv`
- `docs/KNOWN-LIMITATIONS.md`
