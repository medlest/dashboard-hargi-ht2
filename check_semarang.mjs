import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const rows = await sql`SELECT DISTINCT nama_upt FROM hargi_ht2.asesment_bushing WHERE nama_upt ILIKE '%semarang%'`;
    console.log('nama_upt matches:', rows);

    const rows2 = await sql`SELECT DISTINCT gardu_induk FROM hargi_ht2.asesment_bushing WHERE gardu_induk ILIKE '%semarang%'`;
    console.log('gardu_induk matches:', rows2);
    
    // Also check other tables if relevant. But let's check distinct nama_upt first to see if UPT Semarang is there.
    const upts = await sql`SELECT DISTINCT nama_upt FROM hargi_ht2.asesment_bushing`;
    console.log('All UPTs:', upts.map(u => u.nama_upt));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
