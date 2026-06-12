"use client";

import { useMemo, useState } from "react";
import { Presentation } from "lucide-react";
import { Deck, DeckCover, DeckChartSlide, DeckContentSlide, DeckB as B, deckPct as fmtPct } from "@/components/slide-deck";
import {
  ceAggregate, ceAvailableFilters, ceFilterRows,
  type CeFilters, type CeRow,
} from "@/lib/aggregate";
import { conditionColor, sortConditions, PALETTE } from "@/lib/colors";
import { pieOption, groupedBarOption, simpleBarOption, hbarOption } from "@/lib/echart-options";
import { MultiSelect } from "@/components/multi-select";
import { ChartCard } from "@/components/chart-card";
import { HeroCE } from "./hero-ce";
import { EChart, useChartTheme } from "@/components/echart";

const EMPTY: CeFilters = { upt: [], sub_bidang: [], level_anomali: [], kondisi_akhir: [] };

export function CeAboView({ rows }: { rows: CeRow[] }) {
  const t = useChartTheme();
  const [sel, setSel] = useState<CeFilters>(EMPTY);
  const [presenting, setPresenting] = useState(false);
  const available = useMemo(() => ceAvailableFilters(rows), [rows]);
  const filtered = useMemo(() => ceFilterRows(rows, sel), [rows, sel]);
  const agg = useMemo(() => ceAggregate(filtered), [filtered]);

  const set = (k: keyof CeFilters) => (v: string[]) => setSel((s) => ({ ...s, [k]: v }));

  // Hero: agregat dari baris yang lolos filter SELAIN level — panel level tetap
  // kebaca semua (buat klik-filter), tapi tetap responsif ke filter UPT/SubBidang/KA.
  const heroAgg = useMemo(
    () => ceAggregate(ceFilterRows(rows, { ...sel, level_anomali: [] })),
    [rows, sel],
  );
  const activeLevel = sel.level_anomali.length === 1 ? sel.level_anomali[0] : null;
  const toggleLevel = (lvl: string) =>
    set("level_anomali")(activeLevel === lvl ? [] : [lvl]);

  // ===== options ECharts =====
  const condSlices = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => (parseInt(b[0]) || 0) - (parseInt(a[0]) || 0))
      .map(([name, value]) => ({ name, value, color: conditionColor(name) }));

  const toGrouped = (dist: Map<string, Map<string, number>>) => {
    const labels = [...dist.keys()].sort((a, b) => {
      const sum = (m: Map<string, number>) => [...m.values()].reduce((x, y) => x + y, 0);
      return sum(dist.get(b)!) - sum(dist.get(a)!);
    });
    const conds = sortConditions([...dist.values()].flatMap((m) => [...m.keys()]));
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
    const conds = sortConditions([...dist.values()].flatMap((m) => [...m.keys()]));
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

  // ===== Anotasi deck — fakta dihitung langsung dari data terfilter =====
  const hasData = agg.stats.total > 0;
  const kaTop = [...agg.kaSummary.entries()].sort((a, b) => b[1] - a[1])[0];
  const lvlTop = agg.levelSummary[0];
  const lvlMostOpen = [...agg.levelSummary].sort(
    (a, b) => (b.f + b.p + b.c) - (a.f + a.p + a.c),
  )[0];
  const uptTop = agg.uptSummary[0];
  const uptMostOpen = [...agg.uptSummary].sort(
    (a, b) => (b.f + b.p + b.c) - (a.f + a.p + a.c),
  )[0];
  const uraianTopSum = uraianTop.reduce((s, [, c]) => s + c, 0);

  const kaNotes =
    hasData && kaTop
      ? [
          <span key="a">
            Progres penyelesaian <B>{agg.stats.progress}%</B> — {agg.stats.closed} dari {agg.stats.total} temuan
            sudah close (VG/G), <B>{agg.stats.open}</B> masih open.
          </span>,
          <span key="b">
            Kondisi akhir dominan: <B>{kaTop[0]}</B> — {kaTop[1]} temuan ({fmtPct(kaTop[1], agg.stats.total)}).
          </span>,
        ]
      : undefined;
  const lvlNotes =
    hasData && lvlTop
      ? [
          <span key="a">
            Level dengan temuan terbanyak: <B>{lvlTop.level}</B> — {lvlTop.total} temuan
            ({fmtPct(lvlTop.total, agg.stats.total)}).
          </span>,
          <span key="b">
            Open terbanyak di <B>{lvlMostOpen.level}</B>: {lvlMostOpen.f + lvlMostOpen.p + lvlMostOpen.c} temuan
            belum selesai (F {lvlMostOpen.f} · P {lvlMostOpen.p} · C {lvlMostOpen.c}).
          </span>,
        ]
      : undefined;
  const uptNotes =
    hasData && uptTop
      ? [
          <span key="a">
            UPT dengan temuan terbanyak: <B>{uptTop.name}</B> — {uptTop.total} temuan
            ({fmtPct(uptTop.total, agg.stats.total)}) dari {agg.uptSummary.length} UPT tercatat.
          </span>,
          <span key="b">
            Open terbanyak di <B>{uptMostOpen.name}</B>: {uptMostOpen.f + uptMostOpen.p + uptMostOpen.c} temuan
            belum selesai.
          </span>,
        ]
      : undefined;
  const uraianNotes =
    hasData && uraianTop.length > 0
      ? [
          <span key="a">
            Uraian dominan: <B>{uraianTop[0][0]}</B> — {uraianTop[0][1]} temuan
            ({fmtPct(uraianTop[0][1], agg.stats.total)} dari total).
          </span>,
          <span key="b">
            {uraianTop.length} uraian teratas mencakup <B>{fmtPct(uraianTopSum, agg.stats.total)}</B> dari{" "}
            {agg.stats.total} temuan.
          </span>,
        ]
      : undefined;

  const ktTop = [...agg.kondisiTerkini.entries()].sort((a, b) => b[1] - a[1])[0];
  const ktNotes =
    hasData && ktTop
      ? [
          <span key="a">
            Kondisi terkini dominan: <B>{ktTop[0]}</B> — {ktTop[1]} temuan ({fmtPct(ktTop[1], agg.stats.total)}).
          </span>,
          <span key="b">
            <B>{agg.kondisiTerkini.size}</B> kategori kondisi terkini tercatat dari {agg.stats.total} temuan.
          </span>,
        ]
      : undefined;

  const sbTotals = [...agg.bySubBidang.entries()]
    .map(([name, m]) => [name, [...m.values()].reduce((x, y) => x + y, 0)] as const)
    .sort((a, b) => b[1] - a[1]);
  const sbNotes =
    hasData && sbTotals.length > 0
      ? [
          <span key="a">
            Sub bidang dengan temuan terbanyak: <B>{sbTotals[0][0]}</B> — {sbTotals[0][1]} temuan
            ({fmtPct(sbTotals[0][1], agg.stats.total)}).
          </span>,
          <span key="b">
            <B>{sbTotals.length}</B> sub bidang tercatat dalam data terfilter.
          </span>,
        ]
      : undefined;

  let comboTop = { level: "", uraian: "", count: 0 };
  for (const [lvl, m] of agg.byLevelUraian)
    for (const [u, c] of m) if (c > comboTop.count) comboTop = { level: lvl, uraian: u, count: c };
  const lvlJenis = [...agg.byLevelUraian.entries()]
    .map(([l, m]) => [l, m.size] as const)
    .sort((a, b) => b[1] - a[1])[0];
  const urlNotes =
    hasData && comboTop.count > 0 && lvlJenis
      ? [
          <span key="a">
            Kombinasi terbanyak: <B>{comboTop.uraian}</B> di level <B>{comboTop.level}</B> — {comboTop.count} temuan.
          </span>,
          <span key="b">
            Level <B>{lvlJenis[0]}</B> mencatat jenis uraian paling beragam: <B>{lvlJenis[1]}</B> uraian berbeda.
          </span>,
        ]
      : undefined;

  // ===== Slide per UPT + fokus pengerjaan + daftar prioritas =====
  // (koordinasi Hartrans 2 = level UPT — JANGAN agregasi per GI di deck)
  const isOpenKa = (ka: string) => ["3-", "4-", "5-"].some((p) => (ka ?? "").includes(p));
  const uptProgress = agg.uptSummary
    .map((u) => ({
      ...u,
      close: u.vg + u.g,
      open: u.f + u.p + u.c,
      pct: u.total > 0 ? ((u.vg + u.g) / u.total) * 100 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);
  const openRows = filtered.filter((r) => isOpenKa(r.kondisi_akhir));
  const uraianOpenCount = new Map<string, number>();
  for (const r of openRows) {
    const u = (r.uraian ?? "").trim();
    if (u) uraianOpenCount.set(u, (uraianOpenCount.get(u) ?? 0) + 1);
  }
  const uraianOpenTop = [...uraianOpenCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const critRows = filtered.filter((r) => (r.kondisi_akhir ?? "").includes("5-"));
  const poorRows = filtered.filter((r) => (r.kondisi_akhir ?? "").includes("4-"));
  const priorityRows = [...critRows, ...poorRows].slice(0, 12);

  const uptProgNotes =
    uptProgress.length > 0
      ? [
          <span key="a">
            Progres tertinggi: <B>{uptProgress[0].name}</B> —{" "}
            <B>{fmtPct(uptProgress[0].close, uptProgress[0].total)}</B> ({uptProgress[0].close}/{uptProgress[0].total}).
          </span>,
          <span key="b">
            Terendah: <B>{uptProgress[uptProgress.length - 1].name}</B> —{" "}
            {fmtPct(uptProgress[uptProgress.length - 1].close, uptProgress[uptProgress.length - 1].total)} ·{" "}
            <B>{uptProgress[uptProgress.length - 1].open}</B> temuan masih open.
          </span>,
        ]
      : undefined;
  const fokusNotes =
    openRows.length > 0 && uraianOpenTop.length > 0
      ? [
          <span key="a">
            Total <B>{openRows.length}</B> temuan masih open ({fmtPct(openRows.length, agg.stats.total)} dari{" "}
            {agg.stats.total}).
          </span>,
          <span key="b">
            Uraian open terbanyak: <B>{uraianOpenTop[0][0]}</B> — {uraianOpenTop[0][1]} temuan.
          </span>,
        ]
      : undefined;
  const prioNotes = [
    <span key="a">
      Kondisi akhir <B>{critRows.length}</B> Critical + <B>{poorRows.length}</B> Poor — semuanya open.
    </span>,
    <span key="b">
      Menampilkan <B>{priorityRows.length}</B> teratas (Critical didahulukan).
    </span>,
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rise rise-1 relative z-40 flex flex-wrap items-center gap-2">
        <MultiSelect label="UPT" options={available.upt} selected={sel.upt} onChange={set("upt")} />
        <MultiSelect label="Sub Bidang" options={available.sub_bidang} selected={sel.sub_bidang} onChange={set("sub_bidang")} />
        <MultiSelect label="Level Anomali" options={available.level_anomali} selected={sel.level_anomali} onChange={set("level_anomali")} />
        <MultiSelect label="Kondisi Akhir" options={available.kondisi_akhir} selected={sel.kondisi_akhir} onChange={set("kondisi_akhir")} />
        <div className="ml-auto flex items-center gap-3">
          <span className="num text-xs text-ink-3">{filtered.length} / {rows.length} temuan</span>
          <button
            type="button"
            onClick={() => setPresenting(true)}
            className="flex items-center gap-2 rounded-lg border border-edge px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Presentation className="h-4 w-4" /> Slide Deck
          </button>
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
        <ChartCard title="Persentase Kondisi Akhir" className="rise rise-5 col-span-2 min-h-80 lg:col-span-2">
          <EChart key={`ka-${t.key}`} option={pieOption(t, condSlices(agg.kaSummary))} />
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

      {presenting && (
        <Deck
          onExit={() => setPresenting(false)}
          slides={[
            {
              key: "cover", label: "Cover",
              node: (
                <DeckCover
                  eyebrow="UIT Jawa Bagian Tengah · Hartrans 2 - Gardu Induk"
                  title={<>Common Enemy<br />Next Level <span className="num text-amber">2026</span></>}
                  description="Monitoring temuan anomali HARGI: kondisi akhir, level anomali, distribusi per UPT, dan uraian masalah dominan. Data live dari spreadsheet sumber."
                  stats={[
                    { label: "Total Temuan", value: String(agg.stats.total) },
                    { label: "Open (F/P/C)", value: String(agg.stats.open) },
                    { label: "Close (VG/G)", value: String(agg.stats.closed) },
                    { label: "Progres", value: `${agg.stats.progress}%` },
                  ]}
                />
              ),
            },
            {
              key: "ka", label: "Kondisi Akhir",
              node: (
                <DeckChartSlide
                  no={2} total={11}
                  eyebrow="Common Enemy Next Level 2026 · HARGI"
                  title="Persentase Kondisi Akhir"
                  option={pieOption(t, condSlices(agg.kaSummary))}
                  chartKey={`dk-ka-${t.key}`}
                  notes={kaNotes}
                  side={
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wider text-ink-3">
                          <th className="py-2">Level Anomali</th>
                          <th className="px-2 text-center">Total</th>
                          <th className="px-2 text-center text-red-500">Open</th>
                          <th className="px-2 text-center text-emerald-500">Close</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agg.levelSummary.map((l) => (
                          <tr key={l.level} className="border-b border-edge/50">
                            <td className="py-2 font-medium">{l.level}</td>
                            <td className="num px-2 text-center font-bold">{l.total}</td>
                            <td className="num px-2 text-center text-red-500">{l.f + l.p + l.c}</td>
                            <td className="num px-2 text-center text-emerald-500">{l.vg + l.g}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                />
              ),
            },
            { key: "kt", label: "Kondisi Terkini", node: <DeckChartSlide no={3} total={11} eyebrow="Common Enemy Next Level 2026 · HARGI" title="Kondisi Terkini (Current)" option={pieOption(t, condSlices(agg.kondisiTerkini))} chartKey={`dk-kt-${t.key}`} notes={ktNotes} /> },
            { key: "level", label: "Level Anomali", node: <DeckChartSlide no={4} total={11} eyebrow="Common Enemy Next Level 2026 · HARGI" title="Distribusi Level Anomali" option={toGrouped(agg.byLevel)} chartKey={`dk-lvl-${t.key}`} notes={lvlNotes} /> },
            { key: "subbidang", label: "Sub Bidang", node: <DeckChartSlide no={5} total={11} eyebrow="Common Enemy Next Level 2026 · HARGI" title="Kondisi Akhir per Sub Bidang" option={simpleBarOption(t, condSlices(agg.kaSummary), { horizontal: true })} chartKey={`dk-sb-${t.key}`} notes={sbNotes} /> },
            { key: "upt", label: "Per UPT", node: <DeckChartSlide no={6} total={11} eyebrow="Common Enemy Next Level 2026 · HARGI" title="Kondisi Akhir per UPT" option={toGroupedH(agg.byUpt)} chartKey={`dk-upt-${t.key}`} notes={uptNotes} /> },
            { key: "uraian", label: "Top Uraian", node: <DeckChartSlide no={7} total={11} eyebrow="Common Enemy Next Level 2026 · HARGI" title="Distribusi per Uraian Anomali" option={hbarOption(t, uraianTop.map(([u]) => u), uraianTop.map(([, c]) => c), "#6366f1")} chartKey={`dk-ur-${t.key}`} notes={uraianNotes} /> },
            { key: "uraian-level", label: "Uraian per Level", node: <DeckChartSlide no={8} total={11} eyebrow="Common Enemy Next Level 2026 · HARGI" title="Rincian Uraian Masalah per Level Anomali" option={groupedBarOption(t, uraianLevelLabels, uraianAll.map((u, i) => ({ name: u, data: uraianLevelLabels.map((l) => agg.byLevelUraian.get(l)?.get(u) ?? 0), color: PALETTE[i % PALETTE.length] })))} chartKey={`dk-url-${t.key}`} notes={urlNotes} /> },
            {
              key: "progres-upt", label: "Progres per UPT",
              node: (
                <DeckContentSlide
                  no={9} total={11}
                  eyebrow="Common Enemy Next Level 2026 · HARGI"
                  title="Progres Penyelesaian per UPT"
                  notes={uptProgNotes}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wider text-ink-3">
                        <th className="py-2 pr-3">#</th>
                        <th className="pr-3">UPT</th>
                        <th className="px-3 text-center">Total</th>
                        <th className="px-3 text-center text-emerald-500">Close</th>
                        <th className="px-3 text-center text-red-400">Open</th>
                        <th className="px-3">Progres</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uptProgress.map((u, i) => (
                        <tr key={u.name} className="border-b border-edge/50">
                          <td className="num py-2 pr-3 text-ink-3">{i + 1}</td>
                          <td className="pr-3 font-medium">{u.name}</td>
                          <td className="num px-3 text-center">{u.total}</td>
                          <td className="num px-3 text-center text-emerald-500">{u.close}</td>
                          <td className="num px-3 text-center text-red-400">{u.open}</td>
                          <td className="px-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-40 overflow-hidden rounded-full bg-surface-2">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${u.pct}%` }}
                                />
                              </div>
                              <span className="num w-12 text-right font-bold">
                                {u.pct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DeckContentSlide>
              ),
            },
            { key: "fokus", label: "Fokus Pengerjaan", node: <DeckChartSlide no={10} total={11} eyebrow="Common Enemy Next Level 2026 · HARGI" title="Fokus Pengerjaan — Uraian Open Terbanyak" option={hbarOption(t, uraianOpenTop.map(([u]) => u), uraianOpenTop.map(([, c]) => c), "#ef4444")} chartKey={`dk-fokus-${t.key}`} notes={fokusNotes} /> },
            {
              key: "prioritas", label: "Daftar Prioritas",
              node: (
                <DeckContentSlide
                  no={11} total={11}
                  eyebrow="Common Enemy Next Level 2026 · HARGI"
                  title="Daftar Prioritas — Critical & Poor (Open)"
                  notes={prioNotes}
                >
                  {priorityRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-ink-3">
                      Tidak ada temuan Critical/Poor pada filter aktif.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wider text-ink-3">
                          <th className="py-2 pr-3">Kode</th>
                          <th className="px-3">Kondisi</th>
                          <th className="px-3">UPT</th>
                          <th className="px-3">Gardu Induk</th>
                          <th className="px-3">Alat</th>
                          <th className="px-3">Uraian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priorityRows.map((r, i) => (
                          <tr key={`${r.kode}-${i}`} className="border-b border-edge/50">
                            <td className="num py-2 pr-3 font-medium text-accent">{r.kode}</td>
                            <td className="whitespace-nowrap px-3">
                              <span
                                className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                                style={{ backgroundColor: conditionColor(r.kondisi_akhir) }}
                              >
                                {r.kondisi_akhir}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3">{r.upt}</td>
                            <td className="px-3">{r.gardu_induk}</td>
                            <td className="px-3">{r.nama_alat}</td>
                            <td className="px-3 text-ink-2">{r.uraian}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </DeckContentSlide>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
