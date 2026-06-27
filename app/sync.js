/* eslint-disable @typescript-eslint/no-require-imports */
const postgres = require("postgres");
const Papa = require("papaparse");

if (!process.env.DB_URL) {
  console.error("DB_URL env wajib di-set sebelum menjalankan sync helper ini.");
  process.exit(1);
}

const sql = postgres(process.env.DB_URL, { ssl: "require", prepare: false, max: 1 });
const clean = (v) => String(v ?? "").replace(/\xa0/g, " ").trim();

async function run() {
  let logId = null;

  console.log("Fetching Asesment Bushing data...");
  const res = await fetch("https://docs.google.com/spreadsheets/d/1HS08VH-CURCJiqjDqhCd1z1VFWbnykA89IrlJaAm9BA/export?format=csv&gid=706438307");
  if (!res.ok) throw new Error(`Fetch sheet gagal: HTTP ${res.status}`);

  const text = await res.text();
  
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  const rows = parsed.data;
  
  if (rows.length <= 2) {
    console.log("No data found.");
    return;
  }
  
  const dataRows = rows.slice(2);
  const bushing = dataRows
    .filter((r) => r.length >= 35 && clean(r[1]) !== "" && clean(r[1]).toUpperCase() !== "NAMAUPT")
    .map((r) => ({
        techidentno: clean(r[0]),
        nama_upt: clean(r[1]),
        gardu_induk: clean(r[2]),
        bay_penghantar: clean(r[3]),
        merk: clean(r[4]),
        tipe: clean(r[5]),
        tgl_oprs: clean(r[6]),
        usia: clean(r[7]),
        thn_buat: clean(r[8]),
        jenis_bushing_primer_r: clean(r[9]),
        merk_primer_r: clean(r[10]),
        type_primer_r: clean(r[11]),
        sn_primer_r: clean(r[12]),
        jenis_bushing_primer_s: clean(r[13]),
        merk_primer_s: clean(r[14]),
        type_primer_s: clean(r[15]),
        sn_primer_s: clean(r[16]),
        jenis_bushing_primer_t: clean(r[17]),
        merk_primer_t: clean(r[18]),
        type_primer_t: clean(r[19]),
        sn_primer_t: clean(r[20]),
        jenis_bushing_skunder_r: clean(r[21]),
        merk_skunder_r: clean(r[22]),
        type_skunder_r: clean(r[23]),
        sn_skunder_r: clean(r[24]),
        jenis_bushing_skunder_s: clean(r[25]),
        merk_skunder_s: clean(r[26]),
        type_skunder_s: clean(r[27]),
        sn_skunder_s: clean(r[28]),
        jenis_bushing_skunder_t: clean(r[29]),
        merk_skunder_t: clean(r[30]),
        type_skunder_t: clean(r[31]),
        sn_skunder_t: clean(r[32]),
        overall: clean(r[33]),
        level_minyak: clean(r[34]),
        hasil_thermovisi: clean(r[35]),
        kondisi_fisik: clean(r[36]),
        hasil_uji_tandel: clean(r[37]),
        kondisi_center_tap: clean(r[38]),
        keterangan: clean(r[39]),
        link_evidence: clean(r[40])
    }));

  console.log(`Parsed ${bushing.length} records. Syncing to database...`);
  
  try {
    const [log] = await sql`
      insert into hargi_ht2.refresh_log (source, status)
      values ('bushing', 'running')
      returning id`;
    logId = log.id;

    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(421702)`;
      await tx`delete from hargi_ht2.asesment_bushing`;
      for (let i = 0; i < bushing.length; i += 200) {
        await tx`insert into hargi_ht2.asesment_bushing ${tx(bushing.slice(i, i + 200))}`;
      }
    });
    
    await sql`
      update hargi_ht2.refresh_log
      set status='success', row_count=${bushing.length}, finished_at=now()
      where id=${logId}`;
    console.log("Successfully synced asesment bushing data!");
  } catch (err) {
    console.error("Database sync error:", err);
    if (logId) {
      await sql`
        update hargi_ht2.refresh_log
        set status='error', error=${err instanceof Error ? err.message : String(err)}, finished_at=now()
        where id=${logId}`;
    }
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

run().catch(console.error);
