# 10 · Git & Auto-Deploy

> [← Index](./00-INDEX.md) · Terkait: [09-INFRASTRUKTUR](./09-INFRASTRUKTUR.md) ·
> [11-DEV-LOKAL](./11-DEV-LOKAL.md)

## Repo

| Hal | Nilai |
|---|---|
| Repo | `Asdig-UPTBogor/dashboard-hargi-ht2` (GitHub, **private**) |
| Branch utama | `main` = production |
| Akses | kolaborator diundang per orang oleh owner (Settings → Collaborators) |

### Isi repo

```
dashboard-hargi-ht2/
├── app/        ← aplikasi Next.js (yang di-build Vercel)
├── EF/         ← source Edge Function hargi-refresh
├── docs/       ← dokumentasi ini
└── README.md   ← ringkasan + link ke docs/00-INDEX.md
```

### Yang TIDAK ikut repo (`.gitignore`)

- `node_modules/`, `.next/`, artefak build
- `.env*` — **semua credential** (set di Vercel / `.env.local` lokal)
- `CLAUDE.md` — catatan kerja internal owner
- `DASAR APLIKASI/` + `*.rar` — baseline aplikasi lama (referensi lokal)
- screenshot/scratch file

## Alur deploy

```
feature branch ── Pull Request ──► review ──► merge ke main
      │                                            │
      └──► Vercel PREVIEW deploy per PR            └──► Vercel PRODUCTION deploy
           (URL unik otomatis, buat ngecek)             https://dashboard-hargi-ht2.vercel.app
```

- **Push/merge ke `main` = production deploy otomatis.** Tidak ada langkah
  manual.
- Setiap PR otomatis dapat **Preview URL** dari Vercel — review visual tanpa
  menyentuh production.
- Vercel project setting penting: **Root Directory = `app/`** (karena repo
  berisi EF & docs juga).

## Workflow kolaborasi yang disarankan

```bash
git clone git@github.com:Asdig-UPTBogor/dashboard-hargi-ht2.git
cd dashboard-hargi-ht2
git checkout -b fitur/nama-fitur
# ... kerja (lihat 11-DEV-LOKAL.md) ...
npx tsc --noEmit          # wajib hijau sebelum push
git commit -am "feat: ..."
git push -u origin fitur/nama-fitur
# buka PR di GitHub → cek Preview URL → merge
```

Konvensi:
- TypeScript harus bersih (`npx tsc --noEmit`) sebelum push.
- Jangan upgrade dependency `next` tanpa membaca
  [ADR-1 di 13-KEPUTUSAN-TEKNIS](./13-KEPUTUSAN-TEKNIS.md).
- Perubahan visual chart/halaman yang sudah disepakati owner → diskusikan
  dulu di PR, jangan ubah diam-diam ([07-FRONTEND-VISUAL](./07-FRONTEND-VISUAL.md)).

## Catatan EF

Edge Function TIDAK ikut auto-deploy Vercel (dia hidup di Supabase).
Perubahan `EF/hargi-refresh/index.ts` di-deploy terpisah:
`supabase functions deploy hargi-refresh` (atau via MCP) — lihat
[03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md).

## Deploy manual darurat (jarang dibutuhkan)

```bash
cd app && vercel deploy --prod --yes
```
Dipakai hanya kalau integrasi Git bermasalah; normalnya cukup push ke main.
