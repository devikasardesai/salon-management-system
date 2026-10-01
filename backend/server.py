from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import uuid
import secrets
import html
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Helpers ────────────────────────────────────────────────

def sanitize(val: str) -> str:
    """Sanitize user input to prevent XSS."""
    if not val:
        return val
    return html.escape(val.strip())

def validate_object_id(oid_str: str) -> ObjectId:
    """Validate and convert string to ObjectId, raise 400 on invalid."""
    try:
        return ObjectId(oid_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ID format")

def validate_phone(phone: str) -> bool:
    return bool(re.match(r'^\+91\d{10}$', phone))

def serialize_doc(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

def serialize_list(docs: List[dict]) -> List[dict]:
    return [serialize_doc(d) for d in docs]

async def find_booking_or_404(booking_id: str) -> dict:
    oid = validate_object_id(booking_id)
    booking = await db.bookings.find_one({"_id": oid})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

# ─── Models with Validation ─────────────────────────────────

class SettingsInput(BaseModel):
    business_name: Optional[str] = "LuxeSalon"
    business_email: Optional[str] = ""
    business_webpage: Optional[str] = ""
    theme: Optional[str] = "earthy-minimal"

    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v):
        allowed = {"earthy-minimal", "midnight-luxe", "soft-blush"}
        if v and v not in allowed:
            raise ValueError(f'Theme must be one of: {", ".join(allowed)}')
        return v

class ProfileInput(BaseModel):
    name: Optional[str] = ""
    email: Optional[str] = ""
    payment_plan: Optional[str] = "Free Trial"
    payment_details: Optional[str] = ""

class LocationInput(BaseModel):
    name: str
    address: str
    services: Optional[List[str]] = []
    employees: Optional[List[str]] = []

class AddOnInput(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float = 0
    duration_minutes: int = 0

class ServiceInput(BaseModel):
    name: str
    price: float
    duration_minutes: int
    category: Optional[str] = ""
    description: Optional[str] = ""
    add_ons: Optional[List[AddOnInput]] = []
    locations: Optional[List[str]] = []
    employees: Optional[List[str]] = []

class WorkingHoursInput(BaseModel):
    day: str
    start: str
    end: str
    is_off: bool = False

class EmployeeInput(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""
    expertise: Optional[List[str]] = []
    working_hours: Optional[List[WorkingHoursInput]] = []

class BookingCustomerInfo(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = ""
    whatsapp: str
    same_as_phone: bool = False

    @field_validator('phone', 'whatsapp')
    @classmethod
    def validate_phone(cls, v):
        if not re.match(r'^\+91\d{10}$', v):
            raise ValueError('Phone must be +91 followed by 10 digits')
        return v

class BookingInput(BaseModel):
    location_id: str
    services: List[dict]
    date: str
    time_slot: str
    total_price: float
    total_duration: int
    customer_info: BookingCustomerInfo
    payment_status: Optional[str] = "pending"

class RescheduleInput(BaseModel):
    phone: str
    new_date: str
    new_time_slot: str

class CancelInput(BaseModel):
    phone: str

class MockPaymentInput(BaseModel):
    booking_id: str
    amount: float

# ─── Settings (singleton document) ───────────────────────────

DEFAULT_SETTINGS = {
    "business_name": "LuxeSalon",
    "business_email": "",
    "business_webpage": "",
    "theme": "earthy-minimal",
}

@api_router.get("/settings")
async def get_settings() -> dict:
    s = await db.settings.find_one({}, {"_id": 0})
    if not s:
        s = dict(DEFAULT_SETTINGS)
    return s

@api_router.put("/settings")
async def update_settings(inp: SettingsInput) -> dict:
    data = {k: sanitize(v) if isinstance(v, str) else v for k, v in inp.model_dump().items()}
    await db.settings.update_one({}, {"$set": data}, upsert=True)
    return data

# ─── Profile (singleton document) ───────────────────────────

DEFAULT_PROFILE = {
    "name": "Admin",
    "email": "",
    "payment_plan": "Free Trial",
    "payment_details": "",
}

@api_router.get("/profile")
async def get_profile() -> dict:
    p = await db.profiles.find_one({}, {"_id": 0})
    if not p:
        p = dict(DEFAULT_PROFILE)
    return p

@api_router.put("/profile")
async def update_profile(inp: ProfileInput) -> dict:
    data = {k: sanitize(v) if isinstance(v, str) else v for k, v in inp.model_dump().items()}
    await db.profiles.update_one({}, {"$set": data}, upsert=True)
    return data

# ─── Locations ──────────────────────────────────────────────

@api_router.get("/locations")
async def get_locations() -> List[dict]:
    locs = await db.locations.find({}).to_list(1000)
    return serialize_list(locs)

@api_router.post("/locations")
async def create_location(inp: LocationInput) -> dict:
    data = {k: sanitize(v) if isinstance(v, str) else v for k, v in inp.model_dump().items()}
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.locations.insert_one(data)
    data["id"] = str(result.inserted_id)
    data.pop("_id", None)
    return data

@api_router.put("/locations/{location_id}")
async def update_location(location_id: str, inp: LocationInput) -> dict:
    oid = validate_object_id(location_id)
    existing = await db.locations.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Location not found")
    data = {k: sanitize(v) if isinstance(v, str) else v for k, v in inp.model_dump().items()}
    await db.locations.update_one({"_id": oid}, {"$set": data})
    data["id"] = location_id
    return data

@api_router.delete("/locations/{location_id}")
async def delete_location(location_id: str) -> dict:
    oid = validate_object_id(location_id)
    result = await db.locations.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Deleted"}

# ─── Services ───────────────────────────────────────────────

@api_router.get("/services")
async def get_services() -> List[dict]:
    svcs = await db.services.find({}).to_list(1000)
    return serialize_list(svcs)

@api_router.post("/services")
async def create_service(inp: ServiceInput) -> dict:
    data = inp.model_dump()
    for ao in data.get("add_ons", []):
        if not ao.get("id"):
            ao["id"] = str(uuid.uuid4())
        ao["name"] = sanitize(ao.get("name", ""))
    data["name"] = sanitize(data["name"])
    data["description"] = sanitize(data.get("description", ""))
    data["category"] = sanitize(data.get("category", ""))
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.services.insert_one(data)
    data["id"] = str(result.inserted_id)
    data.pop("_id", None)
    return data

@api_router.put("/services/{service_id}")
async def update_service(service_id: str, inp: ServiceInput) -> dict:
    oid = validate_object_id(service_id)
    existing = await db.services.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    data = inp.model_dump()
    for ao in data.get("add_ons", []):
        if not ao.get("id"):
            ao["id"] = str(uuid.uuid4())
    await db.services.update_one({"_id": oid}, {"$set": data})
    data["id"] = service_id
    return data

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str) -> dict:
    oid = validate_object_id(service_id)
    result = await db.services.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Deleted"}

# ─── Employees ──────────────────────────────────────────────

@api_router.get("/employees")
async def get_employees() -> List[dict]:
    emps = await db.employees.find({}).to_list(1000)
    return serialize_list(emps)

@api_router.post("/employees")
async def create_employee(inp: EmployeeInput) -> dict:
    data = inp.model_dump()
    data["name"] = sanitize(data["name"])
    data["email"] = sanitize(data.get("email", ""))
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.employees.insert_one(data)
    data["id"] = str(result.inserted_id)
    data.pop("_id", None)
    return data

@api_router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, inp: EmployeeInput) -> dict:
    oid = validate_object_id(employee_id)
    existing = await db.employees.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    data = inp.model_dump()
    await db.employees.update_one({"_id": oid}, {"$set": data})
    data["id"] = employee_id
    return data

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str) -> dict:
    oid = validate_object_id(employee_id)
    result = await db.employees.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Deleted"}

# ─── Bookings ───────────────────────────────────────────────

@api_router.get("/bookings")
async def get_bookings(location_id: Optional[str] = None) -> List[dict]:
    query = {}
    if location_id:
        query["location_id"] = location_id
    bks = await db.bookings.find(query).sort("created_at", -1).to_list(1000)
    return serialize_list(bks)

@api_router.post("/bookings")
async def create_booking(inp: BookingInput) -> dict:
    data = inp.model_dump()
    validate_object_id(data["location_id"])
    data["status"] = "confirmed"
    data["payment_status"] = "completed"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["manage_token"] = secrets.token_urlsafe(16)
    # Sanitize customer info
    cust = data["customer_info"]
    cust["full_name"] = sanitize(cust["full_name"])
    cust["email"] = sanitize(cust.get("email", ""))
    # Save/update customer
    existing = await db.customers.find_one({"phone": cust["phone"]})
    if existing:
        await db.customers.update_one({"phone": cust["phone"]}, {"$set": {
            "full_name": cust["full_name"],
            "email": cust.get("email", ""),
            "whatsapp": cust["whatsapp"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }})
        data["customer_id"] = str(existing["_id"])
    else:
        cust_doc = {
            "full_name": cust["full_name"],
            "phone": cust["phone"],
            "email": cust.get("email", ""),
            "whatsapp": cust["whatsapp"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        r = await db.customers.insert_one(cust_doc)
        data["customer_id"] = str(r.inserted_id)
    logger.info(f"[MOCK WhatsApp] Booking confirmation sent to {cust['whatsapp']}")
    data["notifications"] = [
        {"type": "confirmation", "status": "sent", "message": f"Booking confirmed for {data['date']} at {data['time_slot']}"},
        {"type": "reminder_1hr", "status": "scheduled", "message": "Reminder: Your appointment is in 1 hour"},
        {"type": "reminder_30min", "status": "scheduled", "message": "Reminder: Your appointment is in 30 minutes"}
    ]
    result = await db.bookings.insert_one(data)
    data["id"] = str(result.inserted_id)
    data.pop("_id", None)
    return data

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str) -> dict:
    booking = await find_booking_or_404(booking_id)
    # Strip sensitive fields for public access
    safe = {
        "id": str(booking["_id"]),
        "date": booking.get("date"),
        "time_slot": booking.get("time_slot"),
        "status": booking.get("status"),
        "total_price": booking.get("total_price"),
        "total_duration": booking.get("total_duration"),
        "services": booking.get("services"),
        "location_id": booking.get("location_id"),
        "notifications": booking.get("notifications"),
        "payment_status": booking.get("payment_status"),
        "previous_date": booking.get("previous_date"),
        "previous_time": booking.get("previous_time"),
        "customer_info": {
            "full_name": booking.get("customer_info", {}).get("full_name", ""),
            "phone": booking.get("customer_info", {}).get("phone", ""),
        }
    }
    return safe

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, inp: CancelInput) -> dict:
    booking = await find_booking_or_404(booking_id)
    if booking.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Booking already cancelled")
    if booking.get("customer_info", {}).get("phone") != inp.phone:
        raise HTTPException(status_code=403, detail="Phone number does not match booking")
    await db.bookings.update_one({"_id": validate_object_id(booking_id)}, {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}})
    logger.info(f"[MOCK WhatsApp] Cancellation notice sent to {booking.get('customer_info', {}).get('whatsapp', 'N/A')}")
    return {"message": "Booking cancelled", "status": "cancelled"}

@api_router.put("/bookings/{booking_id}/reschedule")
async def reschedule_booking(booking_id: str, inp: RescheduleInput) -> dict:
    booking = await find_booking_or_404(booking_id)
    if booking.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot reschedule cancelled booking")
    if booking.get("customer_info", {}).get("phone") != inp.phone:
        raise HTTPException(status_code=403, detail="Phone number does not match booking")
    old_date, old_time = booking.get("date", ""), booking.get("time_slot", "")
    await db.bookings.update_one({"_id": validate_object_id(booking_id)}, {"$set": {
        "date": inp.new_date, "time_slot": inp.new_time_slot, "status": "rescheduled",
        "rescheduled_at": datetime.now(timezone.utc).isoformat(),
        "previous_date": old_date, "previous_time": old_time
    }})
    return {"message": "Booking rescheduled", "new_date": inp.new_date, "new_time_slot": inp.new_time_slot}

@api_router.put("/bookings/{booking_id}/admin-cancel")
async def admin_cancel_booking(booking_id: str) -> dict:
    oid = validate_object_id(booking_id)
    booking = await db.bookings.find_one({"_id": oid})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"_id": oid}, {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat(), "cancelled_by": "admin"}})
    return {"message": "Booking cancelled by admin"}

@api_router.put("/bookings/{booking_id}/admin-reschedule")
async def admin_reschedule_booking(booking_id: str, inp: RescheduleInput) -> dict:
    oid = validate_object_id(booking_id)
    booking = await db.bookings.find_one({"_id": oid})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    old_date, old_time = booking.get("date", ""), booking.get("time_slot", "")
    await db.bookings.update_one({"_id": oid}, {"$set": {
        "date": inp.new_date, "time_slot": inp.new_time_slot, "status": "rescheduled",
        "rescheduled_at": datetime.now(timezone.utc).isoformat(),
        "previous_date": old_date, "previous_time": old_time
    }})
    return {"message": "Booking rescheduled by admin"}

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str) -> dict:
    oid = validate_object_id(booking_id)
    result = await db.bookings.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Deleted"}

# ─── Customers ──────────────────────────────────────────────

@api_router.get("/customers")
async def get_customers() -> List[dict]:
    custs = await db.customers.find({}).sort("created_at", -1).to_list(1000)
    return serialize_list(custs)

# ─── Time Slots ─────────────────────────────────────────────

@api_router.get("/timeslots")
async def get_timeslots(location_id: str, date: str, duration: int) -> List[str]:
    validate_object_id(location_id)
    slots: List[str] = []
    start_hour, end_hour = 9, 18
    current = start_hour * 60
    end = end_hour * 60
    existing = await db.bookings.find(
        {"location_id": location_id, "date": date, "status": {"$ne": "cancelled"}},
        {"time_slot": 1, "total_duration": 1}
    ).to_list(1000)
    booked_ranges = []
    for b in existing:
        ts = b.get("time_slot", "")
        td = b.get("total_duration", 60)
        if ts:
            parts = ts.split(":")
            if len(parts) == 2:
                bstart = int(parts[0]) * 60 + int(parts[1])
                booked_ranges.append((bstart, bstart + td))
    while current + duration <= end:
        conflict = any(not (current + duration <= bs or current >= be) for bs, be in booked_ranges)
        if not conflict:
            slots.append(f"{current // 60:02d}:{current % 60:02d}")
        current += 30
    return slots

# ─── Mock Razorpay Payment ──────────────────────────────────

@api_router.post("/payments/create-order")
async def create_payment_order(inp: MockPaymentInput) -> dict:
    order_id = f"order_mock_{secrets.token_hex(8)}"
    logger.info(f"[MOCK Razorpay] Order created: {order_id}")
    return {"order_id": order_id, "amount": inp.amount, "currency": "INR", "status": "created", "provider": "razorpay_mock"}

@api_router.post("/payments/verify")
async def verify_payment(order_id: str, booking_id: str) -> dict:
    payment_id = f"pay_mock_{secrets.token_hex(8)}"
    oid = validate_object_id(booking_id)
    await db.bookings.update_one({"_id": oid}, {"$set": {"payment_status": "completed", "payment_id": payment_id, "payment_order_id": order_id}})
    return {"payment_id": payment_id, "order_id": order_id, "status": "completed", "provider": "razorpay_mock"}

# ─── Payment Plans ──────────────────────────────────────────

@api_router.get("/payment-plans")
async def get_payment_plans() -> List[dict]:
    return [
        {"id": "free_trial", "name": "Free Trial", "duration": "1 month", "price_per_location": 0,
         "description": "Free for all locations for 1 month",
         "features": ["Unlimited locations", "All features included", "WhatsApp notifications", "Customer database"]},
        {"id": "starter", "name": "Starter", "duration": "2 months", "price_per_location": 1000,
         "description": "\u20b91,000 per location per month",
         "features": ["Per-location pricing", "All features included", "WhatsApp notifications", "Priority support"]},
        {"id": "dynamic", "name": "Custom", "duration": "Ongoing", "price_per_location": None,
         "description": "Dynamic pricing based on features",
         "features": ["Custom pricing", "Feature-based billing", "Dedicated support", "Custom integrations"]},
    ]

# ─── Seed Data ──────────────────────────────────────────────

async def seed_settings() -> None:
    if not await db.settings.find_one({}):
        await db.settings.insert_one({
            "business_name": "LuxeSalon",
            "business_email": "contact@luxesalon.com", "business_webpage": "https://luxesalon.com", "theme": "earthy-minimal"
        })

async def seed_locations_and_data() -> None:
    loc_count = await db.locations.count_documents({})
    if loc_count > 0:
        return

    def make_hours(start, end, off_days):
        return [{"day": d, "start": start if d not in off_days else "00:00", "end": end if d not in off_days else "00:00", "is_off": d in off_days}
                for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]]

    loc1 = await db.locations.insert_one({"name": "Downtown Studio", "address": "42, MG Road, Connaught Place, New Delhi - 110001", "services": [], "employees": [], "created_at": datetime.now(timezone.utc).isoformat()})
    loc2 = await db.locations.insert_one({"name": "Bandra West", "address": "15, Hill Road, Bandra West, Mumbai - 400050", "services": [], "employees": [], "created_at": datetime.now(timezone.utc).isoformat()})
    l1, l2 = str(loc1.inserted_id), str(loc2.inserted_id)

    emp1 = await db.employees.insert_one({"name": "Priya Sharma", "email": "priya@luxesalon.com", "phone": "+919876543210", "location": l1, "expertise": ["Hair Styling", "Hair Color"], "working_hours": make_hours("09:00", "18:00", ["Sunday"]), "created_at": datetime.now(timezone.utc).isoformat()})
    emp2 = await db.employees.insert_one({"name": "Rahul Verma", "email": "rahul@luxesalon.com", "phone": "+919876543211", "location": l2, "expertise": ["Facial", "Spa Treatment"], "working_hours": make_hours("10:00", "19:00", ["Sunday"]), "created_at": datetime.now(timezone.utc).isoformat()})
    emp3 = await db.employees.insert_one({"name": "Anita Desai", "email": "anita@luxesalon.com", "phone": "+919876543212", "location": l1, "expertise": ["Manicure", "Pedicure", "Nail Art"], "working_hours": make_hours("09:00", "17:00", ["Saturday", "Sunday"]), "created_at": datetime.now(timezone.utc).isoformat()})
    e1, e2, e3 = str(emp1.inserted_id), str(emp2.inserted_id), str(emp3.inserted_id)

    await db.locations.update_one({"_id": loc1.inserted_id}, {"$set": {"employees": [e1, e3]}})
    await db.locations.update_one({"_id": loc2.inserted_id}, {"$set": {"employees": [e2]}})

    services_data = [
        {"name": "Haircut & Styling", "price": 800, "duration_minutes": 45, "category": "Hair", "description": "Professional haircut with wash and styling",
         "add_ons": [{"id": str(uuid.uuid4()), "name": "Deep Conditioning", "price": 400, "duration_minutes": 20}, {"id": str(uuid.uuid4()), "name": "Hair Spa", "price": 600, "duration_minutes": 30}],
         "locations": [l1, l2], "employees": [e1]},
        {"name": "Hair Coloring", "price": 2500, "duration_minutes": 90, "category": "Hair", "description": "Full hair coloring with premium products",
         "add_ons": [{"id": str(uuid.uuid4()), "name": "Highlights", "price": 1500, "duration_minutes": 45}, {"id": str(uuid.uuid4()), "name": "Root Touch-up", "price": 800, "duration_minutes": 30}],
         "locations": [l1, l2], "employees": [e1]},
        {"name": "Classic Facial", "price": 1200, "duration_minutes": 60, "category": "Skin", "description": "Deep cleansing facial with extraction and mask",
         "add_ons": [{"id": str(uuid.uuid4()), "name": "LED Therapy", "price": 500, "duration_minutes": 15}, {"id": str(uuid.uuid4()), "name": "Under-eye Treatment", "price": 300, "duration_minutes": 10}],
         "locations": [l1, l2], "employees": [e2]},
        {"name": "Manicure", "price": 600, "duration_minutes": 30, "category": "Nails", "description": "Classic manicure with nail shaping and polish",
         "add_ons": [{"id": str(uuid.uuid4()), "name": "Gel Polish", "price": 400, "duration_minutes": 15}, {"id": str(uuid.uuid4()), "name": "Nail Art (per nail)", "price": 100, "duration_minutes": 5}],
         "locations": [l1], "employees": [e3]},
        {"name": "Pedicure", "price": 700, "duration_minutes": 40, "category": "Nails", "description": "Relaxing pedicure with foot massage",
         "add_ons": [{"id": str(uuid.uuid4()), "name": "Gel Polish", "price": 400, "duration_minutes": 15}, {"id": str(uuid.uuid4()), "name": "Paraffin Wax", "price": 300, "duration_minutes": 10}],
         "locations": [l1], "employees": [e3]},
    ]
    svc_ids = []
    for svc in services_data:
        svc["created_at"] = datetime.now(timezone.utc).isoformat()
        r = await db.services.insert_one(svc)
        svc_ids.append(str(r.inserted_id))

    await db.locations.update_one({"_id": loc1.inserted_id}, {"$set": {"services": svc_ids}})
    await db.locations.update_one({"_id": loc2.inserted_id}, {"$set": {"services": svc_ids[:3]}})

async def seed_data() -> None:
    await seed_settings()
    await seed_locations_and_data()

@app.on_event("startup")
async def startup():
    await seed_data()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.environ.get("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
    ] + [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip() and o.strip() != "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
