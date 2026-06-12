"use client";

import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { EChartsOption } from "echarts";

// Token chart ikut theme — satu sumber untuk semua option builder
export type ChartTheme = {
  key: string;
  tick: string;
  tickStrong: string;
  grid: string;
  border: string;
  tooltipBg: string;
  font: string;
};

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  // initial render: baca class .dark langsung dari <html> (next-themes set
  // sebelum paint) -> chart langsung warna bener, gak pop-in nunggu mount
  const [initialDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const dark = resolvedTheme ? resolvedTheme === "dark" : initialDark;
  return {
    key: dark ? "dark" : "light",
    tick: dark ? "#94a3b8" : "#45556c",
    tickStrong: dark ? "#e2e8f0" : "#0f172a",
    grid: dark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.08)",
    border: dark ? "#101828" : "#ffffff",
    tooltipBg: dark ? "#16213a" : "#ffffff",
    font: "var(--font-app-sans), sans-serif",
  };
}

export function tooltipPreset(t: ChartTheme) {
  return {
    backgroundColor: t.tooltipBg,
    borderColor: t.grid,
    textStyle: { color: t.tickStrong, fontSize: 12, fontFamily: t.font },
    extraCssText: "box-shadow: 0 8px 24px -12px rgba(2,6,23,0.5); border-radius: 8px;",
  };
}

export function EChart({ option, className = "" }: { option: EChartsOption; className?: string }) {
  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ width: "100%", height: "100%" }}
      className={className}
      opts={{ renderer: "canvas" }}
    />
  );
}
