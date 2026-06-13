# 11 · Development Lokal

> [← Index](./00-INDEX.md) · Terkait: [05-APLIKASI-NEXT](./05-APLIKASI-NEXT.md) ·
> [10-GIT-DEPLOY](./10-GIT-DEPLOY.md) · [12-OPERASIONAL](./12-OPERASIONAL.md)

## Setup pertama kali

```bash
# prasyarat: Node.js 20+ (dipakai sehari-hari: 22), git
git clone git@github.com:Asdig-UPTBogor/dashboard-hargi-ht2.git
cd dashboard-hargi-ht2/app
npm install
```

Buat env lokal dari template (nilainya minta ke owner via japri — JANGAN
pernah di-commit):

```bash
cp .env.example .env.local   # lalu isi nilainya
```

Tiga variabel yang dibutuhkan (penjelasan lengkap ada di `.env.example`):

| Var | Isi |
|---|---|
| `DB_URL` | koneksi Postgres pooler — kolaborator memakai role **`ht2_app`**: CRUD penuh di schema `hargi_ht2` SAJA, schema lain ditolak |
| `SUPABASE_URL` | URL project Supabase (untuk tombol Refresh) |
| `SUPABASE_PUBLISHABLE_KEY` | bearer pemanggilan EF |

## Perintah harian

```bash
npm run dev -- --port 3200       # dev server → http://localhost:3200
npx tsc --noEmit                 # typecheck (wajib hijau sebelum push)
npm run build                    # build production lokal
PORT=3500 npm run start          # jalanin hasil build (preview lokal)
curl localhost:3200/api/ping-db  # cek kesehatan koneksi DB
```

## Hal yang SERING bikin bingung (baca sebelum panik)

| Gejala | Penyebab | Tindakan |
|---|---|---|
| Halaman pertama lama banget (30–90 dtk) setelah edit | Compile Turbopack on-demand per route di dev mode | Normal. Load kedua cepat. Bukan error. |
| Halaman "transferring" tidak selesai-selesai | Pool DB macet (jarang, sudah di-harden) | `curl /api/ping-db`. Kalau ikut macet → restart dev server. Detail: [06-KONEKSI-DATABASE](./06-KONEKSI-DATABASE.md) |
| CSS hilang / halaman polos | `npm run build` dijalankan saat `next start` masih hidup di folder sama (`.next` ketimpa) | Stop → build → start. Jangan build di bawah server yang jalan |
| Port 3200 `EADDRINUSE` | proses dev lama masih hidup | `ss -tlnp \| grep 3200` → kill PID-nya (jangan pkill pola luas) |
| Dropdown filter ketutup kartu | ada yang mengubah `.rise` fill-mode | balikin ke `backwards` ([07-FRONTEND-VISUAL](./07-FRONTEND-VISUAL.md)) |
| Angka beda antara peta dan KPI | baris sumber tanpa koordinat tidak tampil di peta | bukan bug — lengkapi koordinat di sheet ([02-SUMBER-DATA](./02-SUMBER-DATA.md)) |

## Aturan yang tidak boleh dilanggar

1. **JANGAN upgrade `next`** dari `16.2.4` tanpa membaca
   [ADR-1](./13-KEPUTUSAN-TEKNIS.md) (regression bfcache ≥16.2.6).
2. **JANGAN fetch Google** dari kode halaman/komponen — semua data dari
   Supabase; Google hanya milik EF ([01-ARSITEKTUR](./01-ARSITEKTUR.md)).
3. **JANGAN Promise.all banyak query** di satu halaman — gabungkan jadi satu
   statement SQL ([ADR-3](./13-KEPUTUSAN-TEKNIS.md)).
4. **JANGAN hardcode warna/credential** — token CSS & env vars.
5. Standar chart yang sudah disepakati owner jangan diubah tanpa diskusi
   ([07-FRONTEND-VISUAL](./07-FRONTEND-VISUAL.md)).

## Mengetes alur refresh end-to-end di lokal

1. `npm run dev -- --port 3200`
2. Buka `http://localhost:3200/pareto` → klik **Refresh Data**
3. Tunggu ±7 dtk → header menampilkan "Update per …" baru
4. Cek audit: baris terbaru `hargi_ht2.refresh_log` harus `success`
