import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const logs = await sql`SELECT * FROM hargi_ht2.refresh_log ORDER BY id DESC LIMIT 5`;
    console.log('Recent refresh logs:', logs);

    // Let's also check if UPT Semarang is recently added in ce_abo_findings
    const ce = await sql`SELECT sheet_modified_ce FROM hargi_ht2.refresh_log WHERE status='success' ORDER BY id DESC LIMIT 1`;
    console.log('last refresh:', ce);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
