from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import Optional, List
from bson import ObjectId
from bson.errors import InvalidId
import uuid

from services.database import get_collection
from services.storage import put_object
from routes.auth import require_admin, get_current_user

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

def _category_ids(doc: dict) -> list[str]:
    """Normalize a product's categories to a list of string ids. Reads the
    new `categoryIds` array, falling back to the legacy scalar `categoryId`
    so pre-migration documents still serialize correctly."""
    ids = doc.get("categoryIds")
    if isinstance(ids, list) and ids:
        return [str(c) for c in ids if c]
    legacy = doc.get("categoryId")
    if legacy:
        return [str(legacy)]
    return []


def _payload_category_ids(data: dict) -> list[str] | None:
    """Extract and normalize category ids from a create/update payload.
    Accepts `categoryIds` (list) with a legacy `categoryId` (scalar) fallback.
    Returns None when neither key is present, so callers can tell 'not provided'
    apart from 'explicitly cleared'."""
    if "categoryIds" in data:
        raw = data.get("categoryIds") or []
        return list(dict.fromkeys(str(c) for c in raw if c))
    if "categoryId" in data:
        legacy = data.get("categoryId")
        return [str(legacy)] if legacy else []
    return None


def transform_product(doc: dict, show_price: bool = True) -> dict:
    if not doc:
        return None
    hide_price = bool(doc.get("hidePrice", False))
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "description": doc.get("description", ""),
        # When hidePrice is set and the caller is not privileged, mask the price
        # so provider-only pricing is never leaked to the general public.
        "price": doc.get("price", 0) if (show_price or not hide_price) else 0,
        "imageUrl": doc.get("imageUrl"),
        "visibility": doc.get("visibility", "public"),
        "categoryIds": _category_ids(doc),
        "stockQuantity": doc.get("stockQuantity", 0),
        "featured": doc.get("featured", False),
        "doctorIds": [str(d) for d in doc.get("doctorIds", [])],
        "createdAt": doc.get("createdAt"),
        "brand": doc.get("brand"),
        "hasVariants": doc.get("hasVariants", False),
        "variants": doc.get("variants", []),
        "displayOrder": doc.get("displayOrder"),
        "hidePrice": hide_price,
    }

@router.get("/products")
async def get_products(
    visibility: Optional[str] = None,
    categoryId: Optional[str] = None,
    featured: Optional[bool] = None,
    doctorId: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user),
):
    products = get_collection("products")

    query: dict = {}
    if visibility:
        query["visibility"] = visibility
    if categoryId:
        # Match both the new `categoryIds` array and legacy scalar `categoryId`
        # so category pages keep working during the migration window.
        query["$or"] = [{"categoryIds": categoryId}, {"categoryId": categoryId}]
    if featured is not None:
        query["featured"] = featured
    if doctorId:
        query["doctorIds"] = doctorId

    # Hide `doctor`-visibility products from non-HCP / non-admin viewers, even
    # if they explicitly ask for that tier via ?visibility=doctor. HCPs and
    # admins can see every product in listings. Regular customers only ever
    # reach doctor-only items via an HCP storefront's curated list or a direct
    # product-detail link.
    is_privileged = bool(
        current_user and (current_user.get("isAdmin") or current_user.get("isDoctor"))
    )
    if not is_privileged:
        if visibility == "doctor":
            # Silently return no doctor products to non-privileged callers
            return []
        if not visibility:
            query["visibility"] = {"$ne": "doctor"}

    # Sort by displayOrder (ascending) so admins can control product order
    # within a category. Products without a displayOrder fall to the end,
    # tie-broken by name for stable, predictable output.
    pipeline = [
        {"$match": query},
        {"$addFields": {
            "_effectiveOrder": {"$ifNull": ["$displayOrder", 999999]}
        }},
        {"$sort": {"_effectiveOrder": 1, "name": 1}},
        {"$limit": 200},
    ]
    docs = await products.aggregate(pipeline).to_list(length=200)

    return [transform_product(doc, show_price=is_privileged) for doc in docs]

@router.get("/products/{product_id}")
async def get_product(
    product_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
):
    products = get_collection("products")
    
    try:
        doc = await products.find_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    
    is_privileged = bool(
        current_user and (current_user.get("isAdmin") or current_user.get("isDoctor"))
    )
    return transform_product(doc, show_price=is_privileged)

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
        "categoryIds": _payload_category_ids(product_data) or [],
        "stockQuantity": stock_qty,
        "featured": product_data.get("featured", False),
        "doctorIds": product_data.get("doctorIds", []),
        "brand": product_data.get("brand"),
        "hasVariants": has_variants,
        "variants": variants,
        "hidePrice": bool(product_data.get("hidePrice", False)),
    }

    result = await products.insert_one(new_product)

    # Update productCount for every category the product belongs to.
    for cid in new_product.get("categoryIds", []):
        try:
            await categories.update_one(
                {"_id": ObjectId(cid)},
                {"$inc": {"productCount": 1}}
            )
        except Exception:
            pass

    new_product["_id"] = result.inserted_id
    return transform_product(new_product)

@router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: dict, admin: dict = Depends(require_admin)):
    products = get_collection("products")
    categories = get_collection("categories")

    try:
        existing = await products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Product not found")
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = dict(product_data)

    # Normalize category assignment. Pop both keys from the payload and, when a
    # category assignment was provided, store the normalized `categoryIds` list.
    new_category_ids = _payload_category_ids(product_data)
    update_data.pop("categoryId", None)
    update_data.pop("categoryIds", None)
    if new_category_ids is not None:
        update_data["categoryIds"] = new_category_ids

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

    # Adjust per-category productCount when the category assignment changed.
    if new_category_ids is not None:
        old_ids = set(_category_ids(existing))
        new_ids = set(new_category_ids)
        for cid in old_ids - new_ids:
            try:
                await categories.update_one({"_id": ObjectId(cid)}, {"$inc": {"productCount": -1}})
            except Exception:
                pass
        for cid in new_ids - old_ids:
            try:
                await categories.update_one({"_id": ObjectId(cid)}, {"$inc": {"productCount": 1}})
            except Exception:
                pass

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
        if product:
            for cid in _category_ids(product):
                await categories.update_one(
                    {"_id": ObjectId(cid)},
                    {"$inc": {"productCount": -1}}
                )
        
        result = await products.delete_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted"}


async def _normalize_category_order(category_id: str) -> list[dict]:
    """Assign sequential displayOrder (10, 20, 30, ...) to every product in
    the given category based on its current effective order. Returns the
    normalized list of documents in their new order. Idempotent."""
    products = get_collection("products")
    pipeline = [
        {"$match": {"categoryIds": category_id}},
        {"$addFields": {"_effectiveOrder": {"$ifNull": ["$displayOrder", 999999]}}},
        {"$sort": {"_effectiveOrder": 1, "name": 1}},
    ]
    docs = await products.aggregate(pipeline).to_list(length=500)
    for index, doc in enumerate(docs):
        new_order = (index + 1) * 10
        if doc.get("displayOrder") != new_order:
            await products.update_one(
                {"_id": doc["_id"]}, {"$set": {"displayOrder": new_order}}
            )
            doc["displayOrder"] = new_order
    return docs


@router.post("/admin/products/{product_id}/move")
async def move_product(
    product_id: str,
    direction: str = Query(..., pattern="^(up|down)$"),
    categoryId: Optional[str] = Query(default=None),
    admin: dict = Depends(require_admin),
):
    """Swap a product's displayOrder with its neighbour inside the given
    category. direction=up moves it earlier in the list, direction=down
    moves it later. `categoryId` scopes the reorder to a single category; when
    omitted, the product's first category is used."""
    products = get_collection("products")
    try:
        target = await products.find_one({"_id": ObjectId(product_id)})
    except InvalidId:
        raise HTTPException(status_code=404, detail="Product not found")
    if not target:
        raise HTTPException(status_code=404, detail="Product not found")

    target_categories = _category_ids(target)
    if not target_categories:
        raise HTTPException(status_code=400, detail="Product has no category to reorder within")
    if categoryId:
        if categoryId not in target_categories:
            raise HTTPException(status_code=400, detail="Product is not in the specified category")
        category_id = categoryId
    else:
        category_id = target_categories[0]

    # Ensure every product in the category has a deterministic displayOrder.
    ordered = await _normalize_category_order(category_id)
    ids = [str(d["_id"]) for d in ordered]
    try:
        current_index = ids.index(product_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Product not found")

    if direction == "up":
        if current_index == 0:
            return {"message": "Already at top", "moved": False}
        neighbor_index = current_index - 1
    else:  # down
        if current_index == len(ordered) - 1:
            return {"message": "Already at bottom", "moved": False}
        neighbor_index = current_index + 1

    current_doc = ordered[current_index]
    neighbor_doc = ordered[neighbor_index]
    # Swap displayOrder values
    await products.update_one(
        {"_id": current_doc["_id"]}, {"$set": {"displayOrder": neighbor_doc["displayOrder"]}}
    )
    await products.update_one(
        {"_id": neighbor_doc["_id"]}, {"$set": {"displayOrder": current_doc["displayOrder"]}}
    )
    return {"message": "Moved", "moved": True, "direction": direction}


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
