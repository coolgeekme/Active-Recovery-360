"""Affiliate program interest list. Captures emails of people who want to be
notified when the affiliate program launches. Admin can review submissions at
/admin/affiliate-signups (future)."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from bson.errors import InvalidId

from services.database import get_collection
from routes.auth import require_admin

router = APIRouter()


class AffiliateSignup(BaseModel):
    email: EmailStr
    name: str | None = Field(default=None, max_length=120)


def _transform(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "email": doc.get("email", ""),
        "name": doc.get("name") or None,
        "createdAt": doc.get("createdAt"),
    }


@router.post("/affiliate-signups")
async def create_affiliate_signup(payload: AffiliateSignup):
    coll = get_collection("affiliate_signups")
    # De-dupe by email — keep the earliest signup
    existing = await coll.find_one({"email": payload.email})
    if existing:
        return {
            "status": "already_subscribed",
            "message": "You're already on the list — we'll be in touch when we launch.",
        }
    await coll.insert_one(
        {
            "email": payload.email,
            "name": (payload.name or "").strip() or None,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {
        "status": "success",
        "message": "Thanks! We'll email you when the affiliate program opens.",
    }


# ---------- Admin ----------

@router.get("/admin/affiliate-signups")
async def admin_list_signups(admin: dict = Depends(require_admin)):
    coll = get_collection("affiliate_signups")
    docs = await coll.find({}).sort("createdAt", -1).to_list(length=1000)
    return [_transform(d) for d in docs]


@router.delete("/admin/affiliate-signups/{signup_id}")
async def admin_delete_signup(signup_id: str, admin: dict = Depends(require_admin)):
    try:
        oid = ObjectId(signup_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Signup not found")
    coll = get_collection("affiliate_signups")
    result = await coll.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Signup not found")
    return {"message": "Deleted"}
