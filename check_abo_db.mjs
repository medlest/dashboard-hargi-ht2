import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  const res = await sql`select status, status_fix, count(*) from hargi_ht2.abo_2026 group by status, status_fix`;
  console.log(res);
  await sql.end();
}

run();
