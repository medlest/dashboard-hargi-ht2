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

export function ceFilterRows(rows: CeRow[], f: CeFilters): CeRow[] {
  return rows.filter(
    (r) =>
      (f.upt.length === 0 || f.upt.includes(r.upt)) &&
      (f.sub_bidang.length === 0 || f.sub_bidang.includes(r.sub_bidang)) &&
      (f.level_anomali.length === 0 || f.level_anomali.includes(r.level_anomali)) &&
      (f.kondisi_akhir.length === 0 || f.kondisi_akhir.includes(r.kondisi_akhir)),
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

export function ceAggregate(rows: CeRow[]) {
  const total = rows.length;
  const closed = rows.filter((r) => isClosed(r.kondisi_akhir)).length;
  const open = rows.filter((r) => isOpen(r.kondisi_akhir)).length;
  const progress = total > 0 ? Math.round((closed / total) * 10000) / 100 : 0;

  const kaSummary = countBy(rows, (r) => r.kondisi_akhir);
  const kondisiTerkini = countBy(rows, (r) => r.kondisi_terkini);
  const byUpt = countBy2(rows, (r) => r.upt, (r) => r.kondisi_akhir);
  const bySubBidang = countBy2(rows, (r) => r.sub_bidang, (r) => r.kondisi_akhir);
  const byLevel = countBy2(rows, (r) => r.level_anomali, (r) => r.kondisi_akhir);
  const uraianTop = [...countBy(rows, (r) => r.uraian).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const byLevelUraian = countBy2(rows, (r) => r.level_anomali, (r) => r.uraian);

  // Tabel ringkasan level anomali: breakdown VG/G/F/P/C per level
  const levelSummary = [...byLevel.entries()]
    .map(([level, conds]) => {
      const pick = (p: string) =>
        [...conds.entries()].filter(([k]) => k.includes(p)).reduce((s, [, c]) => s + c, 0);
      const vg = pick("1-"), g = pick("2-"), f = pick("3-"), p = pick("4-"), c = pick("5-");
      return { level, vg, g, f, p, c, total: vg + g + f + p + c };
    })
    .sort((a, b) => b.total - a.total);

  // Tabel ringkasan UPT: pecah per kondisi (VG/G/F/P/C) + total
  const uptSummary = [...byUpt.entries()]
    .map(([name, conds]) => {
      const pick = (p: string) =>
        [...conds.entries()].filter(([k]) => k.includes(p)).reduce((s, [, c]) => s + c, 0);
      const vg = pick("1-"), g = pick("2-"), f = pick("3-"), p = pick("4-"), c = pick("5-");
      return { name, vg, g, f, p, c, total: vg + g + f + p + c };
    })
    .sort((a, b) => b.total - a.total);

  return {
    stats: { total, closed, open, progress },
    kaSummary, kondisiTerkini, byUpt, bySubBidang, byLevel,
    uraianTop, byLevelUraian, levelSummary, uptSummary,
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
  for (const r of rows) {
    if (!r.tahun || !r.bulan) continue;
    if (!byTahunBulan.has(r.tahun)) byTahunBulan.set(r.tahun, new Map());
    const mb = byTahunBulan.get(r.tahun)!;
    mb.set(r.bulan, (mb.get(r.bulan) ?? 0) + 1);
    if (!byTahunKategori.has(r.tahun)) byTahunKategori.set(r.tahun, new Map());
    const mk = byTahunKategori.get(r.tahun)!;
    mk.set(r.kategori, (mk.get(r.kategori) ?? 0) + 1);
  }
  return { byKategori, byUnitKategori, byTahunBulan, byTahunKategori, byTahun, total: rows.length };
}
