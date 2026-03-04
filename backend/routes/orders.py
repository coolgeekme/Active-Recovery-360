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
    
    # Get cart items
    cursor = cart_items.find({"userId": user["id"]})
    cart_docs = await cursor.to_list(length=100)
    
    if not cart_docs:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate total and build order items
    total_amount = 0
    order_items = []
    
    for cart_item in cart_docs:
        product_doc = await products.find_one({"_id": ObjectId(cart_item["productId"])})
        if not product_doc:
            continue
        
        item_total = product_doc.get("price", 0) * cart_item.get("quantity", 1)
        total_amount += item_total
        
        order_items.append({
            "productId": str(cart_item["productId"]),
            "name": product_doc.get("name", ""),
            "price": product_doc.get("price", 0),
            "quantity": cart_item.get("quantity", 1)
        })
    
    # Create order
    new_order = {
        "userId": user["id"],
        "totalAmount": total_amount,
        "status": "pending",
        "items": order_items,
        "shippingAddress": order_data.get("shippingAddress", ""),
        "createdAt": datetime.utcnow()
    }
    
    result = await orders.insert_one(new_order)
    
    # Clear cart
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
