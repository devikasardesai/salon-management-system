import requests
import sys
import json
from datetime import datetime, timedelta

class SalonAPITester:
    def __init__(self, base_url="https://salon-book-107.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.cookies = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add auth if required
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, cookies=self.cookies)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, cookies=self.cookies)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, cookies=self.cookies)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, cookies=self.cookies)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@salon.com", "password": "admin123"},
            auth_required=False
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_settings_get(self):
        """Test get settings"""
        success, response = self.run_test(
            "Get Settings",
            "GET",
            "settings",
            200,
            auth_required=False
        )
        if success:
            print(f"   Settings: {response}")
        return success, response

    def test_settings_update(self):
        """Test update settings"""
        success, response = self.run_test(
            "Update Settings",
            "PUT",
            "settings",
            200,
            data={
                "business_name": "Test Salon",
                "business_email": "test@salon.com",
                "business_webpage": "https://testsalon.com",
                "theme": "modern-dark"
            }
        )
        return success

    def test_profile_get(self):
        """Test get profile"""
        success, response = self.run_test(
            "Get Profile",
            "GET",
            "profile",
            200
        )
        return success

    def test_profile_update(self):
        """Test update profile"""
        success, response = self.run_test(
            "Update Profile",
            "PUT",
            "profile",
            200,
            data={
                "name": "Test Admin",
                "email": "admin@salon.com",
                "payment_plan": "Premium",
                "payment_details": "Test payment details"
            }
        )
        return success

    def test_locations_crud(self):
        """Test locations CRUD operations"""
        # Get locations
        success, locations = self.run_test(
            "Get Locations",
            "GET",
            "locations",
            200,
            auth_required=False
        )
        if not success:
            return False
        
        print(f"   Found {len(locations)} locations")
        
        # Create location
        success, new_location = self.run_test(
            "Create Location",
            "POST",
            "locations",
            200,
            data={
                "name": "Test Location",
                "address": "123 Test Street, Test City",
                "services": [],
                "employees": []
            }
        )
        if not success:
            return False
        
        location_id = new_location.get('id')
        if not location_id:
            print("❌ No location ID returned")
            return False
        
        # Update location
        success, updated = self.run_test(
            "Update Location",
            "PUT",
            f"locations/{location_id}",
            200,
            data={
                "name": "Updated Test Location",
                "address": "456 Updated Street, Test City",
                "services": [],
                "employees": []
            }
        )
        if not success:
            return False
        
        # Delete location
        success, _ = self.run_test(
            "Delete Location",
            "DELETE",
            f"locations/{location_id}",
            200
        )
        return success

    def test_services_crud(self):
        """Test services CRUD operations"""
        # Get services
        success, services = self.run_test(
            "Get Services",
            "GET",
            "services",
            200,
            auth_required=False
        )
        if not success:
            return False
        
        print(f"   Found {len(services)} services")
        
        # Create service
        success, new_service = self.run_test(
            "Create Service",
            "POST",
            "services",
            200,
            data={
                "name": "Test Service",
                "price": 1000,
                "duration_minutes": 60,
                "category": "Test",
                "description": "Test service description",
                "add_ons": [
                    {"name": "Test Add-on", "price": 200, "duration_minutes": 15}
                ],
                "locations": [],
                "employees": []
            }
        )
        if not success:
            return False
        
        service_id = new_service.get('id')
        if not service_id:
            print("❌ No service ID returned")
            return False
        
        # Update service
        success, updated = self.run_test(
            "Update Service",
            "PUT",
            f"services/{service_id}",
            200,
            data={
                "name": "Updated Test Service",
                "price": 1200,
                "duration_minutes": 75,
                "category": "Updated Test",
                "description": "Updated test service description",
                "add_ons": [],
                "locations": [],
                "employees": []
            }
        )
        if not success:
            return False
        
        # Delete service
        success, _ = self.run_test(
            "Delete Service",
            "DELETE",
            f"services/{service_id}",
            200
        )
        return success

    def test_employees_crud(self):
        """Test employees CRUD operations"""
        # Get employees
        success, employees = self.run_test(
            "Get Employees",
            "GET",
            "employees",
            200,
            auth_required=False
        )
        if not success:
            return False
        
        print(f"   Found {len(employees)} employees")
        
        # Create employee
        success, new_employee = self.run_test(
            "Create Employee",
            "POST",
            "employees",
            200,
            data={
                "name": "Test Employee",
                "email": "test@salon.com",
                "phone": "+919876543213",
                "location": "",
                "expertise": ["Test Service"],
                "working_hours": [
                    {"day": "Monday", "start": "09:00", "end": "17:00", "is_off": False},
                    {"day": "Tuesday", "start": "09:00", "end": "17:00", "is_off": False},
                    {"day": "Wednesday", "start": "09:00", "end": "17:00", "is_off": False},
                    {"day": "Thursday", "start": "09:00", "end": "17:00", "is_off": False},
                    {"day": "Friday", "start": "09:00", "end": "17:00", "is_off": False},
                    {"day": "Saturday", "start": "00:00", "end": "00:00", "is_off": True},
                    {"day": "Sunday", "start": "00:00", "end": "00:00", "is_off": True}
                ]
            }
        )
        if not success:
            return False
        
        employee_id = new_employee.get('id')
        if not employee_id:
            print("❌ No employee ID returned")
            return False
        
        # Update employee
        success, updated = self.run_test(
            "Update Employee",
            "PUT",
            f"employees/{employee_id}",
            200,
            data={
                "name": "Updated Test Employee",
                "email": "updated@salon.com",
                "phone": "+919876543214",
                "location": "",
                "expertise": ["Updated Test Service"],
                "working_hours": [
                    {"day": "Monday", "start": "10:00", "end": "18:00", "is_off": False},
                    {"day": "Tuesday", "start": "10:00", "end": "18:00", "is_off": False},
                    {"day": "Wednesday", "start": "10:00", "end": "18:00", "is_off": False},
                    {"day": "Thursday", "start": "10:00", "end": "18:00", "is_off": False},
                    {"day": "Friday", "start": "10:00", "end": "18:00", "is_off": False},
                    {"day": "Saturday", "start": "00:00", "end": "00:00", "is_off": True},
                    {"day": "Sunday", "start": "00:00", "end": "00:00", "is_off": True}
                ]
            }
        )
        if not success:
            return False
        
        # Delete employee
        success, _ = self.run_test(
            "Delete Employee",
            "DELETE",
            f"employees/{employee_id}",
            200
        )
        return success

    def test_bookings_flow(self):
        """Test booking creation and retrieval"""
        # Get locations first
        success, locations = self.run_test(
            "Get Locations for Booking",
            "GET",
            "locations",
            200,
            auth_required=False
        )
        if not success or not locations:
            print("❌ No locations available for booking test")
            return False
        
        location_id = locations[0]['id']
        
        # Get services
        success, services = self.run_test(
            "Get Services for Booking",
            "GET",
            "services",
            200,
            auth_required=False
        )
        if not success or not services:
            print("❌ No services available for booking test")
            return False
        
        service = services[0]
        
        # Get timeslots
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        success, timeslots = self.run_test(
            "Get Timeslots",
            "GET",
            f"timeslots?location_id={location_id}&date={tomorrow}&duration={service['duration_minutes']}",
            200,
            auth_required=False
        )
        if not success:
            return False
        
        print(f"   Available timeslots: {len(timeslots)}")
        
        if not timeslots:
            print("❌ No timeslots available")
            return False
        
        # Create booking
        success, booking = self.run_test(
            "Create Booking",
            "POST",
            "bookings",
            200,
            data={
                "location_id": location_id,
                "services": [{"id": service['id'], "name": service['name'], "price": service['price'], "duration_minutes": service['duration_minutes'], "add_ons": []}],
                "date": tomorrow,
                "time_slot": timeslots[0],
                "total_price": service['price'],
                "total_duration": service['duration_minutes'],
                "customer_info": {
                    "full_name": "Test Customer",
                    "phone": "+919876543215",
                    "email": "test@customer.com",
                    "whatsapp": "+919876543215",
                    "same_as_phone": True
                }
            },
            auth_required=False
        )
        if not success:
            return False
        
        booking_id = booking.get('id')
        print(f"   Booking created with ID: {booking_id}")
        
        # Get bookings
        success, bookings = self.run_test(
            "Get Bookings",
            "GET",
            "bookings",
            200,
            auth_required=False
        )
        if not success:
            return False
        
        print(f"   Found {len(bookings)} bookings")
        
        # Get bookings with location filter
        success, filtered_bookings = self.run_test(
            "Get Bookings with Location Filter",
            "GET",
            f"bookings?location_id={location_id}",
            200,
            auth_required=False
        )
        if not success:
            return False
        
        print(f"   Found {len(filtered_bookings)} bookings for location")
        
        return True

    def test_customers(self):
        """Test customers endpoint"""
        success, customers = self.run_test(
            "Get Customers",
            "GET",
            "customers",
            200
        )
        if success:
            print(f"   Found {len(customers)} customers")
        return success

    def test_logout(self):
        """Test logout"""
        success, _ = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        if success:
            self.token = None
        return success

def main():
    print("🚀 Starting Salon API Testing...")
    tester = SalonAPITester()
    
    # Test sequence
    tests = [
        ("Admin Login", tester.test_login),
        ("Auth Me", tester.test_auth_me),
        ("Get Settings", tester.test_settings_get),
        ("Update Settings", tester.test_settings_update),
        ("Get Profile", tester.test_profile_get),
        ("Update Profile", tester.test_profile_update),
        ("Locations CRUD", tester.test_locations_crud),
        ("Services CRUD", tester.test_services_crud),
        ("Employees CRUD", tester.test_employees_crud),
        ("Bookings Flow", tester.test_bookings_flow),
        ("Get Customers", tester.test_customers),
        ("Logout", tester.test_logout)
    ]
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print('='*50)
        
        try:
            result = test_func()
            if not result:
                print(f"❌ {test_name} failed")
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            tester.failed_tests.append({
                "test": test_name,
                "error": str(e)
            })
    
    # Print summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print('='*60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS:")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"{i}. {failure.get('test', 'Unknown')}")
            if 'error' in failure:
                print(f"   Error: {failure['error']}")
            elif 'expected' in failure:
                print(f"   Expected: {failure['expected']}, Got: {failure['actual']}")
                print(f"   Response: {failure.get('response', 'N/A')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())