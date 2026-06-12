"use client";

// Hero card CE — port konsep Hero dashboard utama (golden ratio + panel klik-filter),
// styling karakter HT-2. Panel TOTAL 1.618fr + sub-panel per Level Anomali (klik = filter).
import { useState } from "react";
import { MousePointerClick } from "lucide-react";
import { BigStat, Caption, pctColor } from "@/components/hero-primitives";

export type HeroLevel = {
  level: string;
  total: number;
  close: number;
  open: number;
};

const LEVEL_ACCENT: Record<string, { a: string; a2: string; nick: string }> = {
  "Switch Yard": { a: "#6366f1", a2: "#818cf8", nick: "SY" },
  "MV Apparatus": { a: "#06b6d4", a2: "#22d3ee", nick: "MV" },
  Trafo: { a: "#f59e0b", a2: "#fbbf24", nick: "TRF" },
};
const FALLBACK_ACCENT = { a: "#94a3b8", a2: "#cbd5e1", nick: "—" };

export function HeroCE({
  stats,
  levels,
  active,
  onToggle,
}: {
  stats: { total: number; open: number; closed: number; progress: number };
  levels: HeroLevel[];
  active: string | null;
  onToggle: (level: string) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-edge lg:[grid-template-columns:1.618fr_1px_1fr_1px_1fr_1px_1fr] lg:divide-y-0">
        <TotalPanel stats={stats} />
        {levels.map((l) => {
          const acc = LEVEL_ACCENT[l.level] ?? FALLBACK_ACCENT;
          return [
            <div key={`d-${l.level}`} className="hidden bg-edge lg:block" />,
            <LevelPanel
              key={l.level}
              data={l}
              accent={acc}
              active={active === l.level}
              dimmed={!!active && active !== l.level}
              onClick={() => onToggle(l.level)}
            />,
          ];
        })}
      </div>
    </div>
  );
}

function SegBar({ close, open, a, a2 }: { close: number; open: number; a: string; a2: string }) {
  const total = close + open;
  const pc = total === 0 ? 0 : (close / total) * 100;
  const po = 100 - pc;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2 gap-1">
        {close > 0 && (
          <div
            className="min-w-0 rounded-full"
            style={{
              flex: `${pc} 1 0`,
              background: `linear-gradient(90deg, ${a}, ${a2})`,
              boxShadow: `0 0 10px color-mix(in oklab, ${a} 40%, transparent)`,
              borderRadius: open > 0 ? "999px 0 0 999px" : 999,
            }}
          />
        )}
        {open > 0 && (
          <div
            className="min-w-0 bg-red-400"
            style={{ flex: `${po} 1 0`, borderRadius: close > 0 ? "0 999px 999px 0" : 999 }}
          />
        )}
      </div>
      <div className="flex gap-1 text-[10px] text-ink-3">
        {close > 0 && (
          <span className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap" style={{ flex: `${pc} 1 0` }}>
            <span className="h-1.5 w-1.5 rounded-sm" style={{ background: a }} />
            Close <b className="num text-emerald-500">{close}</b>
          </span>
        )}
        {open > 0 && (
          <span className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap" style={{ flex: `${po} 1 0` }}>
            <span className="h-1.5 w-1.5 rounded-sm bg-red-400" />
            Open <b className="num text-red-400">{open}</b>
          </span>
        )}
      </div>
    </div>
  );
}

function TotalPanel({ stats }: { stats: { total: number; open: number; closed: number; progress: number } }) {
  return (
    <div
      className="relative flex flex-col gap-5 p-4"
      style={{
        background:
          "radial-gradient(ellipse 55% 80% at 0% 0%, color-mix(in oklab, #10b981 7%, transparent), transparent 60%)",
      }}
    >
      <Caption text="Common Enemy Next Level 2026" />
      <div className="grid items-end gap-6 [grid-template-columns:auto_1px_auto_1px_auto]">
        <BigStat value={stats.total.toLocaleString("id-ID")} label="Total Temuan" />
        <span className="self-stretch bg-edge" style={{ width: 1 }} />
        <BigStat value={String(stats.open)} label="Open (F/P/C)" color="#f87171" />
        <span className="self-stretch bg-edge" style={{ width: 1 }} />
        <BigStat value={`${stats.progress.toFixed(1)}%`} label="Selesai" color={pctColor(stats.progress)} />
      </div>
      <div className="mt-auto">
        <SegBar close={stats.closed} open={stats.open} a="#10b981" a2="#34d399" />
      </div>
    </div>
  );
}

function LevelPanel({
  data,
  accent,
  active,
  dimmed,
  onClick,
}: {
  data: HeroLevel;
  accent: { a: string; a2: string; nick: string };
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pct = data.total === 0 ? 0 : (data.close / data.total) * 100;
  const baseBg = `radial-gradient(ellipse 60% 80% at 100% 0%, color-mix(in oklab, ${accent.a} 6%, transparent), transparent 65%)`;
  const activeBg = `radial-gradient(ellipse 70% 100% at 50% 50%, color-mix(in oklab, ${accent.a} 14%, transparent), transparent 70%)`;
  const hoverBg = `radial-gradient(ellipse 70% 100% at 50% 50%, color-mix(in oklab, ${accent.a} 10%, transparent), transparent 70%)`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex cursor-pointer flex-col gap-4 p-4 transition-[opacity,box-shadow,background] duration-250"
      style={{
        background: active ? activeBg : hovered ? hoverBg : baseBg,
        boxShadow: active
          ? `inset 0 0 0 1px ${accent.a}`
          : hovered
            ? `inset 0 0 0 1px color-mix(in oklab, ${accent.a} 35%, transparent)`
            : "none",
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <Caption text={data.level} nick={accent.nick} nickColor={accent.a} />
      <div className="mt-1 grid items-end gap-5 [grid-template-columns:auto_1px_auto]">
        <BigStat value={String(data.total)} label="Temuan" />
        <span className="self-stretch bg-edge" style={{ width: 1 }} />
        <BigStat value={`${pct.toFixed(1)}%`} label="Selesai" color={pctColor(pct)} />
      </div>
      <div className="mt-auto">
        <SegBar close={data.close} open={data.open} a={accent.a} a2={accent.a2} />
      </div>
      {hovered && !active && (
        <span
          className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-1 text-[9.5px] tracking-wide opacity-85"
          style={{ color: accent.a }}
        >
          <MousePointerClick className="h-2.5 w-2.5" /> Klik untuk filter
        </span>
      )}
    </div>
  );
}
