import { useState } from "react";
import { Link } from "wouter";
import { Product } from "@shared/schema";
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

  // Determine if the user can view the product based on visibility
  const canView = () => {
    if (product.visibility === "public") return true;
    if (product.visibility === "member" && user?.isMember) return true;
    if (product.visibility === "doctor" && user?.isDoctor) return true;
    return false;
  };

  // Determine if the user can purchase the product
  const canPurchase = () => {
    return user?.isMember && canView();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  const handleAddToCart = async () => {
    if (!canPurchase()) {
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please log in to add items to your cart",
          variant: "destructive",
        });
        return;
      }
      if (!user.isMember) {
        toast({
          title: "Membership Required",
          description: "You need to be a member to purchase this product",
          variant: "destructive",
        });
        return;
      }
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
            src={product.imageUrl || "https://via.placeholder.com/500x300?text=No+Image"} 
            alt={product.name} 
            className="w-full h-48 object-cover cursor-pointer"
          />
        </Link>
        <div className="absolute top-2 right-2">
          {renderVisibilityBadge()}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-montserrat font-bold text-primary text-lg mb-1 hover:text-primary/80 transition cursor-pointer">
            {product.name}
          </h3>
        </Link>
        <p className="text-secondary text-sm mb-3 flex-grow">{product.description}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-primary font-bold">{formatPrice(product.price)}</span>
          {canPurchase() ? (
            <Button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="bg-primary text-white px-3 py-1 rounded text-sm font-montserrat hover:bg-opacity-90 transition"
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
              className="bg-primary text-white px-3 py-1 rounded text-sm font-montserrat hover:bg-opacity-90 transition"
            >
              <Link href={`/product/${product.id}`}>View Details</Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
