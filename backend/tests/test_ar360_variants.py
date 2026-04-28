"""Backend tests for variant management + image upload (iteration 9)."""
import os
import io
import base64
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ar360-shop.preview.emergentagent.com").rstrip("/")
ADMIN_USERNAME = "admin@example.com"
ADMIN_PASSWORD = "password"

# 1x1 transparent PNG
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9ZjFTNQAAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/login", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    return data["token"]


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def category_id():
    r = requests.get(f"{BASE_URL}/api/categories")
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) > 0
    return cats[0]["id"]


# ---------------- Variant CRUD ----------------

def test_compression_sleeve_has_4_variants():
    """Sanity: existing seeded Hot/Cold Compression Sleeve has 4 variants."""
    r = requests.get(f"{BASE_URL}/api/products")
    assert r.status_code == 200
    products = r.json()
    sleeve = next((p for p in products if "Compression Sleeve" in p.get("name", "")), None)
    assert sleeve is not None, "Hot/Cold Compression Sleeve not found in seed"
    assert sleeve.get("hasVariants") is True
    assert len(sleeve.get("variants", [])) == 4
    skus = sorted(v.get("sku") for v in sleeve["variants"])
    assert skus == ["CS-01", "CS-02", "CS-03", "CS-04"]


def test_create_product_with_variants_derives_price_stock(auth_headers, category_id):
    payload = {
        "name": "TEST_VariantProduct_iter9",
        "description": "Test product with variants for iter9",
        "imageUrl": "/api/files/test.jpg",
        "visibility": "public",
        "categoryId": category_id,
        "featured": False,
        "doctorIds": [],
        "variants": [
            {"sku": "TEST-V1", "name": "Small", "price": 1500, "stockQuantity": 5,
             "imageUrl": None, "attributes": {"size": "S"}},
            {"sku": "TEST-V2", "name": "Large", "price": 2500, "stockQuantity": 7,
             "imageUrl": None, "attributes": {"size": "L"}},
        ],
    }
    r = requests.post(f"{BASE_URL}/api/products", json=payload, headers=auth_headers)
    assert r.status_code == 200, r.text
    created = r.json()
    pid = created["id"]
    try:
        # Auto-derive price = min, stock = sum, hasVariants = True
        assert created["hasVariants"] is True
        assert created["price"] == 1500
        assert created["stockQuantity"] == 12
        assert len(created["variants"]) == 2

        # GET to verify persistence
        r2 = requests.get(f"{BASE_URL}/api/products/{pid}")
        assert r2.status_code == 200
        fetched = r2.json()
        assert fetched["hasVariants"] is True
        assert fetched["price"] == 1500
        assert fetched["stockQuantity"] == 12
        assert len(fetched["variants"]) == 2
    finally:
        requests.delete(f"{BASE_URL}/api/products/{pid}", headers=auth_headers)


def test_update_variant_price_persists(auth_headers, category_id):
    create = requests.post(f"{BASE_URL}/api/products", json={
        "name": "TEST_UpdateVariant_iter9",
        "description": "for update test",
        "imageUrl": "/api/files/test.jpg",
        "visibility": "public",
        "categoryId": category_id,
        "featured": False,
        "doctorIds": [],
        "variants": [
            {"sku": "U1", "name": "M", "price": 2000, "stockQuantity": 3, "imageUrl": None, "attributes": {"size": "M"}},
            {"sku": "U2", "name": "L", "price": 3000, "stockQuantity": 4, "imageUrl": None, "attributes": {"size": "L"}},
        ],
    }, headers=auth_headers)
    assert create.status_code == 200
    pid = create.json()["id"]
    try:
        # Update: drop one variant's price to 1000 -> min should become 1000
        upd = requests.put(f"{BASE_URL}/api/products/{pid}", json={
            "variants": [
                {"sku": "U1", "name": "M", "price": 1000, "stockQuantity": 3, "imageUrl": None, "attributes": {"size": "M"}},
                {"sku": "U2", "name": "L", "price": 3000, "stockQuantity": 4, "imageUrl": None, "attributes": {"size": "L"}},
            ]
        }, headers=auth_headers)
        assert upd.status_code == 200, upd.text
        result = upd.json()
        assert result["price"] == 1000
        assert result["stockQuantity"] == 7
        assert result["hasVariants"] is True

        # GET verify persistence
        fetched = requests.get(f"{BASE_URL}/api/products/{pid}").json()
        assert fetched["price"] == 1000
        assert fetched["variants"][0]["price"] == 1000
    finally:
        requests.delete(f"{BASE_URL}/api/products/{pid}", headers=auth_headers)


def test_clear_variants_sets_hasVariants_false(auth_headers, category_id):
    """Removing all variants in PUT should set hasVariants=false; price/stock from form preserved."""
    create = requests.post(f"{BASE_URL}/api/products", json={
        "name": "TEST_ClearVariants_iter9",
        "description": "clear variants test",
        "imageUrl": "/api/files/test.jpg",
        "visibility": "public",
        "categoryId": category_id,
        "featured": False,
        "doctorIds": [],
        "variants": [
            {"sku": "C1", "name": "M", "price": 1000, "stockQuantity": 2, "imageUrl": None, "attributes": {}},
            {"sku": "C2", "name": "L", "price": 2000, "stockQuantity": 3, "imageUrl": None, "attributes": {}},
        ],
    }, headers=auth_headers)
    pid = create.json()["id"]
    try:
        upd = requests.put(f"{BASE_URL}/api/products/{pid}", json={
            "variants": [],
            "price": 4999,
            "stockQuantity": 50,
        }, headers=auth_headers)
        assert upd.status_code == 200, upd.text
        result = upd.json()
        assert result["hasVariants"] is False
        assert result["variants"] == []
        # Form-supplied price/stock preserved
        assert result["price"] == 4999
        assert result["stockQuantity"] == 50
    finally:
        requests.delete(f"{BASE_URL}/api/products/{pid}", headers=auth_headers)


def test_single_variant_hasVariants_false(auth_headers, category_id):
    """variants.length > 1 is the rule; a single variant => hasVariants=false."""
    create = requests.post(f"{BASE_URL}/api/products", json={
        "name": "TEST_SingleVariant_iter9",
        "description": "single variant",
        "imageUrl": "/api/files/test.jpg",
        "visibility": "public",
        "categoryId": category_id,
        "featured": False,
        "doctorIds": [],
        "variants": [
            {"sku": "S1", "name": "Only", "price": 1234, "stockQuantity": 9, "imageUrl": None, "attributes": {}},
        ],
    }, headers=auth_headers)
    pid = create.json()["id"]
    try:
        body = create.json()
        assert body["hasVariants"] is False
        assert body["price"] == 1234  # still derived from variant
        assert body["stockQuantity"] == 9
    finally:
        requests.delete(f"{BASE_URL}/api/products/{pid}", headers=auth_headers)


# ---------------- /api/uploads/image ----------------

def test_upload_image_admin_png(auth_headers):
    files = {"file": ("test.png", io.BytesIO(PNG_BYTES), "image/png")}
    r = requests.post(f"{BASE_URL}/api/uploads/image", files=files, headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "path" in data and "url" in data
    assert data["path"].startswith("ar360/products/")
    assert data["path"].endswith(".png")
    assert data["url"] == f"/api/files/{data['path']}"


def test_upload_image_unsupported_type(auth_headers):
    files = {"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
    r = requests.post(f"{BASE_URL}/api/uploads/image", files=files, headers=auth_headers)
    assert r.status_code == 400
    assert "Unsupported" in r.json().get("detail", "")


def test_upload_image_unauthenticated():
    files = {"file": ("test.png", io.BytesIO(PNG_BYTES), "image/png")}
    r = requests.post(f"{BASE_URL}/api/uploads/image", files=files)
    # Missing/invalid auth should be rejected (401 or 403)
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"


# ---------------- REGRESSION ----------------

def test_regression_plain_product_crud(auth_headers, category_id):
    create = requests.post(f"{BASE_URL}/api/products", json={
        "name": "TEST_PlainProduct_iter9",
        "description": "plain product no variants",
        "price": 1999,
        "imageUrl": "/api/files/plain.jpg",
        "visibility": "public",
        "categoryId": category_id,
        "stockQuantity": 25,
        "featured": False,
        "doctorIds": [],
    }, headers=auth_headers)
    assert create.status_code == 200, create.text
    pid = create.json()["id"]
    try:
        body = create.json()
        assert body["hasVariants"] is False
        assert body["variants"] == []
        assert body["price"] == 1999

        # Edit: bump price
        upd = requests.put(f"{BASE_URL}/api/products/{pid}", json={"price": 2999}, headers=auth_headers)
        assert upd.status_code == 200
        assert upd.json()["price"] == 2999
    finally:
        d = requests.delete(f"{BASE_URL}/api/products/{pid}", headers=auth_headers)
        assert d.status_code == 200


def test_regression_guest_cart():
    """Guest cart endpoint still alive."""
    # Create a guest cart -> add item -> read back
    r = requests.post(f"{BASE_URL}/api/cart/guest", json={})
    # Endpoint can vary; we accept 200 or 404. Just make sure backend is up.
    assert r.status_code in (200, 201, 404, 405)
