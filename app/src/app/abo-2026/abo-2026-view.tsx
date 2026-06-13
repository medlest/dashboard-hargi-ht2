"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  aboAggregate, aboAvailableFilters, aboFilterRows,
  type AboFilters, type AboRow,
} from "@/lib/aggregate";
import { MultiSelect } from "@/components/multi-select";
import { ChartCard } from "@/components/chart-card";
import { EChart, useChartTheme } from "@/components/echart";
import { pieOption, rankedBarOption, stackedBarOption } from "@/lib/echart-options";
import { BigStat, Caption, pctColor } from "@/components/hero-primitives";
import { ZoomIn, ZoomOut, Maximize, Presentation } from "lucide-react";
import { Deck, DeckCover, DeckChartSlide, DeckContentSlide } from "@/components/slide-deck";

const EMPTY: AboFilters = { upt: [], status: [], jenis_anomali: [], status_fix: [] };

export function Abo2026View({ rows }: { rows: AboRow[] }) {
  const t = useChartTheme();
  const [sel, setSel] = useState<AboFilters>(EMPTY);
  const [zoom, setZoom] = useState(1);
  const router = useRouter();
  const searchParams = useSearchParams();

  const presenting = searchParams.get("deck") === "1";
  const setPresenting = useCallback((val: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("deck", "1");
    else params.delete("deck");
    router.push(`?${params.toString()}`);
  }, [router, searchParams]);

  const available = useMemo(() => aboAvailableFilters(rows), [rows]);
  const filtered = useMemo(() => aboFilterRows(rows, sel), [rows, sel]);
  const agg = useMemo(() => aboAggregate(filtered), [filtered]);

  const set = (k: keyof AboFilters) => (v: string[]) => setSel((s) => ({ ...s, [k]: v }));

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  // Prepare UPT Progress Data
  const uptProgress = useMemo(() => {
    const labels = [...agg.byUpt.keys()].sort();
    return labels.map(name => {
      const conds = agg.byUpt.get(name)!;
      let close = 0;
      let open = 0;
      
      for (const [status, count] of conds.entries()) {
        const s = status.toUpperCase();
        if (s === "CLOSE") close += count;
        else open += count; // Treat anything not strictly 'CLOSE' as open
      }
      
      const total = close + open;
      const pct = total > 0 ? (close / total) * 100 : 0;
      return { name, close, open, total, pct };
    }).sort((a, b) => b.total - a.total);
  }, [agg.byUpt]);

  // Charts
  const statusOpt = pieOption(t, [
    { name: "Close", value: agg.stats.closed, color: "#10b981" },
    { name: "Open", value: agg.stats.open, color: "#f87171" }
  ]);

  const anomaliLabels = [...agg.byAnomali.keys()].sort((a, b) => agg.byAnomali.get(b)! - agg.byAnomali.get(a)!);
  const shortLabels = anomaliLabels.map(l => l.length > 25 ? l.slice(0, 22) + "..." : l);
  
  const anomaliOpt = stackedBarOption(
    t,
    shortLabels,
    [
      {
        name: "Close",
        data: anomaliLabels.map(l => {
          const conds = agg.byAnomaliStatus.get(l);
          if (!conds) return 0;
          let close = 0;
          for (const [status, count] of conds.entries()) {
            if (status.toUpperCase() === "CLOSE") close += count;
          }
          return close;
        }),
        color: "#10b981"
      },
      {
        name: "Open",
        data: anomaliLabels.map(l => {
          const conds = agg.byAnomaliStatus.get(l);
          if (!conds) return 0;
          let open = 0;
          for (const [status, count] of conds.entries()) {
            if (status.toUpperCase() !== "CLOSE") open += count;
          }
          return open;
        }),
        color: "#f87171"
      }
    ],
    { horizontal: true }
  );

  return (
    <div className="space-y-6">
      {/* Zoom Controls (Floating) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 bg-surface-solid border border-edge shadow-lg rounded-full p-1.5 backdrop-blur-md">
        <button onClick={handleZoomOut} className="p-2 hover:bg-surface-2 rounded-full transition-colors text-ink-2 hover:text-ink" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-medium px-2 text-ink select-none w-12 text-center" title="Click to Reset" onClick={handleZoomReset} style={{cursor: 'pointer'}}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={handleZoomIn} className="p-2 hover:bg-surface-2 rounded-full transition-colors text-ink-2 hover:text-ink" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="rise rise-1 relative z-40 flex flex-wrap items-center gap-2">
        <MultiSelect label="UPT" options={available.upt} selected={sel.upt} onChange={set("upt")} />
        <MultiSelect label="Status" options={available.status} selected={sel.status} onChange={set("status")} />
        <MultiSelect label="Jenis Anomali" options={available.jenis_anomali} selected={sel.jenis_anomali} onChange={set("jenis_anomali")} />
        <MultiSelect label="Status FIX" options={available.status_fix} selected={sel.status_fix} onChange={set("status_fix")} />
        <div className="ml-auto flex items-center gap-3">
          <span className="num text-xs text-ink-3">{filtered.length} / {rows.length} data</span>
          <button
            type="button"
            onClick={() => setPresenting(true)}
            className="card flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-ink transition-transform hover:-translate-y-0.5"
          >
            <Presentation className="h-4 w-4" /> Slide Deck
          </button>
        </div>
      </div>

      {/* Scalable Content */}
      <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s ease-out" }} className="space-y-6">
        
        {/* Hero Stats */}
        <div className="card overflow-hidden rise rise-2">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-edge">
            <div className="p-6 flex flex-col gap-4">
              <Caption text="Total Rencana ABO 2026" />
              <BigStat value={String(agg.stats.total)} label="Pekerjaan" />
            </div>
            <div className="p-6 flex flex-col gap-4 bg-emerald-500/5">
              <Caption text="Total Realisasi (CLOSE)" />
              <div className="flex items-end gap-6">
                <BigStat value={String(agg.stats.closed)} label="Selesai" color="#10b981" />
                <span className="bg-edge w-px self-stretch" />
                <BigStat value={String(agg.stats.open)} label="Sisa (OPEN)" color="#f87171" />
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <Caption text="Progres Akumulatif" />
              <div className="flex items-center gap-4">
                 <BigStat value={`${agg.stats.progress.toFixed(1)}%`} label="Total" color={pctColor(agg.stats.progress)} />
                 <div className="flex-1 h-3 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${agg.stats.progress}%` }} />
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Progress per UPT (Left - 1/3) */}
          <ChartCard title="Progres per Unit (UPT)" className="rise rise-3 lg:col-span-1 h-[37rem]">
            <div className="p-2 space-y-4 max-h-full overflow-auto scrollbar-thin">
              {uptProgress.map((u) => {
                const anomalies = agg.byUptAnomali.get(u.name);
                const anomalyList = anomalies ? [...anomalies.entries()].sort((a, b) => b[1] - a[1]) : [];
                
                return (
                <div key={u.name} className="space-y-2 border-b border-edge/30 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between text-[11px] font-medium px-1">
                    <span className="text-ink truncate max-w-[140px]" title={u.name}>{u.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="num text-emerald-500">{u.close}<small className="ml-0.5 opacity-60 font-normal">C</small></span>
                      <span className="num text-red-400">{u.open}<small className="ml-0.5 opacity-60 font-normal">O</small></span>
                      <span className="bg-edge w-px h-2.5 mx-1" />
                      <span className="num text-ink font-bold">{u.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-2 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${u.pct}%` }} />
                    {u.total > 0 && <div className="h-full bg-red-400" style={{ width: `${100 - u.pct}%` }} />}
                  </div>
                  {anomalyList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1 px-1">
                      {anomalyList.map(([ano, count]) => {
                        const statuses = agg.byUptAnomaliStatus?.get(u.name)?.get(ano);
                        let c = 0, o = 0;
                        if (statuses) {
                          for (const [st, num] of statuses.entries()) {
                            if (st.toUpperCase() === "CLOSE") c += num;
                            else o += num;
                          }
                        }
                        
                        return (
                          <div key={ano} className="flex items-center text-[9px] rounded bg-surface-2 border border-edge/50 overflow-hidden">
                            <span className="px-1.5 py-0.5 text-ink-3 truncate max-w-[120px]" title={ano}>
                              {ano.length > 18 ? ano.slice(0, 15) + '...' : ano}
                            </span>
                            <span className="flex items-center px-1.5 py-0.5 bg-surface-solid border-l border-edge/50">
                              <span className="text-emerald-500 font-bold" title="Close">{c}</span>
                              <span className="text-ink-3 mx-0.5">/</span>
                              <span className="text-red-400 font-bold" title="Open">{o}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )})}
            </div>
          </ChartCard>

          {/* Charts (Right - 2/3) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <ChartCard title="Priority Status" className="rise rise-4 h-60">
              <EChart key="status-chart" option={statusOpt} />
            </ChartCard>
            <ChartCard title="Distribusi Jenis Anomali ABO" className="rise rise-5 flex-1 min-h-80">
              <EChart key="anomali-chart" option={anomaliOpt} />
            </ChartCard>
          </div>
        </div>

        {/* Table */}
        <section className="card rise rise-5 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="card-title text-sm">Rincian Data ABO 2026</h3>
            <span className="num text-[11px] bg-surface-2 px-2 py-0.5 rounded-full text-ink-2">
              {filtered.length} data
            </span>
          </div>
          <div className="max-h-128 overflow-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-solid">
                <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-ink-3">
                  <th className="py-2 pr-3">No</th>
                  <th className="px-3">UPT</th>
                  <th className="px-3">Gardu Induk</th>
                  <th className="px-3">Jenis Anomali</th>
                  <th className="px-3">Jadwal Rencana</th>
                  <th className="px-3">Status FIX</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={`${r.no}-${i}`} className="border-b border-edge/50 hover:bg-surface-2 transition-colors">
                    <td className="num py-2.5 pr-3 text-ink-3">{r.no}</td>
                    <td className="px-3 font-medium">{r.upt}</td>
                    <td className="px-3">{r.gardu_induk}</td>
                    <td className="px-3 text-ink-2">{r.jenis_anomali}</td>
                    <td className="px-3 num text-ink-3 italic">{r.jadwal_rencana || "—"}</td>
                    <td className="px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status_fix.toUpperCase() === "CLOSE" ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"
                      }`}>
                        {r.status_fix || "OPEN"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      {presenting && (
        <Deck
          onExit={() => setPresenting(false)}
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <MultiSelect label="UPT" options={available.upt} selected={sel.upt} onChange={set("upt")} />
              <MultiSelect label="Status" options={available.status} selected={sel.status} onChange={set("status")} />
              <MultiSelect label="Jenis Anomali" options={available.jenis_anomali} selected={sel.jenis_anomali} onChange={set("jenis_anomali")} />
              <MultiSelect label="Status FIX" options={available.status_fix} selected={sel.status_fix} onChange={set("status_fix")} />
            </div>
          }
          slides={[
            {
              key: "cover", label: "Summary",
              node: (
                <DeckCover
                  eyebrow="UIT Jawa Bagian Tengah · Hartrans 2 - Gardu Induk"
                  title={<>Dashboard<br />ABO <span className="num text-amber">2026</span></>}
                  description="Ringkasan eksekutif progres pelaksanaan ABO 2026: total pekerjaan, realisasi, dan distribusi anomali."
                  stats={[
                    { label: "Total Pekerjaan", value: String(agg.stats.total) },
                    { label: "Selesai (Close)", value: String(agg.stats.closed) },
                    { label: "Sisa (Open)", value: String(agg.stats.open) },
                    { label: "Progres Akumulatif", value: `${agg.stats.progress.toFixed(1)}%` },
                  ]}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Progress per UPT (Left - 1/3) */}
                    <ChartCard title="Progres per Unit (UPT)" className="lg:col-span-1 h-[37rem]">
                      <div className="p-2 space-y-4 max-h-full overflow-auto scrollbar-thin">
                        {uptProgress.map((u) => {
                          const anomalies = agg.byUptAnomali.get(u.name);
                          const anomalyList = anomalies ? [...anomalies.entries()].sort((a, b) => b[1] - a[1]) : [];
                          
                          return (
                          <div key={u.name} className="space-y-2 border-b border-edge/30 pb-3 last:border-0 last:pb-0">
                            <div className="flex justify-between text-[11px] font-medium px-1">
                              <span className="text-ink truncate max-w-[140px]" title={u.name}>{u.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="num text-emerald-500">{u.close}<small className="ml-0.5 opacity-60 font-normal">C</small></span>
                                <span className="num text-red-400">{u.open}<small className="ml-0.5 opacity-60 font-normal">O</small></span>
                                <span className="bg-edge w-px h-2.5 mx-1" />
                                <span className="num text-ink font-bold">{u.pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2 bg-surface-2 rounded-full overflow-hidden flex">
                              <div className="h-full bg-emerald-500" style={{ width: `${u.pct}%` }} />
                              {u.total > 0 && <div className="h-full bg-red-400" style={{ width: `${100 - u.pct}%` }} />}
                            </div>
                            {anomalyList.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1 px-1">
                                {anomalyList.map(([ano, count]) => {
                                  const statuses = agg.byUptAnomaliStatus?.get(u.name)?.get(ano);
                                  let c = 0, o = 0;
                                  if (statuses) {
                                    for (const [st, num] of statuses.entries()) {
                                      if (st.toUpperCase() === "CLOSE") c += num;
                                      else o += num;
                                    }
                                  }
                                  
                                  return (
                                    <div key={ano} className="flex items-center text-[9px] rounded bg-surface-2 border border-edge/50 overflow-hidden">
                                      <span className="px-1.5 py-0.5 text-ink-3 truncate max-w-[120px]" title={ano}>
                                        {ano.length > 18 ? ano.slice(0, 15) + '...' : ano}
                                      </span>
                                      <span className="flex items-center px-1.5 py-0.5 bg-surface-solid border-l border-edge/50">
                                        <span className="text-emerald-500 font-bold" title="Close">{c}</span>
                                        <span className="text-ink-3 mx-0.5">/</span>
                                        <span className="text-red-400 font-bold" title="Open">{o}</span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    </ChartCard>

                    {/* Charts (Right - 2/3) */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                      <ChartCard title="Priority Status" className="h-60">
                        <EChart key="dk-status-chart" option={statusOpt} />
                      </ChartCard>
                      <ChartCard title="Distribusi Jenis Anomali ABO" className="flex-1 min-h-80">
                        <EChart key="dk-anomali-chart" option={anomaliOpt} />
                      </ChartCard>
                    </div>
                  </div>

                  <section className="card p-6">
                    <h3 className="card-title mb-4">Rincian Data ABO 2026</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-ink-3">
                            <th className="py-2 pr-3">No</th>
                            <th className="px-3">UPT</th>
                            <th className="px-3">Gardu Induk</th>
                            <th className="px-3">Jenis Anomali</th>
                            <th className="px-3">Jadwal Rencana</th>
                            <th className="px-3">Status FIX</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.slice(0, 100).map((r, i) => (
                            <tr key={`dk-${r.no}-${i}`} className="border-b border-edge/50 hover:bg-surface-2 transition-colors">
                              <td className="num py-2 pr-3 text-ink-3">{r.no}</td>
                              <td className="px-3 font-medium whitespace-nowrap">{r.upt}</td>
                              <td className="px-3 whitespace-nowrap">{r.gardu_induk}</td>
                              <td className="px-3 text-ink-2">{r.jenis_anomali}</td>
                              <td className="px-3 num text-ink-3 italic">{r.jadwal_rencana || "—"}</td>
                              <td className="px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.status_fix.toUpperCase() === "CLOSE" ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"
                                }`}>
                                  {r.status_fix || "OPEN"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </DeckCover>
              ),
            },
          ]}
        />
      )}

      </div> 
    </div>
  );
}
