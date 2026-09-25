/**
 * Injects GoAffPro's tracking script.
 *
 * The script is only injected when VITE_GOAFFPRO_SHOP_ID is set, so shipping
 * this code before the shop identifier exists produces no broken request to
 * GoAffPro — it simply does nothing until the key is configured.
 *
 * The shop identifier comes from:
 *   GoAffPro admin -> Settings -> Developer -> Debug Integration
 *
 * We inject at runtime rather than via a tag in index.html because a static
 * tag would render `?shop=` (empty) and fetch a useless URL in every build
 * that lacks the key.
 */
import { captureAffiliateRef } from "@/hooks/use-affiliate-ref";

const SHOP_ID = (import.meta.env.VITE_GOAFFPRO_SHOP_ID as string | undefined)?.trim();

const SCRIPT_ID = "goaffpro-loader";

export function initAffiliateTracking(): void {
  // Always capture from the URL first: an affiliate click may land before (or
  // without) loader.js, and a tracker blocker must not lose the referral.
  captureAffiliateRef();

  if (!SHOP_ID) {
    if (import.meta.env.DEV) {
      console.info(
        "[affiliate] VITE_GOAFFPRO_SHOP_ID not set — GoAffPro tracking disabled."
      );
    }
    return;
  }

  if (typeof document === "undefined") return;
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://api.goaffpro.com/loader.js?shop=${encodeURIComponent(SHOP_ID)}`;
  script.onerror = () => {
    // Never let a third-party failure break the page.
    console.warn("[affiliate] GoAffPro loader failed to load.");
  };
  document.head.appendChild(script);
}

/** True when the shop id is configured — surfaced in the admin view. */
export const affiliateTrackingConfigured = Boolean(SHOP_ID);
