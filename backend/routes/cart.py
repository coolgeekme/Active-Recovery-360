from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from services.database import get_collection
from routes.auth import require_auth, require_member
from routes.products import transform_product

router = APIRouter()

def transform_cart_item(doc: dict, product: dict = None) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "userId": str(doc.get("userId", "")),
        "productId": str(doc.get("productId", "")),
        "quantity": doc.get("quantity", 1),
        "product": product
    }

@router.get("/cart")
async def get_cart(user: dict = Depends(require_auth)):
    cart_items = get_collection("cart_items")
    products = get_collection("products")
    
    cursor = cart_items.find({"userId": user["id"]})
    docs = await cursor.to_list(length=100)
    
    result = []
    for doc in docs:
        product_doc = await products.find_one({"_id": ObjectId(doc["productId"])})
        product = transform_product(product_doc) if product_doc else None
        result.append(transform_cart_item(doc, product))
    
    return result

@router.post("/cart")
async def add_to_cart(item_data: dict, user: dict = Depends(require_member)):
    cart_items = get_collection("cart_items")
    products = get_collection("products")
    
    product_id = item_data.get("productId")
    quantity = item_data.get("quantity", 1)
    
    # Verify product exists
    try:
        product_doc = await products.find_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not product_doc:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check visibility permissions
    visibility = product_doc.get("visibility", "public")
    if visibility == "member" and not user.get("isMember"):
        raise HTTPException(status_code=403, detail="Membership required")
    if visibility == "doctor" and not user.get("isDoctor"):
        raise HTTPException(status_code=403, detail="Doctor access required")
    
    # Check if item already in cart
    existing = await cart_items.find_one({
        "userId": user["id"],
        "productId": product_id
    })
    
    if existing:
        # Update quantity
        new_quantity = existing.get("quantity", 0) + quantity
        await cart_items.update_one(
            {"_id": existing["_id"]},
            {"$set": {"quantity": new_quantity}}
        )
        existing["quantity"] = new_quantity
        return transform_cart_item(existing, transform_product(product_doc))
    
    # Create new cart item
    new_item = {
        "userId": user["id"],
        "productId": product_id,
        "quantity": quantity
    }
    
    result = await cart_items.insert_one(new_item)
    new_item["_id"] = result.inserted_id
    
    return transform_cart_item(new_item, transform_product(product_doc))

@router.put("/cart/{item_id}")
async def update_cart_item(item_id: str, update_data: dict, user: dict = Depends(require_auth)):
    cart_items = get_collection("cart_items")
    products = get_collection("products")
    
    quantity = update_data.get("quantity", 1)
    
    try:
        item = await cart_items.find_one({"_id": ObjectId(item_id)})
    except:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    if item.get("userId") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await cart_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"quantity": quantity}}
    )
    
    item["quantity"] = quantity
    product_doc = await products.find_one({"_id": ObjectId(item["productId"])})
    product = transform_product(product_doc) if product_doc else None
    
    return transform_cart_item(item, product)

@router.delete("/cart/{item_id}")
async def remove_from_cart(item_id: str, user: dict = Depends(require_auth)):
    cart_items = get_collection("cart_items")
    
    try:
        item = await cart_items.find_one({"_id": ObjectId(item_id)})
    except:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    if item.get("userId") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await cart_items.delete_one({"_id": ObjectId(item_id)})
    
    return {"message": "Item removed from cart"}
