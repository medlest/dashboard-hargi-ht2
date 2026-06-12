# 08 · Halaman per Halaman

> [← Index](./00-INDEX.md) · Terkait: [05-APLIKASI-NEXT](./05-APLIKASI-NEXT.md) ·
> [07-FRONTEND-VISUAL](./07-FRONTEND-VISUAL.md)

Semua halaman punya header sama: judul + kanan-atas `[Jam realtime]
[🔄 Refresh Data] [Toggle theme]` + baris
`Sumber: {judul sheet} · Update per {tanggal}` (link ke sheet asli).

---

## `/` — Overview (welcome page, SATU layar penuh)

**Server:** 1 statement SQL (subquery jsonb) → total gangguan, per tahun,
per bulan, agregat GI, CE, trafo terdampak, gangguan terakhir (+ lookup ULTG
dari tabel CE), metadata sheet.

**Hero peta 3D** (`hero-map.tsx`) — tour sinematik **5 scene loop**:

| # | Scene | Durasi | Kamera & data |
|---|---|---|---|
| 1 | Intro | 8 dtk | sweep rotasi 30° → settle PERSIS di posisi kalibrasi owner (`109.109, -7.221, Z6.6, P51°, B-14°`) |
| 2 | Top GI | 5 dtk | flyTo GI gangguan terbanyak + ring highlight + angka |
| 3 | Top UPT | 5 dtk | fitBounds wilayah UPT paling terganggu — hanya titik UPT itu |
| 4 | Tahun berjalan | 5 dtk | titik di-filter & di-skala ulang pakai gangguan tahun ini |
| 5 | Bulan berjalan | 5 dtk | sama untuk bulan ini → kembali ke scene 1 |

Interaksi: **klik peta = lompat scene berikutnya**; drag/zoom = tour pause,
idle 4 dtk = lanjut. Caption animated (judul scene + angka faktual + dot
progress) nempel di bawah chip metric kamera (X/Y/Z/P/B/S, kanan-atas).
Komposisi condong ke kanan (camera padding kiri 360px — teks hero di kiri).
Scroll-zoom mati (tidak merebut scroll halaman), attribution disembunyikan.
Angka caption tahun/bulan memakai **total resmi** (semua baris), bukan hanya
titik berkoordinat — konsisten dengan KPI.

**KPI strip** (4 kartu, pola angka-di-atas-label):

1. `Total Gangguan Trafo` — total · tahun berjalan · bulan berjalan
2. `Temuan CE 2026` — temuan · open · close · progres%
3. `Terdampak Gangguan` — GI · trafo · GI tahun ini · GI bulan ini
4. `Gangguan Terakhir · {tgl}` — UPT · ULTG · GI · Bay (baris gangguan
   terbaru; ULTG hasil lookup silang)

Plus 3 tombol CTA (ke /pareto, /ce-abo, /asset-maps) dan 2 baris link sumber
per sheet.

---

## `/pareto` — Trend Gangguan Trafo

- Filter: Bulan · Tahun · Unit · Kategori (multi-select, client-side instan).
- Chart: ranked bar **Kategori Penyebab** · stacked bar **Gangguan per Unit**
  (+label total) · line **Trend Bulanan** (seri per tahun) · line **YoY**
  (total bold + per kategori) · tabel rincian.
- **Slide Deck 8 slide**: Cover (info tahun/bulan berjalan) → Tahun Berjalan
  (bar per bulan) → Trend per UPT (line per bulan per UPT + TOTAL bold) →
  Kejadian Tahun Berjalan (tabel semua kejadian tahun ini, baris bulan
  berjalan disorot amber + badge "bulan ini") → Kategori → Per Unit →
  Trend Bulanan → YoY.

---

## `/ce-abo` — CE Next Level 2026

- **HeroCE**: panel TOTAL + panel per Level Anomali (Switch Yard/MV/Trafo),
  klik panel = filter level (dua arah dengan dropdown filter).
- Filter: UPT · Sub Bidang · Level Anomali · Kondisi Akhir.
- Chart: donut **Kondisi Akhir** · donut **Kondisi Terkini** + tabel mini
  per level · grouped **Level**/**Sub Bidang**/**per UPT** · hbar **Top-15
  Uraian** · grouped **Uraian × Level** · tabel ringkasan per UPT (breakdown
  VG/G/F/P/C) · tabel rincian 100 baris.
- **Slide Deck 11 slide**: Cover → Kondisi Akhir (+tabel level) → Kondisi
  Terkini → Level → Sub Bidang → Per UPT → Top Uraian → Uraian×Level →
  **Progres per UPT** (tabel ranking % selesai + bar) → **Fokus Pengerjaan**
  (hbar uraian terbanyak yang MASIH open — "kerjakan ini dulu") →
  **Daftar Prioritas** (tabel Critical & Poor open, Critical didahulukan).

> Sesuai struktur organisasi, agregat deck dibuat per **UPT** (bukan per GI)
> — lihat [ADR-6](./13-KEPUTUSAN-TEKNIS.md).

---

## `/asset-maps` — Peta Sebaran GI (full page)

- Marker GI: ukuran & warna ∝ jumlah gangguan (atau warna per-UPT, bisa
  dipilih); GI terbanyak digambar paling atas; label angka + nama (zoom ≥8.5).
- Panel kiri: judul + stats (GI/gangguan/trafo/max) + grup layer (marker,
  label, ranking) + mode warna + filter Unit (checklist).
- Rail kontrol kiri-bawah: pilih basemap (dark/light/satellite/OSM), zoom,
  kompas/reset view, **3D terrain**, **globe**, fullscreen. Chip CameraInfo
  X/Y/Z/P/B/S (collapsible).
- Klik GI / item ranking → kartu detail: jumlah gangguan, trafo terdampak,
  share UIT, breakdown kategori (bar), chip daftar trafo + flyTo.
- Panel kanan: **Ranking GI** by jumlah gangguan (klik → fokus).
- Style map auto-ikut theme aplikasi; pilihan manual = override.
- Behaviour kamera: intro flyTo ke `HOME_VIEW` hasil kalibrasi owner;
  Reset View = kembali ke kondisi default (3D/globe dimatikan dulu).
