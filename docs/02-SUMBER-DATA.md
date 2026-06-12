# 02 · Sumber Data (Google Sheets)

> [← Index](./00-INDEX.md) · Terkait: [03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md) ·
> [04-DATABASE](./04-DATABASE.md) · [12-OPERASIONAL](./12-OPERASIONAL.md)

## Dua spreadsheet sumber

| Sheet | Isi | Spreadsheet ID | gid |
|---|---|---|---|
| **CE ABO** | Temuan Common Enemy Next Level 2026 | `1-eC0GdeMwYDhnGzCSM8viO0HvD6X0NdlMaWOxe2P9ZM` | `299154811` |
| **Pareto** | Riwayat gangguan transformator | `1hf_lpXI6x3hBDfEHX8r8q15w6F3wtlzIABGibdpCMhg` | `1882488493` |

Konstanta ID ini ada di `app/src/lib/sheets.ts` (web — hanya untuk link
"buka sheet") dan `EF/hargi-refresh/index.ts` (sync — yang benar-benar fetch).

## Status akses

- Kedua sheet **publik** (anyone with the link, Viewer) → bisa dibaca lewat
  endpoint gviz/export **tanpa credential apapun**.
- Dashboard & EF **read-only by design** — tidak ada satu pun jalur tulis ke
  Google.
- **Kalau sheet di-private suatu saat:** EF harus pindah ke Google Sheets API
  dengan Service Account / OAuth organisasi (project `sheets-bridge-uptbogor`).
  JANGAN pernah memakai akun Google personal. Panduan komentar sudah ada di
  header `EF/hargi-refresh/index.ts`.

## Format data yang harus dipahami

| Hal | Fakta | Dampak |
|---|---|---|
| Nama bulan (sheet gangguan) | **Bahasa Inggris**: `January` … `December` | Semua query/agregasi dibuat menerima English **dan** Indonesia (anti-drift kalau format diganti) |
| Tanggal `tgl_keluar` | `D-Mon-YY`, contoh `9-Jun-26` | Parsing pakai regex `^\d{1,2}-[A-Za-z]{3}-\d{2}$`; baris di luar pola di-skip dari fitur "terbaru" |
| Kondisi CE | `1-Very Good` `2-Good` `3-Fair` `4-Poor` `5-Critical` | `1-`/`2-` = close, `3-`/`4-`/`5-` = open — lihat [04-DATABASE](./04-DATABASE.md) |
| Nama GI | Format identik di dua sheet: `GI 150KV GONDANGREJO` | Bisa lookup silang antar tabel (mis. cari ULTG dari data CE) |
| ULTG | **Tidak ada** di sheet gangguan | Di-lookup dari tabel CE saat dibutuhkan |
| Koordinat GI | Kolom `Latitude`/`Longitude`, bisa kosong | Baris tanpa koordinat tidak tampil di peta (tetap dihitung di angka non-peta) |

## Kualitas data = tanggung jawab sheet

Dashboard menampilkan apa adanya, tidak menambal:

- Baris **tanpa kategori** → tidak muncul di chart "Kategori Penyebab".
- Baris **tanpa koordinat** → tidak muncul sebagai titik peta.
- Kasus nyata: gangguan `9-Jun-26 · GI 150KV GONDANGREJO` tercatat tanpa
  kategori dan tanpa koordinat → angka totalnya benar di semua KPI, tapi
  tidak terlihat di peta/chart kategori sampai dilengkapi di sheet.

**SOP:** lengkapi/koreksi baris di sheet → buka dashboard → tombol
**Refresh Data** → semua halaman terupdate (lihat [12-OPERASIONAL](./12-OPERASIONAL.md)).

## Jejak metadata

Setiap sinkron, EF menyimpan **judul spreadsheet** dan **modifiedTime**
(waktu terakhir sheet diedit, dari Drive API) ke tabel `refresh_log` →
ditampilkan di header halaman sebagai
`Sumber: {judul sheet} · Update per {tanggal}` dan bisa diklik untuk membuka
sheet aslinya.
