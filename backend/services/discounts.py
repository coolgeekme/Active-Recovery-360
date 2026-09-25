"""
Discount-code validation and pricing for the membership checkout.

This is the single source of truth for two questions that must never disagree:

  1. "Is this code valid?"          -> resolve_discount_code()
  2. "What does it cost, in cents?" -> apply_discount()

Both the public /discount-codes/validate endpoint and Stripe payment pricing
resolve through here, so a rule change cannot drift between what we quote the
customer and what we actually charge.

Prices are handled in CENTS throughout, matching Stripe's API. Mixing dollars
and cents is the classic way a discount ends up off by 100x.
"""
from datetime import datetime

from fastapi import HTTPException

from services.database import get_collection


async def resolve_discount_code(code: str) -> dict:
    """Return the discount document for a VALID code, else raise HTTPException.

    Raises the same status codes and messages as POST /discount-codes/validate
    so the two paths stay interchangeable.
    """
    normalized = (code or "").strip().upper()
    if not normalized:
        raise HTTPException(status_code=400, detail="Discount code is required")

    doc = await get_collection("discount_codes").find_one({"code": normalized})
    if not doc:
        raise HTTPException(status_code=404, detail="Invalid discount code")
    if not doc.get("isActive", True):
        raise HTTPException(status_code=400, detail="Discount code is no longer active")
    if doc.get("expiresAt") and datetime.utcnow() > doc["expiresAt"]:
        raise HTTPException(status_code=400, detail="Discount code has expired")
    if doc.get("usageLimit") and doc.get("usedCount", 0) >= doc["usageLimit"]:
        raise HTTPException(status_code=400, detail="Discount code usage limit reached")

    return doc


def apply_discount(base_cents: int, doc: dict | None) -> int:
    """Return the price in CENTS after applying `doc`, floored at zero.

    `discountValue` is stored in DOLLARS for flat discounts and as a percentage
    for percentage discounts — matching the admin UI and the existing orders
    path.
    """
    if not doc:
        return base_cents

    value = doc.get("discountValue", 0) or 0
    if doc.get("discountType") == "percentage":
        discounted = base_cents - (base_cents * value / 100)
    else:
        discounted = base_cents - (value * 100)

    return max(0, int(round(discounted)))
