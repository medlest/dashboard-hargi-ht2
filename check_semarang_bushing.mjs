import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const semarang = await sql`SELECT * FROM hargi_ht2.asesment_bushing WHERE nama_upt = 'UPT SEMARANG'`;
    console.log('asesment_bushing semarang count:', semarang.length);
    if(semarang.length > 0) console.log(semarang[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
