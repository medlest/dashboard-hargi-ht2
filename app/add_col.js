const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DB_URL);
async function run() {
  try {
    await sql\ALTER TABLE hargi_ht2.asesment_bushing ADD COLUMN IF NOT EXISTS hasil_uji_tadel text\;
    console.log('Column added successfully!');
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
