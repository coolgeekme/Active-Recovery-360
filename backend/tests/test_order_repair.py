#!/usr/bin/env python3
"""Exercise order_repair.run_order_repair against an in-memory fake DB (no Mongo needed).

Covers: opt-in gating, per-category normalization, products stored with the
legacy scalar `categoryId` (the shape that made the move endpoint see a partial
list), pin placement at the end, pin error paths, and idempotency.

Stubs `services.database` and `routes.products` so no real Mongo or app boot is
required. Run: `python backend/tests/test_order_repair.py`
"""
import asyncio
import importlib.util
import json
import os
import sys
import types
from pathlib import Path

from bson import ObjectId

REPO = Path(__file__).resolve().parents[1]
SC_CAT = ObjectId("69a74a0ce5b1b6ab12650623")   # categories._id is an ObjectId
QMOUNT = ObjectId("6a8ca86e476b82a84db78789")
BIO_BLADE = ObjectId("6b0000000000000000000001")
TOP_CAT = ObjectId("6c0000000000000000000001")

# ...while products reference categories by the 24-hex STRING (as prod does)
SC_CAT_ID = str(SC_CAT)
TOP_CAT_ID = str(TOP_CAT)

LEGACY_ID = ObjectId("6b0000000000000000000005")


class FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def __aiter__(self):
        async def gen():
            for d in self._docs:
                yield d
        return gen()

    async def to_list(self, length=None):
        return list(self._docs)


class FakeCollection:
    def __init__(self, docs):
        self.docs = docs

    def _match(self, doc, query):
        for key, value in query.items():
            if key == "$or":
                if not any(self._match(doc, sub) for sub in value):
                    return False
                continue
            if key == "categoryIds":
                ids = doc.get("categoryIds")
                if value in (ids if isinstance(ids, list) else []):
                    continue
                return False
            if key.startswith("categoryOrder."):
                cid = key.split(".", 1)[1]
                if isinstance(value, dict) and "$exists" in value:
                    if cid in (doc.get("categoryOrder") or {}):
                        continue
                    return False
                if (doc.get("categoryOrder") or {}).get(cid) == value:
                    continue
                return False
            if doc.get(key) != value:
                return False
        return True

    def find(self, query=None):
        query = query or {}
        return FakeCursor([d for d in self.docs if self._match(d, query)])

    async def find_one(self, query):
        for d in self.docs:
            if self._match(d, query):
                return d
        return None

    async def count_documents(self, query):
        return len(await self.find(query).to_list())

    async def update_one(self, query, update):
        doc = await self.find_one(query)
        assert doc is not None, f"update matched nothing: {query}"
        for field, value in update.get("$set", {}).items():
            if "." in field:
                head, tail = field.split(".", 1)
                doc.setdefault(head, {})[tail] = value
            else:
                doc[field] = value
        return types.SimpleNamespace(modified_count=1)


# --- fixture: the real broken production shape ----------------------------
products = [
    {"_id": BIO_BLADE, "name": "Bio Blade", "categoryIds": [SC_CAT_ID],
     "categoryOrder": {SC_CAT_ID: 10}, "displayOrder": 30},
    {"_id": QMOUNT, "name": "QMount - Massage Gun Wall Mount", "categoryIds": [SC_CAT_ID],
     "categoryOrder": {SC_CAT_ID: 20}, "displayOrder": 710},
    {"_id": "6b0000000000000000000002", "name": "Chirp Sole Vibe", "categoryIds": [SC_CAT_ID],
     "displayOrder": 300},
    {"_id": "6b0000000000000000000003", "name": "Wave Vibrating Roller", "categoryIds": [SC_CAT_ID],
     "displayOrder": 810},
    # LEGACY SHAPE: no `categoryIds` array at all, only the scalar field. The old
    # ordering helper ignored this document entirely.
    {"_id": LEGACY_ID, "name": "Legacy Scalar Product", "categoryId": SC_CAT_ID,
     "displayOrder": 500},
    {"_id": "6b0000000000000000000004", "name": "Topical A", "categoryIds": [TOP_CAT_ID],
     "displayOrder": 20},
]
categories = [{"_id": SC_CAT, "name": "Self-Care Tools"}, {"_id": TOP_CAT, "name": "Topicals"}]

normalize_calls = []


def in_cat(p, cid):
    """Mirror routes.products._category_ids: array first, legacy scalar fallback."""
    if cid in (p.get("categoryIds") or []):
        return True
    return p.get("categoryId") == cid


def category_match(cid):
    return {"$or": [{"categoryIds": cid}, {"categoryId": cid}]}


async def fake_normalize(category_id=None):
    """Mirror the real helper: assign 10,20,30… in current effective order."""
    normalize_calls.append(category_id)
    if category_id is None:
        return []
    members = [p for p in products if in_cat(p, category_id)]
    members.sort(key=lambda p: ((p.get("categoryOrder") or {}).get(category_id)
                                or p.get("displayOrder") or 999999, p.get("name", "")))
    for i, m in enumerate(members, 1):
        m.setdefault("categoryOrder", {})[category_id] = i * 10
    return members


# --- stub the modules the repair imports ---------------------------------
services_pkg = types.ModuleType("services")
db_mod = types.ModuleType("services.database")
db_mod.get_collection = lambda name: {"products": FakeCollection(products),
                                      "categories": FakeCollection(categories)}[name]
services_pkg.database = db_mod
sys.modules["services"] = services_pkg
sys.modules["services.database"] = db_mod

routes_pkg = types.ModuleType("routes")
prod_mod = types.ModuleType("routes.products")
prod_mod._normalize_order = fake_normalize
prod_mod._category_match = category_match
routes_pkg.products = prod_mod
sys.modules["routes"] = routes_pkg
sys.modules["routes.products"] = prod_mod

spec = importlib.util.spec_from_file_location("order_repair", REPO / "services" / "order_repair.py")
order_repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(order_repair)

failures = []


def check(label, cond, detail=""):
    print(f"  {'PASS' if cond else 'FAIL'}  {label}{(' — ' + detail) if detail and not cond else ''}")
    if not cond:
        failures.append(label)


def eff(pid, cid):
    p = next(p for p in products if str(p["_id"]) == pid)
    return (p.get("categoryOrder") or {}).get(str(cid))


def sc_order():
    mem = [p for p in products if in_cat(p, SC_CAT_ID)]
    mem.sort(key=lambda p: ((p.get("categoryOrder") or {}).get(SC_CAT_ID) or 999999))
    return [p["name"] for p in mem]


def sc_values():
    return {p["name"]: (p.get("categoryOrder") or {}).get(SC_CAT_ID)
            for p in products if in_cat(p, SC_CAT_ID)}


async def main():
    print("1) gating")
    os.environ.pop("AR360_ORDER_REPAIR", None)
    r = await order_repair.run_order_repair()
    check("skips when AR360_ORDER_REPAIR is unset", r.get("skipped") is not None, str(r))
    check("no normalize calls when unset", normalize_calls == [], str(normalize_calls))

    print("2) repair run (with pin)")
    os.environ["AR360_ORDER_REPAIR"] = "1"
    os.environ["AR360_ORDER_PINS"] = f"{QMOUNT}:{SC_CAT_ID}"
    r = await order_repair.run_order_repair()
    names = {c["name"] for c in r["normalized"]}
    check("normalized both categories", names == {"Self-Care Tools", "Topicals"}, str(names))
    sc = next(c for c in r["normalized"] if c["categoryId"] == SC_CAT_ID)
    check("counts the LEGACY scalar product too (5, not 4)", sc["members"] == 5, json.dumps(sc))
    check("reported 2 of 5 keyed before", sc["keyedBefore"] == 2, json.dumps(sc))
    check("all 5 members now keyed", all(eff(str(p["_id"]), SC_CAT) for p in products if in_cat(p, SC_CAT_ID)))
    check("legacy scalar product got a key", eff(str(LEGACY_ID), SC_CAT) is not None,
          str(eff(str(LEGACY_ID), SC_CAT)))
    check("order preserved (Bio Blade < Chirp < Wave)",
          eff(str(BIO_BLADE), SC_CAT) < eff("6b0000000000000000000002", SC_CAT) < eff("6b0000000000000000000003", SC_CAT))
    check("QMount pinned LAST", eff(str(QMOUNT), SC_CAT) > max(
        eff(str(p["_id"]), SC_CAT) for p in products
        if in_cat(p, SC_CAT_ID) and p["_id"] != QMOUNT))
    check("pin reported", bool(r["pinned"]) and r["pinned"][0]["order"] == eff(str(QMOUNT), SC_CAT),
          json.dumps(r["pinned"]))

    print("3) idempotency")
    order_after_first = sc_order()
    r2 = await order_repair.run_order_repair()
    check("re-run preserves the ORDER", sc_order() == order_after_first, str(sc_order()))
    check("QMount still last after re-run", sc_order()[-1].startswith("QMount"), str(sc_order()))
    check("re-run reports every member already keyed",
          all(c["keyedBefore"] == c["members"] for c in r2["normalized"]), json.dumps(r2["normalized"]))
    values_after_second = sc_values()
    await order_repair.run_order_repair()
    check("values reach steady state by run 2 (no further churn)",
          sc_values() == values_after_second, f"{values_after_second} -> {sc_values()}")

    print("4) pin error paths")
    os.environ["AR360_ORDER_PINS"] = f"not-an-objectid:{SC_CAT_ID};deadbeefdeadbeefdeadbeef:{SC_CAT_ID}"
    r3 = await order_repair.run_order_repair()
    check("invalid id + missing product both reported", len(r3["pin_errors"]) == 2, json.dumps(r3["pin_errors"]))
    check("no pins applied on error", r3["pinned"] == [], json.dumps(r3["pinned"]))

    print(f"\n{'ALL CHECKS PASSED' if not failures else 'FAILURES: ' + ', '.join(failures)}")
    return 1 if failures else 0


sys.exit(asyncio.run(main()))
