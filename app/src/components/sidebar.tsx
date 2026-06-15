"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, TrendingUp, ClipboardList, Map, LayoutDashboard, ChevronLeft, ChevronRight, Activity } from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/pareto", label: "Trend Gangguan Trafo", icon: TrendingUp },
  { href: "/ce-abo", label: "CE Next Level 2026", icon: ClipboardList },
  { href: "/abo-2026", label: "ABO 2026", icon: Zap },
  { href: "/asset-maps", label: "Asset Maps", icon: Map },
  { href: "/ahi-mtu", label: "Asset Healthy Index MTU", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside 
      className={`sticky top-0 z-30 flex h-auto shrink-0 flex-row items-center gap-1 border-b border-edge bg-surface px-3 py-2 backdrop-blur-xl transition-all duration-300 md:h-screen md:flex-col md:items-stretch md:gap-0 md:border-b-0 md:border-r ${
        isOpen ? "w-full md:w-60 md:px-4 md:py-6" : "w-full md:w-16 md:px-2 md:py-6"
      }`}
    >
      <div className={`flex items-center md:mb-8 ${isOpen ? "justify-between" : "justify-center"}`}>
        <Link href="/" className={`flex items-center gap-2.5 ${isOpen ? "md:px-2" : ""}`}>
          <Zap className="bolt h-6 w-6 shrink-0" fill="currentColor" strokeWidth={0} />
          {isOpen && (
            <div className="leading-tight hidden md:block">
              <div className="text-sm font-bold tracking-wide">Hartrans 2</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-3">
                Gardu Induk
              </div>
            </div>
          )}
          {/* Mobile title always shows */}
          <div className="leading-tight md:hidden">
            <div className="text-sm font-bold tracking-wide">Hartrans 2</div>
          </div>
        </Link>
        
        {/* Toggle Button (Desktop Only) */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="hidden md:flex items-center justify-center h-6 w-6 rounded-md hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors"
          title={isOpen ? "Tutup Menu" : "Buka Menu"}
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={!isOpen ? label : undefined}
              className={`flex shrink-0 items-center rounded-lg transition-colors ${
                isOpen ? "gap-2.5 px-3 py-2" : "justify-center p-2 mb-1"
              } ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {/* Desktop label (hidden if closed), Mobile label (always shows) */}
              <span className={`whitespace-nowrap ${!isOpen ? "hidden md:hidden" : "block"}`}>
                {label}
              </span>
              {active && isOpen && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-accent md:block" />}
            </Link>
          );
        })}
      </nav>

      {isOpen && (
        <div className="hidden items-center md:mt-auto md:flex md:px-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-ink-3">UIT JBT</span>
        </div>
      )}
    </aside>
  );
}

