import { ArrowRight, Boxes, PackageCheck, Tags, Truck } from "lucide-react";
import { Link } from "wouter";

import Breadcrumbs from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const wholesaleBenefits = [
  {
    icon: Tags,
    title: "Volume Pricing",
    description: "Tiered wholesale pricing designed for clinics, retailers, and recovery professionals.",
  },
  {
    icon: Boxes,
    title: "Flexible Ordering",
    description: "Product and case-pack options that can scale with your business needs.",
  },
  {
    icon: Truck,
    title: "Reliable Fulfillment",
    description: "Straightforward ordering and dependable delivery for approved wholesale partners.",
  },
];

export default function WholesalePage() {
  return (
    <div data-testid="wholesale-page">
      <section className="relative overflow-hidden bg-primary text-white py-20 md:py-28">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-montserrat font-semibold mb-6">
            <PackageCheck className="h-4 w-4" />
            Pricing Coming Soon
          </span>
          <h1 className="text-4xl md:text-6xl font-montserrat font-bold mb-5 tracking-wide">
            Active Recovery 360 Wholesale
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8">
            Wholesale pricing for clinics, recovery professionals, retailers, and organizations
            that want to offer premium recovery products to their customers.
          </p>
          <Button asChild size="lg" variant="secondary" className="font-semibold">
            <Link href="/contact">
              Request Wholesale Information
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <Breadcrumbs items={[{ label: "Wholesale" }]} />

        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-montserrat font-bold text-primary mb-3">
            Wholesale Pricing Is on the Way
          </h2>
          <p className="text-secondary text-lg">
            We are finalizing product tiers, minimum order quantities, and partner pricing.
            Contact us now to discuss your needs and be notified when pricing becomes available.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {wholesaleBenefits.map((benefit) => (
            <Card key={benefit.title} className="border-primary/10">
              <CardContent className="pt-6">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-montserrat font-bold text-primary text-lg mb-2">
                  {benefit.title}
                </h3>
                <p className="text-secondary text-sm">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-3xl mx-auto rounded-xl bg-primary/5 border border-primary/15 p-8 text-center">
          <h2 className="text-2xl font-montserrat font-bold text-primary mb-3">
            Interested in Wholesale Pricing?
          </h2>
          <p className="text-secondary mb-6">
            Tell us about your organization and the products you are interested in carrying.
          </p>
          <Button asChild className="btn-primary-enhanced">
            <Link href="/contact">Get in Touch</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
