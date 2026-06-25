"use client";

import React, { useMemo, useState } from "react";
import { Search, Info, CheckCircle2, AlertTriangle, AlertCircle, FileSpreadsheet, LayoutGrid, ExternalLink, Presentation } from "lucide-react";
import { conditionColor } from "@/lib/colors";
import { pieOption, groupedBarOption, hbarOption, simpleBarOption } from "@/lib/echart-options";
import { ChartCard } from "@/components/chart-card";
import { EChart, useChartTheme } from "@/components/echart";
import { MultiSelect } from "@/components/multi-select";
import { motion, AnimatePresence } from "framer-motion";
import { Deck, DeckCover, DeckChartSlide, DeckContentSlide, DeckB, deckPct } from "@/components/slide-deck";

export interface DBBushingRecord {
  id: number;
  techidentno: string;
  nama_upt: string;
  gardu_induk: string;
  bay_penghantar: string;
  merk: string;
  tipe: string;
  tgl_oprs: string;
  usia: string;
  thn_buat: string;
  jenis_bushing_primer_r: string;
  merk_primer_r: string;
  type_primer_r: string;
  sn_primer_r: string;
  jenis_bushing_primer_s: string;
  merk_primer_s: string;
  type_primer_s: string;
  sn_primer_s: string;
  jenis_bushing_primer_t: string;
  merk_primer_t: string;
  type_primer_t: string;
  sn_primer_t: string;
  jenis_bushing_skunder_r: string;
  merk_skunder_r: string;
  type_skunder_r: string;
  sn_skunder_r: string;
  jenis_bushing_skunder_s: string;
  merk_skunder_s: string;
  type_skunder_s: string;
  sn_skunder_s: string;
  jenis_bushing_skunder_t: string;
  merk_skunder_t: string;
  type_skunder_t: string;
  sn_skunder_t: string;
  overall: string;
  level_minyak: string;
  hasil_thermovisi: string;
  kondisi_fisik: string;
  keterangan: string;
  link_evidence: string;
}

export function AsesmentBushingView({ rows }: { rows: DBBushingRecord[] }) {
  const t = useChartTheme();
  
  // States Filter
  const [uptFilter, setUptFilter] = useState<string[]>([]);
  const [jenisBushingFilter, setJenisBushingFilter] = useState<string[]>([]);
  const [tahunFilter, setTahunFilter] = useState<string[]>([]);
  const [kondisiFilter, setKondisiFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDeck, setShowDeck] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "data">("overview");
  
  // Expanded Row State
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Map database rows to clean view records
  const records = useMemo(() => {
    return rows.map((r) => {
      const lvl = (r.level_minyak || "").trim().toUpperCase();
      const thermo = (r.hasil_thermovisi || "").trim().toUpperCase();
      const fisik = (r.kondisi_fisik || "").trim().toUpperCase();
      const ket = (r.keterangan || "").trim().toLowerCase();

      // Tentukan kondisi berdasarkan level minyak, thermovisi, dan kondisi fisik
      let kondisi: "1-Very Good" | "2-Good" | "3-Fair" | "4-Poor" | "5-Critical" = "2-Good";
      
      if (lvl === "LOW") kondisi = "4-Poor";
      else if (lvl === "MEDIUM") kondisi = "3-Fair";
      
      if (fisik === "REMBES") kondisi = "3-Fair";

      if (
        ket.includes("pecah") || 
        ket.includes("retak") || 
        ket.includes("gompel") || 
        ket.includes("critical")
      ) {
        kondisi = "5-Critical";
      } else if (ket.includes("bocor") || ket.includes("rembes") || ket.includes("low")) {
        kondisi = "3-Fair";
      }

      // Tentukan parameter uji utama
      let parameterUji = "Lain-lain";
      if (lvl && lvl !== "NORMAL" && lvl !== "TIDAK ADA DATA" && lvl !== "-") parameterUji = "Level Minyak";
      else if (fisik && fisik !== "NORMAL") parameterUji = "Kondisi Fisik";
      else if (thermo && thermo !== "NORMAL") parameterUji = "Hasil Thermovisi";
      else if (ket.includes("tan delta") || ket.includes("tadel")) parameterUji = "Hasil Uji Tadel";
      else if (ket.includes("center tap")) parameterUji = "Kondisi Center Tap";

      // Tentukan status tindak lanjut
      let statusTindakLanjut: "Open" | "Close" = "Close";
      if (kondisi === "3-Fair" || kondisi === "4-Poor" || kondisi === "5-Critical") {
        statusTindakLanjut = "Open";
        if (
          ket.includes("selesai") ||
          ket.includes("diperbaiki") ||
          // perbaikan level minyak low
          ket.includes("sudah ditambahkan") ||
          ket.includes("telah ditambahkan") ||
          ket.includes("normal")
        ) {
          statusTindakLanjut = "Close";
        }
      }

      // Tentukan hasil uji ringkas
      let hasilUji = "Kondisi Bushing Normal";
      if (lvl && lvl !== "NORMAL" && lvl !== "TIDAK ADA DATA" && lvl !== "-") {
        hasilUji = `Level Minyak: ${r.level_minyak}`;
      } else if (fisik && fisik !== "NORMAL") {
        hasilUji = `Kondisi Fisik: ${r.kondisi_fisik}`;
      } else if (thermo && thermo !== "NORMAL") {
        hasilUji = `Thermovisi: ${r.hasil_thermovisi}`;
      }

      if (r.keterangan) {
        hasilUji = r.keterangan;
      }

      // Deteksi Tegangan dari Bay
      let tegangan = "150 kV";
      const bayUpper = r.bay_penghantar.toUpperCase();
      if (bayUpper.includes("500KV") || bayUpper.includes("500 KV")) tegangan = "500 kV";

      const jR = (r.jenis_bushing_primer_r || "-").trim();
      const jS = (r.jenis_bushing_primer_s || "-").trim();
      const jT = (r.jenis_bushing_primer_t || "-").trim();
      const mR = (r.merk_primer_r || "-").trim();
      const mS = (r.merk_primer_s || "-").trim();
      const mT = (r.merk_primer_t || "-").trim();

      const jenisBushing = Array.from(new Set([jR, jS, jT].filter(x => x !== "-"))).join(", ") || "-";
      const merkBushing = Array.from(new Set([mR, mS, mT].filter(x => x !== "-"))).join(", ") || "-";

      return {
        id: `BSH-${String(r.id).padStart(3, "0")}`,
        dbId: r.id,
        upt: r.nama_upt,
        garduInduk: r.gardu_induk,
        bayTrafo: r.bay_penghantar,
        fasa: "3 Phase",
        tegangan,
        jenisBushingList: [jR, jS, jT],
        merkBushingList: [mR, mS, mT],
        jenisBushing,
        merkBushing,
        tahunBuat: (r.thn_buat || "-").trim(),
        parameterUji,
        hasilUji,
        kondisi,
        tglAsesment: r.tgl_oprs ? r.tgl_oprs.split(" ")[0] : "-",
        statusTindakLanjut,
        rekomendasi: r.keterangan || "Kondisi normal. Lanjutkan pemantauan berkala.",
        original: r
      };
    });
  }, [rows]);

  const uptOptions = useMemo(() => Array.from(new Set(records.map(r => r.upt))).sort(), [records]);
  const jenisBushingOptions = useMemo(() => {
    const all = records.flatMap(r => r.jenisBushingList).filter(x => x && x !== "-");
    return Array.from(new Set(all)).sort();
  }, [records]);
  const tahunOptions = useMemo(() => Array.from(new Set(records.map(r => r.tahunBuat))).sort(), [records]);
  const kondisiOptions = ["Very Good", "Good", "Fair", "Poor", "Critical"];
  const statusOptions = ["Open", "Close"];

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchUpt = uptFilter.length === 0 || uptFilter.includes(r.upt);
      const matchJenis = jenisBushingFilter.length === 0 || jenisBushingFilter.some(f => r.jenisBushingList.includes(f));
      const matchTahun = tahunFilter.length === 0 || tahunFilter.includes(r.tahunBuat);
      const matchKondisi = kondisiFilter.length === 0 || kondisiFilter.includes(r.kondisi.replace(/^\d-/, ""));
      const matchStatus = statusFilter.length === 0 || statusFilter.includes(r.statusTindakLanjut);
      
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = searchQuery === "" || 
        r.garduInduk.toLowerCase().includes(searchLower) ||
        r.bayTrafo.toLowerCase().includes(searchLower) ||
        r.id.toLowerCase().includes(searchLower) ||
        r.parameterUji.toLowerCase().includes(searchLower);

      return matchUpt && matchJenis && matchTahun && matchKondisi && matchStatus && matchSearch;
    });
  }, [records, uptFilter, jenisBushingFilter, tahunFilter, kondisiFilter, statusFilter, searchQuery]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    let totalBushings = 0;
    let criticalCount = 0;
    let poorCount = 0;
    let fairCount = 0;
    let goodCount = 0;
    let veryGoodCount = 0;
    let openCount = 0;

    filteredRecords.forEach((r) => {
      let bCount = 0;
      r.jenisBushingList.forEach(b => {
        if (b && b !== "-") bCount++;
      });
      totalBushings += bCount;

      if (r.kondisi === "5-Critical") criticalCount += bCount;
      else if (r.kondisi === "4-Poor") poorCount += bCount;
      else if (r.kondisi === "3-Fair") fairCount += bCount;
      else if (r.kondisi === "2-Good") goodCount += bCount;
      else if (r.kondisi === "1-Very Good") veryGoodCount += bCount;

      if (r.statusTindakLanjut === "Open") openCount += bCount;
    });

    const healthyCount = goodCount + veryGoodCount;
    const healthIndex = totalBushings > 0 ? Math.round((healthyCount / totalBushings) * 100) : 100;

    return {
      total,
      totalBushings,
      critical: criticalCount,
      poor: poorCount,
      fair: fairCount,
      good: goodCount,
      veryGood: veryGoodCount,
      criticalPoor: criticalCount + poorCount,
      open: openCount,
      healthIndex
    };
  }, [filteredRecords]);

  // Reset Filters
  const handleResetFilters = () => {
    setUptFilter([]);
    setJenisBushingFilter([]);
    setTahunFilter([]);
    setKondisiFilter([]);
    setStatusFilter([]);
    setSearchQuery("");
  };

  // ECharts: Sebaran Jenis Bushing per UPT (Grouped Bar)
  const uptTotalChartOption = useMemo(() => {
    const upts = Array.from(new Set(filteredRecords.map(r => r.upt))).sort();
    
    // Dapatkan daftar unik jenis bushing dari data yang terfilter
    const jenisSet = new Set<string>();
    filteredRecords.forEach(r => r.jenisBushingList.forEach(j => {
      if (j !== "-") jenisSet.add(j);
    }));
    const jenisArr = Array.from(jenisSet).sort();

    const palette = [
      "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
      "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
    ];

    const series = jenisArr.map((jenis, i) => {
      return {
        name: jenis,
        data: upts.map((u) => {
          let count = 0;
          filteredRecords.forEach(r => {
            if (r.upt === u) {
              r.jenisBushingList.forEach(j => {
                if (j === jenis) count++;
              });
            }
          });
          return count;
        }),
        color: palette[i % palette.length]
      };
    });

    return groupedBarOption(
      t, 
      upts.map(u => u.replace("UPT ", "")), 
      series,
      { rotateLabel: 35 }
    );
  }, [filteredRecords, t]);

  // ECharts: Kondisi Bushing per UPT
  const uptChartOption = useMemo(() => {
    const upts = Array.from(new Set(filteredRecords.map(r => r.upt))).sort();
    const conds = ["1-Very Good", "2-Good", "3-Fair", "4-Poor", "5-Critical"];
    
    const series = conds.map((c) => {
      return {
        name: c.replace(/^\d-/, ""),
        data: upts.map((u) => {
          let cnt = 0;
          filteredRecords.forEach(r => {
            if (r.upt === u && r.kondisi === c) {
              cnt += r.jenisBushingList.filter(b => b && b !== "-").length;
            }
          });
          return cnt;
        }),
        color: conditionColor(c)
      };
    });

    return groupedBarOption(
      t, 
      upts.map(u => u.replace("UPT ", "")), 
      series.map(s => ({
        name: s.name,
        data: s.data,
        color: s.color
      })),
      { rotateLabel: 35 }
    );
  }, [filteredRecords, t]);

  // ECharts: Parameter Uji vs Temuan
  const parameterChartOption = useMemo(() => {
    const paramCounts: Record<string, number> = {
      "Level Minyak": 0,
      "Hasil Thermovisi": 0,
      "Kondisi Fisik": 0,
      "Hasil Uji Tadel": 0,
      "Kondisi Center Tap": 0
    };
    filteredRecords.forEach(r => {
      const p = r.parameterUji;
      if (p !== "Lain-lain") {
        const bCount = r.jenisBushingList.filter(b => b && b !== "-").length;
        paramCounts[p] = (paramCounts[p] || 0) + bCount;
      }
    });

    const sortedParams = Object.entries(paramCounts)
      .sort((a, b) => b[1] - a[1]);

    return hbarOption(
      t,
      sortedParams.map(x => x[0]),
      sortedParams.map(x => x[1]),
      "var(--accent)"
    );
  }, [filteredRecords, t]);

  // ECharts: Jenis Bushing
  const jenisChartOption = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      r.jenisBushingList.forEach(p => {
        if (p && p !== "-") counts[p] = (counts[p] || 0) + 1;
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return hbarOption(
      t,
      sorted.map(x => x[0]),
      sorted.map(x => x[1]),
      "#3b82f6" // blue
    );
  }, [filteredRecords, t]);

  // ECharts: Merk Bushing
  const merkChartOption = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      r.merkBushingList.forEach(p => {
        if (p && p !== "-") counts[p] = (counts[p] || 0) + 1;
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return hbarOption(
      t,
      sorted.map(x => x[0]),
      sorted.map(x => x[1]),
      "#f59e0b" // amber
    );
  }, [filteredRecords, t]);

  // ECharts: Klasifikasi Usia Bushing
  const usiaChartOption = useMemo(() => {
    let old = 0; // >= 25
    let mid = 0; // 15 - 24
    let newB = 0; // < 15
    const currentYear = new Date().getFullYear();

    filteredRecords.forEach(r => {
      const year = parseInt(r.tahunBuat, 10);
      if (!isNaN(year)) {
        const age = currentYear - year;
        const bCount = r.jenisBushingList.filter(b => b && b !== "-").length;
        if (age >= 25) old += bCount;
        else if (age >= 15) mid += bCount;
        else newB += bCount;
      }
    });

    const slices = [
      { name: ">= 25 Tahun", value: old, color: "#ef4444" },
      { name: "15 - 24 Tahun", value: mid, color: "#f59e0b" },
      { name: "< 15 Tahun", value: newB, color: "#10b981" },
    ].filter(s => s.value > 0);

    return pieOption(t, slices);
  }, [filteredRecords, t]);

  // ===== Slide Deck Slides =====
  const slides = useMemo(() => {
    // Top 15 Open
    const priorityList = filteredRecords
      .filter(r => r.statusTindakLanjut === "Open")
      .slice(0, 15);

    return [
      {
        key: "summary",
        label: "Ringkasan",
        node: (
          <DeckCover
            eyebrow="Monitoring Asesment Bushing"
            title={<>Ringkasan Temuan & <br/>Kondisi Terkini</>}
            description="Status penanganan dan hasil pemantauan asesment bushing GI di lingkungan Hartrans 2."
            stats={[
              { label: "Bushing Terpantau", value: `${stats.totalBushings}`, sub: "Unit" },
              { label: "Kondisi Critical/Poor", value: `${stats.criticalPoor}`, sub: "Temuan" },
              { label: "Tindak Lanjut (OPEN)", value: `${stats.open}`, sub: "Pekerjaan" },
              { label: "Health Index", value: `${stats.healthIndex}%` },
            ]}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl">
              <ChartCard title="Sebaran Jenis Bushing per UPT" className="min-h-[300px] lg:h-[22rem]">
                {stats.total === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-ink-3">Tidak ada data</div>
                ) : (
                  <EChart key={`s-upt-pie-${t.key}`} option={uptTotalChartOption} />
                )}
              </ChartCard>
              <ChartCard title="Klasifikasi Usia Bushing" className="min-h-[300px] lg:h-[22rem]">
                {stats.total === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-ink-3">Tidak ada data</div>
                ) : (
                  <EChart key={`s-usia-${t.key}`} option={usiaChartOption} />
                )}
              </ChartCard>
            </div>
          </DeckCover>
        ),
      },
      {
        key: "analysis",
        label: "Analisis Bushing",
        node: (
          <DeckCover
            eyebrow="Analisis Data"
            title="Profil Parameter Uji & Spesifikasi Aset"
            description="Rincian masalah yang paling banyak ditemukan beserta sebaran spesifikasi aset."
            stats={[]}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl">
              <div className="flex flex-col gap-6">
                <ChartCard title="Temuan per Parameter Uji" className="min-h-[300px] lg:h-72">
                  {stats.total === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-ink-3">Tidak ada data</div>
                  ) : (
                    <EChart key={`s-param-${t.key}`} option={parameterChartOption} />
                  )}
                </ChartCard>
                <ChartCard title="Grafik Kondisi Bushing per UPT" className="min-h-[300px] lg:h-72">
                  {stats.total === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-ink-3">Tidak ada data</div>
                  ) : (
                    <EChart key={`s-upt-${t.key}`} option={uptChartOption} />
                  )}
                </ChartCard>
              </div>
              <div className="flex flex-col gap-6">
                <ChartCard title="Jumlah Berdasarkan Jenis Bushing" className="min-h-[300px] lg:h-72">
                  {stats.total === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-ink-3">Tidak ada data</div>
                  ) : (
                    <EChart key={`s-jenis-${t.key}`} option={jenisChartOption} />
                  )}
                </ChartCard>
                <ChartCard title="Jumlah Berdasarkan Merk Bushing" className="min-h-[300px] lg:h-72">
                  {stats.total === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-ink-3">Tidak ada data</div>
                  ) : (
                    <EChart key={`s-merk-${t.key}`} option={merkChartOption} />
                  )}
                </ChartCard>
              </div>
            </div>
          </DeckCover>
        ),
      },
      {
        key: "priority",
        label: "Tindak Lanjut",
        node: (
          <DeckCover
            eyebrow="Fokus Penanganan"
            title="Daftar Temuan Prioritas (OPEN)"
            description="Bushing yang memerlukan investigasi perbaikan, monitoring online, atau thermography berkala."
            stats={[]}
          >
            <ChartCard title="Butuh Tindak Lanjut" badge={`${priorityList.length} Temuan Teratas`} className="max-w-6xl">
              <div className="max-h-[32rem] overflow-auto scrollbar-thin">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-surface-solid">
                    <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-ink-3">
                      <th className="py-2 pr-3">ID</th>
                      <th className="px-3">UPT</th>
                      <th className="px-3">Gardu Induk / Bay</th>
                      <th className="px-3">Parameter Uji Dominan</th>
                      <th className="px-3">Keterangan</th>
                      <th className="pl-3 text-right">Kondisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorityList.map((r, i) => (
                      <tr key={i} className="border-b border-edge/40 transition-colors hover:bg-surface-2">
                        <td className="num py-2 pr-3 font-medium text-accent">{r.id}</td>
                        <td className="px-3 whitespace-nowrap">{r.upt.replace(/^UPT /, "")}</td>
                        <td className="px-3">
                          <div className="font-bold">{r.garduInduk}</div>
                          <div className="text-[10px] text-ink-3">{r.bayTrafo}</div>
                        </td>
                        <td className="px-3">{r.parameterUji}</td>
                        <td className="px-3 max-w-sm truncate" title={r.original.keterangan || "-"}>{r.original.keterangan || "-"}</td>
                        <td className="pl-3 text-right whitespace-nowrap font-bold" style={{ color: conditionColor(r.kondisi) }}>
                          {r.kondisi.replace(/^\d-/, "")}
                        </td>
                      </tr>
                    ))}
                    {priorityList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-ink-3">Tidak ada data temuan dengan status OPEN pada filter saat ini.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </DeckCover>
        )
      }
    ];
  }, [filteredRecords, stats, t, uptTotalChartOption, uptChartOption, parameterChartOption, jenisChartOption, merkChartOption]);

  return (
    <div className="space-y-6">
      {showDeck && <Deck slides={slides} onExit={() => setShowDeck(false)} />}
      
      {/* 1. FILTER BAR PANEL */}
      <div className="card rise rise-1 relative z-30 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <MultiSelect
              label="UPT"
              options={uptOptions}
              selected={uptFilter}
              onChange={setUptFilter}
            />
            <MultiSelect
              label="Jenis Bushing"
              options={jenisBushingOptions}
              selected={jenisBushingFilter}
              onChange={setJenisBushingFilter}
            />
            <MultiSelect
              label="Tahun Buat"
              options={tahunOptions}
              selected={tahunFilter}
              onChange={setTahunFilter}
            />
            <MultiSelect
              label="Kondisi"
              options={kondisiOptions}
              selected={kondisiFilter}
              onChange={setKondisiFilter}
            />
            <MultiSelect
              label="Tindak Lanjut"
              options={statusOptions}
              selected={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          {/* Search & Reset Button */}
          <div className="flex flex-col gap-1.5 md:w-auto">
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-3 md:hidden">Pencarian & Aksi</label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-3" />
                <input
                  type="text"
                  placeholder="Cari GI, Bay..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-edge bg-surface-2 pl-9 pr-3 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={handleResetFilters}
                className="flex h-9 items-center justify-center rounded-lg bg-surface-2 px-3 text-xs font-medium text-ink-2 hover:bg-surface-3 hover:text-ink transition-colors border border-edge"
                title="Reset Filter"
              >
                Reset
              </button>
              <button
                onClick={() => setShowDeck(true)}
                className="flex h-9 items-center justify-center gap-2 rounded-lg bg-surface-2 px-4 text-xs font-medium text-ink hover:bg-surface-3 transition-colors border border-edge"
              >
                <Presentation className="h-4 w-4" /> Slide Deck
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI STRIP (4 Cards) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Total Asesment */}
        <div className="card rise rise-2 p-5 flex flex-col justify-between min-h-28 relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <FileSpreadsheet className="h-12 w-12 text-accent" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">Total Bushing Terpantau</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="num text-4xl font-extrabold tracking-tight">{stats.totalBushings}</span>
            <span className="text-xs font-bold text-ink-3">Unit</span>
          </div>
          <div className="text-[10px] text-ink-3 mt-1">Data dari spreadsheet aktif</div>
        </div>

        {/* Card 2: Critical & Poor */}
        <div className="card rise rise-3 p-5 flex flex-col justify-between min-h-28 relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">Kondisi Critical & Poor</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="num text-4xl font-extrabold tracking-tight text-red-500">{stats.criticalPoor}</span>
            <span className="text-xs font-bold text-ink-3">Temuan</span>
          </div>
          <div className="text-[10px] text-ink-3 mt-1">
            <span className="num text-red-500 font-bold">{stats.critical} Critical</span> &middot; <span className="num text-red-400 font-bold">{stats.poor} Poor</span>
          </div>
        </div>

        {/* Card 3: Open Action Items */}
        <div className="card rise rise-4 p-5 flex flex-col justify-between min-h-28 relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <AlertCircle className="h-12 w-12 text-amber" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">Butuh Tindak Lanjut (OPEN)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="num text-4xl font-extrabold tracking-tight text-amber">{stats.open}</span>
            <span className="text-xs font-bold text-ink-3">Pekerjaan</span>
          </div>
          <div className="text-[10px] text-ink-3 mt-1">Status penanganan aktif</div>
        </div>

        {/* Card 4: Health Index */}
        <div className="card rise rise-5 p-5 flex flex-col justify-between min-h-28 relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">Bushing Health Index</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="num text-4xl font-extrabold tracking-tight text-emerald-500">{stats.healthIndex}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-2 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${stats.healthIndex}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. TABS BAR CONTROLLER */}
      <div className="flex border-b border-edge overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-accent text-accent"
              : "border-transparent text-ink-3 hover:text-ink hover:border-edge"
          }`}
        >
          <LayoutGrid className="h-4 w-4" /> Ringkasan & Statistik
        </button>
        <button
          onClick={() => setActiveTab("data")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "data"
              ? "border-accent text-accent"
              : "border-transparent text-ink-3 hover:text-ink hover:border-edge"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" /> Data Hasil Asesment ({filteredRecords.length})
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
          >
            {/* Chart 1: Donut Sebaran UPT */}
            <ChartCard title="Sebaran Jenis Bushing per UPT" className="h-[300px] md:h-80 col-span-1">
              {stats.total === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-ink-3 text-xs">
                  Tidak ada data untuk filter saat ini.
                </div>
              ) : (
                <EChart key={`upt-pie-${t.key}`} option={uptTotalChartOption} />
              )}
            </ChartCard>

            {/* Chart 2: Klasifikasi Usia Bushing */}
            <ChartCard title="Klasifikasi Usia Bushing" className="h-80 col-span-1">
              {stats.total === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-ink-3 text-xs">
                  Tidak ada data untuk filter saat ini.
                </div>
              ) : (
                <EChart key={`usia-${t.key}`} option={usiaChartOption} />
              )}
            </ChartCard>

            {/* Chart 3: Jenis Bushing */}
            <ChartCard title="Jumlah Berdasarkan Jenis Bushing" className="h-80 col-span-1">
              {stats.total === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-ink-3 text-xs">
                  Tidak ada data untuk filter saat ini.
                </div>
              ) : (
                <EChart key={`jenis-${t.key}`} option={jenisChartOption} />
              )}
            </ChartCard>

            {/* Chart 4: Merk Bushing */}
            <ChartCard title="Jumlah Berdasarkan Merk Bushing" className="h-80 col-span-1">
              {stats.total === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-ink-3 text-xs">
                  Tidak ada data untuk filter saat ini.
                </div>
              ) : (
                <EChart key={`merk-${t.key}`} option={merkChartOption} />
              )}
            </ChartCard>

            {/* Chart 5: Top Parameter Uji */}
            <ChartCard title="Analisis Temuan per Parameter Uji" className="h-80 col-span-1">
              {stats.total === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-ink-3 text-xs">
                  Tidak ada data untuk filter saat ini.
                </div>
              ) : (
                <EChart key={`param-${t.key}`} option={parameterChartOption} />
              )}
            </ChartCard>

            {/* Chart 6: Kondisi Bushing per UPT */}
            <ChartCard title="Grafik Kondisi Bushing per UPT" className="h-[300px] md:h-80 col-span-1">
              {stats.total === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-ink-3 text-xs">
                  Tidak ada data untuk filter saat ini.
                </div>
              ) : (
                <EChart key={`upt-${t.key}`} option={uptChartOption} />
              )}
            </ChartCard>
          </motion.div>
        ) : (
          <motion.div
            key="data"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="card overflow-hidden flex flex-col min-h-[500px] md:h-[calc(100vh-250px)]"
          >
            {/* Detailed Records Table */}
            <div className="flex-1 overflow-auto scrollbar-thin">
              <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-edge bg-surface-2 text-left text-[10px] uppercase tracking-wider text-ink-3">
                      <th className="p-3 w-10"></th>
                      <th className="p-3 w-24">ID</th>
                      <th className="p-3 w-32">UPT</th>
                      <th className="p-3">Gardu Induk / Bay</th>
                      <th className="p-3 w-32">Jenis Bushing</th>
                      <th className="p-3 w-32">Merk Bushing</th>
                      <th className="p-3 w-24 text-center">Tegangan</th>
                      <th className="p-3 w-32 text-center">Kondisi</th>
                      <th className="p-3 w-24 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-ink-3 font-medium">
                          Tidak ditemukan data hasil asesment bushing yang cocok dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => {
                        const isExpanded = expandedId === r.id;
                        return (
                          <React.Fragment key={r.id}>
                            {/* Main Row */}
                            <tr 
                              onClick={() => setExpandedId(isExpanded ? null : r.id)}
                              className="border-b border-edge/40 transition-colors hover:bg-surface-2 cursor-pointer"
                            >
                              <td className="p-3 text-center text-ink-3">
                                <span className="font-mono">{isExpanded ? "▼" : "▶"}</span>
                              </td>
                              <td className="p-3 font-mono font-medium text-accent">{r.id}</td>
                              <td className="p-3 whitespace-nowrap font-medium text-ink">{r.upt.replace("UPT ", "")}</td>
                              <td className="p-3">
                                <div className="font-bold text-ink">{r.garduInduk}</div>
                                <div className="text-[11px] text-ink-3">{r.bayTrafo} &middot; Merk: {r.original.merk || "-"}</div>
                              </td>
                              <td className="p-3 whitespace-nowrap font-medium">{r.jenisBushing}</td>
                              <td className="p-3 whitespace-nowrap font-medium">{r.merkBushing}</td>
                              <td className="p-3 text-center whitespace-nowrap font-mono">{r.tegangan}</td>
                              <td className="p-3 text-center">
                                <span 
                                  className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{ 
                                    backgroundColor: `${conditionColor(r.kondisi)}22`, 
                                    color: conditionColor(r.kondisi) 
                                  }}
                                >
                                  {r.kondisi.replace(/^\d-/, "")}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span 
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    r.statusTindakLanjut === "Open"
                                      ? "bg-amber/10 text-amber"
                                      : "bg-emerald-500/10 text-emerald-500"
                                  }`}
                                >
                                  {r.statusTindakLanjut}
                                </span>
                              </td>
                            </tr>
                            
                            {/* Expanded Row */}
                            {isExpanded && (
                              <tr className="bg-surface-2/45 border-b border-edge/40">
                                <td colSpan={8} className="p-4">
                                  <div className="space-y-4">
                                    {/* 1. Detail Equipment Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-3">Data Trafo</span>
                                        <div className="text-[11px]">Tipe: <span className="font-bold">{r.original.tipe || "-"}</span></div>
                                        <div className="text-[11px]">Thn Buat: <span className="font-bold">{r.original.thn_buat || "-"}</span></div>
                                        <div className="text-[11px]">Usia Aset: <span className="font-bold font-mono">{r.original.usia || "-"} Tahun</span></div>
                                        <div className="text-[11px]">Tgl Operasi: <span className="font-bold">{r.original.tgl_oprs ? r.original.tgl_oprs.split(" ")[0] : "-"}</span></div>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-3">Bushing Primer (HV)</span>
                                        <div className="text-[11px]">Ph R: <span className="font-semibold text-ink-2">{r.original.jenis_bushing_primer_r || "-"} ({r.original.merk_primer_r || "-"})</span></div>
                                        <div className="text-[11px]">Ph S: <span className="font-semibold text-ink-2">{r.original.jenis_bushing_primer_s || "-"} ({r.original.merk_primer_s || "-"})</span></div>
                                        <div className="text-[11px]">Ph T: <span className="font-semibold text-ink-2">{r.original.jenis_bushing_primer_t || "-"} ({r.original.merk_primer_t || "-"})</span></div>
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-3">Bushing Sekunder (LV)</span>
                                        <div className="text-[11px]">Ph R: <span className="font-semibold text-ink-2">{r.original.jenis_bushing_skunder_r || "-"} ({r.original.merk_skunder_r || "-"})</span></div>
                                        <div className="text-[11px]">Ph S: <span className="font-semibold text-ink-2">{r.original.jenis_bushing_skunder_s || "-"} ({r.original.merk_skunder_s || "-"})</span></div>
                                        <div className="text-[11px]">Ph T: <span className="font-semibold text-ink-2">{r.original.jenis_bushing_skunder_t || "-"} ({r.original.merk_skunder_t || "-"})</span></div>
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-3">Hasil Uji Parameter</span>
                                        <div className="text-[11px]">Level Minyak: <span className="font-semibold">{r.original.level_minyak || "-"}</span></div>
                                        <div className="text-[11px]">Thermovisi: <span className="font-semibold">{r.original.hasil_thermovisi || "-"}</span></div>
                                        <div className="text-[11px]">Kondisi Fisik: <span className="font-semibold">{r.original.kondisi_fisik || "-"}</span></div>
                                      </div>
                                    </div>

                                    {/* 2. Detail Temuan & Keterangan */}
                                    <div className="p-3 bg-surface rounded-lg border border-edge space-y-2">
                                      <div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-3 block">Uraian Temuan / Keterangan</span>
                                        <p className="text-[11.5px] font-medium mt-0.5">{r.original.keterangan || "Tidak ada temuan anomali pada visual, level minyak, maupun thermovisi (Kondisi Normal)."}</p>
                                      </div>
                                      
                                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-edge/60">
                                        <div className="flex items-center gap-2">
                                          <Info className="h-4 w-4 text-accent" />
                                          <span className="text-[11px] text-ink-2">
                                            <strong>Rekomendasi Tindak Lanjut: </strong> 
                                            {r.statusTindakLanjut === "Open" ? "Lakukan investigasi perbaikan, monitoring online, dan thermography berkala." : "Lanjutkan pemantauan rutin 2 bulanan."}
                                          </span>
                                        </div>

                                        {r.original.link_evidence && r.original.link_evidence.startsWith("http") && (
                                          <a 
                                            href={r.original.link_evidence} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 rounded bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-accent hover:bg-accent hover:text-white transition-colors"
                                          >
                                            Evidence Foto <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
