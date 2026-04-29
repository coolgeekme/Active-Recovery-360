from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone

from services.database import get_collection
from routes.auth import require_admin

router = APIRouter()


def _parse_expiry(value) -> datetime | None:
    """Coerce admin-supplied expiry into a naive UTC datetime, matching how
    `datetime.utcnow()` is used elsewhere. Accepts ISO strings (with or
    without trailing 'Z') and existing datetime objects."""
    if not value:
        return None
    if isinstance(value, datetime):
        # If timezone-aware, convert to UTC and drop tzinfo for consistency
        if value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        # Allow "...Z" by replacing with +00:00 for fromisoformat
        text = text.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(text)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid expiresAt: {value}",
            )
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    raise HTTPException(status_code=400, detail="Invalid expiresAt type")

def transform_discount_code(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "code": doc.get("code", ""),
        "description": doc.get("description", ""),
        "discountType": doc.get("discountType", "percentage"),
        "discountValue": doc.get("discountValue", 0),
        "isActive": doc.get("isActive", True),
        "usageLimit": doc.get("usageLimit"),
        "usedCount": doc.get("usedCount", 0),
        "expiresAt": doc.get("expiresAt"),
        "createdAt": doc.get("createdAt")
    }

@router.post("/discount-codes/validate")
async def validate_discount_code(data: dict):
    code = data.get("code", "").upper()
    
    if not code:
        raise HTTPException(status_code=400, detail="Discount code is required")
    
    discount_codes = get_collection("discount_codes")
    doc = await discount_codes.find_one({"code": code})
    
    if not doc:
        raise HTTPException(status_code=404, detail="Invalid discount code")
    
    if not doc.get("isActive", True):
        raise HTTPException(status_code=400, detail="Discount code is no longer active")
    
    if doc.get("expiresAt") and datetime.utcnow() > doc["expiresAt"]:
        raise HTTPException(status_code=400, detail="Discount code has expired")
    
    if doc.get("usageLimit") and doc.get("usedCount", 0) >= doc["usageLimit"]:
        raise HTTPException(status_code=400, detail="Discount code usage limit reached")
    
    return {
        "valid": True,
        "discountCode": {
            "id": str(doc["_id"]),
            "code": doc["code"],
            "description": doc.get("description", ""),
            "discountType": doc.get("discountType"),
            "discountValue": doc.get("discountValue")
        }
    }

@router.get("/discount-codes")
async def get_discount_codes(admin: dict = Depends(require_admin)):
    discount_codes = get_collection("discount_codes")
    
    cursor = discount_codes.find().sort("createdAt", -1)
    docs = await cursor.to_list(length=100)
    
    return [transform_discount_code(doc) for doc in docs]

@router.post("/discount-codes")
async def create_discount_code(data: dict, admin: dict = Depends(require_admin)):
    discount_codes = get_collection("discount_codes")
    
    new_code = {
        "code": data.get("code", "").upper(),
        "description": data.get("description", ""),
        "discountType": data.get("discountType", "percentage"),
        "discountValue": data.get("discountValue", 0),
        "isActive": data.get("isActive", True),
        "usageLimit": data.get("usageLimit"),
        "usedCount": 0,
        "expiresAt": _parse_expiry(data.get("expiresAt")),
        "createdAt": datetime.utcnow()
    }
    
    result = await discount_codes.insert_one(new_code)
    new_code["_id"] = result.inserted_id
    
    return transform_discount_code(new_code)

@router.put("/discount-codes/{code_id}")
async def update_discount_code(code_id: str, data: dict, admin: dict = Depends(require_admin)):
    discount_codes = get_collection("discount_codes")
    
    try:
        result = await discount_codes.find_one_and_update(
            {"_id": ObjectId(code_id)},
            {"$set": data},
            return_document=True
        )
    except:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    if not result:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    return transform_discount_code(result)

@router.delete("/discount-codes/{code_id}")
async def delete_discount_code(code_id: str, admin: dict = Depends(require_admin)):
    discount_codes = get_collection("discount_codes")
    
    try:
        result = await discount_codes.delete_one({"_id": ObjectId(code_id)})
    except:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    return {"message": "Discount code deleted"}
