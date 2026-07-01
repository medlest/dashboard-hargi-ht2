import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres(process.env.DB_URL, {
  ssl: 'require'
});

async function run() {
  try {
    const rows = await sql`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'asesment_bushing';
    `;
    console.log("Triggers:", rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
