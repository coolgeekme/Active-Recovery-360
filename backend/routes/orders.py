from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from services.database import get_collection
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
        "status": doc.get("status", "pending"),
        "items": doc.get("items", []),
        "shippingAddress": doc.get("shippingAddress", ""),
        "createdAt": doc.get("createdAt")
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
    except:
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

    new_order = {
        "userId": user["id"],
        "subtotal": subtotal,
        "discountAmount": discount_amount,
        "discountCode": discount_code_used,
        "totalAmount": total_amount,
        "status": "pending",
        "items": order_items,
        "shippingAddress": order_data.get("shippingAddress", ""),
        "createdAt": datetime.utcnow(),
    }

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
    except:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return transform_order(result)
