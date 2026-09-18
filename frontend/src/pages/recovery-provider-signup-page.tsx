import { useState } from "react";
import { Link } from "wouter";
import {
  Activity, ArrowLeft, Briefcase, Check, CheckCircle2, Globe, Handshake,
  Loader2, MapPin, Search, ShoppingBag, Star, TrendingUp, UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

/* Content supplied by Kevin (Sep 15 doc: "local recovery services sign up page"). */

const PROVIDER_TYPES = [
  "Physical Therapist", "Chiropractor", "Athletic Trainer", "Sports Medicine",
  "Strength & Conditioning", "Exercise Professional", "Massage Therapist",
  "Recovery Specialist", "Rehabilitation Provider", "Other",
];

const SERVICE_OPTIONS = [
  "Injury Rehabilitation", "Exercise Recovery", "Sports Rehabilitation",
  "Physical Therapy", "Chiropractic Care", "Post-Surgical Recovery",
  "Sports Performance", "Strength & Conditioning", "Mobility",
  "Injury Prevention", "Manual Therapy", "Massage / Soft Tissue",
  "Balance & Functional Training", "Running / Athletic Performance",
  "Senior Fitness & Recovery", "Wellness / Fitness", "Other",
];

const IDEAL_CLIENTS = [
  "Athletes", "Active Adults", "Youth Athletes", "Post-Surgical Patients",
  "Injured Individuals", "Older Adults", "Fitness Participants",
  "Recreational Athletes", "Workers / Occupational Injuries", "Other",
];

const SERVICE_AREAS = [
  "Local / Same City", "5-10 Miles", "10-25 Miles", "25+ Miles",
  "Telehealth / Virtual Services", "Mobile / In-Home Services",
];

const WHY_JOIN = [
  { icon: MapPin, title: "Local Visibility", body: "Create a professional provider profile that helps potential clients find exercise and recovery services in their area." },
  { icon: Handshake, title: "Referral Opportunities", body: "Connect with other professionals serving patients, athletes and active adults who need complementary recovery services." },
  { icon: Activity, title: "Reach Active Clients & Athletes", body: "Put your practice in front of people looking for help with injury recovery, rehabilitation, mobility, performance and injury prevention." },
  { icon: ShoppingBag, title: "Recovery Product Access", body: "Explore opportunities to use and recommend recovery products and equipment available through the Active Recovery 360 marketplace." },
  { icon: UserRound, title: "Professional Profile", body: "Showcase your specialties, services, credentials, location, website and contact information." },
  { icon: TrendingUp, title: "Grow Your Practice", body: "Increase awareness of your services and build relationships with other professionals within the local recovery ecosystem." },
];

const WHO_SHOULD_JOIN = [
  "Physical Therapists", "Chiropractors", "Athletic Trainers",
  "Sports Medicine Professionals", "Strength & Conditioning Coaches",
  "Exercise Physiologists", "Personal Trainers", "Massage Therapists",
  "Mobility & Recovery Specialists", "Rehabilitation Professionals",
  "Sports Performance Specialists", "Orthopedic Rehabilitation Providers",
  "Post-Surgical Recovery Providers", "Wellness & Movement Professionals",
  "Other qualified exercise and recovery providers",
];

const TIERS = [
  {
    id: "basic", name: "Basic Provider Listing", price: "Free", priceNote: "",
    highlight: false,
    features: [
      "Active Recovery 360 provider directory listing",
      "Business name and location", "Contact information",
      "Services and specialties", "Website link", "Local search visibility",
    ],
  },
  {
    id: "featured", name: "Featured Provider", price: "Premium", priceNote: "",
    highlight: true,
    features: [
      "Everything in the Basic Listing", "Featured provider placement",
      "Expanded provider profile", "Practice logo / photo",
      "Promotional opportunities", "Featured recovery services",
      "Priority placement in applicable searches",
    ],
  },
  {
    id: "partner", name: "Provider Partner", price: "Premium Partnership", priceNote: "",
    highlight: false,
    features: [
      "Everything in Featured Provider", "Recovery product opportunities",
      "Provider promotions", "Educational content opportunities",
      "Referral / networking opportunities", "Co-marketing opportunities",
      "Special Active Recovery 360 partner offers",
    ],
  },
];

const emptyForm = {
  firstName: "", lastName: "", credentials: "", businessName: "",
  providerTypes: [] as string[], providerTypeOther: "",
  businessAddress: "", city: "", state: "", zipCode: "",
  businessPhone: "", email: "", website: "",
  services: [] as string[], serviceOther: "", serviceDescription: "",
  idealClients: [] as string[], idealClientOther: "",
  serviceArea: "", bio: "", yearsInPractice: "", certifications: "", specialties: "",
  facebook: "", instagram: "", linkedin: "", bookingLink: "",
  networkTier: "",
};

type FormState = typeof emptyForm;

/** Multi-select checkbox group used for provider type, services and clients. */
function CheckboxGroup({
  options, value, onChange, otherValue, onOtherChange, idPrefix,
}: {
  options: string[]; value: string[];
  onChange: (next: string[]) => void;
  otherValue?: string; onOtherChange?: (v: string) => void;
  idPrefix: string;
}) {
  const others = options.filter((o) => o === "Other");
  const regular = options.filter((o) => o !== "Other");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {regular.map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <Checkbox
              id={`${idPrefix}-${option}`}
              checked={value.includes(option)}
              data-testid={`${idPrefix}-${option}`}
              onCheckedChange={(checked) =>
                onChange(checked ? [...value, option] : value.filter((v) => v !== option))
              }
            />
            <label htmlFor={`${idPrefix}-${option}`} className="text-sm leading-tight cursor-pointer">
              {option}
            </label>
          </div>
        ))}
      </div>
      {others.length > 0 && onOtherChange && (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id={`${idPrefix}-Other`}
            checked={value.includes("Other")}
            data-testid={`${idPrefix}-Other`}
            onCheckedChange={(checked) =>
              onChange(checked ? [...value, "Other"] : value.filter((v) => v !== "Other"))
            }
          />
          <label htmlFor={`${idPrefix}-Other`} className="text-sm cursor-pointer">Other:</label>
          <Input
            className="max-w-xs"
            value={otherValue || ""}
            data-testid={`${idPrefix}-other-text`}
            onChange={(e) => onOtherChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

export default function RecoveryProviderSignupPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "First name is required";
    if (!form.lastName.trim()) next.lastName = "Last name is required";
    if (!form.businessName.trim()) next.businessName = "Practice or business name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: "A few fields need attention",
        description: "Please fill in the required fields marked in red.",
        variant: "destructive",
      });
      document.querySelector("[data-error='true']")?.scrollIntoView({ block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/recovery-provider-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail.slice(0, 200) || `Request failed (${res.status})`);
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({
        title: "Could not submit your profile",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <CheckCircle2 className="h-14 w-14 mx-auto text-green-600 mb-4" />
        <h1 className="text-3xl font-montserrat font-bold text-primary mb-3">
          Your provider profile was submitted
        </h1>
        <p className="text-secondary mb-6">
          Once your information is submitted, the Active Recovery 360 team will review
          your provider information and contact you regarding your directory listing and
          available provider partnership opportunities.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/recovery-services">Back to Recovery Services</Link>
          </Button>
          <Button asChild>
            <Link href="/">Go to Homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b">
        <div className="container mx-auto px-4 py-14 max-w-4xl text-center">
          <Badge variant="outline" className="mb-4 bg-primary/5 text-primary border-primary/30">
            Active Recovery 360
          </Badge>
          <h1 className="text-3xl md:text-4xl font-montserrat font-bold text-primary mb-4">
            Local Exercise, Injury &amp; Performance Recovery Provider Network
          </h1>
          <p className="text-xl text-secondary font-semibold mb-5">
            Get Found. Get Connected. Help More People Recover.
          </p>
          <p className="text-secondary mb-3 max-w-3xl mx-auto">
            Join the Active Recovery 360 Local Provider Network and connect your practice
            with people looking for exercise, injury &amp; performance recovery services in
            their community.
          </p>
          <p className="text-secondary mb-7 max-w-3xl mx-auto">
            Whether you are a physical therapist, chiropractor, athletic trainer, strength &amp;
            conditioning professional, massage therapist, sports medicine provider, recovery
            specialist, or other qualified exercise and recovery professional, Active Recovery
            360 can help put your services in front of the people who need them.
          </p>
          <Button asChild size="lg" className="font-semibold">
            <a href="#provider-profile">JOIN THE PROVIDER NETWORK</a>
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            No complicated process. Complete the provider profile below and we&apos;ll contact
            you about activating your listing.
          </p>
        </div>
      </section>

      {/* Why join */}
      <section className="container mx-auto px-4 py-14 max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-primary text-center mb-10">
          Why Join Active Recovery 360?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_JOIN.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="h-full">
              <CardContent className="pt-6">
                <Icon className="h-7 w-7 text-primary mb-3" />
                <h3 className="font-montserrat font-semibold text-primary mb-2">{title}</h3>
                <p className="text-sm text-secondary">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Who should join */}
      <section className="bg-slate-50 border-y">
        <div className="container mx-auto px-4 py-14 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-primary text-center mb-4">
            Who Should Join?
          </h2>
          <p className="text-center text-secondary mb-8">
            Active Recovery 360 is building a network that can include:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {WHO_SHOULD_JOIN.map((role) => (
              <Badge key={role} variant="outline" className="bg-white text-secondary border-slate-300 px-3 py-1.5 text-sm font-normal">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Listing options */}
      <section className="container mx-auto px-4 py-14 max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-primary text-center mb-3">
          Provider Network Options
        </h2>
        <p className="text-center text-secondary mb-10">
          Choose the level of exposure that fits your practice. You can change this at any time.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <Card
              key={tier.id}
              data-testid={`tier-${tier.id}`}
              className={`h-full flex flex-col ${tier.highlight ? "border-primary border-2 shadow-md" : ""}`}
            >
              <CardContent className="pt-6 flex flex-col h-full">
                {tier.highlight && (
                  <Badge className="self-start mb-3 bg-primary text-white">Most Popular</Badge>
                )}
                <h3 className="font-montserrat font-bold text-primary text-lg">{tier.name}</h3>
                <p className="text-2xl font-montserrat font-bold text-primary mt-2 mb-4">{tier.price}</p>
                <ul className="space-y-2 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-secondary">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant={tier.highlight ? "default" : "outline"}
                  className="mt-6"
                  data-testid={`choose-${tier.id}`}
                  onClick={() => {
                    set("networkTier", tier.id);
                    document.getElementById("provider-profile")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {form.networkTier === tier.id ? "Selected" : `Choose ${tier.name.split(" ")[0]}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Application form */}
      <section id="provider-profile" className="bg-slate-50 border-y scroll-mt-24">
        <div className="container mx-auto px-4 py-14 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-montserrat font-bold text-primary text-center mb-2">
            Create Your Provider Profile
          </h2>
          <p className="text-center text-secondary mb-10">
            Fields marked <span className="text-destructive">*</span> are required.
          </p>

          <form onSubmit={handleSubmit} className="space-y-8" data-testid="provider-signup-form">
            {/* Provider information */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                <h3 className="font-montserrat font-semibold text-primary text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" /> Provider Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2" data-error={!!errors.firstName}>
                    <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                    <Input id="firstName" data-testid="firstName" value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)} />
                    {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2" data-error={!!errors.lastName}>
                    <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                    <Input id="lastName" data-testid="lastName" value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)} />
                    {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credentials">Professional Title / Credentials</Label>
                    <Input id="credentials" data-testid="credentials" placeholder="e.g. DPT, LMT, CSCS"
                      value={form.credentials} onChange={(e) => set("credentials", e.target.value)} />
                  </div>
                  <div className="space-y-2" data-error={!!errors.businessName}>
                    <Label htmlFor="businessName">Practice / Business Name <span className="text-destructive">*</span></Label>
                    <Input id="businessName" data-testid="businessName" value={form.businessName}
                      onChange={(e) => set("businessName", e.target.value)} />
                    {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Provider Type</Label>
                  <CheckboxGroup
                    idPrefix="ptype" options={PROVIDER_TYPES}
                    value={form.providerTypes} onChange={(v) => set("providerTypes", v)}
                    otherValue={form.providerTypeOther}
                    onOtherChange={(v) => set("providerTypeOther", v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                <h3 className="font-montserrat font-semibold text-primary text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> Contact Information
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Input id="businessAddress" data-testid="businessAddress" value={form.businessAddress}
                    onChange={(e) => set("businessAddress", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" data-testid="city" value={form.city}
                      onChange={(e) => set("city", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" data-testid="state" value={form.state}
                      onChange={(e) => set("state", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input id="zipCode" data-testid="zipCode" value={form.zipCode}
                      onChange={(e) => set("zipCode", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input id="businessPhone" data-testid="businessPhone" value={form.businessPhone}
                      onChange={(e) => set("businessPhone", e.target.value)} />
                  </div>
                  <div className="space-y-2" data-error={!!errors.email}>
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <Input id="email" type="email" data-testid="email" value={form.email}
                      onChange={(e) => set("email", e.target.value)} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" data-testid="website" placeholder="https://"
                    value={form.website} onChange={(e) => set("website", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                <h3 className="font-montserrat font-semibold text-primary text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" /> Your Services
                </h3>
                <div className="space-y-2">
                  <Label>Select Your Areas of Expertise</Label>
                  <CheckboxGroup
                    idPrefix="service" options={SERVICE_OPTIONS}
                    value={form.services} onChange={(v) => set("services", v)}
                    otherValue={form.serviceOther}
                    onOtherChange={(v) => set("serviceOther", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceDescription">Describe Your Services</Label>
                  <Textarea id="serviceDescription" rows={4} data-testid="serviceDescription"
                    value={form.serviceDescription}
                    onChange={(e) => set("serviceDescription", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Clients + service area */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                <h3 className="font-montserrat font-semibold text-primary text-lg flex items-center gap-2">
                  <UserRound className="h-5 w-5" /> Your Ideal Clients
                </h3>
                <div className="space-y-2">
                  <Label>Who do you primarily serve?</Label>
                  <CheckboxGroup
                    idPrefix="client" options={IDEAL_CLIENTS}
                    value={form.idealClients} onChange={(v) => set("idealClients", v)}
                    otherValue={form.idealClientOther}
                    onOtherChange={(v) => set("idealClientOther", v)}
                  />
                </div>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="serviceArea">Service Area</Label>
                  <Select value={form.serviceArea} onValueChange={(v) => set("serviceArea", v)}>
                    <SelectTrigger id="serviceArea" data-testid="serviceArea">
                      <SelectValue placeholder="How far do you typically serve clients?" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_AREAS.map((area) => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Profile */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                <h3 className="font-montserrat font-semibold text-primary text-lg flex items-center gap-2">
                  <Star className="h-5 w-5" /> Provider Profile
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio / Practice Description</Label>
                  <Textarea id="bio" rows={4} data-testid="bio" value={form.bio}
                    onChange={(e) => set("bio", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="yearsInPractice">Years in Practice</Label>
                    <Input id="yearsInPractice" data-testid="yearsInPractice" value={form.yearsInPractice}
                      onChange={(e) => set("yearsInPractice", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certifications">Certifications / Licenses</Label>
                    <Input id="certifications" data-testid="certifications" value={form.certifications}
                      onChange={(e) => set("certifications", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialties">Specialties</Label>
                  <Input id="specialties" data-testid="specialties" value={form.specialties}
                    onChange={(e) => set("specialties", e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input id="facebook" data-testid="facebook" value={form.facebook}
                      onChange={(e) => set("facebook", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input id="instagram" data-testid="instagram" value={form.instagram}
                      onChange={(e) => set("instagram", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input id="linkedin" data-testid="linkedin" value={form.linkedin}
                      onChange={(e) => set("linkedin", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bookingLink">Booking / Appointment Link</Label>
                    <Input id="bookingLink" data-testid="bookingLink" value={form.bookingLink}
                      onChange={(e) => set("bookingLink", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="text-center space-y-4">
              {form.networkTier && (
                <p className="text-sm text-secondary" data-testid="selected-tier">
                  Listing interest: <span className="font-semibold text-primary">
                    {TIERS.find((t) => t.id === form.networkTier)?.name}
                  </span>
                </p>
              )}
              <Button type="submit" size="lg" className="font-semibold" disabled={submitting}
                data-testid="submit-provider-profile">
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
                ) : (
                  "SUBMIT MY PROVIDER PROFILE"
                )}
              </Button>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Once your information is submitted, the Active Recovery 360 team will review
                your provider information and contact you regarding your directory listing and
                available provider partnership opportunities.
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* Closing */}
      <section className="container mx-auto px-4 py-14 max-w-3xl text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">
          Join the Active Recovery 360 Network
        </h2>
        <p className="text-secondary mb-3 font-semibold">
          Help people move better, recover better and perform better.
        </p>
        <p className="text-secondary mb-6">
          Active Recovery 360 is developing a community that connects people, products and
          professional services across the exercise, injury &amp; performance recovery and
          sports performance ecosystem. Your expertise is part of the recovery journey.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/recovery-services"><ArrowLeft className="h-4 w-4 mr-2" /> Recovery Services</Link>
          </Button>
          <Button asChild>
            <a href="#provider-profile"><Globe className="h-4 w-4 mr-2" /> Back to the form</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
