"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ggnAggregate, ggnAvailableFilters, ggnFilterRows, monthIndex,
  type GgnFilters, type GgnRow,
} from "@/lib/aggregate";
import { buildCategoryColors } from "@/lib/colors";
import { pieOption, stackedBarOption, lineOption, type LineSeries } from "@/lib/echart-options";
import { MultiSelect } from "@/components/multi-select";
import { ChartCard } from "@/components/chart-card";
import { EChart, useChartTheme } from "@/components/echart";

const EMPTY: GgnFilters = { bulan: [], tahun: [], unit: [], kategori: [] };
const YEAR_COLORS = ["#fbbf24", "#38bdf8", "#f87171", "#4ade80", "#c084fc", "#fb923c", "#2dd4bf"];

export function ParetoView({ rows }: { rows: GgnRow[] }) {
  const t = useChartTheme();
  const [sel, setSel] = useState<GgnFilters>(EMPTY);

  const available = useMemo(() => ggnAvailableFilters(rows), [rows]);
  const filtered = useMemo(() => ggnFilterRows(rows, sel), [rows, sel]);
  const agg = useMemo(() => ggnAggregate(filtered), [filtered]);
  const colorOf = useMemo(() => {
    const map = buildCategoryColors(available.kategori);
    return (cat: string) => map.get((cat || "").trim()) ?? "#94a3b8";
  }, [available.kategori]);

  const set = (k: keyof GgnFilters) => (v: string[]) => setSel((s) => ({ ...s, [k]: v }));

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

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rise rise-1 relative z-40 flex flex-wrap items-center gap-2">
        <MultiSelect label="Unit" options={available.unit} selected={sel.unit} onChange={set("unit")} />
        <MultiSelect label="Bulan" options={available.bulan} selected={sel.bulan} onChange={set("bulan")} />
        <MultiSelect label="Tahun" options={available.tahun} selected={sel.tahun} onChange={set("tahun")} />
        <MultiSelect label="Kategori" options={available.kategori} selected={sel.kategori} onChange={set("kategori")} />
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
    </div>
  );
}
