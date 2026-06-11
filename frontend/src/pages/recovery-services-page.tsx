import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Loader2,
  MapPin,
  Tag,
  Phone,
  Globe,
  Lock,
  List as ListIcon,
  Map as MapIcon,
  Search,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "@/components/layout/breadcrumbs";
import ServicesMap from "@/components/recovery/services-map";
import FeaturedProvidersGrid from "@/components/recovery/featured-providers-grid";
import { useAuth } from "@/hooks/use-auth";
import { RecoveryService, RECOVERY_CATEGORIES } from "@/types/recovery-service";

const ANY = "__any__";

export default function RecoveryServicesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<"list" | "map">("list");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>(ANY);
  const [state, setStateFilter] = useState<string>(ANY);
  const [city, setCity] = useState<string>(ANY);

  const { data: services = [], isLoading } = useQuery<RecoveryService[]>({
    queryKey: ["/api/recovery-services"],
    enabled: !!user, // Only fetch once user is loaded
  });

  // Build dynamic filter options from data
  const { states, citiesByState } = useMemo(() => {
    const states = new Set<string>();
    const citiesByState: Record<string, Set<string>> = {};
    services.forEach((s) =>
      s.locations.forEach((loc) => {
        if (loc.state) {
          states.add(loc.state);
          if (!citiesByState[loc.state]) citiesByState[loc.state] = new Set();
          if (loc.city) citiesByState[loc.state].add(loc.city);
        }
      })
    );
    return { states: [...states].sort(), citiesByState };
  }, [services]);

  const cityOptions = state !== ANY ? [...(citiesByState[state] || [])].sort() : [];

  // Client-side filtering (server returns published, we further narrow)
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return services.filter((s) => {
      if (category !== ANY && s.category !== category) return false;
      if (state !== ANY) {
        const matchState = s.locations.some(
          (l) => l.state === state && (city === ANY || l.city === city)
        );
        if (!matchState) return false;
      }
      if (ql) {
        const hay = `${s.name} ${s.description} ${s.category}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [services, q, category, state, city]);

  if (authLoading) {
    return (
      <div className="container mx-auto py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-16 max-w-2xl text-center">
        <Breadcrumbs items={[{ label: "Exercise, Injury & Performance Recovery Services" }]} />
        <h1 className="text-3xl font-montserrat font-bold text-primary mb-3">
          Sign in to browse local Exercise, Injury & Performance Recovery Services
        </h1>
        <p className="text-secondary mb-6">
          Our directory of clinical recovery businesses is available to Active Recovery 360 members.
        </p>
        <Button asChild size="lg">
          <Link href="/auth">Sign in or Register</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4" data-testid="recovery-services-page">
      <Breadcrumbs items={[{ label: "Exercise, Injury & Performance Recovery Services" }]} />

      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-montserrat font-bold text-primary mb-2">
          Local Exercise, Injury & Performance Recovery Services
        </h1>
        <p className="text-secondary">
          Clinical recovery providers offering exclusive discounts to Active Recovery 360 members.
        </p>
      </header>

      {/* Demo provider showcase grid */}
      <FeaturedProvidersGrid />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
        <div className="md:col-span-4 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, category, or keyword"
            className="pl-9"
            data-testid="search-input"
          />
        </div>
        <div className="md:col-span-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="category-filter">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All categories</SelectItem>
              {RECOVERY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select
            value={state}
            onValueChange={(v) => {
              setStateFilter(v);
              setCity(ANY);
            }}
          >
            <SelectTrigger data-testid="state-filter">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All states</SelectItem>
              {states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Select value={city} onValueChange={setCity} disabled={state === ANY}>
            <SelectTrigger data-testid="city-filter">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All cities</SelectItem>
              {cityOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-secondary">
          {filtered.length} {filtered.length === 1 ? "service" : "services"}
        </p>
        <div className="inline-flex rounded-md border overflow-hidden">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm inline-flex items-center gap-1.5 ${
              view === "list" ? "bg-primary text-white" : "bg-background"
            }`}
            data-testid="view-list-btn"
          >
            <ListIcon className="h-4 w-4" /> List
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={`px-3 py-1.5 text-sm inline-flex items-center gap-1.5 ${
              view === "map" ? "bg-primary text-white" : "bg-background"
            }`}
            data-testid="view-map-btn"
          >
            <MapIcon className="h-4 w-4" /> Map
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-secondary">
          No services match your filters yet.
        </div>
      ) : view === "map" ? (
        <ServicesMap services={filtered} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:shadow-lg transition-shadow flex flex-col">
              {s.photoUrl && (
                <img
                  src={s.photoUrl}
                  alt={s.name}
                  className="h-40 w-full object-cover rounded-t"
                />
              )}
              <CardContent className="pt-5 flex-1 flex flex-col">
                <div className="flex items-start gap-2 mb-2">
                  {s.logoUrl && (
                    <img
                      src={s.logoUrl}
                      alt=""
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg leading-snug">{s.name}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {s.category}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-secondary line-clamp-3 mb-3">{s.description}</p>

                {/* Locations */}
                {s.locations[0] && (
                  <div className="text-xs text-secondary flex items-start gap-1.5 mb-3">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      {s.locations[0].city}, {s.locations[0].state}
                      {s.locations.length > 1 && ` +${s.locations.length - 1} more`}
                    </span>
                  </div>
                )}

                {/* Discount */}
                <div className="mt-auto rounded-md bg-primary/5 border border-primary/20 p-2 mb-3 text-xs">
                  {s.memberDiscount?.locked ? (
                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                      <Lock className="h-3 w-3" />
                      Member discount available — join Active Recovery 360 to unlock
                    </span>
                  ) : s.memberDiscount?.text ? (
                    <span className="text-primary font-semibold">
                      🎁 Member offer: {s.memberDiscount.text}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No member offer listed</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1" size="sm">
                    <Link href={`/recovery-services/${s.id}`}>View Details</Link>
                  </Button>
                  {s.phone && (
                    <Button asChild variant="outline" size="sm">
                      <a href={`tel:${s.phone}`} aria-label="Call">
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {s.website && (
                    <Button asChild variant="outline" size="sm">
                      <a href={s.website} target="_blank" rel="noopener noreferrer" aria-label="Website">
                        <Globe className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
