import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Loader2, MapPin, Phone, Mail, Globe, Clock, Lock, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "@/components/layout/breadcrumbs";
import { RecoveryService } from "@/types/recovery-service";

export default function RecoveryServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const { data: service, isLoading, error } = useQuery<RecoveryService>({
    queryKey: [`/api/recovery-services/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="text-2xl font-montserrat font-bold text-primary mb-3">
          Service not found
        </h1>
        <Button asChild variant="outline">
          <Link href="/recovery-services">Back to directory</Link>
        </Button>
      </div>
    );
  }

  const firstLoc = service.locations[0];
  const mapPin =
    firstLoc && firstLoc.latitude && firstLoc.longitude
      ? ([firstLoc.latitude, firstLoc.longitude] as [number, number])
      : null;

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <Breadcrumbs
        items={[
          { label: "Recovery Services", href: "/recovery-services" },
          { label: service.name },
        ]}
      />

      {service.photoUrl && (
        <img
          src={service.photoUrl}
          alt={service.name}
          className="w-full h-56 sm:h-72 object-cover rounded-lg mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-start gap-4 mb-4">
            {service.logoUrl && (
              <img
                src={service.logoUrl}
                alt={service.name}
                className="h-16 w-16 rounded-md object-cover border"
              />
            )}
            <div>
              <h1 className="text-3xl font-montserrat font-bold text-primary">
                {service.name}
              </h1>
              <Badge variant="outline" className="mt-2">
                <Tag className="h-3 w-3 mr-1" />
                {service.category}
              </Badge>
            </div>
          </div>

          <p className="text-base text-secondary whitespace-pre-line mb-6">
            {service.description}
          </p>

          {/* Discount card */}
          <Card className="mb-6 border-primary/40 bg-primary/5">
            <CardContent className="pt-5">
              {service.memberDiscount?.locked ? (
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-primary">
                      AR360 Member Discount Available
                    </p>
                    <p className="text-sm text-secondary mb-3">
                      Members receive exclusive savings at this provider.
                    </p>
                    <Button asChild size="sm">
                      <Link href="/membership">Become a Member to Unlock</Link>
                    </Button>
                  </div>
                </div>
              ) : service.memberDiscount?.text ? (
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-primary/80 mb-1">
                    Member Discount
                  </p>
                  <p className="text-lg font-semibold text-primary">
                    🎁 {service.memberDiscount.text}
                  </p>
                  <p className="text-xs text-secondary mt-2">
                    Show your AR360 member status to redeem.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-secondary">No member discount listed.</p>
              )}
            </CardContent>
          </Card>

          {/* Locations */}
          <h2 className="text-xl font-montserrat font-bold text-primary mb-3">
            {service.locations.length > 1 ? "Locations" : "Location"}
          </h2>
          <div className="space-y-4">
            {service.locations.map((loc, idx) => (
              <Card key={idx}>
                <CardContent className="pt-5 space-y-2 text-sm">
                  {loc.name && <p className="font-semibold">{loc.name}</p>}
                  <p className="text-secondary flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {loc.address}
                      <br />
                      {loc.city}, {loc.state} {loc.zipCode}
                    </span>
                  </p>
                  {loc.phone && (
                    <p className="text-secondary flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${loc.phone}`} className="hover:text-primary">
                        {loc.phone}
                      </a>
                    </p>
                  )}
                  {loc.hours && (
                    <p className="text-secondary flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5" />
                      <span className="whitespace-pre-line">{loc.hours}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside>
          <Card className="sticky top-20">
            <CardContent className="pt-5 space-y-3">
              <h3 className="font-semibold">Contact</h3>
              {service.phone && (
                <a
                  href={`tel:${service.phone}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Phone className="h-4 w-4" /> {service.phone}
                </a>
              )}
              {service.email && (
                <a
                  href={`mailto:${service.email}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Mail className="h-4 w-4" /> {service.email}
                </a>
              )}
              {service.website && (
                <a
                  href={service.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary break-all"
                >
                  <Globe className="h-4 w-4 flex-shrink-0" /> {service.website}
                </a>
              )}
            </CardContent>
          </Card>

          {hasMounted && mapPin && (
            <div className="rounded-md overflow-hidden border h-64 mt-4">
              <MapContainer
                center={mapPin}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={mapPin}>
                  <Popup>{service.name}</Popup>
                </Marker>
              </MapContainer>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
