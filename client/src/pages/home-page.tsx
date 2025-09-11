import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Testimonial, Category, Product } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { CheckIcon } from "lucide-react";
import { benefitIcons } from "@/lib/icons";
import heroAthleteImg from "@assets/generated_images/Female_athlete_flat_compression_boots_7be9f42a.png";

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
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background Image with Blue Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${heroAthleteImg})`
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/80 to-primary/75"></div>
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-montserrat font-bold text-white mb-6 tracking-wide">
            ACTIVE RECOVERY 360
          </h1>
          <h2 className="text-2xl md:text-4xl font-montserrat font-light text-white mb-12 tracking-widest">
            RECOVER LIKE THE PROS DO
          </h2>
          
          {/* Main CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button asChild size="lg" className="btn-dsr-cta" data-testid="button-shop">
              <Link href="/shop">SHOP</Link>
            </Button>
            <Button asChild size="lg" className="btn-dsr-cta" data-testid="button-member">
              <Link href="/membership">MEMBER</Link>
            </Button>
            <Button asChild size="lg" className="btn-dsr-cta" data-testid="button-healthcare-provider">
              <Link href="/doctors">HEALTHCARE PROVIDER</Link>
            </Button>
          </div>

          {/* Featured Section */}
          <div className="mb-12">
            <h3 className="text-xl md:text-2xl font-montserrat font-bold text-white mb-8 tracking-wider">
              FEATURED
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="btn-dsr-featured" data-testid="button-nad-patches">
                <Link href="/shop?category=wellness">NAD+ PATCHES</Link>
              </Button>
              <Button asChild size="lg" className="btn-dsr-featured" data-testid="button-wellness">
                <Link href="/shop?category=wellness">DSR WELLNESS</Link>
              </Button>
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