"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = void 0;
var postgres_1 = __importDefault(require("postgres"));
// Query macet > ini = dibatalkan → error jelas, koneksi balik ke pool.
// postgres.js TIDAK punya query timeout bawaan: koneksi pooler yang mati
// setengah (network flap) bikin query nunggu SELAMANYA dan meracuni seluruh
// pool — insiden "transferring selamanya" 2026-06-12.
var QUERY_TIMEOUT_MS = 15000;
function makeSql() {
    var base = (0, postgres_1.default)(process.env.DB_URL, {
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
        apply: function (target, thisArg, args) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var q = Reflect.apply(target, thisArg, args);
            if (q && typeof q.cancel === "function" && typeof q.then === "function") {
                var timer_1 = setTimeout(function () { return q.cancel(); }, QUERY_TIMEOUT_MS);
                q.then(function () { return clearTimeout(timer_1); }, function () { return clearTimeout(timer_1); });
            }
            return q;
        },
    });
}
// Transaction pooler Supabase (pgbouncer): prepare=false wajib.
exports.sql = (_a = globalThis.__sql) !== null && _a !== void 0 ? _a : makeSql();
if (process.env.NODE_ENV !== "production")
    globalThis.__sql = exports.sql;
