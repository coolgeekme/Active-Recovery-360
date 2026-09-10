"""Tests for POST /api/admin/products/normalize-order (bug fix iteration 20)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ar360-shop.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SELF_CARE_CAT = "69a74a0ce5b1b6ab12650623"
BIO_BLADE_ID = "69f23177dd7d717cac8a6ae4"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/login", json={"username": "admin@example.com", "password": "password"})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def hcp_token():
    r = requests.post(f"{API}/login", json={"username": "drsmith", "password": "test123"})
    if r.status_code != 200:
        pytest.skip(f"HCP login unavailable: {r.status_code} {r.text}")
    return r.json().get("token") or r.json().get("access_token")


def admin_h(t):
    return {"Authorization": f"Bearer {t}"}


# --- Auth gating ---

def test_normalize_requires_auth():
    r = requests.post(f"{API}/admin/products/normalize-order")
    assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}: {r.text}"


def test_normalize_rejects_non_admin(hcp_token):
    r = requests.post(f"{API}/admin/products/normalize-order", headers=admin_h(hcp_token))
    assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}: {r.text}"


# --- Successful normalization ---

def test_normalize_all_categories(admin_token):
    r = requests.post(f"{API}/admin/products/normalize-order", headers=admin_h(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("message") == "Order normalized"
    assert isinstance(body.get("categories"), list) and len(body["categories"]) > 0
    for c in body["categories"]:
        assert "categoryId" in c and "count" in c


def test_normalize_specific_category_sequential_keys(admin_token):
    r = requests.post(
        f"{API}/admin/products/normalize-order",
        params={"categoryId": SELF_CARE_CAT},
        headers=admin_h(admin_token),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["categories"]) == 1
    assert body["categories"][0]["categoryId"] == SELF_CARE_CAT
    count = body["categories"][0]["count"]

    # Verify GET /api/products?categoryId returns sequential 10,20,30...
    g = requests.get(f"{API}/products", params={"categoryId": SELF_CARE_CAT}, headers=admin_h(admin_token))
    assert g.status_code == 200
    prods = g.json()
    assert len(prods) == count
    orders = [p["categoryOrder"].get(SELF_CARE_CAT) for p in prods]
    expected = [(i + 1) * 10 for i in range(len(prods))]
    assert orders == expected, f"Expected {expected}, got {orders}"


def test_normalize_with_place_last(admin_token):
    r = requests.post(
        f"{API}/admin/products/normalize-order",
        params={"categoryId": SELF_CARE_CAT, "placeLast": BIO_BLADE_ID},
        headers=admin_h(admin_token),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("pinned") is not None
    assert body["pinned"]["productId"] == BIO_BLADE_ID
    assert body["pinned"]["categoryId"] == SELF_CARE_CAT

    # Verify Bio Blade is now LAST in the category listing
    g = requests.get(f"{API}/products", params={"categoryId": SELF_CARE_CAT}, headers=admin_h(admin_token))
    assert g.status_code == 200
    prods = g.json()
    assert prods[-1]["id"] == BIO_BLADE_ID, f"Bio Blade not last; last is {prods[-1]['id']} ({prods[-1]['name']})"
    bio_order = prods[-1]["categoryOrder"].get(SELF_CARE_CAT)
    other_orders = [p["categoryOrder"].get(SELF_CARE_CAT) for p in prods[:-1]]
    assert bio_order > max(other_orders), f"Bio Blade order {bio_order} not > max other {max(other_orders)}"


# --- Error paths ---

def test_place_last_without_category_returns_400(admin_token):
    r = requests.post(
        f"{API}/admin/products/normalize-order",
        params={"placeLast": BIO_BLADE_ID},
        headers=admin_h(admin_token),
    )
    assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text}"


def test_place_last_nonexistent_product_returns_404(admin_token):
    r = requests.post(
        f"{API}/admin/products/normalize-order",
        params={"categoryId": SELF_CARE_CAT, "placeLast": "000000000000000000000000"},
        headers=admin_h(admin_token),
    )
    assert r.status_code == 404, f"Expected 404 got {r.status_code}: {r.text}"


# --- Idempotency ---

def test_idempotency_run2_equals_run3(admin_token):
    def snapshot():
        g = requests.get(f"{API}/products", params={"categoryId": SELF_CARE_CAT}, headers=admin_h(admin_token))
        assert g.status_code == 200
        return [(p["id"], p["categoryOrder"].get(SELF_CARE_CAT)) for p in g.json()]

    # Run once (from prior tests state may vary) → run 2 → snapshot → run 3 → snapshot
    requests.post(
        f"{API}/admin/products/normalize-order",
        params={"categoryId": SELF_CARE_CAT, "placeLast": BIO_BLADE_ID},
        headers=admin_h(admin_token),
    )
    snap2 = snapshot()
    requests.post(
        f"{API}/admin/products/normalize-order",
        params={"categoryId": SELF_CARE_CAT, "placeLast": BIO_BLADE_ID},
        headers=admin_h(admin_token),
    )
    snap3 = snapshot()
    assert snap2 == snap3, f"Not idempotent:\n snap2={snap2}\n snap3={snap3}"


# --- Sorting after normalize ---

def test_get_products_sorted_by_category_order(admin_token):
    requests.post(
        f"{API}/admin/products/normalize-order",
        params={"categoryId": SELF_CARE_CAT},
        headers=admin_h(admin_token),
    )
    g = requests.get(f"{API}/products", params={"categoryId": SELF_CARE_CAT}, headers=admin_h(admin_token))
    prods = g.json()
    orders = [p["categoryOrder"].get(SELF_CARE_CAT) for p in prods]
    assert orders == sorted(orders), f"Not sorted: {orders}"


# --- Regression: move endpoint ---

def test_move_endpoint_edge_and_swap(admin_token):
    # Normalize first
    requests.post(
        f"{API}/admin/products/normalize-order",
        params={"categoryId": SELF_CARE_CAT},
        headers=admin_h(admin_token),
    )
    g = requests.get(f"{API}/products", params={"categoryId": SELF_CARE_CAT}, headers=admin_h(admin_token))
    prods = g.json()
    assert len(prods) >= 3

    top_id = prods[0]["id"]
    bottom_id = prods[-1]["id"]
    mid_id = prods[1]["id"]
    mid_next_id = prods[2]["id"]

    # Top up: no move
    r = requests.post(
        f"{API}/admin/products/{top_id}/move",
        params={"direction": "up", "categoryId": SELF_CARE_CAT},
        headers=admin_h(admin_token),
    )
    assert r.status_code == 200 and r.json().get("moved") is False

    # Bottom down: no move
    r = requests.post(
        f"{API}/admin/products/{bottom_id}/move",
        params={"direction": "down", "categoryId": SELF_CARE_CAT},
        headers=admin_h(admin_token),
    )
    assert r.status_code == 200 and r.json().get("moved") is False

    # Mid down: swaps with next
    r = requests.post(
        f"{API}/admin/products/{mid_id}/move",
        params={"direction": "down", "categoryId": SELF_CARE_CAT},
        headers=admin_h(admin_token),
    )
    assert r.status_code == 200 and r.json().get("moved") is True

    g2 = requests.get(f"{API}/products", params={"categoryId": SELF_CARE_CAT}, headers=admin_h(admin_token))
    new_ids = [p["id"] for p in g2.json()]
    assert new_ids.index(mid_id) == 2 and new_ids.index(mid_next_id) == 1

    # Restore
    requests.post(
        f"{API}/admin/products/normalize-order",
        params={"categoryId": SELF_CARE_CAT},
        headers=admin_h(admin_token),
    )
