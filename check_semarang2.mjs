import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const ce = await sql`SELECT DISTINCT upt FROM hargi_ht2.ce_abo_findings WHERE upt ILIKE '%semarang%'`;
    console.log('ce_abo_findings semarang:', ce);

    const abo = await sql`SELECT DISTINCT upt FROM hargi_ht2.abo_2026 WHERE upt ILIKE '%semarang%'`;
    console.log('abo_2026 semarang:', abo);

    const ggn = await sql`SELECT DISTINCT unit FROM hargi_ht2.gangguan_trafo WHERE unit ILIKE '%semarang%'`;
    console.log('gangguan_trafo semarang:', ggn);

    const all_ce = await sql`SELECT DISTINCT upt FROM hargi_ht2.ce_abo_findings`;
    console.log('all CE UPTs:', all_ce.map(r => r.upt));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
