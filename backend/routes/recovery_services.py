"""Recovery Services directory: admin-managed local clinical-recovery businesses
that offer member discounts. Two-stage workflow: admin creates as draft, then
publishes when ready.
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from bson.errors import InvalidId

from services.database import get_collection
from routes.auth import require_admin, require_auth

router = APIRouter()


def transform_service(doc: dict, member_view: bool = False) -> dict | None:
    """Return service for API. If `member_view` is False (non-member), the
    member discount details are stripped so non-members are gated."""
    if not doc:
        return None
    discount = doc.get("memberDiscount") or {}
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "category": doc.get("category", ""),
        "description": doc.get("description", ""),
        "logoUrl": doc.get("logoUrl"),
        "photoUrl": doc.get("photoUrl"),
        "website": doc.get("website"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "memberDiscount": discount if member_view else {"locked": True, "hasDiscount": bool(discount)},
        "locations": doc.get("locations") or [],
        "status": doc.get("status", "draft"),
        "createdAt": doc.get("createdAt"),
        "approvedAt": doc.get("approvedAt"),
    }


def _normalize_location(loc: dict) -> dict:
    return {
        "name": (loc.get("name") or "").strip(),
        "address": (loc.get("address") or "").strip(),
        "city": (loc.get("city") or "").strip(),
        "state": (loc.get("state") or "").strip(),
        "zipCode": (loc.get("zipCode") or "").strip(),
        "phone": (loc.get("phone") or "").strip() or None,
        "hours": (loc.get("hours") or "").strip() or None,
        "latitude": float(loc["latitude"]) if loc.get("latitude") not in (None, "") else None,
        "longitude": float(loc["longitude"]) if loc.get("longitude") not in (None, "") else None,
    }


def _build_doc(payload: dict) -> dict:
    return {
        "name": (payload.get("name") or "").strip(),
        "category": (payload.get("category") or "").strip(),
        "description": (payload.get("description") or "").strip(),
        "logoUrl": payload.get("logoUrl") or None,
        "photoUrl": payload.get("photoUrl") or None,
        "website": payload.get("website") or None,
        "email": payload.get("email") or None,
        "phone": payload.get("phone") or None,
        "memberDiscount": payload.get("memberDiscount") or {},
        "locations": [_normalize_location(loc) for loc in (payload.get("locations") or [])],
        "status": payload.get("status", "draft"),
    }


# ---------- Public (members) ----------

@router.get("/recovery-services")
async def list_recovery_services(
    category: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    q: Optional[str] = None,
    user: dict = Depends(require_auth),
):
    """Authenticated users see published services. Discount details only
    revealed to members. Filters: category, city, state, free-text q."""
    services_coll = get_collection("recovery_services")
    query: dict = {"status": "published"}

    if category:
        query["category"] = category
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
        ]

    cursor = services_coll.find(query).sort("name", 1)
    raw = await cursor.to_list(length=500)

    # Location-based filters happen in Python since they're nested
    def matches_location(doc: dict) -> bool:
        if not (city or state):
            return True
        for loc in doc.get("locations") or []:
            if city and (loc.get("city", "").lower() != city.lower()):
                continue
            if state and (loc.get("state", "").lower() != state.lower()):
                continue
            return True
        return False

    filtered = [d for d in raw if matches_location(d)]
    is_member = bool(user.get("isMember") or user.get("isAdmin"))
    return [transform_service(d, member_view=is_member) for d in filtered]


@router.get("/recovery-services/{service_id}")
async def get_recovery_service(service_id: str, user: dict = Depends(require_auth)):
    services_coll = get_collection("recovery_services")
    try:
        doc = await services_coll.find_one({"_id": ObjectId(service_id), "status": "published"})
    except InvalidId:
        raise HTTPException(status_code=404, detail="Service not found")
    if not doc:
        raise HTTPException(status_code=404, detail="Service not found")
    is_member = bool(user.get("isMember") or user.get("isAdmin"))
    return transform_service(doc, member_view=is_member)


# ---------- Admin ----------

@router.get("/admin/recovery-services")
async def admin_list_recovery_services(admin: dict = Depends(require_admin)):
    services_coll = get_collection("recovery_services")
    cursor = services_coll.find({}).sort("createdAt", -1)
    raw = await cursor.to_list(length=1000)
    # Admin always sees full discount info
    return [transform_service(d, member_view=True) for d in raw]


@router.post("/admin/recovery-services")
async def admin_create_recovery_service(payload: dict, admin: dict = Depends(require_admin)):
    services_coll = get_collection("recovery_services")
    doc = _build_doc(payload)
    if not doc["name"]:
        raise HTTPException(status_code=400, detail="Business name is required")
    if not doc["category"]:
        raise HTTPException(status_code=400, detail="Category is required")
    if not doc["locations"]:
        raise HTTPException(status_code=400, detail="At least one location is required")
    doc["createdAt"] = datetime.now(timezone.utc).isoformat()
    doc["submittedBy"] = admin["id"]
    if doc["status"] == "published":
        doc["approvedAt"] = doc["createdAt"]
        doc["approvedBy"] = admin["id"]
    result = await services_coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return transform_service(doc, member_view=True)


@router.put("/admin/recovery-services/{service_id}")
async def admin_update_recovery_service(
    service_id: str, payload: dict, admin: dict = Depends(require_admin)
):
    services_coll = get_collection("recovery_services")
    try:
        oid = ObjectId(service_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Service not found")

    update = _build_doc(payload)
    # If transitioning to published, stamp approval
    existing = await services_coll.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    if update["status"] == "published" and existing.get("status") != "published":
        update["approvedAt"] = datetime.now(timezone.utc).isoformat()
        update["approvedBy"] = admin["id"]

    await services_coll.update_one({"_id": oid}, {"$set": update})
    fresh = await services_coll.find_one({"_id": oid})
    return transform_service(fresh, member_view=True)


@router.post("/admin/recovery-services/{service_id}/publish")
async def admin_publish_recovery_service(
    service_id: str, admin: dict = Depends(require_admin)
):
    services_coll = get_collection("recovery_services")
    try:
        oid = ObjectId(service_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Service not found")
    now = datetime.now(timezone.utc).isoformat()
    result = await services_coll.find_one_and_update(
        {"_id": oid},
        {"$set": {"status": "published", "approvedAt": now, "approvedBy": admin["id"]}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Service not found")
    return transform_service(result, member_view=True)


@router.post("/admin/recovery-services/{service_id}/unpublish")
async def admin_unpublish_recovery_service(
    service_id: str, admin: dict = Depends(require_admin)
):
    services_coll = get_collection("recovery_services")
    try:
        oid = ObjectId(service_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Service not found")
    result = await services_coll.find_one_and_update(
        {"_id": oid}, {"$set": {"status": "draft"}}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Service not found")
    return transform_service(result, member_view=True)


@router.delete("/admin/recovery-services/{service_id}")
async def admin_delete_recovery_service(
    service_id: str, admin: dict = Depends(require_admin)
):
    services_coll = get_collection("recovery_services")
    try:
        oid = ObjectId(service_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Service not found")
    result = await services_coll.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted"}
