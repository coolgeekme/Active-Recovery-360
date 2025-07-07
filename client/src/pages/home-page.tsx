import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Testimonial, Category, Product } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { CheckIcon } from "lucide-react";
import { benefitIcons } from "@/lib/icons";
import massageTherapyImg from "@/assets/massage-therapy.png";

import ProductGrid from "@/components/product/product-grid";
import CategoryCard from "@/components/category/category-card";
import TestimonialCard from "@/components/testimonial/testimonial-card";
import DoctorCard from "@/components/doctor/doctor-card";

export default function HomePage() {
  const { user } = useAuth();

  // Fetch featured testimonials
  const { data: testimonials = [] } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials?featured=true"],
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch doctors
  const { data: doctors = [] } = useQuery<any[]>({
    queryKey: ["/api/doctors"],
  });

  // Benefits data
  const benefits = [
    {
      title: "Exclusive Products",
      description: "Access to member-only recovery tools and products not available to the general public.",
      icon: benefitIcons.exclusiveProducts
    },
    {
      title: "Doctor Resources",
      description: "Shop from specialized doctor storefronts with curated professional-grade equipment.",
      icon: benefitIcons.doctorResources
    },
    {
      title: "Lifetime Access",
      description: "One-time payment for permanent access to all member benefits and future product releases.",
      icon: benefitIcons.lifetimeAccess
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12">
              <h1 className="text-4xl md:text-5xl font-montserrat font-bold text-white mb-4">
                Specialized Recovery Products For Your Healing Journey
              </h1>
              <p className="text-lg text-white mb-8">
                Join our alliance for exclusive access to professional-grade recovery tools and resources trusted by healthcare professionals.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button asChild size="lg" className="font-montserrat bg-primary text-white border-2 border-white hover:bg-white hover:text-primary shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                  <Link href="/membership">Become a Member</Link>
                </Button>
                <Button asChild size="lg" className="font-montserrat bg-primary text-white border-2 border-white hover:bg-white hover:text-primary shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                  <Link href="/shop">Browse Products</Link>
                </Button>
              </div>
            </div>
            <div className="md:w-1/2">
              <img 
                src={massageTherapyImg} 
                alt="Professional massage therapy treatment with percussion device" 
                className="rounded-lg shadow-lg w-full h-auto object-cover" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Membership Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-montserrat font-bold text-primary mb-2">Exclusive Membership Benefits</h2>
            <p className="text-secondary max-w-xl mx-auto">
              Join our alliance for a one-time fee of $49 and unlock premium recovery products and resources.
            </p>
          </div>

          <div className="bg-primary rounded-lg p-6 md:p-8 mb-12">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <span className="inline-block bg-white px-3 py-1 rounded text-sm font-montserrat font-semibold mb-3" style={{ color: '#2563eb' }}>
                  LIMITED TIME OFFER
                </span>
                <h3 className="text-2xl font-montserrat font-bold text-white mb-3">
                  Receive a FREE Recovery Kit ($35 value)
                </h3>
                <p className="text-white mb-6">
                  Sign up today and receive our exclusive starter recovery kit as a welcome gift. Includes compression bands, recovery guide, and more.
                </p>
                <Button asChild className="font-montserrat font-semibold btn-secondary-enhanced">
                  <Link href="/membership">Join Now for $49</Link>
                </Button>
              </div>
              <div className="md:w-1/3">
                <img 
                  src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80" 
                  alt="Professional rehabilitation equipment" 
                  className="rounded-lg shadow w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6 text-center">
                <div className="bg-primary bg-opacity-10 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-montserrat font-bold text-primary mb-2">{benefit.title}</h3>
                <p className="text-secondary">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-montserrat font-bold text-primary">Featured Products</h2>
            <Link href="/shop" className="text-primary font-montserrat font-semibold hover:underline flex items-center">
              View All
              <ArrowRight className="h-5 w-5 ml-1" />
            </Link>
          </div>

          <ProductGrid featured={true} limit={4} />
        </div>
      </section>

      {/* Doctor Shops Section */}
      {doctors.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-montserrat font-bold text-primary mb-2">Featured Doctor Storefronts</h2>
              <p className="text-secondary max-w-xl mx-auto">
                Explore specialized shops curated by medical professionals with products tailored to specific recovery needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {doctors.slice(0, 3).map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Browse Section */}
      {categories.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-montserrat font-bold text-primary mb-2">Shop By Recovery Category</h2>
              <p className="text-secondary max-w-xl mx-auto">
                Browse our extensive collection of specialized recovery products organized by treatment area.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-montserrat font-bold text-primary mb-2">What Our Members Say</h2>
              <p className="text-secondary max-w-xl mx-auto">
                Read testimonials from healthcare professionals and patients who trust our recovery products.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="py-12 bg-primary">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h2 className="text-3xl font-montserrat font-bold text-white mb-2">Ready to Join Active Recovery 360?</h2>
              <p className="text-white text-opacity-90 max-w-xl">
                Become a member today for just $49 and gain lifetime access to exclusive recovery products and resources.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="font-montserrat bg-white text-primary border-2 border-white hover:bg-gray-100 hover:text-primary shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                <Link href="/membership">Join Now</Link>
              </Button>
              <Button asChild className="font-montserrat bg-transparent text-white border-2 border-white hover:bg-white hover:text-primary shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Import at the top
import { ArrowRight } from "lucide-react";