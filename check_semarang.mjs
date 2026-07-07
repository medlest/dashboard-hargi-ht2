import postgres from "./app/node_modules/postgres/src/index.js";
import Papa from "./app/node_modules/papaparse/papaparse.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  const dbRows = await sql`
    select * from hargi_ht2.abo_2026 
    where upper(upt) like '%SEMARANG%'
    and upper(jenis_anomali) like '%TS - REVIEW & TINDAKLANJUT LA%'
  `;
  console.log(`DB count for UPT Semarang & TS - Review & Tindaklanjut LA: ${dbRows.length}`);
  
  // Let's also check the raw sheet data directly
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "1761063736";
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  
  let sheetCount = 0;
  for (const row of parsed.data) {
    const upt = (row["UPT"] || "").toUpperCase();
    const anomali = (row["Jenis Anomali"] || "").toUpperCase();
    if (upt.includes("SEMARANG") && anomali.includes("TS - REVIEW & TINDAKLANJUT LA")) {
      sheetCount++;
    }
  }
  console.log(`Sheet count for UPT Semarang & TS - Review & Tindaklanjut LA: ${sheetCount}`);
  
  // Let's see what happens during mapping in EF index.ts
  await sql.end();
}
run().catch(console.error);
