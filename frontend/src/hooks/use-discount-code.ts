import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export interface AppliedDiscount {
  id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
}

/**
 * Computes the discount in cents given the cart subtotal (cents) and an
 * applied discount object.
 */
export function calcDiscount(subtotalCents: number, applied: AppliedDiscount | null): number {
  if (!applied) return 0;
  if (applied.discountType === "percentage") {
    return Math.min(subtotalCents, Math.round((subtotalCents * applied.discountValue) / 100));
  }
  // fixed-amount discount stored in cents
  return Math.min(subtotalCents, Math.round(applied.discountValue));
}

export function useDiscountCode() {
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const apply = async (code: string) => {
    setError(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a code");
      return null;
    }
    try {
      setIsValidating(true);
      const res = await apiRequest("POST", "/api/discount-codes/validate", { code: trimmed });
      const data = await res.json();
      if (data?.valid) {
        setApplied(data.discountCode);
        return data.discountCode as AppliedDiscount;
      }
      setError("Invalid discount code");
      return null;
    } catch (e: any) {
      // apiRequest throws "<status>: <body>"; body is FastAPI's {"detail":"..."}
      let msg = "Invalid discount code";
      const raw = (e?.message || "").replace(/^\d+:\s*/, "");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          msg = parsed?.detail || msg;
        } catch {
          msg = raw;
        }
      }
      setError(msg);
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const clear = () => {
    setApplied(null);
    setError(null);
  };

  return { applied, error, isValidating, apply, clear };
}
