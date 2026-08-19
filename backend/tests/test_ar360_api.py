#!/usr/bin/env python3
"""
AR360 E-commerce Platform API Tests
Tests the MongoDB-based backend after PostgreSQL migration
Features: Products, Categories, Auth, Cart, Orders, Admin endpoints
"""

import pytest
import requests
import os
from datetime import datetime

# Use local server for testing since external URL may have proxy issues
BASE_URL = os.environ.get('TEST_BASE_URL', 'http://localhost:3000')

@pytest.fixture(scope="module")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_session(api_session):
    """Session authenticated as admin"""
    login_response = api_session.post(f"{BASE_URL}/api/login", json={
        "username": "admin",
        "password": "password"
    })
    assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
    return api_session


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
        
    def test_product_structure(self, api_session):
        """Products have required fields"""
        response = api_session.get(f"{BASE_URL}/api/products")
        data = response.json()
        product = data[0]
        
        required_fields = ['id', 'name', 'description', 'price', 'visibility', 'categoryIds']
        for field in required_fields:
            assert field in product, f"Product missing field: {field}"
    
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
        assert len(data) > 0, "Expected at least one testimonial"
        
    def test_testimonial_structure(self, api_session):
        """Testimonials have required fields"""
        response = api_session.get(f"{BASE_URL}/api/testimonials")
        data = response.json()
        testimonial = data[0]
        
        required_fields = ['id', 'author', 'role', 'content']
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
        assert len(data) > 0, "Expected at least one doctor"
        
    def test_doctor_excludes_password(self, api_session):
        """Doctor response should not include password"""
        response = api_session.get(f"{BASE_URL}/api/doctors")
        data = response.json()
        doctor = data[0]
        assert 'password' not in doctor, "Doctor response should not include password"
        
    def test_get_doctor_by_id(self, api_session):
        """GET /api/doctors/:id returns specific doctor"""
        response = api_session.get(f"{BASE_URL}/api/doctors")
        doctors = response.json()
        doctor_id = doctors[0]['id']
        
        response = api_session.get(f"{BASE_URL}/api/doctors/{doctor_id}")
        assert response.status_code == 200
        doctor = response.json()
        assert doctor['id'] == doctor_id


# === Authentication API Tests ===
class TestAuthAPI:
    """Test authentication endpoints"""
    
    def test_get_user_unauthorized(self, api_session):
        """GET /api/user returns 401 when not logged in"""
        new_session = requests.Session()
        response = new_session.get(f"{BASE_URL}/api/user")
        assert response.status_code == 401
        
    def test_login_admin(self):
        """POST /api/login successfully authenticates admin user"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "password"
        })
        assert response.status_code == 200
        data = response.json()
        assert data['username'] == 'admin'
        assert data['isAdmin'] == True
        assert 'password' not in data
        
    def test_login_kevin(self):
        """POST /api/login successfully authenticates Kevin user"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/login", json={
            "username": "kevinmacpherson08",
            "password": "Recovery25!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data['username'] == 'kevinmacpherson08'
        assert data['isAdmin'] == True
        
    def test_login_invalid_credentials(self):
        """POST /api/login returns 401 for invalid credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
    def test_session_persistence(self):
        """Session persists after login - GET /api/user works"""
        session = requests.Session()
        # Login
        login_response = session.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "password"
        })
        assert login_response.status_code == 200
        
        # Check session persists
        user_response = session.get(f"{BASE_URL}/api/user")
        assert user_response.status_code == 200
        data = user_response.json()
        assert data['username'] == 'admin'
        
    def test_register_new_user(self):
        """POST /api/register creates new user"""
        session = requests.Session()
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        response = session.post(f"{BASE_URL}/api/register", json={
            "username": f"TEST_user_{timestamp}",
            "email": f"TEST_{timestamp}@example.com",
            "password": "TestPassword123!",
            "fullName": "Test User"
        })
        assert response.status_code == 201
        data = response.json()
        assert 'id' in data
        assert data['isMember'] == False
        assert data['isAdmin'] == False
        
    def test_logout(self):
        """POST /api/logout ends session"""
        session = requests.Session()
        # Login
        session.post(f"{BASE_URL}/api/login", json={
            "username": "admin",
            "password": "password"
        })
        
        # Logout
        logout_response = session.post(f"{BASE_URL}/api/logout")
        assert logout_response.status_code == 200
        
        # Verify logged out
        user_response = session.get(f"{BASE_URL}/api/user")
        assert user_response.status_code == 401


# === Admin API Tests ===
class TestAdminAPI:
    """Test admin-only endpoints"""
    
    def test_admin_users_requires_auth(self, api_session):
        """GET /api/admin/users requires authentication"""
        new_session = requests.Session()
        response = new_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401
        
    def test_admin_users_requires_admin(self):
        """GET /api/admin/users requires admin role"""
        # Login as doctor (non-admin)
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/login", json={
            "username": "doctor",
            "password": "password"
        })
        assert login_response.status_code == 200
        
        # Try to access admin endpoint
        response = session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 403
        
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


# === Cart API Tests ===
class TestCartAPI:
    """Test cart endpoints"""
    
    def test_cart_requires_auth(self, api_session):
        """GET /api/cart requires authentication"""
        new_session = requests.Session()
        response = new_session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 401


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
    
    def test_firebase_auth_requires_token(self, api_session):
        """POST /api/auth/firebase requires idToken"""
        response = api_session.post(f"{BASE_URL}/api/auth/firebase", json={})
        assert response.status_code == 400
        
    def test_firebase_auth_invalid_token(self, api_session):
        """POST /api/auth/firebase rejects invalid token"""
        response = api_session.post(f"{BASE_URL}/api/auth/firebase", json={
            "idToken": "invalid_token",
            "email": "test@example.com"
        })
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
