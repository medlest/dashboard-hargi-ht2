# 03 · Sinkronisasi — Edge Function `hargi-refresh`

> [← Index](./00-INDEX.md) · Terkait: [02-SUMBER-DATA](./02-SUMBER-DATA.md) ·
> [04-DATABASE](./04-DATABASE.md) · [09-INFRASTRUKTUR](./09-INFRASTRUKTUR.md)

**Source:** `EF/hargi-refresh/index.ts` (Deno, ±290 baris).
**Deploy:** Supabase project `mjgekmjnsipthcswazid`, `verify_jwt: true`.
**Pemicu:** `POST /api/refresh` di aplikasi web (proxy) → EF. Durasi normal ±7 detik.

## Kenapa gviz query API, bukan CSV export biasa

Export CSV penuh sheet CE ABO = **28,7 MB / ±138.000 baris** → Edge Function
mati kehabisan compute (`WORKER_RESOURCE_LIMIT`). Solusinya **gviz query
API**: filter dieksekusi DI SISI GOOGLE, response yang turun tinggal ±186 KB
(±788 baris relevan):

```
https://docs.google.com/spreadsheets/d/{id}/gviz/tq?tqx=out:csv&gid={gid}&tq={query}
```

`tq` = query mirip SQL (`select * where X contains 'HARGI' and ...`). Kolom
di query gviz dirujuk pakai huruf (A, B, …, AA) — EF punya helper
`colLetter(index)` untuk menerjemahkan posisi header → huruf.

## Pipeline lengkap

```
POST /functions/v1/hargi-refresh  (Authorization: Bearer <publishable key>)
│
├─ 1. INSERT refresh_log (status='running')
│
├─ 2. Fetch + parse CE ABO
│     gviz URL → CSV → PapaParse (header: true)
│     mapCeAbo(): cari header BY NAMA (fuzzy, case-insensitive)
│       → kolom pindah posisi di sheet TIDAK merusak sync
│     setiap baris asli disimpan utuh ke kolom `raw` (jsonb)
│       → kolom baru di sheet tidak hilang, tinggal mapping menyusul
│
├─ 3. Fetch + parse Pareto (pola sama, mapPareto())
│
├─ 4. Transaksi tulis (ATOMIK):
│     BEGIN;
│       pg_advisory_xact_lock(421702)   ← dua refresh paralel tidak mungkin
│       DELETE FROM hargi_ht2.ce_abo_findings;  INSERT ...(788);
│       DELETE FROM hargi_ht2.gangguan_trafo;   INSERT ...(286);
│     COMMIT;
│     -- tier FLAT (truncate-and-load): data tanpa PK natural di sumber,
│     -- jumlah kecil → ganti total tiap sync adalah pola paling aman
│
├─ 5. Metadata sheet (judul + modifiedTime) via Google Drive API:
│     · auth Service Account: JWT RS256 ditandatangani pakai WebCrypto
│     · private key SA dibaca dari Supabase Vault
│       (secret: `platform_google_api_key`, SA milik project org
│        `sheets-bridge-uptbogor`)
│     · FAIL-SAFE: kalau langkah ini gagal (token, network), sync TETAP
│       dianggap sukses — metadata saja yang null
│
├─ 6. UPDATE refresh_log: status='success', row_count, finished_at,
│     sheet_name_ce/pareto, sheet_modified_ce/pareto
│
└─ 7. finally { sql.end() }  ← koneksi DB selalu ditutup, sukses atau gagal
```

## Error handling

| Skenario | Perilaku |
|---|---|
| gviz fetch gagal / CSV rusak | transaksi tidak jalan → **data lama utuh**; `refresh_log.status='error'` + pesan di kolom `error` |
| Dua orang menekan Refresh bersamaan | advisory lock → yang kedua menunggu yang pertama selesai (tidak dobel-tulis) |
| Metadata Drive gagal | sync tetap sukses, metadata null (fail-safe) |
| Header kolom sheet berubah nama total | mapping by-nama melempar error eksplisit menyebut header yang dicari — kelihatan jelas di `refresh_log.error`, bukan diam-diam kosong |

## Keamanan

- `verify_jwt: true` → tidak bisa dipanggil anonim; browser tidak pernah
  memanggil EF langsung (lewat proxy `/api/refresh`, key di env server).
- Credential SA hanya untuk **metadata Drive** (judul/waktu edit), tidak
  pernah membaca isi sheet (sheet publik).

## Deploy ulang EF

Lewat Supabase MCP/CLI (`supabase functions deploy hargi-refresh`) dari
folder `EF/hargi-refresh/`. Setelah deploy, tes tombol Refresh di dashboard
dan cek baris terbaru `refresh_log`.
