import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres(process.env.DB_URL, {
  ssl: 'require'
});

async function run() {
  try {
    const rows = await sql`select * from hargi_ht2.asesment_bushing where bay_penghantar = 'TRF#1 150/20kV'`;
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
