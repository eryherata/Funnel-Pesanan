# UAT Checklist per Modul

Dokumen ini dipakai untuk User Acceptance Test sebelum go-live atau major release. Gunakan bersama:
- `docs/SMOKE-TEST-CHECKLIST.md`
- `docs/RELEASE-CHECKLIST.md`
- `docs/UAT-SIGNOFF-TEMPLATE.md`
- `docs/UAT-DEFECT-LOG-TEMPLATE.csv`

## Aturan pengisian
- Status: `Pass`, `Fail`, `Blocked`, atau `N/A`
- Evidence: screenshot, nomor PO/funnel, atau catatan singkat
- Severity defect: `Critical`, `High`, `Medium`, `Low`
- Semua defect `Critical` dan `High` harus ditutup sebelum sign-off produksi

## 1. Auth & Permission
Pre-condition:
- backend aktif
- minimal ada akun `admin`, `editor`, `viewer`
- `AUTH_REQUIRED=true`

| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| AUTH-01 | Login sebagai admin | Login berhasil, nama user dan role tampil di modal Auth |  |  |  |
| AUTH-02 | Login sebagai viewer | UI masuk mode baca saja |  |  |  |
| AUTH-03 | Viewer klik aksi tulis | Aksi ditolak dengan pesan jelas |  |  |  |
| AUTH-04 | Editor membuat funnel baru | Aksi diizinkan |  |  |  |
| AUTH-05 | Admin membuka backup server | Aksi diizinkan |  |  |  |
| AUTH-06 | Viewer membuka backup server | Aksi ditolak |  |  |  |
| AUTH-07 | Logout | Session hilang dan UI kembali ke role anonim/read-only |  |  |  |

## 2. Dashboard Operasional Pesanan
Pre-condition:
- data order aktif tersedia

| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| OPS-01 | Buka dashboard utama | KPI tampil tanpa error JS |  |  |  |
| OPS-02 | Lihat aging order | Bucket aging terisi sesuai data |  |  |  |
| OPS-03 | Lihat backlog outstanding per PIC | Nilai outstanding muncul dan masuk akal |  |  |  |
| OPS-04 | Lihat executive summary | Funnel, order, logistik tampil ringkas di satu tabel |  |  |  |
| OPS-05 | Lihat exception manajerial | Ringkasan blocker/issue tampil |  |  |  |

## 3. Funnel Baru
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| FUN-IN-01 | Isi funnel baru dengan data valid | Funnel tersimpan |  |  |  |
| FUN-IN-02 | Pilih wilayah -> kab/kota -> instansi -> satker | Dropdown hirarki terfilter benar |  |  |  |
| FUN-IN-03 | Isi principal/pemasok/distributor/pelaksana dari master | Dropdown membaca master data |  |  |  |
| FUN-IN-04 | Simpan funnel duplikat | Sistem memberi warning/block sesuai rule |  |  |  |
| FUN-IN-05 | Simpan funnel tanpa field wajib | Sistem menolak dan memberi pesan validasi |  |  |  |

## 4. Daftar Funnel & Konversi
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| FUN-LS-01 | Buka daftar funnel | Tabel tampil tanpa error |  |  |  |
| FUN-LS-02 | Gunakan pencarian dan filter | Data tabel terfilter sesuai input |  |  |  |
| FUN-LS-03 | Buka modal konversi | Modal tampil lengkap |  |  |  |
| FUN-LS-04 | Pilih tautkan ke order existing | Tabel order tampil, search/filter berjalan |  |  |  |
| FUN-LS-05 | Select/unselect order existing | Checkbox dan row selection sinkron |  |  |  |
| FUN-LS-06 | Konversi funnel ke order baru | Order baru tercipta dan relasi funnel-order tersimpan |  |  |  |
| FUN-LS-07 | Tautkan ke existing order | Backlink order dan audit trail ikut terbentuk |  |  |  |
| FUN-LS-08 | Coba konversi funnel lost/arsip | Sistem memblokir konversi |  |  |  |

## 5. Dashboard Funnel
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| FUN-DH-01 | Buka dashboard funnel | Semua widget termuat |  |  |  |
| FUN-DH-02 | Lihat aging per tahap | Aging bucket tampil |  |  |  |
| FUN-DH-03 | Lihat forecast closing | Bucket closing terisi |  |  |  |
| FUN-DH-04 | Lihat owner performance | Win rate dan weighted pipeline tampil |  |  |  |
| FUN-DH-05 | Lihat forecast accuracy closing | Grafik/tabel tampil tanpa error |  |  |  |

## 6. Form Pesanan (Header / Eksekusi / Closing)
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| ORD-FM-01 | Isi tahap Header | Tidak bisa lanjut jika field minimum belum lengkap |  |  |  |
| ORD-FM-02 | Simpan draft | Draft tersimpan dan dapat dibuka ulang |  |  |  |
| ORD-FM-03 | Isi item di tahap Eksekusi | Kalkulasi dan item tersimpan |  |  |  |
| ORD-FM-04 | Isi data closing | Validasi status berdasarkan rule berjalan |  |  |  |
| ORD-FM-05 | Set status `Dalam Pengiriman` tanpa resi | Sistem menolak |  |  |  |
| ORD-FM-06 | Set status `Selesai` tanpa BAST/tanggal diterima | Sistem menolak |  |  |  |
| ORD-FM-07 | Buka order existing via query string `?po=` | Data order termuat untuk edit |  |  |  |

## 7. Daftar Pesanan
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| ORD-LS-01 | Buka daftar pesanan | Tabel tampil |  |  |  |
| ORD-LS-02 | Gunakan filter + search | Hasil sesuai input |  |  |  |
| ORD-LS-03 | Buka detail order | Audit trail, checklist, blocker tampil |  |  |  |
| ORD-LS-04 | Update status dari modal | Status tersimpan dan audit log bertambah |  |  |  |
| ORD-LS-05 | Buat blocker/exception | Issue aktif tampil di detail dan exception center |  |  |  |
| ORD-LS-06 | Resolve blocker | Issue pindah ke selesai/resolved |  |  |  |
| ORD-LS-07 | Bulk update | Hanya baris valid yang berubah, baris invalid ditolak terkontrol |  |  |  |
| ORD-LS-08 | Simpan saved view | View dapat dipakai ulang dan dihapus |  |  |  |

## 8. Exception Center
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| EXC-01 | Buka exception center | KPI issue tampil |  |  |  |
| EXC-02 | Filter severity/status | Tabel issue menyesuaikan |  |  |  |
| EXC-03 | Resolve issue dari pusat exception | Status issue berubah dan detail order ikut sinkron |  |  |  |

## 9. Dashboard Logistik & SLA
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| LOG-01 | Buka dashboard logistik | Widget termuat tanpa error |  |  |  |
| LOG-02 | Lihat root cause delay | Kategori delay tampil |  |  |  |
| LOG-03 | Lihat forecast shipment | Bucket shipment tampil |  |  |  |
| LOG-04 | Lihat forecast accuracy shipment | Grafik/tabel tampil |  |  |  |
| LOG-05 | Lihat backlog per ekspedisi | Outstanding/kuantitas tampil |  |  |  |

## 10. Database Master
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| MST-01 | Tambah master lokasi | Tersimpan dan ikut ke dropdown funnel/order |  |  |  |
| MST-02 | Tambah principal | Tersimpan dan ikut ke dropdown |  |  |  |
| MST-03 | Tambah mitra/vendor | Tersimpan dan ikut ke dropdown sesuai tipe |  |  |  |
| MST-04 | Tambah PIC/penggarap | Tersimpan dan ikut ke dropdown |  |  |  |
| MST-05 | Isi alias master | Analitik/filter membaca nama yang dinormalisasi |  |  |  |
| MST-06 | Simpan master duplikat | Sistem memberi warning/block |  |  |  |
| MST-07 | Backup JSON master | File backup berhasil diunduh |  |  |  |
| MST-08 | Restore backup | Data master kembali sesuai bundle |  |  |  |

## 11. Import / Export / Backup / Restore
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| IMP-01 | Download template CSV order | Template resmi terunduh |  |  |  |
| IMP-02 | Preview import file valid | Baris terbaca, warning/error sesuai data |  |  |  |
| IMP-03 | Import file invalid | Sistem menahan import dan menampilkan error per kolom |  |  |  |
| IMP-04 | Import order valid | Order baru masuk ke sistem |  |  |  |
| IMP-05 | Export CSV daftar pesanan | File CSV sesuai filter aktif |  |  |  |
| IMP-06 | Backup server | Bundle backup server berhasil dibuat |  |  |  |
| IMP-07 | Restore server mode merge | Data tergabung tanpa merusak data yang valid |  |  |  |
| IMP-08 | Restore server mode replace | Data server tertimpa sesuai bundle |  |  |  |

## 12. API & Operasional Backend
| ID | Skenario | Ekspektasi | Status | Evidence | Defect ID |
|---|---|---|---|---|---|
| API-01 | `GET /api/health` | Respon `ok` |  |  |  |
| API-02 | `GET /api/system/runtime-status` | Status runtime tampil lengkap |  |  |  |
| API-03 | `npm run preflight` | Lulus |  |  |  |
| API-04 | `npm run smoke` | Lulus |  |  |  |
| API-05 | `GET /api/orders` dengan filter/pagination | Bekerja sesuai parameter |  |  |  |
| API-06 | `GET /api/funnels` dengan filter/pagination | Bekerja sesuai parameter |  |  |  |
| API-07 | `GET /api/auth/permissions` | Role matrix tampil sesuai user |  |  |  |

## Kriteria sign-off minimum
- Semua item `Critical` dan `High` = selesai
- Minimal 95% test case status `Pass`
- Tidak ada error runtime blocker di halaman utama
- Backup, restore, import preview, dan login admin lulus
