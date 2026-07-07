import postgres from "./app/node_modules/postgres/src/index.js";
import fs from "fs";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const q1 = fs.readFileSync("./EF/hargi-refresh/sql/01_refresh_log_abo_meta.sql", "utf-8");
    await sql.unsafe(q1);
    console.log('01_refresh_log_abo_meta.sql executed successfully');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
