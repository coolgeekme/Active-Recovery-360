import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { Product } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "ar360_cart_v1";

export interface CartItem {
  id: string;            // local UUID-like id (purely for React keys)
  productId: string;
  quantity: number;
  variantSku?: string;
  product: Product;      // snapshot at time of add
  variantImageUrl?: string | null;
}

type CartContextType = {
  cartItems: CartItem[];
  isLoading: boolean;
  error: Error | null;
  addToCart: (productId: string, quantity: number, variantSku?: string) => Promise<void>;
  updateCartItemQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

export const CartContext = createContext<CartContextType | null>(null);

function loadFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* localStorage may be unavailable (e.g. in private mode) — ignore */
  }
}

function genId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Persist on every change
  useEffect(() => {
    saveToStorage(cartItems);
  }, [cartItems]);

  const addToCart = useCallback(
    async (productId: string, quantity: number, variantSku?: string) => {
      try {
        setIsLoading(true);
        // Fetch fresh product info (includes variant pricing/imageUrl)
        const res = await apiRequest("GET", `/api/products/${productId}`);
        const product: Product = await res.json();

        const variant = variantSku
          ? product.variants?.find((v) => v.sku === variantSku)
          : undefined;
        const variantImageUrl = variant?.imageUrl ?? null;

        setCartItems((prev) => {
          // Merge with same productId+variantSku
          const idx = prev.findIndex(
            (i) => i.productId === productId && i.variantSku === variantSku
          );
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
            return next;
          }
          return [
            ...prev,
            {
              id: genId(),
              productId,
              quantity,
              variantSku,
              product,
              variantImageUrl,
            },
          ];
        });
      } catch (e: any) {
        setError(e);
        toast({
          title: "Error",
          description: "Failed to add item to cart",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const updateCartItemQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      setCartItems((prev) =>
        prev.map((i) => (i.id === cartItemId ? { ...i, quantity } : i))
      );
    },
    []
  );

  const removeFromCart = useCallback(async (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== cartItemId));
  }, []);

  const clearCart = useCallback(async () => {
    setCartItems([]);
  }, []);

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
