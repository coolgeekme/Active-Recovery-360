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

/**
 * Report a completed sale to GoAffPro.
 *
 * GoAffPro's DOCUMENTED server-side endpoint (api.goaffpro.com/order_complete)
 * rejects every request from a custom-SDK store with "No payload or invalid
 * payload sent with the conversion callback". That was verified against this
 * live shop with a real referral code AND synthetic ones, on both the `api`
 * and `api2` hosts, in JSON and form encoding — always the same rejection.
 * Their docs only fully describe that endpoint for Shopify stores.
 *
 * What actually works is the loader's own client-side function,
 * `goaffproTrackConversion`, which posts the enriched order to
 * api2.goaffpro.com/order_complete and answers "OK". So the browser reports
 * the sale, exactly as GoAffPro's Custom SDK guide describes.
 *
 * Only ever called after the backend has verified the Stripe capture, so this
 * can never report an unpaid order.
 */
export function reportAffiliateConversion(order: any): void {
  if (typeof window === "undefined") return;
  const track = (window as any).goaffproTrackConversion;
  // Loader blocked, shop id unset, or the script failed — stay silent.
  if (typeof track !== "function") return;
  if (!order) return;
  // HCP PRECEDENCE: the backend sets this false when a provider storefront
  // earned the sale, so one order can never pay two commissions.
  if (order.goaffproClientSync === false) return;

  const total = Number(order.totalAmount) || 0;
  const shipping = Number(order.shippingAmount) || 0;
  const tax = Number(order.taxAmount) || 0;
  const discount = Number(order.discountAmount) || 0;
  const id = String(order.id || "");

  try {
    track({
      id,
      number: `#${id.slice(-8).toUpperCase()}`,
      total,
      // GoAffPro defines subtotal as "order total minus shipping and taxes".
      subtotal: Math.max(0, total - shipping - tax),
      discount,
      shipping,
      tax,
      currency: "USD",
      // Process as a custom order — skips platform order enrichment, which
      // does not exist for a bespoke store.
      forceSDK: true,
    });
  } catch {
    // A third-party failure must never break a completed checkout.
  }
}
