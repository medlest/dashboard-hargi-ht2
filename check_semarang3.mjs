import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const ggn = await sql`SELECT * FROM hargi_ht2.gangguan_trafo WHERE unit = 'UPT SEMARANG'`;
    console.log('gangguan_trafo semarang count:', ggn.length);
    if(ggn.length > 0) console.log(ggn[0]);

    const abo = await sql`SELECT * FROM hargi_ht2.abo_2026 WHERE upt = 'UPT SEMARANG'`;
    console.log('abo_2026 semarang count:', abo.length);
    
    const ce = await sql`SELECT * FROM hargi_ht2.ce_abo_findings WHERE upt = 'UPT SEMARANG'`;
    console.log('ce_abo_findings semarang count:', ce.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
