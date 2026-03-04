import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import CheckoutForm from "@/components/cart/checkout-form";

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cartItems, isLoading } = useCart();
  const [, navigate] = useLocation();

  // Calculate subtotal
  const subtotal = cartItems.reduce(
    (total, item) => total + (item.product?.price || 0) * item.quantity, 
    0
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

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
          <CheckoutForm subtotal={subtotal} />
        </div>
        
        <div>
          <div className="bg-white rounded-lg shadow p-6 sticky top-20">
            <h2 className="text-xl font-montserrat font-bold text-primary mb-4">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-medium">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatPrice(0)}</span>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
