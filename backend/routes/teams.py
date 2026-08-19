"""Teams & Trainers program signup. Captures athletic teams and athletic
trainers who want a team/affiliate code (fundraiser-style referral) or bulk
purchase. Admin can review submissions at /admin/team-signups."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from bson.errors import InvalidId

from services.database import get_collection
from routes.auth import require_admin

router = APIRouter()


class TeamSignup(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    organization: str | None = Field(default=None, max_length=160)
    role: str = "team"  # "team" | "trainer" | "both"
    message: str | None = Field(default=None, max_length=1000)


def _transform(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "organization": doc.get("organization"),
        "role": doc.get("role", "team"),
        "message": doc.get("message"),
        "createdAt": doc.get("createdAt"),
    }


@router.post("/team-signups")
async def create_team_signup(payload: TeamSignup):
    coll = get_collection("team_signups")
    # De-dupe by email
    existing = await coll.find_one({"email": payload.email})
    if existing:
        return {
            "status": "already_subscribed",
            "message": "You're already on the list — we'll be in touch soon.",
        }
    await coll.insert_one(
        {
            "name": payload.name.strip(),
            "email": payload.email,
            "organization": (payload.organization or "").strip() or None,
            "role": payload.role,
            "message": (payload.message or "").strip() or None,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {
        "status": "success",
        "message": "Thanks! We'll email you with your team code and next steps.",
    }


# ---------- Admin ----------

@router.get("/admin/team-signups")
async def admin_list_signups(admin: dict = Depends(require_admin)):
    coll = get_collection("team_signups")
    docs = await coll.find({}).sort("createdAt", -1).to_list(length=1000)
    return [_transform(d) for d in docs]


@router.delete("/admin/team-signups/{signup_id}")
async def admin_delete_signup(signup_id: str, admin: dict = Depends(require_admin)):
    try:
        oid = ObjectId(signup_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Signup not found")
    coll = get_collection("team_signups")
    result = await coll.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Signup not found")
    return {"message": "Deleted"}
