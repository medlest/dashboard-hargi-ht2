import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres(process.env.DB_URL, {
  ssl: 'require'
});

async function run() {
  try {
    const rows = await sql`select techidentno, nama_upt, gardu_induk, bay_penghantar, hasil_thermovisi from hargi_ht2.asesment_bushing where gardu_induk = 'GI 150KV BALAPULANG'`;
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
