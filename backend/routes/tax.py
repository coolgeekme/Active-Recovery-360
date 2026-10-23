"""Sales tax config endpoints.

GET  /api/tax/config   public  — the checkout page needs the rate before login
PUT  /api/tax/config   admin   — change the rate without a deploy
"""
from fastapi import APIRouter, Depends, HTTPException

from routes.auth import require_admin
from services.database import get_collection
from services.tax import DEFAULTS, SETTINGS_ID, _normalise, get_tax_config, normalise_state

router = APIRouter()


@router.get("/tax/config")
async def read_tax_config():
    """Public: checkout must be able to price tax for a guest."""
    return await get_tax_config()


@router.put("/tax/config")
async def update_tax_config(payload: dict, user: dict = Depends(require_admin)):
    """Admin: persist a partial update. Only known keys are honoured."""
    updates: dict = {}

    for flag in ("enabled", "taxShipping"):
        if flag in payload:
            updates[flag] = bool(payload[flag])

    if "rateBps" in payload:
        try:
            rate = int(payload["rateBps"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="rateBps must be whole basis points (910 = 9.10%)")
        if rate < 0 or rate > 10000:
            raise HTTPException(status_code=400, detail="rateBps must be between 0 and 10000")
        updates["rateBps"] = rate

    if "states" in payload:
        try:
            codes = [normalise_state(s) for s in payload["states"]]
        except TypeError:
            raise HTTPException(status_code=400, detail="states must be a list of state codes")
        codes = [c for c in codes if c]
        if not codes:
            raise HTTPException(status_code=400, detail="states cannot be empty")
        updates["states"] = codes

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
    return {"status": "updated", "changed": sorted(updates), "config": _normalise(doc)}


@router.delete("/tax/config")
async def reset_tax_config(user: dict = Depends(require_admin)):
    """Admin: drop the stored override and fall back to code defaults."""
    settings = get_collection("settings")
    await settings.delete_one({"_id": SETTINGS_ID})
    return {"status": "reset", "config": dict(DEFAULTS)}
