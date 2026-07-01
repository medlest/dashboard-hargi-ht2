import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const [{ current_user }] = await sql`select current_user`;
    console.log("current_user:", current_user);
    
    const [{ count }] = await sql`select count(*) from hargi_ht2.ce_abo_findings`;
    console.log("hargi_ht2.ce_abo_findings count:", count);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
