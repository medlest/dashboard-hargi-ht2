"use client";

import { useMemo, useState } from "react";
import { Presentation } from "lucide-react";
import { Deck, DeckCover, DeckChartSlide, DeckContentSlide, DeckB as B, deckPct as fmtPct } from "@/components/slide-deck";
import {
  ggnAggregate, ggnAvailableFilters, ggnFilterRows, monthIndex,
  type GgnFilters, type GgnRow,
} from "@/lib/aggregate";
import { buildCategoryColors, PALETTE } from "@/lib/colors";
import { rankedBarOption, stackedBarOption, lineOption, simpleBarOption, type LineSeries } from "@/lib/echart-options";
import { MultiSelect } from "@/components/multi-select";
import { ChartCard } from "@/components/chart-card";
import { EChart, useChartTheme, type ChartTheme } from "@/components/echart";
import type { EChartsOption } from "echarts";

const EMPTY: GgnFilters = { bulan: [], tahun: [], unit: [], kategori: [] };
const YEAR_COLORS = ["#fbbf24", "#38bdf8", "#f87171", "#4ade80", "#c084fc", "#fb923c", "#2dd4bf"];

export function ParetoView({ rows }: { rows: GgnRow[] }) {
  const t = useChartTheme();
  const [sel, setSel] = useState<GgnFilters>(EMPTY);
  const [presenting, setPresenting] = useState(false);

  const available = useMemo(() => ggnAvailableFilters(rows), [rows]);
  const filtered = useMemo(() => ggnFilterRows(rows, sel), [rows, sel]);
  const agg = useMemo(() => ggnAggregate(filtered), [filtered]);
  const colorOf = useMemo(() => {
    const map = buildCategoryColors(available.kategori);
    return (cat: string) => map.get((cat || "").trim()) ?? "#94a3b8";
  }, [available.kategori]);

  const set = (k: keyof GgnFilters) => (v: string[]) => setSel((s) => ({ ...s, [k]: v }));

  // ===== Info tahun & bulan berjalan (dipakai cover deck, dihitung dari SEMUA data) =====
  const hero = useMemo(() => {
    const now = new Date();
    const curYear = String(now.getFullYear());
    const MONTHS_ID = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
    ];
    const curMonth = MONTHS_ID[now.getMonth()];
    const rowsYear = rows.filter((r) => (r.tahun ?? "").trim() === curYear);
    const rowsMonth = rowsYear.filter((r) => monthIndex(r.bulan) === now.getMonth() + 1);
    const top = (xs: GgnRow[], key: (r: GgnRow) => string) => {
      const m = new Map<string, number>();
      for (const r of xs) {
        const k = (key(r) ?? "").trim();
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      }
      const e = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      return e ? { name: e[0], count: e[1] } : null;
    };
    // distribusi bulanan tahun berjalan (buat slide deck)
    const mcount = new Map<string, number>();
    for (const r of rowsYear) {
      const b = (r.bulan ?? "").trim();
      if (b) mcount.set(b, (mcount.get(b) ?? 0) + 1);
    }
    const monthly = [...mcount.entries()]
      .map(([bulan, count]) => ({ bulan, count }))
      .sort((a, b) => monthIndex(a.bulan) - monthIndex(b.bulan));
    // trend per UPT tahun berjalan: bulan × unit
    const unitsYear = [...new Set(rowsYear.map((r) => r.unit).filter(Boolean))].sort();
    const perUnitMonthly = unitsYear.map((u) => ({
      unit: u,
      data: monthly.map(
        (m) => rowsYear.filter((r) => r.unit === u && monthIndex(r.bulan) === monthIndex(m.bulan)).length,
      ),
    }));
    // pembanding bulan sebelumnya
    const prevMonthLabel = now.getMonth() > 0 ? MONTHS_ID[now.getMonth() - 1] : null;
    const prevMonthCount = rowsYear.filter((r) => monthIndex(r.bulan) === now.getMonth()).length;
    // kejadian tahun berjalan urut tanggal terbaru (buat tabel slide)
    const parseTgl = (s: string) => {
      const m = (s ?? "").trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
      return m ? Date.parse(`${m[2]} ${m[1]}, 20${m[3]}`) : 0;
    };
    const rowsYearSorted = [...rowsYear].sort((a, b) => parseTgl(b.tgl_keluar) - parseTgl(a.tgl_keluar));
    return {
      curYear,
      curMonth,
      yearCount: rowsYear.length,
      monthCount: rowsMonth.length,
      topKatYear: top(rowsYear, (r) => r.kategori),
      topKatMonth: top(rowsMonth, (r) => r.kategori),
      topUnitYear: top(rowsYear, (r) => r.unit.replace(/^UPT /, "")),
      monthly,
      perUnitMonthly,
      rowsMonth,
      rowsYearSorted,
      prevMonthLabel,
      prevMonthCount,
    };
  }, [rows]);

  // ===== options ECharts (dipakai dashboard + deck) =====
  const pieOpt = rankedBarOption(
    t,
    agg.byKategori.map(([name, value]) => ({ name, value, color: colorOf(name) })),
  );

  const unitLabels = [...agg.byUnitKategori.keys()].sort((a, b) => {
    const sum = (u: string) => [...agg.byUnitKategori.get(u)!.values()].reduce((x, y) => x + y, 0);
    return sum(b) - sum(a);
  });
  const unitTotals = unitLabels.map((u) =>
    [...agg.byUnitKategori.get(u)!.values()].reduce((x, y) => x + y, 0));
  const kategoris = available.kategori.filter((k) =>
    [...agg.byUnitKategori.values()].some((m) => (m.get(k) ?? 0) > 0));
  const unitOpt = stackedBarOption(
    t,
    unitLabels.map((u) => u.replace(/^UPT /, "")),
    kategoris.map((cat) => ({
      name: cat,
      data: unitLabels.map((u) => agg.byUnitKategori.get(u)?.get(cat) ?? 0),
      color: colorOf(cat),
    })),
    { horizontal: true, totals: unitTotals, legendTop: false, showAllLabels: true },
  );

  const years = [...agg.byTahunBulan.keys()].sort();
  const allMonths = [...new Set(filtered.map((r) => r.bulan).filter(Boolean))]
    .sort((a, b) => monthIndex(a) - monthIndex(b));
  const trendOpt = lineOption(
    t,
    allMonths.map((m) => m.slice(0, 3)),
    years.map((y, i) => ({
      name: `Tahun ${y}`,
      data: allMonths.map((m) => agg.byTahunBulan.get(y)?.get(m) ?? 0),
      color: YEAR_COLORS[i % YEAR_COLORS.length],
    })),
  );

  const yoySeries: LineSeries[] = [
    {
      name: "TOTAL SELURUH GANGGUAN",
      data: years.map((y) => agg.byTahun.get(y) ?? 0),
      color: t.tickStrong,
      bold: true,
    },
    ...kategoris.map((cat) => ({
      name: cat,
      data: years.map((y) => agg.byTahunKategori.get(y)?.get(cat) ?? 0),
      color: colorOf(cat),
    })),
  ];
  const yoyOpt = lineOption(t, years, yoySeries);

  const tanggal = useMemo(
    () => new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    [],
  );

  const deckStats = {
    total: agg.total,
    units: unitLabels.length,
    years: years.length,
    yearRange: years.length ? `${years[0]}–${years[years.length - 1]}` : "—",
    topKategori: agg.byKategori[0]?.[0] ?? "—",
    topKategoriCount: agg.byKategori[0]?.[1] ?? 0,
  };

  // ===== Anotasi deck — fakta dihitung langsung dari data terfilter =====
  const topN = Math.min(3, agg.byKategori.length);
  const topNSum = agg.byKategori.slice(0, topN).reduce((s, [, c]) => s + c, 0);

  // puncak bulan-tahun tunggal + bulan terbanyak akumulatif
  let peak = { label: "—", count: 0 };
  const monthTotals = new Map<string, number>();
  for (const [y, mb] of agg.byTahunBulan)
    for (const [m, c] of mb) {
      monthTotals.set(m, (monthTotals.get(m) ?? 0) + c);
      if (c > peak.count) peak = { label: `${m} ${y}`, count: c };
    }
  const topMonth = [...monthTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  const lastYear = years[years.length - 1];
  const prevYear = years.length > 1 ? years[years.length - 2] : null;
  const lastCount = lastYear ? (agg.byTahun.get(lastYear) ?? 0) : 0;
  const prevCount = prevYear ? (agg.byTahun.get(prevYear) ?? 0) : 0;
  const topYear = [...agg.byTahun.entries()].sort((a, b) => b[1] - a[1])[0];

  const hasData = agg.total > 0;
  const kategoriNotes = hasData
    ? [
        <span key="a">
          Penyebab teratas: <B>{deckStats.topKategori}</B> — <B>{deckStats.topKategoriCount}</B> kejadian
          ({fmtPct(deckStats.topKategoriCount, agg.total)} dari {agg.total} gangguan).
        </span>,
        <span key="b">
          {topN} kategori teratas menyumbang <B>{fmtPct(topNSum, agg.total)}</B> dari seluruh gangguan tercatat.
        </span>,
      ]
    : undefined;
  const unitNotes = hasData
    ? [
        <span key="a">
          Unit dengan gangguan terbanyak: <B>{unitLabels[0]}</B> — <B>{unitTotals[0]}</B> kejadian
          ({fmtPct(unitTotals[0] ?? 0, agg.total)}).
        </span>,
        <span key="b">
          <B>{unitLabels.length}</B> unit tercatat · rata-rata{" "}
          <B>{(agg.total / Math.max(unitLabels.length, 1)).toLocaleString("id-ID", { maximumFractionDigits: 1 })}</B>{" "}
          gangguan per unit.
        </span>,
      ]
    : undefined;
  const bulananNotes =
    hasData && topMonth
      ? [
          <span key="a">
            Puncak tertinggi: <B>{peak.label}</B> — <B>{peak.count}</B> gangguan dalam satu bulan.
          </span>,
          <span key="b">
            Bulan terbanyak akumulatif: <B>{topMonth[0]}</B> — <B>{topMonth[1]}</B> gangguan sepanjang {deckStats.yearRange}.
          </span>,
        ]
      : undefined;
  const yoyNotes =
    hasData && topYear
      ? [
          prevYear ? (
            <span key="a">
              Tahun {lastYear} tercatat <B>{lastCount}</B> gangguan —{" "}
              {lastCount === prevCount ? (
                <>sama dengan {prevYear}</>
              ) : (
                <>
                  <B>{Math.abs(lastCount - prevCount)}</B> lebih {lastCount > prevCount ? "banyak" : "sedikit"} dari{" "}
                  {prevYear} ({prevCount})
                </>
              )}
              .
            </span>
          ) : (
            <span key="a">
              Data tersedia untuk tahun <B>{lastYear}</B> saja ({lastCount} gangguan).
            </span>
          ),
          <span key="b">
            Tahun dengan gangguan terbanyak: <B>{topYear[0]}</B> — <B>{topYear[1]}</B> kejadian.
          </span>,
        ]
      : undefined;

  // ===== Slide tahun & bulan berjalan + trend per UPT =====
  const curYearOpt = simpleBarOption(
    t,
    hero.monthly.map((m) => ({ name: m.bulan.slice(0, 3), value: m.count, color: "#f59e0b" })),
  );
  const uptTrendOpt = lineOption(
    t,
    hero.monthly.map((m) => m.bulan.slice(0, 3)),
    [
      {
        name: "TOTAL",
        data: hero.monthly.map((m) => m.count),
        color: t.tickStrong,
        bold: true,
      },
      ...hero.perUnitMonthly.map((u, i) => ({
        name: u.unit.replace(/^UPT /, ""),
        data: u.data,
        color: PALETTE[i % PALETTE.length],
      })),
    ],
  );
  const curYearNotes =
    hero.yearCount > 0
      ? [
          <span key="a">
            Tahun berjalan {hero.curYear}: <B>{hero.yearCount}</B> gangguan
            {hero.topKatYear && (
              <> · penyebab teratas <B>{hero.topKatYear.name}</B> ({hero.topKatYear.count})</>
            )}
            .
          </span>,
          hero.topUnitYear ? (
            <span key="b">
              Unit terbanyak {hero.curYear}: <B>{hero.topUnitYear.name}</B> — {hero.topUnitYear.count} gangguan
              ({fmtPct(hero.topUnitYear.count, hero.yearCount)}).
            </span>
          ) : (
            <span key="b">Belum ada data unit untuk {hero.curYear}.</span>
          ),
        ]
      : [<span key="a">Belum ada gangguan tercatat di tahun {hero.curYear}.</span>];
  const monthNotes = [
    <span key="a">
      Bulan berjalan {hero.curMonth} {hero.curYear}: <B>{hero.monthCount}</B> gangguan
      {hero.prevMonthLabel && (
        <> · bulan {hero.prevMonthLabel}: {hero.prevMonthCount}</>
      )}
      .
    </span>,
    hero.topKatMonth ? (
      <span key="b">
        Penyebab bulan ini: <B>{hero.topKatMonth.name}</B> — {hero.topKatMonth.count} kejadian.
      </span>
    ) : (
      <span key="b">Belum ada kategori penyebab tercatat bulan ini.</span>
    ),
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rise rise-1 relative z-40 flex flex-wrap items-center gap-2">
        <MultiSelect label="Bulan" options={available.bulan} selected={sel.bulan} onChange={set("bulan")} />
        <MultiSelect label="Tahun" options={available.tahun} selected={sel.tahun} onChange={set("tahun")} />
        <MultiSelect label="Unit" options={available.unit} selected={sel.unit} onChange={set("unit")} />
        <MultiSelect label="Kategori" options={available.kategori} selected={sel.kategori} onChange={set("kategori")} />
        <div className="ml-auto flex items-center gap-3">
          <span className="num text-xs text-ink-3">Total <b className="text-ink">{agg.total}</b> gangguan</span>
          <button
            type="button"
            onClick={() => setPresenting(true)}
            className="flex items-center gap-2 rounded-lg border border-edge px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Presentation className="h-4 w-4" /> Slide Deck
          </button>
        </div>
      </div>

      {/* Charts dashboard */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <ChartCard title="Kategori Penyebab Gangguan" badge={`${agg.total}`} className="rise rise-2 h-96 lg:col-span-2">
          <EChart key={`p-${t.key}`} option={pieOpt} />
        </ChartCard>
        <ChartCard title="Gangguan per Unit" className="rise rise-3 h-96 lg:col-span-3">
          <EChart key={`u-${t.key}`} option={unitOpt} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard title="Trend Gangguan Bulanan" className="rise rise-4 h-96">
          <EChart key={`tr-${t.key}`} option={trendOpt} />
        </ChartCard>
        <ChartCard title="Trend Gangguan Year-on-Year" className="rise rise-5 h-96">
          <EChart key={`yoy-${t.key}`} option={yoyOpt} />
        </ChartCard>
      </div>

      {/* Tabel rincian */}
      <section className="card rise rise-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="card-title">Rincian Data Gangguan</h3>
          <span className="num rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
            {filtered.length} data
          </span>
        </div>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-3">Tidak ada data untuk filter yang dipilih.</p>
        ) : (
          <div className="max-h-120 overflow-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-solid">
                <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-ink-3">
                  <th className="py-2 pr-3">Tgl Keluar</th>
                  <th className="px-3">Unit</th>
                  <th className="px-3">Gardu Induk</th>
                  <th className="px-3">Bay</th>
                  <th className="px-3">Kategori</th>
                  <th className="px-3">Sebab</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={`${r.no}-${i}`} className="border-b border-edge/50 transition-colors hover:bg-surface-2">
                    <td className="num whitespace-nowrap py-2 pr-3">{r.tgl_keluar}</td>
                    <td className="whitespace-nowrap px-3">{r.unit}</td>
                    <td className="px-3">{r.gardu}</td>
                    <td className="px-3">{r.nama_bay}</td>
                    <td className="whitespace-nowrap px-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: colorOf(r.kategori) }}
                      >
                        {r.kategori || "—"}
                      </span>
                    </td>
                    <td className="px-3 text-ink-2">{r.sebab}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {presenting && (
        <Deck
          onExit={() => setPresenting(false)}
          slides={[
            {
              key: "cover", label: "Cover",
              node: (
                <DeckCover
                  eyebrow="UIT Jawa Bagian Tengah · Hartrans 2 - Gardu Induk"
                  title={<>Trend Gangguan<br />Transformator <span className="num text-amber">{deckStats.yearRange}</span></>}
                  description={`Analisa kategori penyebab, distribusi per unit, dan trend tahunan gangguan trafo. Data live dari spreadsheet sumber · ${tanggal}.`}
                  stats={[
                    { label: "Total Gangguan", value: String(deckStats.total), sub: deckStats.yearRange },
                    { label: `Gangguan ${hero.curYear}`, value: String(hero.yearCount), sub: `bulan ${hero.curMonth}: ${hero.monthCount}` },
                    { label: `Top Gangguan ${hero.curYear}`, value: hero.topKatYear?.name ?? "—", sub: hero.topKatYear ? `${hero.topKatYear.count} kejadian` : undefined },
                    { label: `Unit Terbanyak ${hero.curYear}`, value: hero.topUnitYear?.name ?? "—", sub: hero.topUnitYear ? `${hero.topUnitYear.count} gangguan` : undefined },
                  ]}
                />
              ),
            },
            { key: "tahun-berjalan", label: "Tahun Berjalan", node: <DeckChartSlide no={2} total={8} eyebrow="Trend Gangguan Trafo · UIT JBT" title={`Tahun Berjalan ${hero.curYear}`} option={curYearOpt} chartKey={`dk-cy-${t.key}`} notes={curYearNotes} /> },
            { key: "upt-trend", label: "Trend per UPT", node: <DeckChartSlide no={3} total={8} eyebrow="Trend Gangguan Trafo · UIT JBT" title={`Trend per UPT · ${hero.curYear}`} option={uptTrendOpt} chartKey={`dk-ut-${t.key}`} notes={curYearNotes && hero.topUnitYear ? [curYearNotes[1]] : undefined} /> },
            {
              key: "kejadian-berjalan", label: "Kejadian Berjalan",
              node: (
                <DeckContentSlide
                  no={4} total={8}
                  eyebrow="Trend Gangguan Trafo · UIT JBT"
                  title={`Kejadian Tahun Berjalan ${hero.curYear}`}
                  notes={[
                    <span key="a">
                      Tahun berjalan {hero.curYear}: <B>{hero.yearCount}</B> gangguan · bulan {hero.curMonth}:{" "}
                      <B>{hero.monthCount}</B> (baris disorot amber).
                    </span>,
                    monthNotes[1],
                  ]}
                >
                  {hero.rowsYearSorted.length === 0 ? (
                    <p className="py-8 text-center text-sm text-ink-3">
                      Belum ada gangguan tercatat di tahun {hero.curYear}.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface-solid">
                        <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wider text-ink-3">
                          <th className="py-2 pr-3">Tgl Keluar</th>
                          <th className="px-3">Unit</th>
                          <th className="px-3">Gardu Induk</th>
                          <th className="px-3">Bay</th>
                          <th className="px-3">Kategori</th>
                          <th className="px-3">Sebab</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hero.rowsYearSorted.map((r, i) => {
                          const isCurMonth = monthIndex(r.bulan) === monthIndex(hero.curMonth);
                          return (
                            <tr
                              key={`${r.no}-${i}`}
                              className={`border-b border-edge/50 ${isCurMonth ? "bg-amber/10" : ""}`}
                            >
                              <td className="num whitespace-nowrap py-2 pr-3">
                                {r.tgl_keluar}
                                {isCurMonth && (
                                  <span className="num ml-2 rounded bg-amber/20 px-1.5 py-0.5 text-[10px] font-bold text-amber">
                                    bulan ini
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3">{r.unit}</td>
                              <td className="px-3">{r.gardu}</td>
                              <td className="px-3">{r.nama_bay}</td>
                              <td className="whitespace-nowrap px-3">
                                <span
                                  className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                                  style={{ backgroundColor: colorOf(r.kategori) }}
                                >
                                  {r.kategori || "—"}
                                </span>
                              </td>
                              <td className="px-3 text-ink-2">{r.sebab || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </DeckContentSlide>
              ),
            },
            { key: "kategori", label: "Kategori Penyebab", node: <DeckChartSlide no={5} total={8} eyebrow="Trend Gangguan Trafo · UIT JBT" title="Kategori Penyebab Gangguan" option={pieOpt} chartKey={`dk-p-${t.key}`} notes={kategoriNotes} /> },
            { key: "unit", label: "Gangguan per Unit", node: <DeckChartSlide no={6} total={8} eyebrow="Trend Gangguan Trafo · UIT JBT" title="Gangguan per Unit" option={unitOpt} chartKey={`dk-u-${t.key}`} notes={unitNotes} /> },
            { key: "bulanan", label: "Trend Bulanan", node: <DeckChartSlide no={7} total={8} eyebrow="Trend Gangguan Trafo · UIT JBT" title="Trend Bulanan" option={trendOpt} chartKey={`dk-t-${t.key}`} notes={bulananNotes} /> },
            { key: "yoy", label: "Trend Year-on-Year", node: <DeckChartSlide no={8} total={8} eyebrow="Trend Gangguan Trafo · UIT JBT" title="Trend Year-on-Year" option={yoyOpt} chartKey={`dk-y-${t.key}`} notes={yoyNotes} /> },
          ]}
        />
      )}
    </div>
  );
}
