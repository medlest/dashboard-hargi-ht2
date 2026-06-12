import { NextResponse } from "next/server";

// Thin proxy ke EF hargi-refresh (Supabase) — pemilik logic refresh.
// Key tetap server-side, FE cukup POST ke sini.
export const maxDuration = 60;

export async function POST() {
  const url = `${process.env.SUPABASE_URL}/functions/v1/hargi-refresh`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY}` },
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { ok: false, error: `EF balas non-JSON (HTTP ${res.status}): ${text.slice(0, 120)}` };
    }
    return NextResponse.json(body, { status: res.ok ? 200 : res.status || 502 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
