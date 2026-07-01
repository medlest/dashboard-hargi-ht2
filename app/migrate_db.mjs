import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.DB_URL || process.env.SUPABASE_DB_URL);

async function run() {
  console.log("Dropping old table...");
  await sql`DROP TABLE IF EXISTS hargi_ht2.asesment_bushing`;

  console.log("Creating new table...");
  await sql`
    CREATE TABLE hargi_ht2.asesment_bushing (
      id SERIAL PRIMARY KEY,
      no VARCHAR,
      nama_upt VARCHAR,
      gardu_induk VARCHAR,
      bay_penghantar VARCHAR,
      merk VARCHAR,
      tipe VARCHAR,
      tgl_oprs VARCHAR,
      thn_buat VARCHAR,
      usia VARCHAR,
      fasa VARCHAR,
      merk_bushing VARCHAR,
      type_bushing VARCHAR,
      no_seri VARCHAR,
      jenis_bushing VARCHAR,
      level_minyak VARCHAR,
      hasil_thermovisi VARCHAR,
      kondisi_fisik VARCHAR,
      nilai_tadel VARCHAR,
      hasil_uji_tandel VARCHAR,
      kondisi_center_tap VARCHAR,
      keterangan VARCHAR
    )
  `;
  
  console.log("Table created successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
