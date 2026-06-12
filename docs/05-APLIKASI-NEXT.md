# 05 · Aplikasi Web (Next.js) — folder `app/`

> [← Index](./00-INDEX.md) · Terkait: [06-KONEKSI-DATABASE](./06-KONEKSI-DATABASE.md) ·
> [07-FRONTEND-VISUAL](./07-FRONTEND-VISUAL.md) · [08-HALAMAN](./08-HALAMAN.md)

Next.js 16 App Router (**pinned exact `16.2.4`** — alasannya di
[ADR-1](./13-KEPUTUSAN-TEKNIS.md)) + React 19 + TypeScript + Tailwind 4.

## Struktur folder

```
app/
├── vercel.json                  # { "regions": ["sin1"] } — WAJIB (DB di SG)
├── package.json                 # next "16.2.4" TANPA caret
├── public/backgrounds/          # foto GI dark/light (backdrop theme)
└── src/
    ├── app/
    │   ├── layout.tsx           # html/body + ThemeProvider + Sidebar + font
    │   ├── globals.css          # design token + util (.card, .num, .rise…)
    │   ├── loading.tsx          # skeleton global
    │   ├── page.tsx             # /            (server) Overview — 1 statement SQL
    │   ├── overview-view.tsx    # /            (client) hero + KPI strip
    │   ├── hero-map.tsx         # /            (client) peta 3D tour 5 scene
    │   ├── pareto/
    │   │   ├── page.tsx         # /pareto      (server) 2 query: rows + refresh_log
    │   │   └── pareto-view.tsx  # /pareto      (client) filter+chart+deck 8 slide
    │   ├── ce-abo/
    │   │   ├── page.tsx         # /ce-abo      (server)
    │   │   ├── ce-abo-view.tsx  # /ce-abo      (client) filter+chart+deck 11 slide
    │   │   └── hero-ce.tsx      # /ce-abo      hero panel per level (klik=filter)
    │   ├── asset-maps/
    │   │   ├── page.tsx         # /asset-maps  (server) agregasi per GI di SQL
    │   │   ├── asset-maps-view.tsx  # panel layer/kontrol/ranking/detail
    │   │   └── gi-map.tsx       # MapLibre: basemap, layer circle, HOME_VIEW
    │   └── api/
    │       ├── refresh/route.ts # POST → proxy ke EF hargi-refresh
    │       └── ping-db/route.ts # GET  → select 1 (diagnostik pool)
    ├── components/
    │   ├── page-header.tsx      # judul + [Jam][Refresh][Theme] + baris sumber
    │   ├── sidebar.tsx          # navigasi 4 route
    │   ├── slide-deck.tsx       # Deck/DeckCover/DeckChartSlide/DeckContentSlide
    │   ├── echart.tsx           # wrapper ECharts + useChartTheme (token→chart)
    │   ├── hero-primitives.tsx  # Caption/BigStat/MultiSegBar/pctColor (hero)
    │   ├── multi-select.tsx     # dropdown filter multi-pilih
    │   ├── chart-card.tsx · clock.tsx · refresh-button.tsx · theme-toggle.tsx
    └── lib/
        ├── db.ts                # pool postgres + hardening → 06-KONEKSI-DATABASE
        ├── aggregate.ts         # filter + agregasi client-side (CE & gangguan)
        ├── echart-options.ts    # builder option chart (pie/stacked/grouped/line/…)
        ├── colors.ts            # warna kondisi CE + palette kategori
        └── sheets.ts            # ID sheet + sheetEditUrl (TANPA fetch apapun)
```

## Pola data per halaman

| Route | Server (page.tsx) | Client (view) |
|---|---|---|
| `/pareto`, `/ce-abo` | kirim **baris mentah** (≤1000) + baris `refresh_log` terbaru | filter & agregasi di browser (`lib/aggregate.ts`) → ganti filter = instan, tanpa round-trip |
| `/` Overview | **SATU statement SQL** berisi subquery `jsonb_build_object`/`jsonb_agg` (total, per tahun, per bulan, per GI, CE, trafo, gangguan terakhir, meta) | terima objek jadi, render KPI + peta |
| `/asset-maps` | agregasi per GI di SQL (koordinat valid, breakdown kategori, trafo terdampak) | layer peta + panel |

Semua `page.tsx` memakai `export const dynamic = "force-dynamic"` — data
selalu fresh dari DB, tanpa cache build.

⚠ **Aturan keras:** jangan pecah query halaman menjadi banyak `Promise.all`
(>2). Sejarahnya di [ADR-3](./13-KEPUTUSAN-TEKNIS.md) — 8 query paralel pernah
bikin pool rebutan + hasil tertukar di dev. `Promise.all` 2 query (data +
refresh_log) masih oke.

## API Routes

### `POST /api/refresh`
Proxy tipis ke EF `hargi-refresh`. Kenapa proxy: key Supabase tetap di env
server — browser tidak pernah memegang credential. `maxDuration = 60`.
Response diteruskan apa adanya (JSON `{ok, ...}` dari EF).

### `GET /api/ping-db`
`select 1` lewat pool yang sama dengan halaman → `{ok:true, ms:<latency>}`.
Alat diagnosis nomor satu: kalau ping ikut lambat/macet = masalah
pool/jaringan; kalau ping cepat tapi halaman lambat = masalah kode halaman.

## Agregasi client-side (`lib/aggregate.ts`)

- `ceFilterRows` / `ceAggregate`: filter UPT/SubBidang/Level/KondisiAkhir →
  hitung stats (total/open/close/progres), distribusi per level/sub-bidang/
  UPT/uraian, ringkasan per level & UPT (breakdown VG/G/F/P/C).
- `ggnFilterRows` / `ggnAggregate`: filter Bulan/Tahun/Unit/Kategori →
  byKategori, byUnitKategori, trend per tahun-bulan, YoY.
- `monthIndex(bulan)`: peta nama bulan **English & Indonesia** → angka 1–12
  (kunci kenapa dashboard tahan dua bahasa bulan).
