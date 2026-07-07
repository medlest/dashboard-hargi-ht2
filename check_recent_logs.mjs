import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  const logs = await sql`
    select id, source, status, row_count, error, started_at 
    from hargi_ht2.refresh_log 
    order by started_at desc 
    limit 10
  `;
  console.log(logs);
  await sql.end();
}

run();
