"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Crosshair, Plus, Minus, Navigation2, Mountain, Globe, Maximize2, Minimize2,
  ChevronDown, ChevronRight, ListOrdered, Building2, Palette,
  Filter, Hash, Sun, Zap, X,
} from "lucide-react";
import { PALETTE } from "@/lib/colors";
import { HOME_VIEW, MAP_STYLES, type MapColorMode, type MapStyleKey } from "./gi-map";
import type { MapRef } from "react-map-gl/maplibre";
import type { LucideIcon } from "lucide-react";

export type GiPoint = {
  gardu: string;
  unit: string;
  lat: number;
  lng: number;
  total: number;
  trafo_count: number;
  trafo_ids: string[];
  kategori_counts: Record<string, number>;
};

const GiMap = dynamic(() => import("./gi-map").then((m) => m.GiMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-3">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber border-t-transparent" />
      Memuat peta…
    </div>
  ),
});

type MenuKey = "gi" | "warna" | "unit" | null;

function CheckItem({
  icon: Icon, label, on, onClick, color = "#f59e0b", count, isLight, mut, hov,
}: {
  icon?: LucideIcon;
  label: string;
  on: boolean;
  onClick: () => void;
  color?: string;
  count?: number;
  isLight: boolean;
  mut: string;
  hov: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-150 ${
        on ? (isLight ? "bg-amber-500/15 text-amber-700" : "bg-amber-500/20 text-amber-300") : `${mut} ${hov}`
      }`}
      style={on && color !== "#f59e0b" ? { backgroundColor: color + "26", color: isLight ? undefined : color } : undefined}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      )}
      <span className="flex-1 text-xs">{label}</span>
      {typeof count === "number" && <span className="num text-[10px] opacity-70">{count}</span>}
      <span
        className={`flex h-3 w-3 items-center justify-center rounded border text-[9px] ${
          on ? "border-transparent text-white" : isLight ? "border-black/30" : "border-white/30"
        }`}
        style={on ? { backgroundColor: color } : undefined}
      >
        {on ? "✓" : ""}
      </span>
    </button>
  );
}

function GroupButton({
  icon: Icon, label, menu, activeCount, expanded, onExpandedChange, isLight, mut, hov,
}: {
  icon: LucideIcon;
  label: string;
  menu: MenuKey;
  activeCount?: number;
  expanded: MenuKey;
  onExpandedChange: (menu: MenuKey) => void;
  isLight: boolean;
  mut: string;
  hov: string;
}) {
  const open = expanded === menu;
  const active = (activeCount ?? 0) > 0;
  return (
    <button
      type="button"
      onClick={() => onExpandedChange(open ? null : menu)}
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 transition-all duration-200 ${
        active ? (isLight ? "bg-amber-500/20 text-amber-700" : "bg-amber-500/25 text-amber-300") : `${mut} ${hov}`
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1 text-left text-xs font-bold">
        {label}{active ? ` (${activeCount})` : ""}
      </span>
      {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
    </button>
  );
}

export function AssetMapsView({ points }: { points: GiPoint[] }) {
  const { resolvedTheme } = useTheme();
  const userOverrodeStyle = useRef(false);
  const [styleKey, setStyleKey] = useState<MapStyleKey>("dark");
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [expanded, setExpanded] = useState<MenuKey>("gi");
  const [colorMode, setColorMode] = useState<MapColorMode>("intensitas");
  const [selUnit, setSelUnit] = useState<string[]>([]);
  const [showGi, setShowGi] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showRanking, setShowRanking] = useState(true);
  const [is3D, setIs3D] = useState(false);
  const [isGlobe, setIsGlobe] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selected, setSelected] = useState<GiPoint | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Instance map buat komponen yang subscribe sendiri (CameraInfo, kompas)
  const [mapInst, setMapInst] = useState<MapRef | null>(null);

  // Style map sync sama theme app — stop sync kalau user pilih manual
  useEffect(() => {
    if (!userOverrodeStyle.current && resolvedTheme) {
      setStyleKey(resolvedTheme === "light" ? "light" : "dark");
    }
  }, [resolvedTheme]);

  const units = useMemo(
    () => [...new Set(points.map((p) => p.unit).filter(Boolean))].sort(),
    [points],
  );
  const unitColors = useMemo(
    () => Object.fromEntries(units.map((u, i) => [u, PALETTE[i % PALETTE.length]])),
    [units],
  );
  const filtered = useMemo(
    () =>
      (selUnit.length === 0 ? points : points.filter((p) => selUnit.includes(p.unit)))
        .toSorted((a, b) => b.total - a.total || b.trafo_count - a.trafo_count),
    [points, selUnit],
  );
  const totalGgn = filtered.reduce((s, p) => s + p.total, 0);
  const totalTrafo = filtered.reduce((s, p) => s + p.trafo_count, 0);
  const max = Math.max(...filtered.map((p) => p.total), 1);

  const map = () => mapRef.current?.getMap();
  const focusGi = (p: GiPoint) =>
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 11, duration: 1100 });

  // 3D Terrain — PERSIS useMapGL dashboard utama: DEM terrarium + hillshade + terrain
  const applyTerrain = (m: ReturnType<NonNullable<typeof mapRef.current>["getMap"]>, on: boolean) => {
    try {
      if (on) {
        if (!m.getSource("terrain-dem")) {
          m.addSource("terrain-dem", {
            type: "raster-dem",
            tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
            encoding: "terrarium",
            tileSize: 256,
            maxzoom: 15,
          });
        }
        if (!m.getLayer("hillshade")) {
          m.addLayer({
            id: "hillshade",
            type: "hillshade",
            source: "terrain-dem",
            paint: {
              "hillshade-exaggeration": 0.5,
              "hillshade-shadow-color": "#374151",
              "hillshade-highlight-color": "#fef3c7",
              "hillshade-illumination-direction": 315,
            },
          });
        }
        m.setTerrain({ source: "terrain-dem", exaggeration: 1.3 });
      } else {
        m.setTerrain(null);
        if (m.getLayer("hillshade")) m.removeLayer("hillshade");
        if (m.getSource("terrain-dem")) m.removeSource("terrain-dem");
      }
    } catch { /* style lagi transisi — re-apply jalan via style.load */ }
  };

  const toggle3D = () => {
    const next = !is3D;
    setIs3D(next);
    const m = map();
    if (!m) return;
    applyTerrain(m, next);
    // sama dgn dashboard utama: cuma pitch yang dianimasikan, zoom gak disentuh
    m.easeTo({ pitch: next ? 60 : 0, duration: 1000 });
  };

  const toggleGlobe = () => {
    const next = !isGlobe;
    setIsGlobe(next);
    const m = map();
    if (!m) return;
    m.setProjection({ type: next ? "globe" : "mercator" });
    // globe cuma keliatan melengkung pas zoom jauh — auto zoom out/in
    m.easeTo(
      next
        ? { zoom: 2.6, center: [110, -2], pitch: 0, duration: 1400 }
        : { zoom: 7.2, center: [108.4, -6.95], duration: 1400 },
    );
    if (next && is3D) { setIs3D(false); applyTerrain(m, false); }
  };

  // Ganti basemap = style baru = terrain/projection kereset → re-apply
  useEffect(() => {
    const m = mapInst?.getMap();
    if (!m) return;
    const reapply = () => {
      applyTerrain(m, is3D);
      m.setProjection({ type: isGlobe ? "globe" : "mercator" });
    };
    m.on("style.load", reapply);
    return () => { m.off("style.load", reapply); };
  }, [mapInst, is3D, isGlobe]);
  // Reset View = balik ke kondisi default persis kayak habis refresh page
  const resetNorth = () => {
    const m = map();
    if (!m) return;
    if (is3D) { setIs3D(false); applyTerrain(m, false); }
    if (isGlobe) { setIsGlobe(false); m.setProjection({ type: "mercator" }); }
    m.flyTo({ ...HOME_VIEW, duration: 1500, essential: true });
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };
  const toggleUnit = (u: string) =>
    setSelUnit((s) => (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]));

  const sevColor = (total: number) => {
    const r = total / max;
    return r > 0.67 ? "#ef4444" : r > 0.34 ? "#f59e0b" : "#10b981";
  };

  /* ── Adaptive theme: panel ikut terang/gelapnya BASEMAP (konsep StandardMap) ── */
  const isLight = styleKey === "light" || styleKey === "osm";
  const cardBg = isLight ? "bg-white/75" : "bg-black/60";
  const cardBd = isLight ? "border-black/15" : "border-white/15";
  const tx = isLight ? "text-slate-800" : "text-zinc-100";
  const mut = isLight ? "text-slate-500" : "text-zinc-400";
  const hov = isLight ? "hover:bg-black/5" : "hover:bg-white/10";
  const sep = isLight ? "bg-black/10" : "bg-white/10";
  const panel = `backdrop-blur-md rounded-lg border ${cardBg} ${cardBd}`;

  const railBtn = `flex h-9 w-9 items-center justify-center transition-colors ${mut} ${hov}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={wrapRef}
        className="relative min-h-0 flex-1 overflow-hidden border-t border-edge bg-surface-solid"
      >
        <GiMap
          points={filtered}
          styleKey={styleKey}
          colorMode={colorMode}
          unitColors={unitColors}
          showGi={showGi}
          showLabels={showLabels}
          selectedGardu={selected?.gardu ?? null}
          onSelect={setSelected}
          onMapRef={(r) => { mapRef.current = r; setMapInst(r); }}
        />

        {/* ═══ KIRI-ATAS: title badge + panel layer (konsep StandardMap) ═══ */}
        <div className={`absolute bottom-3 left-3 top-3 z-20 flex w-56 flex-col gap-2 overflow-y-auto scrollbar-thin ${tx}`}>
          <div className={`${panel} px-3 py-1.5`}>
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Zap className="bolt h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
              Hartrans 2 - Gardu Induk
            </h2>
            <p className={`text-[11px] ${mut}`}>Asset Visualisation · UIT JBT</p>
          </div>

          {/* Stats (pindah ke atas) */}
          <div className={`${panel} flex items-center justify-between gap-3 px-3 py-2`}>
            {[
              { label: "GI", value: filtered.length },
              { label: "Gangguan", value: totalGgn },
              { label: "Trafo", value: totalTrafo },
              { label: "Max", value: filtered[0] ? `${filtered[0].total}×` : "—" },
            ].map((s) => (
              <div key={s.label} className="leading-tight">
                <div className={`text-[9px] uppercase tracking-wider ${mut}`}>{s.label}</div>
                <div className="num text-sm font-bold">{s.value}</div>
              </div>
            ))}
          </div>

          <div className={`${panel} overflow-hidden`}>
            {/* Grup: Gardu Induk */}
            <GroupButton icon={Building2} label="Gardu Induk" menu="gi" expanded={expanded} onExpandedChange={setExpanded} isLight={isLight} mut={mut} hov={hov}
              activeCount={[showGi, showLabels, showRanking].filter(Boolean).length} />
            <div className={`overflow-hidden transition-all duration-300 ${expanded === "gi" ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
              <div className={`space-y-0.5 border-t px-1.5 py-1 ${cardBd}`}>
                <CheckItem icon={Building2} label="Marker GI" on={showGi} onClick={() => setShowGi(!showGi)} count={filtered.length} isLight={isLight} mut={mut} hov={hov} />
                <CheckItem icon={Hash} label="Label Jumlah" on={showLabels} onClick={() => setShowLabels(!showLabels)} isLight={isLight} mut={mut} hov={hov} />
                <CheckItem icon={ListOrdered} label="Panel Ranking" on={showRanking} onClick={() => setShowRanking(!showRanking)} isLight={isLight} mut={mut} hov={hov} />
              </div>
            </div>

            <div className={`h-px ${sep}`} />

            {/* Grup: Warna */}
            <GroupButton icon={Palette} label="Mode Warna" menu="warna" expanded={expanded} onExpandedChange={setExpanded} isLight={isLight} mut={mut} hov={hov} />
            <div className={`overflow-hidden transition-all duration-300 ${expanded === "warna" ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
              <div className={`space-y-0.5 border-t px-1.5 py-1 ${cardBd}`}>
                <CheckItem icon={Sun} label="Intensitas Gangguan" on={colorMode === "intensitas"} onClick={() => setColorMode("intensitas")} isLight={isLight} mut={mut} hov={hov} />
                <CheckItem icon={Palette} label="Warna per UPT" on={colorMode === "upt"} onClick={() => setColorMode("upt")} isLight={isLight} mut={mut} hov={hov} />
                <div className={`mx-2 my-1 h-px ${sep}`} />
                {(colorMode === "upt"
                  ? units.map((u) => ({ c: unitColors[u], l: u.replace(/^UPT /, "") }))
                  : [
                      { c: "#10b981", l: "Rendah" },
                      { c: "#f59e0b", l: "Sedang" },
                      { c: "#ef4444", l: "Tinggi" },
                    ]
                ).map((x) => (
                  <div key={x.l} className={`flex items-center gap-2 px-2 py-0.5 text-[11px] ${mut}`}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: x.c }} />
                    {x.l}
                  </div>
                ))}
                <div className={`px-2 pb-1 pt-0.5 text-[10px] ${mut}`}>Ukuran ∝ jumlah gangguan</div>
              </div>
            </div>

            <div className={`h-px ${sep}`} />

            {/* Grup: Filter Unit (checklist ala Thor) */}
            <GroupButton icon={Filter} label="Filter Unit" menu="unit" activeCount={selUnit.length} expanded={expanded} onExpandedChange={setExpanded} isLight={isLight} mut={mut} hov={hov} />
            <div className={`overflow-hidden transition-all duration-300 ${expanded === "unit" ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
              <div className={`space-y-0.5 border-t px-1.5 py-1 ${cardBd}`}>
                {selUnit.length > 0 && (
                  <button type="button" onClick={() => setSelUnit([])}
                    className={`w-full rounded-md px-2 py-1 text-left text-[11px] font-semibold ${mut} ${hov}`}>
                    ✕ Reset (tampilkan semua)
                  </button>
                )}
                {units.map((u) => (
                  <CheckItem
                    key={u}
                    label={u.replace(/^UPT /, "")}
                    on={selUnit.includes(u)}
                    onClick={() => toggleUnit(u)}
                    color={unitColors[u]}
                    count={points.filter((p) => p.unit === u).length}
                    isLight={isLight}
                    mut={mut}
                    hov={hov}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ═══ BAWAH-KIRI: control stack + style flyout (semua kontrol di bawah) ═══ */}
        <div className={`absolute bottom-12 left-3 z-20 flex items-end gap-1 ${tx}`}>
          <div className={`${panel} flex w-9 flex-col overflow-hidden`}>
            <button type="button" onClick={() => setShowStyleMenu(!showStyleMenu)} title="Map Style"
              className={`${railBtn} ${showStyleMenu ? (isLight ? "bg-amber-500/20 text-amber-700" : "bg-amber-500/25 text-amber-300") : ""}`}>
              <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${showStyleMenu ? "rotate-180" : ""}`} />
            </button>
            <div className={`h-px ${sep}`} />
            <button type="button" onClick={() => map()?.zoomIn()} className={railBtn} title="Zoom In"><Plus className="h-4 w-4" /></button>
            <button type="button" onClick={() => map()?.zoomOut()} className={railBtn} title="Zoom Out"><Minus className="h-4 w-4" /></button>
            <div className={`h-px ${sep}`} />
            <button type="button" onClick={resetNorth} className={railBtn} title="Reset View">
              <CompassNeedle map={mapInst} />
            </button>
            <button type="button" onClick={toggle3D} className={`${railBtn} ${is3D ? "bg-green-500/80 text-white" : ""}`} title="3D"><Mountain className="h-4 w-4" /></button>
            <button type="button" onClick={toggleGlobe} className={`${railBtn} ${isGlobe ? "bg-blue-500/80 text-white" : ""}`} title="Globe"><Globe className="h-4 w-4" /></button>
            <div className={`h-px ${sep}`} />
            <button type="button" onClick={toggleFullscreen} className={`${railBtn} ${isFullscreen ? "bg-cyan-500/80 text-white" : ""}`} title="Fullscreen">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Style flyout — pill di samping stack */}
          <div className={`flex flex-col gap-0.5 transition-all duration-300 ${showStyleMenu ? "max-w-30 opacity-100" : "max-w-0 overflow-hidden opacity-0"}`}>
            {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => { userOverrodeStyle.current = true; setStyleKey(k); setShowStyleMenu(false); }}
                className={`whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-bold transition-colors ${
                  styleKey === k
                    ? "border-amber-500 bg-amber-500 text-black"
                    : `${cardBg} ${cardBd} ${mut} ${hov}`
                }`}
              >
                {MAP_STYLES[k].label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ BAWAH-KIRI: CameraInfo (X/Y/Z/P/B/S, collapsible) ═══ */}
        <CameraInfo map={mapInst} isLight={isLight} panel={panel} mut={mut} sep={sep} />

        {/* ═══ BAWAH-TENGAH: detail GI terpilih (enterprise) ═══ */}
        {selected && (
          <div className={`${panel} absolute bottom-3 left-1/2 z-20 w-104 max-w-[calc(100%-22rem)] -translate-x-1/2 p-3.5 ${tx}`}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold leading-tight">{selected.gardu}</div>
                <div className={`mt-0.5 flex items-center gap-1.5 text-[10px] ${mut}`}>
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: unitColors[selected.unit] ?? "#94a3b8" }}
                  />
                  {selected.unit}
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className={`rounded-md p-1 ${mut} ${hov}`} aria-label="Tutup">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-2.5 grid grid-cols-3 gap-2">
              {[
                { label: "Gangguan", value: String(selected.total) },
                { label: "Trafo Terdampak", value: String(selected.trafo_count) },
                { label: "Share UIT", value: `${((selected.total / Math.max(totalGgn, 1)) * 100).toFixed(1)}%` },
              ].map((m) => (
                <div key={m.label} className={`rounded-md border px-2 py-1.5 ${cardBd}`}>
                  <div className={`text-[8px] uppercase tracking-wider ${mut}`}>{m.label}</div>
                  <div className="num text-base font-bold leading-tight">{m.value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {Object.entries(selected.kategori_counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-[10px]">
                    <span className={`w-24 truncate ${mut}`}>{k}</span>
                    <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${isLight ? "bg-black/10" : "bg-white/10"}`}>
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${(v / selected.total) * 100}%` }} />
                    </div>
                    <span className="num w-5 text-right font-bold">{v}</span>
                  </div>
                ))}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1">
              {selected.trafo_ids.map((t) => (
                <span key={t} className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${cardBd} ${mut}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══ KANAN: panel ranking GI ═══ */}
        {showRanking && (
          <div className={`${panel} absolute bottom-4 right-3 top-3 z-10 hidden w-60 flex-col p-3 md:flex ${tx}`}>
            <h3 className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${mut}`}>
              <ListOrdered className="h-3 w-3" /> Ranking GI · by gangguan
            </h3>
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
              {filtered.map((p, i) => (
                <button
                  key={p.gardu}
                  type="button"
                  onClick={() => { setSelected(p); focusGi(p); }}
                  className={`group flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors ${
                    selected?.gardu === p.gardu ? (isLight ? "bg-amber-500/15" : "bg-amber-500/20") : hov
                  }`}
                >
                  <span className={`num w-4 shrink-0 text-[10px] ${mut}`}>{i + 1}</span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colorMode === "upt" ? unitColors[p.unit] : sevColor(p.total) }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium leading-tight">
                      {p.gardu.replace(/^GIS? \d+KV /, "")}
                    </span>
                    <span className={`block truncate text-[9px] ${mut}`}>
                      {p.unit.replace(/^UPT /, "")} · {p.trafo_count} trafo
                    </span>
                  </span>
                  <span className="num text-[11px] font-bold">{p.total}</span>
                  <Crosshair className={`h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${mut}`} />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* Kompas — subscribe langsung ke map event, gak re-render parent */
function CompassNeedle({ map }: { map: MapRef | null }) {
  const [bearing, setBearing] = useState(0);
  useEffect(() => {
    if (!map) return;
    const m = map.getMap();
    const h = () => setBearing(m.getBearing());
    m.on("rotate", h);
    h();
    return () => { m.off("rotate", h); };
  }, [map]);
  return (
    <Navigation2
      className="h-4 w-4"
      style={{ transform: `rotate(${-bearing}deg)`, transition: "transform 0.3s ease-out" }}
    />
  );
}

/* CameraInfo — overlay X/Y/Z/P/B/S. Subscribe sendiri ke map (rAF throttle),
   parent TIDAK ikut re-render saat pan/zoom. */
function CameraInfo({
  map, isLight, panel, mut, sep,
}: {
  map: MapRef | null;
  isLight: boolean;
  panel: string;
  mut: string;
  sep: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [cam, setCam] = useState({ lng: 108.4, lat: -6.95, zoom: 7.2, pitch: 0, bearing: 0 });
  const scheduled = useRef(false);

  useEffect(() => {
    if (!map) return;
    const m = map.getMap();
    const update = () => {
      if (scheduled.current) return;
      scheduled.current = true;
      requestAnimationFrame(() => {
        scheduled.current = false;
        const c = m.getCenter();
        setCam({ lng: c.lng, lat: c.lat, zoom: m.getZoom(), pitch: m.getPitch(), bearing: m.getBearing() });
      });
    };
    m.on("move", update);
    update();
    return () => { m.off("move", update); };
  }, [map]);

  const mpp = (156543.03392 * Math.cos((cam.lat * Math.PI) / 180)) / 2 ** cam.zoom;
  const meters = mpp * 80;
  const scale = meters >= 1000 ? `${Math.round(meters / 1000)} km` : `${Math.round(meters)} m`;
  const primary = isLight ? "text-blue-600" : "text-cyan-400";
  const sepTx = isLight ? "text-black/20" : "text-white/20";

  return (
    <div className={`${panel} absolute bottom-3 left-3 z-10 flex items-center`}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={`flex h-6 w-6 items-center justify-center ${mut} transition-opacity hover:opacity-80`}
        title={collapsed ? "Show Info" : "Hide Info"}
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
      </button>
      <div className={`h-5 w-px ${sep}`} />
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-125 opacity-100"}`}>
        <div className="num flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-xs">
          <span className={primary}>X:{cam.lng.toFixed(3)}</span>
          <span className={sepTx}>|</span>
          <span className={primary}>Y:{cam.lat.toFixed(3)}</span>
          <span className={sepTx}>|</span>
          <span className={primary}>Z:{cam.zoom.toFixed(1)}</span>
          <span className={sepTx}>|</span>
          <span className={primary}>P:{Math.round(cam.pitch)}°</span>
          <span className={sepTx}>|</span>
          <span className={primary}>B:{Math.round(cam.bearing)}°</span>
          <span className={sepTx}>|</span>
          <span className={mut}>S:{scale}</span>
        </div>
      </div>
    </div>
  );
}
