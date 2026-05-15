import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "wouter";
import { RecoveryService } from "@/types/recovery-service";

// Fix Leaflet's default-icon paths for bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface ServicesMapProps {
  services: RecoveryService[];
}

function FitBounds({ markers }: { markers: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView(markers[0], 11);
    } else {
      map.fitBounds(markers, { padding: [40, 40] });
    }
  }, [markers, map]);
  return null;
}

export default function ServicesMap({ services }: ServicesMapProps) {
  // Flatten all geocoded locations
  type Pin = { service: RecoveryService; lat: number; lng: number; locIdx: number };
  const pins: Pin[] = [];
  services.forEach((s) => {
    s.locations.forEach((loc, locIdx) => {
      if (typeof loc.latitude === "number" && typeof loc.longitude === "number") {
        pins.push({ service: s, lat: loc.latitude, lng: loc.longitude, locIdx });
      }
    });
  });

  const markers: [number, number][] = pins.map((p) => [p.lat, p.lng]);

  if (pins.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] rounded-md border bg-muted/30 text-secondary text-sm">
        No mappable locations for these results. Try adding coordinates in the admin panel.
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden border h-[500px]" data-testid="services-map">
      <MapContainer
        center={markers[0]}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markers={markers} />
        {pins.map((p, i) => (
          <Marker key={`${p.service.id}-${p.locIdx}-${i}`} position={[p.lat, p.lng]}>
            <Popup>
              <div className="text-sm space-y-1">
                <div className="font-semibold">{p.service.name}</div>
                <div className="text-xs text-muted-foreground">{p.service.category}</div>
                <div className="text-xs">
                  {p.service.locations[p.locIdx].address}
                  <br />
                  {p.service.locations[p.locIdx].city}, {p.service.locations[p.locIdx].state}
                </div>
                <Link
                  href={`/recovery-services/${p.service.id}`}
                  className="text-primary underline text-xs inline-block mt-1"
                >
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
