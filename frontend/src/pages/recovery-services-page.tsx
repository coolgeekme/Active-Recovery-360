import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  Check,
  Compass,
  Dumbbell,
  HeartPulse,
  Loader2,
  MapPin,
  Phone,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Tag,
  Globe,
  Lock,
  List as ListIcon,
  Map as MapIcon,
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

const DIRECTORY_CATEGORIES = [
  {
    icon: Activity,
    title: "Sports Recovery Clinics",
    description:
      "Find specialists offering advanced recovery therapies for athletes and active individuals.",
    listLabel: "Services may include:",
    items: [
      "Muscle recovery therapy",
      "Compression recovery",
      "Assisted stretching",
      "Percussion therapy",
      "Athletic recovery programs",
      "Performance optimization",
    ],
  },
  {
    icon: HeartPulse,
    title: "Injury Recovery & Rehabilitation",
    description:
      "Connect with providers focused on exercise-related injury recovery and mobility restoration.",
    listLabel: "Common conditions treated:",
    items: [
      "Back pain",
      "Knee pain",
      "Shoulder injuries",
      "Tendonitis",
      "Muscle strains",
      "Joint stiffness",
    ],
  },
  {
    icon: Dumbbell,
    title: "Mobility & Flexibility Specialists",
    description:
      "Improve movement quality, flexibility, posture, and recovery through guided mobility programs.",
    listLabel: "Services may include:",
    items: [
      "Corrective exercise",
      "Stretch therapy",
      "Mobility coaching",
      "Functional movement assessments",
      "Recovery exercise programs",
    ],
  },
  {
    icon: Sparkles,
    title: "Wellness & Recovery Centers",
    description:
      "Discover local wellness providers offering holistic recovery solutions to support long-term health and active lifestyles.",
    listLabel: "Services may include:",
    items: [
      "Infrared sauna",
      "Cold therapy",
      "Massage recovery",
      "Red light therapy",
      "Recovery lounges",
      "Wellness coaching",
    ],
  },
];

const WHY_USE = [
  {
    icon: Scale,
    title: "Easily Compare Providers",
    description:
      "Quickly find and compare local exercise recovery professionals based on services, specialties, and location.",
  },
  {
    icon: Compass,
    title: "Discover Specialized Recovery Options",
    description:
      "Find providers that match your specific recovery goals, injury concerns, or athletic performance needs.",
  },
  {
    icon: ShieldCheck,
    title: "Support Active Living",
    description:
      "Recovery is essential for staying active, preventing injury, and improving overall wellness.",
  },
];

const POPULAR_SERVICES = [
  "Sports recovery therapy",
  "Exercise rehabilitation",
  "Stretch therapy",
  "Cryotherapy",
  "Compression therapy",
  "Mobility training",
  "Athletic recovery",
  "Performance recovery",
  "Soft tissue therapy",
  "Functional movement coaching",
];

const WHY_SIGN_UP = ["Access to members", "Market your services", "Local customers"];

const EXPOSURE_TIERS = [
  { name: "Silver", detail: "No fee, listing only" },
  { name: "Gold", detail: "Premium listing slot, monthly fee" },
  { name: "Platinum", detail: "Home page listing, member access marketing, service reviews" },
];

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

  return (
    <div className="bg-background" data-testid="recovery-services-page">
      {/* HERO */}
      <section className="relative bg-primary text-white py-16 md:py-20 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-montserrat font-semibold mb-6">
              <MapPin className="h-4 w-4" />
              Local Exercise Recovery Services Directory
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-montserrat font-bold mb-4 tracking-wide">
              Find Trusted Exercise Recovery Specialists Near You
            </h1>
            <p className="text-lg text-white/90 leading-relaxed mb-3">
              Looking for professional exercise recovery services in your area? Our
              directory connects you with local recovery specialists, sports recovery
              clinics, mobility experts, and wellness providers dedicated to helping you
              recover faster, reduce pain, and improve performance.
            </p>
            <p className="text-white/80 leading-relaxed mb-8">
              Whether you are an athlete, active adult, fitness enthusiast, or recovering
              from injury, you can easily discover top-rated recovery providers offering
              personalized services close to home.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="btn-secondary-enhanced font-semibold">
                <a href={user ? "#directory" : "/auth"}>
                  {user ? "Browse the Live Directory" : "Sign In to Browse Providers"}
                </a>
              </Button>
              <Button asChild size="lg" className="bg-primary text-white border-2 border-white hover:bg-white hover:text-primary font-semibold">
                <Link href="/doctors">Become a Provider</Link>
              </Button>
            </div>
          </div>
        </div>
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
      </section>

      {/* Breadcrumbs */}
      <section className="container mx-auto px-4 pt-8">
        <Breadcrumbs items={[{ label: "Recovery Services" }]} />
      </section>

      {/* CATEGORY BLOCKS */}
      <section className="container mx-auto px-4 py-10">
        <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-primary text-center mb-10">
          Local Recovery Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DIRECTORY_CATEGORIES.map((c) => (
            <Card key={c.title} className="border-primary/10 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <c.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-montserrat font-bold text-primary text-lg mb-2">{c.title}</h3>
                <p className="text-secondary text-sm mb-4">{c.description}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {c.listLabel}
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {c.items.map((item) => (
                    <li key={item} className="text-sm text-secondary flex items-start gap-1.5">
                      <Check className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* WHY USE OUR DIRECTORY */}
      <section className="bg-muted/30 py-14 border-y border-primary/10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-primary text-center mb-10">
            Why Use Our Directory?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHY_USE.map((w) => (
              <div key={w.title} className="bg-white rounded-lg shadow p-6 text-center">
                <div className="bg-primary/10 w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4">
                  <w.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-montserrat font-bold text-primary text-lg mb-2">{w.title}</h3>
                <p className="text-secondary text-sm">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR RECOVERY SERVICES */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-primary text-center mb-8">
          Popular Recovery Services
        </h2>
        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {POPULAR_SERVICES.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="px-4 py-2 text-sm border-primary/20 bg-primary/5 text-primary font-medium"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </section>

      {/* PROVIDER SIGN-UP BLUE BOX */}
      <section className="py-0 bg-primary text-white pt-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-white mb-3">
            Sign up to provide clinical recovery services
          </h2>
          <p className="text-white/70 font-montserrat font-semibold uppercase tracking-wide text-sm mb-6">
            Why sign up
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 pb-16">
            {WHY_SIGN_UP.map((reason) => (
              <span key={reason} className="inline-flex items-center gap-2 text-white">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-white">
                  <Check className="h-3 w-3 text-white" />
                </span>
                {reason}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* EXPOSURE TIERS (white strip between blue bands so card text keeps site colors) */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <p className="font-montserrat font-semibold uppercase tracking-wide text-sm text-primary mb-6">
            Choose your level of exposure
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {EXPOSURE_TIERS.map((tier) => (
              <div
                key={tier.name}
                className="bg-white rounded-lg p-6 text-center shadow border border-primary/10"
              >
                <h3 className="font-montserrat font-bold text-primary text-xl mb-2">{tier.name}</h3>
                <p className="text-secondary text-sm">{tier.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary text-white pb-16">
        <div className="container mx-auto px-4 max-w-4xl text-center pt-10">
          <Button asChild size="lg" className="btn-secondary-enhanced font-semibold">
            <Link href="/doctors">Sign Up as a Provider</Link>
          </Button>
        </div>
      </section>

      {/* LIVE DIRECTORY (members) */}
      <section id="directory" className="container mx-auto px-4 py-12">
        {!user ? (
          <div className="max-w-2xl mx-auto text-center py-8">
            <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-primary mb-3">
              Browse the Live Provider Directory
            </h2>
            <p className="text-secondary mb-6">
              Sign in or create an account to browse the live directory of clinical recovery
              providers and unlock exclusive member discounts.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link href="/auth">Sign In or Register</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/membership">Join Active Recovery 360</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <header className="mb-6">
              <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-primary mb-2">
                Live Provider Directory
              </h2>
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
                            <a
                              href={s.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Website"
                            >
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
          </>
        )}
      </section>
    </div>
  );
}
