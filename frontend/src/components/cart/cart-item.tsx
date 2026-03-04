import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface CartItemProps {
  id: number;
  product: Product;
  quantity: number;
}

export default function CartItem({ id, product, quantity }: CartItemProps) {
  const { updateCartItemQuantity, removeFromCart } = useCart();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      setIsUpdating(true);
      await updateCartItemQuantity(id, newQuantity);
    } catch (error) {
      console.error("Error updating quantity:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsRemoving(true);
      await removeFromCart(id);
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  return (
    <div className="flex items-center py-4 border-b border-gray-200">
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden mr-4">
        <img 
          src={product.imageUrl || "https://via.placeholder.com/80x80?text=Product"} 
          alt={product.name} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-grow">
        <Link href={`/product/${product.id}`}>
          <h4 className="font-montserrat font-medium text-primary hover:text-primary/80 transition cursor-pointer">
            {product.name}
          </h4>
        </Link>
        <p className="text-sm text-secondary mt-1">{formatPrice(product.price)} each</p>
        
        <div className="flex items-center mt-2">
          <div className="flex items-center border rounded overflow-hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-none"
              onClick={() => handleUpdateQuantity(quantity - 1)}
              disabled={quantity <= 1 || isUpdating}
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            <div className="px-3 py-1 text-sm">
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                quantity
              )}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-none"
              onClick={() => handleUpdateQuantity(quantity + 1)}
              disabled={isUpdating}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-2 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-shrink-0 font-semibold text-primary">
        {formatPrice(product.price * quantity)}
      </div>
    </div>
  );
}
