/* eslint-disable @typescript-eslint/no-require-imports */
const postgres = require('postgres');

if (!process.env.DB_URL) {
  console.error('DB_URL env wajib di-set sebelum menjalankan helper ini.');
  process.exit(1);
}

const sql = postgres(process.env.DB_URL, { ssl: 'require', prepare: false });

async function run() {
  try {
    await sql`
      alter table hargi_ht2.asesment_bushing
        add column if not exists hasil_uji_tandel text,
        add column if not exists kondisi_center_tap text`;
    console.log('Columns added successfully!');
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
