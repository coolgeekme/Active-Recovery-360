from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
import os

from services.database import get_collection
from routes.auth import require_auth

router = APIRouter()

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
async def create_payment_intent(data: dict):
    stripe = get_stripe()
    
    amount = data.get("amount", 0)
    discount_code = data.get("discountCode")
    
    final_amount = amount
    applied_discount = None
    
    if discount_code:
        discount_codes = get_collection("discount_codes")
        discount = await discount_codes.find_one({"code": discount_code.upper()})
        
        if discount:
            if discount.get("discountType") == "percentage":
                final_amount = amount - (amount * discount.get("discountValue", 0) / 100)
            else:
                final_amount = max(0, amount - discount.get("discountValue", 0))
            
            applied_discount = {
                "id": str(discount["_id"]),
                "code": discount["code"],
                "discountType": discount.get("discountType"),
                "discountValue": discount.get("discountValue")
            }
    
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=int(final_amount * 100),  # Convert to cents
            currency="usd",
            metadata={
                "type": "membership",
                **({"discountCode": discount_code} if discount_code else {})
            }
        )
        
        return {
            "clientSecret": payment_intent.client_secret,
            "appliedDiscount": applied_discount,
            "finalAmount": final_amount
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@router.post("/confirm-membership-payment")
async def confirm_membership_payment(data: dict, user: dict = Depends(require_auth)):
    stripe = get_stripe()
    
    payment_intent_id = data.get("paymentIntentId")
    
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status == "succeeded" and payment_intent.metadata.get("type") == "membership":
            # Update discount code usage if applicable
            discount_code = payment_intent.metadata.get("discountCode")
            if discount_code:
                discount_codes = get_collection("discount_codes")
                await discount_codes.update_one(
                    {"code": discount_code.upper()},
                    {"$inc": {"usedCount": 1}}
                )
            
            # Update user membership
            users = get_collection("users")
            result = await users.find_one_and_update(
                {"_id": ObjectId(user["id"])},
                {"$set": {"isMember": True}},
                return_document=True
            )
            
            if result:
                return {
                    "id": str(result["_id"]),
                    "username": result.get("username"),
                    "email": result.get("email"),
                    "fullName": result.get("fullName"),
                    "isMember": True,
                    "isAdmin": result.get("isAdmin", False),
                    "isDoctor": result.get("isDoctor", False)
                }
            
            raise HTTPException(status_code=404, detail="User not found")
        else:
            raise HTTPException(status_code=400, detail="Payment not completed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error confirming payment: {str(e)}")
