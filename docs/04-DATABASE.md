# 04 · Database — Supabase schema `hargi_ht2`

> [← Index](./00-INDEX.md) · Terkait: [03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md) ·
> [06-KONEKSI-DATABASE](./06-KONEKSI-DATABASE.md)

Postgres 17 di Supabase (project `mjgekmjnsipthcswazid`, Singapore).
Schema **`hargi_ht2`** — RLS aktif di semua tabel, schema **tidak diekspos**
ke PostgREST; semua akses lewat koneksi Postgres langsung (pooler :6543).

## Tabel 1 · `ce_abo_findings` — temuan CE (±788 baris)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint identity **PK** | |
| `kode` | text | kode temuan (mis. `CE-...`) |
| `sub_bidang` | text | |
| `level_anomali` | text | `Switch Yard` / `MV Apparatus` / `Trafo` |
| `uraian` | text | jenis masalah (basis chart "uraian") |
| `hartrans` | text | |
| `upt` / `ultg` / `gardu_induk` | text | hirarki lokasi UIT→UPT→ULTG→GI |
| `nama_ruas_bay` / `nama_alat` | text | |
| `kondisi_terkini` | text | kondisi saat ini |
| `kondisi_awal` | text | kondisi saat ditemukan |
| `kondisi_akhir` | text | **kolom utama progres** — lihat semantik di bawah |
| `tgl_rencana_tinjut` / `tgl_realisasi_tinjut` | text | |
| `jml` / `kode_awal` / `kode_terkini` | text | |
| `status_awal` / `status_terkini` | text | `OPEN` / `CLOSE` |
| `fetched_at` | timestamptz | waktu sync |
| `raw` | jsonb | seluruh baris sheet asli (anti-drift) |

### Semantik kondisi (dipakai di SEMUA perhitungan)

```
kondisi format "N-Nama":  1-Very Good · 2-Good · 3-Fair · 4-Poor · 5-Critical

CLOSE  = kondisi_akhir mengandung "1-" atau "2-"
OPEN   = kondisi_akhir mengandung "3-", "4-", atau "5-"
PROGRES = close ÷ total × 100%
```

Pencocokan pakai `includes("1-")` (bukan equality) supaya tahan variasi
penulisan. Implementasi JS di `app/src/lib/aggregate.ts` (`isClosed`/`isOpen`)
dan versi SQL-nya (`like '%1-%'` dst.) di `app/src/app/page.tsx` — **dua-duanya
harus konsisten** kalau diubah.

Warna kondisi (jangan diubah maknanya — bahasa visual tim lapangan):
`1-` biru · `2-` hijau · `3-` kuning · `4-` merah muda · `5-` merah tua
(`app/src/lib/colors.ts`).

## Tabel 2 · `gangguan_trafo` — riwayat gangguan (±286 baris)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint identity **PK** | |
| `no` | text | |
| `tgl_keluar` | text | `D-Mon-YY` (mis. `9-Jun-26`) |
| `unit` | text | UPT (mis. `UPT SALATIGA`) |
| `gardu` | text | nama GI — format sama dengan `ce_abo_findings.gardu_induk` |
| `nama_bay` | text | mis. `TRF#1 150/20kV` |
| `kategori` | text | kategori penyebab (bisa kosong di sumber) |
| `sebab` | text | uraian penyebab |
| `tahun` / `bulan` | text | bulan **English** (`January`…) |
| `t4` / `keterangan` / `tegangan` | text | |
| `latitude` / `longitude` | text | koordinat GI, bisa kosong |
| `fetched_at` | timestamptz | |
| `raw` | jsonb | baris sheet asli |

Catatan turunan yang sering dipakai:

- **Trafo terdampak** = `distinct` hasil normalisasi `nama_bay`
  (`TRF#4 150/20kV (INC)` → `TRF#4`, regex buang ` \d...` ke belakang).
- **ULTG** tidak ada di tabel ini → lookup silang ke `ce_abo_findings` via
  nama GI (format identik).
- Validasi koordinat pakai regex `^-?[0-9]+(\.[0-9]+)?$` sebelum di-cast
  float (kolomnya text, isinya warisan sheet).

## Tabel 3 · `refresh_log` — audit sinkronisasi

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint identity **PK** | |
| `source` | text | |
| `row_count` | integer | jumlah baris yang ditulis |
| `status` | text | `running` → `success` / `error` |
| `error` | text | pesan kalau gagal |
| `started_at` / `finished_at` | timestamptz | |
| `sheet_modified_ce` / `sheet_modified_pareto` | timestamptz | Drive modifiedTime |
| `sheet_name_ce` / `sheet_name_pareto` | text | judul spreadsheet |

Header semua halaman membaca baris `status='success'` terbaru untuk
menampilkan "Sumber: {judul} · Update per {tanggal}".

## Pola tulis: FLAT (truncate-and-load)

Setiap refresh = `DELETE` semua + `INSERT` ulang dalam **satu transaksi**
(dengan advisory lock). Dipilih karena data sumber tidak punya primary key
natural yang stabil dan ukurannya kecil — atomik, sederhana, tidak mungkin
setengah-update. Detail di [03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md).
