"use client";

// Primitif hero card — dipakai HeroCE (/ce-abo) + HeroGgn (/pareto).
// Konsep: golden-ratio grid, caption ber-garis, angka besar mono, panel klik-filter.
import type { ReactNode } from "react";

export const pctColor = (pct: number) =>
  pct >= 75 ? "#3b82f6" : pct >= 50 ? "#10b981" : pct >= 25 ? "#fbbf24" : pct > 0 ? "#f87171" : "#b91c1c";

export function Caption({ text, nick, nickColor }: { text: string; nick?: string; nickColor?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px w-4 bg-ink-3" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-2">{text}</span>
      {nick && (
        <span
          className="num rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
          style={{
            color: nickColor,
            background: `color-mix(in oklab, ${nickColor} 14%, transparent)`,
            border: `1px solid color-mix(in oklab, ${nickColor} 28%, transparent)`,
          }}
        >
          {nick}
        </span>
      )}
    </div>
  );
}

export function BigStat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="num whitespace-nowrap text-[28px] font-semibold leading-none tracking-tight" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="whitespace-nowrap text-xs text-ink-2">{label}</span>
    </div>
  );
}

export type Segment = { label: ReactNode; value: number; color: string };

// Bar proporsional multi-segmen + legend di dalam segmen (clip kalau sempit)
export function MultiSegBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const vis = segments.filter((s) => s.value > 0);
  if (total === 0 || vis.length === 0) {
    return <div className="h-2 rounded-full bg-surface-2" />;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2 gap-1">
        {vis.map((s, i) => (
          <div
            key={i}
            className="min-w-0"
            style={{
              flex: `${(s.value / total) * 100} 1 0`,
              background: `linear-gradient(90deg, ${s.color}, color-mix(in oklab, ${s.color} 72%, white))`,
              boxShadow: `0 0 8px color-mix(in oklab, ${s.color} 35%, transparent)`,
              borderRadius:
                vis.length === 1 ? 999 : i === 0 ? "999px 0 0 999px" : i === vis.length - 1 ? "0 999px 999px 0" : 0,
            }}
          />
        ))}
      </div>
      <div className="flex gap-1 text-[10px] text-ink-3">
        {vis.map((s, i) => (
          <span
            key={i}
            className="flex min-w-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap"
            style={{ flex: `${(s.value / total) * 100} 1 0` }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            {s.label} <b className="num" style={{ color: s.color }}>{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
