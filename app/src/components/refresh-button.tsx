"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CircleAlert, CircleCheck } from "lucide-react";

export function RefreshButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function refresh() {
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setState("ok");
      const total = (Number(body.ce_abo) || 0) + (Number(body.gangguan_trafo) || 0);
      setMsg(total > 0 ? `${total} baris` : "selesai");
      router.refresh();
      setTimeout(() => setState("idle"), 4000);
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Gagal refresh");
    }
  }

  return (
    <div className="flex items-center gap-2">
      {state === "ok" && (
        <span className="flex items-center gap-1 text-xs text-emerald-500">
          <CircleCheck className="h-3.5 w-3.5" /> {msg}
        </span>
      )}
      {state === "error" && (
        <span className="flex max-w-60 items-center gap-1 truncate text-xs text-red-500" title={msg}>
          <CircleAlert className="h-3.5 w-3.5 shrink-0" /> {msg}
        </span>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={state === "loading"}
        className="flex h-8 items-center gap-2 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60 dark:text-slate-900"
      >
        <RefreshCw className={`h-4 w-4 ${state === "loading" ? "spinning" : ""}`} />
        {state === "loading" ? "Menarik data…" : "Refresh Data"}
      </button>
    </div>
  );
}
