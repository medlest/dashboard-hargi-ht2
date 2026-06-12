import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof makeSql> | undefined;
}

// Query macet > ini = dibatalkan → error jelas, koneksi balik ke pool.
// postgres.js TIDAK punya query timeout bawaan: koneksi pooler yang mati
// setengah (network flap) bikin query nunggu SELAMANYA dan meracuni seluruh
// pool — insiden "transferring selamanya" 2026-06-12.
const QUERY_TIMEOUT_MS = 15_000;

function makeSql() {
  const base = postgres(process.env.DB_URL!, {
    ssl: "require",
    max: 4,
    prepare: false,
    // Anti socket-mati-setengah: idle pendek + TCP keepalive + recycle.
    // JANGAN naikin idle_timeout demi "keep warm" — itu sumber hang-nya.
    idle_timeout: 20,
    keep_alive: 30,
    max_lifetime: 60 * 15,
    connect_timeout: 10,
  });

  // Tiap sql`...` dibungkus cancel-on-timeout. cancel() bikin query reject
  // dengan error + slot pool dibebaskan, bukan wedged permanen.
  return new Proxy(base, {
    apply(target, thisArg, args) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = Reflect.apply(target as any, thisArg, args as any);
      if (q && typeof q.cancel === "function" && typeof q.then === "function") {
        const timer = setTimeout(() => q.cancel(), QUERY_TIMEOUT_MS);
        q.then(() => clearTimeout(timer), () => clearTimeout(timer));
      }
      return q;
    },
  }) as typeof base;
}

// Transaction pooler Supabase (pgbouncer): prepare=false wajib.
export const sql = globalThis.__sql ?? makeSql();

if (process.env.NODE_ENV !== "production") globalThis.__sql = sql;
