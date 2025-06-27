import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/membership-success",
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Confirm the membership payment on the backend
      try {
        await apiRequest("POST", "/api/confirm-membership-payment", {
          paymentIntentId: paymentIntent.id,
        });
        
        toast({
          title: "Welcome to AR360!",
          description: "Your membership has been activated successfully.",
        });
        
        navigate("/");
      } catch (error) {
        toast({
          title: "Error",
          description: "Payment succeeded but failed to activate membership. Please contact support.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Complete Your Membership</CardTitle>
          <CardDescription className="text-center">
            Welcome, {user?.fullName}! Complete your payment to unlock exclusive recovery products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-primary/5 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">AR360 Membership</h3>
                <p className="text-sm text-muted-foreground">Lifetime access to exclusive products</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">$49</div>
                <div className="text-sm text-muted-foreground">one-time</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={!stripe || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                "Complete Membership Purchase"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MembershipCheckoutPage() {
  const [clientSecret, setClientSecret] = useState("");
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user?.isMember) {
      toast({
        title: "Already a Member",
        description: "You already have an active membership.",
      });
      navigate("/");
      return;
    }

    // Create payment intent for membership
    if (user) {
      apiRequest("POST", "/api/create-payment-intent", { amount: 49 })
        .then((response) => response.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          console.error("Error creating payment intent:", error);
          toast({
            title: "Error",
            description: "Failed to initialize payment. Please try again.",
            variant: "destructive",
          });
        });
    }
  }, [user, authLoading, navigate, toast]);

  if (authLoading) {
    return (
      <div className="container mx-auto py-12 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="container mx-auto py-12 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const options = {
    clientSecret,
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm />
    </Elements>
  );
}