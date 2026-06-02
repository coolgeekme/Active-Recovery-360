import { useState } from "react";
import { Link } from "wouter";
import {
  Sparkles,
  DollarSign,
  Share2,
  TrendingUp,
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

export default function AffiliatesPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/affiliate-signups", {
        email: email.trim(),
        name: name.trim() || undefined,
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
        title: "Could not subscribe",
        description: typeof msg === "string" ? msg : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const perks = [
    {
      icon: DollarSign,
      title: "Earn on every sale",
      description:
        "Get a commission on every product order placed through your unique referral link.",
    },
    {
      icon: Share2,
      title: "Tools that actually work",
      description:
        "Get banners, social posts, and product images you can drop into Instagram, TikTok, or your blog.",
    },
    {
      icon: TrendingUp,
      title: "Real-time dashboard",
      description:
        "Track clicks, conversions, and payouts in your account — updated as orders come in.",
    },
  ];

  return (
    <div data-testid="affiliates-page">
      {/* Hero */}
      <section className="relative bg-primary text-white py-20 md:py-28 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-montserrat font-semibold mb-6">
              <Sparkles className="h-4 w-4" />
              Coming Soon
            </span>
            <h1 className="text-4xl md:text-6xl font-montserrat font-bold mb-4 tracking-wide">
              Active Recovery 360 Affiliate Program
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Earn commissions by sharing the recovery products you love.
              We&apos;re putting the finishing touches on our affiliate program —
              be the first to know when it goes live.
            </p>
          </div>
        </div>
        {/* Subtle gradient blob for depth */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
      </section>

      {/* Breadcrumbs + perks */}
      <section className="container mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: "Affiliates" }]} />

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

        {/* Notify form */}
        <div className="max-w-2xl mx-auto">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-8 pb-8">
              {submitted ? (
                <div className="text-center" data-testid="affiliate-success">
                  <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-montserrat font-bold text-primary mb-2">
                    You&apos;re on the list
                  </h2>
                  <p className="text-secondary">
                    We&apos;ll email <span className="font-semibold">{email}</span> as soon
                    as the affiliate program launches.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                    <h2 className="text-2xl font-montserrat font-bold text-primary mb-2">
                      Get early access
                    </h2>
                    <p className="text-secondary text-sm">
                      Drop your email and we&apos;ll notify you the moment applications open.
                    </p>
                  </div>
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-3 max-w-md mx-auto"
                    data-testid="affiliate-signup-form"
                  >
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name (optional)"
                      data-testid="affiliate-name"
                    />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      data-testid="affiliate-email"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={submitting}
                      data-testid="affiliate-submit-btn"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Notify Me When It Launches
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Are you a healthcare professional looking to set up a storefront for your practice?{" "}
            <Link href="/doctors" className="text-primary hover:underline">
              Visit our HCP page
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
