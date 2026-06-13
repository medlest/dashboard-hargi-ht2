-- 01_refresh_log_abo_meta.sql
-- Menambahkan kolom metadata untuk ABO 2026 di tabel refresh_log

ALTER TABLE hargi_ht2.refresh_log 
ADD COLUMN IF NOT EXISTS sheet_modified_abo timestamptz,
ADD COLUMN IF NOT EXISTS sheet_name_abo text;

COMMENT ON COLUMN hargi_ht2.refresh_log.sheet_modified_abo IS 'Drive modifiedTime untuk sheet ABO 2026';
COMMENT ON COLUMN hargi_ht2.refresh_log.sheet_name_abo IS 'Judul spreadsheet ABO 2026';
