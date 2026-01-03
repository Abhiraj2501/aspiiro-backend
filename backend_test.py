import requests
import sys
import json
from datetime import datetime

class AspiiroAPITester:
    def __init__(self, base_url="https://style-nexus-20.preview.emergentagent.com"):
        self.base_url = base_url
        self.user_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.last_order_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_user_auth_flow(self):
        """Test complete user authentication flow"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        
        # Test send OTP
        success, response = self.run_test(
            "Send OTP",
            "POST",
            "api/auth/send-otp",
            200,
            data={"email": test_email}
        )
        
        if not success:
            return False

        # Test verify OTP with test OTP
        success, response = self.run_test(
            "Verify OTP (Test)",
            "POST",
            "api/auth/verify-otp",
            200,
            data={"email": test_email, "otp": "123456"}
        )
        
        if success and 'token' in response:
            self.user_token = response['token']
            return True
        return False

    def test_admin_auth(self):
        """Test admin authentication"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/admin/login",
            200,
            data={"email": "admin@aspiiro.com", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_products_api(self):
        """Test products API endpoints"""
        # Test get all products
        success, response = self.run_test(
            "Get All Products",
            "GET",
            "api/products",
            200
        )
        
        if not success:
            return False

        # Test get products with filters
        self.run_test(
            "Get New Arrivals",
            "GET",
            "api/products?new_arrivals=true",
            200
        )
        
        self.run_test(
            "Get Sale Products",
            "GET",
            "api/products?on_sale=true",
            200
        )
        
        self.run_test(
            "Get Products by Category",
            "GET",
            "api/products?category=T-Shirts",
            200
        )
        
        return True

    def test_admin_product_management(self):
        """Test admin product management"""
        if not self.admin_token:
            self.log_test("Admin Product Management", False, "No admin token available")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test create product
        test_product = {
            "name": "Test Product",
            "description": "Test product description",
            "price": 999.99,
            "discount": 10,
            "category": "T-Shirts",
            "sizes": ["S", "M", "L"],
            "stock": 50,
            "images": ["https://via.placeholder.com/400"],
            "is_new_arrival": True,
            "is_on_sale": False
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "api/admin/products",
            200,
            data=test_product,
            headers=headers
        )
        
        if not success:
            return False

        product_id = response.get('product', {}).get('id')
        if not product_id:
            self.log_test("Get Product ID", False, "No product ID in response")
            return False

        # Test get single product
        self.run_test(
            "Get Single Product",
            "GET",
            f"api/products/{product_id}",
            200
        )
        
        # Test update product
        updated_product = test_product.copy()
        updated_product['name'] = "Updated Test Product"
        
        self.run_test(
            "Update Product",
            "PUT",
            f"api/admin/products/{product_id}",
            200,
            data=updated_product,
            headers=headers
        )
        
        # Test delete product
        self.run_test(
            "Delete Product",
            "DELETE",
            f"api/admin/products/{product_id}",
            200,
            headers=headers
        )
        
        return True

    def test_order_flow(self):
        """Test order creation and management"""
        if not self.user_token:
            self.log_test("Order Flow", False, "No user token available")
            return False

        headers = {'Authorization': f'Bearer {self.user_token}'}
        
        # Test create order
        test_order = {
            "items": [
                {
                    "product_id": "test-product-id",
                    "name": "Test Product",
                    "size": "M",
                    "quantity": 2,
                    "price": 999.99
                }
            ],
            "total": 1999.98,
            "address": {
                "fullName": "Test User",
                "phone": "9876543210",
                "addressLine1": "123 Test Street",
                "addressLine2": "Test Area",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            }
        }
        
        success, response = self.run_test(
            "Create Order",
            "POST",
            "api/orders",
            200,
            data=test_order,
            headers=headers
        )
        
        if not success:
            return False

        order_id = response.get('order', {}).get('id')
        if not order_id:
            self.log_test("Get Order ID", False, "No order ID in response")
            return False

        self.last_order_id = order_id  # store for payment tests

        # Test get user orders
        self.run_test(
            "Get User Orders",
            "GET",
            "api/orders",
            200,
            headers=headers
        )
        
        # Test get single order
        self.run_test(
            "Get Single Order",
            "GET",
            f"api/orders/{order_id}",
            200,
            headers=headers
        )
        
        return True

    def test_admin_order_management(self):
        """Test admin order management"""
        if not self.admin_token:
            self.log_test("Admin Order Management", False, "No admin token available")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test get all orders
        success, response = self.run_test(
            "Get All Orders (Admin)",
            "GET",
            "api/admin/orders",
            200,
            headers=headers
        )
        
        return success

    def test_payment_flow(self):
        """Test payment endpoints"""
        if not self.user_token:
            self.log_test("Payment Flow", False, "No user token available")
            return False

        headers = {'Authorization': f'Bearer {self.user_token}'}
        if not getattr(self, 'last_order_id', None):
            self.log_test("Payment Flow", False, "No order_id available from previous test")
            return False

        # Test create Razorpay order - include order_id to tie payment to internal order
        success, response = self.run_test(
            "Create Razorpay Order",
            "POST",
            "api/payment/create-order",
            200,
            data={"amount": 1999.98, "order_id": self.last_order_id},
            headers=headers
        )
        
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Aspiiro API Tests...")
        print("=" * 50)
        
        # Basic health check
        if not self.test_health_check():
            print("❌ Health check failed, stopping tests")
            return False

        # Authentication tests
        print("\n📧 Testing User Authentication...")
        user_auth_success = self.test_user_auth_flow()
        
        print("\n👨‍💼 Testing Admin Authentication...")
        admin_auth_success = self.test_admin_auth()
        
        # Product tests
        print("\n🛍️ Testing Products API...")
        self.test_products_api()
        
        if admin_auth_success:
            print("\n🔧 Testing Admin Product Management...")
            self.test_admin_product_management()
        
        # Order tests
        if user_auth_success:
            print("\n📦 Testing Order Flow...")
            self.test_order_flow()
            
            print("\n💳 Testing Payment Flow...")
            self.test_payment_flow()
        
        if admin_auth_success:
            print("\n📊 Testing Admin Order Management...")
            self.test_admin_order_management()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️ {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = AspiiroAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())