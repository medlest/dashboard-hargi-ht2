"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList, Map as MapIcon, TrendingUp, Zap, ChevronRight
} from "lucide-react";
import { monthIndex } from "@/lib/aggregate";
import { pctColor } from "@/components/hero-primitives";
import { MultiSelect } from "@/components/multi-select";
import type { HeroGi } from "./hero-map";

export type CeSummaryRow = { total: number; closed: number; open: number };
export type LastGgn = {
  gardu: string;
  nama_bay: string;
  tgl_keluar: string;
  unit: string;
  ultg: string | null;
};
export type YearCount = { tahun: string; total: number };
export type MonthCount = { tahun: string; bulan: string; total: number };
export type GiSlim = HeroGi;
export type MetaRow = {
  sheet_name_ce: string | null;
  sheet_name_pareto: string | null;
  sheet_name_abo: string | null;
  mod_ce: string | null;
  mod_pareto: string | null;
  mod_abo: string | null;
  synced_at: string | null;
};

const HeroMap = dynamic(() => import("./hero-map").then((m) => m.HeroMap), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-surface-2 flex items-center justify-center text-sm text-ink-3">Memuat Peta...</div>,
});

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function OverviewView({
  ce,
  abo,
  ggn,
  ggnYears,
  ggnMonths,
  gis,
  gi,
  trafo,
  lastGgn,
  meta,
  units = [],
  selectedUnits = [],
}: {
  ce: CeSummaryRow;
  abo: { total: number; closed: number; open: number };
  ggn: { total: number; units: number };
  ggnYears: YearCount[];
  ggnMonths: MonthCount[];
  gis: GiSlim[];
  gi: { total: number; year: number; month: number };
  trafo: { total: number; year: number; month: number };
  lastGgn: LastGgn | null;
  meta: MetaRow | null;
  units?: string[];
  selectedUnits?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const ceProgress = ce.total > 0 ? Math.round((ce.closed / ce.total) * 1000) / 10 : 0;
  const aboProgress = abo.total > 0 ? Math.round((abo.closed / abo.total) * 1000) / 10 : 0;
  
  const yearRange = ggnYears.length
    ? `${ggnYears[0].tahun}–${ggnYears[ggnYears.length - 1].tahun}`
    : "—";

  const now = new Date();
  const curYear = String(now.getFullYear());
  const monthLabel = MONTHS_ID[now.getMonth()];
  const ggnYearNow = ggnYears.find((y) => y.tahun === curYear)?.total ?? 0;
  const ggnMonthNow = ggnMonths
    .filter((m) => m.tahun === curYear && monthIndex(m.bulan) === now.getMonth() + 1)
    .reduce((s, m) => s + m.total, 0);

  function onUnitChange(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("unit");
    next.forEach((u) => params.append("unit", u));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="rise rise-1 flex flex-wrap items-center gap-2 bg-surface p-3 rounded-xl border border-edge shadow-sm">
        <MultiSelect
          label="Unit"
          options={units.sort()}
          selected={selectedUnits}
          onChange={onUnitChange}
        />
        <div className="ml-auto text-[11px] text-ink-3 px-2 flex items-center gap-2">
           <span className="hidden sm:inline">Data tersinkronisasi:</span>
           <span className="font-bold bg-surface-2 px-2 py-1 rounded-full">{meta?.synced_at ?? "Belum ada"}</span>
        </div>
      </div>

      {/* Grid Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Module 1: Trend Gangguan */}
        <div className="card rise rise-2 flex flex-col overflow-hidden hover:border-edge/80 transition-colors group">
          <div className="p-5 border-b border-edge/50 flex justify-between items-center bg-surface-solid">
             <div className="flex items-center gap-2 font-bold text-amber">
               <TrendingUp className="w-4 h-4" /> Trend Gangguan Trafo
             </div>
             <Link href="/pareto" className="text-[11px] font-semibold text-ink-3 hover:text-ink flex items-center transition-colors">
               Detail <ChevronRight className="w-3 h-3 ml-0.5 transition-transform group-hover:translate-x-0.5" />
             </Link>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-6">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 font-semibold mb-1">Total Gangguan</div>
                 <div className="text-3xl num font-bold text-ink tracking-tight">{ggn.total}</div>
                 <div className="text-[10px] text-ink-3 mt-1">{yearRange}</div>
               </div>
               <div>
                 <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 font-semibold mb-1">Tahun {curYear}</div>
                 <div className="text-3xl num font-bold text-amber tracking-tight">{ggnYearNow}</div>
                 <div className="text-[10px] text-ink-3 mt-1">Bulan {monthLabel}: <b className="text-ink-2">{ggnMonthNow}</b></div>
               </div>
             </div>
             {lastGgn && (
                <div className="mt-auto pt-4 border-t border-edge/30">
                  <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 font-semibold mb-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    Gangguan Terakhir ({lastGgn.tgl_keluar})
                  </div>
                  <div className="text-sm font-bold text-ink-2">{lastGgn.gardu.replace(/^GIS?T?\s*\d+\s*KV\s*/i, "")}</div>
                  <div className="text-xs text-ink-3 truncate">{lastGgn.nama_bay}</div>
                </div>
             )}
          </div>
        </div>

        {/* Module 2: CE Next Level */}
        <div className="card rise rise-3 flex flex-col overflow-hidden hover:border-edge/80 transition-colors group">
          <div className="p-5 border-b border-edge/50 flex justify-between items-center bg-surface-solid">
             <div className="flex items-center gap-2 font-bold text-blue-400">
               <ClipboardList className="w-4 h-4" /> CE Next Level 2026
             </div>
             <Link href="/ce-abo" className="text-[11px] font-semibold text-ink-3 hover:text-ink flex items-center transition-colors">
               Detail <ChevronRight className="w-3 h-3 ml-0.5 transition-transform group-hover:translate-x-0.5" />
             </Link>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-6">
             <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 font-semibold mb-1">Total Temuan</div>
                  <div className="text-3xl num font-bold text-ink tracking-tight">{ce.total}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 font-semibold mb-1">Progres Penyelesaian</div>
                  <div className="text-2xl num font-bold tracking-tight" style={{ color: pctColor(ceProgress) }}>{ceProgress.toFixed(1)}%</div>
                </div>
             </div>
             <div className="mt-auto">
               <div className="flex justify-between text-xs font-medium mb-2">
                  <span className="text-emerald-500">{ce.closed} <span className="opacity-70 font-normal">Close</span></span>
                  <span className="text-red-400">{ce.open} <span className="opacity-70 font-normal">Open</span></span>
               </div>
               <div className="h-2 bg-surface-2 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${ceProgress}%` }} />
                  {ce.total > 0 && <div className="h-full bg-red-400" style={{ width: `${100 - ceProgress}%` }} />}
               </div>
             </div>
          </div>
        </div>

        {/* Module 3: ABO 2026 */}
        <div className="card rise rise-4 flex flex-col overflow-hidden hover:border-edge/80 transition-colors group">
          <div className="p-5 border-b border-edge/50 flex justify-between items-center bg-surface-solid">
             <div className="flex items-center gap-2 font-bold text-emerald-400">
               <Zap className="w-4 h-4" /> ABO 2026
             </div>
             <Link href="/abo-2026" className="text-[11px] font-semibold text-ink-3 hover:text-ink flex items-center transition-colors">
               Detail <ChevronRight className="w-3 h-3 ml-0.5 transition-transform group-hover:translate-x-0.5" />
             </Link>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-6">
             <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 font-semibold mb-1">Total Rencana</div>
                  <div className="text-3xl num font-bold text-ink tracking-tight">{abo.total}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.1em] text-ink-3 font-semibold mb-1">Progres Akumulatif</div>
                  <div className="text-2xl num font-bold tracking-tight" style={{ color: pctColor(aboProgress) }}>{aboProgress.toFixed(1)}%</div>
                </div>
             </div>
             <div className="mt-auto">
               <div className="flex justify-between text-xs font-medium mb-2">
                  <span className="text-emerald-500">{abo.closed} <span className="opacity-70 font-normal">Selesai</span></span>
                  <span className="text-red-400">{abo.open} <span className="opacity-70 font-normal">Sisa</span></span>
               </div>
               <div className="h-2 bg-surface-2 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${aboProgress}%` }} />
                  {abo.total > 0 && <div className="h-full bg-red-400" style={{ width: `${100 - aboProgress}%` }} />}
               </div>
             </div>
          </div>
        </div>

      </div>

      {/* Hero Map Section */}
      <div className="card rise rise-5 overflow-hidden flex flex-col shadow-sm border border-edge">
        <div className="p-4 border-b border-edge/50 bg-surface-solid flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-[13px] text-ink">
            <MapIcon className="w-4 h-4 text-accent" /> Peta Sebaran Aset Gardu Induk
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-ink-2">
            <span><b className="text-ink">{gi.total}</b> GI</span>
            <span className="w-1 h-1 rounded-full bg-edge" />
            <span><b className="text-ink">{trafo.total}</b> Trafo</span>
          </div>
        </div>
        <div className="relative h-[55vh] min-h-[400px] w-full bg-bg">
          <HeroMap points={gis} totals={{ year: ggnYearNow, month: ggnMonthNow }} />
          {/* Subtle gradient overlay at the bottom so it blends with the dark theme */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg/60 to-transparent" />
        </div>
      </div>

    </div>
  );
}
