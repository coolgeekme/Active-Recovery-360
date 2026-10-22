"""Shipping cost calculation.

Shipping is a plain flat rate with an optional free-shipping threshold. It is
deliberately NOT weight- or carrier-based: this storefront is pay-later (no card
is charged at checkout), so shipping is an invoiced number rather than a Stripe
amount, and a predictable flat rate is far easier for the team to honour than a
live carrier quote.

CONFIGURATION
-------------
Values come from the `settings` collection, doc `_id == "shipping"`, so changing
the rate is a data change and never a code deploy. Anything absent from that doc
falls back to DEFAULTS below. A missing or unreadable settings doc must never
break checkout, so every failure path degrades to the defaults.
"""
from services.database import get_collection

SETTINGS_ID = "shipping"

# $8.00 flat, free over $75.00 — placeholders until the client confirms.
DEFAULTS = {
    "enabled": True,
    "flatRate": 800,
    "freeShippingThreshold": 7500,
    "label": "Standard shipping",
}


def _normalise(raw: dict | None) -> dict:
    """Layer a stored doc over the defaults, ignoring junk values."""
    cfg = dict(DEFAULTS)
    if not raw:
        return cfg

    if "enabled" in raw:
        cfg["enabled"] = bool(raw["enabled"])

    for key in ("flatRate", "freeShippingThreshold"):
        if raw.get(key) is not None:
            try:
                cfg[key] = max(0, int(raw[key]))
            except (TypeError, ValueError):
                pass

    if raw.get("label"):
        cfg["label"] = str(raw["label"])[:60]

    return cfg


async def get_shipping_config() -> dict:
    """Current shipping config. Never raises — falls back to DEFAULTS."""
    try:
        settings = get_collection("settings")
        doc = await settings.find_one({"_id": SETTINGS_ID})
    except Exception:
        return dict(DEFAULTS)
    return _normalise(doc)


def calculate_shipping(payable_cents: int, cfg: dict | None = None) -> int:
    """Shipping due on an order.

    `payable_cents` is what the customer is paying for the GOODS — i.e. the
    subtotal AFTER any discount. Measuring the threshold on the post-discount
    amount stops a near-threshold cart from discounting its way into free
    shipping.

    A threshold of 0 (or absent) means there is NO free-shipping offer, so the
    flat rate applies to every order. To make shipping free for everyone, set
    `enabled: false` instead — that is the unambiguous switch.
    """
    cfg = cfg or DEFAULTS
    if not cfg.get("enabled", True):
        return 0

    payable_cents = max(0, int(payable_cents or 0))
    threshold = cfg.get("freeShippingThreshold") or 0
    if threshold > 0 and payable_cents >= threshold:
        return 0

    try:
        return max(0, int(cfg.get("flatRate", 0)))
    except (TypeError, ValueError):
        return 0


def amount_until_free_shipping(payable_cents: int, cfg: dict | None = None) -> int:
    """Cents still needed for free shipping; 0 when already free."""
    cfg = cfg or DEFAULTS
    if not cfg.get("enabled", True):
        return 0
    threshold = cfg.get("freeShippingThreshold") or 0
    if threshold <= 0:
        return 0
    return max(0, threshold - max(0, int(payable_cents or 0)))
