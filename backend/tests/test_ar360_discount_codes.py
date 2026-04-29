"""Backend tests for the customer-facing discount-code apply flow.

Covers:
- POST /api/discount-codes/validate: valid / invalid / inactive / expired / usage-limit
- POST /api/orders with discountCode body field (percentage + fixed)
- usedCount increment after a successful order
- usageLimit reached -> 400
- invalid/expired code on order -> 400 (does NOT silently apply)
- Regression: order without discount; /api/products returns 39; admin login
"""
import os
import time
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "password"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/login",
                 json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def sample_product(api):
    r = api.get(f"{BASE_URL}/api/products")
    assert r.status_code == 200
    products = r.json()
    assert len(products) >= 1
    # pick one with a stable price and no variants for deterministic math
    for p in products:
        if not p.get("hasVariants") and p.get("price", 0) > 0:
            return p
    return products[0]


def _create_code(api, admin_headers, **overrides):
    """Create a discount code, return (id, doc). Caller is responsible for delete."""
    suffix = str(int(time.time() * 1000))[-9:]
    payload = {
        "code": f"TEST{suffix}",
        "description": "TEST iter10 code",
        "discountType": "percentage",
        "discountValue": 25,
        "isActive": True,
    }
    payload.update(overrides)
    r = api.post(f"{BASE_URL}/api/discount-codes", json=payload, headers=admin_headers)
    assert r.status_code in (200, 201), f"create failed: {r.status_code} {r.text}"
    return r.json()["id"], r.json()


def _delete_code(api, admin_headers, code_id):
    api.delete(f"{BASE_URL}/api/discount-codes/{code_id}", headers=admin_headers)


# ---------------- VALIDATE endpoint ----------------
class TestValidateEndpoint:
    def test_validate_valid_code(self, api, admin_headers):
        code_id, doc = _create_code(api, admin_headers, discountValue=25)
        try:
            r = api.post(f"{BASE_URL}/api/discount-codes/validate",
                         json={"code": doc["code"]})
            assert r.status_code == 200
            data = r.json()
            assert data["valid"] is True
            dc = data["discountCode"]
            assert dc["code"] == doc["code"]
            assert dc["discountType"] == "percentage"
            assert dc["discountValue"] == 25
            assert "id" in dc
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_validate_invalid_returns_404(self, api):
        r = api.post(f"{BASE_URL}/api/discount-codes/validate",
                     json={"code": "DEFINITELYNOTACODE_XYZ123"})
        assert r.status_code == 404
        assert "Invalid discount code" in r.json().get("detail", "")

    def test_validate_inactive_returns_400(self, api, admin_headers):
        code_id, doc = _create_code(api, admin_headers, isActive=False)
        try:
            r = api.post(f"{BASE_URL}/api/discount-codes/validate",
                         json={"code": doc["code"]})
            assert r.status_code == 400
            assert "no longer active" in r.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_validate_expired_returns_400(self, api, admin_headers):
        past = (datetime.utcnow() - timedelta(days=1)).isoformat()
        code_id, doc = _create_code(api, admin_headers, expiresAt=past)
        try:
            r = api.post(f"{BASE_URL}/api/discount-codes/validate",
                         json={"code": doc["code"]})
            assert r.status_code == 400
            assert "expired" in r.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_validate_usage_limit_returns_400(self, api, admin_headers):
        code_id, doc = _create_code(api, admin_headers, usageLimit=1)
        # bump usedCount to >= limit by editing through the admin endpoint
        api.put(f"{BASE_URL}/api/discount-codes/{code_id}",
                json={"usedCount": 1}, headers=admin_headers)
        try:
            r = api.post(f"{BASE_URL}/api/discount-codes/validate",
                         json={"code": doc["code"]})
            assert r.status_code == 400
            assert "usage limit" in r.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)


# ---------------- Order with discountCode ----------------
class TestOrderWithDiscount:
    def test_percentage_discount_reduces_total(self, api, admin_headers, sample_product):
        code_id, doc = _create_code(api, admin_headers,
                                    discountType="percentage", discountValue=25)
        try:
            unit_price = sample_product["price"]
            qty = 2
            expected_subtotal = unit_price * qty
            expected_discount = round(expected_subtotal * 0.25)
            expected_total = expected_subtotal - expected_discount

            r = api.post(
                f"{BASE_URL}/api/orders",
                json={
                    "shippingAddress": "TEST 123 Main St",
                    "discountCode": doc["code"],
                    "items": [{"productId": sample_product["id"], "quantity": qty}],
                },
                headers=admin_headers,
            )
            assert r.status_code in (200, 201), f"order failed: {r.status_code} {r.text}"
            order = r.json()
            assert order["subtotal"] == expected_subtotal
            assert order["discountAmount"] == expected_discount
            assert order["discountCode"] == doc["code"]
            assert order["totalAmount"] == expected_total

            # usedCount incremented
            r2 = api.get(f"{BASE_URL}/api/discount-codes", headers=admin_headers)
            assert r2.status_code == 200
            mine = next((d for d in r2.json() if d["id"] == code_id), None)
            assert mine is not None
            assert mine["usedCount"] == 1
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_fixed_discount_reduces_total(self, api, admin_headers, sample_product):
        # 500 cents = $5 off
        code_id, doc = _create_code(api, admin_headers,
                                    discountType="fixed", discountValue=500)
        try:
            unit_price = sample_product["price"]
            qty = 1
            expected_subtotal = unit_price * qty
            expected_discount = min(500, expected_subtotal)
            expected_total = expected_subtotal - expected_discount

            r = api.post(
                f"{BASE_URL}/api/orders",
                json={
                    "shippingAddress": "TEST fixed",
                    "discountCode": doc["code"],
                    "items": [{"productId": sample_product["id"], "quantity": qty}],
                },
                headers=admin_headers,
            )
            assert r.status_code in (200, 201)
            order = r.json()
            assert order["subtotal"] == expected_subtotal
            assert order["discountAmount"] == expected_discount
            assert order["totalAmount"] == expected_total
            assert order["discountCode"] == doc["code"]
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_order_with_usage_limit_reached_returns_400(self, api, admin_headers, sample_product):
        code_id, doc = _create_code(api, admin_headers, usageLimit=1)
        # mark already-used
        api.put(f"{BASE_URL}/api/discount-codes/{code_id}",
                json={"usedCount": 1}, headers=admin_headers)
        try:
            r = api.post(
                f"{BASE_URL}/api/orders",
                json={
                    "shippingAddress": "TEST limit",
                    "discountCode": doc["code"],
                    "items": [{"productId": sample_product["id"], "quantity": 1}],
                },
                headers=admin_headers,
            )
            assert r.status_code == 400
            assert "usage limit" in r.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_order_with_invalid_code_returns_400(self, api, admin_headers, sample_product):
        r = api.post(
            f"{BASE_URL}/api/orders",
            json={
                "shippingAddress": "TEST invalid",
                "discountCode": "DOESNOTEXIST_QWERTY",
                "items": [{"productId": sample_product["id"], "quantity": 1}],
            },
            headers=admin_headers,
        )
        assert r.status_code == 400
        assert "invalid discount code" in r.json().get("detail", "").lower()

    def test_order_with_expired_code_returns_400(self, api, admin_headers, sample_product):
        past = (datetime.utcnow() - timedelta(days=1)).isoformat()
        code_id, doc = _create_code(api, admin_headers, expiresAt=past)
        try:
            r = api.post(
                f"{BASE_URL}/api/orders",
                json={
                    "shippingAddress": "TEST expired",
                    "discountCode": doc["code"],
                    "items": [{"productId": sample_product["id"], "quantity": 1}],
                },
                headers=admin_headers,
            )
            assert r.status_code == 400
            assert "expired" in r.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)


# ---------------- Regression ----------------
class TestRegression:
    def test_order_without_discount(self, api, admin_headers, sample_product):
        r = api.post(
            f"{BASE_URL}/api/orders",
            json={
                "shippingAddress": "TEST no-discount",
                "items": [{"productId": sample_product["id"], "quantity": 1}],
            },
            headers=admin_headers,
        )
        assert r.status_code in (200, 201)
        o = r.json()
        assert o["discountAmount"] == 0
        assert o["discountCode"] is None
        assert o["subtotal"] == o["totalAmount"]

    def test_products_count(self, api):
        r = api.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        assert len(r.json()) == 39

    def test_admin_login(self, api):
        r = api.post(f"{BASE_URL}/api/login",
                     json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["token"]
        # isAdmin is on the nested user object in this app
        assert d.get("user", {}).get("isAdmin") is True

    def test_cart_endpoint_auth_required(self, api):
        # Server-side cart in this app is auth-only; "guest cart" lives in
        # frontend localStorage. Confirm the endpoint still rejects unauth.
        r = api.get(f"{BASE_URL}/api/cart")
        assert r.status_code in (401, 403)
