import { useState } from "react";
import { Link } from "wouter";
import {
  Users,
  Trophy,
  ClipboardList,
  HeartPulse,
  Mail,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Breadcrumbs from "@/components/layout/breadcrumbs";

export default function TeamsTrainersPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("team");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/team-signups", {
        name: name.trim(),
        email: email.trim(),
        organization: organization.trim() || undefined,
        role,
      });
      const data = await res.json();
      setSubmitted(true);
      toast({ title: "You're on the list", description: data.message });
    } catch (err: any) {
      let msg = err?.message || "Something went wrong. Please try again.";
      const m = String(msg).match(/^\d+:\s*(.+)$/);
      if (m) {
        try {
          msg = JSON.parse(m[1]).detail || m[1];
        } catch {
          msg = m[1];
        }
      }
      toast({
        title: "Could not submit",
        description: typeof msg === "string" ? msg : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const perks = [
    {
      icon: Trophy,
      title: "Team fundraising codes",
      description:
        "Give your team a share of every sale. Fundraise for uniforms, travel, or equipment with a custom team code.",
    },
    {
      icon: ClipboardList,
      title: "Bulk & team ordering",
      description:
        "Order recovery products in bulk for your whole roster at team pricing.",
    },
    {
      icon: HeartPulse,
      title: "Trainer resources",
      description:
        "Curated recovery protocols and products you can recommend to athletes with confidence.",
    },
  ];

  return (
    <div data-testid="teams-trainers-page">
      {/* Hero */}
      <section className="relative bg-primary text-white py-20 md:py-28 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-montserrat font-semibold mb-6">
              <Users className="h-4 w-4" />
              Teams &amp; Trainers
            </span>
            <h1 className="text-4xl md:text-6xl font-montserrat font-bold mb-4 tracking-wide">
              Recovery for Your Whole Team
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Athletic teams and athletic trainers get a team code to earn money back
              and order recovery products in bulk. Sign up and we&apos;ll set you up.
            </p>
          </div>
        </div>
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
      </section>

      {/* Breadcrumbs + perks */}
      <section className="container mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: "Teams & Trainers" }]} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {perks.map((p, i) => (
            <Card key={i} className="border-primary/10 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <p.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-montserrat font-bold text-primary text-lg mb-2">
                  {p.title}
                </h3>
                <p className="text-secondary text-sm">{p.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Signup form */}
        <div className="max-w-2xl mx-auto">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-8 pb-8">
              {submitted ? (
                <div className="text-center" data-testid="team-signup-success">
                  <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-montserrat font-bold text-primary mb-2">
                    You&apos;re on the list
                  </h2>
                  <p className="text-secondary">
                    We&apos;ll email <span className="font-semibold">{email}</span> with your
                    team code and next steps.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                    <h2 className="text-2xl font-montserrat font-bold text-primary mb-2">
                      Get your team set up
                    </h2>
                    <p className="text-secondary text-sm">
                      Tell us who you are and we&apos;ll get you a code.
                    </p>
                  </div>
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-3 max-w-md mx-auto"
                    data-testid="team-signup-form"
                  >
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      data-testid="team-name"
                    />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      data-testid="team-email"
                    />
                    <Input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Team / school / organization (optional)"
                      data-testid="team-org"
                    />

                    {/* Role selector */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-secondary">
                        I am a…
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: "team", label: "Team / Coach" },
                          { value: "trainer", label: "Athletic Trainer" },
                          { value: "both", label: "Both" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRole(opt.value)}
                            className={`flex-1 px-3 py-2 rounded-md border text-sm font-montserrat font-semibold transition ${
                              role === opt.value
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-secondary border-gray-300 hover:border-primary"
                            }`}
                            data-testid={`role-${opt.value}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={submitting}
                      data-testid="team-submit-btn"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Request Team Code
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Looking for individual product discounts?{" "}
            <Link href="/affiliates" className="text-primary hover:underline">
              Join our affiliate program
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
