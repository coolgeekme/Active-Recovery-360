/**
 * Persists the slug of the HCP storefront a customer last visited so we can
 * attribute their purchase to that HCP. Clears automatically on successful
 * checkout.
 */
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "ar360_hcp_referral";

export interface HcpReferral {
  slug: string;
  name?: string | null;
  capturedAt: number;
}

function read(): HcpReferral | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HcpReferral) : null;
  } catch {
    return null;
  }
}

function write(value: HcpReferral | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch {
    /* ignore quota/private mode errors */
  }
}

export function useHcpReferral() {
  const [referral, setReferral] = useState<HcpReferral | null>(() => read());

  // Cross-tab + same-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setReferral(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const capture = useCallback((slug: string, name?: string | null) => {
    const value: HcpReferral = {
      slug,
      name: name || null,
      capturedAt: Date.now(),
    };
    write(value);
    setReferral(value);
  }, []);

  const clear = useCallback(() => {
    write(null);
    setReferral(null);
  }, []);

  return { referral, capture, clear };
}
