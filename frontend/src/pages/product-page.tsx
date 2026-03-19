import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { 
  Loader2, 
  MinusCircle, 
  PlusCircle, 
  ShoppingCart, 
  Lock
} from "lucide-react";
import ProductGrid from "@/components/product/product-grid";

export default function ProductPage() {
  const { id } = useParams();
  const productId = id; // Keep as string for MongoDB ObjectId
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
  });

  // All products are viewable by all users now
  const canView = () => !!product;

  // Determine if the user can purchase the product
  // Only members can purchase products, with additional restrictions for doctor products
  const canPurchase = () => {
    if (!product || !user?.isMember) return false;
    
    // Doctor products can only be purchased by doctors
    if (product.visibility === "doctor" && !user.isDoctor) return false;
    
    return true;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  const handleIncreaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
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
      await addToCart(productId, quantity);
      toast({
        title: "Added to cart",
        description: `${product?.name} has been added to your cart`,
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Product Not Found</h2>
        <p className="text-secondary mb-6">The product you're looking for doesn't exist or may have been removed.</p>
        <a href="/shop" className="text-primary hover:underline">Return to Shop</a>
      </div>
    );
  }

  // Since we've updated the logic to allow all users to view all products,
  // this block should never be reached, but keeping it for safety
  if (!canView()) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Product Not Found</h2>
        <p className="text-secondary mb-6">The product you're looking for doesn't exist or may have been removed.</p>
        <a href="/shop" className="text-primary hover:underline">Return to Shop</a>
      </div>
    );
  }

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
    <div className="container mx-auto py-10 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Product Image */}
        <div>
          <div className="bg-white rounded-lg overflow-hidden shadow-lg">
            <img 
              src={product.imageUrl || "https://via.placeholder.com/500x500?text=No+Image"} 
              alt={product.name} 
              className="w-full h-auto object-contain aspect-square"
            />
          </div>
        </div>
        
        {/* Product Details */}
        <div>
          <div className="mb-2">
            {renderVisibilityBadge()}
            {product.featured && (
              <Badge variant="secondary" className="ml-2">FEATURED</Badge>
            )}
          </div>
          
          <h1 className="text-3xl font-montserrat font-bold text-primary mb-2">{product.name}</h1>
          
          <div className="text-2xl font-bold text-primary mb-4">
            {formatPrice(product.price)}
          </div>
          
          <p className="text-secondary mb-6">{product.description}</p>
          
          {canPurchase() ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleDecreaseQuantity}
                  disabled={quantity <= 1}
                >
                  <MinusCircle className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center mx-2 font-medium">{quantity}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleIncreaseQuantity}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="mr-2 h-5 w-5" />
                )}
                Add to Cart
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                {!user ? (
                  <div className="text-center">
                    <p className="text-secondary mb-4">You must be logged in and a member to purchase this product.</p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
                      <Button asChild>
                        <a href="/auth">Sign In</a>
                      </Button>
                      <Button asChild variant="outline">
                        <a href="/membership">Learn About Membership</a>
                      </Button>
                    </div>
                  </div>
                ) : !user.isMember ? (
                  <div className="text-center">
                    <p className="text-secondary mb-4">You need to be a member to purchase this product.</p>
                    <Button asChild>
                      <a href="/membership">Become a Member</a>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-secondary">You don't have access to purchase this product.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <div className="mt-6 border-t pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">Categories:</span>
                <span className="ml-2 text-secondary">Recovery, Therapy</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">Stock:</span>
                <span className="ml-2 text-secondary">{product.stockQuantity} available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Related Products */}
      <div className="mt-12">
        <Tabs defaultValue="related">
          <TabsList className="mb-6">
            <TabsTrigger value="related">Related Products</TabsTrigger>
            <TabsTrigger value="featured">Featured Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="related">
            <ProductGrid category={product.categoryId} limit={4} />
          </TabsContent>
          
          <TabsContent value="featured">
            <ProductGrid featured={true} limit={4} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
