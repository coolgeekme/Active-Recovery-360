/**
 * GoAffPro affiliate attribution.
 *
 * Captures the affiliate referral so a purchase can be attributed server-side
 * at order time. This mirrors `use-hcp-referral.ts` deliberately: the two
 * systems sit on the SAME sale, and HCP referral WINS over affiliate
 * attribution (see `resolve_affiliate_ref` in backend/routes/orders.py).
 *
 * Source precedence:
 *   1. URL params on landing (?ref= / ?aff= / ?affiliate= / ?a=)
 *   2. The first-party cookie set by GoAffPro's loader.js
 *   3. A localStorage mirror with a TTL, for SPA navigations and for when a
 *      tracker blocker prevents loader.js from running
 *
 * We do NOT rely on GoAffPro's client-side conversion pixel: this app has no
 * thank-you page, so the sale is reported server-side instead.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ar360_affiliate_ref";

/** Mirror of GoAffPro's cookie duration (Settings > General > Cookie Duration). */
export const AFFILIATE_WINDOW_DAYS = 30;

const WINDOW_MS = AFFILIATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** URL params affiliate links may arrive on. */
const URL_PARAMS = ["ref", "aff", "affiliate", "a", "ga_ref"];

/**
 * GoAffPro sets a first-party, domain-scoped cookie. The exact name is not
 * published, so we probe the likely names and then fall back to a loose scan
 * for anything that looks affiliate-ish. `resolveAffiliateRef` prefers the
 * cookie, so a wrong guess degrades rather than breaks.
 */
const COOKIE_CANDIDATES = [
  "goaffpro_ref",
  "goaffproRef",
  "goaffpro",
  "ga_ref",
  "aff_ref",
  "affiliate_ref",
  "ref",
];

export interface AffiliateRef {
  ref: string;
  capturedAt: number;
  /** Where we picked it up — useful when debugging attribution. */
  source: "url" | "cookie" | "storage";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + escaped + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Best-effort discovery of GoAffPro's cookie without knowing its exact name. */
export function findAffiliateCookie(): string | null {
  for (const name of COOKIE_CANDIDATES) {
    const value = readCookie(name);
    if (value) return value;
  }
  if (typeof document === "undefined") return null;
  // Loose scan: any cookie whose NAME looks affiliate-related.
  for (const pair of document.cookie.split(";")) {
    const [rawName, ...rest] = pair.split("=");
    const name = (rawName || "").trim().toLowerCase();
    if (!rest.length) continue;
    if (name.includes("goaff") || name.includes("aff")) {
      const value = rest.join("=").trim();
      if (value) return decodeURIComponent(value);
    }
  }
  return null;
}

function readFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of URL_PARAMS) {
      const value = params.get(key);
      if (value && value.trim()) return value.trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readStored(): AffiliateRef | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AffiliateRef;
    if (!parsed?.ref) return null;
    // Respect the attribution window — never attribute a sale forever.
    if (Date.now() - (parsed.capturedAt || 0) > WINDOW_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(value: AffiliateRef | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/**
 * Resolve the ref to send with an order. The live cookie wins: GoAffPro
 * validates the ref on their side and knows its own window, so passing a
 * cookie value we did not invent is always the safer claim.
 */
export function resolveAffiliateRef(): AffiliateRef | null {
  const cookie = findAffiliateCookie();
  if (cookie) return { ref: cookie, capturedAt: Date.now(), source: "cookie" };
  return readStored();
}

/**
 * Capture on landing. Safe to call on every mount: only writes when it finds
 * a ref and nothing is already stored.
 */
export function captureAffiliateRef(): AffiliateRef | null {
  const fromUrl = readFromUrl();
  const existing = readStored();

  if (fromUrl) {
    // A fresh click always wins over a stale stored value.
    if (!existing || existing.ref !== fromUrl) {
      const value: AffiliateRef = {
        ref: fromUrl,
        capturedAt: Date.now(),
        source: "url",
      };
      writeStored(value);
      return value;
    }
    return existing;
  }

  const cookie = findAffiliateCookie();
  if (cookie && (!existing || existing.ref !== cookie)) {
    const value: AffiliateRef = {
      ref: cookie,
      capturedAt: Date.now(),
      source: "cookie",
    };
    writeStored(value);
    return value;
  }

  return existing;
}

export function useAffiliateRef() {
  const [affiliateRef, setAffiliateRef] = useState<AffiliateRef | null>(() =>
    captureAffiliateRef()
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setAffiliateRef(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const clear = useCallback(() => {
    writeStored(null);
    setAffiliateRef(null);
  }, []);

  return { affiliateRef, clear };
}
