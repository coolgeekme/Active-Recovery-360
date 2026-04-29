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
            assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
            assert "expired" in r.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_validate_expired_with_Z_suffix_returns_400(self, api, admin_headers):
        """ISO-8601 with trailing 'Z' (frontend's new Date().toISOString() format)
        must be normalised by the backend and produce 400, not 500."""
        code_id, doc = _create_code(api, admin_headers,
                                    expiresAt="2024-01-01T00:00:00Z")
        try:
            r = api.post(f"{BASE_URL}/api/discount-codes/validate",
                         json={"code": doc["code"]})
            assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
            assert "expired" in r.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_validate_expired_without_Z_suffix_returns_400(self, api, admin_headers):
        """ISO-8601 without trailing 'Z' must also be normalised to naive UTC."""
        code_id, doc = _create_code(api, admin_headers,
                                    expiresAt="2025-01-01T00:00:00")
        try:
            r = api.post(f"{BASE_URL}/api/discount-codes/validate",
                         json={"code": doc["code"]})
            assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
            assert "expired" in r.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_create_rejects_invalid_expires_at(self, api, admin_headers):
        """Garbage ISO string should produce a 400 at create time, not crash later."""
        suffix = str(int(time.time() * 1000))[-9:]
        r = api.post(f"{BASE_URL}/api/discount-codes",
                     json={
                         "code": f"TESTBAD{suffix}",
                         "description": "TEST bad date",
                         "discountType": "percentage",
                         "discountValue": 10,
                         "isActive": True,
                         "expiresAt": "not-a-date",
                     },
                     headers=admin_headers)
        # Accept either a 400 validation error OR a 500 if not validated — but
        # the preferred behaviour (per the _parse_expiry helper) is 400.
        assert r.status_code == 400, (
            f"Invalid expiresAt should be 400, got {r.status_code}: {r.text}"
        )

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
            assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
            assert "expired" in r.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_order_expired_code_does_not_increment_used_count(self, api, admin_headers, sample_product):
        """If the order is rejected (expired code), usedCount must NOT increment."""
        past = (datetime.utcnow() - timedelta(days=1)).isoformat()
        code_id, doc = _create_code(api, admin_headers, expiresAt=past)
        try:
            # read baseline usedCount
            r0 = api.get(f"{BASE_URL}/api/discount-codes", headers=admin_headers)
            baseline = next(d["usedCount"] for d in r0.json() if d["id"] == code_id)

            r = api.post(
                f"{BASE_URL}/api/orders",
                json={
                    "shippingAddress": "TEST expired-nocount",
                    "discountCode": doc["code"],
                    "items": [{"productId": sample_product["id"], "quantity": 1}],
                },
                headers=admin_headers,
            )
            assert r.status_code == 400

            r1 = api.get(f"{BASE_URL}/api/discount-codes", headers=admin_headers)
            after = next(d["usedCount"] for d in r1.json() if d["id"] == code_id)
            assert after == baseline, (
                f"usedCount must not increment on rejected order; "
                f"was {baseline}, became {after}"
            )
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_used_count_increments_only_after_successful_insert(self, api, admin_headers, sample_product):
        """N -> N+1 on successful order, verified by explicit before/after GET."""
        code_id, doc = _create_code(api, admin_headers,
                                    discountType="percentage", discountValue=10)
        try:
            r0 = api.get(f"{BASE_URL}/api/discount-codes", headers=admin_headers)
            before = next(d["usedCount"] for d in r0.json() if d["id"] == code_id)

            r = api.post(
                f"{BASE_URL}/api/orders",
                json={
                    "shippingAddress": "TEST inc-order",
                    "discountCode": doc["code"],
                    "items": [{"productId": sample_product["id"], "quantity": 1}],
                },
                headers=admin_headers,
            )
            assert r.status_code in (200, 201), f"{r.status_code} {r.text}"

            r1 = api.get(f"{BASE_URL}/api/discount-codes", headers=admin_headers)
            after = next(d["usedCount"] for d in r1.json() if d["id"] == code_id)
            assert after == before + 1, (
                f"usedCount should go {before} -> {before+1}, got {after}"
            )
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


# ---------------- PUT normalization (iteration 11) ----------------
class TestPutNormalization:
    def test_put_normalizes_expires_at_with_Z(self, api, admin_headers):
        """PUT should normalise expiresAt so that after update, validate/orders
        still return 400 (not 500) for the expired code."""
        code_id, doc = _create_code(api, admin_headers)
        try:
            r = api.put(f"{BASE_URL}/api/discount-codes/{code_id}",
                        json={"expiresAt": "2024-01-01T00:00:00Z"},
                        headers=admin_headers)
            assert r.status_code in (200, 201), f"PUT failed: {r.status_code} {r.text}"

            # Validate must now report expired (400), not 500.
            r2 = api.post(f"{BASE_URL}/api/discount-codes/validate",
                          json={"code": doc["code"]})
            assert r2.status_code == 400, (
                f"expected 400 after PUT with ISO-Z expiresAt, "
                f"got {r2.status_code}: {r2.text}"
            )
            assert "expired" in r2.json().get("detail", "").lower()
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_put_normalizes_expires_at_without_Z(self, api, admin_headers):
        code_id, doc = _create_code(api, admin_headers)
        try:
            r = api.put(f"{BASE_URL}/api/discount-codes/{code_id}",
                        json={"expiresAt": "2024-06-01T12:00:00"},
                        headers=admin_headers)
            assert r.status_code in (200, 201)

            r2 = api.post(f"{BASE_URL}/api/discount-codes/validate",
                          json={"code": doc["code"]})
            assert r2.status_code == 400, (
                f"expected 400 after PUT with ISO (no Z) expiresAt, "
                f"got {r2.status_code}: {r2.text}"
            )
        finally:
            _delete_code(api, admin_headers, code_id)

    def test_put_uppercases_code(self, api, admin_headers):
        """PUT with a lowercase `code` should upper-case it so validate still works."""
        code_id, doc = _create_code(api, admin_headers)
        try:
            new_code_lower = f"newcode{str(int(time.time()*1000))[-6:]}"
            r = api.put(f"{BASE_URL}/api/discount-codes/{code_id}",
                        json={"code": new_code_lower},
                        headers=admin_headers)
            assert r.status_code in (200, 201), r.text

            # validate against upper-case (what the backend stores+compares on)
            r2 = api.post(f"{BASE_URL}/api/discount-codes/validate",
                          json={"code": new_code_lower.upper()})
            assert r2.status_code == 200, (
                f"Expected upper-cased validation to succeed, got "
                f"{r2.status_code}: {r2.text}"
            )
            assert r2.json()["discountCode"]["code"] == new_code_lower.upper()
        finally:
            _delete_code(api, admin_headers, code_id)
