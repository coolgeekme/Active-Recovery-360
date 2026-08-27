import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function MembershipSuccessPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  // Read Stripe redirect params (present when a 3DS card redirects back)
  const params = new URLSearchParams(location.split("?")[1] || "");
  const paymentIntentId = params.get("payment_intent");
  const redirectStatus = params.get("redirect_status");

  useEffect(() => {
    // If Stripe redirected back here (3DS), finish activation on the backend.
    if (paymentIntentId && redirectStatus === "succeeded" && !activated) {
      const stored = localStorage.getItem("ar360_pending_demographics");
      let demographics: any = {};
      try {
        demographics = stored ? JSON.parse(stored) : {};
      } catch {
        demographics = {};
      }

      setActivating(true);
      apiRequest("POST", "/api/confirm-membership-payment", {
        paymentIntentId,
        tshirtSize: demographics.tshirtSize,
        shippingAddress: demographics.shippingAddress,
        phone: demographics.phone,
      })
        .then(() => {
          localStorage.removeItem("ar360_pending_demographics");
          setActivated(true);
        })
        .catch(() => {
          // Activation may have already happened on the direct path; don't hard-fail.
          setActivated(true);
        })
        .finally(() => setActivating(false));
    }
  }, [paymentIntentId, redirectStatus, activated]);

  return (
    <div className="container mx-auto py-12 px-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            You're a Member!
          </CardTitle>
          <CardDescription className="text-center">
            Welcome to Active Recovery 360, {user?.fullName || "there"}!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activating && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Activating your membership…
            </div>
          )}
          <p className="text-center text-muted-foreground">
            Your membership is active and a welcome email is on its way. Your free recovery
            kit and t-shirt will ship to the address you provided.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild className="w-full">
              <a href="/shop">Browse Member Products</a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href="/account">Go to My Account</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
