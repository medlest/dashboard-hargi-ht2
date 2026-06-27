"use client";

import { useEffect, useState } from "react";
import { Clock as ClockIcon } from "lucide-react";

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "Asia/Jakarta", hour12: false,
  }).format(d);

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "short", day: "numeric", month: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);

// Card jam WIB realtime — hydration-safe (kosong di SSR, isi setelah mount)
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const firstTick = setTimeout(() => setNow(new Date()), 0);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(firstTick);
      clearInterval(t);
    };
  }, []);

  if (!now) return <div className="h-8 w-44" />;
  return (
    <div
      className="flex h-8 items-center gap-2 rounded-lg border border-edge bg-surface px-3 text-xs"
      title="Waktu realtime · WIB (Asia/Jakarta)"
    >
      <ClockIcon className="h-3.5 w-3.5 text-ink-3" />
      <span className="text-ink-2">{fmtDate(now)}</span>
      <span className="num font-semibold tracking-tight">{fmtTime(now)}</span>
      <span className="text-[10px] text-ink-3">WIB</span>
    </div>
  );
}
