#!/usr/bin/env python3
"""Exercise order_repair.run_order_repair against an in-memory fake DB (no Mongo needed).

Verifies: opt-in gating, per-category normalization calls, pin placement at the
end, pin error paths, and idempotency of the report. Stubs `services.database`
and `routes.products` so no real Mongo or app boot is needed.
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

    def find(self, query=None):
        query = query or {}
        out = []
        for d in self.docs:
            if all(self._match(d, k, v) for k, v in query.items()):
                out.append(d)
        return FakeCursor(out)

    def _match(self, doc, key, value):
        if key == "categoryIds":
            return value in (doc.get("categoryIds") or [])
        if key.startswith("categoryOrder."):
            cid = key.split(".", 1)[1]
            if isinstance(value, dict) and "$exists" in value:
                return cid in (doc.get("categoryOrder") or {})
            return (doc.get("categoryOrder") or {}).get(cid) == value
        if key == "_id":
            return doc.get("_id") == value
        return doc.get(key) == value

    async def find_one(self, query):
        for d in self.docs:
            if all(self._match(d, k, v) for k, v in query.items()):
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


# --- in-memory fixture: the real broken production shape -------------------
products = [
    {"_id": BIO_BLADE, "name": "Bio Blade", "categoryIds": [SC_CAT_ID],
     "categoryOrder": {SC_CAT_ID: 10}, "displayOrder": 100},
    {"_id": QMOUNT, "name": "QMount - Massage Gun Wall Mount", "categoryIds": [SC_CAT_ID],
     "categoryOrder": {SC_CAT_ID: 20}, "displayOrder": 710},
    {"_id": ObjectId("6b0000000000000000000002"), "name": "Chirp Sole Vibe", "categoryIds": [SC_CAT_ID],
     "displayOrder": 300},
    {"_id": ObjectId("6b0000000000000000000003"), "name": "Wave Vibrating Roller", "categoryIds": [SC_CAT_ID],
     "displayOrder": 810},
    {"_id": ObjectId("6b0000000000000000000004"), "name": "Topical A", "categoryIds": [TOP_CAT_ID],
     "displayOrder": 20},
]
categories = [{"_id": SC_CAT, "name": "Self-Care Tools"}, {"_id": TOP_CAT, "name": "Topicals"}]

normalize_calls = []


async def fake_normalize(category_id=None):
    """Mirror the real helper: assign 10,20,30… in current effective order."""
    normalize_calls.append(category_id)
    if category_id is None:
        return []
    members = [p for p in products if category_id in (p.get("categoryIds") or [])]
    members.sort(key=lambda p: ((p.get("categoryOrder") or {}).get(category_id)
                                or p.get("displayOrder") or 999999, p.get("name", "")))
    for i, m in enumerate(members, 1):
        m.setdefault("categoryOrder", {})[category_id] = i * 10
    return members


# --- stub the modules the repair imports ----------------------------------
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


async def main():
    print("1) gating")
    os.environ.pop("AR360_ORDER_REPAIR", None)
    r = await order_repair.run_order_repair()
    check("skips when AR360_ORDER_REPAIR is unset", r.get("skipped") is not None, str(r))
    check("no normalize calls when unset", normalize_calls == [], str(normalize_calls))

    print("2) repair run (with pin)")
    os.environ["AR360_ORDER_REPAIR"] = "1"
    os.environ["AR360_ORDER_PINS"] = f"{QMOUNT}:{SC_CAT}"  # ObjectId renders as the 24-hex string
    r = await order_repair.run_order_repair()
    names = {c["name"] for c in r["normalized"]}
    check("normalized both categories", names == {"Self-Care Tools", "Topicals"}, str(names))
    sc = next(c for c in r["normalized"] if c["categoryId"] == str(SC_CAT))
    check("reported 2 of 4 keyed before", sc["keyedBefore"] == 2, json.dumps(sc))
    check("all 4 members now keyed", all(eff(str(p["_id"]), SC_CAT) for p in products
                                         if SC_CAT_ID in (p.get("categoryIds") or [])))
    check("order preserved (Bio Blade < Chirp < Wave)",
          eff(str(BIO_BLADE), SC_CAT) < eff("6b0000000000000000000002", SC_CAT) < eff("6b0000000000000000000003", SC_CAT))
    check("QMount pinned LAST", eff(str(QMOUNT), SC_CAT) > max(
        eff(str(p["_id"]), SC_CAT) for p in products
        if SC_CAT_ID in (p.get("categoryIds") or []) and p["_id"] != QMOUNT))
    check("pin reported", bool(r["pinned"]) and r["pinned"][0]["order"] == eff(str(QMOUNT), SC_CAT), json.dumps(r["pinned"]))

    print("3) idempotency")

    def sc_order():
        mem = [p for p in products if SC_CAT_ID in (p.get("categoryIds") or [])]
        mem.sort(key=lambda p: ((p.get("categoryOrder") or {}).get(SC_CAT_ID) or 999999))
        return [p["name"] for p in mem]

    def sc_values():
        return {p["name"]: (p.get("categoryOrder") or {}).get(SC_CAT_ID)
                for p in products if SC_CAT_ID in (p.get("categoryIds") or [])}

    order_after_first = sc_order()
    r2 = await order_repair.run_order_repair()
    check("re-run preserves the ORDER", sc_order() == order_after_first, str(sc_order()))
    check("QMount still last after re-run", sc_order()[-1].startswith("QMount"), str(sc_order()))
    check("re-run reports every member already keyed",
          all(c["keyedBefore"] == c["members"] for c in r2["normalized"]), json.dumps(r2["normalized"]))

    values_after_second = sc_values()
    r3 = await order_repair.run_order_repair()
    check("values reach steady state by run 2 (no further churn)",
          sc_values() == values_after_second, f"{values_after_second} -> {sc_values()}")

    print("4) pin error paths")
    os.environ["AR360_ORDER_PINS"] = "not-an-objectid:" + SC_CAT_ID + ";deadbeefdeadbeefdeadbeef:" + SC_CAT_ID
    r3 = await order_repair.run_order_repair()
    check("invalid id + missing product both reported", len(r3["pin_errors"]) == 2, json.dumps(r3["pin_errors"]))
    check("no pins applied on error", r3["pinned"] == [], json.dumps(r3["pinned"]))

    print(f"\n{'ALL CHECKS PASSED' if not failures else 'FAILURES: ' + ', '.join(failures)}")
    return 1 if failures else 0


sys.exit(asyncio.run(main()))
