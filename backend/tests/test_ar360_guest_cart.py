"""
AR360 Guest Cart / Client-side Cart Tests (Iteration 7)

Scope:
- POST /api/orders accepts an `items` array (client-side cart) and honours variant pricing.
- Member auth (drsmith/test123) is required for order creation.
- Non-member / unauth are rejected with proper codes.
- Regression: catalog count, image proxy, admin login.
- Verify /api/cart endpoints still exist (legacy, not used by frontend).
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


# ---------- Shared fixtures ----------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def all_products(session):
    r = session.get(f"{BASE_URL}/api/products")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def member_token(session):
    """
    drsmith is seeded but has isMember=False. /api/orders requires isMember=True.
    Register a fresh TEST_ user, then hit /api/membership/purchase to flip the flag
    so we can exercise the order flow end to end.
    """
    import uuid
    uname = f"TEST_member_{uuid.uuid4().hex[:8]}"
    reg = session.post(
        f"{BASE_URL}/api/register",
        json={
            "username": uname,
            "email": f"{uname}@example.com",
            "password": "pass12345",
            "fullName": "Member Test",
        },
    )
    if reg.status_code != 200:
        pytest.skip(f"registration failed: {reg.status_code} {reg.text}")
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    # Upgrade to member
    up = session.post(f"{BASE_URL}/api/membership/purchase", headers=headers)
    if up.status_code != 200 or not up.json().get("isMember"):
        pytest.skip(f"membership purchase failed: {up.status_code} {up.text}")
    return token


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{BASE_URL}/api/login", json={"username": "admin", "password": "password"})
    assert r.status_code == 200
    return r.json()["token"]


def _find(products, name_substr):
    for p in products:
        if name_substr.lower() in p["name"].lower():
            return p
    raise AssertionError(f"No product matching '{name_substr}'")


# ---------- Core: client-side cart -> POST /api/orders ----------
class TestOrderFromClientCart:
    def test_no_auth_rejected(self, session, all_products):
        product = all_products[0]
        r = session.post(
            f"{BASE_URL}/api/orders",
            json={
                "shippingAddress": "123 Test St, NY NY 10001",
                "paymentMethod": "credit",
                "items": [{"productId": product["id"], "quantity": 1}],
            },
        )
        assert r.status_code == 401

    def test_non_member_rejected(self, session, all_products):
        # Create a fresh non-member user to avoid polluting state
        import uuid
        uname = f"TEST_nonmember_{uuid.uuid4().hex[:8]}"
        reg = session.post(
            f"{BASE_URL}/api/register",
            json={
                "username": uname,
                "email": f"{uname}@example.com",
                "password": "pass12345",
                "fullName": "NonMember Test",
            },
        )
        if reg.status_code != 200:
            pytest.skip(f"registration not available: {reg.status_code}")
        token = reg.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        product = all_products[0]
        r = session.post(
            f"{BASE_URL}/api/orders",
            headers=headers,
            json={
                "shippingAddress": "1 Main",
                "paymentMethod": "credit",
                "items": [{"productId": product["id"], "quantity": 1}],
            },
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_member_create_order_no_variant(self, session, all_products, member_token):
        headers = {"Authorization": f"Bearer {member_token}"}
        # pick a non-variant product
        simple = next((p for p in all_products if not p.get("hasVariants")), None)
        assert simple, "No non-variant product found"
        payload = {
            "shippingAddress": "100 Guest Ave, NY NY 10001",
            "paymentMethod": "credit",
            "items": [{"productId": simple["id"], "quantity": 2}],
        }
        r = session.post(f"{BASE_URL}/api/orders", headers=headers, json=payload)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        body = r.json()
        assert body["status"] == "pending"
        assert len(body["items"]) == 1
        line = body["items"][0]
        assert line["productId"] == simple["id"]
        assert line["quantity"] == 2
        # Non-variant: uses product.price
        assert line["price"] == simple["price"], (
            f"expected unit_price {simple['price']} got {line['price']}"
        )
        assert body["totalAmount"] == simple["price"] * 2
        assert "_id" not in body

    def test_member_create_order_with_variant_pricing(self, session, all_products, member_token):
        headers = {"Authorization": f"Bearer {member_token}"}
        # Hampton Adams 2-Pack has variants with distinct prices
        product = _find(all_products, "Hampton Adams Kinesiology Tape — 2 Pack")
        assert product.get("variants"), "expected variants"
        variant = product["variants"][0]
        payload = {
            "shippingAddress": "200 Variant Rd",
            "paymentMethod": "credit",
            "items": [
                {"productId": product["id"], "quantity": 3, "variantSku": variant["sku"]}
            ],
        }
        r = session.post(f"{BASE_URL}/api/orders", headers=headers, json=payload)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        body = r.json()
        line = body["items"][0]
        # Variant price must win over product base price
        assert line["price"] == variant["price"], (
            f"variant price {variant['price']} expected, got {line['price']}"
        )
        assert line["variantSku"] == variant["sku"]
        assert line["quantity"] == 3
        assert body["totalAmount"] == variant["price"] * 3

    def test_member_create_order_multiple_items(self, session, all_products, member_token):
        headers = {"Authorization": f"Bearer {member_token}"}
        simple = next((p for p in all_products if not p.get("hasVariants")), None)
        varprod = _find(all_products, "Hampton Adams Kinesiology Tape — 2 Pack")
        v = varprod["variants"][1]
        payload = {
            "shippingAddress": "300 Multi Ln",
            "paymentMethod": "credit",
            "items": [
                {"productId": simple["id"], "quantity": 1},
                {"productId": varprod["id"], "quantity": 2, "variantSku": v["sku"]},
            ],
        }
        r = session.post(f"{BASE_URL}/api/orders", headers=headers, json=payload)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        body = r.json()
        assert len(body["items"]) == 2
        expected_total = simple["price"] * 1 + v["price"] * 2
        assert body["totalAmount"] == expected_total

    def test_member_empty_items_and_empty_cart_rejected(self, session, member_token):
        headers = {"Authorization": f"Bearer {member_token}"}
        # Ensure legacy server cart is empty for this user (DELETE)
        session.delete(f"{BASE_URL}/api/cart", headers=headers)
        r = session.post(
            f"{BASE_URL}/api/orders",
            headers=headers,
            json={"shippingAddress": "x", "paymentMethod": "credit", "items": []},
        )
        assert r.status_code == 400


# ---------- Legacy /api/cart endpoints still exist ----------
class TestLegacyCartEndpoints:
    def test_get_cart_reachable(self, session, member_token):
        r = session.get(
            f"{BASE_URL}/api/cart", headers={"Authorization": f"Bearer {member_token}"}
        )
        # Should not be 404/500 — 200 with list is expected
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        assert isinstance(r.json(), list)


# ---------- Regression ----------
class TestRegression:
    def test_products_count_39(self, all_products):
        assert len(all_products) == 39

    def test_image_proxy_200(self, session, all_products):
        local_imgs = sorted(
            {p["imageUrl"] for p in all_products if p.get("imageUrl", "").startswith("/api/files")}
        )
        assert local_imgs, "expected some /api/files images"
        r = session.get(f"{BASE_URL}{local_imgs[0]}")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")

    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
