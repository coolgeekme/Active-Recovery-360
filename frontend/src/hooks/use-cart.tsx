import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { CartItem, Product } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface CartItemWithProduct extends CartItem {
  product: Product;
}

type CartContextType = {
  cartItems: CartItemWithProduct[];
  isLoading: boolean;
  error: Error | null;
  addToCart: (productId: string, quantity: number, variantSku?: string) => Promise<void>;
  updateCartItemQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

export const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    data: cartItems = [],
    error,
    isLoading,
  } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user, // Only fetch cart if user is logged in
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity, variantSku }: { productId: string; quantity: number; variantSku?: string }) => {
      const body: any = { productId, quantity };
      if (variantSku) body.variantSku = variantSku;
      const res = await apiRequest("POST", "/api/cart", body);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  const updateCartItemMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      const res = await apiRequest("PUT", `/api/cart/${cartItemId}`, { quantity });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update cart",
        variant: "destructive",
      });
    },
  });

  const removeCartItemMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      await apiRequest("DELETE", `/api/cart/${cartItemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    },
  });

  const addToCart = async (productId: string, quantity: number, variantSku?: string) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to add items to cart",
        variant: "destructive",
      });
      return;
    }
    
    if (!user.isMember) {
      toast({
        title: "Membership required",
        description: "You need to be a member to add items to cart",
        variant: "destructive",
      });
      return;
    }
    
    await addToCartMutation.mutateAsync({ productId, quantity, variantSku });
  };

  const updateCartItemQuantity = async (cartItemId: string, quantity: number) => {
    await updateCartItemMutation.mutateAsync({ cartItemId, quantity });
  };

  const removeFromCart = async (cartItemId: string) => {
    await removeCartItemMutation.mutateAsync(cartItemId);
  };

  const clearCart = async () => {
    try {
      // In a real app, we'd have a dedicated endpoint for this
      // For now, we'll just remove each item one by one
      const operations = cartItems.map(item => removeFromCart(item.id));
      await Promise.all(operations);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isLoading,
        error,
        addToCart,
        updateCartItemQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
