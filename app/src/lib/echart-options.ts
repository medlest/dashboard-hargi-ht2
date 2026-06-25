// Option builder ECharts — pure functions, dipakai semua page.
// Konsep niru chart-tokens dashboard utama (SSOT config), implementasi sendiri.
import type { EChartsOption, DefaultLabelFormatterCallbackParams } from "echarts";
import { tooltipPreset, type ChartTheme } from "@/components/echart";

export type Slice = { name: string; value: number; color: string };
export type StackSeries = { name: string; data: number[]; color: string };

const FONT_LABEL = 12;

// Tooltip axis yang JUJUR: seri bernilai 0 tidak ditampilkan.
// (Default ECharts nampilin semua seri termasuk 0 → menyesatkan utk data sparse.)
type AxisTipItem = { name?: string; seriesName?: string; value?: unknown; marker?: string };
const axisTooltipNoZero = (params: unknown): string => {
  const list = (Array.isArray(params) ? params : [params]) as AxisTipItem[];
  const filled = list.filter((p) => Number(p.value) > 0);
  if (filled.length === 0) return "";
  return (
    `<b>${filled[0].name ?? ""}</b><br/>` +
    filled.map((p) => `${p.marker ?? ""} ${p.seriesName}: <b>${p.value}</b>`).join("<br/>")
  );
};


// Donut + label LUAR + leader line — style standar SEMUA chart proporsi.
// minAngle ngasih tiap irisan ruang → SEMUA label tampil (ECharts auto-stagger).
export function pieOption(t: ChartTheme, slices: Slice[]): EChartsOption {
  return {
    tooltip: { trigger: "item", ...tooltipPreset(t) },
    legend: {
      bottom: 0,
      type: "scroll",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: t.tick, fontSize: 11 },
      pageTextStyle: { color: t.tick },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "46%"],
        // irisan sekecil apapun dijamin kebagian busur minimal 7° biar KELIHATAN
        minAngle: 7,
        data: slices.map((s) => ({
          name: s.name,
          value: s.value,
          itemStyle: { color: s.color, borderColor: t.border, borderWidth: 2 },
        })),
        label: {
          show: true,
          position: "outside",
          // SEMUA irisan tampil lengkap: angka + persen
          formatter: (p: DefaultLabelFormatterCallbackParams) =>
            `${p.value} (${(p.percent ?? 0).toFixed(1)}%)`,
          color: t.tickStrong,
          fontWeight: "bold",
          fontSize: 11,
          lineHeight: 14,
        },
        // geser otomatis label yang saling timpa (vertikal)
        labelLayout: { moveOverlap: "shiftY" },
        // garis pendek nekuk, label dekat irisan (gaya yang disukai user)
        labelLine: { show: true, length: 14, length2: 10, lineStyle: { color: t.tick } },
        emphasis: { scaleSize: 6 },
        animationDuration: 500,
      },
    ],
  };
}

export function stackedBarOption(
  t: ChartTheme,
  categories: string[],
  series: StackSeries[],
  opts: { horizontal?: boolean; totals?: number[]; legendTop?: boolean; showAllLabels?: boolean } = {},
): EChartsOption {
  const { horizontal = false, totals, legendTop = true, showAllLabels = false } = opts;
  const valueAxis = {
    type: "value" as const,
    axisLabel: { color: t.tick, fontSize: FONT_LABEL },
    splitLine: { lineStyle: { color: t.grid } },
  };
  const catAxis = {
    type: "category" as const,
    data: categories,
    axisLabel: { color: t.tick, fontSize: FONT_LABEL, interval: 0 as const },
    axisLine: { lineStyle: { color: t.grid } },
    axisTick: { show: false },
  };
  // Label disembunyikan kalau segmen terlalu PENDEK secara visual:
  // basisnya kolom TERTINGGI (skala axis), bukan persen kolom sendiri —
  // kolom pendek dengan banyak segmen kecil = label pasti tabrakan.
  const colTotals = categories.map((_, i) =>
    series.reduce((sum, s) => sum + (Number(s.data[i]) || 0), 0));
  const axisMax = Math.max(...colTotals, 1);
  const minLabel = showAllLabels ? 1 : Math.max(2, axisMax * 0.05);

  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: axisTooltipNoZero, ...tooltipPreset(t) },
    legend: {
      [legendTop ? "top" : "bottom"]: 0,
      type: "scroll",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: t.tick, fontSize: 11 },
      pageTextStyle: { color: t.tick },
    },
    grid: { left: 8, right: totals && horizontal ? 44 : 16, top: legendTop ? 34 : 12, bottom: legendTop ? 8 : 34, containLabel: true },
    xAxis: horizontal ? valueAxis : catAxis,
    yAxis: horizontal ? { ...catAxis, inverse: true } : valueAxis,
    series: [
      ...series.map((s) => ({
        name: s.name,
        type: "bar" as const,
        stack: "total",
        data: s.data,
        itemStyle: { color: s.color, borderRadius: 2 },
        barMaxWidth: 36,
        label: {
          show: true,
          color: "#fff",
          fontSize: 10,
          fontWeight: "bold" as const,
          formatter: (p: { value: unknown }) =>
            Number(p.value) >= minLabel ? String(p.value) : "",
        },
      })),
      ...(totals
        ? [{
            name: "__total__",
            type: "bar" as const,
            stack: "total",
            data: totals.map(() => 0),
            itemStyle: { color: "transparent" },
            tooltip: { show: false },
            label: {
              show: true,
              position: (horizontal ? "right" : "top") as "right" | "top",
              color: t.tickStrong,
              fontWeight: "bold" as const,
              fontSize: 12,
              formatter: (p: { dataIndex: number }) => String(totals[p.dataIndex]),
            },
          }]
        : []),
    ],
  };
}

export function hbarOption(t: ChartTheme, categories: string[], data: number[], color: string): EChartsOption {
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tooltipPreset(t) },
    grid: { left: 8, right: 36, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: t.tick, fontSize: FONT_LABEL },
      splitLine: { lineStyle: { color: t.grid } },
    },
    yAxis: {
      type: "category",
      data: categories,
      inverse: true,
      axisLabel: { color: t.tick, fontSize: FONT_LABEL, width: 220, overflow: "truncate" as const },
      axisLine: { lineStyle: { color: t.grid } },
      axisTick: { show: false },
    },
    series: [{
      type: "bar",
      data,
      itemStyle: { color, borderRadius: [0, 3, 3, 0] },
      barMaxWidth: 18,
      label: {
        show: true,
        position: "right",
        color: t.tickStrong,
        fontWeight: "bold",
        fontSize: 11,
      },
    }],
  };
}

export type LineSeries = {
  name: string;
  data: number[];
  color: string;
  bold?: boolean;
};

export function lineOption(t: ChartTheme, xLabels: string[], series: LineSeries[]): EChartsOption {
  return {
    tooltip: { trigger: "axis", ...tooltipPreset(t) },
    legend: {
      top: 0,
      type: "scroll",
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: t.tick, fontSize: 11 },
      pageTextStyle: { color: t.tick },
    },
    grid: { left: 8, right: 24, top: 36, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      data: xLabels,
      boundaryGap: false,
      axisLabel: { color: t.tick, fontSize: FONT_LABEL },
      axisLine: { lineStyle: { color: t.grid } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: t.tick, fontSize: FONT_LABEL },
      splitLine: { lineStyle: { color: t.grid } },
    },
    series: series.map((s, idx) => ({
      name: s.name,
      type: "line" as const,
      data: s.data,
      smooth: 0.3,
      symbolSize: s.bold ? 8 : 5,
      lineStyle: { color: s.color, width: s.bold ? 4.5 : 2 },
      itemStyle: { color: s.color, borderColor: s.bold ? "#fbbf24" : s.color },
      label: {
        // label angka cuma di seri bold ATAU kalau chart-nya simple (≤3 seri) — anti tabrakan
        show: s.bold || series.length <= 3,
        position: "top" as const,
        color: s.color,
        fontSize: s.bold ? 12 : 10,
        fontWeight: "bold" as const,
        formatter: (p: { value: unknown }) => (Number(p.value) > 0 ? String(p.value) : ""),
        ...(s.bold
          ? { backgroundColor: t.tooltipBg, padding: [2, 4] as [number, number], borderRadius: 4 }
          : {}),
      },
      zlevel: s.bold ? 2 : 1,
    })),
  };
}

// Pareto chart — bar urut desc + garis kumulatif %. Standar analisa penyebab
// gangguan (80/20): langsung keliatan kategori mana yang nyumbang mayoritas.
export function paretoOption(
  t: ChartTheme,
  items: { name: string; value: number; color: string }[],
): EChartsOption {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((a, s) => a + s.value, 0) || 1;
  let run = 0;
  const cumulative = sorted.map((s) => {
    run += s.value;
    return Math.round((run / total) * 1000) / 10;
  });
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tooltipPreset(t) },
    grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      data: sorted.map((s) => s.name),
      axisLabel: { color: t.tick, fontSize: 10, interval: 0, rotate: sorted.length > 7 ? 28 : 0 },
      axisLine: { lineStyle: { color: t.grid } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: "value",
        axisLabel: { color: t.tick, fontSize: FONT_LABEL },
        splitLine: { lineStyle: { color: t.grid } },
      },
      {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { color: t.tick, fontSize: FONT_LABEL, formatter: "{value}%" },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "Jumlah",
        type: "bar",
        data: sorted.map((s) => ({ value: s.value, itemStyle: { color: s.color, borderRadius: [3, 3, 0, 0] } })),
        barMaxWidth: 42,
        label: {
          show: true,
          position: "top",
          color: t.tickStrong,
          fontWeight: "bold",
          fontSize: 11,
        },
      },
      {
        name: "Kumulatif",
        type: "line",
        yAxisIndex: 1,
        data: cumulative,
        smooth: 0.2,
        symbolSize: 6,
        lineStyle: { color: "#f59e0b", width: 2.5 },
        itemStyle: { color: "#f59e0b" },
        label: {
          show: true,
          position: "top",
          color: "#f59e0b",
          fontSize: 10,
          fontWeight: "bold",
          formatter: (p: DefaultLabelFormatterCallbackParams) => `${p.value}%`,
        },
        tooltip: { valueFormatter: (v: unknown) => `${v}%` },
      },
    ],
  };
}

// Horizontal bar ranked — kategori urut desc, label "nilai · persen" di ujung.
// Pilihan paling kebaca utk banyak kategori dgn distribusi timpang.
export function rankedBarOption(
  t: ChartTheme,
  items: { name: string; value: number; color: string }[],
): EChartsOption {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((a, s) => a + s.value, 0) || 1;
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tooltipPreset(t) },
    grid: { left: 8, right: 70, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: t.tick, fontSize: FONT_LABEL },
      splitLine: { lineStyle: { color: t.grid } },
    },
    yAxis: {
      type: "category",
      data: sorted.map((s) => s.name),
      inverse: true,
      axisLabel: { color: t.tick, fontSize: 11 },
      axisLine: { lineStyle: { color: t.grid } },
      axisTick: { show: false },
    },
    series: [{
      type: "bar",
      data: sorted.map((s) => ({
        value: s.value,
        itemStyle: { color: s.color, borderRadius: [0, 3, 3, 0] },
      })),
      barMaxWidth: 20,
      label: {
        show: true,
        position: "right",
        color: t.tickStrong,
        fontWeight: "bold",
        fontSize: 11,
        formatter: (p: DefaultLabelFormatterCallbackParams) =>
          `${p.value} · ${((Number(p.value) / total) * 100).toFixed(1)}%`,
      },
    }],
  };
}

// Grouped bar (non-stacked) — tiap seri bar sendiri, label di ATAS bar:
// angka sekecil apapun selalu keliatan. Pakai ini kalau stacked bikin
// segmen kecil gak kebaca.
export function groupedBarOption(
  t: ChartTheme,
  categories: string[],
  series: StackSeries[],
  opts: { horizontal?: boolean; rotateLabel?: number } = {},
): EChartsOption {
  const { horizontal = false, rotateLabel } = opts;
  const catAxis = {
    type: "category" as const,
    data: categories,
    axisLabel: { 
      color: t.tick, 
      fontSize: FONT_LABEL, 
      interval: 0 as const,
      rotate: rotateLabel !== undefined ? rotateLabel : (horizontal ? 0 : (categories.length > 5 ? 35 : 0))
    },
    axisLine: { lineStyle: { color: t.grid } },
    axisTick: { show: false },
  };
  const valAxis = {
    type: "value" as const,
    axisLabel: { color: t.tick, fontSize: FONT_LABEL },
    splitLine: { lineStyle: { color: t.grid } },
  };
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: axisTooltipNoZero, ...tooltipPreset(t) },
    legend: {
      top: 0,
      type: "scroll",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: t.tick, fontSize: 11 },
      pageTextStyle: { color: t.tick },
    },
    grid: { left: 8, right: horizontal ? 28 : 16, top: 34, bottom: 8, containLabel: true },
    xAxis: horizontal ? valAxis : catAxis,
    yAxis: horizontal ? { ...catAxis, inverse: true } : valAxis,
    series: series.map((s) => ({
      name: s.name,
      type: "bar" as const,
      data: s.data,
      itemStyle: { color: s.color, borderRadius: horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0] },
      barMaxWidth: horizontal ? 9 : 26,
      barGap: "12%",
      label: {
        show: true,
        position: (horizontal ? "right" : "top") as "right" | "top",
        color: t.tickStrong,
        fontWeight: "bold" as const,
        fontSize: 10,
        formatter: (p: DefaultLabelFormatterCallbackParams) =>
          Number(p.value) > 0 ? String(p.value) : "",
      },
    })),
  };
}

// Vertical bar sederhana — 1 bar per item dgn warna sendiri, label "nilai (persen%)"
// di atas bar. Cocok untuk distribusi 1 dimensi (mis. kondisi akhir).
export function simpleBarOption(
  t: ChartTheme,
  items: { name: string; value: number; color: string }[],
  opts: { horizontal?: boolean } = {},
): EChartsOption {
  const { horizontal = false } = opts;
  const total = items.reduce((a, s) => a + s.value, 0) || 1;
  const catAxis = {
    type: "category" as const,
    data: items.map((s) => s.name),
    axisLabel: { color: t.tick, fontSize: FONT_LABEL, interval: 0 as const },
    axisLine: { lineStyle: { color: t.grid } },
    axisTick: { show: false },
  };
  const valAxis = {
    type: "value" as const,
    axisLabel: { color: t.tick, fontSize: FONT_LABEL },
    splitLine: { lineStyle: { color: t.grid } },
  };
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tooltipPreset(t) },
    grid: { left: 8, right: horizontal ? 84 : 16, top: horizontal ? 8 : 28, bottom: 8, containLabel: true },
    xAxis: horizontal ? valAxis : catAxis,
    yAxis: horizontal ? { ...catAxis, inverse: true } : valAxis,
    series: [{
      type: "bar",
      data: items.map((s) => ({
        value: s.value,
        itemStyle: { color: s.color, borderRadius: horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0] },
      })),
      barMaxWidth: horizontal ? 26 : 48,
      label: {
        show: true,
        position: horizontal ? "right" : "top",
        color: t.tickStrong,
        fontWeight: "bold",
        fontSize: 11,
        formatter: (p: DefaultLabelFormatterCallbackParams) =>
          `${p.value} (${((Number(p.value) / total) * 100).toFixed(1)}%)`,
      },
    }],
  };
}
