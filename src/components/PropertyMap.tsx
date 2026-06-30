import { useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Rectangle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { Link } from "@tanstack/react-router";

const defaultIcon = L.divIcon({
  className: "aqari-marker",
  html: `<div style="background:var(--color-primary,#FF385C);color:white;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 10px rgba(0,0,0,.25);display:grid;place-items:center;border:3px solid white;"><div style="transform:rotate(45deg);width:8px;height:8px;background:white;border-radius:50%;"></div></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.setView(points[0], 14); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [points, map]);
  return null;
}

export type DrawnBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

function DrawControl({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete: (b: DrawnBounds) => void;
}) {
  const map = useMap();
  const drawing = useRef(false);
  const startRef = useRef<L.LatLng | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);
  const stableComplete = useRef(onComplete);
  stableComplete.current = onComplete;

  useEffect(() => {
    if (!active) return;
    const container = map.getContainer();
    container.style.cursor = "crosshair";
    map.dragging.disable();
    map.scrollWheelZoom.disable();

    function onDown(e: MouseEvent) {
      drawing.current = true;
      const p = map.containerPointToLatLng(L.point(e.offsetX, e.offsetY));
      startRef.current = p;
      if (rectRef.current) { map.removeLayer(rectRef.current); rectRef.current = null; }
      rectRef.current = L.rectangle([p, p], {
        color: "#FF385C",
        weight: 2,
        dashArray: "6 4",
        fillColor: "#FF385C",
        fillOpacity: 0.1,
      }).addTo(map);
    }

    function onMove(e: MouseEvent) {
      if (!drawing.current || !startRef.current || !rectRef.current) return;
      const p = map.containerPointToLatLng(L.point(e.offsetX, e.offsetY));
      rectRef.current.setBounds(L.latLngBounds(startRef.current, p));
    }

    function onUp(e: MouseEvent) {
      if (!drawing.current || !startRef.current) return;
      drawing.current = false;
      const p = map.containerPointToLatLng(L.point(e.offsetX, e.offsetY));
      const b = L.latLngBounds(startRef.current, p);
      if (b.isValid() && Math.abs(b.getNorth() - b.getSouth()) > 0.001) {
        stableComplete.current({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      }
      startRef.current = null;
    }

    container.addEventListener("mousedown", onDown);
    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseup", onUp);

    return () => {
      container.style.cursor = "";
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      container.removeEventListener("mousedown", onDown);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseup", onUp);
      if (rectRef.current) { map.removeLayer(rectRef.current); rectRef.current = null; }
    };
  }, [active, map]);

  return null;
}

export interface PropertyMapProps {
  properties: Property[];
  height?: string;
  singleMode?: boolean;
  drawMode?: boolean;
  drawnBounds?: DrawnBounds | null;
  onDrawComplete?: (b: DrawnBounds) => void;
}

export function PropertyMap({
  properties,
  height = "100%",
  singleMode,
  drawMode,
  drawnBounds,
  onDrawComplete,
}: PropertyMapProps) {
  const points = properties.map((p) => [p.lat, p.lng] as [number, number]);
  const center: [number, number] = points[0] || [31.9038, 35.2034];

  const handleDrawComplete = useCallback(
    (b: DrawnBounds) => { onDrawComplete?.(b); },
    [onDrawComplete],
  );

  return (
    <div style={{ height, width: "100%" }} className="relative overflow-hidden rounded-2xl border border-border">
      {drawMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg pointer-events-none select-none">
          اسحب على الخريطة لتحديد المنطقة
        </div>
      )}
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={!singleMode && !drawMode}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <DrawControl active={!!drawMode} onComplete={handleDrawComplete} />
        {drawnBounds && (
          <Rectangle
            bounds={[
              [drawnBounds.south, drawnBounds.west],
              [drawnBounds.north, drawnBounds.east],
            ]}
            pathOptions={{
              color: "#FF385C",
              weight: 2.5,
              dashArray: "6 4",
              fillColor: "#FF385C",
              fillOpacity: 0.08,
            }}
          />
        )}
        {properties.map((p) =>
          p.hideExactLocation ? (
            <Circle
              key={p.id}
              center={[p.lat, p.lng]}
              radius={400}
              pathOptions={{ color: "#FF385C", fillColor: "#FF385C", fillOpacity: 0.15 }}
            >
              <Popup>
                <strong>{p.title}</strong><br />موقع تقريبي
              </Popup>
            </Circle>
          ) : (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={defaultIcon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ color: "#FF385C", fontWeight: 800, marginBottom: 6 }}>
                    {formatPrice(p.price)}{p.listingType === "rent" ? " / شهر" : ""}
                  </div>
                  <Link to="/property/$id" params={{ id: p.id }} style={{ color: "#FF385C", fontWeight: 600 }}>
                    عرض التفاصيل ←
                  </Link>
                </div>
              </Popup>
            </Marker>
          ),
        )}
      </MapContainer>
    </div>
  );
}
