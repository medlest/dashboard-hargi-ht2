"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Presentation } from "lucide-react";
import {
  ggnAggregate, ggnAvailableFilters, ggnFilterRows, monthIndex, sortMonths,
  type GgnFilters, type GgnRow,
} from "@/lib/aggregate";
import { buildCategoryColors } from "@/lib/colors";
import {
  pieOption, stackedBarOption, lineOption, groupedBarOption, simpleBarOption, paretoOption, type LineSeries
} from "@/lib/echart-options";
import { MultiSelect } from "@/components/multi-select";
import { ChartCard } from "@/components/chart-card";
import { EChart, useChartTheme } from "@/components/echart";
import { Deck, DeckCover, DeckChartSlide, DeckContentSlide, DeckB, deckPct } from "@/components/slide-deck";

const EMPTY: GgnFilters = { bulan: [], tahun: [], unit: [], kategori: [] };
const YEAR_COLORS = ["#fbbf24", "#38bdf8", "#f87171", "#4ade80", "#c084fc", "#fb923c", "#2dd4bf"];

export function ParetoView({ rows }: { rows: GgnRow[] }) {
  const t = useChartTheme();
  const [sel, setSel] = useState<GgnFilters>(EMPTY);
  const [showDeck, setShowDeck] = useState(false);

  const available = useMemo(() => ggnAvailableFilters(rows), [rows]);
  const filtered = useMemo(() => ggnFilterRows(rows, sel), [rows, sel]);
  const agg = useMemo(() => ggnAggregate(filtered), [filtered]);
  const colorOf = useMemo(() => {
    const map = buildCategoryColors(available.kategori);
    return (cat: string) => map.get((cat || "").trim()) ?? "#94a3b8";
  }, [available.kategori]);

  const set = (k: keyof GgnFilters) => (v: string[]) => setSel((s) => ({ ...s, [k]: v }));

  // Metadata waktu
  const now = new Date();
  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  const curMonth = monthNames[now.getMonth()];
  const curYear = now.getFullYear().toString();

  const totalYear = useMemo(() => filtered.filter(r => r.tahun === curYear).length, [filtered, curYear]);
  const totalMonth = useMemo(() => filtered.filter(r => r.tahun === curYear && r.bulan.toUpperCase() === curMonth).length, [filtered, curYear, curMonth]);

  // ===== options ECharts (dipakai dashboard) =====
  const pieOpt = pieOption(
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

  const groupedUnitOpt = groupedBarOption(
    t,
    unitLabels.map((u) => u.replace(/^UPT /, "")),
    kategoris.map((cat) => ({
      name: cat,
      data: unitLabels.map((u) => agg.byUnitKategori.get(u)?.get(cat) ?? 0),
      color: colorOf(cat),
    })),
    { horizontal: false }
  );

  const years = [...agg.byTahunBulan.keys()].sort();
  const allMonths = sortMonths([...new Set(filtered.map((r) => r.bulan).filter(Boolean))]);
  
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

  // Pareto Options for Slides
  const catParetoOpt = useMemo(() => paretoOption(t, agg.byKategori.map(([name, value]) => ({ name, value, color: colorOf(name) }))), [t, agg.byKategori, colorOf]);
  const unitParetoOpt = useMemo(() => paretoOption(t, unitLabels.map((name, i) => ({ name: name.replace(/^UPT /, ""), value: unitTotals[i], color: "#38bdf8" }))), [t, unitLabels, unitTotals]);

  // ===== Slide Deck Slides =====
  const slides = useMemo(() => [
    {
      key: "cover",
      label: "Cover",
      node: (
        <DeckCover
          eyebrow="Trend Gangguan Trafo"
          title={<>Laporan Analisis <br/> Gangguan Transforamator</>}
          description="Ringkasan eksekutif trend gangguan per kategori, unit, dan periode berjalan."
          stats={[
            { label: "Total Gangguan", value: `${agg.total}` },
            { label: `Tahun ${curYear}`, value: `${totalYear}`, sub: "kejadian" },
            { label: `${curMonth} ${curYear}`, value: `${totalMonth}`, sub: "bulan berjalan" },
          ]}
        />
      ),
    },
    {
      key: "cur-year",
      label: "Tahun Berjalan",
      node: (
        <DeckChartSlide
          no={2} total={8} eyebrow="Periode Berjalan"
          title={`Kejadian di Tahun ${curYear}`}
          chartKey="c-cur"
          option={simpleBarOption(t, allMonths.map(m => ({
            name: m,
            value: agg.byTahunBulan.get(curYear)?.get(m) ?? 0,
            color: m.toUpperCase() === curMonth ? "#fbbf24" : "#38bdf8"
          })))}
          notes={[
            <>Bulan <DeckB>{curMonth}</DeckB> tercatat <DeckB>{totalMonth}</DeckB> kejadian gangguan.</>,
            <>Total gangguan di tahun <DeckB>{curYear}</DeckB> mencapai <DeckB>{totalYear}</DeckB> baris data.</>
          ]}
        />
      ),
    },
    {
      key: "upt-trend",
      label: "Trend per UPT",
      node: (
        <DeckChartSlide
          no={3} total={8} eyebrow="Breakdown Unit"
          title={`Trend Bulanan per UPT (${curYear})`}
          chartKey="c-upt-trend"
          option={lineOption(
            t,
            allMonths.map(m => m.slice(0, 3)),
            [
              {
                name: "TOTAL UIT JBT",
                data: allMonths.map(m => agg.byTahunBulan.get(curYear)?.get(m) ?? 0),
                color: t.tickStrong,
                bold: true
              },
              ...[...agg.byUnitBulan.keys()].sort().map((u, i) => ({
                name: u.replace(/^UPT /, ""),
                data: allMonths.map(m => agg.byUnitBulan.get(u)?.get(m) ?? 0),
                color: YEAR_COLORS[i % YEAR_COLORS.length]
              }))
            ]
          )}
          notes={[
            <>Garis putih tebal menunjukkan <DeckB>Total UIT JBT</DeckB> di tahun berjalan.</>
          ]}
        />
      ),
    },
    {
      key: "events",
      label: "Kejadian Tahun Berjalan",
      node: (
        <DeckContentSlide
          no={4} total={8} eyebrow="Rincian Data"
          title={`Daftar Kejadian ${curYear}`}
          notes={[
            <>Baris dengan warna <DeckB>Amber</DeckB> menunjukkan kejadian di bulan berjalan ({curMonth}).</>
          ]}
        >
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface-solid">
              <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wider text-ink-3">
                <th className="py-2">Tgl</th>
                <th className="px-3">Unit</th>
                <th className="px-3">Gardu Induk</th>
                <th className="px-3">Kategori</th>
                <th className="px-3">Sebab</th>
              </tr>
            </thead>
            <tbody>
              {agg.currentYearRows.map((r, i) => (
                <tr key={i} className={`border-b border-edge/40 ${r.bulan.toUpperCase() === curMonth ? "bg-amber/10" : ""}`}>
                  <td className="num py-2 whitespace-nowrap">{r.tgl_keluar}</td>
                  <td className="px-3 whitespace-nowrap">{r.unit.replace(/^UPT /, "")}</td>
                  <td className="px-3">{r.gardu}</td>
                  <td className="px-3">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: colorOf(r.kategori) }}>
                      {r.kategori}
                    </span>
                  </td>
                  <td className="px-3 text-ink-2">{r.sebab}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DeckContentSlide>
      ),
    },
    {
      key: "cat",
      label: "Kategori",
      node: (
        <DeckChartSlide
          no={5} total={8} eyebrow="Analisis Sebab"
          title="Pareto Kategori Penyebab"
          chartKey="c-cat"
          option={catParetoOpt}
          notes={[
            <><DeckB>{agg.byKategori[0]?.[0] || "—"}</DeckB> merupakan penyebab utama dengan <DeckB>{deckPct(agg.byKategori[0]?.[1] || 0, agg.total)}</DeckB> dari total gangguan.</>
          ]}
        />
      ),
    },
    {
      key: "unit",
      label: "Per Unit",
      node: (
        <DeckChartSlide
          no={6} total={8} eyebrow="Analisis Lokasi"
          title="Pareto Gangguan per Unit"
          chartKey="c-unit"
          option={unitParetoOpt}
          notes={[
            <>Unit dengan gangguan terbanyak adalah <DeckB>{unitLabels[0] || "—"}</DeckB> (<DeckB>{unitTotals[0] || 0}</DeckB> kejadian).</>
          ]}
        />
      ),
    },
    {
      key: "trend",
      label: "Trend Bulanan",
      node: (
        <DeckChartSlide
          no={7} total={8} eyebrow="Analisis Waktu"
          title="Trend Gangguan Bulanan"
          chartKey="c-trend"
          option={trendOpt}
        />
      ),
    },
    {
      key: "yoy",
      label: "Year-on-Year",
      node: (
        <DeckChartSlide
          no={8} total={8} eyebrow="Analisis Tahunan"
          title="Trend Year-on-Year (YoY)"
          chartKey="c-yoy"
          option={yoyOpt}
        />
      ),
    },
  ], [agg, curYear, curMonth, totalYear, totalMonth, t, colorOf, allMonths, unitLabels, unitTotals, catParetoOpt, unitParetoOpt, trendOpt, yoyOpt]);

  return (
    <div className="space-y-4">
      {showDeck && <Deck slides={slides} onExit={() => setShowDeck(false)} />}

      {/* Filter bar */}
      <div className="rise rise-1 relative z-40 flex flex-wrap items-center gap-2">
        <MultiSelect label="Unit" options={available.unit} selected={sel.unit} onChange={set("unit")} />
        <MultiSelect label="Bulan" options={available.bulan} selected={sel.bulan} onChange={set("bulan")} />
        <MultiSelect label="Tahun" options={available.tahun} selected={sel.tahun} onChange={set("tahun")} />
        <MultiSelect label="Kategori" options={available.kategori} selected={sel.kategori} onChange={set("kategori")} />
        
        <button
          onClick={() => setShowDeck(true)}
          className="ml-2 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-3 hover:text-ink transition-colors"
        >
          <Presentation className="h-4 w-4" /> Slide Deck
        </button>

        <div className="ml-auto flex items-center gap-3">
          <span className="num text-xs text-ink-3">Total <b className="text-ink">{agg.total}</b> gangguan</span>
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

      <div className="grid grid-cols-1 gap-3">
        <ChartCard title="Rincian Kategori per Unit (Grouped)" className="rise rise-4 h-96">
          <EChart key={`gu-${t.key}`} option={groupedUnitOpt} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard title="Trend Gangguan Bulanan" className="rise rise-5 h-96">
          <EChart key={`tr-${t.key}`} option={trendOpt} />
        </ChartCard>
        <ChartCard title="Trend Gangguan Year-on-Year" className="rise rise-6 h-96">
          <EChart key={`yoy-${t.key}`} option={yoyOpt} />
        </ChartCard>
      </div>

      {/* Tabel rincian */}
      <section className="card rise rise-7 p-4">
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
    </div>
  );
}
