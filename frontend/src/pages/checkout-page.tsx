import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useDiscountCode, calcDiscount } from "@/hooks/use-discount-code";
import { useHcpReferral } from "@/hooks/use-hcp-referral";
import { Loader2, Tag, X, CheckCircle2, Stethoscope } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CheckoutForm from "@/components/cart/checkout-form";

export default function CheckoutPage() {
  const { cartItems, isLoading } = useCart();
  const [, navigate] = useLocation();
  const { applied, error, isValidating, apply, clear } = useDiscountCode();
  const { referral, clear: clearReferral } = useHcpReferral();
  const [codeInput, setCodeInput] = useState("");

  // Calculate subtotal in cents
  const subtotal = cartItems.reduce(
    (total, item) => total + (item.product?.price || 0) * item.quantity,
    0
  );
  const discountAmount = calcDiscount(subtotal, applied);
  const finalTotal = subtotal - discountAmount;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price / 100);

  // Redirect if cart is empty
  useEffect(() => {
    if (!isLoading && cartItems.length === 0) {
      navigate("/shop");
    }
  }, [cartItems, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Your Cart is Empty</h2>
        <p className="text-secondary mb-6">Add some products to your cart before checking out.</p>
        <a href="/shop" className="text-primary hover:underline">Return to Shop</a>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-montserrat font-bold text-primary mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CheckoutForm
            subtotal={finalTotal}
            discountCode={applied?.code}
          />
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-6 sticky top-20">
            <h2 className="text-xl font-montserrat font-bold text-primary mb-4">Order Summary</h2>

            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.product?.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-medium">
                    {formatPrice((item.product?.price || 0) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* HCP referral notice */}
            {referral && (
              <div className="flex items-start justify-between gap-2 mb-4 p-3 rounded-md bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-2 text-sm text-blue-800">
                  <Stethoscope className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Order will be credited to:</p>
                    <p className="text-xs">{referral.name || referral.slug}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={clearReferral}
                  title="Remove HCP attribution"
                  data-testid="remove-hcp-referral-btn"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Discount code applicator */}
            <div className="mb-4" data-testid="discount-section">
              {!applied ? (
                <div>
                  <label className="text-sm font-medium flex items-center gap-1 mb-2">
                    <Tag className="h-3.5 w-3.5" />
                    Promo code
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      data-testid="discount-code-input"
                      className="uppercase"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        const ok = await apply(codeInput);
                        if (ok) setCodeInput("");
                      }}
                      disabled={isValidating || !codeInput.trim()}
                      data-testid="apply-discount-btn"
                    >
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  {error && (
                    <p className="text-xs text-destructive mt-2" data-testid="discount-error">
                      {error}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-2">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-semibold">{applied.code}</span>
                    <span className="text-green-600/80">— {applied.description}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={clear}
                    title="Remove discount"
                    data-testid="remove-discount-btn"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {applied && (
                <div className="flex justify-between text-green-700">
                  <span>
                    Discount {applied.discountType === "percentage"
                      ? `(${applied.discountValue}% off)`
                      : "(fixed)"}
                  </span>
                  <span data-testid="discount-amount">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatPrice(0)}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary" data-testid="checkout-total">
                {formatPrice(finalTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
