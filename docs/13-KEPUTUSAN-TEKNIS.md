# 13 · Keputusan Teknis (ADR)

> [← Index](./00-INDEX.md)
> Keputusan penting + alasannya. Semua punya sejarah nyata — **jangan diulang
> debat / di-revert tanpa membaca ini.**

---

## ADR-1 · Next.js dipin EXACT `16.2.4`

**Keputusan:** `"next": "16.2.4"` tanpa caret di `package.json`.

**Alasan:** regression resmi `vercel/next.js#93905` — pada versi ≥16.2.6,
back-navigation (bfcache) membekukan JavaScript halaman, kena di dev DAN
production. Tambahan: 16.2.9 + Turbopack reload-loop tak berhenti di Firefox.
Keduanya direproduksi empiris 2026-06-12 (16.2.4 lulus tes back-nav).

**Konsekuensi:** sebelum upgrade, cek issue tersebut sudah closed dan tes
back-navigation manual.

---

## ADR-2 · Pool DB di-harden + cancel-on-timeout

**Keputusan:** `idle_timeout: 20`, `keep_alive: 30`, `max_lifetime: 15mnt`,
plus wrapper cancel-on-timeout 15 dtk untuk setiap query (`lib/db.ts`).

**Alasan:** insiden 2026-06-12 — koneksi pooler mati-setengah karena network
flap; postgres.js tanpa query timeout → seluruh pool macet permanen → semua
halaman "transferring" selamanya. Detail forensik di
[06-KONEKSI-DATABASE](./06-KONEKSI-DATABASE.md).

**Konsekuensi:** jangan menaikkan `idle_timeout` demi "keep warm"; query
macet kini gagal jelas (kode 57014) dalam ≤15 dtk, bukan hang.

---

## ADR-3 · Satu statement SQL untuk halaman ber-agregat banyak

**Keputusan:** halaman Overview memakai SATU statement berisi subquery
`jsonb_build_object`/`jsonb_agg`. `Promise.all` dibatasi maksimal 2 query.

**Alasan:** versi awal Overview menembak 8 query paralel → rebutan pool
(max 4) dan pernah menghasilkan baris tertukar di dev (`gardu` undefined →
error Suspense). Satu round-trip = satu koneksi = tidak mungkin tertukar,
sekaligus lebih cepat.

---

## ADR-4 · Metadata sheet diambil EF saat sync, BUKAN saat render

**Keputusan:** judul + modifiedTime sheet disimpan EF ke `refresh_log`;
halaman hanya membaca DB.

**Alasan:** percobaan mengambil metadata Google di jalur render Next membuat
halaman 30+ detik (panggilan eksternal di SSR). Prinsip umum yang diturunkan:
**render tidak pernah menyentuh Google** ([01-ARSITEKTUR](./01-ARSITEKTUR.md)).

---

## ADR-5 · gviz query API, bukan CSV export penuh

**Keputusan:** EF membaca sheet lewat gviz query (filter di sisi Google).

**Alasan:** CSV penuh CE ABO = 28,7 MB/138K baris → EF mati
(`WORKER_RESOURCE_LIMIT`). Dengan gviz: ±186 KB. Detail di
[03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md).

---

## ADR-6 · Agregasi laporan di level UPT

**Keputusan:** deck & ringkasan eksekutif diagregasi per **UPT**; per-GI hanya
untuk identitas detail (tabel, asset maps).

**Alasan:** struktur organisasi — Hartrans 2 (UIT JBT) berkoordinasi ke UPT,
tidak sampai GI; GI adalah aset ULTG. Ranking per GI tidak actionable untuk
audiens dashboard ini.

---

## ADR-7 · Tier data FLAT (truncate-and-load) untuk sync

**Keputusan:** setiap refresh = DELETE semua + INSERT ulang dalam satu
transaksi + advisory lock.

**Alasan:** data sumber tidak punya primary key natural stabil, ukuran kecil
(≤1000 baris), dan sumber kebenaran tetap sheet. Atomik & tidak mungkin
setengah-update. UPSERT incremental = kompleksitas tanpa manfaat di kasus ini.

---

## ADR-8 · Anotasi slide deck = fakta terhitung, bukan narasi

**Keputusan:** strip "Catatan Data" di slide hanya berisi kalimat yang
angkanya DIHITUNG dari data terfilter.

**Alasan:** permintaan owner — anotasi harus bisa dipertanggungjawabkan di
forum; tidak boleh ada opini/interpretasi otomatis yang bisa salah.

---

## ADR-9 · Bulan dua bahasa (English + Indonesia)

**Keputusan:** semua pencocokan nama bulan menerima kedua bahasa
(`monthIndex()` di JS, array ganda di SQL).

**Alasan:** sheet sumber ternyata memakai English ("June") padahal asumsi
awal Indonesia ("JUNI") — sempat membuat angka peta 0 padahal KPI 1.
Dua bahasa = tahan kalau format sheet berubah lagi.

---

## ADR-10 · Theme switch peta = setStyle manual (bukan prop)

**Keputusan:** di hero map, ganti dark/light dilakukan manual:
lepas terrain → `map.setStyle()` → pasang terrain lagi di `style.load`.

**Alasan:** mengganti lewat prop `mapStyle` react-map-gl saat terrain aktif
membuat maplibre crash (`terrainDepth` membaca DEM source yang sudah hilang
di tengah pergantian style).
