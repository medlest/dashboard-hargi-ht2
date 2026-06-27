# 09 · Infrastruktur (Vercel + Supabase)

> [← Index](./00-INDEX.md) · Terkait: [10-GIT-DEPLOY](./10-GIT-DEPLOY.md) ·
> [03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md)

## Vercel

| Hal | Nilai | Catatan |
|---|---|---|
| Project | `dashboard-hargi-ht2` | terpisah total dari project dashboard lain |
| Production URL | https://dashboard-hargi-ht2.vercel.app | |
| Region function | **sin1** (Singapore) | di `app/vercel.json` — **WAJIB**: DB di Singapore; default `iad1` (US) menambah ±500 ms per query |
| Root Directory | `app/` | repo berisi lebih dari sekadar app (EF, docs) |
| Framework | Next.js (autodetect) | build `next build` |
| Deploy | otomatis dari GitHub | lihat [10-GIT-DEPLOY](./10-GIT-DEPLOY.md) |

### Environment variables (Production)

Nama saja — **nilai TIDAK pernah ditulis di repo/docs**, set lewat
Vercel Dashboard → Project → Settings → Environment Variables:

| Nama | Dipakai oleh | Isi (deskripsi) |
|---|---|---|
| `DB_URL` | `lib/db.ts` (semua halaman) | connection string Postgres **pooler** Supabase: host `aws-1-ap-southeast-1.pooler.supabase.com`, port `6543`, sslmode require |
| `SUPABASE_URL` | `/api/refresh` | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `/api/refresh` | bearer untuk memanggil EF (verify_jwt) |

Untuk dev lokal, ketiganya disalin ke `app/.env.local` (file di-gitignore).
Minta nilainya ke owner.

## Supabase

| Hal | Nilai |
|---|---|
| Project ref | `mjgekmjnsipthcswazid` |
| Region | ap-southeast-1 (Singapore) |
| Postgres | 17 |
| Schema | `hargi_ht2` ([04-DATABASE](./04-DATABASE.md)) — RLS aktif, TIDAK diekspos REST |
| Edge Function | `hargi-refresh` ([03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md)), `verify_jwt: true` |
| Vault secret | `platform_google_api_key` — key Service Account untuk metadata Drive (HANYA dipakai EF) |

### Role database

| Role | Dipakai | Hak |
|---|---|---|
| `postgres` | production Vercel + EF (internal owner) | penuh — TIDAK dibagikan |
| `ht2_diagus` | dev lokal kolaborator Diagus | Full access **hanya** di schema `hargi_ht2`: CRUD, CREATE, ALTER, DROP untuk object HT-2. Schema lain ditolak untuk operasi data/DDL; `public` hanya SELECT metadata extension bawaan. Cabut akses: rotate password atau drop role setelah ownership dipindah. |

### Kenapa pooler :6543, bukan direct :5432

Vercel = serverless: banyak instance pendek umur. Transaction pooler
membagi koneksi backend yang terbatas ke banyak klien. Konsekuensi:
`prepare: false` wajib di driver ([06-KONEKSI-DATABASE](./06-KONEKSI-DATABASE.md)).

## Topologi & latensi

```
Browser ── Vercel edge ── Function sin1 ──(<5ms)── Supabase SG (pooler 6543)
                                  └──(hanya /api/refresh)── EF hargi-refresh
                                                              └── Google (gviz/Drive)
```

Halaman warm: ±100–400 ms. Refresh penuh: ±7 detik.

## Keamanan

- Browser **tidak pernah** memegang credential (DB/Supabase key hanya di env
  server; EF dipanggil lewat proxy).
- EF `verify_jwt: true` — tak bisa dipanggil anonim.
- Schema DB tidak diekspos lewat REST API publik Supabase.
- Tidak ada secret di repo — `.env*` di-gitignore, docs hanya menulis NAMA env.
- Sheet sumber publik **read-only**; tidak ada jalur tulis ke Google.
