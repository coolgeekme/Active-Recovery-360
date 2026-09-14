#!/usr/bin/env python3
"""Tests for the curated "Related Products" payload normaliser.

`_related_product_ids` is a pure function, so it is lifted out of
routes/products.py and exercised with a stub ObjectId - that keeps the test
runnable without the app's runtime deps (fastapi/motor/pymongo are not
installed on the dev box).

Wiring (endpoint + storefront rendering) is verified live against the API
after deploy; this file covers the normalisation rules that are easy to get
wrong:

  * ids are de-duplicated, order preserved
  * the product can never be related to itself
  * malformed ids are dropped instead of raising
  * a payload that omits the field returns None (partial update leaves the
    stored list untouched)
  * a non-list payload degrades to an empty list rather than erroring

Run: python3 backend/tests/test_related_products.py
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SOURCE = (REPO / "routes" / "products.py").read_text(encoding="utf-8")

# ---- lift the function out of the module -----------------------------------
match = re.search(
    r"^def _related_product_ids\(.*?(?=^def |\Z)", SOURCE, re.MULTILINE | re.DOTALL
)
if not match:
    sys.exit("could not find _related_product_ids in routes/products.py")
FUNC_SRC = match.group(0)


class ObjectId:  # minimal stand-in for bson.ObjectId
    def __init__(self, value):
        value = str(value)
        if not re.fullmatch(r"[0-9a-fA-F]{24}", value):
            raise ValueError("not an ObjectId")
        self.value = value

    def __str__(self):
        return self.value


ns = {"ObjectId": ObjectId}
exec(FUNC_SRC, ns)
_related_product_ids = ns["_related_product_ids"]

A = "6a8ca86e476b82a84db78789"
B = "69f25885f8cbe4310e9736b8"
C = "6a4dd4e066073b395ba056df"

failures = []


def check(label, got, want):
    ok = got == want
    print(f"  {'PASS' if ok else 'FAIL'}  {label}")
    if not ok:
        failures.append(label)
        print(f"        got:  {got}\n        want: {want}")


print("1) field absent -> None (partial update must not wipe the stored list)")
check("no key", _related_product_ids({"name": "x"}), None)

print("2) happy path")
check("single", _related_product_ids({"relatedProductIds": [A]}), [A])
check("order preserved", _related_product_ids({"relatedProductIds": [C, A, B]}), [C, A, B])

print("3) de-duplication")
check("dupes collapse, first wins", _related_product_ids({"relatedProductIds": [A, B, A]}), [A, B])

print("4) a product cannot be related to itself")
check("self excluded", _related_product_ids({"relatedProductIds": [A, B]}, exclude_id=A), [B])
check("self-only -> empty", _related_product_ids({"relatedProductIds": [A]}, exclude_id=A), [])

print("5) junk is dropped, never raised")
check("bad ids dropped", _related_product_ids({"relatedProductIds": ["nope", A, "", None, "12345"]}), [A])
check("whitespace tolerated", _related_product_ids({"relatedProductIds": [f"  {A}  "]}), [A])
check("non-list payload -> []", _related_product_ids({"relatedProductIds": "not-a-list"}), [])
check("null payload -> []", _related_product_ids({"relatedProductIds": None}), [])
check("list of ints -> []", _related_product_ids({"relatedProductIds": [1, 2]}), [])

print(f"\n{'ALL CHECKS PASSED' if not failures else 'FAILURES: ' + ', '.join(failures)}")
sys.exit(1 if failures else 0)
