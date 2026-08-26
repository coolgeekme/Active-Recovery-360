import { useState } from "react";
import { Link } from "wouter";
import { Mail, Phone, Send, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Breadcrumbs from "@/components/layout/breadcrumbs";

export default function ContactPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/contact", {
        name,
        email,
        subject,
        message,
      });
      const data = await res.json();
      setSubmitted(true);
      toast({ title: "Message sent", description: data.message });
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
        title: "Could not send message",
        description: typeof msg === "string" ? msg : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl" data-testid="contact-page">
      <Breadcrumbs items={[{ label: "Contact" }]} />

      <header className="mb-8">
        <h1 className="text-4xl font-montserrat font-bold text-primary mb-2">
          Contact Us
        </h1>
        <p className="text-secondary text-lg">
          Have a question about products, membership, or healthcare professional accounts? Send us a message.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact form */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              {submitted ? (
                <div className="py-10 text-center" data-testid="contact-success">
                  <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-montserrat font-bold text-primary mb-2">
                    Message sent
                  </h2>
                  <p className="text-secondary mb-6">
                    Thanks for reaching out — our team will get back to you shortly.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setName("");
                      setEmail("");
                      setSubject("");
                      setMessage("");
                      setSubmitted(false);
                    }}
                    data-testid="send-another-btn"
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" data-testid="contact-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        data-testid="contact-name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        data-testid="contact-email"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="How can we help?"
                      data-testid="contact-subject"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      rows={7}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us a bit more..."
                      data-testid="contact-message"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={submitting}
                    data-testid="contact-submit-btn"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact info sidebar */}
        <aside>
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div>
                <h2 className="font-montserrat font-bold text-primary text-lg mb-3">
                  Get in touch
                </h2>
                <p className="text-sm text-secondary">
                  Prefer email or phone? Reach us directly using the details below.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <a
                  href="mailto:info@activerecovery360.com"
                  className="flex items-center gap-3 text-secondary hover:text-primary"
                  data-testid="contact-email-info"
                >
                  <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                  info@activerecovery360.com
                </a>
                <a
                  href="tel:6027260789"
                  className="flex items-center gap-3 text-secondary hover:text-primary"
                  data-testid="contact-phone"
                >
                  <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                  (602) 726-0789
                </a>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-primary text-sm mb-2">
                  Healthcare Professionals
                </h3>
                <p className="text-xs text-secondary mb-3">
                  Interested in setting up a professional storefront for your practice?
                </p>
                <Button asChild variant="outline" size="sm" data-testid="hcp-link-btn">
                  <Link href="/doctors">Learn More</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
