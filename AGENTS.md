# Instruksi untuk AI Coding Agent

> File ini dibaca otomatis oleh coding agent (Claude Code, dsb.) yang bekerja
> di repo ini. Manusia juga boleh baca — isinya aturan main repo.

## Sebelum menulis kode APAPUN

1. Baca **`docs/00-INDEX.md`** — peta seluruh sistem. Minimal pahami
   [01-ARSITEKTUR](./docs/01-ARSITEKTUR.md) dan
   [13-KEPUTUSAN-TEKNIS](./docs/13-KEPUTUSAN-TEKNIS.md) (ADR).
2. Aplikasi Next.js ada di **`app/`** (bukan root). Baca
   `app/AGENTS.md` + `node_modules/next/dist/docs/` untuk API Next 16 —
   versi ini beda dari training data kebanyakan model.
3. Verifikasi ke kode/DB aktual sebelum mengklaim sesuatu — docs bisa
   tertinggal dari kode.

## Aturan KERAS (pelanggaran = rusak production, semua ada sejarahnya di ADR)

1. **JANGAN upgrade `next`** dari `16.2.4` (exact, tanpa caret) — regression
   bfcache ≥16.2.6 membekukan halaman. [ADR-1](./docs/13-KEPUTUSAN-TEKNIS.md)
2. **JANGAN fetch Google/eksternal di jalur render** (page/component/SSR).
   Semua data dari Supabase; Google hanya milik EF `hargi-refresh`. [ADR-4]
3. **JANGAN ubah `app/src/lib/db.ts`** (pool hardening + cancel-on-timeout)
   tanpa membaca [06-KONEKSI-DATABASE](./docs/06-KONEKSI-DATABASE.md). Khusus:
   jangan naikkan `idle_timeout`, jangan hapus wrapper cancel. [ADR-2]
4. **JANGAN pecah query halaman jadi banyak `Promise.all`** (maks 2).
   Halaman ber-agregat banyak = SATU statement SQL dengan subquery
   `jsonb_build_object`/`jsonb_agg` (contoh: `app/src/app/page.tsx`). [ADR-3]
5. **JANGAN ubah standar chart yang sudah disepakati owner** (donut label
   luar, threshold label stacked 5%, warna kondisi CE, dst.) tanpa
   persetujuan — lihat [07-FRONTEND-VISUAL](./docs/07-FRONTEND-VISUAL.md).
6. **Agregasi laporan/deck = level UPT**, bukan per GI (GI itu aset ULTG;
   koordinasi Hartrans 2 berhenti di UPT). [ADR-6]
7. **JANGAN commit secret** — `.env*` di-gitignore; nilai env hanya di
   Vercel/`.env.local`. Jangan tulis nilai credential di kode/docs/commit.
8. Animasi `.rise` tetap `animation-fill-mode: backwards` (bukan
   both/forwards) — kalau diganti, dropdown filter ketimpa kartu.
9. Peta dengan terrain aktif: ganti style WAJIB manual
   (lepas terrain → `setStyle` → re-apply di `style.load`) — lihat [ADR-10].
10. Data sumber cacat (kategori/koordinat kosong) **tidak ditambal di kode**
    — perbaikannya di Google Sheet, lalu Refresh. Tampilkan apa adanya,
    jangan tambah fallback yang menyembunyikan masalah.

## Workflow kerja

```bash
cd app && npm install              # sekali
# minta nilai .env.local ke owner (DB_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
npm run dev -- --port 3200         # dev
npx tsc --noEmit                   # WAJIB hijau sebelum commit
```

- **Push ke `main` = deploy production otomatis** (Vercel, Root Directory
  `app/`). Push langsung ke `main` diperbolehkan — pastikan `npx tsc --noEmit`
  hijau dulu, karena yang ke-push langsung tayang. Untuk perubahan besar/
  berisiko, boleh pakai branch + PR (dapat Preview URL otomatis).
- Hit pertama route di dev = compile Turbopack (bisa lama) — bukan error.
- Cek kesehatan DB: `curl localhost:3200/api/ping-db`.
- Edge Function (`EF/hargi-refresh/`) TIDAK ikut deploy Vercel — deploy
  terpisah ke Supabase dan butuh akses project; **koordinasikan dengan owner**
  sebelum mengubahnya.

## Konvensi

- Komentar kode & dokumentasi: Bahasa Indonesia, istilah teknis tetap English.
- Identifier kode: English.
- Angka di UI pakai class `num` (JetBrains Mono); warna lewat token CSS
  (`globals.css`), jangan hardcode.
- Anotasi slide deck = fakta terhitung dari data, bukan narasi/opini. [ADR-8]

## Kalau ragu

Cek dulu: [12-OPERASIONAL](./docs/12-OPERASIONAL.md) (troubleshooting) dan
[11-DEV-LOKAL](./docs/11-DEV-LOKAL.md) (gejala umum dev). Kalau masih ragu,
tanya owner repo — jangan menebak lalu mengubah perilaku yang sudah disepakati.
