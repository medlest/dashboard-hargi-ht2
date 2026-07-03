import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const logs = await sql`SELECT * FROM hargi_ht2.refresh_log WHERE source = 'bushing' ORDER BY id DESC LIMIT 5`;
    console.log('Bushing refresh logs:', logs);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
