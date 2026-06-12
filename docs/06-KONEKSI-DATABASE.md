# 06 · Koneksi Database — `app/src/lib/db.ts`

> [← Index](./00-INDEX.md) · Terkait: [04-DATABASE](./04-DATABASE.md) ·
> [12-OPERASIONAL](./12-OPERASIONAL.md) · [13-KEPUTUSAN-TEKNIS](./13-KEPUTUSAN-TEKNIS.md)

Driver: **postgres.js** (`npm:postgres`). Koneksi ke Supabase lewat
**transaction pooler** (host `*.pooler.supabase.com`, port **6543**) —
bukan koneksi direct 5432.

## Konfigurasi (dan alasan tiap angka)

```ts
postgres(process.env.DB_URL!, {
  ssl: "require",
  max: 4,            // pool kecil — cukup utk traffic dashboard, ramah pooler
  prepare: false,    // WAJIB utk transaction pooler (pgbouncer-style)
  idle_timeout: 20,  // koneksi idle ditutup 20 dtk — JANGAN dinaikkan (lihat insiden)
  keep_alive: 30,    // TCP keepalive — deteksi socket mati
  max_lifetime: 60 * 15, // recycle koneksi tiap 15 menit
  connect_timeout: 10,
})
```

Plus dua mekanisme tambahan:

1. **Singleton via `globalThis`** (non-production) — hot-reload dev tidak
   membuat pool baru terus-menerus.
2. **Cancel-on-timeout 15 detik** — Proxy membungkus setiap `` sql`...` ``:
   query yang menggantung > 15 dtk dipanggil `query.cancel()` → query reject
   dengan error Postgres `57014` dan **slot pool langsung bebas**.

## Insiden yang melatarbelakangi (2026-06-12) — wajib paham

**Gejala:** semua halaman stuck "transferring" selamanya (header HTTP 200
keluar, body tidak pernah selesai).

**Akar masalah:** network flap di jalur ISP → AWS Singapore membuat koneksi
pooler **mati setengah**: socket masih `ESTAB` (kernel menganggap hidup),
tapi query tidak pernah dijawab — backend DB malah idle. postgres.js **tidak
punya query timeout bawaan**, jadi 1 flap = 4 koneksi pool macet permanen =
seluruh aplikasi mati sampai proses di-restart.

**Bukti diagnosis waktu itu:** `psql` selalu lancar (koneksi baru per
perintah), `select 1` lewat pool aplikasi macet 10/10, `ss -tnp` menunjukkan
socket ESTAB dengan Send-Q 0, `pg_stat_activity` kosong.

**Solusi terpasang (jangan dicabut):**

| Mekanisme | Mencegah apa |
|---|---|
| `idle_timeout: 20` | koneksi tidak nganggur cukup lama untuk di-drop diam-diam |
| `keep_alive: 30` | OS mendeteksi socket mati |
| `max_lifetime: 15mnt` | koneksi tua di-recycle |
| **cancel-on-timeout 15 dtk** | kalaupun tetap kena, kerusakan dibatasi: error jelas + pool pulih sendiri (bukan hang selamanya) |

⚠ **JANGAN menaikkan `idle_timeout` demi "keep warm"** — koneksi idle panjang
justru sumber masalahnya. Biaya reconnect ke pooler jauh lebih murah daripada
pool macet.

## Cara pakai di kode

```ts
import { sql } from "@/lib/db";
const rows = await sql`select ... from hargi_ht2.ce_abo_findings`;
```

- Tagged template = parameterized query otomatis (aman injection).
- **Jangan** memanggil `sql.end()` di kode halaman (pool dipakai bersama).
- Query gagal/timeout → biarkan error muncul (no silent fallback) — Next
  menampilkan error boundary, dan itu memang yang kita mau: masalah
  kelihatan, bukan disembunyikan.

## Diagnostik

```bash
curl https://<host>/api/ping-db     # {ok:true, ms:20-an} = pool sehat
```

| Hasil | Arti |
|---|---|
| `ms` < 100 stabil | pool & jaringan sehat |
| timeout / error 57014 | pool sempat macet → cancel bekerja; cek jaringan/Supabase |
| ping cepat tapi halaman lambat | masalah di kode halaman, bukan DB |

Lihat juga: [12-OPERASIONAL · Troubleshooting](./12-OPERASIONAL.md).
