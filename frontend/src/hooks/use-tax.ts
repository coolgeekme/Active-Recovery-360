import { useQuery } from "@tanstack/react-query";

export interface TaxConfig {
  enabled: boolean;
  /** Basis points: 910 == 9.10%. */
  rateBps: number;
  /** State codes the client collects in. */
  states: string[];
  /** Whether delivery charges are part of the taxable base (AZ: yes). */
  taxShipping: boolean;
  label: string;
}

/** Mirrors the server default so the UI stays sane if the request fails. */
const FALLBACK: TaxConfig = {
  enabled: true,
  rateBps: 910,
  states: ["AZ"],
  taxShipping: true,
  label: "AZ sales tax",
};

export function useTaxConfig() {
  const query = useQuery<TaxConfig>({
    queryKey: ["/api/tax/config"],
    staleTime: 5 * 60 * 1000,
  });

  return {
    config: query.data ?? FALLBACK,
    isLoading: query.isLoading,
  };
}

const STATE_NAMES: Record<string, string> = {
  ARIZONA: "AZ",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  NEVADA: "NV",
  "NEW MEXICO": "NM",
  TEXAS: "TX",
  UTAH: "UT",
};

/** Best-effort two-letter state code from free-text. Mirrors services/tax.py. */
export function normaliseState(value: string | null | undefined): string {
  const text = (value || "").trim().toUpperCase();
  if (!text) return "";
  if (text.length === 2 && /^[A-Z]{2}$/.test(text)) return text;
  if (STATE_NAMES[text]) return STATE_NAMES[text];
  for (const token of text.replace(/,/g, " ").split(/\s+/)) {
    if (token.length === 2 && /^[A-Z]{2}$/.test(token)) return token;
  }
  return "";
}

/**
 * Tax owed on a cart. Same rule as services/tax.py — the server is the
 * authority; this only drives the pre-submit summary.
 */
export function calcTax(
  goodsCents: number,
  shippingCents: number,
  state: string,
  config: TaxConfig
): number {
  if (!config.enabled) return 0;
  const code = normaliseState(state);
  if (!code || !config.states.includes(code)) return 0;

  let base = Math.max(0, goodsCents || 0);
  if (config.taxShipping) base += Math.max(0, shippingCents || 0);
  if (base === 0 || config.rateBps <= 0) return 0;

  // Integer money math with half-up rounding, matching the server.
  return Math.floor((base * config.rateBps + 5000) / 10000);
}

/** "9.1%" from 910 basis points — drops trailing zeros. */
export function formatRate(rateBps: number): string {
  return `${parseFloat((rateBps / 100).toFixed(2))}%`;
}
