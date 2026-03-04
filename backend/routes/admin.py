from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from services.database import get_collection
from routes.auth import require_admin

router = APIRouter()

def transform_user(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "username": doc.get("username", ""),
        "email": doc.get("email", ""),
        "fullName": doc.get("fullName", ""),
        "isMember": doc.get("isMember", False),
        "isAdmin": doc.get("isAdmin", False),
        "isDoctor": doc.get("isDoctor", False),
        "doctorTitle": doc.get("doctorTitle"),
        "doctorSpecialty": doc.get("doctorSpecialty"),
        "doctorBio": doc.get("doctorBio"),
        "profileImage": doc.get("profileImage"),
        "createdAt": doc.get("createdAt")
    }

@router.get("/users")
async def get_users(admin: dict = Depends(require_admin)):
    users = get_collection("users")
    
    cursor = users.find()
    docs = await cursor.to_list(length=500)
    
    return [transform_user(doc) for doc in docs]

@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, role_data: dict, admin: dict = Depends(require_admin)):
    users = get_collection("users")
    
    allowed_fields = ["isMember", "isAdmin", "isDoctor"]
    updates = {k: v for k, v in role_data.items() if k in allowed_fields and isinstance(v, bool)}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No valid role updates provided")
    
    try:
        result = await users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": updates},
            return_document=True
        )
    except:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return transform_user(result)

@router.get("/orders")
async def get_all_orders(admin: dict = Depends(require_admin)):
    orders = get_collection("orders")
    
    cursor = orders.find().sort("createdAt", -1)
    docs = await cursor.to_list(length=500)
    
    result = []
    for doc in docs:
        result.append({
            "id": str(doc["_id"]),
            "userId": str(doc.get("userId", "")),
            "totalAmount": doc.get("totalAmount", 0),
            "status": doc.get("status", "pending"),
            "items": doc.get("items", []),
            "shippingAddress": doc.get("shippingAddress", ""),
            "createdAt": doc.get("createdAt")
        })
    
    return result
