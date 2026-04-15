#!/usr/bin/env python3
"""
Backend API Testing for Salon Booking Platform - Iteration 2
Tests: Admin signup/login, Mock Razorpay payments, Booking cancel/reschedule, Payment plans
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import secrets

class SalonAPITester:
    def __init__(self, base_url="https://salon-book-107.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.booking_id = None
        self.customer_phone = "+919876543210"

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            if success:
                self.log_test(name, True)
                return True, response_data
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response_data}")
                return False, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login with existing credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@salon.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_admin_signup(self):
        """Test admin signup with new user"""
        test_email = f"test{secrets.token_hex(4)}@newsalon.com"
        success, response = self.run_test(
            "Admin Signup - New User",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Test Admin",
                "email": test_email,
                "password": "test123456",
                "business_name": "Test Salon"
            }
        )
        return success

    def test_duplicate_signup(self):
        """Test duplicate email registration should fail"""
        success, response = self.run_test(
            "Admin Signup - Duplicate Email (should fail)",
            "POST",
            "auth/register",
            400,  # Should fail with 400
            data={
                "name": "Duplicate Admin",
                "email": "admin@salon.com",  # Existing email
                "password": "test123456",
                "business_name": "Duplicate Salon"
            }
        )
        return success

    def test_payment_plans(self):
        """Test payment plans endpoint"""
        success, response = self.run_test(
            "Get Payment Plans",
            "GET",
            "payment-plans",
            200
        )
        if success and isinstance(response, list) and len(response) == 3:
            # Verify plan structure
            required_plans = ["free_trial", "starter", "dynamic"]
            plan_ids = [p.get("id") for p in response]
            if all(plan_id in plan_ids for plan_id in required_plans):
                self.log_test("Payment Plans - Structure Valid", True)
                return True
            else:
                self.log_test("Payment Plans - Structure Invalid", False, f"Missing plans: {set(required_plans) - set(plan_ids)}")
        return False

    def test_mock_payment_flow(self):
        """Test mock Razorpay payment flow"""
        # Test create order
        success1, order_response = self.run_test(
            "Mock Razorpay - Create Order",
            "POST",
            "payments/create-order",
            200,
            data={"booking_id": "test_booking", "amount": 1500}
        )
        
        if not success1:
            return False

        order_id = order_response.get("order_id")
        if not order_id:
            self.log_test("Mock Razorpay - Order ID Missing", False, "No order_id in response")
            return False

        # Test verify payment
        success2, verify_response = self.run_test(
            "Mock Razorpay - Verify Payment",
            "POST",
            f"payments/verify?order_id={order_id}&booking_id=test_booking",
            200
        )
        
        return success1 and success2

    def create_test_booking(self):
        """Create a test booking for cancel/reschedule tests"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        success, response = self.run_test(
            "Create Test Booking",
            "POST",
            "bookings",
            200,
            data={
                "location_id": "test_location",
                "services": [{"id": "test_service", "name": "Test Service", "price": 1000, "duration_minutes": 60}],
                "date": tomorrow,
                "time_slot": "10:00",
                "total_price": 1000,
                "total_duration": 60,
                "customer_info": {
                    "full_name": "Test Customer",
                    "phone": self.customer_phone,
                    "email": "test@customer.com",
                    "whatsapp": self.customer_phone,
                    "same_as_phone": True
                }
            }
        )
        
        if success and 'id' in response:
            self.booking_id = response['id']
            return True
        return False

    def test_customer_cancel_booking(self):
        """Test customer cancel booking with phone verification"""
        if not self.booking_id:
            self.log_test("Customer Cancel - No Booking ID", False, "Need booking ID first")
            return False

        success, response = self.run_test(
            "Customer Cancel Booking",
            "PUT",
            f"bookings/{self.booking_id}/cancel",
            200,
            data={"phone": self.customer_phone}
        )
        return success

    def test_customer_cancel_wrong_phone(self):
        """Test customer cancel with wrong phone should fail"""
        if not self.booking_id:
            return True  # Skip if no booking

        success, response = self.run_test(
            "Customer Cancel - Wrong Phone (should fail)",
            "PUT",
            f"bookings/{self.booking_id}/cancel",
            403,  # Should fail with 403
            data={"phone": "+919999999999"}  # Wrong phone
        )
        return success

    def test_customer_reschedule_booking(self):
        """Test customer reschedule booking"""
        # Create new booking for reschedule test
        if not self.create_test_booking():
            return False

        new_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        success, response = self.run_test(
            "Customer Reschedule Booking",
            "PUT",
            f"bookings/{self.booking_id}/reschedule",
            200,
            data={
                "phone": self.customer_phone,
                "new_date": new_date,
                "new_time_slot": "14:00"
            }
        )
        return success

    def test_admin_cancel_booking(self):
        """Test admin cancel booking (requires auth)"""
        # Create new booking for admin cancel test
        if not self.create_test_booking():
            return False

        success, response = self.run_test(
            "Admin Cancel Booking",
            "PUT",
            f"bookings/{self.booking_id}/admin-cancel",
            200
        )
        return success

    def test_admin_reschedule_booking(self):
        """Test admin reschedule booking (requires auth)"""
        # Create new booking for admin reschedule test
        if not self.create_test_booking():
            return False

        new_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        success, response = self.run_test(
            "Admin Reschedule Booking",
            "PUT",
            f"bookings/{self.booking_id}/admin-reschedule",
            200,
            data={
                "phone": self.customer_phone,
                "new_date": new_date,
                "new_time_slot": "16:00"
            }
        )
        return success

    def run_all_tests(self):
        """Run all backend tests"""
        print("🧪 Starting Salon Booking Platform Backend Tests - Iteration 2")
        print("=" * 60)

        # Test admin authentication
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False

        # Test new features
        self.test_admin_signup()
        self.test_duplicate_signup()
        self.test_payment_plans()
        self.test_mock_payment_flow()
        
        # Test booking management
        if self.create_test_booking():
            self.test_customer_cancel_wrong_phone()  # Test wrong phone first
            self.test_customer_cancel_booking()
            self.test_customer_reschedule_booking()
            self.test_admin_cancel_booking()
            self.test_admin_reschedule_booking()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed - check details above")
            return False

def main():
    tester = SalonAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())