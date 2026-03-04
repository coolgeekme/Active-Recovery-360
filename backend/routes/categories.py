from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from services.database import get_collection
from routes.auth import require_admin

router = APIRouter()

def transform_category(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "description": doc.get("description", ""),
        "imageUrl": doc.get("imageUrl"),
        "productCount": doc.get("productCount", 0)
    }

@router.get("/categories")
async def get_categories():
    categories = get_collection("categories")
    cursor = categories.find()
    docs = await cursor.to_list(length=100)
    return [transform_category(doc) for doc in docs]

@router.get("/categories/{category_id}")
async def get_category(category_id: str):
    categories = get_collection("categories")
    
    try:
        doc = await categories.find_one({"_id": ObjectId(category_id)})
    except:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return transform_category(doc)

@router.post("/categories")
async def create_category(category_data: dict, admin: dict = Depends(require_admin)):
    categories = get_collection("categories")
    
    new_category = {
        "name": category_data.get("name"),
        "description": category_data.get("description"),
        "imageUrl": category_data.get("imageUrl"),
        "productCount": 0
    }
    
    result = await categories.insert_one(new_category)
    new_category["_id"] = result.inserted_id
    return transform_category(new_category)

@router.put("/categories/{category_id}")
async def update_category(category_id: str, category_data: dict, admin: dict = Depends(require_admin)):
    categories = get_collection("categories")
    
    try:
        result = await categories.find_one_and_update(
            {"_id": ObjectId(category_id)},
            {"$set": category_data},
            return_document=True
        )
    except:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return transform_category(result)

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, admin: dict = Depends(require_admin)):
    categories = get_collection("categories")
    
    try:
        result = await categories.delete_one({"_id": ObjectId(category_id)})
    except:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted"}
