import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Lock, ArrowLeft } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useLocation } from "wouter";
import { useAffiliateRef } from "@/hooks/use-affiliate-ref";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Vite inlines VITE_* at BUILD time, so a missing key means this bundle was
// compiled without it. We deliberately do NOT fall back to "pay later":
// silently accepting an unpaid order is exactly the bug this replaced.
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

interface CheckoutFormProps {
  /** Order grand total in cents — goods after discount PLUS shipping PLUS tax. */
  orderTotal: number;
  discountCode?: string;
  hcpReferralSlug?: string | null;
  /** Lifts the state field up so the order summary can price sales tax. */
  onStateChange?: (state: string) => void;
}

const checkoutFormSchema = z.object({
  fullName: z.string().min(3, { message: "Full name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  address: z.string().min(5, { message: "Address is required" }),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().min(2, { message: "State is required" }),
  zipCode: z.string().min(5, { message: "Zip code is required" }),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (cents || 0) / 100
  );

/**
 * Step 2 of checkout: the card form. Lives inside <Elements> so it can use the
 * Stripe hooks. Charges the STORED order total, then asks the server to verify
 * the payment before anything is treated as paid.
 */
function PaymentStep({
  orderId,
  amount,
  onPaid,
  onBack,
}: {
  orderId: string;
  amount: number;
  onPaid: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isPaying, setIsPaying] = useState(false);

  const handlePay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsPaying(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Only used when the card requires a 3DS redirect.
        return_url: window.location.origin + "/account/orders",
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsPaying(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        await apiRequest("POST", `/api/orders/${orderId}/confirm-payment`, {
          paymentIntentId: paymentIntent.id,
        });
        onPaid();
      } catch (e: any) {
        toast({
          title: "Could not confirm payment",
          description:
            e?.message ||
            "Your card was charged but we could not record the order. Please contact us.",
          variant: "destructive",
        });
      }
    }
    setIsPaying(false);
  };

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>
            Card details are handled by Stripe. They never touch our server.
          </span>
        </div>
        <PaymentElement />
      </div>

      <div className="bg-primary/5 p-4 rounded-lg flex justify-between font-bold">
        <span>Amount due</span>
        <span className="text-primary" data-testid="payment-amount">
          {formatPrice(amount)}
        </span>
      </div>

      <Button
        type="submit"
        className="w-full btn-primary-enhanced py-3 rounded font-montserrat"
        disabled={!stripe || isPaying}
        data-testid="pay-now-btn"
      >
        {isPaying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing payment…
          </>
        ) : (
          `Pay ${formatPrice(amount)}`
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onBack}
        disabled={isPaying}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to shipping details
      </Button>
    </form>
  );
}

export default function CheckoutForm({
  orderTotal,
  discountCode,
  hcpReferralSlug,
  onStateChange,
}: CheckoutFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [step, setStep] = useState<"details" | "payment">("details");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [serverTotal, setServerTotal] = useState<number>(orderTotal);
  const { toast } = useToast();
  const { clearCart, cartItems } = useCart();
  const [, navigate] = useLocation();
  const { affiliateRef, clear: clearAffiliateRef } = useAffiliateRef();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  /** Step 1: create the order (server prices it), then raise a PaymentIntent. */
  const onDetailsSubmit = async (data: CheckoutFormValues) => {
    setIsSubmitting(true);
    try {
      const shippingAddress = `${data.address}, ${data.city}, ${data.state} ${data.zipCode}`;

      // apiRequest resolves to a Response — it does NOT parse JSON for us.
      const orderRes = await apiRequest("POST", "/api/orders", {
        shippingAddress,
        // Sent separately so the server prices sales tax without parsing a
        // free-text address.
        shippingState: data.state,
        discountCode: discountCode || undefined,
        hcpReferralSlug: hcpReferralSlug || undefined,
        // Both refs are sent; the SERVER enforces precedence (HCP wins) so the
        // rule lives in exactly one place.
        affiliateRef: affiliateRef?.ref || undefined,
        items: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variantSku: i.variantSku,
        })),
      });

      const order: any = await orderRes.json();
      if (!order?.id) throw new Error("Order could not be created");

      const intentRes = await apiRequest(
        "POST",
        `/api/orders/${order.id}/payment-intent`,
        {}
      );
      const intent: any = await intentRes.json();

      if (!intent?.clientSecret) {
        throw new Error("Payment could not be started");
      }

      setOrderId(order.id);
      setClientSecret(intent.clientSecret);
      // The server's total is authoritative — it may differ from the client's
      // estimate if a price changed while the cart was open.
      setServerTotal(intent.amount ?? order.totalAmount ?? orderTotal);
      setStep("payment");
    } catch (e: any) {
      // apiRequest throws "403: {json}" style messages — surface the useful part.
      let detail = e?.message || "There was a problem preparing your order.";
      const jsonStart = detail.indexOf("{");
      if (jsonStart >= 0) {
        try {
          const parsed = JSON.parse(detail.slice(jsonStart));
          if (parsed?.detail) detail = String(parsed.detail);
        } catch {
          /* keep the raw message */
        }
      }
      toast({
        title: "Could not start checkout",
        description: detail,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPaid = async () => {
    setIsComplete(true);
    // Only clear the cart AFTER money is captured.
    await clearCart();
    clearAffiliateRef();
    try {
      window.localStorage.removeItem("ar360_hcp_referral");
      window.dispatchEvent(
        new StorageEvent("storage", { key: "ar360_hcp_referral" })
      );
    } catch {
      /* noop */
    }
    setTimeout(() => navigate("/account/orders"), 3000);
  };

  if (isComplete) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">
          Payment received!
        </h2>
        <p className="text-muted-foreground mb-6">
          Thanks — your order is confirmed and paid. We'll email you tracking
          information once it ships.
        </p>
        <div className="flex justify-center space-x-4">
          <Button variant="outline" asChild>
            <a href="/shop">Continue Shopping</a>
          </Button>
          <Button asChild>
            <a href="/account/orders">View Orders</a>
          </Button>
        </div>
      </div>
    );
  }

  // No publishable key baked into this build — refuse rather than take an
  // order we cannot collect payment for.
  if (!stripePromise) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-900 mb-2">
          Online payment is unavailable
        </h2>
        <p className="text-sm text-red-800">
          Card payments are not configured on this site yet. Please contact us
          at{" "}
          <a className="underline" href="mailto:info@activerecovery360.com">
            info@activerecovery360.com
          </a>{" "}
          to place your order.
        </p>
      </div>
    );
  }

  return (
    <div>
      {step === "details" ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onDetailsSubmit)}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">
                Shipping Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="123 Main St, Apt 4B" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Phoenix" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="AZ"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            onStateChange?.(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input placeholder="85001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full btn-primary-enhanced py-3 rounded font-montserrat"
              disabled={isSubmitting}
              data-testid="continue-to-payment"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing payment…
                </>
              ) : (
                "Continue to Payment"
              )}
            </Button>
          </form>
        </Form>
      ) : (
        clientSecret &&
        orderId && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "stripe" } }}
          >
            <PaymentStep
              orderId={orderId}
              amount={serverTotal}
              onPaid={onPaid}
              onBack={() => setStep("details")}
            />
          </Elements>
        )
      )}
    </div>
  );
}
