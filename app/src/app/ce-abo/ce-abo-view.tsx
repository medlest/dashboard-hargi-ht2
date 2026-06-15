"use client";

import { useMemo, useState } from "react";
import { Presentation } from "lucide-react";
import {
  ceAggregate, ceAvailableFilters, ceFilterRows,
  type CeFilters, type CeRow,
} from "@/lib/aggregate";
import { conditionColor, PALETTE } from "@/lib/colors";
import { pieOption, groupedBarOption, simpleBarOption, hbarOption } from "@/lib/echart-options";
import { MultiSelect } from "@/components/multi-select";
import { ChartCard } from "@/components/chart-card";
import { HeroCE } from "./hero-ce";
import { EChart, useChartTheme } from "@/components/echart";
import { Deck, DeckCover, DeckChartSlide, DeckContentSlide, DeckB, deckPct } from "@/components/slide-deck";

const EMPTY: CeFilters = { upt: [], sub_bidang: [], level_anomali: [], kondisi_akhir: [] };

export function CeAboView({ rows }: { rows: CeRow[] }) {
  const t = useChartTheme();
  const [sel, setSel] = useState<CeFilters>(EMPTY);
  const [showDeck, setShowDeck] = useState(false);

  // Pisahkan temuan aktif dari populasi penuh
  const findings = useMemo(() => 
    rows.filter(r => ["OPEN", "CLOSE"].includes((r.status_terkini || "").toUpperCase())),
    [rows]
  );

  const available = useMemo(() => ceAvailableFilters(findings), [findings]);
  const filtered = useMemo(() => ceFilterRows(findings, sel), [findings, sel]);
  const agg = useMemo(() => ceAggregate(filtered), [filtered]);

  const set = (k: keyof CeFilters) => (v: string[]) => setSel((s) => ({ ...s, [k]: v }));

  // Hero: agregat dari baris temuan yang lolos filter SELAIN level
  const heroAgg = useMemo(
    () => ceAggregate(ceFilterRows(findings, { ...sel, level_anomali: [] })),
    [findings, sel],
  );
  const activeLevel = sel.level_anomali.length === 1 ? sel.level_anomali[0] : null;
  
  const toggleLevel = (lvl: string) => {
    setSel(s => ({ ...s, level_anomali: activeLevel === lvl ? [] : [lvl] }));
  };

  // Khusus chart TARGET AWAL: ambil data dari semua level
  // tapi tetap merespon filter UPT/SubBidang/KA yang dipilih.
  const targetAwalAgg = useMemo(
    () => ceAggregate(ceFilterRows(rows, { ...sel, level_anomali: [] })),
    [rows, sel],
  );

  // ===== options ECharts =====
  const condSlices = (m: Map<string, number>) => {
    const categories = ["Critical", "Poor", "Fair", "Good", "Very Good"];
    return categories.map(name => ({
      name,
      value: m.get(name) ?? 0,
      color: conditionColor(name)
    }));
  };

  const toGrouped = (dist: Map<string, Map<string, number>>) => {
    const labels = [...dist.keys()].sort((a, b) => {
      const sum = (m: Map<string, number>) => [...m.values()].reduce((x, y) => x + y, 0);
      return sum(dist.get(b)!) - sum(dist.get(a)!);
    });
    const conds = ["Very Good", "Good", "Fair", "Poor", "Critical"];
    return groupedBarOption(
      t,
      labels,
      conds.map((c) => ({
        name: c,
        data: labels.map((l) => dist.get(l)?.get(c) ?? 0),
        color: conditionColor(c),
      })),
    );
  };

  const toGroupedH = (dist: Map<string, Map<string, number>>) => {
    const labels = [...dist.keys()].sort((a, b) => {
      const sum = (m: Map<string, number>) => [...m.values()].reduce((x, y) => x + y, 0);
      return sum(dist.get(b)!) - sum(dist.get(a)!);
    });
    const conds = ["Very Good", "Good", "Fair", "Poor", "Critical"];
    return groupedBarOption(
      t,
      labels.map((l) => l.replace(/^UPT /, "")),
      conds.map((c) => ({
        name: c,
        data: labels.map((l) => dist.get(l)?.get(c) ?? 0),
        color: conditionColor(c),
      })),
      { horizontal: true },
    );
  };

  const uraianTop = agg.uraianTop;
  const uraianLevelLabels = [...agg.byLevelUraian.keys()].sort();
  const uraianAll = [...new Set([...agg.byLevelUraian.values()].flatMap((m) => [...m.keys()]))].sort();

  // ===== Slide Deck Slides =====
  const slides = useMemo(() => [
    {
      key: "summary",
      label: "Summary",
      node: (
        <DeckCover
          eyebrow="CE Next Level 2026"
          title={<>Monitoring Temuan <br/> Common Enemy</>}
          description="Status penanganan anomali HARGI di lingkungan UIT Jawa Bagian Tengah."
          stats={[
            { label: "Total Temuan", value: `${agg.stats.total}` },
            { label: "OPEN", value: `${agg.stats.open}` },
            { label: "CLOSE", value: `${agg.stats.closed}` },
            { label: "Progres", value: `${agg.stats.progress}%` },
          ]}
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Target Awal vs Kondisi Terkini" className="h-[28rem]">
              <div className="grid h-full grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-3 text-center mb-1">Target Awal</div>
                  <EChart key={`s-ka-${t.key}`} option={pieOption(t, condSlices(targetAwalAgg.kondisiAwal))} />
                </div>
                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-3 text-center mb-1">Kondisi Terkini</div>
                  <EChart key={`s-kt-${t.key}`} option={pieOption(t, condSlices(agg.kondisiTerkini))} />
                </div>
              </div>
            </ChartCard>
            
            <ChartCard title="Distribusi Level Anomali (Target)" className="h-[28rem]">
              <EChart key={`s-lvl-${t.key}`} option={toGrouped(agg.byLevel)} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Kondisi Akhir per Sub Bidang" className="h-96">
              <EChart key={`s-sb-${t.key}`} option={simpleBarOption(t, condSlices(agg.kaSummary), { horizontal: true })} />
            </ChartCard>
            <ChartCard title="Grafik Kondisi Akhir per UPT" className="h-96">
              <EChart key={`s-upt-h-${t.key}`} option={toGroupedH(agg.byUpt)} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Top 15 Uraian Anomali" className="h-[32rem]">
              <EChart key={`s-ur-${t.key}`} option={hbarOption(t, uraianTop.map(([u]) => u), uraianTop.map(([, c]) => c), "#6366f1")} />
            </ChartCard>
            <ChartCard title="Fokus Pengerjaan (Uraian OPEN)" className="h-[32rem]">
              <EChart key={`s-focus-${t.key}`} option={hbarOption(t, agg.focusUraian.map(([u]) => u), agg.focusUraian.map(([, c]) => c), "#ef4444")} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Progres Penyelesaian per UPT">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wider text-ink-3">
                    <th className="py-3">UPT</th>
                    <th className="px-3 text-center">Total</th>
                    <th className="px-3 text-center">Close</th>
                    <th className="pl-3 text-right">Progres %</th>
                  </tr>
                </thead>
                <tbody>
                  {[...agg.uptSummary].sort((a, b) => b.progress - a.progress).map((u, i) => (
                    <tr key={i} className="border-b border-edge/40">
                      <td className="py-3 font-medium">{u.name}</td>
                      <td className="num px-3 text-center">{u.total}</td>
                      <td className="num px-3 text-center text-emerald-500">{u.vg + u.g}</td>
                      <td className="pl-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="num w-12 font-bold">{u.progress}%</div>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                            <div className="h-full bg-emerald-500" style={{ width: `${u.progress}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ChartCard>

            <ChartCard title="Rincian Masalah per Level Anomali">
               <div className="h-[30rem]">
                <EChart
                  key={`s-url-${t.key}`}
                  option={groupedBarOption(
                    t,
                    uraianLevelLabels,
                    uraianAll.map((u, i) => ({
                      name: u,
                      data: uraianLevelLabels.map((l) => agg.byLevelUraian.get(l)?.get(u) ?? 0),
                      color: PALETTE[i % PALETTE.length],
                    })),
                  )}
                />
               </div>
            </ChartCard>
          </div>

          <ChartCard title="Daftar Temuan Prioritas (OPEN)">
            <div className="max-h-120 overflow-auto scrollbar-thin">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-surface-solid">
                  <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-ink-3">
                    <th className="py-2 pr-3">Kode</th>
                    <th className="px-3">UPT</th>
                    <th className="px-3">Gardu Induk</th>
                    <th className="px-3">Uraian</th>
                    <th className="pl-3 text-right">Kondisi</th>
                  </tr>
                </thead>
                <tbody>
                  {agg.priorityList.map((r, i) => (
                    <tr key={i} className="border-b border-edge/40 transition-colors hover:bg-surface-2">
                      <td className="num py-2 pr-3 font-medium text-accent">{r.kode}</td>
                      <td className="px-3 whitespace-nowrap">{r.upt.replace(/^UPT /, "")}</td>
                      <td className="px-3">{r.gardu_induk}</td>
                      <td className="px-3">{r.uraian}</td>
                      <td className="pl-3 text-right whitespace-nowrap font-bold" style={{ color: conditionColor(r.kondisi_akhir) }}>
                        {r.kondisi_akhir}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </DeckCover>
      ),
    },
  ], [agg, t, targetAwalAgg, uraianTop, uraianLevelLabels, uraianAll]);

  return (
    <div className="space-y-4">
      {showDeck && <Deck slides={slides} onExit={() => setShowDeck(false)} />}

      {/* Filter bar */}
      <div className="rise rise-1 relative z-40 flex flex-wrap items-center gap-2">
        <MultiSelect label="UPT" options={available.upt} selected={sel.upt} onChange={set("upt")} />
        <MultiSelect label="Sub Bidang" options={available.sub_bidang} selected={sel.sub_bidang} onChange={set("sub_bidang")} />
        <MultiSelect label="Level Anomali" options={available.level_anomali} selected={sel.level_anomali} onChange={set("level_anomali")} />
        <MultiSelect label="Kondisi Akhir" options={available.kondisi_akhir} selected={sel.kondisi_akhir} onChange={set("kondisi_akhir")} />
        
        <button
          onClick={() => setShowDeck(true)}
          className="ml-2 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-surface-3 hover:text-ink transition-colors"
        >
          <Presentation className="h-4 w-4" /> Slide Deck
        </button>

        <div className="ml-auto flex items-center gap-3">
          <span className="num text-xs text-ink-3">{filtered.length} / {rows.length} temuan</span>
        </div>
      </div>

      {/* Hero CE — total + panel per Level Anomali (klik = filter) */}
      <div className="rise rise-2">
        <HeroCE
          stats={heroAgg.stats}
          levels={heroAgg.levelSummary.map((l) => ({
            level: l.level,
            total: l.total,
            close: l.vg + l.g,
            open: l.f + l.p + l.c,
          }))}
          active={activeLevel}
          onToggle={toggleLevel}
        />
      </div>

      {/* Pie */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <ChartCard title="TARGET AWAL" className="rise rise-5 col-span-2 min-h-80 lg:col-span-2">
          <EChart key={`ka-${t.key}`} option={pieOption(t, condSlices(targetAwalAgg.kondisiAwal))} />
        </ChartCard>

        <ChartCard title="Kondisi Terkini (Current)" className="rise rise-5 col-span-2 min-h-72 lg:col-span-4">
          <div className="grid h-full grid-cols-1 items-center gap-3 sm:grid-cols-2">
            <div className="h-64">
              <EChart key={`kt-${t.key}`} option={pieOption(t, condSlices(agg.kondisiTerkini))} />
            </div>
            {/* tabel mini level anomali */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-ink-3">
                    <th className="py-1.5 pr-2">Level Anomali</th>
                    <th className="px-1.5 text-center text-blue-500">Very Good</th>
                    <th className="px-1.5 text-center text-emerald-500">Good</th>
                    <th className="px-1.5 text-center text-amber-500">Fair</th>
                    <th className="px-1.5 text-center text-red-400">Poor</th>
                    <th className="px-1.5 text-center text-red-700">Critical</th>
                    <th className="px-1.5 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {agg.levelSummary.map((l) => (
                    <tr key={l.level} className="border-b border-edge/50">
                      <td className="py-1.5 pr-2 font-medium">{l.level}</td>
                      <td className="num px-1.5 text-center text-blue-500">{l.vg}</td>
                      <td className="num px-1.5 text-center text-emerald-500">{l.g}</td>
                      <td className="num px-1.5 text-center text-amber-500">{l.f}</td>
                      <td className="num px-1.5 text-center text-red-400">{l.p}</td>
                      <td className="num px-1.5 text-center text-red-700">{l.c}</td>
                      <td className="num px-1.5 text-center font-bold">{l.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-[11px] font-bold">
                    <td className="py-1.5 pr-2">TOTAL</td>
                    <td colSpan={5} className="px-1.5 text-right text-[10px] font-normal italic text-ink-3">
                      rincian per kategori
                    </td>
                    <td className="num px-1.5 text-center">{agg.stats.total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Distribusi level anomali + sub bidang */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="Distribusi Level Anomali (Target)" className="rise rise-3 h-80">
          <EChart key={`lvl-${t.key}`} option={toGrouped(agg.byLevel)} />
        </ChartCard>
        <ChartCard title="Kondisi Akhir per Sub Bidang" className="rise rise-4 h-80">
          <EChart key={`sb-${t.key}`} option={simpleBarOption(t, condSlices(agg.kaSummary), { horizontal: true })} />
        </ChartCard>
      </div>

      {/* UPT: tabel + grafik */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <ChartCard title="Ringkasan per UPT" className="rise rise-3 lg:col-span-2">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-ink-3">
                  <th className="py-2 pr-2">UPT</th>
                  <th className="px-2 text-center text-blue-500">Very Good</th>
                  <th className="px-2 text-center text-emerald-500">Good</th>
                  <th className="px-2 text-center text-amber-500">Fair</th>
                  <th className="px-2 text-center text-red-400">Poor</th>
                  <th className="px-2 text-center text-red-700">Critical</th>
                  <th className="px-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {agg.uptSummary.map((u) => (
                  <tr key={u.name} className="border-b border-edge/50 transition-colors hover:bg-surface-2">
                    <td className="py-2 pr-2 font-medium">{u.name}</td>
                    <td className="num px-2 text-center text-blue-500">{u.vg}</td>
                    <td className="num px-2 text-center text-emerald-500">{u.g}</td>
                    <td className="num px-2 text-center text-amber-500">{u.f}</td>
                    <td className="num px-2 text-center text-red-400">{u.p}</td>
                    <td className="num px-2 text-center text-red-700">{u.c}</td>
                    <td className="num px-2 text-center font-bold">{u.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
        <ChartCard title="Grafik Kondisi Akhir per UPT" className="rise rise-4 h-[36rem] lg:col-span-3">
          <EChart key={`upt-${t.key}`} option={toGroupedH(agg.byUpt)} />
        </ChartCard>
      </div>

      {/* Uraian anomali — sampingan biar hemat space */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <ChartCard title="Distribusi per Uraian Anomali" badge={`${uraianTop.length} jenis`} className="rise rise-5 h-96">
        <EChart
          key={`ur-${t.key}`}
          option={hbarOption(t, uraianTop.map(([u]) => u), uraianTop.map(([, c]) => c), "#6366f1")}
        />
      </ChartCard>

      <ChartCard title="Rincian Uraian Masalah per Level Anomali" className="rise rise-6 h-96">
        <EChart
          key={`url-${t.key}`}
          option={groupedBarOption(
            t,
            uraianLevelLabels,
            uraianAll.map((u, i) => ({
              name: u,
              data: uraianLevelLabels.map((l) => agg.byLevelUraian.get(l)?.get(u) ?? 0),
              color: PALETTE[i % PALETTE.length],
            })),
          )}
        />
      </ChartCard>
      </div>

      {/* Tabel rincian */}
      <section className="card rise rise-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="card-title">Rincian Data Common Enemy Next Level 2026</h3>
          <span className="num rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
            {Math.min(filtered.length, 100)} dari {filtered.length}
          </span>
        </div>
        <div className="max-h-120 overflow-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-solid">
              <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-ink-3">
                <th className="py-2 pr-3">Kode</th>
                <th className="px-3">Level Anomali</th>
                <th className="px-3">UPT</th>
                <th className="px-3">Gardu Induk</th>
                <th className="px-3">Nama Alat</th>
                <th className="px-3">Uraian</th>
                <th className="px-3">Kondisi Terkini</th>
                <th className="px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((r, i) => (
                <tr key={`${r.kode}-${i}`} className="border-b border-edge/50 transition-colors hover:bg-surface-2">
                  <td className="num py-2 pr-3 font-medium text-accent">{r.kode}</td>
                  <td className="px-3">{r.level_anomali}</td>
                  <td className="px-3 whitespace-nowrap">{r.upt}</td>
                  <td className="px-3">{r.gardu_induk}</td>
                  <td className="px-3">{r.nama_alat}</td>
                  <td className="px-3">{r.uraian}</td>
                  <td className="px-3 whitespace-nowrap">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: conditionColor(r.kondisi_terkini) }}
                    >
                      {r.kondisi_terkini || "—"}
                    </span>
                  </td>
                  <td className="px-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.status_terkini === "OPEN"
                          ? "bg-red-500/15 text-red-500"
                          : "bg-emerald-500/15 text-emerald-500"
                      }`}
                    >
                      {r.status_terkini}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
