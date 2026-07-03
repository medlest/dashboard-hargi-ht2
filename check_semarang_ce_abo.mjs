import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const ce = await sql`SELECT * FROM hargi_ht2.ce_abo_findings WHERE upt = 'UPT SEMARANG' AND kondisi_akhir NOT LIKE '%1-%' AND kondisi_akhir NOT LIKE '%2-%' AND status_terkini IN ('OPEN', 'CLOSE')`;
    console.log('ce open semarang:', ce.length);

    const abo = await sql`SELECT * FROM hargi_ht2.abo_2026 WHERE upt = 'UPT SEMARANG' AND (status_fix IS NULL OR upper(status_fix) <> 'CLOSE')`;
    console.log('abo open semarang:', abo.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
