"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, TrendingUp, ClipboardList, Map, LayoutDashboard } from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/pareto", label: "Trend Gangguan Trafo", icon: TrendingUp },
  { href: "/ce-abo", label: "CE Next Level 2026", icon: ClipboardList },
  { href: "/asset-maps", label: "Asset Maps", icon: Map },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full shrink-0 flex-row items-center gap-1 border-b border-edge bg-surface px-3 py-2 backdrop-blur-xl md:h-screen md:w-60 md:flex-col md:items-stretch md:gap-0 md:border-b-0 md:border-r md:px-4 md:py-6">
      <Link href="/" className="flex items-center gap-2.5 md:mb-8 md:px-2">
        <Zap className="bolt h-6 w-6" fill="currentColor" strokeWidth={0} />
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-wide">Hartrans 2</div>
          <div className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-ink-3 md:block">
            Gardu Induk
          </div>
        </div>
      </Link>

      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto md:flex-col">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
              {active && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-accent md:block" />}
            </Link>
          );
        })}
      </nav>

      <div className="hidden items-center md:mt-auto md:flex md:px-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-ink-3">UIT JBT</span>
      </div>
    </aside>
  );
}
