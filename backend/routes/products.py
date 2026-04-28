from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import Optional, List
from bson import ObjectId
import uuid

from services.database import get_collection
from services.storage import put_object
from routes.auth import require_admin

router = APIRouter()

ALLOWED_IMAGE_MIME = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _derive_price_and_stock(variants: list[dict]) -> tuple[int, int]:
    """When a product has variants, the canonical price = min variant price
    and stockQuantity = sum of variant stock. Mirrors import_products.py."""
    valid = [v for v in variants if isinstance(v, dict)]
    prices = [int(v.get("price", 0)) for v in valid if v.get("price") is not None]
    stocks = [int(v.get("stockQuantity", 0)) for v in valid]
    return (min(prices) if prices else 0, sum(stocks) if stocks else 0)

def transform_product(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "description": doc.get("description", ""),
        "price": doc.get("price", 0),
        "imageUrl": doc.get("imageUrl"),
        "visibility": doc.get("visibility", "public"),
        "categoryId": str(doc.get("categoryId", "")),
        "stockQuantity": doc.get("stockQuantity", 0),
        "featured": doc.get("featured", False),
        "doctorIds": [str(d) for d in doc.get("doctorIds", [])],
        "createdAt": doc.get("createdAt"),
        "brand": doc.get("brand"),
        "hasVariants": doc.get("hasVariants", False),
        "variants": doc.get("variants", [])
    }

@router.get("/products")
async def get_products(
    visibility: Optional[str] = None,
    categoryId: Optional[str] = None,
    featured: Optional[bool] = None,
    doctorId: Optional[str] = None
):
    products = get_collection("products")
    
    query = {}
    if visibility:
        query["visibility"] = visibility
    if categoryId:
        query["categoryId"] = categoryId
    if featured is not None:
        query["featured"] = featured
    if doctorId:
        query["doctorIds"] = doctorId
    
    cursor = products.find(query)
    docs = await cursor.to_list(length=100)
    
    return [transform_product(doc) for doc in docs]

@router.get("/products/{product_id}")
async def get_product(product_id: str):
    products = get_collection("products")
    
    try:
        doc = await products.find_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return transform_product(doc)

@router.post("/products")
async def create_product(product_data: dict, admin: dict = Depends(require_admin)):
    products = get_collection("products")
    categories = get_collection("categories")

    variants = product_data.get("variants") or []
    has_variants = len(variants) > 1

    # Auto-derive price/stock when variants are provided
    if variants:
        derived_price, derived_stock = _derive_price_and_stock(variants)
        price = derived_price or product_data.get("price", 0)
        stock_qty = derived_stock if derived_stock else product_data.get("stockQuantity", 0)
    else:
        price = product_data.get("price", 0)
        stock_qty = product_data.get("stockQuantity", 0)

    new_product = {
        "name": product_data.get("name"),
        "description": product_data.get("description"),
        "price": price,
        "imageUrl": product_data.get("imageUrl"),
        "visibility": product_data.get("visibility", "public"),
        "categoryId": product_data.get("categoryId"),
        "stockQuantity": stock_qty,
        "featured": product_data.get("featured", False),
        "doctorIds": product_data.get("doctorIds", []),
        "brand": product_data.get("brand"),
        "hasVariants": has_variants,
        "variants": variants,
    }

    result = await products.insert_one(new_product)

    # Update category product count
    if new_product.get("categoryId"):
        try:
            await categories.update_one(
                {"_id": ObjectId(new_product["categoryId"])},
                {"$inc": {"productCount": 1}}
            )
        except Exception:
            pass

    new_product["_id"] = result.inserted_id
    return transform_product(new_product)

@router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: dict, admin: dict = Depends(require_admin)):
    products = get_collection("products")

    update_data = dict(product_data)
    # If variants are being updated, also recompute hasVariants + price/stock
    if "variants" in update_data:
        variants = update_data.get("variants") or []
        update_data["hasVariants"] = len(variants) > 1
        if variants:
            derived_price, derived_stock = _derive_price_and_stock(variants)
            if derived_price:
                update_data["price"] = derived_price
            if derived_stock:
                update_data["stockQuantity"] = derived_stock

    try:
        result = await products.find_one_and_update(
            {"_id": ObjectId(product_id)},
            {"$set": update_data},
            return_document=True
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Product not found")

    if not result:
        raise HTTPException(status_code=404, detail="Product not found")

    return transform_product(result)

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(require_admin)):
    products = get_collection("products")
    categories = get_collection("categories")
    
    try:
        product = await products.find_one({"_id": ObjectId(product_id)})
        if product and product.get("categoryId"):
            await categories.update_one(
                {"_id": ObjectId(product["categoryId"])},
                {"$inc": {"productCount": -1}}
            )
        
        result = await products.delete_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted"}


@router.post("/uploads/image")
async def upload_image(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    """Admin-only endpoint to upload a product image to Object Storage.

    Returns the public file proxy path that can be stored in product.imageUrl
    or variant.imageUrl, e.g. `/api/files/ar360/products/{uuid}.jpg`.
    """
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {content_type}. Use JPG, PNG, or WebP.",
        )

    data = await file.read()
    if len(data) > 8 * 1024 * 1024:  # 8 MB cap
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller.")

    ext = ALLOWED_IMAGE_MIME[content_type]
    storage_path = f"ar360/products/{uuid.uuid4().hex}.{ext}"
    try:
        put_object(storage_path, data, content_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upload failed: {e}")

    return {"path": storage_path, "url": f"/api/files/{storage_path}"}
