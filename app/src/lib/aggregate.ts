// Agregasi client-side — port 1:1 dari logic pandas baseline.
// Data kecil (≤1000 baris) → filter & hitung di browser = instan, tanpa round-trip.

export type CeRow = {
  kode: string;
  sub_bidang: string;
  level_anomali: string;
  uraian: string;
  upt: string;
  ultg: string;
  gardu_induk: string;
  nama_ruas_bay: string;
  nama_alat: string;
  kondisi_terkini: string;
  kondisi_awal: string;
  kondisi_akhir: string;
  status_terkini: string;
};

export type GgnRow = {
  no: string;
  tgl_keluar: string;
  unit: string;
  gardu: string;
  nama_bay: string;
  kategori: string;
  sebab: string;
  tahun: string;
  bulan: string;
};

const isClosed = (ka: string) => (ka ?? "").includes("1-") || (ka ?? "").includes("2-");
const isOpen = (ka: string) => ["3-", "4-", "5-"].some((p) => (ka ?? "").includes(p));

export type CeFilters = {
  upt: string[];
  sub_bidang: string[];
  level_anomali: string[];
  kondisi_akhir: string[];
  is_gis?: boolean;
};

export function ceAvailableFilters(rows: CeRow[]): CeFilters {
  const uniq = (vals: string[]) => [...new Set(vals.filter(Boolean))].sort();
  return {
    upt: uniq(rows.map((r) => r.upt)),
    sub_bidang: uniq(rows.map((r) => r.sub_bidang)),
    level_anomali: uniq(rows.map((r) => r.level_anomali)),
    kondisi_akhir: uniq(rows.map((r) => r.kondisi_akhir)),
  };
}

const isGis = (r: CeRow) => (r.level_anomali || "").trim().toUpperCase() === "GIS";

export function ceFilterRows(rows: CeRow[], f: CeFilters): CeRow[] {
  return rows.filter(
    (r) =>
      (f.upt.length === 0 || f.upt.includes(r.upt)) &&
      (f.sub_bidang.length === 0 || f.sub_bidang.includes(r.sub_bidang)) &&
      (f.level_anomali.length === 0 || f.level_anomali.includes(r.level_anomali)) &&
      (f.kondisi_akhir.length === 0 || f.kondisi_akhir.includes(r.kondisi_akhir)) &&
      (f.is_gis === undefined || isGis(r) === f.is_gis),
  );
}

function countBy<T>(rows: T[], key: (r: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function countBy2<T>(rows: T[], k1: (r: T) => string, k2: (r: T) => string) {
  const m = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const a = k1(r);
    const b = k2(r);
    if (!a || !b) continue;
    if (!m.has(a)) m.set(a, new Map());
    const inner = m.get(a)!;
    inner.set(b, (inner.get(b) ?? 0) + 1);
  }
  return m;
}

function countBy3<T>(rows: T[], k1: (r: T) => string, k2: (r: T) => string, k3: (r: T) => string) {
  const m = new Map<string, Map<string, Map<string, number>>>();
  for (const r of rows) {
    const a = k1(r);
    const b = k2(r);
    const c = k3(r);
    if (!a || !b) continue;
    if (!m.has(a)) m.set(a, new Map());
    const mb = m.get(a)!;
    if (!mb.has(b)) mb.set(b, new Map());
    const mc = mb.get(b)!;
    mc.set(c, (mc.get(c) ?? 0) + 1);
  }
  return m;
}

function countByCond<T>(rows: T[], k1: (r: T) => string, k2: (r: T) => string) {
  const m = new Map<string, Map<string, number>>();
  const condMap: Record<string, string> = {
    "1-": "Very Good", "2-": "Good", "3-": "Fair", "4-": "Poor", "5-": "Critical"
  };
  const normalize = (v: string) => {
    const key = Object.keys(condMap).find(k => v.includes(k));
    return key ? condMap[key] : v;
  };

  for (const r of rows) {
    const a = k1(r);
    const b = normalize(k2(r));
    if (!a || !b) continue;
    if (!m.has(a)) m.set(a, new Map());
    const inner = m.get(a)!;
    inner.set(b, (inner.get(b) ?? 0) + 1);
  }
  return m;
}

export function ceAggregate(rows: CeRow[]) {
  // Hanya baris dengan status OPEN atau CLOSE yang dianggap sebagai "Temuan" (Anomali)
  const findingRows = rows.filter(r => 
    ["OPEN", "CLOSE"].includes((r.status_terkini || "").toUpperCase().trim())
  );

  const total = findingRows.length;
  const closed = findingRows.filter((r) => isClosed(r.kondisi_akhir)).length;
  const open = findingRows.filter((r) => isOpen(r.kondisi_akhir)).length;
  const progress = total > 0 ? Math.round((closed / total) * 10000) / 100 : 0;

  const condMap: Record<string, string> = {
    "1-": "Very Good", "2-": "Good", "3-": "Fair", "4-": "Poor", "5-": "Critical"
  };
  const norm = (v: string) => {
    const key = Object.keys(condMap).find(k => (v || "").includes(k));
    return key ? condMap[key] : v;
  };

  const kaSummary = countBy(findingRows, (r) => norm(r.kondisi_akhir));
  // TARGET AWAL menggunakan seluruh populasi (termasuk yang status '-')
  const kondisiAwal = countBy(rows, (r) => norm(r.kondisi_awal));
  const kondisiTerkini = countBy(findingRows, (r) => norm(r.kondisi_terkini));
  
  const byUpt = countByCond(findingRows, (r) => r.upt, (r) => r.kondisi_akhir);
  const bySubBidang = countByCond(findingRows, (r) => r.sub_bidang, (r) => r.kondisi_akhir);
  const byLevel = countByCond(findingRows, (r) => r.level_anomali, (r) => r.kondisi_akhir);
  
  const uraianTop = [...countBy(findingRows, (r) => r.uraian).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const byLevelUraian = countBy2(findingRows, (r) => r.level_anomali, (r) => r.uraian);

  // Tabel ringkasan level anomali: breakdown VG/G/F/P/C per level (fokus TEMUAN untuk TARGET / Akhir)
  const levelSummary = [...byLevel.entries()]
    .map(([level, conds]) => {
      const vg = conds.get("Very Good") ?? 0;
      const g = conds.get("Good") ?? 0;
      const f = conds.get("Fair") ?? 0;
      const p = conds.get("Poor") ?? 0;
      const c = conds.get("Critical") ?? 0;
      return { level, vg, g, f, p, c, total: vg + g + f + p + c };
    })
    .sort((a, b) => b.total - a.total);

  // Tambahan untuk tabel Kondisi Terkini
  const byLevelTerkini = countByCond(findingRows, (r) => r.level_anomali, (r) => r.kondisi_terkini);
  const levelSummaryTerkini = [...byLevelTerkini.entries()]
    .map(([level, conds]) => {
      const vg = conds.get("Very Good") ?? 0;
      const g = conds.get("Good") ?? 0;
      const f = conds.get("Fair") ?? 0;
      const p = conds.get("Poor") ?? 0;
      const c = conds.get("Critical") ?? 0;
      return { level, vg, g, f, p, c, total: vg + g + f + p + c };
    })
    .sort((a, b) => b.total - a.total);

  // Rekap GIS: aggregate stats for rows where Level Anomali is GIS
  const gisRows = findingRows.filter(isGis);
  const gisTotal = gisRows.length;
  const gisClosed = gisRows.filter((r) => isClosed(r.kondisi_akhir)).length;
  const gisOpen = gisRows.filter((r) => isOpen(r.kondisi_akhir)).length;
  const gisSummary = {
    total: gisTotal,
    closed: gisClosed,
    open: gisOpen,
    progress: gisTotal > 0 ? Math.round((gisClosed / gisTotal) * 10000) / 100 : 0,
  };

  // Tabel ringkasan UPT: pecah per kondisi (VG/G/F/P/C) + total (fokus TEMUAN)
  const uptSummary = [...byUpt.entries()]
    .map(([name, conds]) => {
      const vg = conds.get("Very Good") ?? 0;
      const g = conds.get("Good") ?? 0;
      const f = conds.get("Fair") ?? 0;
      const p = conds.get("Poor") ?? 0;
      const c = conds.get("Critical") ?? 0;
      const closed = vg + g;
      const total = vg + g + f + p + c;
      const progress = total > 0 ? Math.round((closed / total) * 10000) / 100 : 0;
      return { name, vg, g, f, p, c, total, progress };
    })
    .sort((a, b) => b.total - a.total);

  // Slide specific aggregations
  const openRows = findingRows.filter(r => isOpen(r.kondisi_akhir));
  const focusUraian = [...countBy(openRows, (r) => r.uraian).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  const priorityList = openRows
    .filter(r => (r.kondisi_akhir || "").includes("5-") || (r.kondisi_akhir || "").includes("4-"))
    .sort((a, b) => {
      if (a.kondisi_akhir.includes("5-") && !b.kondisi_akhir.includes("5-")) return -1;
      if (!a.kondisi_akhir.includes("5-") && b.kondisi_akhir.includes("5-")) return 1;
      return 0;
    })
    .slice(0, 50);

  return {
    stats: { total, closed, open, progress },
    kaSummary, kondisiAwal, kondisiTerkini, byUpt, bySubBidang, byLevel,
    uraianTop, byLevelUraian, levelSummary, levelSummaryTerkini, uptSummary, gisSummary,
    focusUraian, priorityList,
  };
}

// ===== Pareto / Gangguan Trafo =====

const MONTH_ORDER: Record<string, number> = {
  JANUARI: 1, JANUARY: 1, JAN: 1, FEBRUARI: 2, FEBRUARY: 2, FEB: 2,
  MARET: 3, MARCH: 3, MAR: 3, APRIL: 4, APR: 4, MEI: 5, MAY: 5,
  JUNI: 6, JUNE: 6, JUN: 6, JULI: 7, JULY: 7, JUL: 7,
  AGUSTUS: 8, AUGUST: 8, AGS: 8, AUG: 8, SEPTEMBER: 9, SEP: 9,
  OKTOBER: 10, OCTOBER: 10, OKT: 10, OCT: 10, NOVEMBER: 11, NOV: 11,
  DESEMBER: 12, DECEMBER: 12, DES: 12, DEC: 12,
};

export const monthIndex = (b: string) => MONTH_ORDER[b.toUpperCase().trim()] ?? 99;
export const sortMonths = (months: string[]) =>
  [...months].sort((a, b) => monthIndex(a) - monthIndex(b));

export type GgnFilters = { bulan: string[]; tahun: string[]; unit: string[]; kategori: string[] };

export function ggnAvailableFilters(rows: GgnRow[]): GgnFilters {
  const uniq = (vals: string[]) => [...new Set(vals.filter(Boolean))];
  return {
    bulan: sortMonths(uniq(rows.map((r) => r.bulan))),
    tahun: uniq(rows.map((r) => r.tahun)).sort(),
    unit: uniq(rows.map((r) => r.unit)).sort(),
    kategori: uniq(rows.map((r) => r.kategori)).sort(),
  };
}

export function ggnFilterRows(rows: GgnRow[], f: GgnFilters): GgnRow[] {
  return rows.filter(
    (r) =>
      (f.bulan.length === 0 || f.bulan.includes(r.bulan)) &&
      (f.tahun.length === 0 || f.tahun.includes(r.tahun)) &&
      (f.unit.length === 0 || f.unit.includes(r.unit)) &&
      (f.kategori.length === 0 || f.kategori.includes(r.kategori)),
  );
}

export function ggnAggregate(rows: GgnRow[]) {
  const byKategori = [...countBy(rows, (r) => r.kategori).entries()].sort((a, b) => b[1] - a[1]);
  const byUnitKategori = countBy2(rows, (r) => r.unit, (r) => r.kategori);
  // trend: tahun → bulan → count
  const byTahunBulan = new Map<string, Map<string, number>>();
  const byTahunKategori = new Map<string, Map<string, number>>();
  const byTahun = countBy(rows, (r) => r.tahun);
  
  // additional for slides
  const byUnitBulan = new Map<string, Map<string, number>>();
  const currentYear = new Date().getFullYear().toString();
  const currentYearRows = rows.filter(r => r.tahun === currentYear);

  for (const r of rows) {
    if (!r.tahun || !r.bulan) continue;
    if (!byTahunBulan.has(r.tahun)) byTahunBulan.set(r.tahun, new Map());
    const mb = byTahunBulan.get(r.tahun)!;
    mb.set(r.bulan, (mb.get(r.bulan) ?? 0) + 1);

    if (!byTahunKategori.has(r.tahun)) byTahunKategori.set(r.tahun, new Map());
    const mk = byTahunKategori.get(r.tahun)!;
    mk.set(r.kategori, (mk.get(r.kategori) ?? 0) + 1);

    // for trend per unit (current year)
    if (r.tahun === currentYear && r.unit) {
      if (!byUnitBulan.has(r.unit)) byUnitBulan.set(r.unit, new Map());
      const mub = byUnitBulan.get(r.unit)!;
      mub.set(r.bulan, (mub.get(r.bulan) ?? 0) + 1);
    }
  }
  return { 
    byKategori, byUnitKategori, byTahunBulan, byTahunKategori, byTahun, 
    byUnitBulan, currentYear, currentYearRows,
    total: rows.length 
  };
}

export type AboRow = {
  no: string;
  upt: string;
  ultg: string;
  gardu_induk: string;
  jadwal_rencana: string;
  realisasi: string;
  status: string;
  jenis_anomali: string;
  status_fix: string;
};

export type AboFilters = {
  upt: string[];
  status: string[];
  jenis_anomali: string[];
  status_fix: string[];
};

export function aboAvailableFilters(rows: AboRow[]): AboFilters {
  const uniq = (vals: string[]) => [...new Set(vals.filter(Boolean))].sort();
  return {
    upt: uniq(rows.map((r) => r.upt)),
    status: uniq(rows.map((r) => r.status)),
    jenis_anomali: uniq(rows.map((r) => r.jenis_anomali)),
    status_fix: uniq(rows.map((r) => r.status_fix)),
  };
}

export function aboFilterRows(rows: AboRow[], f: AboFilters): AboRow[] {
  return rows.filter(
    (r) =>
      (f.upt.length === 0 || f.upt.includes(r.upt)) &&
      (f.status.length === 0 || f.status.includes(r.status)) &&
      (f.jenis_anomali.length === 0 || f.jenis_anomali.includes(r.jenis_anomali)) &&
      (f.status_fix.length === 0 || f.status_fix.includes(r.status_fix)),
  );
}

export function aboAggregate(rows: AboRow[]) {
  const total = rows.length;
  const closed = rows.filter((r) => (r.status_fix || "").toUpperCase() === "CLOSE").length;
  const open = total - closed;
  const progress = total > 0 ? Math.round((closed / total) * 10000) / 100 : 0;

  const byUpt = countBy2(rows, (r) => r.upt, (r) => r.status_fix);
  const byStatus = countBy(rows, (r) => r.status);
  const byAnomali = countBy(rows, (r) => r.jenis_anomali);
  const byAnomaliStatus = countBy2(rows, (r) => r.jenis_anomali, (r) => r.status_fix);
  const byUptAnomali = countBy2(rows, (r) => r.upt, (r) => r.jenis_anomali);
  const byUptAnomaliStatus = countBy3(rows, (r) => r.upt, (r) => r.jenis_anomali, (r) => r.status_fix);

  return {
    stats: { total, closed, open, progress },
    byUpt, byStatus, byAnomali, byAnomaliStatus, byUptAnomali, byUptAnomaliStatus,
  };
}
