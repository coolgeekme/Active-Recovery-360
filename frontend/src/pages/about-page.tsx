import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckIcon } from "lucide-react";

export default function AboutPage() {

  const values = [
    {
      title: "Professional Quality",
      description: "We provide only the highest quality recovery products that meet professional standards."
    },
    {
      title: "Evidence-Based Approach",
      description: "Our product selection is guided by scientific research and clinical expertise."
    },
    {
      title: "Patient-Centered Care",
      description: "We prioritize the needs of patients in their recovery journey."
    },
    {
      title: "Healthcare Partnerships",
      description: "We work closely with healthcare professionals to curate specialized storefronts."
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary bg-opacity-5 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-montserrat font-bold text-primary mb-4">
              About Us
            </h1>
            <p className="text-xl text-secondary mb-8">
              We're dedicated to providing healthcare professionals and patients with professional-grade recovery products to support healing journeys.
            </p>
            <Button asChild size="lg">
              <Link href="/membership">Join Our Alliance</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-montserrat font-bold text-primary mb-4">Our Mission</h2>
              <p className="text-secondary mb-6">
                We were founded by healthcare professionals who recognized the need for a specialized platform that offers medical-grade recovery products directly to patients and practitioners.
              </p>
              <p className="text-secondary mb-6">
                Our mission is to bridge the gap between clinical rehabilitation and home recovery by providing access to the same high-quality tools used by professionals.
              </p>
              <p className="text-secondary">
                We believe that recovery shouldn't end when you leave the clinic, which is why we've created a platform that connects patients with the resources they need to continue their healing journey.
              </p>
            </div>
            <div>
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
                alt="Healthcare professionals discussing recovery solutions" 
                className="rounded-lg shadow-lg w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-montserrat font-bold text-primary mb-4">Our Values</h2>
            <p className="text-xl text-secondary max-w-3xl mx-auto">
              We are built on a foundation of core values that guide everything we do.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="pt-6">
                  <div className="bg-primary bg-opacity-10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <CheckIcon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-montserrat font-bold text-primary text-lg mb-2">{value.title}</h3>
                  <p className="text-secondary">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-montserrat font-bold text-white mb-4">
              Join Our Alliance
            </h2>
            <p className="text-xl text-white text-opacity-90 mb-8">
              Become a member today for just $29 and gain lifetime access to exclusive recovery products and resources.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild variant="secondary" size="lg" className="btn-hero-primary">
                <Link href="/membership">Become a Member</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="btn-hero-outline">
                <Link href="/shop">Browse Products</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
