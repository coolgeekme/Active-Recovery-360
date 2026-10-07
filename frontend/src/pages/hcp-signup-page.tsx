/**
 * Dedicated healthcare-provider registration.
 *
 * Kevin asked for two clearly separate registration pages — one for members,
 * one for providers. They were previously the same form distinguished only by
 * a checkbox, which meant providers had to know to tick a box on a membership
 * page to get a storefront.
 *
 * This page always registers as a provider: the professional fields are
 * always shown and required, and there is no member upsell or checkboxes.
 * It posts the same payload shape the shared auth form used
 * (isHcpApplication + licenseNumber + specialty), so it lands on the existing
 * backend path that sets `hcpStatus = "pending"` and queues the admin review
 * and the acknowledgement email.
 *
 * Registered at /hcp/signup — MUST be declared before /hcp/:slug in App.tsx.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, ShieldCheck, Stethoscope, Store, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const providerSchema = z
  .object({
    fullName: z.string().min(2, { message: "Full name is required" }),
    email: z.string().email({ message: "Please enter a valid email" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
    licenseNumber: z.string().min(1, { message: "License number is required" }),
    specialty: z.string().min(1, { message: "Specialty is required" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProviderFormValues = z.infer<typeof providerSchema>;

const perks = [
  {
    icon: Store,
    title: "Your own storefront",
    body: "A page at your own link, stocked with the recovery products you recommend.",
  },
  {
    icon: Stethoscope,
    title: "Professional pricing",
    body: "Access to professional-grade products and member pricing.",
  },
  {
    icon: ShieldCheck,
    title: "Verified provider status",
    body: "A verified badge on your storefront once your credentials are approved.",
  },
  {
    icon: Clock,
    title: "Reviewed quickly",
    body: "We review your credentials and email you as soon as you're approved.",
  },
];

export default function HcpSignupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { firebaseLoginMutation } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      licenseNumber: "",
      specialty: "",
    },
  });

  const onSubmit = async (data: ProviderFormValues) => {
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(result.user, { displayName: data.fullName });
      const idToken = await result.user.getIdToken();

      firebaseLoginMutation.mutate(
        {
          idToken,
          email: data.email,
          fullName: data.fullName,
          // Always a provider application on this page — this is what makes the
          // backend set hcpStatus="pending" and notify the admin team.
          isHcpApplication: true,
          licenseNumber: data.licenseNumber,
          specialty: data.specialty,
        },
        {
          onSuccess: () => {
            toast({
              title: "Application submitted",
              description: "We'll review your credentials and email you once approved.",
            });
            navigate("/hcp/dashboard");
          },
        }
      );
    } catch (error: any) {
      let message = "Failed to create account";
      if (error?.code === "auth/email-already-in-use") {
        message = "An account with this email already exists";
      } else if (error?.code === "auth/weak-password") {
        message = "Password is too weak";
      }
      toast({ title: "Registration failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start max-w-6xl mx-auto">
        {/* Left: what a provider account gets you */}
        <div>
          <h1 className="text-4xl font-montserrat font-bold text-primary mb-4">
            Become a Healthcare Provider
          </h1>
          <p className="text-xl text-secondary mb-8">
            Join the Active Recovery 360 provider network and get your own storefront for the
            recovery products you recommend to your patients.
          </p>

          <div className="space-y-6 mb-8">
            {perks.map((p) => (
              <div key={p.title} className="flex">
                <div className="bg-primary bg-opacity-10 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <p.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-montserrat font-bold text-primary text-lg mb-1">
                    {p.title}
                  </h3>
                  <p className="text-secondary">{p.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted/30 rounded-lg p-5">
            <h3 className="font-montserrat font-bold text-primary mb-2">
              Already a member?
            </h3>
            <p className="text-secondary text-sm mb-3">
              Membership and provider accounts are separate. If you're looking for member
              pricing rather than a storefront, register as a member instead.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/auth?tab=register">Register as a member</Link>
            </Button>
          </div>
        </div>

        {/* Right: the provider registration form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Provider Registration</CardTitle>
              <CardDescription>
                Your credentials are reviewed before your storefront is activated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Dr. Jane Smith"
                            data-testid="hcp-signup-fullname"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@yourpractice.com"
                            data-testid="hcp-signup-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="At least 6 characters"
                              data-testid="hcp-signup-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password *</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Repeat your password"
                              data-testid="hcp-signup-confirm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-l-4 border-blue-400 bg-blue-50/30 rounded-r-md p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold text-blue-900">Professional Information</h3>
                      <p className="text-sm text-muted-foreground">
                        Reviewed by our team before your storefront is activated.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your professional license number"
                              data-testid="hcp-signup-license"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specialty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialty *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Physical Therapy, Sports Medicine"
                              data-testid="hcp-signup-specialty"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || firebaseLoginMutation.isPending}
                    data-testid="hcp-signup-submit"
                  >
                    {isLoading || firebaseLoginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting application...
                      </>
                    ) : (
                      "Submit Provider Application"
                    )}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                    Already have a provider account?{" "}
                    <Link href="/auth" className="text-primary underline">
                      Sign in
                    </Link>
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
