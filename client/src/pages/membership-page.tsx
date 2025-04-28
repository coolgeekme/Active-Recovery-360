import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CheckIcon, Shield, Users, Calendar } from "lucide-react";
import MembershipForm from "@/components/membership/membership-form";
import { Link } from "wouter";

export default function MembershipPage() {
  const { user } = useAuth();

  const benefits = [
    {
      icon: Shield,
      title: "Exclusive Products",
      description: "Access to member-only recovery tools and products not available to the general public."
    },
    {
      icon: Users,
      title: "Doctor Resources",
      description: "Shop from specialized doctor storefronts with curated professional-grade equipment."
    },
    {
      icon: Calendar,
      title: "Lifetime Access",
      description: "One-time payment for permanent access to all member benefits and future product releases."
    }
  ];

  const faqItems = [
    {
      question: "What is included in the membership?",
      answer: "Your $49 membership includes lifetime access to all member-only products, a free recovery starter kit ($35 value), and access to doctor-curated storefronts. There are no recurring fees - just a one-time payment."
    },
    {
      question: "How do I receive my free recovery kit?",
      answer: "Your recovery kit will be shipped to you automatically after your membership purchase is completed. You'll receive a confirmation email with tracking information."
    },
    {
      question: "Can I cancel my membership?",
      answer: "Since the membership is a one-time fee with lifetime access, there's no need to cancel. You'll maintain access to all member benefits permanently."
    },
    {
      question: "What if I'm already a healthcare professional?",
      answer: "Healthcare professionals can both purchase a membership for member benefits and also create a professional account to set up a storefront. Contact us for more information on professional accounts."
    },
    {
      question: "Are member-only products more expensive?",
      answer: "No, our member-only products are priced competitively. The membership fee gives you access to professional-grade products that aren't available to the general public, often at better values than retail alternatives."
    }
  ];

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-montserrat font-bold text-primary mb-4">Exercise Recovery Alliance Membership</h1>
        <p className="text-xl text-secondary max-w-3xl mx-auto">
          Join the Exercise Recovery Alliance for a one-time fee of $49 and unlock exclusive access to premium recovery products and resources.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start mb-20">
        <div>
          <div className="bg-primary bg-opacity-5 rounded-lg p-6 mb-8">
            <div className="inline-block bg-white px-3 py-1 rounded text-sm font-montserrat font-semibold mb-3 text-primary">
              LIMITED TIME OFFER
            </div>
            <h2 className="text-2xl font-montserrat font-bold text-primary mb-3">
              Receive a FREE Recovery Kit ($35 value)
            </h2>
            <p className="text-secondary mb-6">
              Sign up today and receive our exclusive starter recovery kit as a welcome gift. Includes compression bands, recovery guide, and more.
            </p>
            <div className="mb-6">
              <img 
                src="https://images.unsplash.com/photo-1596516109370-29001ec8ec36?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80" 
                alt="Recovery starter kit" 
                className="rounded-lg shadow w-full h-auto object-cover"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <p className="text-secondary">Premium compression bands for targeted recovery</p>
              </div>
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <p className="text-secondary">Comprehensive recovery exercise guide</p>
              </div>
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <p className="text-secondary">Cold/hot therapy gel pack for pain relief</p>
              </div>
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <p className="text-secondary">Exclusive member discount code for first purchase</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Membership Benefits</h2>
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex">
                  <div className="bg-primary bg-opacity-10 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-montserrat font-bold text-primary text-lg mb-1">{benefit.title}</h3>
                    <p className="text-secondary">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-20">
            {!user ? (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8 text-center">
                <h2 className="text-xl font-montserrat font-bold text-primary mb-4">Sign In to Purchase Membership</h2>
                <p className="text-secondary mb-6">
                  Please create an account or sign in to purchase your Exercise Recovery Alliance membership.
                </p>
                <div className="space-x-4">
                  <Button asChild>
                    <Link href="/auth">Sign In</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/auth?tab=register">Create Account</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <MembershipForm />
            )}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mb-16">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-montserrat font-bold text-primary text-lg mb-2">{item.question}</h3>
              <p className="text-secondary">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials Preview */}
      <div className="bg-primary bg-opacity-5 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Join Thousands of Satisfied Members</h2>
        <p className="text-lg text-secondary mb-6 max-w-3xl mx-auto">
          Our members love the exclusive products and benefits they receive with their Exercise Recovery Alliance membership.
        </p>
        <Button asChild size="lg">
          <Link href={user ? (user.isMember ? "/shop" : "#membership-form") : "/auth"}>
            {user ? (user.isMember ? "Browse Member Products" : "Join Now for $49") : "Sign In to Join"}
          </Link>
        </Button>
      </div>
    </div>
  );
}