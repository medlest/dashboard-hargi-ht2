import postgres from "./app/node_modules/postgres/src/index.js";
import Papa from "./app/node_modules/papaparse/papaparse.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

const clean = (v) => String(v ?? "").replace(/\xa0/g, " ").trim();

function findCol(headers, ...terms) {
  const found = headers.find((h) => {
    const low = h.toLowerCase();
    return terms.every((t) => low.includes(t.toLowerCase()));
  });
  if (!found) {
    throw new Error(`Kolom tidak ketemu: butuh [${terms.join(", ")}]. Header: ${headers.join(" | ")}`);
  }
  return found;
}

async function run() {
  console.log("Fetching ABO 2026 data...");
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "2012059016"; // The correct GID!
  
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  if (!res.ok) throw new Error(`Gagal fetch sheet: HTTP ${res.status}`);
  const text = await res.text();
  
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  const rows = parsed.data;
  
  if (rows.length === 0) {
    console.log("No data found.");
    return;
  }
  
  let headerIdx = 0;
  let headers = [];
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const rowStr = rows[i].join(" ").toLowerCase();
    if (rowStr.includes("no") && rowStr.includes("upt") && (rowStr.includes("gardu") || rowStr.includes("nama gi"))) {
      headerIdx = i;
      headers = rows[i];
      break;
    }
  }

  const col = {
    no: findCol(headers, "no"),
    upt: headers.find((h) => h.toLowerCase() === "upt") ?? findCol(headers, "upt"),
    ultg: headers.find((h) => h.toUpperCase() === "ULTG") ?? findCol(headers, "ultg"),
    gardu_induk: headers.find((h) => h.toLowerCase().includes("nama gi")) ?? findCol(headers, "gardu"),
    jadwal_rencana: findCol(headers, "tanggal rencana"),
    realisasi: findCol(headers, "tanggal realisasi"),
    status: findCol(headers, "kondisi akhir"),
    jenis_anomali: findCol(headers, "jenis anomali"),
    status_fix: findCol(headers, "ket"),
  };

  const dataRows = rows.slice(headerIdx + 1);
  const abo = dataRows
    .filter((r) => clean(r[headers.indexOf(col.upt)]) !== "" || clean(r[headers.indexOf(col.gardu_induk)]) !== "")
    .map((r) => {
      const rawObj = {};
      r.forEach((val, idx) => {
        rawObj[headers[idx] || `col_${idx}`] = clean(val);
      });
      const realisasi = clean(r[headers.indexOf(col.realisasi)]);
      const kondisiAkhir = clean(r[headers.indexOf(col.status)]);
      const isClosed = realisasi !== "" || kondisiAkhir !== "";

      return {
        no: clean(r[headers.indexOf(col.no)]),
        upt: clean(r[headers.indexOf(col.upt)]),
        ultg: clean(r[headers.indexOf(col.ultg)]),
        gardu_induk: clean(r[headers.indexOf(col.gardu_induk)]),
        jadwal_rencana: clean(r[headers.indexOf(col.jadwal_rencana)]),
        realisasi: realisasi,
        status: kondisiAkhir,
        jenis_anomali: clean(r[headers.indexOf(col.jenis_anomali)]),
        status_fix: isClosed ? "CLOSE" : "OPEN",
        raw: rawObj,
      };
    });

  console.log(`Parsed ${abo.length} records. Syncing to database...`);
  
  let logId = null;
  try {
    const [log] = await sql`
      insert into hargi_ht2.refresh_log (source, status)
      values ('abo_2026_local', 'running')
      returning id`;
    logId = log.id;

    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(421702)`;
      await tx`delete from hargi_ht2.abo_2026`;
      for (let i = 0; i < abo.length; i += 200) {
        await tx`insert into hargi_ht2.abo_2026 ${tx(abo.slice(i, i + 200))}`;
      }
    });
    
    await sql`
      update hargi_ht2.refresh_log
      set status='success', row_count=${abo.length}, finished_at=now(), sheet_name_abo='Local Sync (GID: 2012059016)'
      where id=${logId}`;
    console.log("Successfully synced ABO 2026 data!");
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
