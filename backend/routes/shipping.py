"""Shipping config endpoints.

GET  /api/shipping/config   public  — the checkout page needs these numbers
PUT  /api/shipping/config   admin   — change the rate without a deploy
"""
from fastapi import APIRouter, Depends, HTTPException

from routes.auth import require_admin
from services.database import get_collection
from services.shipping import (
    DEFAULTS,
    SETTINGS_ID,
    _normalise,
    get_shipping_config,
)

router = APIRouter()


@router.get("/shipping/config")
async def read_shipping_config():
    """Public: the storefront must be able to price a cart before login."""
    return await get_shipping_config()


@router.put("/shipping/config")
async def update_shipping_config(payload: dict, user: dict = Depends(require_admin)):
    """Admin: persist a partial update. Only known keys are honoured."""
    updates: dict = {}

    if "enabled" in payload:
        updates["enabled"] = bool(payload["enabled"])

    for key in ("flatRate", "freeShippingThreshold"):
        if key in payload:
            try:
                value = int(payload[key])
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail=f"{key} must be a whole number of cents")
            if value < 0:
                raise HTTPException(status_code=400, detail=f"{key} cannot be negative")
            updates[key] = value

    if "label" in payload:
        label = str(payload["label"] or "").strip()
        if not label:
            raise HTTPException(status_code=400, detail="label cannot be empty")
        updates["label"] = label[:60]

    if not updates:
        raise HTTPException(status_code=400, detail="No recognised fields to update")

    settings = get_collection("settings")
    await settings.update_one({"_id": SETTINGS_ID}, {"$set": updates}, upsert=True)

    doc = await settings.find_one({"_id": SETTINGS_ID})
    merged = _normalise(doc)
    return {"status": "updated", "changed": sorted(updates), "config": merged}


@router.delete("/shipping/config")
async def reset_shipping_config(user: dict = Depends(require_admin)):
    """Admin: drop the stored override and fall back to code defaults."""
    settings = get_collection("settings")
    await settings.delete_one({"_id": SETTINGS_ID})
    return {"status": "reset", "config": dict(DEFAULTS)}
