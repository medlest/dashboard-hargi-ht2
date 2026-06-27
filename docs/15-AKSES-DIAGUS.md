# 15 · Akses Database Diagus

> Dokumen untuk agent/dev di laptop Diagus. Jangan tulis password di file ini.

## Ringkas

Role database untuk Diagus:

```text
ht2_diagus
```

Scope role:

```text
Supabase project : mjgekmjnsipthcswazid
Database         : postgres
Schema kerja     : hargi_ht2
```

Hak akses:

```text
hargi_ht2:
  SELECT, INSERT, UPDATE, DELETE
  CREATE TABLE
  ALTER TABLE
  DROP TABLE
  USAGE/CREATE schema
  sequence privileges

public:
  SELECT metadata extension bawaan saja
  tidak bisa CREATE/INSERT/UPDATE/DELETE/ALTER/DROP

schema lain:
  tidak untuk kerja dashboard
  data/DDL ditolak
```

## Connection String

Pakai Supabase transaction pooler:

```text
postgresql://ht2_diagus.mjgekmjnsipthcswazid:<PASSWORD>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

Catatan:

- `<PASSWORD>` diberikan owner lewat jalur privat.
- Jangan commit `.env.local`.
- Jangan pakai role `postgres`, `service_role`, atau password owner.
- Driver harus `prepare=false` kalau memakai transaction pooler.

Contoh env lokal:

```bash
DB_URL="postgresql://ht2_diagus.mjgekmjnsipthcswazid:<PASSWORD>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
SUPABASE_URL="https://mjgekmjnsipthcswazid.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
```

## Cara Kerja Role

Postgres role adalah identitas database. Kalau role punya `LOGIN`, role bisa
dipakai sebagai user koneksi dengan password.

Format username Supabase pooler:

```text
<role>.<project-ref>
```

Jadi role `ht2_diagus` dipakai sebagai:

```text
ht2_diagus.mjgekmjnsipthcswazid
```

Password menempel ke role itu. Aplikasi atau agent tidak "membawa role" secara
terpisah; role dipilih dari username di connection string.

## Aturan Kerja

- Semua query dashboard tulis eksplisit `hargi_ht2.<nama_tabel>`.
- Jangan buat object di `public`.
- Jangan baca/ubah schema lain.
- Kalau tambah tabel baru di `hargi_ht2`, enable RLS dan buat policy:

```sql
alter table hargi_ht2.<nama_tabel> enable row level security;

create policy ht2_diagus_all on hargi_ht2.<nama_tabel>
  for all to ht2_diagus
  using (true)
  with check (true);
```

## Verification Terakhir

Status terakhir: diverifikasi ulang pada 2026-06-27 setelah cleanup policy.

Policy final di schema `hargi_ht2`:

```text
abo_2026           ht2_diagus_all FOR ALL TO ht2_diagus
asesment_bushing   ht2_diagus_all FOR ALL TO ht2_diagus
ce_abo_findings    ht2_diagus_all FOR ALL TO ht2_diagus
gangguan_trafo     ht2_diagus_all FOR ALL TO ht2_diagus
refresh_log        ht2_diagus_all FOR ALL TO ht2_diagus
```

Sudah dites sebagai `ht2_diagus`:

```text
PASS: SELECT hargi_ht2.ce_abo_findings
PASS: CREATE TABLE hargi_ht2.__test
PASS: INSERT/UPDATE/DELETE hargi_ht2.__test
PASS: ALTER TABLE hargi_ht2.__test
PASS: DROP TABLE hargi_ht2.__test
PASS: SELECT public metadata extension
PASS: public CREATE TABLE ditolak
PASS: public INSERT ditolak
PASS: public ALTER ditolak
PASS: auth.users SELECT ditolak
PASS: CREATE SCHEMA ditolak
```

Supabase Advisor sempat menandai policy SELECT dobel di `hargi_ht2`
(`ht2_app_write` + `ht2_reader_select`). Sudah dibersihkan: sekarang tiap
tabel HT-2 memakai satu policy `ht2_diagus_all` saja.

## Rujukan Resmi

- Supabase Database Roles: https://supabase.com/docs/guides/database/postgres/roles
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- PostgreSQL Roles: https://www.postgresql.org/docs/current/user-manag.html
- PostgreSQL Privileges: https://www.postgresql.org/docs/current/ddl-priv.html
