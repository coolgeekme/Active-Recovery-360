from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
import re

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

async def _generate_default_slug(users_coll, user_doc: dict) -> str:
    """Build a unique default storefront slug from the provider's name."""
    base = re.sub(
        r"[^a-z0-9]+", "-",
        (user_doc.get("fullName") or "provider").strip().lower(),
    ).strip("-")
    base = base or "provider"
    slug = base
    counter = 2
    while await users_coll.find_one({"storefrontSlug": slug, "_id": {"$ne": user_doc["_id"]}}):
        slug = f"{base}-{counter}"
        counter += 1
    return slug


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

    # Pre-generate a default storefront slug so the approval email can point the
    # provider at their future storefront URL without requiring them to pick one.
    storefront_slug = user.get("storefrontSlug")
    if not storefront_slug:
        storefront_slug = await _generate_default_slug(users, user)
    
    # Approve the user - set isDoctor to True and update status
    result = await users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "hcpStatus": "approved",
            "isDoctor": True,
            "hcpApprovedAt": datetime.utcnow(),
            "hcpApprovedBy": admin["id"],
            "storefrontSlug": storefront_slug,
        }},
        return_document=True
    )
    
    # Send approval email
    await send_hcp_approval_email(
        to_email=result["email"],
        user_name=result.get("fullName", "Healthcare Professional"),
        approved=True,
        storefront_slug=storefront_slug,
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
        approved=False,
        reason=reason,
    )
    
    return transform_user(result)

@router.get("/stats")
async def get_admin_stats(admin: dict = Depends(require_admin)):
    """Get admin dashboard statistics"""
    users = get_collection("users")
    products = get_collection("products")
    orders = get_collection("orders")
    categories = get_collection("categories")

    total_users = await users.count_documents({})
    total_members = await users.count_documents({"isMember": True})
    total_hcps = await users.count_documents({"isDoctor": True})
    pending_hcps = await users.count_documents({"hcpStatus": "pending"})
    total_products = await products.count_documents({})
    total_orders = await orders.count_documents({})
    pending_orders = await orders.count_documents({"status": "pending"})
    total_categories = await categories.count_documents({})

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
        },
        "categories": {
            "total": total_categories
        }
    }

@router.post("/users/{user_id}/make-admin")
async def make_user_admin(user_id: str, admin: dict = Depends(require_admin)):
    """Promote a user to admin. Admin only."""
    users = get_collection("users")
    
    try:
        result = await users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": {"isAdmin": True}},
            return_document=True
        )
    except:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return transform_user(result)
