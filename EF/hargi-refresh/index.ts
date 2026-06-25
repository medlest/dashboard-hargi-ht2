// EF hargi-refresh — pull data sheet public CSV → hargi_ht2 (Postgres)
// Sumber sheet PUBLIC (anyone-with-link) → ZERO credential Google.
// Kalau sheet di-private nanti → ganti fetch ke Sheets API pakai OAuth org
// (sheets-bridge-uptbogor, vault yggdrasil_oauth_token). JANGAN akun personal.
import postgres from "npm:postgres@3.4.7";
import Papa from "npm:papaparse@5.5.3";

const CE_ABO = { id: "1-eC0GdeMwYDhnGzCSM8viO0HvD6X0NdlMaWOxe2P9ZM", gid: "299154811" };
const PARETO = { id: "1hf_lpXI6x3hBDfEHX8r8q15w6F3wtlzIABGibdpCMhg", gid: "1882488493" };
const ABO_2026 = { id: "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs", gid: "1761063736" };
const ASESMENT_BUSHING = { id: "1HS08VH-CURCJiqjDqhCd1z1VFWbnykA89IrlJaAm9BA", gid: "706438307" };

type Row = Record<string, string>;

const clean = (v: unknown) => String(v ?? "").replace(/\xa0/g, " ").trim();

// gviz query API: filter dikerjakan di sisi Google → response kecil.
// (Full CSV export CE ABO = 28.7MB / 138K baris → bikin EF kehabisan compute.)
function gvizUrl(s: { id: string; gid: string }, tq: string) {
  return `https://docs.google.com/spreadsheets/d/${s.id}/gviz/tq?tqx=out:csv&gid=${s.gid}&tq=${encodeURIComponent(tq)}`;
}

// index kolom 0-based → notasi huruf A1 (0=A, 26=AA)
function colLetter(i: number): string {
  let s = "";
  i += 1;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

async function fetchCsv(url: string): Promise<Row[]> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Gagal fetch sheet: HTTP ${res.status}`);
  const text = await res.text();
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  return parsed.data;
}

// Fetch dengan filter gviz WHERE. Posisi kolom dideteksi dari header dulu
// (tahan geser kolom), baru query filter dibangun pakai huruf kolom aktual.
async function fetchSheetFiltered(
  s: { id: string; gid: string },
  buildWhere: (letterOf: (...terms: string[]) => string) => string,
): Promise<Row[]> {
  const headerRows = await fetchCsv(gvizUrl(s, "select * limit 1"));
  if (headerRows.length === 0) throw new Error("Sheet kosong — header tidak kebaca.");
  const headers = Object.keys(headerRows[0]);
  const letterOf = (...terms: string[]) => {
    const idx = headers.findIndex((h) =>
      terms.every((t) => h.toLowerCase().includes(t.toLowerCase())));
    if (idx < 0) throw new Error(`Kolom [${terms.join(", ")}] tidak ketemu. Header: ${headers.join(" | ")}`);
    return colLetter(idx);
  };
  return fetchCsv(gvizUrl(s, `select * where ${buildWhere(letterOf)}`));
}

async function fetchSheetRows(s: { id: string; gid: string }): Promise<Row[]> {
  return fetchCsv(
    `https://docs.google.com/spreadsheets/d/${s.id}/export?format=csv&gid=${s.gid}&t=${Date.now()}`,
  );
}

async function fetchSheetRowsAsArray(s: { id: string; gid: string }): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${s.id}/export?format=csv&gid=${s.gid}&t=${Date.now()}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Gagal fetch sheet: HTTP ${res.status}`);
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
  return parsed.data;
}

function findCol(headers: string[], ...terms: string[]): string {
  const found = headers.find((h) => {
    const low = h.toLowerCase();
    return terms.every((t) => low.includes(t.toLowerCase()));
  });
  if (!found) {
    throw new Error(`Kolom tidak ketemu: butuh [${terms.join(", ")}]. Header: ${headers.join(" | ")}`);
  }
  return found;
}

function mapCeAbo(rows: Row[]) {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const opt = (...terms: string[]) =>
    headers.find((h) => terms.every((t) => h.toLowerCase().includes(t.toLowerCase())));
  const col = {
    kode: findCol(headers, "kode"),
    sub_bidang: findCol(headers, "sub", "bidang"),
    level_anomali: findCol(headers, "level", "anomali"),
    uraian: findCol(headers, "uraian"),
    upt: headers.find((h) => h.toLowerCase() === "upt") ?? findCol(headers, "upt"),
    ultg: findCol(headers, "ultg"),
    gardu_induk: findCol(headers, "gardu", "induk"),
    nama_alat: findCol(headers, "nama", "tower"),
    kondisi_terkini: findCol(headers, "kondisi", "terkini"),
    kondisi_awal: findCol(headers, "kondisi", "awal"),
    kondisi_akhir: findCol(headers, "kondisi", "akhir"),
    status_terkini: findCol(headers, "status", "terkini"),
    status_awal: findCol(headers, "status", "awal"),
  };
  const hartrans = opt("hartrans"), ruas = opt("nama", "ruas"),
    rencana = opt("rencana", "tinjut"), realisasi = opt("realisasi", "tinjut"),
    jml = opt("jml"), kodeAwal = opt("kode", "awal"), kodeTerkini = opt("kode", "terkini");

  return rows
    .filter((r) =>
      clean(r[col.sub_bidang]).toUpperCase().includes("HARGI") &&
      ["OPEN", "CLOSE"].includes(clean(r[col.status_terkini]).toUpperCase()))
    .map((r) => ({
      kode: clean(r[col.kode]),
      sub_bidang: clean(r[col.sub_bidang]),
      level_anomali: clean(r[col.level_anomali]),
      uraian: clean(r[col.uraian]),
      hartrans: hartrans ? clean(r[hartrans]) : "",
      upt: clean(r[col.upt]),
      ultg: clean(r[col.ultg]),
      gardu_induk: clean(r[col.gardu_induk]),
      nama_ruas_bay: ruas ? clean(r[ruas]) : "",
      nama_alat: clean(r[col.nama_alat]),
      kondisi_terkini: clean(r[col.kondisi_terkini]),
      kondisi_awal: clean(r[col.kondisi_awal]),
      tgl_rencana_tinjut: rencana ? clean(r[rencana]) : "",
      tgl_realisasi_tinjut: realisasi ? clean(r[realisasi]) : "",
      kondisi_akhir: clean(r[col.kondisi_akhir]),
      jml: jml ? clean(r[jml]) : "",
      kode_awal: kodeAwal ? clean(r[kodeAwal]) : "",
      kode_terkini: kodeTerkini ? clean(r[kodeTerkini]) : "",
      status_awal: clean(r[col.status_awal]),
      status_terkini: clean(r[col.status_terkini]).toUpperCase(),
      raw: r,
    }));
}

function mapPareto(rows: Row[]) {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const opt = (...terms: string[]) =>
    headers.find((h) => terms.every((t) => h.toLowerCase().includes(t.toLowerCase())));
  const unitCol = headers.find((h) => h.toLowerCase() === "unit") ?? findCol(headers, "unit");
  const tahunCol = headers.find((h) => h.toLowerCase().trim() === "tahun") ?? findCol(headers, "tahun");
  const bulanCol = headers.find((h) => h.toLowerCase().trim() === "bulan") ?? findCol(headers, "bulan");
  const kategoriCol = findCol(headers, "kategori x");
  const noCol = opt("no."), tglCol = opt("tgl", "keluar"), garduCol = opt("gardu"),
    bayCol = opt("nama", "bay"), sebabCol = opt("sebab"), ketCol = opt("keterangan"),
    latCol = opt("latitude"), lngCol = opt("longitude"), tegCol = opt("tegangan");
  const t4Col = headers.find((h) => h.trim() === "4T");
  const mvaCol = headers.find((h) => h.trim().toUpperCase() === "MVA");

  return rows
    .filter((r) => clean(r[kategoriCol]) !== "" || clean(r[unitCol]) !== "")
    .map((r) => ({
      no: noCol ? clean(r[noCol]) : "",
      tgl_keluar: tglCol ? clean(r[tglCol]) : "",
      unit: clean(r[unitCol]),
      gardu: garduCol ? clean(r[garduCol]) : "",
      nama_bay: bayCol ? clean(r[bayCol]) : "",
      kategori: clean(r[kategoriCol]),
      sebab: sebabCol ? clean(r[sebabCol]) : "",
      tahun: clean(r[tahunCol]),
      bulan: clean(r[bulanCol]),
      t4: t4Col ? clean(r[t4Col]) : "",
      keterangan: ketCol ? clean(r[ketCol]) : "",
      latitude: latCol ? clean(r[latCol]) : "",
      longitude: lngCol ? clean(r[lngCol]) : "",
      tegangan: tegCol ? clean(r[tegCol]) : "",
      mva: mvaCol ? clean(r[mvaCol]) : "",
      raw: r,
    }));
}

function mapAbo2026(rows: Row[]) {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const col = {
    no: findCol(headers, "no"),
    upt: headers.find((h) => h.toLowerCase() === "upt") ?? findCol(headers, "upt"),
    ultg: headers.find((h) => h.toUpperCase() === "X") ?? findCol(headers, "x"),
    gardu_induk: findCol(headers, "gardu", "induk"),
    jadwal_rencana: findCol(headers, "jadwal", "rencana"),
    realisasi: findCol(headers, "realisasi"),
    status: findCol(headers, "status"),
    jenis_anomali: findCol(headers, "jenis", "anomali"),
    status_fix: findCol(headers, "status", "fix"),
  };

  return rows
    .filter((r) => clean(r[col.upt]) !== "" || clean(r[col.gardu_induk]) !== "")
    .map((r) => ({
      no: clean(r[col.no]),
      upt: clean(r[col.upt]),
      ultg: clean(r[col.ultg]),
      gardu_induk: clean(r[col.gardu_induk]),
      jadwal_rencana: clean(r[col.jadwal_rencana]),
      realisasi: clean(r[col.realisasi]),
      status: clean(r[col.status]),
      jenis_anomali: clean(r[col.jenis_anomali]),
      status_fix: clean(r[col.status_fix]),
      raw: r,
    }));
}

function mapAsesmentBushing(rows: string[][]) {
  if (rows.length <= 2) return [];
  // Baris ke-0: merged header group, Baris ke-1: column headers, Baris ke-2+: data
  const dataRows = rows.slice(2);
  return dataRows
    .filter((r) => r.length >= 35 && clean(r[1]) !== "" && clean(r[1]).toUpperCase() !== "NAMAUPT")
    .map((r) => {
      const rawObj: Record<string, string> = {};
      r.forEach((val, idx) => {
        rawObj[`col_${idx}`] = clean(val);
      });
      return {
        techidentno: clean(r[0]),
        nama_upt: clean(r[1]),
        gardu_induk: clean(r[2]),
        bay_penghantar: clean(r[3]),
        merk: clean(r[4]),
        tipe: clean(r[5]),
        tgl_oprs: clean(r[6]),
        usia: clean(r[7]),
        thn_buat: clean(r[8]),
        jenis_bushing_primer_r: clean(r[9]),
        merk_primer_r: clean(r[10]),
        type_primer_r: clean(r[11]),
        sn_primer_r: clean(r[12]),
        jenis_bushing_primer_s: clean(r[13]),
        merk_primer_s: clean(r[14]),
        type_primer_s: clean(r[15]),
        sn_primer_s: clean(r[16]),
        jenis_bushing_primer_t: clean(r[17]),
        merk_primer_t: clean(r[18]),
        type_primer_t: clean(r[19]),
        sn_primer_t: clean(r[20]),
        jenis_bushing_skunder_r: clean(r[21]),
        merk_skunder_r: clean(r[22]),
        type_skunder_r: clean(r[23]),
        sn_skunder_r: clean(r[24]),
        jenis_bushing_skunder_s: clean(r[25]),
        merk_skunder_s: clean(r[26]),
        type_skunder_s: clean(r[27]),
        sn_skunder_s: clean(r[28]),
        jenis_bushing_skunder_t: clean(r[29]),
        merk_skunder_t: clean(r[30]),
        type_skunder_t: clean(r[31]),
        sn_skunder_t: clean(r[32]),
        overall: clean(r[33]),
        level_minyak: clean(r[34]),
        hasil_thermovisi: clean(r[35]),
        kondisi_fisik: clean(r[36]),
        keterangan: clean(r[37]),
        link_evidence: clean(r[38]),
        raw: rawObj,
      };
    });
}


// Metadata sheet (modifiedTime) via Drive API + SA platform-google-api (key di vault).
// FAIL-SAFE: gagal = null, refresh tetap sukses. Timeout ketat 5 detik.
// deno-lint-ignore no-explicit-any
type Meta = { name: string | null; modifiedTime: string | null };
async function fetchSheetMetadata(sql: any): Promise<{ ce: Meta; pareto: Meta; abo: Meta; bushing: Meta }> {
  try {
    const [row] = await sql`
      select decrypted_secret from vault.decrypted_secrets
      where name = 'platform_google_api_key'`;
    const key = JSON.parse(row.decrypted_secret);

    const pem = key.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
    const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    const ck = await crypto.subtle.importKey(
      "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);

    const b64u = (o: object) =>
      btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const now = Math.floor(Date.now() / 1000);
    const input = `${b64u({ alg: "RS256", typ: "JWT" })}.${b64u({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now, exp: now + 3600,
    })}`;
    const sigBuf = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5", ck, new TextEncoder().encode(input));
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const tokRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${input}.${sig}`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!tokRes.ok) throw new Error(`token HTTP ${tokRes.status}`);
    const { access_token } = await tokRes.json();

    const getMod = async (id: string): Promise<Meta> => {
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}?fields=name,modifiedTime`,
        { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`drive HTTP ${r.status}`);
      const j = await r.json();
      return { name: j.name ?? null, modifiedTime: j.modifiedTime ?? null };
    };
    const [ce, pareto, abo, bushing] = await Promise.all([
      getMod(CE_ABO.id),
      getMod(PARETO.id),
      getMod(ABO_2026.id),
      getMod(ASESMENT_BUSHING.id)
    ]);
    return { ce, pareto, abo, bushing };
  } catch (e) {
    console.error("[sheet-meta]", e instanceof Error ? e.message : e);
    return { 
      ce: { name: null, modifiedTime: null }, 
      pareto: { name: null, modifiedTime: null },
      abo: { name: null, modifiedTime: null },
      bushing: { name: null, modifiedTime: null }
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1 });
  let logId: number | null = null;

  try {
    const [logRow] = await sql`
      insert into hargi_ht2.refresh_log (source) values ('all') returning id`;
    logId = logRow.id;

    const [ceRaw, ggnRaw, aboRaw, bushingRaw, meta] = await Promise.all([
      fetchSheetFiltered(CE_ABO, (letterOf) => {
        const sb = letterOf("sub", "bidang");
        const st = letterOf("status", "terkini");
        return `${sb} contains 'HARGI' and (upper(${st}) = 'OPEN' or upper(${st}) = 'CLOSE')`;
      }),
      fetchSheetRows(PARETO),
      fetchSheetRows(ABO_2026),
      fetchSheetRowsAsArray(ASESMENT_BUSHING),
      fetchSheetMetadata(sql),
    ]);
    const ce = mapCeAbo(ceRaw);
    const ggn = mapPareto(ggnRaw);
    const abo = mapAbo2026(aboRaw);
    const bushing = mapAsesmentBushing(bushingRaw);

    if (ce.length === 0) throw new Error("Sheet CE ABO menghasilkan 0 baris — refresh dibatalkan.");
    if (ggn.length === 0) throw new Error("Sheet gangguan trafo menghasilkan 0 baris — refresh dibatalkan.");
    if (bushing.length === 0) throw new Error("Sheet asesment bushing menghasilkan 0 baris — refresh dibatalkan.");

    await sql.begin(async (tx) => {
      // advisory lock: 2 refresh barengan antri, gak saling hapus di tengah jalan
      await tx`select pg_advisory_xact_lock(421702)`;
      
      await tx`delete from hargi_ht2.ce_abo_findings`;
      for (let i = 0; i < ce.length; i += 200) {
        await tx`insert into hargi_ht2.ce_abo_findings ${tx(ce.slice(i, i + 200))}`;
      }
      
      await tx`delete from hargi_ht2.gangguan_trafo`;
      for (let i = 0; i < ggn.length; i += 200) {
        await tx`insert into hargi_ht2.gangguan_trafo ${tx(ggn.slice(i, i + 200))}`;
      }

      await tx`delete from hargi_ht2.abo_2026`;
      if (abo.length > 0) {
        for (let i = 0; i < abo.length; i += 200) {
          await tx`insert into hargi_ht2.abo_2026 ${tx(abo.slice(i, i + 200))}`;
        }
      }

      await tx`delete from hargi_ht2.asesment_bushing`;
      if (bushing.length > 0) {
        for (let i = 0; i < bushing.length; i += 200) {
          await tx`insert into hargi_ht2.asesment_bushing ${tx(bushing.slice(i, i + 200))}`;
        }
      }
    });

    // Try to update metadata columns in refresh_log. If the columns do not exist
    // yet (e.g. DDL has not been fully run or permissions differ), fail gracefully
    // to preserve other data.
    try {
      await sql`update hargi_ht2.refresh_log
        set status='success', row_count=${ce.length + ggn.length + abo.length + bushing.length}, finished_at=now(),
            sheet_modified_ce=${meta.ce.modifiedTime}, 
            sheet_modified_pareto=${meta.pareto.modifiedTime},
            sheet_modified_abo=${meta.abo.modifiedTime},
            sheet_modified_bushing=${meta.bushing.modifiedTime},
            sheet_name_ce=${meta.ce.name}, 
            sheet_name_pareto=${meta.pareto.name},
            sheet_name_abo=${meta.abo.name},
            sheet_name_bushing=${meta.bushing.name}
        where id=${logId}`;
    } catch (err) {
      console.warn("Could not write all metadata to refresh_log, trying fallback without new columns:", err instanceof Error ? err.message : err);
      await sql`update hargi_ht2.refresh_log
        set status='success', row_count=${ce.length + ggn.length + abo.length + bushing.length}, finished_at=now(),
            sheet_modified_ce=${meta.ce.modifiedTime}, 
            sheet_modified_pareto=${meta.pareto.modifiedTime},
            sheet_modified_abo=${meta.abo.modifiedTime},
            sheet_name_ce=${meta.ce.name}, 
            sheet_name_pareto=${meta.pareto.name},
            sheet_name_abo=${meta.abo.name}
        where id=${logId}`;
    }
    
    return new Response(JSON.stringify({ 
      ok: true, 
      ce_abo: ce.length, 
      gangguan_trafo: ggn.length,
      abo_2026: abo.length,
      asesment_bushing: bushing.length
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (logId !== null) {
      await sql`update hargi_ht2.refresh_log
        set status='error', error=${msg}, finished_at=now()
        where id=${logId}`.catch(() => {});
    }
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    // koneksi SELALU ditutup, apapun yang terjadi
    await sql.end().catch(() => {});
  }
});
