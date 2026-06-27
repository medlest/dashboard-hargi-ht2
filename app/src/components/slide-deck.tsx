"use client";

// Slide deck shared — dipakai Pareto & CE Next Level.
// Fullscreen + keyboard nav (← → Space Home End Esc) + dot navigator + transisi.
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Zap } from "lucide-react";
import { EChart } from "./echart";
import type { EChartsOption } from "echarts";
import type { ReactNode } from "react";

export type DeckSlide = { key: string; label: string; node: ReactNode };

// Helper anotasi slide — persen format id-ID + penekanan angka
export const deckPct = (n: number, d: number) =>
  d > 0 ? `${((n / d) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` : "—";

export function DeckB({ children }: { children: ReactNode }) {
  return <b className="num font-semibold text-ink">{children}</b>;
}

export function Deck({ 
  slides, 
  onExit,
  filters
}: { 
  slides: DeckSlide[]; 
  onExit: () => void;
  filters?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const TOTAL = slides.length;

  const go = useCallback(
    (d: number) => setSlide((s) => Math.min(TOTAL - 1, Math.max(0, s + d))),
    [TOTAL],
  );

  useEffect(() => {
    ref.current?.requestFullscreen?.().catch(() => {});
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key === "Home") setSlide(0);
      else if (e.key === "End") setSlide(TOTAL - 1);
      else if (e.key === "Escape") onExit();
    }
    function onFs() {
      if (!document.fullscreenElement) onExit();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [go, onExit, TOTAL]);

  return (
    <div ref={ref} className="deck fixed inset-0 z-100 flex flex-col bg-bg">
      {/* progress bar atas */}
      <div className="absolute inset-x-0 top-0 z-50 h-0.5 bg-ink-3/15">
        <div
          className="h-full bg-amber transition-all duration-400 ease-out"
          style={{ width: `${((slide + 1) / TOTAL) * 100}%` }}
        />
      </div>

      {/* Filter & Close Bar (Top) */}
      <div className="absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-4 px-4 py-4 md:px-8 pointer-events-none">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 flex-1">
          {filters}
        </div>
        <button 
          type="button" 
          onClick={onExit} 
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-surface-2/80 px-4 py-2 text-[13px] font-medium text-red-400 backdrop-blur-md transition-colors hover:bg-red-400 hover:text-white shrink-0"
        >
          <X className="h-4 w-4" /> Keluar Presentasi
        </button>
      </div>

      <div className="relative min-h-0 flex-1 pt-16 md:pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {slides[slide].node}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* kontrol bawah */}
      <div className="relative z-10 flex items-center justify-between px-8 pb-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink-3">
          <Zap className="bolt h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
          Hartrans 2 - Gardu Induk
          <span className="num hidden tracking-normal opacity-60 lg:inline">· ← → navigasi · Esc keluar</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                aria-label={s.label}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-6 bg-amber" : "w-1.5 bg-ink-3/40 hover:bg-ink-3"}`}
              />
            ))}
          </div>
          <span className="hidden w-36 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3 md:block">
            {slides[slide].label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go(-1)} className="rounded-full p-2 text-ink-2 hover:bg-surface-2" aria-label="Sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="num w-12 text-center text-xs font-semibold text-ink-2">{slide + 1} / {TOTAL}</span>
          <button type="button" onClick={() => go(1)} className="rounded-full p-2 text-ink-2 hover:bg-surface-2" aria-label="Berikutnya">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={onExit} className="ml-2 rounded-full p-2 text-red-400 hover:bg-surface-2" aria-label="Keluar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeckCover({
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  stats: { label: string; value: string; sub?: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="flex h-full flex-col overflow-y-auto px-14 pb-12 pt-12 md:px-24 scrollbar-thin">
      <div className="flex shrink-0 items-center gap-4 text-[12px] font-semibold uppercase tracking-[0.3em] text-amber">
        <span className="h-px w-12 bg-amber" />
        {eyebrow}
      </div>

      <div className="shrink-0">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-[9vmin] font-bold leading-[1.04] tracking-tight"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-5 max-w-xl text-sm text-ink-2"
        >
          {description}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className={`mt-8 shrink-0 grid max-w-5xl gap-3 ${stats.length >= 4 ? "grid-cols-4" : "grid-cols-3"}`}
      >
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="card-title text-[10px]">{s.label}</div>
            <div className="num mt-1 truncate text-2xl font-semibold">{s.value}</div>
            {s.sub && <div className="num mt-0.5 text-[11px] text-ink-3">{s.sub}</div>}
          </div>
        ))}
      </motion.div>

      {children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-12 space-y-12"
        >
          {children}
        </motion.div>
      )}
    </section>
  );
}

function SlideHeader({ no, total, eyebrow, title }: { no: number; total: number; eyebrow: string; title: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber">
          <span className="h-px w-8 bg-amber" />
          {eyebrow}
        </div>
        <h2 className="mt-1.5 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      </div>
      <span className="num text-xs text-ink-3">{String(no).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
    </div>
  );
}

function NotesStrip({ notes }: { notes?: ReactNode[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="card mt-3 flex shrink-0 flex-col items-stretch divide-y divide-edge md:flex-row md:divide-x md:divide-y-0">
      <div className="flex shrink-0 items-center gap-2 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber">
        <span className="h-1.5 w-1.5 rounded-full bg-amber" />
        Catatan Data
      </div>
      {notes.map((n, i) => (
        <div key={i} className="flex flex-1 items-center px-4 py-2.5 text-[12.5px] leading-snug text-ink-2">
          {n}
        </div>
      ))}
    </div>
  );
}

export function DeckChartSlide({
  no,
  total,
  eyebrow,
  title,
  option,
  chartKey,
  side,
  notes,
}: {
  no: number;
  total: number;
  eyebrow: string;
  title: string;
  option: EChartsOption;
  chartKey: string;
  side?: ReactNode;
  notes?: ReactNode[];
}) {
  return (
    <section className="flex h-full flex-col px-10 pb-2 pt-8 md:px-16">
      <SlideHeader no={no} total={total} eyebrow={eyebrow} title={title} />
      {side ? (
        <div className="grid min-h-0 flex-1 grid-cols-5 gap-3">
          <div className="card col-span-3 min-h-0 p-5">
            <EChart key={chartKey} option={option} />
          </div>
          <div className="card col-span-2 min-h-0 overflow-auto p-5 scrollbar-thin">{side}</div>
        </div>
      ) : (
        <div className="card min-h-0 flex-1 p-5">
          <EChart key={chartKey} option={option} />
        </div>
      )}
      <NotesStrip notes={notes} />
    </section>
  );
}

// Slide konten bebas (tabel, list) — header + card body + catatan, tanpa chart
export function DeckContentSlide({
  no,
  total,
  eyebrow,
  title,
  notes,
  children,
}: {
  no: number;
  total: number;
  eyebrow: string;
  title: string;
  notes?: ReactNode[];
  children: ReactNode;
}) {
  return (
    <section className="flex h-full flex-col px-10 pb-2 pt-8 md:px-16">
      <SlideHeader no={no} total={total} eyebrow={eyebrow} title={title} />
      <div className="card min-h-0 flex-1 overflow-auto p-5 scrollbar-thin">{children}</div>
      <NotesStrip notes={notes} />
    </section>
  );
}
