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
  console.log("Fetching OLD ABO 2026 data (Revert to 09:00 WIB)...");
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "1761063736"; // THE OLD GID
  
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  if (!res.ok) throw new Error(`Gagal fetch sheet: HTTP ${res.status}`);
  const text = await res.text();
  
  // The old code used header: true
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  
  if (rows.length === 0) {
    console.log("No data found.");
    return;
  }
  
  const headers = Object.keys(rows[0]);
  const col = {
    no: findCol(headers, "no"),
    upt: headers.find((h) => h.toLowerCase() === "upt") ?? findCol(headers, "upt"),
    ultg: headers.find((h) => h.toUpperCase() === "X") ?? findCol(headers, "x"),
    gardu_induk: findCol(headers, "gardu", "induk"),
    jadwal_rencana: findCol(headers, "jadwal", "rencana"),
    realisasi: findCol(headers, "realisasi"),
    status: findCol(headers, "status"),
    jenis_anomali: findCol(headers, "jenis", "anomali"),
    status_fix: findCol(headers, "status", "fix"),
  };

  const abo = rows
    .filter((r) => clean(r[col.upt]) !== "" || clean(r[col.gardu_induk]) !== "")
    .map((r) => ({
      no: clean(r[col.no]),
      upt: clean(r[col.upt]),
      ultg: clean(r[col.ultg]),
      gardu_induk: clean(r[col.gardu_induk]),
      jadwal_rencana: clean(r[col.jadwal_rencana]),
      realisasi: clean(r[col.realisasi]),
      status: clean(r[col.status]),
      jenis_anomali: clean(r[col.jenis_anomali]),
      status_fix: clean(r[col.status_fix]),
      raw: r,
    }));

  console.log(`Parsed ${abo.length} old records. Reverting database...`);
  
  let logId = null;
  try {
    const [log] = await sql`
      insert into hargi_ht2.refresh_log (source, status)
      values ('abo_2026_revert', 'running')
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
      set status='success', row_count=${abo.length}, finished_at=now(), sheet_name_abo='Revert (GID: 1761063736)'
      where id=${logId}`;
    console.log("Successfully reverted ABO 2026 data!");
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
