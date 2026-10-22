import { useQuery } from "@tanstack/react-query";

export interface ShippingConfig {
  enabled: boolean;
  /** Flat rate in cents. */
  flatRate: number;
  /** Order amount (cents, post-discount) at which shipping becomes free. 0 = no offer. */
  freeShippingThreshold: number;
  label: string;
}

/** Mirrors the server default so the UI stays sane if the request fails. */
const FALLBACK: ShippingConfig = {
  enabled: true,
  flatRate: 800,
  freeShippingThreshold: 7500,
  label: "Standard shipping",
};

/**
 * Shipping rates for the storefront.
 *
 * The server is the authority — it prices the order in POST /api/orders and a
 * client-supplied figure is ignored. This hook only exists so the checkout
 * summary can show the same number before the order is submitted.
 */
export function useShippingConfig() {
  const query = useQuery<ShippingConfig>({
    queryKey: ["/api/shipping/config"],
    staleTime: 5 * 60 * 1000,
  });

  return {
    config: query.data ?? FALLBACK,
    isLoading: query.isLoading,
  };
}

/**
 * Shipping due on a cart, given the amount the customer is paying for GOODS
 * (i.e. subtotal after discount). Same rule as services/shipping.py.
 */
export function calcShipping(payableCents: number, config: ShippingConfig): number {
  if (!config.enabled) return 0;
  const payable = Math.max(0, payableCents || 0);
  if (config.freeShippingThreshold > 0 && payable >= config.freeShippingThreshold) {
    return 0;
  }
  return Math.max(0, config.flatRate || 0);
}

/** Cents still needed for free shipping; 0 when already free or no offer. */
export function amountUntilFreeShipping(payableCents: number, config: ShippingConfig): number {
  if (!config.enabled) return 0;
  if (config.freeShippingThreshold <= 0) return 0;
  return Math.max(0, config.freeShippingThreshold - Math.max(0, payableCents || 0));
}
