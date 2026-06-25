-- 02_create_asesment_bushing.sql
-- Membuat tabel asesment_bushing untuk menyimpan data monitoring bushing trafo

CREATE TABLE IF NOT EXISTS hargi_ht2.asesment_bushing (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  techidentno text,
  nama_upt text,
  gardu_induk text,
  bay_penghantar text,
  merk text,
  tipe text,
  tgl_oprs text,
  usia text,
  thn_buat text,
  jenis_bushing_primer_r text,
  merk_primer_r text,
  type_primer_r text,
  sn_primer_r text,
  jenis_bushing_primer_s text,
  merk_primer_s text,
  type_primer_s text,
  sn_primer_s text,
  jenis_bushing_primer_t text,
  merk_primer_t text,
  type_primer_t text,
  sn_primer_t text,
  jenis_bushing_skunder_r text,
  merk_skunder_r text,
  type_skunder_r text,
  sn_skunder_r text,
  jenis_bushing_skunder_s text,
  merk_skunder_s text,
  type_skunder_s text,
  sn_skunder_s text,
  jenis_bushing_skunder_t text,
  merk_skunder_t text,
  type_skunder_t text,
  sn_skunder_t text,
  overall text,
  level_minyak text,
  hasil_thermovisi text,
  kondisi_fisik text,
  keterangan text,
  link_evidence text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE hargi_ht2.asesment_bushing ENABLE ROW LEVEL SECURITY;

-- Menambahkan kolom metadata untuk Asesment Bushing di tabel refresh_log
ALTER TABLE hargi_ht2.refresh_log 
ADD COLUMN IF NOT EXISTS sheet_modified_bushing timestamptz,
ADD COLUMN IF NOT EXISTS sheet_name_bushing text;

COMMENT ON COLUMN hargi_ht2.refresh_log.sheet_modified_bushing IS 'Drive modifiedTime untuk sheet Asesment Bushing';
COMMENT ON COLUMN hargi_ht2.refresh_log.sheet_name_bushing IS 'Judul spreadsheet Asesment Bushing';

-- Membuat policy RLS agar role ht2_app memiliki akses penuh (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'hargi_ht2' 
      AND tablename = 'asesment_bushing' 
      AND policyname = 'ht2_app_all'
  ) THEN
    CREATE POLICY ht2_app_all ON hargi_ht2.asesment_bushing
      FOR ALL TO ht2_app USING (true) WITH CHECK (true);
  END IF;
END
$$;
