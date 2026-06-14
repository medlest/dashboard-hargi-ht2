const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const sql = postgres('postgresql://ht2_app.mjgekmjnsipthcswazid:e11774d663ea47367eaa1630d1ee354b@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

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
