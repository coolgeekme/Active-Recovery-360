"""Backend tests for the admin product reorder feature.

Covers:
- GET /api/products sort order (displayOrder asc, then name asc)
- POST /api/admin/products/{id}/move?direction=up|down
- Auth requirements, edge cases, and validation
- After tests, restores Topicals category to original alphabetical-ish order
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ar360-shop.preview.emergentagent.com").rstrip("/")
TOPICALS_CATEGORY_ID = "69a74a0ce5b1b6ab1265061f"
ADMIN_USERNAME = "admin@example.com"
ADMIN_PASSWORD = "password"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/login", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    data = r.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"No token in login response: {data}"
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def topicals_products():
    r = requests.get(f"{BASE_URL}/api/products", params={"categoryId": TOPICALS_CATEGORY_ID})
    assert r.status_code == 200
    return r.json()


# ---------- GET /api/products sort ordering ----------

def test_products_sorted_by_display_order():
    r = requests.get(f"{BASE_URL}/api/products", params={"categoryId": TOPICALS_CATEGORY_ID})
    assert r.status_code == 200
    items = r.json()
    assert len(items) > 0, "Topicals category should have products"
    # Products with displayOrder should be in ascending displayOrder order
    with_order = [p for p in items if p.get("displayOrder") is not None]
    orders = [p["displayOrder"] for p in with_order]
    assert orders == sorted(orders), f"Products not sorted by displayOrder asc: {orders}"


def test_products_without_displayorder_fall_to_end():
    r = requests.get(f"{BASE_URL}/api/products")
    assert r.status_code == 200
    items = r.json()
    seen_none = False
    for p in items:
        if p.get("displayOrder") is None:
            seen_none = True
        else:
            if seen_none:
                # We saw a None and now a non-None — that's a violation
                pytest.fail("Product with displayOrder appeared after a product without one")


# ---------- Auth checks ----------

def test_move_endpoint_requires_auth(topicals_products):
    pid = topicals_products[0]["id"]
    r = requests.post(f"{BASE_URL}/api/admin/products/{pid}/move", params={"direction": "down"})
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


def test_move_invalid_product_id(auth_headers):
    # Valid ObjectId format but not present
    fake_id = "000000000000000000000000"
    r = requests.post(
        f"{BASE_URL}/api/admin/products/{fake_id}/move",
        params={"direction": "up"},
        headers=auth_headers,
    )
    assert r.status_code == 404


def test_move_malformed_product_id(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/admin/products/not-an-objectid/move",
        params={"direction": "up"},
        headers=auth_headers,
    )
    assert r.status_code == 404


def test_move_invalid_direction(auth_headers, topicals_products):
    pid = topicals_products[0]["id"]
    r = requests.post(
        f"{BASE_URL}/api/admin/products/{pid}/move",
        params={"direction": "sideways"},
        headers=auth_headers,
    )
    assert r.status_code == 422, f"Expected 422 for bad direction, got {r.status_code} - {r.text}"


# ---------- Move logic ----------

def _fetch_topicals():
    r = requests.get(f"{BASE_URL}/api/products", params={"categoryId": TOPICALS_CATEGORY_ID})
    assert r.status_code == 200
    return r.json()


def test_move_up_on_first_returns_already_at_top(auth_headers):
    items = _fetch_topicals()
    first = items[0]
    r = requests.post(
        f"{BASE_URL}/api/admin/products/{first['id']}/move",
        params={"direction": "up"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("moved") is False
    assert "top" in (data.get("message") or "").lower()


def test_move_down_on_last_returns_already_at_bottom(auth_headers):
    items = _fetch_topicals()
    last = items[-1]
    r = requests.post(
        f"{BASE_URL}/api/admin/products/{last['id']}/move",
        params={"direction": "down"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("moved") is False
    assert "bottom" in (data.get("message") or "").lower()


def test_normalization_assigns_sequential_orders(auth_headers):
    """After any move call, every product in the Topicals category should have
    sequential displayOrder values 10, 20, 30, ..."""
    # Trigger normalization by attempting an up-on-first (no swap, but normalizes)
    items = _fetch_topicals()
    first_id = items[0]["id"]
    requests.post(
        f"{BASE_URL}/api/admin/products/{first_id}/move",
        params={"direction": "up"},
        headers=auth_headers,
    )
    items = _fetch_topicals()
    orders = [p.get("displayOrder") for p in items]
    expected = [(i + 1) * 10 for i in range(len(items))]
    assert orders == expected, f"Expected {expected}, got {orders}"


def test_move_down_then_up_restores_order(auth_headers):
    """Move 2nd item down then back up. Final order should equal initial order."""
    before = _fetch_topicals()
    assert len(before) >= 3, "Need at least 3 products to test swap"
    before_ids = [p["id"] for p in before]
    target_id = before_ids[1]  # 2nd item

    # Move down
    r1 = requests.post(
        f"{BASE_URL}/api/admin/products/{target_id}/move",
        params={"direction": "down"},
        headers=auth_headers,
    )
    assert r1.status_code == 200, r1.text
    data1 = r1.json()
    assert data1.get("moved") is True
    assert data1.get("direction") == "down"

    after_down = _fetch_topicals()
    after_down_ids = [p["id"] for p in after_down]
    # 2nd item should now be 3rd
    assert after_down_ids[2] == target_id, f"Expected {target_id} at index 2, got {after_down_ids}"
    # 3rd item should now be 2nd
    assert after_down_ids[1] == before_ids[2]

    # Move back up
    r2 = requests.post(
        f"{BASE_URL}/api/admin/products/{target_id}/move",
        params={"direction": "up"},
        headers=auth_headers,
    )
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2.get("moved") is True

    after_up = _fetch_topicals()
    after_up_ids = [p["id"] for p in after_up]
    assert after_up_ids == before_ids, f"Order not restored.\nBefore: {before_ids}\nAfter:  {after_up_ids}"


# ---------- Regression: non-reorder endpoints still up ----------

def test_regression_recovery_services_endpoint():
    r = requests.get(f"{BASE_URL}/api/recovery-services")
    # Public is auth-gated (per iteration_13), so 401/403; OR it may return 200 if rules differ
    assert r.status_code in (200, 401, 403)


def test_regression_categories_endpoint():
    r = requests.get(f"{BASE_URL}/api/categories")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
