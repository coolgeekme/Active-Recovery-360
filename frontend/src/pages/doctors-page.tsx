import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";
import {
  Loader2,
  CheckCircle2,
  Activity,
  Pill,
  Dumbbell,
  ShieldCheck,
  Thermometer,
  Sparkles,
  TrendingUp,
  HandCoins,
  Heart,
  PackageCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DoctorCard from "@/components/doctor/doctor-card";

const RECOVERY_NEEDS = [
  "Injury rehabilitation",
  "Pain management",
  "Exercise recovery",
  "Athletic performance",
  "Mobility and flexibility",
  "Post-treatment recovery",
  "Circulation and muscle support",
  "Daily wellness and preventative care",
];

const FEATURED_CATEGORIES = [
  {
    icon: Activity,
    title: "Compression & Recovery Therapy",
    body: "Support circulation, reduce soreness, and accelerate recovery with advanced compression systems and recovery tools.",
  },
  {
    icon: Pill,
    title: "Topical Pain Relief",
    body: "Professional-grade creams, gels, sprays, and natural analgesics used by sports medicine and rehabilitation professionals.",
  },
  {
    icon: Dumbbell,
    title: "Mobility & Rehabilitation Tools",
    body: "Foam rollers, massage devices, stretching systems, resistance bands, and mobility accessories designed for clinical and home use.",
  },
  {
    icon: ShieldCheck,
    title: "Kinesiology & Support Products",
    body: "High-performance kinesiology tape, braces, supports, and stabilization products for injury prevention and rehabilitation.",
  },
  {
    icon: Thermometer,
    title: "Hot & Cold Recovery",
    body: "Target inflammation, muscle tension, and recovery with therapeutic hot/cold solutions.",
  },
  {
    icon: Sparkles,
    title: "Performance Recovery Systems",
    body: "Innovative technologies for athletes, active individuals, and recovery-focused wellness programs.",
  },
];

const WHY_CHOOSE_US = [
  {
    icon: Heart,
    title: "Clinical-Focused Product Selection",
    body: "Customizable product selections with provider and patient outcomes in mind.",
  },
  {
    icon: TrendingUp,
    title: "New Revenue Opportunities",
    body: "Create additional recurring revenue through online retail patient recovery product sales.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Patient Experience",
    body: "Offer products your patients can use confidently between visits to support long-term recovery and treatment adherence.",
  },
  {
    icon: HandCoins,
    title: "Provider Pricing & Wholesale Access",
    body: "Competitive pricing programs designed for clinics, practices, and multi-location organizations.",
  },
  {
    icon: Truck,
    title: "Fast Ordering & Reliable Fulfillment",
    body: "Simple online ordering, no clinic inventory needed, dependable shipping and responsive support.",
  },
  {
    icon: PackageCheck,
    title: "No Inventory Commitment",
    body: "Drop-ship fulfillment means you never need to carry products on-site. We handle the warehouse, you focus on patient care.",
  },
];

const SUPPORTED_PROVIDERS = [
  "Chiropractors",
  "Physical Therapists",
  "Athletic Trainers",
  "Sports Medicine Clinics",
  "Orthopedic Providers",
  "Recovery Studios",
  "Wellness Centers",
  "Functional Medicine Practices",
  "Personal Training & Performance Facilities",
];

const PARTNER_BENEFITS = [
  "Provider-exclusive pricing",
  "Wholesale purchasing options",
  "Clinic retail opportunities — no clinic inventory commitment",
  "Premium recovery brands",
  "Dedicated support",
  "Easy online ordering",
];

export default function DoctorsPage() {
  const { data: doctors = [], isLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/doctors"],
  });

  return (
    <div className="bg-background" data-testid="hcp-marketing-page">
      {/* HERO */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background border-b">
        <div className="container mx-auto px-4 py-16 sm:py-24 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
            For Healthcare Professionals
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-montserrat font-bold text-primary mb-4 leading-tight">
            Support Every Patient's Recovery Journey
          </h1>
          <p className="text-lg sm:text-xl text-secondary max-w-3xl mx-auto mb-8">
            Help your patients recover faster. Perform stronger. Increase practice revenue.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="font-semibold btn-primary-enhanced" data-testid="cta-register-hcp">
              <a href="/auth?tab=register">Become a Provider Partner</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#why-us">Learn More</a>
            </Button>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-montserrat font-bold text-primary mb-4 text-center">
          Advanced Recovery Products for Healthcare Providers
        </h2>
        <p className="text-base sm:text-lg text-secondary leading-relaxed text-center">
          At Active Recovery 360, we help healthcare professionals deliver better outcomes with
          clinically focused recovery, rehabilitation, and performance products designed for modern
          patient care. Whether you operate a chiropractic clinic, physical therapy practice, sports
          medicine facility, orthopedic group, wellness center, or recovery studio, our customizable
          provider platform gives you access to premium recovery solutions your patients can trust.
        </p>
      </section>

      {/* RECOVERY NEEDS */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-montserrat font-bold text-primary mb-3 text-center">
            Trusted Recovery Solutions for Clinical Recovery & Performance Care
          </h2>
          <p className="text-base text-secondary mb-8 text-center max-w-3xl mx-auto">
            We offer a professionally curated selection of evidence-based recovery products that support:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {RECOVERY_NEEDS.map((need) => (
              <div
                key={need}
                className="flex items-start gap-2 bg-background rounded-md p-3 shadow-sm"
              >
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{need}</span>
              </div>
            ))}
          </div>
          <p className="text-base text-secondary mt-8 text-center max-w-3xl mx-auto">
            From elite athletes to post-surgical patients, our products are selected to help improve
            recovery outcomes, patient compliance, and overall treatment satisfaction — to help set
            your practice apart.
          </p>
        </div>
      </section>

      {/* FEATURED CATEGORIES */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-montserrat font-bold text-primary mb-10 text-center">
          Featured Product Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_CATEGORIES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-secondary">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section id="why-us" className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-montserrat font-bold text-primary mb-10 text-center">
            Why Healthcare Providers Choose Active Recovery 360
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_CHOOSE_US.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-background rounded-lg p-6 shadow-sm">
                <Icon className="h-7 w-7 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORTED PROVIDERS */}
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-montserrat font-bold text-primary mb-3 text-center">
          Built for Healthcare Professionals
        </h2>
        <p className="text-base text-secondary mb-8 text-center">We proudly support:</p>
        <div className="flex flex-wrap justify-center gap-3">
          {SUPPORTED_PROVIDERS.map((p) => (
            <span
              key={p}
              className="inline-flex items-center px-4 py-2 rounded-full bg-primary/5 text-primary text-sm font-medium border border-primary/20"
            >
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* ELEVATE */}
      <section className="bg-primary text-white">
        <div className="container mx-auto px-4 py-16 max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl font-montserrat font-bold mb-4">
            Elevate Your Patient Recovery Program
          </h2>
          <p className="text-base sm:text-lg text-white/90 leading-relaxed">
            Today's patients expect more than treatment alone — they want complete recovery
            solutions they can use at home and in everyday life. Active Recovery 360 helps
            healthcare providers extend care beyond the clinic with recovery products that improve
            patient engagement, support healing, and enhance performance.
          </p>
        </div>
      </section>

      {/* PARTNER CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-background rounded-lg shadow-lg border max-w-5xl mx-auto p-8 sm:p-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-montserrat font-bold text-primary mb-3">
              Become a Provider Partner
            </h2>
            <p className="text-base sm:text-lg text-secondary max-w-3xl mx-auto">
              Join healthcare professionals nationwide who trust Active Recovery 360 for premium
              recovery and rehabilitation solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-8">
            {PARTNER_BENEFITS.map((b) => (
              <div key={b} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{b}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-secondary mb-6">
              Start building a stronger recovery experience for your patients today.
            </p>
            <Button asChild size="lg" className="font-semibold btn-primary-enhanced" data-testid="cta-register-hcp-bottom">
              <a href="/auth?tab=register">Apply as a Healthcare Professional</a>
            </Button>
          </div>
        </div>
      </section>

      {/* EXISTING STOREFRONTS */}
      {!isLoading && doctors.length > 0 && (
        <section className="bg-muted/30 border-t">
          <div className="container mx-auto px-4 py-16">
            <h2 className="text-2xl sm:text-3xl font-montserrat font-bold text-primary mb-3 text-center">
              Provider Storefronts
            </h2>
            <p className="text-base text-secondary text-center mb-10 max-w-2xl mx-auto">
              Explore specialized recovery shops curated by healthcare professionals.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {doctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          </div>
        </section>
      )}

      {isLoading && (
        <div className="container mx-auto py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
