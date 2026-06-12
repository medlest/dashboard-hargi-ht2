# Dashboard Hartrans 2 — Gardu Induk

Dashboard monitoring **HARGI · Hartrans 2 · UIT Jawa Bagian Tengah**:
trend gangguan transformator, temuan Common Enemy Next Level 2026, dan
peta sebaran aset Gardu Induk.

**Production:** https://dashboard-hargi-ht2.vercel.app

```
Google Sheets (publik) ──[tombol Refresh]──► Supabase EF hargi-refresh
                                                   │
                                                   ▼
                                     Supabase Postgres (schema hargi_ht2)
                                                   │  baca tiap render
                                                   ▼
GitHub main ──push──► Vercel (sin1) ──► Next.js 16 + ECharts + MapLibre
```

## 📚 Dokumentasi

**Mulai dari sini → [`docs/00-INDEX.md`](./docs/00-INDEX.md)** — peta lengkap
semua dokumen (arsitektur, sumber data, sync, database, aplikasi, deploy,
troubleshooting, keputusan teknis).

## Struktur repo

| Folder | Isi |
|---|---|
| `app/` | Aplikasi Next.js (yang di-deploy Vercel, Root Directory) |
| `EF/` | Source Edge Function `hargi-refresh` (deploy ke Supabase, terpisah) |
| `docs/` | Dokumentasi sistem (vault, mulai dari `00-INDEX.md`) |

## Quick start development

```bash
cd app
npm install
# buat app/.env.local (DB_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY — minta ke owner)
npm run dev -- --port 3200
```

Panduan lengkap + hal yang sering bikin bingung: [`docs/11-DEV-LOKAL.md`](./docs/11-DEV-LOKAL.md).

## Aturan penting (detail di docs)

- `next` dipin **EXACT 16.2.4** — jangan upgrade ([kenapa](./docs/13-KEPUTUSAN-TEKNIS.md))
- Halaman **tidak pernah** fetch Google — semua data dari Supabase
- Push ke `main` = deploy production otomatis ([alur](./docs/10-GIT-DEPLOY.md))
