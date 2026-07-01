import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres(process.env.DB_URL, {
  ssl: 'require'
});

async function run() {
  try {
    const rows = await sql`select distinct upper(trim(hasil_thermovisi)) as val, count(*) from hargi_ht2.asesment_bushing group by val`;
    console.log("Distinct hasil_thermovisi values:");
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
