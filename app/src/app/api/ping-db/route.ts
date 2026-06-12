import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Diagnostik pool: GET /api/ping-db → waktu eksekusi select 1 via pool yang sama
export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();
  await sql`select 1`;
  return NextResponse.json({ ok: true, ms: Date.now() - t0 });
}
