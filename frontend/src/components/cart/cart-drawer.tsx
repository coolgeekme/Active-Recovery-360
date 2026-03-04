import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Loader2 } from "lucide-react";
import CartItem from "./cart-item";
import { Badge } from "@/components/ui/badge";

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { cartItems, isLoading } = useCart();
  const [, navigate] = useLocation();

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
  
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

  const handleCheckout = () => {
    setOpen(false);
    navigate("/checkout");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative p-2">
          <ShoppingCart className="h-6 w-6 text-secondary" />
          {totalItems > 0 && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
        </SheetHeader>
        
        <div className="flex-grow overflow-y-auto mt-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-muted-foreground mb-1">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Looks like you haven't added any products to your cart yet.
              </p>
              <SheetClose asChild>
                <Button asChild variant="outline">
                  <Link href="/shop">Browse Products</Link>
                </Button>
              </SheetClose>
            </div>
          ) : (
            <>
              {cartItems.map((item) => (
                <CartItem 
                  key={item.id} 
                  id={item.id} 
                  product={item.product} 
                  quantity={item.quantity} 
                />
              ))}
            </>
          )}
        </div>
        
        {cartItems.length > 0 && (
          <div className="mt-auto pt-4">
            <Separator className="mb-4" />
            
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            
            <div className="flex justify-between mb-4">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">{formatPrice(0)}</span>
            </div>
            
            <div className="flex justify-between mb-6">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-primary">{formatPrice(subtotal)}</span>
            </div>
            
            <Button 
              onClick={handleCheckout}
              className="w-full btn-primary-enhanced"
              disabled={cartItems.length === 0}
            >
              Proceed to Checkout
            </Button>
            
            <SheetClose asChild>
              <Button variant="outline" className="w-full mt-2">
                Continue Shopping
              </Button>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
