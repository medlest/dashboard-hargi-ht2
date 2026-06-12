"use client";

// Overview — SATU layar penuh: hero 3D tour + KPI strip padat.
// Kartu modul & sumber data lama di-MERGE ke hero (CTA + baris sumber + KPI
// pattern 3 kolom angka-di-atas-label). Semua angka dari Supabase (page.tsx).
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ClipboardList, ExternalLink, Map as MapIcon, TrendingUp,
} from "lucide-react";
import { monthIndex } from "@/lib/aggregate";
import { pctColor } from "@/components/hero-primitives";
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
  mod_ce: string | null;
  mod_pareto: string | null;
  synced_at: string | null;
};

const HeroMap = dynamic(() => import("./hero-map").then((m) => m.HeroMap), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-surface-2" />,
});

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const AMBER = "var(--amber)";

export function OverviewView({
  ce,
  ggn,
  ggnYears,
  ggnMonths,
  gis,
  gi,
  trafo,
  lastGgn,
  meta,
  sources,
}: {
  ce: CeSummaryRow;
  ggn: { total: number; units: number };
  ggnYears: YearCount[];
  ggnMonths: MonthCount[];
  gis: GiSlim[];
  gi: { total: number; year: number; month: number };
  trafo: { total: number; year: number; month: number };
  lastGgn: LastGgn | null;
  meta: MetaRow | null;
  sources: { ce: string; pareto: string };
}) {
  const progress = ce.total > 0 ? Math.round((ce.closed / ce.total) * 1000) / 10 : 0;
  const yearRange = ggnYears.length
    ? `${ggnYears[0].tahun}–${ggnYears[ggnYears.length - 1].tahun}`
    : "—";

  // Tahun & bulan berjalan — dipakai semua KPI pattern
  const now = new Date();
  const curYear = String(now.getFullYear());
  const monthLabel = MONTHS_ID[now.getMonth()];
  const ggnYearNow = ggnYears.find((y) => y.tahun === curYear)?.total ?? 0;
  const ggnMonthNow = ggnMonths
    .filter((m) => m.tahun === curYear && monthIndex(m.bulan) === now.getMonth() + 1)
    .reduce((s, m) => s + m.total, 0);
  return (
    <section className="rise rise-1 relative min-h-[28rem] flex-1 overflow-hidden rounded-2xl border border-edge shadow-lg">
      <HeroMap points={gis} totals={{ year: ggnYearNow, month: ggnMonthNow }} />
      {/* veil biar teks kebaca, peta tetap interaktif di area kanan */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/35 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-bg/80 to-transparent" />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 md:p-7">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber">
            <span className="h-px w-10 bg-amber" />
            UIT Jawa Bagian Tengah · HARGI
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            Hartrans 2 <span className="text-amber">—</span> Gardu Induk
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-2">
            Monitoring terpadu gangguan transformator, temuan Common Enemy Next
            Level 2026, dan sebaran aset Gardu Induk. Data live dari spreadsheet
            sumber, tersimpan di database.
          </p>
          <div className="pointer-events-auto mt-5 flex flex-wrap gap-2">
            <Link
              href="/pareto"
              className="flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-[13px] font-semibold text-[#0a101f] transition-transform hover:-translate-y-0.5"
            >
              <TrendingUp className="h-4 w-4" /> Trend Gangguan
            </Link>
            <Link
              href="/ce-abo"
              className="card flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-ink transition-transform hover:-translate-y-0.5"
            >
              <ClipboardList className="h-4 w-4" /> CE Next Level
            </Link>
            <Link
              href="/asset-maps"
              className="card flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-ink transition-transform hover:-translate-y-0.5"
            >
              <MapIcon className="h-4 w-4" /> Asset Maps
            </Link>
          </div>
          {/* sumber data per sheet — judul + update terakhir, klik = buka sheet */}
          <div className="pointer-events-auto mt-4 space-y-1 text-[10.5px] text-ink-3">
            <a
              href={sources.pareto}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit flex-wrap items-center gap-x-1.5 transition-colors hover:text-accent"
            >
              Sumber Trend Gangguan:
              <span className="font-medium text-ink-2">{meta?.sheet_name_pareto ?? "Spreadsheet"}</span>
              {meta?.mod_pareto && <span className="num">· update {meta.mod_pareto}</span>}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <a
              href={sources.ce}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit flex-wrap items-center gap-x-1.5 transition-colors hover:text-accent"
            >
              Sumber CE Next Level 2026:
              <span className="font-medium text-ink-2">{meta?.sheet_name_ce ?? "Spreadsheet"}</span>
              {meta?.mod_ce && <span className="num">· update {meta.mod_ce}</span>}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>

        {/* KPI strip — pattern angka-di-atas-label */}
        <div className="pointer-events-auto card grid grid-cols-1 sm:grid-cols-2 lg:divide-x lg:divide-edge lg:[grid-template-columns:1fr_1.1fr_0.9fr_1.3fr]">
          <KpiTri
            label="Total Gangguan Trafo"
            items={[
              { v: ggn.total.toLocaleString("id-ID"), l: yearRange },
              { v: String(ggnYearNow), l: curYear, c: AMBER },
              { v: String(ggnMonthNow), l: monthLabel, c: AMBER },
            ]}
          />
          <KpiTri
            label="Temuan CE 2026"
            items={[
              { v: ce.total.toLocaleString("id-ID"), l: "Temuan" },
              { v: String(ce.open), l: "Open", c: "#f87171" },
              { v: String(ce.closed), l: "Close", c: "#10b981" },
              { v: `${progress.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`, l: "Progres", c: pctColor(progress) },
            ]}
          />
          <KpiTri
            label="Terdampak Gangguan"
            items={[
              { v: String(gi.total), l: "Gardu Induk" },
              { v: String(trafo.total), l: "Trafo" },
              { v: String(gi.year), l: `GI ${curYear}`, c: AMBER },
              { v: String(gi.month), l: `GI ${monthLabel}`, c: AMBER },
            ]}
          />
          {lastGgn && (
            <KpiTri
              label={`Gangguan Terakhir · ${lastGgn.tgl_keluar}`}
              size="lg"
              items={[
                { v: lastGgn.unit.replace(/^UPT /, ""), l: "UPT", wide: true },
                { v: lastGgn.ultg?.replace(/^ULTG /, "") ?? "—", l: "ULTG", wide: true },
                { v: lastGgn.gardu.replace(/^GIS?T?\s*\d+\s*KV\s*/i, ""), l: "GI", wide: true },
                { v: lastGgn.nama_bay.trim().split(/\s+/)[0], l: "Bay Trafo" },
              ]}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// Pattern KPI: label kecil + N kolom angka besar di atas label kecil
function KpiTri({
  label,
  items,
  size = "2xl",
}: {
  label: string;
  // wide = kolom teks panjang: ambil sisa space (kolom angka cuma butuh dikit)
  items: { v: string; l: string; c?: string; wide?: boolean }[];
  size?: "2xl" | "xl" | "lg";
}) {
  // Teks panjang → font turun otomatis biar muat (truncate cuma guard terakhir)
  const fit = (s: string) => {
    const n = s.length;
    if (size === "2xl") return n <= 7 ? "text-2xl" : n <= 11 ? "text-xl" : n <= 15 ? "text-lg" : "text-base";
    if (size === "xl") return n <= 7 ? "text-xl" : n <= 11 ? "text-lg" : n <= 15 ? "text-base" : "text-sm";
    return n <= 7 ? "text-lg" : n <= 11 ? "text-base" : "text-sm";
  };
  return (
    <div className="px-4 py-3">
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</div>
      <div className={`mt-1 flex items-end ${size === "2xl" ? "gap-4" : "gap-3"}`}>
        {items.map((it) => (
          <div key={it.l} className={it.wide ? "min-w-0 flex-1" : "shrink-0"}>
            <div
              className={`num ${fit(it.v)} truncate font-bold leading-none tracking-tight`}
              style={it.c ? { color: it.c } : undefined}
            >
              {it.v}
            </div>
            <div className="num mt-1 truncate whitespace-nowrap text-[10px] text-ink-3">{it.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
