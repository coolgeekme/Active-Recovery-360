"""Sales tax calculation.

Client's instruction (Oct 23, 2026): "AZ sales only - 9.1 %".

That is a single destination state at one combined rate, which is all this
storefront needs today. It is deliberately NOT a full tax engine: no nexus
matrix, no per-city rates, no exemption certificates. If AR360 ever sells into
a second state, extend `states` and give it its own rate rather than assuming
the rate stays flat.

CONFIGURATION
-------------
Values come from the `settings` collection, doc `_id == "tax"`, so a rate change
is a data change and never a code deploy. Any missing or unreadable document
falls back to DEFAULTS — a settings fault must never break checkout.

TAX BASE
--------
Arizona treats delivery charges as part of the taxable base when the goods sold
are taxable, so shipping is INCLUDED by default (`taxShipping`). This is the
one judgement call in this file and it should be confirmed with the client's
tax preparer; flip the setting if they disagree.
"""
from services.database import get_collection

SETTINGS_ID = "tax"

DEFAULTS = {
    "enabled": True,
    # Basis points: 910 == 9.10%. Integers avoid float drift on money.
    "rateBps": 910,
    "states": ["AZ"],
    "taxShipping": True,
    "label": "AZ sales tax",
}

# Only needed because the checkout state field is free text.
_STATE_NAMES = {
    "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
    "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
    "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI", "IDAHO": "ID",
    "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
    "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
    "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN",
    "MISSISSIPPI": "MS", "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE",
    "NEVADA": "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
    "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC",
    "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK", "OREGON": "OR",
    "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
    "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA",
    "WEST VIRGINIA": "WV", "WISCONSIN": "WI", "WYOMING": "WY",
    "DISTRICT OF COLUMBIA": "DC",
}


def normalise_state(value) -> str:
    """Best-effort two-letter state code from free-text input. '' when unknown."""
    if not value:
        return ""
    text = str(value).strip().upper()
    if not text:
        return ""
    if len(text) == 2 and text.isalpha():
        return text
    if text in _STATE_NAMES:
        return _STATE_NAMES[text]
    # e.g. "Phoenix, AZ" or "AZ 85251"
    for token in text.replace(",", " ").split():
        if len(token) == 2 and token.isalpha():
            return token
    return ""


def _normalise(raw: dict | None) -> dict:
    cfg = dict(DEFAULTS)
    if not raw:
        return cfg

    if "enabled" in raw:
        cfg["enabled"] = bool(raw["enabled"])
    if "taxShipping" in raw:
        cfg["taxShipping"] = bool(raw["taxShipping"])

    if raw.get("rateBps") is not None:
        try:
            cfg["rateBps"] = max(0, int(raw["rateBps"]))
        except (TypeError, ValueError):
            pass

    if raw.get("states") is not None:
        try:
            states = [normalise_state(s) for s in raw["states"]]
            cfg["states"] = [s for s in states if s]
        except (TypeError, ValueError):
            pass

    if raw.get("label"):
        cfg["label"] = str(raw["label"])[:60]

    return cfg


async def get_tax_config() -> dict:
    """Current tax config. Never raises — falls back to DEFAULTS."""
    try:
        settings = get_collection("settings")
        doc = await settings.find_one({"_id": SETTINGS_ID})
    except Exception:
        return dict(DEFAULTS)
    return _normalise(doc)


def calculate_tax(goods_cents: int, shipping_cents: int, state, cfg: dict | None = None) -> int:
    """Tax owed on an order, in cents.

    `goods_cents` is the post-discount amount paid for the goods. Tax applies
    only when the destination state is one the client collects in, so a cart
    shipping outside Arizona pays nothing.
    """
    cfg = cfg or DEFAULTS
    if not cfg.get("enabled", True):
        return 0

    code = normalise_state(state)
    if not code or code not in (cfg.get("states") or []):
        return 0

    base = max(0, int(goods_cents or 0))
    if cfg.get("taxShipping", True):
        base += max(0, int(shipping_cents or 0))

    rate_bps = max(0, int(cfg.get("rateBps", 0) or 0))
    if rate_bps == 0 or base == 0:
        return 0

    # Integer money math with half-up rounding; never float.
    return (base * rate_bps + 5000) // 10000


def taxable_base(goods_cents: int, shipping_cents: int, state, cfg: dict | None = None) -> int:
    """The amount tax was computed on — stored with the order for reconciliation."""
    cfg = cfg or DEFAULTS
    code = normalise_state(state)
    if not cfg.get("enabled", True) or not code or code not in (cfg.get("states") or []):
        return 0
    base = max(0, int(goods_cents or 0))
    if cfg.get("taxShipping", True):
        base += max(0, int(shipping_cents or 0))
    return base
