# 14 · How-To: Menambah Sumber Data Baru

> [← Index](./00-INDEX.md) · Terkait: [03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md) ·
> [04-DATABASE](./04-DATABASE.md) · [05-APLIKASI-NEXT](./05-APLIKASI-NEXT.md)

Mau menampilkan data dari sheet/tab baru di dashboard? Ikuti urutan ini.
Prinsipnya tetap: **halaman tidak pernah fetch Google** — sumber baru harus
lewat jalur yang sama: `EF hargi-refresh → tabel hargi_ht2 → halaman`.

## Pembagian peran

| Langkah | Siapa |
|---|---|
| 1–5 (kode di repo: EF, DDL, halaman) | **Kolaborator** — semua di repo |
| 6–7 (eksekusi DDL + deploy EF) | **Owner** — butuh akses Supabase |
| 8 (verifikasi) | bareng |

## Langkah demi langkah

### 1. Siapkan sheet-nya
- Tab/spreadsheet harus **publik** (anyone with link, Viewer).
- Baris 1 = header dengan nama kolom yang jelas (mapping kita by-NAMA header).
- Catat **spreadsheet ID** (dari URL) dan **gid** (angka setelah `#gid=` saat
  tab-nya dibuka).

### 2. Tambah fetch + mapper di EF — `EF/hargi-refresh/index.ts`
Ikuti pola yang sudah ada (contoh: `mapCeAbo`, `mapPareto`):

1. Tambah konstanta: `const SUMBER_BARU = { id: "...", gid: "..." };`
2. Bangun query gviz — filter sebisa mungkin di sisi Google
   (lihat [ADR-5](./13-KEPUTUSAN-TEKNIS.md); jangan tarik sheet raksasa mentah).
3. Tulis `mapSumberBaru(rows)`: cari header **by nama** (fuzzy), simpan baris
   asli ke kolom `raw` (jsonb).
4. Tambahkan ke transaksi tulis: `DELETE FROM hargi_ht2.<tabel>; INSERT ...`
   di dalam blok transaksi yang sudah ada (ikut advisory lock yang sama).
5. (Opsional) ikutkan metadata Drive kalau perlu judul/waktu edit sheet-nya.

### 3. Tulis DDL tabel baru — simpan di `EF/hargi-refresh/sql/` (buat file)
Pola tabel mengikuti [04-DATABASE](./04-DATABASE.md):

```sql
create table hargi_ht2.<nama_tabel> (
  id bigint generated always as identity primary key,
  -- kolom-kolom hasil mapping (text semua, ikut pola tabel lain)
  fetched_at timestamptz not null default now(),
  raw jsonb
);
alter table hargi_ht2.<nama_tabel> enable row level security;
-- akses kolaborator (role ht2_diagus) ikut default privileges, tapi RLS butuh policy:
create policy ht2_diagus_all on hargi_ht2.<nama_tabel>
  for all to ht2_diagus using (true) with check (true);
```

> DDL **di-commit ke repo** sebagai file `.sql`, dieksekusinya oleh owner
> (langkah 6) — role `ht2_diagus` sebenarnya bisa `CREATE` di schema ini, tapi
> tabel yang ditulis EF harus dibuat owner supaya kepemilikan & grant konsisten.

### 4. Tampilkan di halaman Next — `app/src/`
- Query tabel baru di `page.tsx` halaman terkait (ingat:
  [maks 2 `Promise.all`, agregat banyak = 1 statement SQL](./13-KEPUTUSAN-TEKNIS.md)).
- Ikuti standar chart [07-FRONTEND-VISUAL](./07-FRONTEND-VISUAL.md).
- `npx tsc --noEmit` hijau.

### 5. Push
Perubahan `app/` langsung tayang (auto-deploy). Perubahan EF & DDL **belum
aktif** sampai langkah 6–7 — urutannya aman karena halaman baru hanya membaca
tabel yang belum terisi (kosong), bukan error.

### 6. (Owner) Eksekusi DDL
Owner menjalankan file SQL dari langkah 3 sebagai role `postgres`.

### 7. (Owner) Deploy EF
`supabase functions deploy hargi-refresh` (atau via MCP). Lihat
[03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md).

### 8. Verifikasi
1. Buka dashboard → **Refresh Data** → tunggu ±7 dtk.
2. Cek `hargi_ht2.refresh_log` baris terbaru = `success` + `row_count` masuk akal.
3. Cek tabel baru terisi: `select count(*) from hargi_ht2.<nama_tabel>;`
4. Halaman menampilkan data baru.

## Checklist anti-jebakan

- [ ] Sheet publik? (kalau private → semua gagal diam-diam dengan HTML login)
- [ ] gviz query sudah memfilter? (sheet besar mentah = EF mati, ADR-5)
- [ ] Mapping by-NAMA header, bukan posisi kolom?
- [ ] Kolom `raw` jsonb ikut disimpan?
- [ ] DELETE+INSERT ada DI DALAM transaksi + advisory lock yang sama?
- [ ] Policy RLS untuk `ht2_diagus` dibuat?
- [ ] Nama bulan/tanggal di sumber baru formatnya apa? (lihat pengalaman
      English vs Indonesia di [ADR-9](./13-KEPUTUSAN-TEKNIS.md))
