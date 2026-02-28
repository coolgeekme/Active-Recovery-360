#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class AR360FirebaseAPITester:
    """Test suite for AR360 E-commerce Platform APIs with Firebase Auth"""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.firebase_token = None
        self.test_user_id = None
        
    def log_test(self, name: str, status: bool, message: str = ""):
        """Log test results"""
        self.tests_run += 1
        if status:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED {message}")
        else:
            print(f"❌ {name}: FAILED {message}")
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200) -> tuple[bool, Dict[str, Any], int]:
        """Make HTTP request and return success status, response data, and status code"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url)
            else:
                return False, {"error": "Unsupported method"}, 0
            
            # Try to parse JSON, fallback to text
            try:
                response_data = response.json() if response.content else {}
            except json.JSONDecodeError:
                response_data = {"text": response.text}
            
            success = response.status_code == expected_status
            return success, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0

    def test_products_api(self):
        """Test /api/products endpoint"""
        print("\n🔍 Testing Products API...")
        
        # Test GET /api/products
        success, data, status_code = self.make_request('GET', '/api/products')
        if success and isinstance(data, list):
            self.log_test("GET /api/products", True, f"Retrieved {len(data)} products")
            
            # Validate product structure
            if data:
                product = data[0]
                required_fields = ['id', 'name', 'description', 'price']
                has_required = all(field in product for field in required_fields)
                self.log_test("Product structure validation", has_required, 
                            f"Fields present: {list(product.keys())}")
        else:
            self.log_test("GET /api/products", False, f"Status: {status_code}, Response: {data}")
        
        # Test GET /api/products with filters
        success, data, status_code = self.make_request('GET', '/api/products?featured=true')
        self.log_test("GET /api/products?featured=true", success, 
                     f"Retrieved {len(data) if isinstance(data, list) else 0} featured products")
        
        # Test GET individual product
        success, data, status_code = self.make_request('GET', '/api/products/1')
        if success:
            self.log_test("GET /api/products/1", True, f"Retrieved product: {data.get('name', 'Unknown')}")
        else:
            self.log_test("GET /api/products/1", False, f"Status: {status_code}")

    def test_categories_api(self):
        """Test /api/categories endpoint"""
        print("\n🔍 Testing Categories API...")
        
        success, data, status_code = self.make_request('GET', '/api/categories')
        if success and isinstance(data, list):
            self.log_test("GET /api/categories", True, f"Retrieved {len(data)} categories")
            
            # Test individual category if categories exist
            if data:
                category_id = data[0]['id']
                success, cat_data, status_code = self.make_request('GET', f'/api/categories/{category_id}')
                self.log_test(f"GET /api/categories/{category_id}", success,
                            f"Retrieved category: {cat_data.get('name', 'Unknown') if success else 'Failed'}")
        else:
            self.log_test("GET /api/categories", False, f"Status: {status_code}, Response: {data}")

    def test_doctors_api(self):
        """Test /api/doctors endpoint"""
        print("\n🔍 Testing Doctors API...")
        
        success, data, status_code = self.make_request('GET', '/api/doctors')
        if success and isinstance(data, list):
            self.log_test("GET /api/doctors", True, f"Retrieved {len(data)} doctors")
            
            # Test individual doctor if doctors exist
            if data:
                doctor_id = data[0]['id']
                success, doc_data, status_code = self.make_request('GET', f'/api/doctors/{doctor_id}')
                self.log_test(f"GET /api/doctors/{doctor_id}", success,
                            f"Retrieved doctor: {doc_data.get('fullName', 'Unknown') if success else 'Failed'}")
        else:
            self.log_test("GET /api/doctors", False, f"Status: {status_code}, Response: {data}")

    def test_testimonials_api(self):
        """Test /api/testimonials endpoint"""
        print("\n🔍 Testing Testimonials API...")
        
        success, data, status_code = self.make_request('GET', '/api/testimonials')
        if success and isinstance(data, list):
            self.log_test("GET /api/testimonials", True, f"Retrieved {len(data)} testimonials")
        else:
            self.log_test("GET /api/testimonials", False, f"Status: {status_code}, Response: {data}")
        
        # Test with featured filter
        success, data, status_code = self.make_request('GET', '/api/testimonials?featured=true')
        self.log_test("GET /api/testimonials?featured=true", success,
                     f"Retrieved {len(data) if isinstance(data, list) else 0} featured testimonials")

    def test_firebase_auth_endpoint(self):
        """Test Firebase authentication endpoint"""
        print("\n🔍 Testing Firebase Authentication API...")
        
        # Test user status endpoint (should return 401 when not logged in)
        success, data, status_code = self.make_request('GET', '/api/user', expected_status=401)
        self.log_test("GET /api/user (unauthorized)", success, "Correctly returns 401 when not logged in")
        
        # Test Firebase auth endpoint without token (should fail)
        success, data, status_code = self.make_request('POST', '/api/auth/firebase', {}, expected_status=400)
        self.log_test("POST /api/auth/firebase (no token)", success, "Correctly requires Firebase ID token")
        
        # Test Firebase auth endpoint with invalid token (should fail)
        invalid_firebase_data = {
            "idToken": "invalid_token_123", 
            "email": "test@example.com",
            "fullName": "Test User"
        }
        success, data, status_code = self.make_request('POST', '/api/auth/firebase', invalid_firebase_data, expected_status=401)
        self.log_test("POST /api/auth/firebase (invalid token)", success, 
                     f"Correctly rejects invalid Firebase token: {data.get('message', 'No message')}")
        
        # Test traditional registration (still available alongside Firebase)
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "username": f"testuser_{timestamp}",
            "email": f"test_{timestamp}@example.com",
            "password": "TestPassword123!",
            "fullName": "Test User"
        }
        
        success, data, status_code = self.make_request('POST', '/api/register', test_user, expected_status=201)
        if success:
            self.log_test("POST /api/register", True, f"User created: {data.get('username')}")
            self.test_user_id = data.get('id')
            
            # Test traditional login
            login_data = {
                "username": test_user["username"],
                "password": test_user["password"]
            }
            success, login_response, status_code = self.make_request('POST', '/api/login', login_data)
            if success:
                self.log_test("POST /api/login", True, f"Logged in as: {login_response.get('username')}")
                
                # Test getting current user after login
                success, user_data, status_code = self.make_request('GET', '/api/user')
                self.log_test("GET /api/user (authorized)", success, 
                            f"Retrieved user data: {user_data.get('username') if success else 'Failed'}")
                
                # Test logout
                success, logout_data, status_code = self.make_request('POST', '/api/logout')
                self.log_test("POST /api/logout", success, "Successfully logged out")
            else:
                self.log_test("POST /api/login", False, f"Status: {status_code}, Response: {login_response}")
        else:
            self.log_test("POST /api/register", False, f"Status: {status_code}, Response: {data}")

    def test_membership_endpoints(self):
        """Test membership related endpoints"""
        print("\n🔍 Testing Membership API...")
        
        # Test discount code validation endpoint (public endpoint)
        discount_data = {"code": "INVALID_CODE"}
        success, data, status_code = self.make_request('POST', '/api/discount-codes/validate', 
                                                     discount_data, expected_status=404)
        self.log_test("POST /api/discount-codes/validate (invalid code)", success, 
                     "Correctly returns 404 for invalid discount code")

    def test_cart_endpoints_unauthorized(self):
        """Test cart endpoints without authentication (should fail)"""
        print("\n🔍 Testing Cart API (Unauthorized)...")
        
        # These should require authentication
        success, data, status_code = self.make_request('GET', '/api/cart', expected_status=401)
        self.log_test("GET /api/cart (unauthorized)", success, "Correctly requires authentication")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AR360 API Testing Suite")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 50)
        
        # Test core API endpoints
        self.test_products_api()
        self.test_categories_api()
        self.test_doctors_api()
        self.test_testimonials_api()
        
        # Test authentication
        self.test_firebase_auth_endpoint()
        
        # Test membership endpoints
        self.test_membership_endpoints()
        
        # Test protected endpoints
        self.test_cart_endpoints_unauthorized()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"🎯 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 API tests mostly successful!")
            return True
        else:
            print("⚠️  Multiple API issues detected")
            return False

def main():
    """Main function"""
    tester = AR360FirebaseAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = main()
    print(f"\nExiting with code: {exit_code}")
    sys.exit(exit_code)