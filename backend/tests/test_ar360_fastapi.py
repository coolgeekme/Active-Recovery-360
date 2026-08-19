#!/usr/bin/env python3
"""
AR360 FastAPI E-commerce Platform API Tests
Tests the FastAPI backend with JWT authentication
Features: Products, Categories, Auth (JWT), Cart, Orders, Admin endpoints
"""

import pytest
import requests
import os
from datetime import datetime

# Use external URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ar360-shop.preview.emergentagent.com').rstrip('/')

@pytest.fixture(scope="module")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_auth():
    """Get admin JWT token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    login_response = session.post(f"{BASE_URL}/api/login", json={
        "username": "admin",
        "password": "password"
    })
    assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
    data = login_response.json()
    return data.get("token")

@pytest.fixture(scope="module")
def admin_session(admin_auth):
    """Session with admin JWT token"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_auth}"
    })
    return session


# === Health Check Tests ===
class TestHealthCheck:
    """Test health endpoints"""
    
    def test_api_health(self, api_session):
        """GET /api/health returns ok status"""
        response = api_session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"


# === Products API Tests ===
class TestProductsAPI:
    """Test /api/products endpoints"""
    
    def test_get_all_products(self, api_session):
        """GET /api/products returns list of products"""
        response = api_session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one product"
        print(f"Found {len(data)} products")
        
    def test_product_structure(self, api_session):
        """Products have required fields"""
        response = api_session.get(f"{BASE_URL}/api/products")
        data = response.json()
        product = data[0]
        
        required_fields = ['id', 'name', 'description', 'price', 'visibility', 'categoryIds']
        for field in required_fields:
            assert field in product, f"Product missing field: {field}"
        
        # Verify price is numeric
        assert isinstance(product['price'], (int, float)), "Price should be numeric"
    
    def test_get_featured_products(self, api_session):
        """GET /api/products?featured=true returns featured products"""
        response = api_session.get(f"{BASE_URL}/api/products?featured=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned products should be featured
        for product in data:
            assert product.get('featured') == True
            
    def test_get_product_by_id(self, api_session):
        """GET /api/products/:id returns specific product"""
        # First get list to find a valid ID
        response = api_session.get(f"{BASE_URL}/api/products")
        products = response.json()
        product_id = products[0]['id']
        
        # Now get by ID
        response = api_session.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        product = response.json()
        assert product['id'] == product_id
        
    def test_get_nonexistent_product(self, api_session):
        """GET /api/products/:id returns 404 for non-existent product"""
        # Use a valid ObjectId format but non-existent
        fake_id = "000000000000000000000000"
        response = api_session.get(f"{BASE_URL}/api/products/{fake_id}")
        assert response.status_code == 404
        
    def test_products_visibility_filter(self, api_session):
        """GET /api/products?visibility=public returns public products"""
        response = api_session.get(f"{BASE_URL}/api/products?visibility=public")
        assert response.status_code == 200
        data = response.json()
        for product in data:
            assert product.get('visibility') == 'public'


# === Categories API Tests ===
class TestCategoriesAPI:
    """Test /api/categories endpoints"""
    
    def test_get_all_categories(self, api_session):
        """GET /api/categories returns list of categories"""
        response = api_session.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one category"
        print(f"Found {len(data)} categories")
        
    def test_category_structure(self, api_session):
        """Categories have required fields"""
        response = api_session.get(f"{BASE_URL}/api/categories")
        data = response.json()
        category = data[0]
        
        required_fields = ['id', 'name', 'description']
        for field in required_fields:
            assert field in category, f"Category missing field: {field}"
            
    def test_get_category_by_id(self, api_session):
        """GET /api/categories/:id returns specific category"""
        response = api_session.get(f"{BASE_URL}/api/categories")
        categories = response.json()
        category_id = categories[0]['id']
        
        response = api_session.get(f"{BASE_URL}/api/categories/{category_id}")
        assert response.status_code == 200
        category = response.json()
        assert category['id'] == category_id


# === Testimonials API Tests ===
class TestTestimonialsAPI:
    """Test /api/testimonials endpoints"""
    
    def test_get_all_testimonials(self, api_session):
        """GET /api/testimonials returns list of testimonials"""
        response = api_session.get(f"{BASE_URL}/api/testimonials")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} testimonials")
        
    def test_testimonial_structure(self, api_session):
        """Testimonials have required fields"""
        response = api_session.get(f"{BASE_URL}/api/testimonials")
        data = response.json()
        if len(data) > 0:
            testimonial = data[0]
            required_fields = ['id', 'author', 'content']
            for field in required_fields:
                assert field in testimonial, f"Testimonial missing field: {field}"
            
    def test_get_featured_testimonials(self, api_session):
        """GET /api/testimonials?featured=true returns featured testimonials"""
        response = api_session.get(f"{BASE_URL}/api/testimonials?featured=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# === Doctors API Tests ===
class TestDoctorsAPI:
    """Test /api/doctors endpoints"""
    
    def test_get_all_doctors(self, api_session):
        """GET /api/doctors returns list of doctors"""
        response = api_session.get(f"{BASE_URL}/api/doctors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} doctors")
        
    def test_doctor_excludes_password(self, api_session):
        """Doctor response should not include password"""
        response = api_session.get(f"{BASE_URL}/api/doctors")
        data = response.json()
        if len(data) > 0:
            doctor = data[0]
            assert 'password' not in doctor, "Doctor response should not include password"
        
    def test_get_doctor_by_id(self, api_session):
        """GET /api/doctors/:id returns specific doctor"""
        response = api_session.get(f"{BASE_URL}/api/doctors")
        doctors = response.json()
        if len(doctors) > 0:
            doctor_id = doctors[0]['id']
            response = api_session.get(f"{BASE_URL}/api/doctors/{doctor_id}")
            assert response.status_code == 200
            doctor = response.json()
            assert doctor['id'] == doctor_id


# === Authentication API Tests (JWT-based) ===
class TestAuthAPI:
    """Test authentication endpoints - FastAPI with JWT"""
    
    def test_get_user_unauthorized(self, api_session):
        """GET /api/user returns 401 when no token provided"""
        new_session = requests.Session()
        new_session.headers.update({"Content-Type": "application/json"})
        response = new_session.get(f"{BASE_URL}/api/user")
        assert response.status_code == 401
        
    def test_login_admin_success(self):
        """POST /api/login successfully authenticates admin user and returns JWT"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user" in data, "Response should contain user object"
        assert "token" in data, "Response should contain JWT token"
        
        user = data["user"]
        assert user['username'] == 'admin'
        assert user['isAdmin'] == True
        assert 'password' not in user
        
        # Verify token is a valid JWT format
        token = data["token"]
        assert isinstance(token, str)
        assert len(token.split('.')) == 3, "JWT should have 3 parts"
        
    def test_login_invalid_credentials(self):
        """POST /api/login returns 401 for invalid credentials"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
    def test_jwt_token_authentication(self):
        """JWT token successfully authenticates GET /api/user"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = session.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "password"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        
        # Use token to access protected endpoint
        auth_session = requests.Session()
        auth_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        user_response = auth_session.get(f"{BASE_URL}/api/user")
        assert user_response.status_code == 200
        data = user_response.json()
        assert data['username'] == 'admin'
        
    def test_register_new_user(self):
        """POST /api/register creates new user and returns JWT"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
        
        response = session.post(f"{BASE_URL}/api/register", json={
            "username": f"TEST_user_{timestamp}",
            "email": f"TEST_{timestamp}@example.com",
            "password": "TestPassword123!",
            "full_name": "Test User"
        })
        assert response.status_code == 200, f"Register failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "user" in data, "Response should contain user object"
        assert "token" in data, "Response should contain JWT token"
        
        user = data["user"]
        assert 'id' in user
        assert user['isMember'] == False
        assert user['isAdmin'] == False
        
    def test_register_duplicate_username(self):
        """POST /api/register returns 400 for duplicate username"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/register", json={
            "username": "admin",  # Already exists
            "email": "new_unique_email@example.com",
            "password": "TestPassword123!",
            "full_name": "Test User"
        })
        assert response.status_code == 400
        
    def test_logout(self):
        """POST /api/logout returns success"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        login_response = session.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "password"
        })
        token = login_response.json().get("token")
        
        # Logout
        auth_session = requests.Session()
        auth_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        logout_response = auth_session.post(f"{BASE_URL}/api/logout")
        assert logout_response.status_code == 200


# === Cart API Tests (Requires Membership) ===
class TestCartAPI:
    """Test cart endpoints - requires authentication and membership"""
    
    def test_cart_requires_auth(self, api_session):
        """GET /api/cart requires authentication"""
        new_session = requests.Session()
        new_session.headers.update({"Content-Type": "application/json"})
        response = new_session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 401
        
    def test_cart_access_with_auth(self, admin_session):
        """GET /api/cart returns cart items for authenticated user"""
        response = admin_session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_add_to_cart_requires_membership(self):
        """POST /api/cart requires membership"""
        # Create a new non-member user
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
        
        # Register non-member user
        register_response = session.post(f"{BASE_URL}/api/register", json={
            "username": f"TEST_nonmember_{timestamp}",
            "email": f"TEST_nonmember_{timestamp}@example.com",
            "password": "TestPassword123!",
            "full_name": "Non Member User"
        })
        assert register_response.status_code == 200
        token = register_response.json().get("token")
        
        # Get a product ID
        products_response = session.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        public_product = next((p for p in products if p.get('visibility') == 'public'), products[0])
        
        # Try to add to cart
        auth_session = requests.Session()
        auth_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        cart_response = auth_session.post(f"{BASE_URL}/api/cart", json={
            "productId": public_product['id'],
            "quantity": 1
        })
        # Should fail because user is not a member
        assert cart_response.status_code == 403
        
    def test_add_to_cart_with_member(self, admin_session):
        """POST /api/cart works for members"""
        # Admin is a member, so should be able to add to cart
        # First get a public product
        products_response = admin_session.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        public_product = next((p for p in products if p.get('visibility') == 'public'), products[0])
        
        cart_response = admin_session.post(f"{BASE_URL}/api/cart", json={
            "productId": public_product['id'],
            "quantity": 1
        })
        assert cart_response.status_code == 200
        data = cart_response.json()
        assert "productId" in data or "product" in data


# === Admin API Tests ===
class TestAdminAPI:
    """Test admin-only endpoints"""
    
    def test_admin_users_requires_auth(self, api_session):
        """GET /api/admin/users requires authentication"""
        new_session = requests.Session()
        new_session.headers.update({"Content-Type": "application/json"})
        response = new_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401
        
    def test_admin_users_success(self, admin_session):
        """GET /api/admin/users returns user list for admin"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check no passwords in response
        for user in data:
            assert 'password' not in user


# === Discount Code API Tests ===
class TestDiscountCodeAPI:
    """Test discount code endpoints"""
    
    def test_validate_invalid_code(self, api_session):
        """POST /api/discount-codes/validate returns 404 for invalid code"""
        response = api_session.post(f"{BASE_URL}/api/discount-codes/validate", json={
            "code": "INVALID_CODE_12345"
        })
        assert response.status_code == 404


# === Firebase Auth Tests ===
class TestFirebaseAuth:
    """Test Firebase authentication endpoint"""
    
    def test_firebase_auth_requires_valid_fields(self, api_session):
        """POST /api/auth/firebase requires proper fields"""
        response = api_session.post(f"{BASE_URL}/api/auth/firebase", json={})
        # Should fail validation
        assert response.status_code in [400, 422]
        
    def test_firebase_auth_invalid_token(self, api_session):
        """POST /api/auth/firebase rejects invalid token"""
        response = api_session.post(f"{BASE_URL}/api/auth/firebase", json={
            "id_token": "invalid_token",
            "email": "test@example.com",
            "full_name": "Test User"
        })
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
