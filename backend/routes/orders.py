from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from services.database import get_collection
from services import goaffpro
from services.shipping import calculate_shipping, get_shipping_config
from services.tax import calculate_tax, get_tax_config, taxable_base
from routes.payments import get_stripe
from routes.auth import require_auth, require_member, require_admin

router = APIRouter()

def transform_order(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "userId": str(doc.get("userId", "")),
        "totalAmount": doc.get("totalAmount", 0),
        "subtotal": doc.get("subtotal", doc.get("totalAmount", 0)),
        "discountAmount": doc.get("discountAmount", 0),
        "discountCode": doc.get("discountCode"),
        # Orders written before shipping existed have no field; report 0 so
        # historical order totals still reconcile.
        "shippingAmount": doc.get("shippingAmount", 0),
        "shippingLabel": doc.get("shippingLabel"),
        "taxAmount": doc.get("taxAmount", 0),
        "taxState": doc.get("taxState", ""),
        "paymentStatus": doc.get("paymentStatus", "pay_later"),
        "paidAt": doc.get("paidAt"),
        "status": doc.get("status", "pending"),
        "items": doc.get("items", []),
        "shippingAddress": doc.get("shippingAddress", ""),
        "createdAt": doc.get("createdAt"),
        # HCP referral
        "hcpReferralId": doc.get("hcpReferralId"),
        "hcpReferralSlug": doc.get("hcpReferralSlug"),
        "hcpReferralName": doc.get("hcpReferralName"),
        "hcpCommissionPercent": doc.get("hcpCommissionPercent"),
        "hcpCommissionAmount": doc.get("hcpCommissionAmount"),
        # Affiliate attribution (GoAffPro). HCP referral wins when both exist.
        "affiliateRef": doc.get("affiliateRef"),
        "affiliateClickedAt": doc.get("affiliateClickedAt"),
        "goaffproSyncStatus": doc.get("goaffproSyncStatus"),
        "goaffproSyncMessage": doc.get("goaffproSyncMessage"),
        "goaffproSyncedAt": doc.get("goaffproSyncedAt"),
    }

@router.get("/orders")
async def get_orders(user: dict = Depends(require_auth)):
    orders = get_collection("orders")
    
    # Regular users see their orders, admins see all
    query = {} if user.get("isAdmin") else {"userId": user["id"]}
    
    cursor = orders.find(query).sort("createdAt", -1)
    docs = await cursor.to_list(length=100)
    
    return [transform_order(doc) for doc in docs]

@router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(require_auth)):
    orders = get_collection("orders")
    
    try:
        doc = await orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check authorization
    if doc.get("userId") != user["id"] and not user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return transform_order(doc)

@router.post("/orders")
async def create_order(order_data: dict, user: dict = Depends(require_member)):
    orders = get_collection("orders")
    cart_items = get_collection("cart_items")
    products = get_collection("products")

    total_amount = 0
    order_items = []

    # Prefer items provided in the request body (client-side cart). Fall back
    # to the server-side cart_items collection for legacy clients.
    payload_items = order_data.get("items") or []
    source_items: list[dict] = []
    if payload_items:
        for it in payload_items:
            source_items.append({
                "productId": it.get("productId"),
                "quantity": int(it.get("quantity", 1)) or 1,
                "variantSku": it.get("variantSku"),
            })
    else:
        cursor = cart_items.find({"userId": user["id"]})
        cart_docs = await cursor.to_list(length=200)
        for ci in cart_docs:
            source_items.append({
                "productId": ci.get("productId"),
                "quantity": ci.get("quantity", 1),
                "variantSku": ci.get("variantSku"),
            })

    if not source_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    for item in source_items:
        try:
            product_doc = await products.find_one({"_id": ObjectId(item["productId"])})
        except Exception:
            continue
        if not product_doc:
            continue

        # Variant pricing if provided
        unit_price = product_doc.get("price", 0)
        variant_name = None
        if item.get("variantSku"):
            for v in product_doc.get("variants", []) or []:
                if v.get("sku") == item["variantSku"]:
                    unit_price = v.get("price", unit_price)
                    variant_name = v.get("name")
                    break

        line_total = unit_price * item["quantity"]
        total_amount += line_total

        order_items.append({
            "productId": str(item["productId"]),
            "name": product_doc.get("name", ""),
            "variantSku": item.get("variantSku"),
            "variantName": variant_name,
            "price": unit_price,
            "quantity": item["quantity"],
        })

    # Create order
    subtotal = total_amount
    discount_amount = 0
    discount_code_used: str | None = None

    raw_code = (order_data.get("discountCode") or "").strip().upper()
    if raw_code:
        discount_codes = get_collection("discount_codes")
        d = await discount_codes.find_one({"code": raw_code})
        if not d:
            raise HTTPException(status_code=400, detail="Invalid discount code")
        if not d.get("isActive", True):
            raise HTTPException(status_code=400, detail="Discount code is no longer active")
        if d.get("expiresAt") and datetime.utcnow() > d["expiresAt"]:
            raise HTTPException(status_code=400, detail="Discount code has expired")
        if d.get("usageLimit") and d.get("usedCount", 0) >= d["usageLimit"]:
            raise HTTPException(status_code=400, detail="Discount code usage limit reached")

        if d.get("discountType") == "percentage":
            discount_amount = int(round(subtotal * (d.get("discountValue", 0) / 100)))
        else:
            # Fixed-amount discount stored in cents, just like prices
            discount_amount = int(d.get("discountValue", 0))
        discount_amount = min(discount_amount, subtotal)
        total_amount = max(0, subtotal - discount_amount)
        discount_code_used = d["code"]
        discount_code_doc_id = d["_id"]

    # Shipping is priced on what the customer actually pays for the goods
    # (subtotal AFTER discount), then added on top of the order total. Priced
    # server-side from the settings doc — a client-supplied shipping figure is
    # never trusted, exactly like the membership price.
    payable_amount = max(0, total_amount)
    shipping_cfg = await get_shipping_config()
    shipping_amount = calculate_shipping(payable_amount, shipping_cfg)

    # Sales tax on the destination state (AZ only today). Prefer the explicit
    # `shippingState` field; fall back to parsing the free-text address so
    # older clients that only send `shippingAddress` are not silently untaxed.
    shipping_state = (order_data.get("shippingState")
                      or order_data.get("shippingAddress")
                      or "")
    tax_cfg = await get_tax_config()
    tax_amount = calculate_tax(payable_amount, shipping_amount, shipping_state, tax_cfg)
    tax_base = taxable_base(payable_amount, shipping_amount, shipping_state, tax_cfg)

    total_amount = payable_amount + shipping_amount + tax_amount

    new_order = {
        "userId": user["id"],
        "subtotal": subtotal,
        "discountAmount": discount_amount,
        "discountCode": discount_code_used,
        "shippingAmount": shipping_amount,
        "shippingLabel": shipping_cfg.get("label"),
        # Stored so an invoice can be reconciled to the rate that was actually
        # charged, even after the rate is later changed.
        "taxAmount": tax_amount,
        "taxRateBps": tax_cfg.get("rateBps") if tax_amount else 0,
        "taxBase": tax_base,
        "taxState": shipping_state[:40],
        # paymentStatus is separate from `status`: status tracks FULFILMENT
        # (pending/completed/cancelled), paymentStatus tracks whether money was
        # actually collected. Card orders flip to "paid" on confirmation; the
        # legacy pay-later path stays "pay_later".
        "paymentStatus": "pay_later",
        "totalAmount": total_amount,
        "status": "pending",
        "items": order_items,
        "shippingAddress": order_data.get("shippingAddress", ""),
        "createdAt": datetime.utcnow(),
    }

    # Affiliate attribution (GoAffPro). Stored raw here; the precedence rule
    # against hcpReferralId is resolved at completion time in services.goaffpro
    # so the rule lives in exactly one place.
    raw_affiliate_ref = (order_data.get("affiliateRef") or "").strip()
    if raw_affiliate_ref:
        new_order["affiliateRef"] = raw_affiliate_ref
        new_order["affiliateClickedAt"] = datetime.utcnow()

    # HCP referral attribution. Customer's frontend can pass either
    # `hcpReferralSlug` (storefront URL slug) or `hcpReferralId` (user id).
    # We resolve to a real approved HCP and snapshot commission % at order
    # time so future commission rate changes don't retroactively affect
    # historical orders.
    raw_slug = (order_data.get("hcpReferralSlug") or "").strip().lower()
    raw_id = (order_data.get("hcpReferralId") or "").strip()
    if raw_slug or raw_id:
        users_coll = get_collection("users")
        hcp = None
        if raw_slug:
            hcp = await users_coll.find_one({
                "storefrontSlug": raw_slug,
                "storefrontEnabled": True,
                "hcpStatus": "approved",
            })
        if not hcp and raw_id:
            try:
                hcp = await users_coll.find_one({
                    "_id": ObjectId(raw_id),
                    "hcpStatus": "approved",
                })
            except Exception:
                hcp = None
        if hcp:
            commission_pct = float(hcp.get("commissionPercent", 0) or 0)
            # Commission is paid on the GOODS, not on postage — a flat-rate
            # shipping charge must not inflate a referrer's payout.
            commission_amount = int(round(payable_amount * (commission_pct / 100)))
            new_order["hcpReferralId"] = str(hcp["_id"])
            new_order["hcpReferralSlug"] = hcp.get("storefrontSlug")
            new_order["hcpReferralName"] = hcp.get("fullName")
            new_order["hcpCommissionPercent"] = commission_pct
            new_order["hcpCommissionAmount"] = commission_amount

    result = await orders.insert_one(new_order)

    # Only consume a usage slot AFTER the order successfully persists
    if discount_code_used:
        await get_collection("discount_codes").update_one(
            {"_id": discount_code_doc_id},
            {"$inc": {"usedCount": 1}},
        )

    # Clear server-side cart for this user (if any)
    await cart_items.delete_many({"userId": user["id"]})

    new_order["_id"] = result.inserted_id
    return transform_order(new_order)

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: dict, admin: dict = Depends(require_admin)):
    orders = get_collection("orders")
    
    status = status_data.get("status")
    if status not in ["pending", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    try:
        result = await orders.find_one_and_update(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": status}},
            return_document=True
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")

    # Report the conversion to GoAffPro when an admin confirms the sale.
    # `completed` is the only honest commission trigger this shop has: there is
    # no online payment event to hang it on. Fail soft — a GoAffPro problem must
    # never block or roll back the order update (services.goaffpro never raises).
    if status == "completed":
        report = await goaffpro.report_order(result)
        applied = goaffpro.sync_fields(report)
        await orders.update_one({"_id": result["_id"]}, {"$set": applied})
        result.update(applied)

    return transform_order(result)


# ---------------------------------------------------------------------------
# Card payment for product orders
#
# The order is created FIRST (POST /api/orders) so every figure — goods,
# discount, shipping, tax — is computed server-side exactly once. The
# PaymentIntent is then raised for the STORED total, so a caller cannot name
# its own price. Confirmation re-verifies against Stripe before the order is
# marked paid.
# ---------------------------------------------------------------------------

@router.post("/orders/{order_id}/payment-intent")
async def create_order_payment_intent(order_id: str, user: dict = Depends(require_member)):
    orders = get_collection("orders")

    try:
        order = await orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # SECURITY: an order id must never let one account pay for (or read) another
    # account's order.
    if str(order.get("userId")) != user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")

    if order.get("paymentStatus") == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")

    amount = int(order.get("totalAmount") or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Nothing to charge on this order")

    stripe = get_stripe()
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            automatic_payment_methods={"enabled": True},
            description=f"Active Recovery 360 order {order_id}",
            metadata={
                "type": "order",
                "orderId": order_id,
                "userId": user["id"],
                # Recorded so confirmation can verify the paid amount covers the
                # quoted total without re-deriving it from mutable order data.
                "expectedAmountCents": str(amount),
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

    await orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "stripePaymentIntentId": intent.id,
            "paymentStatus": "awaiting_payment",
        }},
    )

    return {
        "clientSecret": intent.client_secret,
        "paymentIntentId": intent.id,
        "amount": amount,
    }


@router.post("/orders/{order_id}/confirm-payment")
async def confirm_order_payment(order_id: str, data: dict, user: dict = Depends(require_member)):
    orders = get_collection("orders")
    stripe = get_stripe()

    payment_intent_id = (data or {}).get("paymentIntentId")
    if not payment_intent_id:
        raise HTTPException(status_code=400, detail="Missing paymentIntentId")

    try:
        order = await orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.get("userId")) != user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")

    if order.get("paymentStatus") == "paid":
        # Idempotent: a double-click or a 3DS redirect replay must not error.
        return transform_order(order)

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payment: {str(e)}")

    metadata = getattr(intent, "metadata", None) or {}

    if metadata.get("type") != "order":
        raise HTTPException(status_code=400, detail="Payment is not an order payment")
    if metadata.get("orderId") != order_id:
        raise HTTPException(status_code=400, detail="Payment does not belong to this order")

    intent_user = metadata.get("userId")
    if intent_user and intent_user != user["id"]:
        raise HTTPException(status_code=403, detail="Payment does not belong to this account")

    if intent.status != "succeeded":
        raise HTTPException(status_code=400, detail="Payment not completed")

    # SECURITY: fail closed — an intent missing its expected amount must still
    # cover the order total from the database.
    try:
        expected_cents = int(metadata.get("expectedAmountCents", order.get("totalAmount") or 0))
    except (TypeError, ValueError):
        expected_cents = int(order.get("totalAmount") or 0)

    paid_cents = intent.amount_received or 0
    if paid_cents < expected_cents:
        raise HTTPException(status_code=400, detail="Payment amount does not cover the order total")

    await orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "paymentStatus": "paid",
            "paidAt": datetime.utcnow(),
            "stripePaymentIntentId": payment_intent_id,
            "amountPaid": paid_cents,
        }},
    )

    updated = await orders.find_one({"_id": ObjectId(order_id)})
    return transform_order(updated)
