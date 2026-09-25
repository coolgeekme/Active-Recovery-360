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
import { Loader2, CheckCircle2 } from "lucide-react";
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

interface CheckoutFormProps {
  subtotal: number;
  discountCode?: string;
  hcpReferralSlug?: string | null;
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

export default function CheckoutForm({ subtotal, discountCode, hcpReferralSlug }: CheckoutFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
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

  const onSubmit = async (data: CheckoutFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Create order with shipping address and current cart items (local cart)
      const shippingAddress = `${data.address}, ${data.city}, ${data.state} ${data.zipCode}`;

      await apiRequest("POST", "/api/orders", {
        shippingAddress,
        // No card is collected or charged online — the team arranges payment
        // after the order is received. The backend ignores this field.
        paymentMethod: "pay_later",
        discountCode: discountCode || undefined,
        hcpReferralSlug: hcpReferralSlug || undefined,
        // Affiliate attribution. Both refs are sent; the SERVER enforces
        // precedence (HCP referral wins) so the rule lives in exactly one place.
        affiliateRef: affiliateRef?.ref || undefined,
        items: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variantSku: i.variantSku,
        })),
      });
      
      // After a successful order, clear the cart and both referral sources.
      // The order doc now holds the attribution, so clearing client-side is safe.
      await clearCart();
      clearAffiliateRef();
      try {
        window.localStorage.removeItem("ar360_hcp_referral");
        window.dispatchEvent(new StorageEvent("storage", { key: "ar360_hcp_referral" }));
      } catch {
        /* noop */
      }
      
      setIsComplete(true);
      
      toast({
        title: "Order received!",
        description: "We'll be in touch to arrange payment.",
      });
      
      // Redirect to account/orders page after a delay
      setTimeout(() => {
        navigate("/account/orders");
      }, 3000);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error placing order",
        description: "There was a problem processing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  if (isComplete) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">Order Received!</h2>
        <p className="text-muted-foreground mb-6">
          Thanks — your order has been received. Our team will contact you
          shortly to arrange payment and confirm shipping.
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-primary mb-4">Shipping Information</h2>
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
                    <Input placeholder="New York" {...field} />
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
                    <Input placeholder="NY" {...field} />
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
                    <Input placeholder="10001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-primary mb-4">Payment</h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              <strong>Payment is not collected online.</strong> Once you submit
              your order, our team will contact you to arrange payment and
              confirm shipping — no card details are needed now.
            </p>
          </div>
        </div>
            

        <div className="bg-primary/5 p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Shipping</span>
            <span>{formatPrice(0)}</span>
          </div>
          <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary">{formatPrice(subtotal)}</span>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full btn-primary-enhanced py-3 rounded font-montserrat"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            `Submit Order - ${formatPrice(subtotal)}`
          )}
        </Button>
      </form>
    </Form>
  );
}
