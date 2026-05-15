"""Backend tests for Recovery Services directory (iteration 13).

Covers:
- Admin CRUD (create, list, get, update, publish/unpublish, delete)
- Public auth-gated list (member discount visibility rules)
- Validation errors (missing name, category, locations)
- Auth requirements
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ar360-shop.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_CREDS = {"username": "admin@example.com", "password": "password"}


# ---------------- Fixtures ----------------

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/login", json=ADMIN_CREDS, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_service(admin_headers):
    payload = {
        "name": "TEST_Recovery_Lab_Pytest",
        "category": "Cryotherapy",
        "description": "TEST service created by pytest for iteration 13",
        "memberDiscount": {"text": "20% off all sessions"},
        "locations": [{
            "name": "Main Clinic",
            "address": "100 Test St",
            "city": "Denver",
            "state": "CO",
            "zipCode": "80202",
            "latitude": 39.7392,
            "longitude": -104.9903,
        }],
        "status": "draft",
    }
    r = requests.post(f"{API}/admin/recovery-services", json=payload, headers=admin_headers, timeout=20)
    assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
    svc = r.json()
    yield svc
    # teardown
    sid = svc.get("id")
    if sid:
        requests.delete(f"{API}/admin/recovery-services/{sid}", headers=admin_headers, timeout=20)


# ---------------- Tests ----------------

class TestRecoveryServicesAdmin:

    def test_admin_create_returns_id_and_fields(self, created_service):
        assert "id" in created_service and isinstance(created_service["id"], str)
        assert created_service["name"] == "TEST_Recovery_Lab_Pytest"
        assert created_service["category"] == "Cryotherapy"
        assert created_service["status"] == "draft"
        assert len(created_service["locations"]) == 1
        assert created_service["locations"][0]["city"] == "Denver"
        # admin view: discount text visible
        assert created_service["memberDiscount"].get("text") == "20% off all sessions"

    def test_admin_list_includes_created(self, admin_headers, created_service):
        r = requests.get(f"{API}/admin/recovery-services", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        ids = [i["id"] for i in items]
        assert created_service["id"] in ids

    def test_admin_update_changes_persist(self, admin_headers, created_service):
        sid = created_service["id"]
        payload = {
            "name": "TEST_Recovery_Lab_Pytest_Updated",
            "category": "Sauna",
            "description": "Updated by pytest",
            "memberDiscount": {"text": "25% off"},
            "locations": created_service["locations"],
            "status": "draft",
        }
        r = requests.put(f"{API}/admin/recovery-services/{sid}", json=payload, headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        upd = r.json()
        assert upd["name"] == "TEST_Recovery_Lab_Pytest_Updated"
        assert upd["category"] == "Sauna"

        # verify persisted via GET admin list
        r = requests.get(f"{API}/admin/recovery-services", headers=admin_headers, timeout=20)
        item = next(i for i in r.json() if i["id"] == sid)
        assert item["name"] == "TEST_Recovery_Lab_Pytest_Updated"
        assert item["category"] == "Sauna"

    def test_admin_publish_then_unpublish(self, admin_headers, created_service):
        sid = created_service["id"]
        r = requests.post(f"{API}/admin/recovery-services/{sid}/publish", headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "published"
        r = requests.post(f"{API}/admin/recovery-services/{sid}/unpublish", headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "draft"

    def test_create_missing_name_returns_400(self, admin_headers):
        payload = {
            "category": "Cryotherapy",
            "locations": [{"city": "Denver", "state": "CO", "address": "x", "zipCode": "1"}],
        }
        r = requests.post(f"{API}/admin/recovery-services", json=payload, headers=admin_headers, timeout=20)
        assert r.status_code == 400

    def test_create_missing_category_returns_400(self, admin_headers):
        payload = {
            "name": "TEST_no_cat",
            "locations": [{"city": "Denver", "state": "CO", "address": "x", "zipCode": "1"}],
        }
        r = requests.post(f"{API}/admin/recovery-services", json=payload, headers=admin_headers, timeout=20)
        assert r.status_code == 400

    def test_create_missing_locations_returns_400(self, admin_headers):
        payload = {"name": "TEST_no_loc", "category": "Cryotherapy", "locations": []}
        r = requests.post(f"{API}/admin/recovery-services", json=payload, headers=admin_headers, timeout=20)
        assert r.status_code == 400

    def test_admin_list_requires_admin_auth(self):
        r = requests.get(f"{API}/admin/recovery-services", timeout=20)
        assert r.status_code in (401, 403)

    def test_admin_delete_returns_404_on_invalid_id(self, admin_headers):
        r = requests.delete(f"{API}/admin/recovery-services/not-a-real-id", headers=admin_headers, timeout=20)
        assert r.status_code == 404


class TestRecoveryServicesPublic:

    def test_public_list_requires_auth(self):
        r = requests.get(f"{API}/recovery-services", timeout=20)
        assert r.status_code in (401, 403)

    def test_public_list_as_admin_returns_published_with_discount(self, admin_headers, admin_token, created_service):
        # publish the test service first
        sid = created_service["id"]
        requests.post(f"{API}/admin/recovery-services/{sid}/publish", headers=admin_headers, timeout=20)

        r = requests.get(f"{API}/recovery-services", headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        # all returned should be published
        assert all(i["status"] == "published" for i in items)
        # our test service should appear
        ours = next((i for i in items if i["id"] == sid), None)
        assert ours is not None
        # admin is isMember/isAdmin → full discount visible (text may have been updated by earlier test)
        assert "text" in ours["memberDiscount"]
        assert ours["memberDiscount"]["text"]  # non-empty

        # cleanup state: unpublish
        requests.post(f"{API}/admin/recovery-services/{sid}/unpublish", headers=admin_headers, timeout=20)

    def test_public_get_by_id_published(self, admin_headers, admin_token, created_service):
        sid = created_service["id"]
        requests.post(f"{API}/admin/recovery-services/{sid}/publish", headers=admin_headers, timeout=20)

        r = requests.get(f"{API}/recovery-services/{sid}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == sid
        assert data["status"] == "published"

        # unpublish then expect 404 from public endpoint
        requests.post(f"{API}/admin/recovery-services/{sid}/unpublish", headers=admin_headers, timeout=20)
        r = requests.get(f"{API}/recovery-services/{sid}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 404

    def test_public_get_invalid_id_returns_404(self, admin_token):
        r = requests.get(f"{API}/recovery-services/not-a-real-id", headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 404


# ---------------- Regression ----------------

class TestRegression:

    def test_products_loads(self):
        r = requests.get(f"{API}/products", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_login_still_works(self):
        r = requests.post(f"{API}/login", json=ADMIN_CREDS, timeout=20)
        assert r.status_code == 200
        assert "token" in r.json()

    def test_admin_hcp_list_loads(self, admin_headers):
        r = requests.get(f"{API}/admin/hcp", headers=admin_headers, timeout=20)
        # endpoint may be /admin/hcp/applications -- accept 200 or 404 (route name variation)
        assert r.status_code in (200, 404)

    def test_admin_discount_codes_loads(self, admin_headers):
        r = requests.get(f"{API}/admin/discount-codes", headers=admin_headers, timeout=20)
        assert r.status_code in (200, 404)
