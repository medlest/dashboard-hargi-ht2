# 12 · Operasional & Troubleshooting

> [← Index](./00-INDEX.md) · Terkait: [03-SYNC-EDGE-FUNCTION](./03-SYNC-EDGE-FUNCTION.md) ·
> [06-KONEKSI-DATABASE](./06-KONEKSI-DATABASE.md) · [02-SUMBER-DATA](./02-SUMBER-DATA.md)

## Operasi rutin: refresh data

```
Edit data di Google Sheet → buka dashboard → tombol 🔄 Refresh Data
→ ±7 detik → semua halaman menampilkan data baru
→ header: "Update per {tanggal}" ikut berubah
```

- Refresh **manual by design** (tidak ada cron). Penjadwalan otomatis bisa
  ditambah belakangan (pg_cron → EF) kalau tim mau.
- Refresh aman ditekan kapan pun: transaksi atomik + advisory lock — tidak
  mungkin data setengah-jadi atau dobel-tulis.

## Audit

Semua percobaan sync tercatat di `hargi_ht2.refresh_log`
([04-DATABASE](./04-DATABASE.md)): status, jumlah baris, durasi, error,
judul + waktu edit sheet.

```sql
select id, status, row_count, started_at, finished_at, error
from hargi_ht2.refresh_log order by id desc limit 10;
```

## Troubleshooting

### Refresh gagal (toast error / status `error` di log)

1. Baca `refresh_log.error` — pesan dibuat eksplisit (mis. header kolom yang
   tidak ketemu).
2. Cek log EF: Supabase Dashboard → Edge Functions → `hargi-refresh` → Logs.
3. Penyebab umum: sheet diganti struktur drastis (nama header berubah),
   sheet di-private (HTTP 401/redirect dari Google), gangguan jaringan.
4. **Data lama selalu utuh** saat refresh gagal — tidak perlu panik.

### Halaman lambat / "transferring" tidak selesai

1. `curl https://<host>/api/ping-db`
   - `{ok:true, ms:<100}` → DB sehat, masalah di tempat lain.
   - timeout/error → pool/jaringan; di dev: restart dev server. Mekanisme
     cancel-on-timeout akan memulihkan pool sendiri dalam ≤15 dtk
     ([06-KONEKSI-DATABASE](./06-KONEKSI-DATABASE.md)).
2. Di dev: bedakan dengan compile pertama route (lihat
   [11-DEV-LOKAL](./11-DEV-LOKAL.md)) — itu bukan hang.

### Angka "aneh" / chart kosong

Hampir selalu kualitas baris di sheet sumber — bukan bug dashboard:

| Gejala | Akar | Solusi |
|---|---|---|
| Chart kategori kosong saat difilter sempit | baris yang lolos filter kategorinya kosong | isi kolom Kategori di sheet → Refresh |
| Titik GI tidak muncul di peta | koordinat kosong/non-numerik | isi Latitude/Longitude → Refresh |
| Jumlah GI di peta ≠ jumlah GI di KPI | KPI menghitung SEMUA baris, peta hanya yang berkoordinat | by design — lengkapi koordinat kalau mau sama |
| Bulan tidak ke-filter | nama bulan tidak standar | pakai nama English/Indonesia penuh |

### Deploy production bermasalah

- Cek build log di Vercel (Deployments → klik deploy yang gagal).
- Rollback: Vercel → Deployments → deploy sehat sebelumnya → "Promote to
  Production" (instan, tanpa build ulang).

## Kontak tanggung jawab

| Area | Siapa |
|---|---|
| Isi & kualitas data sheet | tim pemilik sheet |
| Dashboard, EF, infra | owner repo (+ kolaborator) |
| Akses Supabase/Vercel | owner |
