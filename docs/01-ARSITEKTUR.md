# 01 · Arsitektur

> [← Index](./00-INDEX.md) · Terkait: [02-SUMBER-DATA](./02-SUMBER-DATA.md) ·
> [03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md) · [13-KEPUTUSAN-TEKNIS](./13-KEPUTUSAN-TEKNIS.md)

## Apa ini

Dashboard monitoring **HARGI (Pemeliharaan Gardu Induk) · Hartrans 2 · UIT
Jawa Bagian Tengah**. Dua domain data:

1. **Trend Gangguan Transformator** — riwayat gangguan trafo 2021–sekarang.
2. **Common Enemy (CE) Next Level 2026** — temuan anomali peralatan GI dan
   progres penyelesaiannya.

Dashboard ini menggantikan aplikasi lama (Angular + FastAPI, lihat
[AUDIT_BASELINE](./AUDIT_BASELINE.md)) dengan stack modern tanpa server yang
harus dirawat sendiri.

## Prinsip desain (pegang ini, semua keputusan turun dari sini)

1. **Sheet tetap milik tim.** Data sumber hidup di Google Sheets; dashboard
   100% read-only terhadap sheet — tidak pernah menulis ke Google.
2. **Render tidak menyentuh Google.** Halaman HANYA membaca Supabase
   Postgres. Satu-satunya jembatan ke Google = Edge Function `hargi-refresh`,
   dipicu manual lewat tombol **Refresh Data**. (Alasan historis: pernah
   fetch metadata Google di jalur render → halaman 30+ detik. Lihat
   [ADR di 13-KEPUTUSAN-TEKNIS](./13-KEPUTUSAN-TEKNIS.md).)
3. **Zero credential Google.** Sheet publik dibaca via URL gviz/export biasa.
   Tidak ada API key Google di aplikasi web sama sekali.
4. **Level koordinasi = UPT.** Hartrans 2 berkoordinasi ke UPT; GI adalah
   aset ULTG. Agregasi utama laporan/deck dibuat per UPT — per-GI hanya untuk
   identitas detail (tabel, peta).
5. **Tampilkan data apa adanya.** Baris sumber yang cacat (koordinat/kategori
   kosong) tidak ditambal di dashboard — diperbaiki di sheet, lalu refresh.

## Diagram end-to-end

```
┌──────────────── SUMBER (Google, milik tim) ────────────────┐
│  Sheet "CE ABO"   ·   Sheet "Pareto"   (publik, view-only) │
└──────────────┬─────────────────────────────────────────────┘
               │ hanya saat tombol 🔄 Refresh Data
               ▼
┌─ Supabase Edge Function: hargi-refresh (Deno) ─────────────┐
│  gviz fetch → parse → transaksi delete+insert → metadata   │
└──────────────┬─────────────────────────────────────────────┘
               ▼
┌─ Supabase Postgres · schema hargi_ht2 ─────────────────────┐
│  ce_abo_findings · gangguan_trafo · refresh_log            │
└──────────────┬─────────────────────────────────────────────┘
               │ tiap render (read-only, pooler :6543)
               ▼
┌─ Next.js @ Vercel sin1 ────────────────────────────────────┐
│  /  /pareto  /ce-abo  /asset-maps  /api/refresh  /api/ping-db │
└────────────────────────────────────────────────────────────┘

GitHub main ──push──► Vercel auto-build ──► production
```

## Tech stack

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Web framework | Next.js 16 App Router | **pinned EXACT 16.2.4** — lihat [ADR-1](./13-KEPUTUSAN-TEKNIS.md) |
| UI | React 19 + TypeScript + Tailwind CSS 4 | token sendiri di `globals.css` |
| Chart | ECharts 6 (`echarts-for-react`) | builder option di `lib/echart-options.ts` |
| Peta | MapLibre GL (`react-map-gl/maplibre`) | basemap raster Carto/ESRI/OSM |
| Animasi | framer-motion | slide deck, caption peta |
| DB | Supabase Postgres 17 | schema `hargi_ht2`, RLS aktif, tidak diekspos REST |
| Sync | Supabase Edge Function (Deno) | [03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md) |
| Hosting | Vercel region sin1 | [09-INFRASTRUKTUR](./09-INFRASTRUKTUR.md) |
| Repo | GitHub + Vercel Git integration | [10-GIT-DEPLOY](./10-GIT-DEPLOY.md) |

## Hirarki organisasi (penting buat baca data)

```
UIT JBT (Hartrans 2) → UPT → ULTG → Gardu Induk (GI) → Bay → Peralatan
```
