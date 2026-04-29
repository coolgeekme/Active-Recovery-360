"""HCP Storefront endpoints.

- GET  /api/hcp/storefronts/{slug}              public — view a published storefront + its products
- GET  /api/hcp/me/storefront                   HCP self — fetch own storefront
- PUT  /api/hcp/me/storefront                   HCP self — update own storefront (admin can also call)
- POST /api/hcp/uploads/image                   HCP self/admin — upload a headshot/banner to Object Storage
- GET  /api/admin/hcp/{user_id}/storefront      admin — fetch any HCP's storefront for editing
- PUT  /api/admin/hcp/{user_id}/storefront      admin — override any HCP's storefront
"""
import re
import uuid

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from bson import ObjectId
from bson.errors import InvalidId

from services.database import get_collection
from services.storage import put_object
from routes.auth import require_auth, require_admin, transform_user
from routes.products import transform_product

router = APIRouter()

ALLOWED_IMAGE_MIME = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

# Fields admins/HCPs can update on their own storefront
EDITABLE_FIELDS = {
    "storefrontEnabled",
    "storefrontSlug",
    "storefrontBio",
    "storefrontHeadshotUrl",
    "storefrontBannerUrl",
    "storefrontWelcomeMessage",
    "storefrontFeaturedProductIds",
}

# Fields ONLY admins can change (commission %)
ADMIN_ONLY_FIELDS = {"commissionPercent"}

SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$")


def normalize_slug(value: str) -> str:
    s = (value or "").strip().lower()
    s = re.sub(r"[^a-z0-9-]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


async def _ensure_unique_slug(users_coll, slug: str, current_user_id: str | None = None) -> None:
    """Raise 400 if another user already owns this slug."""
    if not slug:
        return
    if not SLUG_RE.match(slug):
        raise HTTPException(
            status_code=400,
            detail="Slug must be 3-50 characters: lowercase letters, numbers, and dashes only.",
        )
    query = {"storefrontSlug": slug}
    if current_user_id:
        try:
            query["_id"] = {"$ne": ObjectId(current_user_id)}
        except InvalidId:
            pass
    existing = await users_coll.find_one(query)
    if existing:
        raise HTTPException(status_code=400, detail="That storefront URL is already taken.")


async def _hydrate_storefront(user_doc: dict, include_products: bool = True) -> dict:
    """Build the public storefront response: public profile + curated products."""
    products_coll = get_collection("products")

    public_profile = {
        "id": str(user_doc["_id"]),
        "fullName": user_doc.get("fullName"),
        "specialty": user_doc.get("specialty"),
        "storefrontSlug": user_doc.get("storefrontSlug"),
        "storefrontBio": user_doc.get("storefrontBio"),
        "storefrontHeadshotUrl": user_doc.get("storefrontHeadshotUrl"),
        "storefrontBannerUrl": user_doc.get("storefrontBannerUrl"),
        "storefrontWelcomeMessage": user_doc.get("storefrontWelcomeMessage"),
        "storefrontEnabled": user_doc.get("storefrontEnabled", False),
    }

    if not include_products:
        return {"profile": public_profile, "products": []}

    featured_ids = user_doc.get("storefrontFeaturedProductIds") or []
    products: list[dict] = []
    if featured_ids:
        # Convert string IDs to ObjectIds where valid
        oids = []
        for pid in featured_ids:
            try:
                oids.append(ObjectId(pid))
            except (InvalidId, TypeError):
                continue
        cursor = products_coll.find({"_id": {"$in": oids}})
        raw = await cursor.to_list(length=200)
        # Preserve curator's order
        by_id = {str(p["_id"]): p for p in raw}
        for pid in featured_ids:
            doc = by_id.get(str(pid))
            if doc:
                products.append(transform_product(doc))

    return {"profile": public_profile, "products": products}


# ---------- Public ----------

@router.get("/hcp/storefronts/{slug}")
async def get_storefront_by_slug(slug: str):
    users = get_collection("users")
    user = await users.find_one({"storefrontSlug": slug.lower()})
    if not user or not user.get("storefrontEnabled"):
        raise HTTPException(status_code=404, detail="Storefront not found")
    if user.get("hcpStatus") != "approved":
        raise HTTPException(status_code=404, detail="Storefront not found")
    return await _hydrate_storefront(user)


@router.get("/hcp/storefronts")
async def list_public_storefronts():
    """Lightweight directory used by HCP self-service to validate slug
    availability. Public exposure is opt-in via storefrontEnabled."""
    users = get_collection("users")
    cursor = users.find(
        {"storefrontEnabled": True, "hcpStatus": "approved"},
        {
            "fullName": 1, "specialty": 1, "storefrontSlug": 1,
            "storefrontHeadshotUrl": 1, "storefrontBio": 1,
        },
    )
    docs = await cursor.to_list(length=200)
    return [
        {
            "id": str(d["_id"]),
            "fullName": d.get("fullName"),
            "specialty": d.get("specialty"),
            "storefrontSlug": d.get("storefrontSlug"),
            "storefrontHeadshotUrl": d.get("storefrontHeadshotUrl"),
            "storefrontBio": d.get("storefrontBio"),
        }
        for d in docs
    ]


# ---------- HCP self-service ----------

async def _require_approved_hcp(user: dict = Depends(require_auth)) -> dict:
    if not user.get("isDoctor") or user.get("hcpStatus") != "approved":
        raise HTTPException(status_code=403, detail="Approved HCP status required")
    return user


@router.get("/hcp/me/storefront")
async def get_my_storefront(user: dict = Depends(_require_approved_hcp)):
    users = get_collection("users")
    doc = await users.find_one({"_id": ObjectId(user["id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    response = await _hydrate_storefront(doc)
    response["editable"] = transform_user(doc)
    return response


@router.put("/hcp/me/storefront")
async def update_my_storefront(payload: dict, user: dict = Depends(_require_approved_hcp)):
    users = get_collection("users")
    update: dict = {}
    for k, v in payload.items():
        if k in EDITABLE_FIELDS:
            update[k] = v
    if "storefrontSlug" in update:
        update["storefrontSlug"] = normalize_slug(update["storefrontSlug"]) or None
        if update["storefrontSlug"]:
            await _ensure_unique_slug(users, update["storefrontSlug"], user["id"])
    if "storefrontFeaturedProductIds" in update:
        ids = update["storefrontFeaturedProductIds"]
        if not isinstance(ids, list):
            raise HTTPException(status_code=400, detail="storefrontFeaturedProductIds must be a list")
        update["storefrontFeaturedProductIds"] = [str(i) for i in ids]

    if not update:
        raise HTTPException(status_code=400, detail="No editable fields provided")

    await users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    doc = await users.find_one({"_id": ObjectId(user["id"])})
    response = await _hydrate_storefront(doc)
    response["editable"] = transform_user(doc)
    return response


@router.post("/hcp/uploads/image")
async def upload_storefront_image(
    file: UploadFile = File(...),
    user: dict = Depends(_require_approved_hcp),
):
    """HCP/admin can upload a headshot or banner to Object Storage. Returns
    the public proxy URL to be saved as storefrontHeadshotUrl/storefrontBannerUrl."""
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_MIME:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {content_type}")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller.")
    ext = ALLOWED_IMAGE_MIME[content_type]
    storage_path = f"ar360/hcp/{uuid.uuid4().hex}.{ext}"
    try:
        put_object(storage_path, data, content_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upload failed: {e}")
    return {"path": storage_path, "url": f"/api/files/{storage_path}"}


# ---------- Admin override ----------

@router.get("/admin/hcp/{user_id}/storefront")
async def admin_get_storefront(user_id: str, admin: dict = Depends(require_admin)):
    users = get_collection("users")
    try:
        doc = await users.find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        raise HTTPException(status_code=404, detail="User not found")
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    response = await _hydrate_storefront(doc)
    response["editable"] = transform_user(doc)
    return response


@router.put("/admin/hcp/{user_id}/storefront")
async def admin_update_storefront(user_id: str, payload: dict, admin: dict = Depends(require_admin)):
    users = get_collection("users")
    try:
        doc = await users.find_one({"_id": ObjectId(user_id)})
    except InvalidId:
        raise HTTPException(status_code=404, detail="User not found")
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")

    update: dict = {}
    for k, v in payload.items():
        if k in EDITABLE_FIELDS or k in ADMIN_ONLY_FIELDS:
            update[k] = v
    if "storefrontSlug" in update:
        update["storefrontSlug"] = normalize_slug(update["storefrontSlug"]) or None
        if update["storefrontSlug"]:
            await _ensure_unique_slug(users, update["storefrontSlug"], user_id)
    if "storefrontFeaturedProductIds" in update:
        ids = update["storefrontFeaturedProductIds"]
        if not isinstance(ids, list):
            raise HTTPException(status_code=400, detail="storefrontFeaturedProductIds must be a list")
        update["storefrontFeaturedProductIds"] = [str(i) for i in ids]
    if "commissionPercent" in update:
        try:
            cp = float(update["commissionPercent"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="commissionPercent must be a number")
        if cp < 0 or cp > 100:
            raise HTTPException(status_code=400, detail="commissionPercent must be between 0 and 100")
        update["commissionPercent"] = cp

    if not update:
        raise HTTPException(status_code=400, detail="No editable fields provided")

    await users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    fresh = await users.find_one({"_id": ObjectId(user_id)})
    response = await _hydrate_storefront(fresh)
    response["editable"] = transform_user(fresh)
    return response
