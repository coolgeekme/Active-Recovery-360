"""
GoAffPro conversion reporting for the AR360 shop.

GoAffPro's published server-side integration surface is a single endpoint
(https://docs.goaffpro.com — "Server-Side Integration"):

    POST https://api.goaffpro.com/order_complete
    {"ref": "<referral>", "shop": "<shop identifier>", "order_id": "<order id>"}

It is documented to be called "after the payment is processed". This shop takes
no online payment, so we call it when an admin marks an order `completed` — the
closest honest equivalent to "this sale is real" available today.

Three rules are load-bearing here:

  1. IDEMPOTENT   — the same order is never reported twice.
  2. FAIL SOFT    — a GoAffPro outage must never block an admin order update.
  3. HCP WINS     — an order carrying an HCP referral is NOT reported to
                    GoAffPro, so one sale can never pay two commissions.

Mirrors the never-raise contract of `services/email.py`: every path returns a
dict, nothing propagates.
"""
import logging
import os
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

ORDER_COMPLETE_URL = "https://api.goaffpro.com/order_complete"
REQUEST_TIMEOUT = 15.0

# The shop identifier from GoAffPro admin -> Settings -> Developer -> Debug
# Integration. The SAME value the frontend uses for loader.js.
GOAFFPRO_SHOP_ID = (os.environ.get("GOAFFPRO_SHOP_ID") or "").strip()

# Persisted on the order document as `goaffproSyncStatus`.
STATUS_SYNCED = "synced"
STATUS_FAILED = "failed"
STATUS_SKIPPED_HCP = "skipped_hcp_precedence"
STATUS_SKIPPED_NO_REF = "skipped_no_affiliate_ref"
STATUS_SKIPPED_UNCONFIGURED = "skipped_not_configured"
STATUS_SKIPPED_ALREADY = "skipped_already_synced"


def is_configured() -> bool:
    """True when a shop identifier is present."""
    return bool(GOAFFPRO_SHOP_ID)


def evaluate(order: dict) -> tuple[bool, str]:
    """Decide whether this order should be reported.

    Returns (should_report, reason). Pure — no I/O, no side effects — so the
    precedence and idempotency rules stay unit-testable.
    """
    # Idempotency first: a retry or double-click must never double-report.
    if order.get("goaffproSyncStatus") == STATUS_SYNCED:
        return False, STATUS_SKIPPED_ALREADY

    # HCP precedence: a first-party, explicit provider referral beats a
    # third-party cookie. Record both, pay one.
    if order.get("hcpReferralId"):
        return False, STATUS_SKIPPED_HCP

    ref = (order.get("affiliateRef") or "").strip()
    if not ref:
        return False, STATUS_SKIPPED_NO_REF

    if not is_configured():
        return False, STATUS_SKIPPED_UNCONFIGURED

    return True, "ok"


async def report_order(order: dict) -> dict:
    """Report one completed order to GoAffPro. Never raises.

    Returns {"status", "message", "reported"} where `status` is the value the
    caller should persist as `goaffproSyncStatus`.
    """
    should, reason = evaluate(order)
    if not should:
        return {
            "status": reason,
            "message": f"Not reported to GoAffPro ({reason})",
            "reported": False,
        }

    ref = str(order.get("affiliateRef")).strip()
    order_id = str(order.get("_id") or order.get("id") or "")
    if not order_id:
        return {
            "status": STATUS_FAILED,
            "message": "Order has no id — cannot report to GoAffPro",
            "reported": False,
        }

    payload = {"ref": ref, "shop": GOAFFPRO_SHOP_ID, "order_id": order_id}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(ORDER_COMPLETE_URL, json=payload)

        if response.status_code >= 400:
            body = response.text[:300]
            logger.error(
                "GoAffPro rejected order %s: HTTP %s %s",
                order_id, response.status_code, body,
            )
            return {
                "status": STATUS_FAILED,
                "message": f"HTTP {response.status_code}: {body}",
                "reported": False,
            }

        # GoAffPro answers HTTP 200 even when the request FAILED — failures come
        # back in the body, e.g. {"error":"shop not found <id>"}. Trusting the
        # status code alone would record a rejected conversion as "synced" and
        # silently lose the sale. Verified by probing the live endpoint.
        body_text = response.text[:300]
        try:
            body_json = response.json()
        except Exception:
            body_json = None

        if isinstance(body_json, dict) and body_json.get("error"):
            logger.error(
                "GoAffPro returned an error for order %s: %s", order_id, body_text
            )
            return {
                "status": STATUS_FAILED,
                "message": f"GoAffPro error: {body_json.get('error')}",
                "reported": False,
            }

        logger.info("GoAffPro conversion reported for order %s", order_id)
        return {
            "status": STATUS_SYNCED,
            "message": "Conversion reported to GoAffPro",
            "reported": True,
        }

    except Exception as exc:  # noqa: BLE001 — must never block the order update
        logger.error("GoAffPro sync failed for order %s: %s", order_id, exc)
        return {
            "status": STATUS_FAILED,
            "message": str(exc)[:300],
            "reported": False,
        }


def sync_fields(result: dict) -> dict:
    """Build the `$set` fragment recording a sync attempt on the order doc."""
    fields = {
        "goaffproSyncStatus": result.get("status"),
        "goaffproSyncMessage": result.get("message"),
        "goaffproSyncedAt": datetime.now(timezone.utc),
    }
    # Keep the last successful timestamp separate so a later failure is visible
    # without erasing the fact that a conversion did land.
    if result.get("reported"):
        fields["goaffproReportedAt"] = datetime.now(timezone.utc)
    return fields
