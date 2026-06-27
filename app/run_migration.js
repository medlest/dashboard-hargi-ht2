const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

if (!process.env.DB_URL) {
  console.error('DB_URL env wajib di-set sebelum menjalankan migration helper.');
  process.exit(1);
}

const sql = postgres(process.env.DB_URL, { ssl: 'require', prepare: false });

async function migrate() {
  try {
    const migrationPath = path.join(__dirname, '..', 'EF', 'hargi-refresh', 'sql', '01_refresh_log_abo_meta.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration...');
    await sql.unsafe(migrationSql);
    console.log('Migration applied successfully.');

  } catch (err) {
    console.error('Error applying migration:', err.message);
  } finally {
    await sql.end();
  }
}

migrate();
