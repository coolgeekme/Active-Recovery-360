from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
import os
import asyncio

from services.database import get_collection
from services.discounts import apply_discount, resolve_discount_code
from routes.auth import require_auth
from services.email import send_membership_welcome_email

router = APIRouter()

# The membership price, defined ONCE and never taken from the client.
# Previously /create-payment-intent accepted `amount` from the request body and
# confirmation never checked what was actually paid, so a caller could buy a
# membership for any price they chose.
MEMBERSHIP_PRICE_CENTS = 2900

# Lazy Stripe initialization
_stripe = None

def get_stripe():
    global _stripe
    if _stripe is None:
        import stripe
        key = os.environ.get("STRIPE_SECRET_KEY")
        if not key:
            raise HTTPException(status_code=500, detail="Stripe is not configured")
        stripe.api_key = key
        _stripe = stripe
    return _stripe

@router.post("/create-payment-intent")
async def create_payment_intent(data: dict, user: dict = Depends(require_auth)):
    """Create a PaymentIntent for the membership.

    Requires auth: this starts a payment tied to a specific account, and the
    intent records which user it belongs to so it cannot be claimed by another.
    """
    stripe = get_stripe()

    discount_code = (data.get("discountCode") or "").strip().upper()
    discount_doc = None
    if discount_code:
        # Validates existence, active flag, expiry and usage limit. Raises 4xx.
        discount_doc = await resolve_discount_code(discount_code)

    # SECURITY: the price is computed server-side from a server-side constant.
    # Any `amount` in the request body is ignored outright.
    final_cents = apply_discount(MEMBERSHIP_PRICE_CENTS, discount_doc)

    metadata = {
        "type": "membership",
        "userId": user["id"],
        # Recorded so confirmation can verify the payment covers the price that
        # was quoted, without re-deriving it from a code that may have changed.
        "expectedAmountCents": str(final_cents),
    }
    if discount_doc:
        metadata["discountCode"] = discount_doc["code"]

    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=final_cents,
            currency="usd",
            metadata=metadata,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

    applied_discount = None
    if discount_doc:
        applied_discount = {
            "id": str(discount_doc["_id"]),
            "code": discount_doc["code"],
            "discountType": discount_doc.get("discountType"),
            "discountValue": discount_doc.get("discountValue"),
        }

    return {
        "clientSecret": payment_intent.client_secret,
        "appliedDiscount": applied_discount,
        "finalAmount": final_cents / 100,
    }

@router.post("/confirm-membership-payment")
async def confirm_membership_payment(data: dict, user: dict = Depends(require_auth)):
    stripe = get_stripe()

    payment_intent_id = data.get("paymentIntentId")
    tshirt_size = data.get("tshirtSize")
    shipping_address = data.get("shippingAddress")
    phone = data.get("phone")

    if not payment_intent_id:
        raise HTTPException(status_code=400, detail="Missing paymentIntentId")

    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payment: {str(e)}")

    # Stripe returns a StripeObject (dict-like); attribute access is the
    # documented pattern and works for both shapes.
    metadata = getattr(payment_intent, "metadata", None) or {}

    if payment_intent.status != "succeeded":
        raise HTTPException(status_code=400, detail="Payment not completed")

    if metadata.get("type") != "membership":
        raise HTTPException(status_code=400, detail="Payment is not a membership")

    # SECURITY: the intent must belong to the caller. Without this, anyone who
    # obtained an intent id could activate a membership on their own account.
    intent_user_id = metadata.get("userId")
    if intent_user_id and intent_user_id != user["id"]:
        raise HTTPException(
            status_code=403, detail="Payment does not belong to this account"
        )

    # SECURITY: verify what was actually PAID covers the price that was quoted.
    # Fail closed — an intent with no recorded expectation must cover the full
    # list price rather than being trusted.
    try:
        expected_cents = int(metadata.get("expectedAmountCents", MEMBERSHIP_PRICE_CENTS))
    except (TypeError, ValueError):
        expected_cents = MEMBERSHIP_PRICE_CENTS

    paid_cents = payment_intent.amount_received or 0
    if paid_cents < expected_cents:
        raise HTTPException(
            status_code=400,
            detail="Payment amount does not cover the membership price",
        )

    # Update discount code usage if applicable
    discount_code = metadata.get("discountCode")
    if discount_code:
        discount_codes = get_collection("discount_codes")
        await discount_codes.update_one(
            {"code": discount_code.upper()},
            {"$inc": {"usedCount": 1}}
        )

    # Update user membership + demographics
    users = get_collection("users")
    update_fields: dict = {"isMember": True}
    if tshirt_size:
        update_fields["tshirtSize"] = tshirt_size
    if shipping_address:
        update_fields["shippingAddress"] = shipping_address
    if phone:
        update_fields["phone"] = phone

    result = await users.find_one_and_update(
        {"_id": ObjectId(user["id"])},
        {"$set": update_fields},
        return_document=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    # Send welcome email (fire-and-forget; don't block the response)
    first_name = (result.get("fullName") or "there").split(" ")[0]
    asyncio.create_task(
        send_membership_welcome_email(result.get("email"), first_name)
    )

    return {
        "id": str(result["_id"]),
        "username": result.get("username"),
        "email": result.get("email"),
        "fullName": result.get("fullName"),
        "isMember": True,
        "isAdmin": result.get("isAdmin", False),
        "isDoctor": result.get("isDoctor", False)
    }
