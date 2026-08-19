import { useState } from "react";
import { Link } from "wouter";
import { Product } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // All products are viewable by all users now
  const canView = () => true;

  // Anyone (including guests) can add to cart. Doctor-only products still
  // require a verified HCP account because they're regulated/restricted.
  // Provider-only pricing (hidePrice) products can be viewed but only purchased
  // by verified HCPs.
  const canPurchase = () => {
    if (product.visibility === "doctor" && !user?.isDoctor) return false;
    if (product.hidePrice && !user?.isDoctor) return false;
    return true;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  const handleAddToCart = async () => {
    if (!canPurchase()) {
      toast({
        title: "Healthcare professionals only",
        description: "This product requires verified HCP status.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingToCart(true);
      await addToCart(product.id, 1);
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add product to cart",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const renderVisibilityBadge = () => {
    switch (product.visibility) {
      case "public":
        return <Badge variant="public">PUBLIC</Badge>;
      case "member":
        return <Badge variant="member">MEMBERS</Badge>;
      case "doctor":
        return <Badge variant="doctor">DOCTOR</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
      <div className="relative">
        <Link href={`/product/${product.id}`}>
          <img 
            src={product.imageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"} 
            alt={product.name} 
            className="w-full h-48 object-cover cursor-pointer"
          />
        </Link>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-montserrat font-bold text-primary text-lg mb-1 hover:text-primary/80 transition cursor-pointer">
            {product.name}
          </h3>
        </Link>
        <p className="text-secondary text-sm mb-3 line-clamp-3">{product.description}</p>
        <div className="flex justify-between items-center mt-auto pt-2">
          {product.hidePrice && !user?.isDoctor ? (
            <span className="text-secondary text-sm font-montserrat font-semibold">
              Provider pricing only
            </span>
          ) : (
            <span className="text-primary font-bold">{formatPrice(product.price)}</span>
          )}
          {canPurchase() && !product.hasVariants ? (
            <Button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="bg-primary text-white px-3 py-1 text-sm font-montserrat hover:bg-opacity-90 transition"
              data-testid={`add-to-cart-${product.id}`}
            >
              {isAddingToCart ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add to Cart"
              )}
            </Button>
          ) : (
            <Button 
              asChild
              className="bg-primary text-white px-3 py-1 text-sm font-montserrat hover:bg-opacity-90 transition"
            >
              <Link href={`/product/${product.id}`}>View Details</Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
