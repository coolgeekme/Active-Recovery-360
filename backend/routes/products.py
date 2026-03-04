from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from bson import ObjectId

from services.database import get_collection
from routes.auth import require_admin

router = APIRouter()

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
        "createdAt": doc.get("createdAt")
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
    
    new_product = {
        "name": product_data.get("name"),
        "description": product_data.get("description"),
        "price": product_data.get("price"),
        "imageUrl": product_data.get("imageUrl"),
        "visibility": product_data.get("visibility", "public"),
        "categoryId": product_data.get("categoryId"),
        "stockQuantity": product_data.get("stockQuantity", 0),
        "featured": product_data.get("featured", False),
        "doctorIds": product_data.get("doctorIds", [])
    }
    
    result = await products.insert_one(new_product)
    
    # Update category product count
    if new_product.get("categoryId"):
        await categories.update_one(
            {"_id": ObjectId(new_product["categoryId"])},
            {"$inc": {"productCount": 1}}
        )
    
    new_product["_id"] = result.inserted_id
    return transform_product(new_product)

@router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: dict, admin: dict = Depends(require_admin)):
    products = get_collection("products")
    
    try:
        result = await products.find_one_and_update(
            {"_id": ObjectId(product_id)},
            {"$set": product_data},
            return_document=True
        )
    except:
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
