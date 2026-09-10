"""Product-order repair (idempotent, explicitly opt-in).

Products carry a global `displayOrder` and an optional per-category
`categoryOrder.<categoryId>`. The app sorts by:

    categoryOrder[categoryId]  ??  displayOrder  ??  999999

When a category has a MIX of both — some members holding a per-category key and
the rest falling back to `displayOrder` — the effective order is incoherent: the
admin table, the storefront and the move endpoint can each compute a different
list, and a move reports "Already at bottom" for a product that is visibly
mid-list. Self-Care Tools was in exactly that state (2 of 20 keyed).

Normalizing rewrites every member of a category to sequential keys (10, 20, 30,
…) in its current effective order, so every reader agrees. It is order
preserving: products keep the position they already display, and re-running is a
no-op.

Production data writes are deliberate, never automatic on boot, so this only
runs when the environment sets:

    AR360_ORDER_REPAIR=1

Optional — products to move to the END of a category, as `productId:categoryId`
pairs separated by semicolons (used for one-off "put X last" client requests):

    AR360_ORDER_PINS=6a8ca86e476b82a84db78789:69a74a0ce5b1b6ab12650623

Unset both once the startup log reports `[ORDER-REPAIR] done`.
"""
from __future__ import annotations

import json
import os

from bson import ObjectId
from bson.errors import InvalidId

from services.database import get_collection

TRUTHY = {"1", "true", "yes", "on"}


def _enabled() -> bool:
    return os.getenv("AR360_ORDER_REPAIR", "").strip().lower() in TRUTHY


async def run_order_repair() -> dict:
    """Normalize per-category ordering, then apply any configured pins.

    Returns a report dict; also prints a single-line JSON summary for the
    deploy logs. Safe to re-run.
    """
    if not _enabled():
        return {"skipped": "AR360_ORDER_REPAIR not set"}

    # Imported here (not at module import time) to avoid an import cycle:
    # routes.products imports from services, and this runs post-startup.
    from routes.products import _category_match, _normalize_order

    products = get_collection("products")
    categories = get_collection("categories")

    report: dict = {"normalized": [], "empty": 0, "pinned": [], "pin_errors": []}

    async for cat in categories.find({}):
        cid = str(cat["_id"])
        membership = _category_match(cid)  # array OR legacy scalar
        total = await products.count_documents(membership)
        if not total:
            report["empty"] += 1
            continue
        keyed_before = await products.count_documents(
            {**membership, f"categoryOrder.{cid}": {"$exists": True}}
        )
        await _normalize_order(cid)
        report["normalized"].append(
            {
                "categoryId": cid,
                "name": cat.get("name", ""),
                "members": total,
                "keyedBefore": keyed_before,
            }
        )

    for pair in (os.getenv("AR360_ORDER_PINS") or "").split(";"):
        pair = pair.strip()
        if not pair or ":" not in pair:
            continue
        product_id, category_id = (part.strip() for part in pair.split(":", 1))
        try:
            target = await products.find_one({"_id": ObjectId(product_id)})
        except (InvalidId, TypeError):
            report["pin_errors"].append({"pin": pair, "error": "invalid product id"})
            continue
        if not target:
            report["pin_errors"].append({"pin": pair, "error": "product not found"})
            continue

        members = await products.find(_category_match(category_id)).to_list(length=2000)
        if not members:
            report["pin_errors"].append({"pin": pair, "error": "category has no products"})
            continue
        highest = max(
            ((m.get("categoryOrder") or {}).get(category_id) or 0) for m in members
        )
        new_order = highest + 10
        await products.update_one(
            {"_id": target["_id"]},
            {"$set": {f"categoryOrder.{category_id}": new_order}},
        )
        report["pinned"].append(
            {
                "productId": product_id,
                "name": target.get("name"),
                "categoryId": category_id,
                "order": new_order,
            }
        )

    print(f"[ORDER-REPAIR] done {json.dumps(report)}")
    return report
