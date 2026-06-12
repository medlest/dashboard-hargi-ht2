# 📚 Dokumentasi Dashboard Hartrans 2 — Gardu Induk

> Pintu masuk dokumentasi. Tiap topik punya dokumen sendiri — baca sesuai
> kebutuhan, semua saling terhubung.
>
> **Production:** https://dashboard-hargi-ht2.vercel.app

## Mulai dari mana?

| Kamu siapa | Baca urutan ini |
|---|---|
| **Baru pertama kali** | [01-ARSITEKTUR](./01-ARSITEKTUR.md) → [02-SUMBER-DATA](./02-SUMBER-DATA.md) → [08-HALAMAN](./08-HALAMAN.md) |
| **Mau ngoding / ubah tampilan** | [11-DEV-LOKAL](./11-DEV-LOKAL.md) → [05-APLIKASI-NEXT](./05-APLIKASI-NEXT.md) → [07-FRONTEND-VISUAL](./07-FRONTEND-VISUAL.md) |
| **Ngurus data / sheet** | [02-SUMBER-DATA](./02-SUMBER-DATA.md) → [03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md) → [04-DATABASE](./04-DATABASE.md) |
| **Deploy / infra** | [09-INFRASTRUKTUR](./09-INFRASTRUKTUR.md) → [10-GIT-DEPLOY](./10-GIT-DEPLOY.md) |
| **Ada masalah** | [12-OPERASIONAL](./12-OPERASIONAL.md) → [06-KONEKSI-DATABASE](./06-KONEKSI-DATABASE.md) |

## Daftar dokumen

| # | Dokumen | Isi |
|---|---|---|
| 01 | [ARSITEKTUR](./01-ARSITEKTUR.md) | Gambaran end-to-end, prinsip desain, tech stack |
| 02 | [SUMBER-DATA](./02-SUMBER-DATA.md) | 2 Google Sheet sumber, format, aturan, kualitas data |
| 03 | [SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md) | EF `hargi-refresh`: pipeline gviz → Postgres, metadata, error handling |
| 04 | [DATABASE](./04-DATABASE.md) | Schema `hargi_ht2`: 3 tabel, kolom, semantik kondisi/status |
| 05 | [APLIKASI-NEXT](./05-APLIKASI-NEXT.md) | Struktur app Next.js, pola data per halaman, API routes |
| 06 | [KONEKSI-DATABASE](./06-KONEKSI-DATABASE.md) | `db.ts`: pool, hardening anti-hang, diagnostik |
| 07 | [FRONTEND-VISUAL](./07-FRONTEND-VISUAL.md) | Design token, theme, standar chart, slide deck |
| 08 | [HALAMAN](./08-HALAMAN.md) | Detail tiap route: Overview, Pareto, CE, Asset Maps |
| 09 | [INFRASTRUKTUR](./09-INFRASTRUKTUR.md) | Vercel, Supabase, environment variables |
| 10 | [GIT-DEPLOY](./10-GIT-DEPLOY.md) | Repo GitHub, workflow kolaborasi, auto-deploy |
| 11 | [DEV-LOKAL](./11-DEV-LOKAL.md) | Setup development, perintah, hal yang sering kejadian |
| 12 | [OPERASIONAL](./12-OPERASIONAL.md) | Refresh data, audit, troubleshooting |
| 13 | [KEPUTUSAN-TEKNIS](./13-KEPUTUSAN-TEKNIS.md) | ADR: keputusan penting + alasannya (jangan diulang debat) |
| — | [AUDIT_BASELINE](./AUDIT_BASELINE.md) | Audit aplikasi lama (Angular+FastAPI) yang digantikan dashboard ini |

## Peta sistem 10 detik

```
Google Sheets (publik) ──[tombol Refresh]──► EF hargi-refresh ──► Supabase (hargi_ht2)
                                                                        │
GitHub main ──[push]──► Vercel build ──► Next.js (sin1) ◄──[baca tiap render]
```

Aturan emas: **halaman tidak pernah membaca Google** — semua render baca
Supabase; Google hanya disentuh Edge Function saat tombol Refresh ditekan.
