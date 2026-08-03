import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Testimonial, Category, Product } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { CheckIcon } from "lucide-react";
import { benefitIcons } from "@/lib/icons";
import heroAthleteImg from "@/assets/hero-image.png";
import activeRecovery360Logo from "@/assets/active-recovery-360-logo.png";

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
      title: "Exclusive Pricing",
      description: "Access to member-only pricing on recovery tools and products not available to the general public.",
      icon: benefitIcons.exclusiveProducts
    },
    {
      title: "Lifetime Access",
      description: "One-time payment for permanent access to all member benefits and future product releases.",
      icon: benefitIcons.lifetimeAccess
    },
    {
      title: "Member Pricing on Clinical Recovery Service",
      description: "Access special member pricing on clinical recovery services",
      icon: benefitIcons.clinicalServices
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background Image with Blue Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${heroAthleteImg})`
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/45 via-primary/35 to-primary/30"></div>
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="sr-only">Active Recovery 360</h1>
          <div className="mb-6 flex justify-center">
            <img 
              src={activeRecovery360Logo}
              alt="Active Recovery 360"
              className="h-40 md:h-64 lg:h-72 w-auto block"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.55)) drop-shadow(0 0 2px rgba(0,0,0,0.4))'
              }}
              decoding="async"
            />
          </div>
          <h2 className="text-2xl md:text-4xl font-montserrat font-bold text-white mb-12 tracking-widest">Exercise, Performance & Injury Recovery</h2>
          
          {/* Main CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-6">
            <Button asChild className="btn-dsr-cta text-xl md:text-2xl px-12 py-6 md:px-16 md:py-7" data-testid="button-shop">
              <Link href="/shop">SHOP</Link>
            </Button>
            <Button asChild className="btn-dsr-cta text-xl md:text-2xl px-12 py-6 md:px-16 md:py-7" data-testid="button-member">
              <Link href="/membership">MEMBERS</Link>
            </Button>
          </div>
          <div className="flex justify-center mb-16">
            <Button asChild className="btn-dsr-cta text-xl md:text-2xl px-12 py-6 md:px-16 md:py-7" data-testid="button-healthcare-provider">
              <Link href="/doctors">HEALTHCARE PROVIDERS</Link>
            </Button>
          </div>

          {/* Tagline */}
          <p className="text-3xl md:text-5xl font-montserrat font-bold text-white mt-8 tracking-wider">
            RECOVER LIKE THE PROS DO
          </p>
        </div>
      </section>
      {/* Membership Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-montserrat font-bold text-primary mb-2">Exclusive Membership Benefits</h2>
            <p className="text-secondary max-w-xl mx-auto">
              Join our recovery community for a one-time fee of $29 and unlock exclusive access to premium recovery products, member-only pricing, and exclusive recovery resources.
            </p>
          </div>

          <div className="bg-primary rounded-lg p-6 md:p-8 mb-12">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <span className="inline-block bg-white px-3 py-1 rounded text-sm font-montserrat font-semibold mb-3" style={{ color: '#2563eb' }}>
                  LIMITED TIME OFFER
                </span>
                <h3 className="text-2xl font-montserrat font-bold text-white mb-3">
                  Why Join Active Recovery 360
                </h3>
                <ul className="text-white mb-6 space-y-2">
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Access to member-only pricing
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Free Recovery Kit ($39 Value)
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Early Bird Access to new product offerings
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Discounts on Clinical Recovery Services
                  </li>
                </ul>
                <Button asChild className="font-montserrat font-semibold btn-secondary-enhanced">
                  <Link href="/membership">Join Now for $29</Link>
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
              <h2 className="text-3xl font-montserrat font-bold text-primary mb-2">HCP Storefronts</h2>
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
          {/* Healthcare Professional Section */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 pb-10 border-b border-white border-opacity-20">
            <div className="mb-6 md:mb-0">
              <h2 className="text-3xl font-montserrat font-bold text-white mb-2">Are You a Healthcare Professional?</h2>
              <p className="text-white text-opacity-90 max-w-xl">
                Join the Active Recovery 360 as a healthcare provider and create your own customized storefront with recovery products targeted to your patients needs.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="font-montserrat bg-primary text-white border-2 border-white hover:bg-white hover:text-primary shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                <Link href="/auth?tab=register">Join as HCP</Link>
              </Button>
            </div>
          </div>
          
          {/* Member Join Section */}
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h2 className="text-3xl font-montserrat font-bold text-white mb-2">Ready to Join Active Recovery 360?</h2>
              <p className="text-white text-opacity-90 max-w-xl">
                Become a member today for just $29 and gain lifetime access to exclusive recovery products and resources.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="font-montserrat bg-primary text-white border-2 border-white hover:bg-white hover:text-primary shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                <Link href="/membership">Join Now</Link>
              </Button>
              <Button asChild className="font-montserrat bg-primary text-white border-2 border-white hover:bg-white hover:text-primary shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
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