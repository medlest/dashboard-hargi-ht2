"use client";

import React, { useMemo, useState } from "react";
import { Search, Info, CheckCircle2, AlertTriangle, AlertCircle, FileSpreadsheet, LayoutGrid, ExternalLink, Presentation } from "lucide-react";
import { conditionColor } from "@/lib/colors";
import { pieOption, groupedBarOption, hbarOption, simpleBarOption, stackedBarOption } from "@/lib/echart-options";
import { ChartCard } from "@/components/chart-card";
import { EChart, useChartTheme } from "@/components/echart";
import { MultiSelect } from "@/components/multi-select";
import { motion, AnimatePresence } from "framer-motion";
import { Deck, DeckCover, DeckChartSlide, DeckContentSlide, DeckB, deckPct } from "@/components/slide-deck";

export interface DBBushingRecord {
  id: number;
  no: string;
  nama_upt: string;
  gardu_induk: string;
  bay_penghantar: string;
  merk: string;
  tipe: string;
  tgl_oprs: string;
  thn_buat: string;
  usia: string;
  fasa: string;
  merk_bushing: string;
  type_bushing: string;
  no_seri: string;
  jenis_bushing: string;
  level_minyak: string;
  hasil_thermovisi: string;
  kondisi_fisik: string;
  nilai_tadel: string;
  hasil_uji_tandel: string;
  kondisi_center_tap: string;
  keterangan: string;
}

const PARAMS_CONFIG = [
  {
    name: "Level Minyak",
    classes: ["NORMAL", "MEDIUM", "LOW"],
    colors: { "NORMAL": "#10b981", "MEDIUM": "#f59e0b", "LOW": "#ef4444" },
    getValue: (r: any) => {
      const v = (r.original.level_minyak || "").trim().toUpperCase();
      if (v === "LOW") return "LOW";
      if (v === "MEDIUM") return "MEDIUM";
      return "NORMAL";
    }
  },
  {
    name: "Hasil Thermovisi",
    classes: ["NORMAL", "HOTSPOT"],
    colors: { "NORMAL": "#10b981", "HOTSPOT": "#ef4444" },
    getValue: (r: any) => {
      const v = (r.original.hasil_thermovisi || "").trim().toUpperCase();
      if (v === "HOTSPOT") return "HOTSPOT";
      return "NORMAL";
    }
  },
  {
    name: "Kondisi Fisik",
    classes: ["NORMAL", "REMBES", "RETAK"],
    colors: { "NORMAL": "#10b981", "REMBES": "#f59e0b", "RETAK": "#ef4444" },
    getValue: (r: any) => {
      const v = (r.original.kondisi_fisik || "").trim().toUpperCase();
      if (v.includes("RETAK")) return "RETAK";
      if (v.includes("REMBES")) return "REMBES";
      return "NORMAL";
    }
  },
  {
    name: "Hasil Uji Tadel",
    classes: ["VERY GOOD", "GOOD", "FAIR", "POOR", "CRITICAL"],
    colors: { "VERY GOOD": "#3b82f6", "GOOD": "#10b981", "FAIR": "#fbbf24", "POOR": "#f87171", "CRITICAL": "#b91c1c" },
    getValue: (r: any) => {
      const v = (r.original.hasil_uji_tandel || "").trim().toUpperCase();
      if (v === "CRITICAL") return "CRITICAL";
      if (v === "POOR") return "POOR";
      if (v === "FAIR") return "FAIR";
      if (v === "VERY GOOD") return "VERY GOOD";
      return "GOOD"; // Fallback to GOOD because default Tadel score is 2-Good
    }
  },
  {
    name: "Kondisi Center Tap",
    classes: ["NORMAL", "ANOMALI"],
    colors: { "NORMAL": "#10b981", "ANOMALI": "#ef4444" },
    getValue: (r: any) => {
      const ket = (r.original.keterangan || "").trim().toUpperCase();
      if (ket.includes("CENTER TAP") && r.kondisi !== "1-Very Good" && r.kondisi !== "2-Good") return "ANOMALI";
      return "NORMAL";
    }
  }
];

export function AsesmentBushingView({ rows }: { rows: DBBushingRecord[] }) {
  const t = useChartTheme();
  
  // States Filter
  const [uptFilter, setUptFilter] = useState<string[]>([]);
  const [jenisBushingFilter, setJenisBushingFilter] = useState<string[]>([]);
  const [tahunFilter, setTahunFilter] = useState<string[]>([]);
  const [kondisiFilter, setKondisiFilter] = useState<string[]>([]);
  const [levelMinyakFilter, setLevelMinyakFilter] = useState<string[]>([]);
  const [thermovisiFilter, setThermovisiFilter] = useState<string[]>([]);
  const [kondisiFisikFilter, setKondisiFisikFilter] = useState<string[]>([]);
  const [nilaiTadelFilter, setNilaiTadelFilter] = useState<string[]>([]);
  const [centerTapFilter, setCenterTapFilter] = useState<string[]>([]);
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

      // Tentukan parameter uji utama (ambil tadelVal di awal untuk penentuan kondisi)
      const tadelVal = (r.hasil_uji_tandel || "").trim().toUpperCase();

      // Tentukan kondisi berdasarkan level minyak, thermovisi, kondisi fisik, dan hasil tandel
      let score = 2; // Default 2-Good
      if (tadelVal === "VERY GOOD") score = 1;

      if (lvl === "MEDIUM") score = Math.max(score, 3);
      if (lvl === "LOW") score = Math.max(score, 4);
      
      if (fisik === "REMBES") score = Math.max(score, 3);

      if (thermo === "HOTSPOT") score = Math.max(score, 4);

      if (tadelVal === "FAIR") score = Math.max(score, 3);
      if (tadelVal === "POOR") score = Math.max(score, 4);
      if (tadelVal === "CRITICAL") score = Math.max(score, 5);

      if (
        ket.includes("pecah") || 
        ket.includes("retak") || 
        ket.includes("gompel") || 
        ket.includes("critical")
      ) {
        score = Math.max(score, 5);
      } else if (ket.includes("bocor") || ket.includes("rembes") || ket.includes("low")) {
        score = Math.max(score, 3);
      }

      let kondisi: "1-Very Good" | "2-Good" | "3-Fair" | "4-Poor" | "5-Critical";
      if (score === 5) kondisi = "5-Critical";
      else if (score === 4) kondisi = "4-Poor";
      else if (score === 3) kondisi = "3-Fair";
      else if (score === 2) kondisi = "2-Good";
      else kondisi = "1-Very Good";

      let parameterUji = "Lain-lain";
      if (lvl && lvl !== "NORMAL" && lvl !== "TIDAK ADA DATA" && lvl !== "-") parameterUji = "Level Minyak";
      else if (fisik && fisik !== "NORMAL") parameterUji = "Kondisi Fisik";
      else if (thermo && thermo !== "NORMAL") parameterUji = "Hasil Thermovisi";
      else if (tadelVal && tadelVal !== "NORMAL" && tadelVal !== "GOOD" && tadelVal !== "VERY GOOD" && tadelVal !== "-") parameterUji = "Hasil Uji Tadel";
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

      const jenisBushing = (r.jenis_bushing || "-").trim();
      const merkBushing = (r.merk_bushing || "-").trim();

      return {
        id: `BSH-${String(r.id).padStart(3, "0")}`,
        dbId: r.id,
        upt: r.nama_upt,
        garduInduk: r.gardu_induk,
        bayTrafo: r.bay_penghantar,
        fasa: (r.fasa || "-").trim(),
        tegangan,
        jenisBushingList: jenisBushing !== "-" ? [jenisBushing] : [],
        merkBushingList: merkBushing !== "-" ? [merkBushing] : [],
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
  
  const levelMinyakOptions = useMemo(() => Array.from(new Set(records.map(r => (r.original.level_minyak || "").trim()).filter(x => x && x !== "-"))).sort(), [records]);
  const thermovisiOptions = useMemo(() => Array.from(new Set(records.map(r => (r.original.hasil_thermovisi || "").trim()).filter(x => x && x !== "-"))).sort(), [records]);
  const kondisiFisikOptions = useMemo(() => Array.from(new Set(records.map(r => (r.original.kondisi_fisik || "").trim()).filter(x => x && x !== "-"))).sort(), [records]);
  const nilaiTadelOptions = useMemo(() => Array.from(new Set(records.map(r => (r.original.nilai_tadel || "").trim()).filter(x => x && x !== "-"))).sort(), [records]);
  const centerTapOptions = useMemo(() => Array.from(new Set(records.map(r => (r.original.kondisi_center_tap || "").trim()).filter(x => x && x !== "-"))).sort(), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchUpt = uptFilter.length === 0 || uptFilter.includes(r.upt);
      const matchJenis = jenisBushingFilter.length === 0 || jenisBushingFilter.some(f => r.jenisBushingList.includes(f));
      const matchTahun = tahunFilter.length === 0 || tahunFilter.includes(r.tahunBuat);
      const matchKondisi = kondisiFilter.length === 0 || kondisiFilter.includes(r.kondisi.replace(/^\d-/, ""));
      
      const matchLevelMinyak = levelMinyakFilter.length === 0 || levelMinyakFilter.includes((r.original.level_minyak || "").trim());
      const matchThermovisi = thermovisiFilter.length === 0 || thermovisiFilter.includes((r.original.hasil_thermovisi || "").trim());
      const matchKondisiFisik = kondisiFisikFilter.length === 0 || kondisiFisikFilter.includes((r.original.kondisi_fisik || "").trim());
      const matchNilaiTadel = nilaiTadelFilter.length === 0 || nilaiTadelFilter.includes((r.original.nilai_tadel || "").trim());
      const matchCenterTap = centerTapFilter.length === 0 || centerTapFilter.includes((r.original.kondisi_center_tap || "").trim());
      
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = searchQuery === "" || 
        r.garduInduk.toLowerCase().includes(searchLower) ||
        r.bayTrafo.toLowerCase().includes(searchLower) ||
        r.id.toLowerCase().includes(searchLower) ||
        r.parameterUji.toLowerCase().includes(searchLower);

      return matchUpt && matchJenis && matchTahun && matchKondisi && matchLevelMinyak && matchThermovisi && matchKondisiFisik && matchNilaiTadel && matchCenterTap && matchSearch;
    });
  }, [records, uptFilter, jenisBushingFilter, tahunFilter, kondisiFilter, levelMinyakFilter, thermovisiFilter, kondisiFisikFilter, nilaiTadelFilter, centerTapFilter, searchQuery]);

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
      let bCount = r.jenisBushing && r.jenisBushing !== "-" ? 1 : 0;
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
    setLevelMinyakFilter([]);
    setThermovisiFilter([]);
    setKondisiFisikFilter([]);
    setNilaiTadelFilter([]);
    setCenterTapFilter([]);
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

  // ECharts: Grafik Anomali Parameter Uji per UPT (Grouped & Stacked dengan Klasifikasi Asli)
  // ECharts: Sebaran Kondisi Bushing
  const kondisiChartOption = useMemo(() => {
    const slices = [
      { name: "Very Good", value: stats.veryGood, color: "#10b981" },
      { name: "Good", value: stats.good, color: "#3b82f6" },
      { name: "Fair", value: stats.fair, color: "#f59e0b" },
      { name: "Poor", value: stats.poor, color: "#f97316" },
      { name: "Critical", value: stats.critical, color: "#ef4444" },
    ].filter(s => s.value > 0);
    return pieOption(t, slices);
  }, [stats, t]);

  // ECharts: Parameter Uji vs Temuan (Pie Charts per Parameter)
  const parameterChartOptions = useMemo(() => {
    return PARAMS_CONFIG.map(pc => {
      const countMap: Record<string, number> = {};
      pc.classes.forEach(cls => { countMap[cls] = 0; });
      let total = 0;

      filteredRecords.forEach(r => {
        // Harus difilter khusus untuk bushing OIP, karena judulnya "Analisis Temuan per Parameter Uji (OIP)"
        const bCount = r.jenisBushingList.filter(b => b && b.trim().toUpperCase() === "OIP").length;
        if (bCount > 0) {
          const cls = pc.getValue(r);
          if (countMap[cls] !== undefined) {
            countMap[cls] += bCount;
            total += bCount;
          }
        }
      });

      const slices = pc.classes.map(cls => ({
        name: cls,
        value: countMap[cls],
        color: (pc.colors as any)[cls]
      }));

      return { param: pc.name, option: pieOption(t, slices), total };
    });
  }, [filteredRecords, t]);

  // ECharts: Jenis Bushing
  const jenisChartOption = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      r.jenisBushingList.forEach(p => {
        if (p && p !== "-") counts[p] = (counts[p] || 0) + 1;
      });
    });
    let sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 10) {
      const top10 = sorted.slice(0, 10);
      const others = sorted.slice(10).reduce((sum, item) => sum + item[1], 0);
      sorted = [...top10, ["Lainnya", others]];
    }
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
    let sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 10) {
      const top10 = sorted.slice(0, 10);
      const others = sorted.slice(10).reduce((sum, item) => sum + item[1], 0);
      sorted = [...top10, ["Lainnya", others]];
    }
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

  // ===== Rincian Data Table =====
  const rincianTable = (
    <div className="overflow-auto max-h-[400px] w-full scrollbar-thin">
      <table className="w-full text-left text-[11px] whitespace-nowrap">
        <thead className="sticky top-0 bg-surface-solid z-10">
          <tr className="border-b border-edge font-bold text-ink-3 uppercase tracking-wider">
            <th className="px-3 py-2">Gardu Induk</th>
            <th className="px-3 py-2">Bay</th>
            <th className="px-3 py-2">Thn Buat</th>
            <th className="px-3 py-2">Fasa</th>
            <th className="px-3 py-2">Merk Bushing</th>
            <th className="px-3 py-2">Jenis Bushing</th>
            <th className="px-3 py-2">Level Minyak</th>
            <th className="px-3 py-2">Thermovisi</th>
            <th className="px-3 py-2">Kondisi Fisik</th>
            <th className="px-3 py-2">Nilai Tadel</th>
            <th className="px-3 py-2">Center Tap</th>
            <th className="px-3 py-2 max-w-xs">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.map((r, i) => (
            <tr key={i} className="border-b border-edge/40 hover:bg-surface-2 transition-colors">
              <td className="px-3 py-1.5 font-bold">{r.garduInduk}</td>
              <td className="px-3 py-1.5">{r.bayTrafo}</td>
              <td className="px-3 py-1.5">{r.original.thn_buat || "-"}</td>
              <td className="px-3 py-1.5">{r.original.fasa || "-"}</td>
              <td className="px-3 py-1.5">{r.original.merk_bushing || "-"}</td>
              <td className="px-3 py-1.5">{r.original.jenis_bushing || "-"}</td>
              <td className="px-3 py-1.5">{r.original.level_minyak || "-"}</td>
              <td className="px-3 py-1.5">{r.original.hasil_thermovisi || "-"}</td>
              <td className="px-3 py-1.5">{r.original.kondisi_fisik || "-"}</td>
              <td className="px-3 py-1.5">{r.original.nilai_tadel || "-"}</td>
              <td className="px-3 py-1.5">{r.original.kondisi_center_tap || "-"}</td>
              <td className="px-3 py-1.5 max-w-xs truncate" title={r.original.keterangan || "-"}>{r.original.keterangan || "-"}</td>
            </tr>
          ))}
          {filteredRecords.length === 0 && (
            <tr>
              <td colSpan={12} className="p-8 text-center text-ink-3">Tidak ada data untuk filter saat ini.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ===== Slide Deck Slides =====
  const slides = useMemo(() => {
    // Top 15 Open
    const priorityList = filteredRecords
      .filter(r => r.statusTindakLanjut === "Open")
      .slice(0, 15);

    return [
      {
        key: "all-in-one",
        label: "Laporan Asesment",
        node: (
          <DeckCover
            eyebrow="Dashboard Executive"
            title={<>Laporan Komprehensif <br/>Asesment Bushing</>}
            description="Ringkasan, analisis teknis, dan daftar prioritas tindak lanjut secara keseluruhan."
            stats={[
              { label: "Bushing Terpantau", value: `${stats.totalBushings}`, sub: "Unit" },
              { label: "Kondisi Critical/Poor", value: `${stats.criticalPoor}`, sub: "Temuan" },
              { label: "Tindak Lanjut (OPEN)", value: `${stats.open}`, sub: "Pekerjaan" },
              { label: "Health Index", value: `${stats.healthIndex}%` },
            ]}
          >
            <div className="flex flex-col gap-8 w-full max-w-6xl pb-16">
              
              {/* Row 1: KPI overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
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

              {/* Row 2: Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                <div className="flex flex-col gap-6">
                  <ChartCard title="Temuan per Parameter Uji (OIP)" className="min-h-[300px] lg:h-auto lg:min-h-[18rem]">
                    {stats.total === 0 ? (
                      <div className="flex h-72 items-center justify-center text-xs text-ink-3">Tidak ada data</div>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-2 md:gap-4 p-2 h-full">
                        {parameterChartOptions.map(pc => (
                          <div key={pc.param} className="flex flex-col items-center h-56 w-[calc(50%-0.5rem)] md:w-[calc(33.33%-1rem)] min-w-[150px]">
                            <div className="text-[10px] font-bold text-ink mb-1 text-center h-6 flex items-center justify-center">
                              {pc.param} ({pc.total})
                            </div>
                            <div className="flex-1 w-full relative">
                              <EChart key={`s-param-${pc.param}-${t.key}`} option={pc.option} />
                              {pc.total === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center text-[9px] text-ink-3 text-center pointer-events-none">
                                  Tidak ada temuan
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ChartCard>
                  <ChartCard title="Rincian Data Rekap Asesment Bushing" className="min-h-[300px] lg:h-72 flex flex-col">
                    <div className="flex-1 w-full relative">
                      {rincianTable}
                    </div>
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

              {/* Row 3: Priority Table */}
              <ChartCard title="Daftar Temuan Prioritas (OPEN)" badge={`${priorityList.length} Temuan Teratas`} className="max-w-6xl">
                <div className="max-h-[32rem] overflow-auto scrollbar-thin">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-surface-solid z-10">
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

            </div>
          </DeckCover>
        )
      }
    ];
  }, [filteredRecords, stats, t, uptTotalChartOption, kondisiChartOption, parameterChartOptions, jenisChartOption, merkChartOption]);

  const filterControls = (
    <>
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
        label="Level Minyak"
        options={levelMinyakOptions}
        selected={levelMinyakFilter}
        onChange={setLevelMinyakFilter}
      />
      <MultiSelect
        label="Thermovisi"
        options={thermovisiOptions}
        selected={thermovisiFilter}
        onChange={setThermovisiFilter}
      />
      <MultiSelect
        label="Kondisi Fisik"
        options={kondisiFisikOptions}
        selected={kondisiFisikFilter}
        onChange={setKondisiFisikFilter}
      />
      <MultiSelect
        label="Nilai Tadel"
        options={nilaiTadelOptions}
        selected={nilaiTadelFilter}
        onChange={setNilaiTadelFilter}
      />
      <MultiSelect
        label="Center Tap"
        options={centerTapOptions}
        selected={centerTapFilter}
        onChange={setCenterTapFilter}
      />
    </>
  );

  return (
    <div className="space-y-6">
      {showDeck && <Deck slides={slides} onExit={() => setShowDeck(false)} filters={filterControls} />}
      
      {/* 1. FILTER BAR PANEL */}
      <div className="card rise rise-1 relative z-30 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {filterControls}
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
            <ChartCard title="Analisis Temuan per Parameter Uji (OIP)" className="h-auto md:min-h-80 col-span-1 md:col-span-2">
              {stats.total === 0 ? (
                <div className="flex h-80 flex-col items-center justify-center text-ink-3 text-xs">
                  Tidak ada data untuk filter saat ini.
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-2 md:gap-4 p-2">
                  {parameterChartOptions.map(pc => (
                    <div key={pc.param} className="flex flex-col items-center h-56 w-[calc(50%-0.5rem)] md:w-[calc(33.33%-1rem)] min-w-[150px]">
                      <div className="text-[11px] font-bold text-ink mb-1 text-center h-8 flex items-center justify-center">
                        {pc.param}
                        <span className="ml-1 text-ink-3">({pc.total})</span>
                      </div>
                      <div className="flex-1 w-full relative">
                        <EChart key={`param-${pc.param}-${t.key}`} option={pc.option} />
                        {pc.total === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-ink-3 text-center pointer-events-none">
                            Tidak ada temuan
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* Chart 6: Rincian Data Table */}
            <ChartCard title="Rincian Data Rekap Asesment Bushing" className="h-[400px] md:h-[450px] col-span-1 md:col-span-2 flex flex-col">
              <div className="flex-1 w-full relative">
                {rincianTable}
              </div>
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
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-3">Detail Bushing</span>
                                        <div className="text-[11px]">Fasa: <span className="font-semibold text-ink-2">{r.original.fasa || "-"}</span></div>
                                        <div className="text-[11px]">Jenis Bushing: <span className="font-semibold text-ink-2">{r.original.jenis_bushing || "-"}</span></div>
                                        <div className="text-[11px]">Merk: <span className="font-semibold text-ink-2">{r.original.merk_bushing || "-"}</span></div>
                                        <div className="text-[11px]">Type: <span className="font-semibold text-ink-2">{r.original.type_bushing || "-"}</span></div>
                                        <div className="text-[11px]">No Seri: <span className="font-semibold text-ink-2">{r.original.no_seri || "-"}</span></div>
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-3">Hasil Uji Parameter</span>
                                        <div className="text-[11px]">Level Minyak: <span className="font-semibold">{r.original.level_minyak || "-"}</span></div>
                                        <div className="text-[11px]">Thermovisi: <span className="font-semibold">{r.original.hasil_thermovisi || "-"}</span></div>
                                        <div className="text-[11px]">Kondisi Fisik: <span className="font-semibold">{r.original.kondisi_fisik || "-"}</span></div>
                                        <div className="text-[11px]">Nilai Tadel: <span className="font-semibold">{r.original.nilai_tadel || "-"}</span></div>
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
