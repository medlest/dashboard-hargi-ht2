"use client";

// Hero map Overview — tour sinematik 5 scene (loop):
//   intro (muter → settle posisi final) → top GI → top UPT → tahun berjalan → bulan berjalan
// Caption animated nempel di peta ganti per scene. User pegang peta = pause, idle 4s = lanjut.
// Komposisi: padding kiri besar → pulau & titik condong ke kanan (teks hero di kiri).
import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Source, Layer } from "react-map-gl/maplibre";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapRef } from "react-map-gl/maplibre";
import type { Map as MlMap, StyleSpecification } from "maplibre-gl";

export type HeroGi = {
  gardu: string;
  unit: string;
  lat: number;
  lng: number;
  total: number;
  total_year: number;
  total_month: number;
};

const SEVERITY = { low: "#10b981", mid: "#f59e0b", high: "#ef4444" };
const MONTHS_ID = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
];

// Posisi final intro = kalibrasi user 2026-06-12 23:15 (X/Y/Z/P/B dari CameraInfo)
const FINAL_VIEW = { center: [109.109, -7.221] as [number, number], zoom: 6.6, pitch: 51, bearing: -14 };
// Komposisi "kesamping": fokus kamera digeser ke kanan area teks hero
const CAM_PADDING = { left: 360, top: 40, right: 40, bottom: 130 };

const SCENES = [
  { id: "intro", dur: 8000 },
  { id: "topgi", dur: 5000 },
  { id: "topupt", dur: 5000 },
  { id: "tahun", dur: 5000 },
  { id: "bulan", dur: 5000 },
] as const;
type SceneId = (typeof SCENES)[number]["id"];

function rasterStyle(name: string, tiles: string[], attribution: string): StyleSpecification {
  return {
    version: 8,
    sources: { [name]: { type: "raster", tiles, tileSize: 256, attribution } },
    layers: [{ id: name, type: "raster", source: name }],
  };
}

const STYLE_DARK = rasterStyle(
  "carto-dark",
  ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
  "© CARTO © OpenStreetMap contributors",
);
const STYLE_LIGHT = rasterStyle(
  "carto-light",
  ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
  "© CARTO © OpenStreetMap contributors",
);

// Terrain sama persis asset-maps (DEM terrarium + hillshade)
function applyTerrain(m: MlMap) {
  try {
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
  } catch {
    /* style lagi transisi — re-apply via style.load */
  }
}

export function HeroMap({
  points,
  totals,
}: {
  points: HeroGi[];
  // Total RESMI tahun/bulan berjalan (semua baris, termasuk GI tanpa koordinat)
  // — biar caption konsisten dengan KPI walau titiknya gak kegambar di peta.
  totals?: { year: number; month: number };
}) {
  const { resolvedTheme } = useTheme();
  const [initialDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const dark = resolvedTheme ? resolvedTheme === "dark" : initialDark;

  const mapRef = useRef<MapRef | null>(null);
  const lastInteract = useRef(0);
  const [scene, setScene] = useState(0);
  const mode: SceneId = SCENES[scene].id;
  // Instance map buat CameraInfo (subscribe sendiri, parent gak re-render)
  const [mapInst, setMapInst] = useState<MlMap | null>(null);

  // Style awal dikunci — ganti theme manual (swap prop mapStyle saat terrain
  // aktif bikin maplibre crash: terrainDepth baca DEM yang sudah hilang).
  const [initialStyle] = useState(() => (dark ? STYLE_DARK : STYLE_LIGHT));
  useEffect(() => {
    const m = mapRef.current?.getMap();
    if (!m || !m.isStyleLoaded()) return;
    try {
      m.setTerrain(null);
      if (m.getLayer("hillshade")) m.removeLayer("hillshade");
      if (m.getSource("terrain-dem")) m.removeSource("terrain-dem");
    } catch { /* style lagi transisi */ }
    m.setStyle(dark ? STYLE_DARK : STYLE_LIGHT);
  }, [dark]);

  // ===== Data tour: top GI, top UPT, total tahun & bulan berjalan =====
  const tour = useMemo(() => {
    const now = new Date();
    const curYear = String(now.getFullYear());
    const curMonth = MONTHS_ID[now.getMonth()];
    const top = [...points].sort((a, b) => b.total - a.total)[0] ?? null;
    const unitSum = new Map<string, number>();
    for (const p of points) unitSum.set(p.unit, (unitSum.get(p.unit) ?? 0) + p.total);
    const topUnitEntry = [...unitSum.entries()].sort((a, b) => b[1] - a[1])[0];
    const topUnit = topUnitEntry?.[0] ?? "";
    const unitPts = points.filter((p) => p.unit === topUnit);
    return {
      curYear,
      curMonth,
      top,
      topUnit,
      topUnitTotal: topUnitEntry?.[1] ?? 0,
      unitPts,
      grandTotal: points.reduce((s, p) => s + p.total, 0),
      yearSum: points.reduce((s, p) => s + p.total_year, 0),
      monthSum: points.reduce((s, p) => s + p.total_month, 0),
    };
  }, [points]);

  // ===== Titik per scene: subset + metrik beda → visual ikut scene =====
  const view = useMemo(() => {
    let pts = points;
    let metric = (p: HeroGi) => p.total;
    if (mode === "topupt") pts = tour.unitPts;
    else if (mode === "tahun") { pts = points.filter((p) => p.total_year > 0); metric = (p) => p.total_year; }
    else if (mode === "bulan") { pts = points.filter((p) => p.total_month > 0); metric = (p) => p.total_month; }
    const max = Math.max(...pts.map(metric), 1);
    return {
      type: "FeatureCollection" as const,
      features: [...pts].sort((a, b) => metric(a) - metric(b)).map((p) => {
        const r = metric(p) / max;
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
          properties: {
            gardu: p.gardu,
            value: metric(p),
            ratio: r,
            color: r > 0.67 ? SEVERITY.high : r > 0.34 ? SEVERITY.mid : SEVERITY.low,
          },
        };
      }),
    };
  }, [points, mode, tour]);

  // ===== Kamera per scene =====
  const applyScene = (m: MlMap, id: SceneId) => {
    if (id === "intro") {
      // sweep pendek dari dekat → berhenti PERSIS di posisi final (kalibrasi user)
      m.easeTo({ ...FINAL_VIEW, bearing: FINAL_VIEW.bearing - 30, zoom: FINAL_VIEW.zoom - 0.25, duration: 700 });
      setTimeout(() => {
        if (Date.now() - lastInteract.current > 700) {
          m.easeTo({ ...FINAL_VIEW, duration: 6600, easing: (t) => t });
        }
      }, 800);
    } else if (id === "topgi" && tour.top) {
      m.flyTo({ center: [tour.top.lng, tour.top.lat], zoom: 10.6, pitch: 60, bearing: 18, duration: 2400 });
    } else if (id === "topupt" && tour.unitPts.length > 0) {
      const lngs = tour.unitPts.map((p) => p.lng);
      const lats = tour.unitPts.map((p) => p.lat);
      m.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { pitch: 50, bearing: -12, duration: 2400, maxZoom: 9.5 },
      );
    } else if (id === "tahun") {
      m.easeTo({ center: FINAL_VIEW.center, zoom: 7.1, pitch: 52, bearing: 8, duration: 2200 });
    } else if (id === "bulan") {
      m.easeTo({ center: FINAL_VIEW.center, zoom: 7.4, pitch: 58, bearing: -12, duration: 2200 });
    }
  };

  useEffect(() => {
    const m = mapRef.current?.getMap();
    if (m) applyScene(m, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // Scheduler: lanjut scene berikutnya; user lagi pegang peta → tunda
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = (ms: number) => {
      t = setTimeout(() => {
        if (Date.now() - lastInteract.current < 4000) { tick(2000); return; }
        setScene((s) => (s + 1) % SCENES.length);
      }, ms);
    };
    tick(SCENES[scene].dur);
    return () => clearTimeout(t);
  }, [scene]);

  const captions: Record<SceneId, { eyebrow: string; text: string; value: string }> = {
    intro: {
      eyebrow: "Sebaran Aset",
      text: `${points.length} GI terpantau`,
      value: `${tour.grandTotal} gangguan`,
    },
    topgi: {
      eyebrow: "GI Gangguan Terbanyak",
      text: tour.top ? tour.top.gardu.replace(/^GIS?T?\s*\d+\s*KV\s*/i, "") : "—",
      value: tour.top ? `${tour.top.total} gangguan` : "",
    },
    topupt: {
      eyebrow: "UPT Paling Terganggu",
      text: tour.topUnit.replace(/^UPT /, ""),
      value: `${tour.topUnitTotal} gangguan · ${tour.unitPts.length} GI`,
    },
    tahun: {
      eyebrow: `Tahun Berjalan ${tour.curYear}`,
      text: "Gangguan tahun ini",
      value: `${totals?.year ?? tour.yearSum} gangguan`,
    },
    bulan: {
      eyebrow: `Bulan Berjalan · ${tour.curMonth}`,
      text: `${tour.curMonth} ${tour.curYear}`,
      value: `${totals?.month ?? tour.monthSum} gangguan`,
    },
  };
  const cap = captions[mode];

  const markInteract = () => {
    lastInteract.current = Date.now();
  };

  return (
    <div
      className="absolute inset-0"
      onPointerDown={markInteract}
      onWheel={markInteract}
      onTouchStart={markInteract}
    >
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: FINAL_VIEW.center[0],
          latitude: FINAL_VIEW.center[1],
          zoom: FINAL_VIEW.zoom - 0.25,
          pitch: FINAL_VIEW.pitch,
          bearing: FINAL_VIEW.bearing - 30,
          padding: CAM_PADDING,
        }}
        mapStyle={initialStyle}
        onLoad={(e) => {
          const m = e.target;
          // komposisi kesamping: SEMUA camera move hormati padding kiri
          m.setPadding(CAM_PADDING);
          applyTerrain(m);
          m.on("style.load", () => applyTerrain(m));
          applyScene(m, "intro");
          setMapInst(m);
        }}
        // klik area peta = langsung lompat ke scene berikutnya (gak nunggu timer)
        onClick={() => setScene((s) => (s + 1) % SCENES.length)}
        scrollZoom={false}
        doubleClickZoom={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <Source id="hero-gi" type="geojson" data={view}>
          <Layer
            id="hero-gi-glow"
            type="circle"
            paint={{
              "circle-radius": ["+", 9, ["*", 20, ["sqrt", ["get", "ratio"]]]],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.16,
              "circle-blur": 0.7,
            }}
          />
          <Layer
            id="hero-gi-core"
            type="circle"
            paint={{
              "circle-radius": ["+", 2.5, ["*", 9, ["sqrt", ["get", "ratio"]]]],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.75,
            }}
          />
          {/* highlight GI top saat scene topgi */}
          <Layer
            id="hero-gi-top-ring"
            type="circle"
            filter={["==", ["get", "gardu"], mode === "topgi" && tour.top ? tour.top.gardu : "__none__"]}
            paint={{
              "circle-radius": ["+", 16, ["*", 20, ["sqrt", ["get", "ratio"]]]],
              "circle-color": "transparent",
              "circle-stroke-width": 2,
              "circle-stroke-color": dark ? "#ffffff" : "#0f172a",
              "circle-stroke-opacity": 0.85,
            }}
          />
          {/* angka nilai saat scene fokus (bukan intro) */}
          {mode !== "intro" && (
            <Layer
              id="hero-gi-value"
              type="symbol"
              layout={{
                "text-field": ["to-string", ["get", "value"]],
                "text-size": 10,
                "text-font": ["Open Sans Bold"],
                "text-allow-overlap": true,
              }}
              paint={{
                "text-color": "#ffffff",
                "text-halo-color": "rgba(0,0,0,0.5)",
                "text-halo-width": 1,
              }}
            />
          )}
        </Source>
      </MapGL>

      {/* Metric posisi kamera — kayak asset-maps, buat kalibrasi scene */}
      <div className="pointer-events-none absolute right-5 top-4 z-10 hidden md:block">
        <CameraInfo map={mapInst} />
      </div>

      {/* Caption scene — animated, nempel di bawah metric kamera */}
      <div className="pointer-events-none absolute right-5 top-14 z-10 hidden md:block">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="card px-4 py-3"
          >
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-amber">
              <span className="h-px w-5 bg-amber" />
              {cap.eyebrow}
            </div>
            <div className="mt-1 text-sm font-bold leading-tight">{cap.text}</div>
            <div className="num text-[11px] text-ink-2">{cap.value}</div>
            {/* dot progress scene */}
            <div className="mt-2 flex items-center gap-1">
              {SCENES.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === scene ? "w-4 bg-amber" : "w-1 bg-ink-3/40"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Metric kamera X/Y/Z/P/B/S — pattern persis asset-maps: subscribe langsung
   ke event map dengan rAF throttle, parent TIDAK ikut re-render saat gerak. */
function CameraInfo({ map }: { map: MlMap | null }) {
  const [cam, setCam] = useState({ lng: 0, lat: 0, zoom: 0, pitch: 0, bearing: 0 });
  const scheduled = useRef(false);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      if (scheduled.current) return;
      scheduled.current = true;
      requestAnimationFrame(() => {
        scheduled.current = false;
        const c = map.getCenter();
        setCam({ lng: c.lng, lat: c.lat, zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() });
      });
    };
    map.on("move", update);
    update();
    return () => { map.off("move", update); };
  }, [map]);

  const mpp = (156543.03392 * Math.cos((cam.lat * Math.PI) / 180)) / 2 ** cam.zoom;
  const meters = mpp * 80;
  const scale = meters >= 1000 ? `${Math.round(meters / 1000)} km` : `${Math.round(meters)} m`;

  return (
    <div className="card num flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-[11px]">
      <span className="text-amber">X:{cam.lng.toFixed(3)}</span>
      <span className="text-ink-3/50">|</span>
      <span className="text-amber">Y:{cam.lat.toFixed(3)}</span>
      <span className="text-ink-3/50">|</span>
      <span className="text-amber">Z:{cam.zoom.toFixed(1)}</span>
      <span className="text-ink-3/50">|</span>
      <span className="text-amber">P:{Math.round(cam.pitch)}°</span>
      <span className="text-ink-3/50">|</span>
      <span className="text-amber">B:{Math.round(cam.bearing)}°</span>
      <span className="text-ink-3/50">|</span>
      <span className="text-ink-3">S:{scale}</span>
    </div>
  );
}
