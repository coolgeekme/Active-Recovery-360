from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from services.database import get_collection
from routes.auth import require_admin
from services.email import send_hcp_approval_email

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
        "createdAt": doc.get("createdAt"),
        # HCP fields
        "licenseNumber": doc.get("licenseNumber"),
        "hcpStatus": doc.get("hcpStatus"),
        "specialty": doc.get("specialty"),
        "hcpAppliedAt": doc.get("hcpAppliedAt")
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

# HCP Management Endpoints
@router.get("/hcp/pending")
async def get_pending_hcp_applications(admin: dict = Depends(require_admin)):
    """Get all pending HCP applications"""
    users = get_collection("users")
    
    cursor = users.find({"hcpStatus": "pending"}).sort("hcpAppliedAt", -1)
    docs = await cursor.to_list(length=100)
    
    return [transform_user(doc) for doc in docs]

@router.get("/hcp/all")
async def get_all_hcp_applications(admin: dict = Depends(require_admin)):
    """Get all HCP applications (pending, approved, rejected)"""
    users = get_collection("users")
    
    cursor = users.find({"hcpStatus": {"$exists": True}}).sort("hcpAppliedAt", -1)
    docs = await cursor.to_list(length=500)
    
    return [transform_user(doc) for doc in docs]

@router.post("/hcp/{user_id}/approve")
async def approve_hcp(user_id: str, admin: dict = Depends(require_admin)):
    """Approve an HCP application"""
    users = get_collection("users")
    
    try:
        user = await users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("hcpStatus") != "pending":
        raise HTTPException(status_code=400, detail="User does not have a pending HCP application")
    
    # Approve the user - set isDoctor to True and update status
    result = await users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "hcpStatus": "approved",
            "isDoctor": True,
            "hcpApprovedAt": datetime.utcnow(),
            "hcpApprovedBy": admin["id"]
        }},
        return_document=True
    )
    
    # Send approval email
    await send_hcp_approval_email(
        to_email=result["email"],
        user_name=result.get("fullName", "Healthcare Professional"),
        approved=True
    )
    
    return transform_user(result)

@router.post("/hcp/{user_id}/reject")
async def reject_hcp(user_id: str, rejection_data: dict = None, admin: dict = Depends(require_admin)):
    """Reject an HCP application"""
    users = get_collection("users")
    
    try:
        user = await users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("hcpStatus") != "pending":
        raise HTTPException(status_code=400, detail="User does not have a pending HCP application")
    
    reason = rejection_data.get("reason", "") if rejection_data else ""
    
    # Reject the application
    result = await users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "hcpStatus": "rejected",
            "hcpRejectedAt": datetime.utcnow(),
            "hcpRejectedBy": admin["id"],
            "hcpRejectionReason": reason
        }},
        return_document=True
    )
    
    # Send rejection email
    await send_hcp_approval_email(
        to_email=result["email"],
        user_name=result.get("fullName", "User"),
        approved=False
    )
    
    return transform_user(result)

@router.get("/stats")
async def get_admin_stats(admin: dict = Depends(require_admin)):
    """Get admin dashboard statistics"""
    users = get_collection("users")
    products = get_collection("products")
    orders = get_collection("orders")
    
    total_users = await users.count_documents({})
    total_members = await users.count_documents({"isMember": True})
    total_hcps = await users.count_documents({"isDoctor": True})
    pending_hcps = await users.count_documents({"hcpStatus": "pending"})
    total_products = await products.count_documents({})
    total_orders = await orders.count_documents({})
    pending_orders = await orders.count_documents({"status": "pending"})
    
    return {
        "users": {
            "total": total_users,
            "members": total_members,
            "hcps": total_hcps,
            "pendingHcpApplications": pending_hcps
        },
        "products": {
            "total": total_products
        },
        "orders": {
            "total": total_orders,
            "pending": pending_orders
        }
    }
