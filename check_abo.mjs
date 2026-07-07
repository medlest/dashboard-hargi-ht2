import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const abo = await sql`SELECT count(*) FROM hargi_ht2.abo_2026`;
    console.log('ABO 2026 count:', abo[0].count);
    
    const logs = await sql`SELECT * FROM hargi_ht2.refresh_log ORDER BY id DESC LIMIT 1`;
    console.log('Last log keys:', Object.keys(logs[0]));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
