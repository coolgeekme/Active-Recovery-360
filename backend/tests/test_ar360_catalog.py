"""
AR360 Catalog Refresh Tests (Iteration 5)
Tests the new 39-product consolidated catalog, variants, image proxy,
visibility filters, categories, and admin login.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ar360-shop.preview.emergentagent.com").rstrip("/")


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


# ---------- Products ----------
class TestProductsCatalog:
    def test_total_product_count(self, all_products):
        assert len(all_products) == 39, f"Expected 39 products, got {len(all_products)}"

    def test_required_fields(self, all_products):
        required = {"id", "name", "price", "imageUrl", "brand", "hasVariants", "variants"}
        for p in all_products:
            missing = required - set(p.keys())
            assert not missing, f"Product {p.get('name')} missing fields: {missing}"

    def test_no_mongo_objectid_leak(self, all_products):
        for p in all_products:
            assert "_id" not in p, f"_id leaked in product {p.get('name')}"

    def test_get_product_by_id(self, session, all_products):
        pid = all_products[0]["id"]
        r = session.get(f"{BASE_URL}/api/products/{pid}")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == pid
        assert "variants" in body

    def test_featured_at_least_three(self, session):
        r = session.get(f"{BASE_URL}/api/products?featured=true")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 3, f"Expected >=3 featured, got {len(data)}"
        for p in data:
            assert p.get("featured") is True


# ---------- Variants ----------
class TestVariantIntegrity:
    def _find(self, products, name_substr):
        matches = [p for p in products if name_substr.lower() in p["name"].lower()]
        assert matches, f"No product matching '{name_substr}'"
        return matches[0]

    def test_incrediwear_knee_25_variants(self, all_products):
        p = self._find(all_products, "Incrediwear Knee Sleeve")
        assert p["hasVariants"] is True
        assert len(p["variants"]) == 25, f"Expected 25, got {len(p['variants'])}"

    def test_hampton_2pack_10_variants(self, all_products):
        p = self._find(all_products, "Hampton Adams Kinesiology Tape — 2 Pack")
        assert len(p["variants"]) == 10

    def test_hampton_clinic_roll_10_variants(self, all_products):
        p = self._find(all_products, "Hampton Adams Kinesiology Tape — Clinic Roll")
        assert len(p["variants"]) == 10

    def test_hot_cold_compression_4_size_variants(self, all_products):
        p = self._find(all_products, "Hot/Cold Compression Sleeve")
        assert len(p["variants"]) == 4
        sizes = {v["attributes"].get("size") for v in p["variants"]}
        assert sizes == {"S", "M", "L", "XL"} or len(sizes) == 4


# ---------- Categories ----------
class TestCategories:
    def test_at_least_10_categories(self, session):
        r = session.get(f"{BASE_URL}/api/categories")
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) >= 10
        names = [c["name"] for c in cats]
        for required in ["Cold Compression", "Exercise Therapy", "Kinesiology Tape"]:
            assert required in names, f"Missing category: {required}"


# ---------- Visibility filters ----------
class TestVisibilityFilters:
    def test_public_visibility_majority(self, session):
        r = session.get(f"{BASE_URL}/api/products?visibility=public")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 20, f"Expected most products public, got {len(data)}"

    def test_member_visibility_includes_cbd(self, session):
        r = session.get(f"{BASE_URL}/api/products?visibility=member")
        data = r.json()
        assert len(data) > 0
        # At least some CBD products
        cbd_count = sum(1 for p in data if "cbd" in p["name"].lower())
        assert cbd_count >= 3, f"Expected CBD products in member visibility, got {cbd_count}"

    def test_doctor_visibility_includes_specific(self, session):
        r = session.get(f"{BASE_URL}/api/products?visibility=doctor")
        data = r.json()
        names = " ".join(p["name"] for p in data).lower()
        for expected in ["marc pro", "squid go", "bio blade"]:
            assert expected in names, f"Doctor visibility missing: {expected}"


# ---------- Image proxy ----------
class TestImageProxy:
    def test_all_local_images_return_200_with_image_content_type(self, session, all_products):
        local_imgs = sorted({p["imageUrl"] for p in all_products if p.get("imageUrl", "").startswith("/api/files")})
        assert len(local_imgs) >= 5, f"Too few /api/files images: {len(local_imgs)}"
        failures = []
        for img in local_imgs:
            r = session.get(f"{BASE_URL}{img}")
            ct = r.headers.get("content-type", "")
            if r.status_code != 200 or not ct.startswith("image/"):
                failures.append(f"{img} -> {r.status_code} {ct}")
        assert not failures, f"Image proxy failures: {failures}"

    def test_files_endpoint_404_for_missing(self, session):
        r = session.get(f"{BASE_URL}/api/files/ar360/products/nonexistent_file_xyz.png")
        assert r.status_code == 404


# ---------- Admin Login ----------
class TestAdminLogin:
    def test_admin_login_works(self, session):
        r = session.post(f"{BASE_URL}/api/login", json={"username": "admin", "password": "password"})
        assert r.status_code == 200
        data = r.json()
        # Response is { token, user } wrapper
        user = data.get("user", data)
        assert user.get("isAdmin") is True
        assert "password" not in user
        assert "token" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
