import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Tag, X } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

interface CheckoutFormProps {
  appliedDiscount: any;
  setAppliedDiscount: (discount: any) => void;
  createPaymentIntent: (discountCode?: string) => Promise<void>;
}

function CheckoutForm({ 
  appliedDiscount, 
  setAppliedDiscount, 
  createPaymentIntent 
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Discount code state
  const [discountCode, setDiscountCode] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [originalAmount] = useState(49);
  
  // Calculate final amount
  const calculateFinalAmount = () => {
    if (!appliedDiscount) return originalAmount;
    
    if (appliedDiscount.discountType === "percentage") {
      return originalAmount - (originalAmount * appliedDiscount.discountValue / 100);
    } else {
      // Fixed discount (in cents, convert to dollars)
      return Math.max(0, originalAmount - (appliedDiscount.discountValue / 100));
    }
  };
  
  const finalAmount = calculateFinalAmount();
  
  // Apply discount code
  const applyDiscountCode = async () => {
    if (!discountCode.trim()) {
      toast({
        title: "Please enter a discount code",
        variant: "destructive",
      });
      return;
    }
    
    setDiscountLoading(true);
    try {
      // Recreate payment intent with discount code
      await createPaymentIntent(discountCode.trim().toUpperCase());
      
      toast({
        title: "Discount Applied!",
        description: "Your membership price has been updated.",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Invalid discount code";
      toast({
        title: "Discount Code Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDiscountLoading(false);
    }
  };
  
  // Remove applied discount
  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    toast({
      title: "Discount Removed",
    });
  };

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
          {/* Pricing Display */}
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">AR360 Membership</h3>
                <p className="text-sm text-gray-600 mt-1">Lifetime access to exclusive products</p>
              </div>
              <div className="text-right">
                {appliedDiscount && (
                  <div className="text-sm text-gray-500 line-through">
                    ${originalAmount.toFixed(2)}
                  </div>
                )}
                <div className="text-2xl font-bold text-primary">
                  ${finalAmount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">one-time</div>
              </div>
            </div>
          </div>
            
            {/* Applied Discount Display */}
            {appliedDiscount && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-green-800">
                        {appliedDiscount.code}
                      </div>
                      <div className="text-xs text-green-700">
                        {appliedDiscount.description}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeDiscount}
                    className="text-green-600 hover:text-green-800 hover:bg-green-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 text-xs text-green-800">
                  Discount: ${(originalAmount - finalAmount).toFixed(2)} off
                </div>
              </div>
            )}

          {/* Discount Code Section */}
          {!appliedDiscount && (
            <div className="mb-6">
              <Label htmlFor="discount-code" className="text-sm font-medium">
                Have a discount code?
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="discount-code"
                  type="text"
                  placeholder="Enter discount code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyDiscountCode();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyDiscountCode}
                  disabled={discountLoading || !discountCode.trim()}
                >
                  {discountLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            </div>
          )}

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
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [elementsKey, setElementsKey] = useState(0); // Key to force Elements remount
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Create or recreate payment intent
  const createPaymentIntent = async (discountCode?: string) => {
    if (!user) return;
    
    try {
      const response = await apiRequest("POST", "/api/create-payment-intent", { 
        amount: 49,
        discountCode: discountCode
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setElementsKey(prev => prev + 1); // Force Elements to remount with new clientSecret
      
      if (data.appliedDiscount) {
        setAppliedDiscount(data.appliedDiscount);
      } else {
        setAppliedDiscount(null);
      }
    } catch (error) {
      console.error("Error creating payment intent:", error);
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };

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

    // Create initial payment intent for membership
    if (user) {
      createPaymentIntent();
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
    <Elements key={elementsKey} stripe={stripePromise} options={options}>
      <CheckoutForm 
        appliedDiscount={appliedDiscount}
        setAppliedDiscount={setAppliedDiscount}
        createPaymentIntent={createPaymentIntent}
      />
    </Elements>
  );
}