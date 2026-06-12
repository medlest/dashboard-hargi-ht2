"use client";

import { useMemo, useRef, useState } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GiPoint } from "./asset-maps-view";
import type { MapLayerMouseEvent, MapRef, ViewStateChangeEvent } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";

const SEVERITY = { low: "#10b981", mid: "#f59e0b", high: "#ef4444" };

export type MapColorMode = "intensitas" | "upt";
export type MapStyleKey = "dark" | "light" | "satellite" | "osm";

const GLYPHS = "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf";

// View default (hasil kalibrasi user via CameraInfo) — dipakai intro + Reset View
export const HOME_VIEW = {
  center: [109.64, -6.831] as [number, number],
  zoom: 7.3,
  pitch: 53,
  bearing: 0,
};

function rasterStyle(name: string, tiles: string[], attribution: string): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: { [name]: { type: "raster", tiles, tileSize: 256, attribution } },
    layers: [{ id: name, type: "raster", source: name }],
  };
}

// Basemap = persis dashboard utama (useMapGL.ts): raster Carto @2x + ESRI + OSM
export const MAP_STYLES: Record<MapStyleKey, { label: string; style: string | StyleSpecification }> = {
  dark: {
    label: "Dark",
    style: rasterStyle(
      "carto-dark",
      ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
      "© CARTO © OpenStreetMap contributors",
    ),
  },
  light: {
    label: "Light",
    style: rasterStyle(
      "carto-light",
      ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
      "© CARTO © OpenStreetMap contributors",
    ),
  },
  satellite: {
    label: "Satellite",
    style: rasterStyle(
      "esri-sat",
      ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      "Esri, Maxar, Earthstar Geographics",
    ),
  },
  osm: {
    label: "OSM",
    style: rasterStyle(
      "osm",
      ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      "© OpenStreetMap contributors",
    ),
  },
};

export function GiMap({
  points,
  styleKey = "dark",
  colorMode = "intensitas",
  unitColors = {},
  showGi = true,
  showLabels = true,
  selectedGardu = null,
  onSelect,
  onMapRef,
  onMove,
}: {
  points: GiPoint[];
  styleKey?: MapStyleKey;
  colorMode?: MapColorMode;
  unitColors?: Record<string, string>;
  showGi?: boolean;
  showLabels?: boolean;
  selectedGardu?: string | null;
  onSelect?: (p: GiPoint | null) => void;
  onMapRef?: (ref: MapRef | null) => void;
  onMove?: (e: ViewStateChangeEvent) => void;
}) {
  const [cursor, setCursor] = useState<string>("grab");
  const firstLoad = useRef(true);
  const max = Math.max(...points.map((p) => p.total), 1);
  const darkText = styleKey === "light"; // teks gelap cuma di basemap terang polos

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [...points].sort((a, b) => a.total - b.total).map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: {
          gardu: p.gardu,
          // "GI 150KV CIKARANG" → "CIKARANG" (label pendek di peta)
          nama: p.gardu.replace(/^GIS?T?\s*\d+\s*KV\s*/i, ""),
          total: p.total,
          color:
            colorMode === "upt"
              ? (unitColors[p.unit] ?? "#94a3b8")
              : p.total / max > 0.67
                ? SEVERITY.high
                : p.total / max > 0.34
                  ? SEVERITY.mid
                  : SEVERITY.low,
          ratio: p.total / max,
        },
      })),
    }),
    [points, max, colorMode, unitColors],
  );

  function onClick(e: MapLayerMouseEvent) {
    const f = e.features?.[0];
    if (!f) {
      onSelect?.(null);
      return;
    }
    onSelect?.(points.find((x) => x.gardu === f.properties?.gardu) ?? null);
  }

  return (
    <Map
      ref={onMapRef}
      initialViewState={{ longitude: 109.5, latitude: -4.8, zoom: 4.8, bearing: -20 }}
      onLoad={(e) => {
        // Intro animation first load — persis behaviour StandardMap dashboard utama
        if (!firstLoad.current) return;
        firstLoad.current = false;
        setTimeout(() => {
          e.target.flyTo({ ...HOME_VIEW, duration: 3000, essential: true });
        }, 300);
      }}
      mapStyle={MAP_STYLES[styleKey].style}
      interactiveLayerIds={showGi ? ["gi-circles"] : []}
      onClick={onClick}
      onMove={onMove}
      onMouseEnter={() => setCursor("pointer")}
      onMouseLeave={() => setCursor("grab")}
      cursor={cursor}
      attributionControl={{ compact: true }}
      style={{ width: "100%", height: "100%" }}
    >
      {showGi && (
        <Source id="gi" type="geojson" data={geojson}>
          {/* halo glow */}
          <Layer
            id="gi-glow"
            type="circle"
            layout={{ "circle-sort-key": ["get", "total"] }}
            paint={{
              "circle-radius": ["+", 12, ["*", 26, ["sqrt", ["get", "ratio"]]]],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.14,
              "circle-blur": 0.7,
            }}
          />
          {/* ring luar (severity) */}
          <Layer
            id="gi-ring"
            type="circle"
            layout={{ "circle-sort-key": ["get", "total"] }}
            paint={{
              "circle-radius": ["+", 6, ["*", 18, ["sqrt", ["get", "ratio"]]]],
              "circle-color": "transparent",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": ["get", "color"],
              "circle-stroke-opacity": 0.9,
            }}
          />
          {/* core */}
          <Layer
            id="gi-circles"
            type="circle"
            layout={{ "circle-sort-key": ["get", "total"] }}
            paint={{
              "circle-radius": ["+", 4, ["*", 16, ["sqrt", ["get", "ratio"]]]],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.5,
            }}
          />
          {/* highlight GI terpilih — ring putih tebal */}
          <Layer
            id="gi-selected"
            type="circle"
            filter={["==", ["get", "gardu"], selectedGardu ?? "__none__"]}
            paint={{
              "circle-radius": ["+", 10, ["*", 20, ["sqrt", ["get", "ratio"]]]],
              "circle-color": "transparent",
              "circle-stroke-width": 2.5,
              "circle-stroke-color": darkText ? "#0f172a" : "#ffffff",
            }}
          />
          {/* angka gangguan */}
          {showLabels && (
            <Layer
              id="gi-count"
              type="symbol"
              layout={{
                "symbol-sort-key": ["-", 0, ["get", "total"]],
                "text-field": ["to-string", ["get", "total"]],
                "text-size": 10,
                "text-font": ["Open Sans Bold"],
                "text-allow-overlap": true,
              }}
              paint={{
                "text-color": darkText ? "#0f172a" : "#ffffff",
                "text-halo-color": darkText ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.45)",
                "text-halo-width": 1,
              }}
            />
          )}
          {/* nama GI — muncul saat zoom dekat */}
          {showLabels && (
            <Layer
              id="gi-name"
              type="symbol"
              minzoom={8.5}
              layout={{
                "symbol-sort-key": ["-", 0, ["get", "total"]],
                "text-field": ["get", "nama"],
                "text-size": 10,
                "text-font": ["Open Sans Bold"],
                "text-offset": [0, 1.9],
                "text-anchor": "top",
                "text-letter-spacing": 0.05,
                "text-transform": "uppercase",
              }}
              paint={{
                "text-color": darkText ? "#1e293b" : "#e2e8f0",
                "text-halo-color": darkText ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.65)",
                "text-halo-width": 1.2,
              }}
            />
          )}
        </Source>
      )}
    </Map>
  );
}
