"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const allSelected = selected.length === 0 || selected.length === options.length;
  const display = allSelected
    ? "Semua"
    : selected.length === 1
      ? selected[0]
      : `${selected.length} terpilih`;

  function toggle(value: string) {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
          allSelected
            ? "border-edge bg-surface text-ink-2 hover:border-edge-strong"
            : "border-accent/50 bg-accent-soft text-accent"
        }`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</span>
        <span className="max-w-36 truncate font-medium">{display}</span>
        {!allSelected ? (
          <X
            className="h-3.5 w-3.5 hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          />
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-72 w-60 overflow-y-auto rounded-lg border border-edge bg-surface-solid p-1 shadow-xl scrollbar-thin">
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-semibold hover:bg-surface-2"
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded border ${allSelected ? "border-accent bg-accent text-white dark:text-slate-900" : "border-edge-strong"}`}>
              {allSelected && <Check className="h-3 w-3" />}
            </span>
            Semua
          </button>
          <div className="mx-2 my-1 border-t border-edge" />
          {options.map((opt) => {
            const on = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-2"
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-accent bg-accent text-white dark:text-slate-900" : "border-edge-strong"}`}>
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
