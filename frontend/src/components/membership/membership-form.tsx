import { useState } from "react";
import { useLocation } from "wouter";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

const MEMBERSHIP_PRICE = 29;

interface MembershipFormProps {
  onSuccess?: () => void;
}

export default function MembershipForm({ onSuccess }: MembershipFormProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isPending, setIsPending] = useState(false);

  const handleContinue = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setIsPending(true);
    // Real payment happens on the Stripe checkout page.
    navigate("/membership/checkout");
  };

  if (user?.isMember) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">You're Already a Member!</CardTitle>
          <CardDescription className="text-center">
            Thank you for being part of Active Recovery 360.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className="bg-primary/10 rounded-full p-4 mb-4">
            <CheckIcon className="h-8 w-8 text-primary" />
          </div>
          <p className="text-center text-muted-foreground">
            You already have full access to all member benefits and exclusive products.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" onClick={() => navigate("/shop")}>
            Browse Member-Only Products
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto" id="membership-form">
      <CardHeader>
        <CardTitle className="text-center">Become a Member</CardTitle>
        <CardDescription className="text-center">
          Join our recovery community for a one-time fee of ${MEMBERSHIP_PRICE}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-primary bg-opacity-5 p-4 rounded mb-4">
          <div className="flex items-center mb-2">
            <CheckIcon className="h-5 w-5 text-primary mr-2" />
            <span className="text-primary font-semibold">
              One-time payment of ${MEMBERSHIP_PRICE}
            </span>
          </div>
          <div className="flex items-center mb-2">
            <CheckIcon className="h-5 w-5 text-primary mr-2" />
            <span className="text-primary">FREE Recovery Kit ($39 value)</span>
          </div>
          <div className="flex items-center mb-2">
            <CheckIcon className="h-5 w-5 text-primary mr-2" />
            <span className="text-primary">FREE Active Recovery 360 t-shirt</span>
          </div>
          <div className="flex items-center">
            <CheckIcon className="h-5 w-5 text-primary mr-2" />
            <span className="text-primary">Lifetime access to member products</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          You'll be asked for your payment details, t-shirt size, and shipping address on the
          next step.
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-primary text-white py-3 rounded font-montserrat font-semibold hover:bg-opacity-90 transition"
          disabled={isPending}
          onClick={handleContinue}
        >
          {isPending ? "Loading…" : `Continue to Checkout — $${MEMBERSHIP_PRICE}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
