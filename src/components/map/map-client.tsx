"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Layers, Plus, Minus, Maximize2, X, MapPin, ExternalLink, ShieldCheck, Crosshair, MousePointer2, TrendingUp } from "lucide-react";
import { cn, STATUS_META, confidenceBand } from "@/lib/utils";
import { Button, ConfidenceRadial, StatusPill } from "@/components/ui/atoms";
import type { RecordDTO } from "@/lib/queries";

type LeafletMap = import("leaflet").Map;
type LeafletLayer = import("leaflet").Layer;
type LeafletPolygon = import("leaflet").Polygon;
type LeafletMarker = import("leaflet").Marker;

type LayerState = { parcels: boolean; markers: boolean; heat: boolean; labels: boolean; roads: boolean };

const PUNJAB_CENTER: [number, number] = [30.901, 75.857];
const MAP_BOUNDS: [[number, number], [number, number]] = [[29.8, 73.8], [32.7, 77.0]];

const VILLAGE_COORDS: Record<string, [number, number]> = {
  Sahnewal: [30.885, 75.85], Dehlon: [30.78, 75.84], "Kila Raipur": [30.78, 75.73], Ghawaddi: [30.86, 75.73],
  Jodhan: [30.72, 75.72], Verka: [31.66, 74.91], "Kathu Nangal": [31.61, 75.08], "Jandiala Guru": [31.53, 75.05],
  Nabha: [30.37, 76.15], Ghanaur: [30.33, 76.62], Kartarpur: [31.44, 75.5], Adampur: [31.43, 75.72],
  Goniana: [30.58, 74.98], "Rampura Phul": [30.27, 75.24], Kharar: [30.75, 76.65], Zirakpur: [30.64, 76.82],
};

const ROAD_LINES: [number, number][][] = [
  [[30.55, 74.3], [30.75, 75.2], [30.9, 75.85], [31.45, 76.3], [31.8, 76.8]],
  [[30.45, 75.65], [30.8, 75.84], [31.2, 75.7], [31.65, 75.1]],
  [[30.25, 76.1], [30.55, 76.4], [30.8, 76.65], [31.05, 76.85]],
];

function recordPosition(rec: RecordDTO, index: number): [number, number] {
  const base = VILLAGE_COORDS[rec.village] ?? [30.9, 75.85];
  const angle = (index * 137.5 * Math.PI) / 180;
  const radius = 0.012 + (index % 3) * 0.006;
  return [base[0] + Math.sin(angle) * radius, base[1] + Math.cos(angle) * radius];
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] ?? char));
}

export function MapClient({ records, focusNo }: { records: RecordDTO[]; focusNo: string | null }) {
  const mapHostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<{ parcels: LeafletLayer[]; markers: LeafletLayer[]; heat: LeafletLayer[]; labels: LeafletLayer[]; roads: LeafletLayer[] }>({ parcels: [], markers: [], heat: [], labels: [], roads: [] });
  const recordLayersRef = useRef(new Map<string, { polygon: LeafletPolygon; marker: LeafletMarker; position: [number, number] }>());
  const [selected, setSelected] = useState<RecordDTO | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerState>({ parcels: true, markers: true, heat: false, labels: true, roads: true });
  const [opacity, setOpacity] = useState(0.85);
  const [q, setQ] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [zoom, setZoom] = useState(8);
  const [cursor, setCursor] = useState<[number, number] | null>(null);

  const positions = useMemo(() => new Map(records.map((record, index) => [record.id, recordPosition(record, index)])), [records]);
  const statusCounts = useMemo(() => records.reduce((map, record) => map.set(record.status, (map.get(record.status) ?? 0) + 1), new Map<string, number>()), [records]);
  const villageCluster = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((record) => map.set(record.village, (map.get(record.village) ?? 0) + 1));
    return [...map.entries()];
  }, [records]);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? records.filter((record) => `${record.ownerName} ${record.khasraNo} ${record.recordNo} ${record.village}`.toLowerCase().includes(needle)).slice(0, 6) : [];
  }, [q, records]);

  const focusRecord = useCallback((record: RecordDTO) => {
    const item = recordLayersRef.current.get(record.id);
    setSelected(record);
    if (item && mapRef.current) mapRef.current.flyTo(item.position, 15, { duration: 0.8 });
  }, []);

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !mapHostRef.current || mapRef.current) return;
      const map = L.map(mapHostRef.current, { zoomControl: false, attributionControl: true, maxBounds: MAP_BOUNDS, minZoom: 7, maxZoom: 18 }).setView(PUNJAB_CENTER, 8);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
      map.on("zoomend", () => setZoom(map.getZoom()));
      map.on("mousemove", (event) => setCursor([event.latlng.lat, event.latlng.lng]));
      map.on("mouseout", () => setCursor(null));
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);
    });
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      const map = mapRef.current;
      if (disposed || !map) return;
      Object.values(layersRef.current).flat().forEach((layer) => layer.removeFrom(map));
      layersRef.current = { parcels: [], markers: [], heat: [], labels: [], roads: [] };
      recordLayersRef.current.clear();

      const roads = ROAD_LINES.map((line) => L.polyline(line, { color: "#64748b", opacity: 0.38, weight: 3, dashArray: "8 10" }).addTo(map));
      layersRef.current.roads.push(...roads);

      villageCluster.forEach(([village, count]) => {
        const position = VILLAGE_COORDS[village] ?? PUNJAB_CENTER;
        const radius = 9000 + count * 2500;
        const heat = L.circle(position, { radius, color: "#10b981", fillColor: "#10b981", fillOpacity: 0.08, weight: 1, opacity: 0.25 });
        layersRef.current.heat.push(heat);
        const label = L.marker(position, { interactive: false, icon: L.divIcon({ className: "bhulekh-map-label", html: `<span>${escapeHtml(village)}</span>`, iconSize: [120, 20], iconAnchor: [60, 10] }) });
        layersRef.current.labels.push(label);
      });

      records.forEach((record) => {
        const position = positions.get(record.id) ?? PUNJAB_CENTER;
        const meta = STATUS_META[record.status] ?? STATUS_META.pending;
        const polygon = L.polygon([
          [position[0] - 0.006, position[1] - 0.008], [position[0] + 0.004, position[1] - 0.009],
          [position[0] + 0.007, position[1] + 0.005], [position[0] - 0.004, position[1] + 0.008],
        ], { color: meta.color, fillColor: meta.color, fillOpacity: opacity * 0.45, weight: 1.5 });
        polygon.on("click", () => setSelected(record));
        polygon.on("mouseover", () => { setHovered(record.id); polygon.setStyle({ weight: 3, fillOpacity: Math.min(0.75, opacity) }); });
        polygon.on("mouseout", () => { setHovered(null); polygon.setStyle({ weight: 1.5, fillOpacity: opacity * 0.45 }); });
        const marker = L.marker(position, { icon: L.divIcon({ className: "bhulekh-map-marker", html: `<span style="--marker-color:${meta.color}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] }) });
        marker.bindTooltip(`${escapeHtml(record.recordNo)} · ${escapeHtml(record.ownerName)}`, { direction: "top", offset: [0, -8] });
        marker.on("click", () => setSelected(record));
        recordLayersRef.current.set(record.id, { polygon, marker, position });
        layersRef.current.parcels.push(polygon);
        layersRef.current.markers.push(marker);
      });
      syncLayers(map, layers, layersRef.current);
    });
    return () => { disposed = true; };
  }, [layers, opacity, positions, records, villageCluster]);

  useEffect(() => {
    const record = focusNo ? records.find((item) => item.recordNo === focusNo) : null;
    if (!record) return;
    const focusTimer = setTimeout(() => focusRecord(record), 0);
    return () => clearTimeout(focusTimer);
  }, [focusNo, records, focusRecord]);

  function toggleLayer(key: keyof LayerState) {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  }

  function fit() { mapRef.current?.fitBounds(MAP_BOUNDS, { padding: [24, 24] }); }
  function zoomBy(amount: number) { mapRef.current?.setZoom((mapRef.current.getZoom() ?? 8) + amount); }

  return (
    <div className="flex h-[calc(100dvh-56px-26px)] flex-col md:h-[calc(100dvh-56px-33px)]">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div><h1 className="text-lg font-bold tracking-tight md:text-xl">Cadastral GIS</h1><p className="text-xs text-muted"><span className="tabular text-secondary">{records.length}</span> parcels · Punjab circle</p></div>
        <div className="flex items-center gap-2 text-[10.5px] text-muted"><MousePointer2 size={12} /> pan to move · scroll to zoom</div>
      </div>

      <div className="relative mx-4 mb-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-(--border-subtle) bg-[#0b0e14] md:mx-6 md:mb-5">
        <div ref={mapHostRef} className="absolute inset-0 z-0" />
        <div className="pointer-events-none absolute inset-0 z-[400] bg-gradient-to-b from-[#0b0e14]/20 via-transparent to-[#0b0e14]/10" />

        <div className="absolute left-3 top-3 z-[500] w-[min(78vw,320px)]">
          <div className="glass-strong flex items-center gap-2 rounded-xl px-3 py-2.5"><Search size={14} className="shrink-0 text-muted" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search khasra, owner, village…" className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted" />{q && <button onClick={() => setQ("")} className="text-muted hover:text-current"><X size={13} /></button>}</div>
          <AnimatePresence>{results.length > 0 && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="glass-strong mt-2 overflow-hidden rounded-xl">{results.map((record) => <button key={record.id} onClick={() => { focusRecord(record); setQ(""); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-(--accent-soft)"><MapPin size={13} style={{ color: STATUS_META[record.status]?.color }} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{record.ownerName} · <span className="tabular">{record.khasraNo}</span></span><span className="block truncate text-[10px] text-muted">{record.village}, {record.district}</span></span><span className="tabular text-[10px] text-muted">{record.recordNo}</span></button>)}</motion.div>}</AnimatePresence>
        </div>

        <div className="absolute left-3 top-20 z-[500] flex flex-col gap-1.5"><button onClick={() => zoomBy(1)} title="Zoom in" className="glass-strong flex size-9 items-center justify-center rounded-xl text-secondary hover:text-current"><Plus size={15} /></button><button onClick={() => zoomBy(-1)} title="Zoom out" className="glass-strong flex size-9 items-center justify-center rounded-xl text-secondary hover:text-current"><Minus size={15} /></button><button onClick={fit} title="Fit view" className="glass-strong flex size-9 items-center justify-center rounded-xl text-secondary hover:text-current"><Maximize2 size={15} /></button></div>

        <div className="absolute right-3 top-3 z-[500] w-52">{!panelOpen ? <button onClick={() => setPanelOpen(true)} className="glass-strong flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium text-secondary hover:text-current"><span className="flex items-center gap-2"><Layers size={14} /> Map layers</span><ChevronDownIcon /></button> : <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-xl p-3.5"><div className="mb-2.5 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold"><Layers size={13} /> Map layers</span><button onClick={() => setPanelOpen(false)} className="text-muted hover:text-current"><X size={14} /></button></div>{([['parcels', 'Parcel boundaries', records.length], ['markers', 'Record markers', records.length], ['heat', 'Density heatmap', villageCluster.length], ['roads', 'Road network', ROAD_LINES.length], ['labels', 'Village labels', villageCluster.length]] as const).map(([key, label, count]) => <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-xs text-secondary hover:bg-white/4"><input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} className="size-3.5 rounded accent-(--accent)" /><span className="flex-1">{label}</span><span className="tabular text-[10px] text-muted">{count}</span></label>)}<div className="mt-2.5 border-t border-(--border-subtle) pt-2.5"><div className="mb-1 flex justify-between text-[10px] text-muted"><span>Parcel opacity</span><span className="tabular">{Math.round(opacity * 100)}%</span></div><input type="range" min={30} max={100} value={opacity * 100} onChange={(event) => setOpacity(Number(event.target.value) / 100)} className="w-full" /></div></motion.div>}</div>

        <div className="glass-strong absolute bottom-3 left-3 z-[500] hidden rounded-xl px-3.5 py-2.5 sm:block"><div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">Legend</div><div className="flex flex-wrap gap-x-4 gap-y-1">{Object.entries(STATUS_META).map(([key, meta]) => <span key={key} className="flex items-center gap-1.5 text-[10px] text-secondary"><span className="size-2 rounded-[3px]" style={{ background: meta.color, opacity: 0.85 }} />{meta.label} <span className="tabular text-muted">{statusCounts.get(key) ?? 0}</span></span>)}</div></div>
        <div className="glass-strong tabular absolute bottom-3 right-3 z-[500] hidden rounded-lg px-2.5 py-1.5 text-[10px] text-muted md:block">{cursor ? `${cursor[0].toFixed(5)}° N, ${cursor[1].toFixed(5)}° E` : "30.9000° N, 75.8500° E"} · zoom {zoom}×</div>

        <AnimatePresence>{selected && <motion.div key={selected.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} className="glass-strong card-shine absolute bottom-3 left-3 right-3 z-[600] w-auto rounded-2xl p-4 sm:bottom-auto sm:left-auto sm:right-3 sm:top-24 sm:w-80"><button onClick={() => setSelected(null)} className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:bg-white/6 hover:text-current" aria-label="Close"><X size={14} /></button><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"><Crosshair size={11} className="accent-text" /> Parcel {selected.khasraNo}</div><div className="tabular mt-1.5 text-[15px] font-bold tracking-tight">{selected.recordNo}</div><div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">{[["Owner", selected.ownerName], ["Father", selected.fatherName ?? "—"], ["Area", `${selected.areaValue} ${selected.areaUnit}`], ["Land type", selected.landType], ["Village", selected.village], ["District", selected.district]].map(([key, value]) => <div key={key}><div className="text-[9.5px] uppercase tracking-wide text-muted">{key}</div><div className="mt-0.5 truncate font-medium capitalize">{value}</div></div>)}</div><div className="mt-3 flex items-center justify-between gap-2"><StatusPill status={selected.status} /><div className="flex items-center gap-1.5"><ConfidenceRadial value={selected.confidence} size={30} stroke={3} /><span className="text-[10px]" style={{ color: confidenceBand(selected.confidence).color }}>{confidenceBand(selected.confidence).label}</span></div></div><div className="mt-3.5 flex gap-2"><Link href={`/records/${selected.recordNo}`} className="flex-1"><Button variant="primary" size="sm" className="w-full"><ExternalLink size={13} /> Open record</Button></Link></div></motion.div>}</AnimatePresence>

        <div className="absolute bottom-14 left-3 z-[500] hidden items-center gap-3 md:flex"><div className="glass-strong flex items-center gap-2 rounded-xl px-3 py-2"><TrendingUp size={13} className="accent-text" /><span className="text-[11px] text-secondary"><span className="tabular font-semibold">{records.filter((record) => record.status === "verified").length}</span> verified parcels on map</span></div></div>
        {selected && selected.status !== "verified" && <QuickVerify rec={selected} onDone={(record) => setSelected(record)} />}
      </div>
    </div>
  );
}

function syncLayers(map: LeafletMap, state: LayerState, layers: { parcels: LeafletLayer[]; markers: LeafletLayer[]; heat: LeafletLayer[]; labels: LeafletLayer[]; roads: LeafletLayer[] }) {
  (Object.keys(state) as (keyof LayerState)[]).forEach((key) => layers[key].forEach((layer) => state[key] ? layer.addTo(map) : layer.removeFrom(map)));
}

function ChevronDownIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>; }

function QuickVerify({ rec, onDone }: { rec: RecordDTO; onDone: (record: RecordDTO) => void }) {
  const [busy, setBusy] = useState(false);
  return <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} disabled={busy} onClick={async () => { setBusy(true); const res = await fetch(`/api/records/${rec.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify" }) }); if (res.ok) onDone((await res.json()).record); setBusy(false); }} className="glass-strong absolute bottom-[92px] right-3 z-[700] flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15 sm:bottom-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2"><ShieldCheck size={14} /> {busy ? "Verifying…" : `Verify ${rec.khasraNo} inline`}</motion.button>;
}
