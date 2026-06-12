# 07 · Frontend & Visual

> [← Index](./00-INDEX.md) · Terkait: [05-APLIKASI-NEXT](./05-APLIKASI-NEXT.md) ·
> [08-HALAMAN](./08-HALAMAN.md)

## Identitas visual

- Font: **Inter** (teks) + **JetBrains Mono** (semua angka — class `num`,
  `font-variant-numeric: tabular-nums` supaya angka rata).
- Theme **dark/light** (next-themes, default dark): backdrop foto Gardu Induk
  (`public/backgrounds/gi-{dark,light}.webp`) + veil gradient supaya konten
  terbaca; kartu efek glass (`.card` — blur + border + shadow).
- Aksen: **amber** = brand (ikon petir) dan penanda "periode berjalan";
  indigo = aksen interaktif/link.
- Token semua warna ada di `globals.css` sebagai CSS variables
  (`--surface`, `--ink`, `--ink-2`, `--ink-3`, `--edge`, `--amber`, dst.)
  lalu diekspos ke Tailwind via `@theme inline`. **Jangan hardcode warna**
  di komponen — pakai token.

⚠ Animasi reveal `.rise` memakai `animation-fill-mode: backwards`.
**JANGAN ganti ke `both`/`forwards`** — transform yang menempel setelah
animasi menciptakan stacking context → dropdown filter tertimpa kartu
(pernah kejadian, lihat [13-KEPUTUSAN-TEKNIS](./13-KEPUTUSAN-TEKNIS.md)).

## Standar chart (disepakati dengan owner — jangan diubah sepihak)

Semua builder option di `app/src/lib/echart-options.ts`; theme chart ikut
token via `useChartTheme()` (`components/echart.tsx`).

| Jenis | Aturan |
|---|---|
| Proporsi | **Donut** — label DI LUAR + leader line pendek (length 14/10), `minAngle: 7` (irisan kecil tetap kelihatan), SEMUA label tampil format `nilai (persen%)`, `labelLayout moveOverlap` anti-tumpuk |
| Stacked bar | Label segmen < **5% dari max axis** disembunyikan (anti-timpa); chart tertentu opt-out via `showAllLabels` |
| Grouped bar | dipakai saat semua angka harus terbaca (vertical/horizontal) |
| Line | label angka hanya di seri **bold/TOTAL**; warna tahun konsisten (`YEAR_COLORS`) |
| Tooltip | seri bernilai 0 disembunyikan (`axisTooltipNoZero`) |

Warna kondisi CE **semantik tetap** (`lib/colors.ts`):
`1-Very Good` biru `#3b82f6` · `2-Good` hijau `#10b981` · `3-Fair` kuning
`#fbbf24` · `4-Poor` merah muda `#f87171` · `5-Critical` merah tua `#b91c1c`.
Kategori gangguan: palette deterministik (`ALAT` selalu warna pertama, sisanya
alfabetis) → warna kategori sama di semua chart & sesi.

## Slide deck (`components/slide-deck.tsx`)

Dipakai `/pareto` (8 slide) & `/ce-abo` (11 slide), tombol **"Slide Deck"**
di bar filter.

- Fullscreen API + keyboard: `←`/`→`/`Space` navigasi, `Home`/`End`, `Esc` keluar.
- Chrome: progress bar amber di atas, dot navigator + label slide aktif,
  hint keyboard, footer brand.
- `DeckCover` — judul besar + stat cards; `DeckChartSlide` — chart (opsional
  panel samping); `DeckContentSlide` — konten bebas (tabel) dengan body
  scrollable.
- **Strip "Catatan Data"** di tiap slide: kalimat FAKTA yang dihitung dari
  data terfilter (helper `deckPct`, `DeckB`) — bukan opini/narasi. Contoh:
  "3 kategori teratas menyumbang 78,2% dari seluruh gangguan tercatat."
- Deck mengikuti **filter aktif** halaman — filter dulu, baru presentasi.

## Hero & komponen khusus

- **HeroCE** (`ce-abo/hero-ce.tsx`): panel TOTAL (grid golden-ratio 1.618fr)
  + panel per Level Anomali (SY/MV/TRF) — **klik panel = filter level**,
  panel aktif dapat ring + glow, lainnya redup. Angka hero mengabaikan filter
  level (supaya panel lain tetap terbaca) tapi mengikuti filter lain.
- **Primitif hero** (`components/hero-primitives.tsx`): `Caption` (garis +
  uppercase + chip), `BigStat`, `MultiSegBar` (bar proporsional multi-segmen
  dengan legend di dalam), `pctColor` (warna dinamis berdasar % progres).
- **Hero map Overview** → detail tour 5 scene di [08-HALAMAN](./08-HALAMAN.md).
- **KPI strip Overview**: pola "angka-di-atas-label" (komponen `KpiTri`),
  font menyesuaikan panjang teks otomatis (auto-fit, bukan truncate),
  kolom teks panjang dapat `flex-1`.

## Peta (MapLibre)

- Basemap raster: Carto dark/light @2x, ESRI satellite, OSM — definisi di
  `asset-maps/gi-map.tsx` (`MAP_STYLES`) dan `hero-map.tsx`.
- 3D: DEM terrarium (AWS elevation tiles) + hillshade + `setTerrain`
  exaggeration 1.3.
- ⚠ **Ganti style saat terrain aktif**: WAJIB lepas terrain dulu → `setStyle`
  → pasang lagi di event `style.load`. Mengganti lewat prop `mapStyle`
  react-map-gl saat terrain hidup membuat maplibre crash (`terrainDepth`).
- Layer titik GI: glow + ring + core, radius ∝ √(jumlah gangguan), urutan
  gambar `circle-sort-key` (yang terbanyak di atas).
