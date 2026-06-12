# Audit Baseline — DASAR APLIKASI (Dashboard HarGi HT-2)

> Audit 2026-06-12. Sumber: `/home/server-01/Downloads/DASAR APLIKASI.rar` (punya teman user),
> di-extract ke `DASAR APLIKASI/`. Tujuan: inventaris LENGKAP fitur FE UI/UX sebelum rebuild
> ke stack Vercel + Supabase. **JANGAN ada fitur yang kebuang.**

---

## 1. Arsitektur Baseline

```
Google Sheets (2 sheet, public CSV export, tanpa auth)
   │
   ├─ Sheet CE ABO   : 1-eC0GdeMwYDhnGzCSM8viO0HvD6X0NdlMaWOxe2P9ZM gid=299154811
   │                   "Common Enemy Next Level 2026" — 788 temuan HARGI, 8 UPT (UIT JBT)
   └─ Sheet Pareto   : 1hf_lpXI6x3hBDfEHX8r8q15w6F3wtlzIABGibdpCMhg gid=1882488493
                       "Gangguan Trafo" — 286 baris, 2021+, 67 kolom
   ↓ fetch CSV tiap request (cache-bust ?t=timestamp)
FastAPI + pandas (port 8000)          ← logic agregasi
   ↓ JSON
Angular 21 + Chart.js 4 + chartjs-plugin-datalabels (port 4200)
```

⚠ **Gotcha versi RAR ini:**
- `main.py` korup (indentation error baris 110-141) → udah difix di copy kita.
- Endpoint `/api/pareto/gangguan` = **placeholder kosong** — logic asli hilang.
  Kontrak respons kebaca dari FE (lihat §4), sheet accessible → bisa direkonstruksi.
- Halaman Dashboard + Equipment pakai endpoint `/api/equipment*` yang **tidak ada**
  di backend versi ini (cuma `mock_data.py` sisa) → 2 halaman ini efektif mati.

---

## 2. Identitas & Theme (WAJIB DIPERTAHANKAN RASANYA)

```
Brand        : "HarGi HT-2" + ikon ⚡ animasi shiny-bolt (glow kuning, pulse 2s)
Layout       : Sidebar kiri fixed 260px + top bar judul + content scroll
Mode         : Dark navy theme
Font         : Inter

Token warna:
  --bg-color       #0a192f   (navy gelap)
  --sidebar/card   #112240
  --text-primary   #ccd6f6
  --text-secondary #8892b0
  --primary        #4f46e5 (indigo) / --secondary #818cf8
  glass border     rgba(255,255,255,0.1), shadow lembut

Warna kondisi (semantic, konsisten di SEMUA chart):
  1-Very Good #3b82f6 (biru)    2-Good #10b981 (hijau)
  3-Fair      #fbbf24 (kuning)  4-Poor #f87171 (merah muda)
  5-Critical  #991b1b (merah tua)  N/A #475569
```

## 3. Navigasi (4 menu sidebar)

| Route | Menu | Status baseline |
|---|---|---|
| `/pareto` (default redirect) | 📈 Trend Gangguan Trafo | FE lengkap, backend placeholder |
| `/ce-abo` | 📋 Common Enemy Next Level 2026 | **FULL WORKING** |
| `/dashboard` | 📊 Monitoring CE Next Level 2026 | mati (endpoint equipment gak ada) |
| `/equipment` + `/equipment/:id` | ⚙️ Equipment | mati (mock data only) |

---

## 4. Inventaris Fitur per Halaman

### 4a. CE ABO Dashboard (`/ce-abo`) — halaman utama

**Header:**
- Judul "MONITORING CE ABO 2026"
- 🕐 Jam realtime bahasa Indonesia, update per detik ("Kamis, 12 Juni 2026 | 16:32:27")
- Label sumber + jam last update data
- Link 📂 langsung ke spreadsheet sumber (new tab)

**Filter bar (4 dropdown multi-select custom):**
- UPT (8) / Sub Bidang / Level Anomali (3: MV Apparatus, Switch Yard, Trafo) / Kondisi Akhir (5 level)
- Tiap dropdown: checkbox per item + opsi "Semua" (toggle all), label dinamis
  ("Semua" / nama item / "N Terpilih"), close on click-outside
- Filter change → langsung re-fetch (server-side filtering)
- Tombol 🔄 Refresh (disabled + teks "Loading..." saat fetch)

**Behavior background:**
- Auto-refresh data tiap 5 menit
- Stats CLOSED = Kondisi Akhir 1-/2- (VG/G), OPEN = 3-/4-/5- (F/P/C)

**Konten (urutan vertikal):**
1. 4 stat card (2×2): Total Temuan / OPEN (merah) / CLOSE (hijau) / Progres % + progress bar
2. Pie chart "Persentase Kondisi Akhir" (datalabels: count + %)
3. Baris 3 chart:
   - Doughnut "Kondisi Terkini" (hoverOffset 15, label count+%)
   - Stacked bar "Distribusi Level Anomali" + tabel mini breakdown VG/G/F/P/C per level (kolom berwarna semantic) + footer total
   - Stacked bar "Kondisi Akhir per Sub Bidang"
4. Tabel "Ringkasan Kondisi Akhir per UPT" (VG/G vs F/P/C vs Total, sort by total desc)
5. Horizontal stacked bar "Grafik Kondisi Akhir per UPT" full-width
6. Horizontal bar "Distribusi per Uraian Anomali (Top 15)" (value labels di ujung)
7. Stacked bar "Rincian Uraian Masalah per Level Anomali" (15 warna palette, legend bottom)
8. Tabel "Rincian Data CE Next Level 2026" — top 100 baris, badge: Kode (tag),
   Kondisi Terkini (badge warna per kondisi), Status (badge OPEN merah)

**Detail chart UX:** datalabels putih bold hanya tampil kalau value > 0; legend kecil
(font 9-10); sort kondisi selalu 5→1 (Critical dulu); grid line subtle putih 5%.

### 4b. Pareto / Trend Gangguan Trafo (`/pareto`)

**Header:** judul + jam realtime + link sumber + last update (sama pattern CE ABO).

**Filter:** Bulan / Tahun / Unit / Kategori (multi-select sama pattern), bulan auto-sort
kronologis (support ID+EN, case-insensitive). Total count badge di samping tombol.

**📺 MODE PRESENTASI (fitur khas, WAJIB KEEP):**
- Tombol → requestFullscreen + state slide (3 slide):
  1. Pie "Grafik Kategori Penyebab Gangguan"
  2. Stacked bar horizontal "Gangguan Per Unit"
  3. Trend Bulanan + Trend YoY berdampingan
- Kontrol floating: "Slide N / 3", ⬅️ Prev / ❌ Keluar / Next ➡️, sync exit fullscreen (Esc)

**Charts:**
1. Pie kategori penyebab (count + % datalabels)
2. Horizontal stacked bar per unit: sort by total desc, **dataset transparan ekstra untuk
   label TOTAL di ujung bar** (trick), tooltip filter, suggestedMax 1.2×
3. Line "Trend Gangguan Bulanan": 1 garis per tahun, 12 bulan x-axis, warna per tahun,
   datalabels di atas titik (hanya >0)
4. Line "Trend YoY": garis TOTAL putih tebal (border 6, point besar, label berlatar hitam)
   + garis per kategori (border 2), x-axis = tahun
5. Tabel "Rincian Data Gangguan" (Unit/Tahun/Bulan/Kategori) + empty state
6. Error state card (⚠️ + pesan) + empty state ("Tidak ada data untuk filter")

**Color assignment deterministik:** kategori 'ALAT' selalu warna pertama (biru),
sisanya alfabetis dari palette 10 warna — konsisten antar chart pie/bar/line.

**Kontrak respons yang FE harapkan** (untuk rekonstruksi logic):
```
{ pareto_data: [{kategory, count}],
  unit_data:   [{unit, kategory, count}],
  trend_data:  [{Bulan, Tahun, kategory, count}],
  detail_data: [{unit, tahun, bulan, kategory}],
  filters: {bulan[], tahun[], unit[], kategory[]},
  last_updated }
Kolom sheet relevan: Unit, Tahun, Bulan, "Kategori x" (+filter TROF dari kolom 4T?)
```

### 4c. Dashboard Monitoring (`/dashboard`) — semi-mati

- 3 stat card: Peralatan Baik ✔️ / Waspada ⚠️ / Kritis 🚨
- **Gauge setengah lingkaran** "Rata-rata Health Index" (rotasi CSS, warna dinamis)
- Card shortcut ke /pareto
- List "Peralatan Terbaru" (badge status + health % berwarna)
- **Upload Data Master (.xlsx)** via tombol 📁 → POST multipart (fitur input data!)

### 4d. Equipment List + Detail (`/equipment`, `/equipment/:id`) — mati (mock)

- Tabel: ID, Nama, Tipe, Health Index (progress bar berwarna), Status badge,
  Pemeliharaan Terakhir, tombol Detail
- Detail: profile card (status, health %, last maintenance) + "Riwayat Health Index"
  (bar horizontal per tanggal)

---

## 5. Kolom Data Sheet CE ABO (20 kolom dipakai)

```
Kode, Sub Bidang, Level Anomali, Uraian, Hartrans, UPT, ULTG, Gardu Induk,
Nama Ruas / Bay, Nama Tower / Span / Sirkit / Alat, Kondisi Terkini, Kondisi Awal,
TGL RENCANA TINJUT, TGL REALISASI TINJUT, Kondisi Akhir, Jml, Kode Awal,
Kode Terkini, Status Awal, Status Terkini
```
Filter backend: `Sub Bidang` contains HARGI + `Status Terkini` ∈ {OPEN, CLOSE}.
Kolom dideteksi fuzzy by-name (robust terhadap pergeseran kolom).

## 6. Rencana Adaptasi (Vercel + Supabase, pattern YGGDRASIL)

```
Google Sheet (share ke SA / CSV) ──┐
                                   │  tombol 🔄 Refresh → API route /api/refresh
                                   ▼
Next.js 16 + React 19 + Tailwind 4 (1 repo baru, 1 project Vercel baru, URL sendiri)
   ├─ agregasi server-side TS (ganti pandas, logic = §4 kontrak)
   ├─ chart: Recharts ATAU chart.js (datalabels-heavy → pertimbangkan chart.js react wrapper)
   └─ (opsional fase 2) snapshot ke Supabase biar gak fetch sheet tiap load
```

Keputusan menyusul bareng user: nama project Vercel, halaman Equipment/Dashboard
(mati di baseline) mau dihidupkan atau di-drop, dan sheet final dari user.

## 7. Cara Run Baseline (dev, PC server-01)

```bash
# Backend (venv udah di-setup, main.py udah difix)
cd "DASAR APLIKASI/backend" && .venv/bin/python -m uvicorn main:app --port 8000
# Frontend (node_modules udah ditambal @rollup/rollup-linux-x64-gnu)
cd "DASAR APLIKASI/frontend" && ./node_modules/.bin/ng serve --host 0.0.0.0 --port 4200
# Akses LAN: http://192.168.1.8:4200
```
