from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import bcrypt
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Helpers ────────────────────────────────────────────────

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def oid(val):
    return str(val) if not isinstance(val, str) else val

def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

def serialize_list(docs):
    return [serialize_doc(d) for d in docs]

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Models ─────────────────────────────────────────────────

class LoginInput(BaseModel):
    email: str
    password: str

class RegisterInput(BaseModel):
    name: str
    email: str
    password: str
    business_name: Optional[str] = "My Salon"

class SettingsInput(BaseModel):
    business_name: Optional[str] = "LuxeSalon"
    business_email: Optional[str] = ""
    business_webpage: Optional[str] = ""
    theme: Optional[str] = "earthy-minimal"

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

# ─── Auth ───────────────────────────────────────────────────

@api_router.post("/auth/login")
async def login(input: LoginInput, response: Response):
    email = input.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": uid, "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "admin"), "token": access}

@api_router.post("/auth/register")
async def register(input: RegisterInput, response: Response):
    email = input.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(input.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user_doc = {
        "email": email,
        "password_hash": hash_password(input.password),
        "name": input.name.strip(),
        "role": "admin",
        "payment_plan": "free_trial",
        "plan_start_date": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    uid = str(result.inserted_id)
    # Create default settings for this user
    await db.settings.update_one({}, {"$setOnInsert": {
        "business_name": input.business_name or "My Salon",
        "business_email": email,
        "business_webpage": "",
        "theme": "earthy-minimal"
    }}, upsert=True)
    # Create default profile
    await db.profiles.insert_one({
        "user_id": uid,
        "name": input.name.strip(),
        "email": email,
        "payment_plan": "Free Trial (1 month)",
        "payment_details": ""
    })
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    logger.info(f"New user registered: {email}")
    return {"id": uid, "email": email, "name": input.name.strip(), "role": "admin", "token": access}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"id": user["_id"], "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "admin")}

# ─── Settings ───────────────────────────────────────────────

@api_router.get("/settings")
async def get_settings():
    s = await db.settings.find_one({}, {"_id": 0})
    if not s:
        s = {"business_name": "LuxeSalon", "business_email": "", "business_webpage": "", "theme": "earthy-minimal"}
    return s

@api_router.put("/settings")
async def update_settings(inp: SettingsInput, user=Depends(get_current_user)):
    data = inp.model_dump()
    await db.settings.update_one({}, {"$set": data}, upsert=True)
    return data

# ─── Profile ────────────────────────────────────────────────

@api_router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    p = await db.profiles.find_one({"user_id": user["_id"]}, {"_id": 0})
    if not p:
        p = {"user_id": user["_id"], "name": user.get("name", ""), "email": user.get("email", ""), "payment_plan": "Free", "payment_details": ""}
    return p

@api_router.put("/profile")
async def update_profile(inp: ProfileInput, user=Depends(get_current_user)):
    data = inp.model_dump()
    data["user_id"] = user["_id"]
    await db.profiles.update_one({"user_id": user["_id"]}, {"$set": data}, upsert=True)
    return data

# ─── Locations ──────────────────────────────────────────────

@api_router.get("/locations")
async def get_locations():
    locs = await db.locations.find({}).to_list(1000)
    return serialize_list(locs)

@api_router.post("/locations")
async def create_location(inp: LocationInput, user=Depends(get_current_user)):
    data = inp.model_dump()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.locations.insert_one(data)
    data["id"] = str(result.inserted_id)
    data.pop("_id", None)
    return data

@api_router.put("/locations/{location_id}")
async def update_location(location_id: str, inp: LocationInput, user=Depends(get_current_user)):
    data = inp.model_dump()
    await db.locations.update_one({"_id": ObjectId(location_id)}, {"$set": data})
    data["id"] = location_id
    return data

@api_router.delete("/locations/{location_id}")
async def delete_location(location_id: str, user=Depends(get_current_user)):
    await db.locations.delete_one({"_id": ObjectId(location_id)})
    return {"message": "Deleted"}

# ─── Services ───────────────────────────────────────────────

@api_router.get("/services")
async def get_services():
    svcs = await db.services.find({}).to_list(1000)
    return serialize_list(svcs)

@api_router.post("/services")
async def create_service(inp: ServiceInput, user=Depends(get_current_user)):
    data = inp.model_dump()
    for ao in data.get("add_ons", []):
        if not ao.get("id"):
            ao["id"] = str(uuid.uuid4())
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.services.insert_one(data)
    data["id"] = str(result.inserted_id)
    data.pop("_id", None)
    return data

@api_router.put("/services/{service_id}")
async def update_service(service_id: str, inp: ServiceInput, user=Depends(get_current_user)):
    data = inp.model_dump()
    for ao in data.get("add_ons", []):
        if not ao.get("id"):
            ao["id"] = str(uuid.uuid4())
    await db.services.update_one({"_id": ObjectId(service_id)}, {"$set": data})
    data["id"] = service_id
    return data

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, user=Depends(get_current_user)):
    await db.services.delete_one({"_id": ObjectId(service_id)})
    return {"message": "Deleted"}

# ─── Employees ──────────────────────────────────────────────

@api_router.get("/employees")
async def get_employees():
    emps = await db.employees.find({}).to_list(1000)
    return serialize_list(emps)

@api_router.post("/employees")
async def create_employee(inp: EmployeeInput, user=Depends(get_current_user)):
    data = inp.model_dump()
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.employees.insert_one(data)
    data["id"] = str(result.inserted_id)
    data.pop("_id", None)
    return data

@api_router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, inp: EmployeeInput, user=Depends(get_current_user)):
    data = inp.model_dump()
    await db.employees.update_one({"_id": ObjectId(employee_id)}, {"$set": data})
    data["id"] = employee_id
    return data

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, user=Depends(get_current_user)):
    await db.employees.delete_one({"_id": ObjectId(employee_id)})
    return {"message": "Deleted"}

# ─── Bookings ───────────────────────────────────────────────

@api_router.get("/bookings")
async def get_bookings(location_id: Optional[str] = None):
    query = {}
    if location_id:
        query["location_id"] = location_id
    bks = await db.bookings.find(query).sort("created_at", -1).to_list(1000)
    return serialize_list(bks)

@api_router.post("/bookings")
async def create_booking(inp: BookingInput):
    data = inp.model_dump()
    data["status"] = "confirmed"
    data["payment_status"] = "completed"  # Mock: always completed
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["manage_token"] = secrets.token_urlsafe(16)
    # Save/update customer
    cust = data["customer_info"]
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
    # Mock WhatsApp messages
    logger.info(f"[MOCK WhatsApp] Booking confirmation sent to {cust['whatsapp']}: Booking confirmed for {data['date']} at {data['time_slot']}")
    logger.info(f"[MOCK WhatsApp] Reminder scheduled: 1hr before appointment on {data['date']} {data['time_slot']}")
    logger.info(f"[MOCK WhatsApp] Reminder scheduled: 30min before appointment on {data['date']} {data['time_slot']}")
    # Store mock notification records
    data["notifications"] = [
        {"type": "confirmation", "status": "sent", "message": f"Booking confirmed for {data['date']} at {data['time_slot']}"},
        {"type": "reminder_1hr", "status": "scheduled", "message": f"Reminder: Your appointment is in 1 hour"},
        {"type": "reminder_30min", "status": "scheduled", "message": f"Reminder: Your appointment is in 30 minutes"}
    ]
    result = await db.bookings.insert_one(data)
    data["id"] = str(result.inserted_id)
    data.pop("_id", None)
    return data

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return serialize_doc(booking)

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, inp: CancelInput = None, user=None):
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Booking already cancelled")
    # Verify phone for customer self-service
    if inp and inp.phone:
        if booking.get("customer_info", {}).get("phone") != inp.phone:
            raise HTTPException(status_code=403, detail="Phone number does not match booking")
    await db.bookings.update_one({"_id": ObjectId(booking_id)}, {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}})
    logger.info(f"[MOCK WhatsApp] Cancellation notice sent to {booking.get('customer_info', {}).get('whatsapp', 'N/A')}")
    return {"message": "Booking cancelled", "status": "cancelled"}

@api_router.put("/bookings/{booking_id}/reschedule")
async def reschedule_booking(booking_id: str, inp: RescheduleInput):
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot reschedule cancelled booking")
    # Verify phone
    if booking.get("customer_info", {}).get("phone") != inp.phone:
        raise HTTPException(status_code=403, detail="Phone number does not match booking")
    old_date = booking.get("date", "")
    old_time = booking.get("time_slot", "")
    await db.bookings.update_one({"_id": ObjectId(booking_id)}, {"$set": {
        "date": inp.new_date,
        "time_slot": inp.new_time_slot,
        "status": "rescheduled",
        "rescheduled_at": datetime.now(timezone.utc).isoformat(),
        "previous_date": old_date,
        "previous_time": old_time
    }})
    logger.info(f"[MOCK WhatsApp] Reschedule notice sent: moved from {old_date} {old_time} to {inp.new_date} {inp.new_time_slot}")
    return {"message": "Booking rescheduled", "new_date": inp.new_date, "new_time_slot": inp.new_time_slot}

@api_router.put("/bookings/{booking_id}/admin-cancel")
async def admin_cancel_booking(booking_id: str, user=Depends(get_current_user)):
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"_id": ObjectId(booking_id)}, {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat(), "cancelled_by": "admin"}})
    logger.info(f"[MOCK WhatsApp] Admin cancellation sent to {booking.get('customer_info', {}).get('whatsapp', 'N/A')}")
    return {"message": "Booking cancelled by admin"}

@api_router.put("/bookings/{booking_id}/admin-reschedule")
async def admin_reschedule_booking(booking_id: str, inp: RescheduleInput, user=Depends(get_current_user)):
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    old_date = booking.get("date", "")
    old_time = booking.get("time_slot", "")
    await db.bookings.update_one({"_id": ObjectId(booking_id)}, {"$set": {
        "date": inp.new_date,
        "time_slot": inp.new_time_slot,
        "status": "rescheduled",
        "rescheduled_at": datetime.now(timezone.utc).isoformat(),
        "previous_date": old_date,
        "previous_time": old_time
    }})
    return {"message": "Booking rescheduled by admin"}

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, user=Depends(get_current_user)):
    await db.bookings.update_one({"_id": ObjectId(booking_id)}, {"$set": {"status": status}})
    return {"message": "Updated"}

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, user=Depends(get_current_user)):
    await db.bookings.delete_one({"_id": ObjectId(booking_id)})
    return {"message": "Deleted"}

# ─── Mock Razorpay Payment ──────────────────────────────────

@api_router.post("/payments/create-order")
async def create_payment_order(inp: MockPaymentInput):
    """Mock Razorpay order creation"""
    order_id = f"order_mock_{secrets.token_hex(8)}"
    logger.info(f"[MOCK Razorpay] Order created: {order_id} for amount ₹{inp.amount}")
    return {
        "order_id": order_id,
        "amount": inp.amount,
        "currency": "INR",
        "status": "created",
        "provider": "razorpay_mock"
    }

@api_router.post("/payments/verify")
async def verify_payment(order_id: str, booking_id: str):
    """Mock Razorpay payment verification - always succeeds"""
    payment_id = f"pay_mock_{secrets.token_hex(8)}"
    logger.info(f"[MOCK Razorpay] Payment verified: {payment_id} for order {order_id}")
    # Update booking payment status
    try:
        await db.bookings.update_one({"_id": ObjectId(booking_id)}, {"$set": {
            "payment_status": "completed",
            "payment_id": payment_id,
            "payment_order_id": order_id
        }})
    except Exception:
        pass
    return {
        "payment_id": payment_id,
        "order_id": order_id,
        "status": "completed",
        "provider": "razorpay_mock"
    }

# ─── Payment Plans ──────────────────────────────────────────

@api_router.get("/payment-plans")
async def get_payment_plans():
    return [
        {
            "id": "free_trial",
            "name": "Free Trial",
            "duration": "1 month",
            "price_per_location": 0,
            "description": "Free for all locations for 1 month",
            "features": ["Unlimited locations", "All features included", "WhatsApp notifications", "Customer database"]
        },
        {
            "id": "starter",
            "name": "Starter",
            "duration": "2 months",
            "price_per_location": 1000,
            "description": "₹1,000 per location per month",
            "features": ["Per-location pricing", "All features included", "WhatsApp notifications", "Priority support"]
        },
        {
            "id": "dynamic",
            "name": "Custom",
            "duration": "Ongoing",
            "price_per_location": None,
            "description": "Dynamic pricing based on features",
            "features": ["Custom pricing", "Feature-based billing", "Dedicated support", "Custom integrations"]
        }
    ]

# ─── Customers ──────────────────────────────────────────────

@api_router.get("/customers")
async def get_customers(user=Depends(get_current_user)):
    custs = await db.customers.find({}).sort("created_at", -1).to_list(1000)
    return serialize_list(custs)

# ─── Time Slots ─────────────────────────────────────────────

@api_router.get("/timeslots")
async def get_timeslots(location_id: str, date: str, duration: int):
    # Generate available time slots based on duration needed
    slots = []
    start_hour = 9
    end_hour = 18
    current = start_hour * 60  # in minutes
    end = end_hour * 60
    # Get existing bookings for this location and date
    existing = await db.bookings.find({"location_id": location_id, "date": date, "status": {"$ne": "cancelled"}}).to_list(1000)
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
        conflict = False
        for bs, be in booked_ranges:
            if not (current + duration <= bs or current >= be):
                conflict = True
                break
        if not conflict:
            h = current // 60
            m = current % 60
            slots.append(f"{h:02d}:{m:02d}")
        current += 30  # 30 min intervals
    return slots

# ─── Seed Data ──────────────────────────────────────────────

async def seed_data():
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@salon.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed settings
    s = await db.settings.find_one({})
    if not s:
        await db.settings.insert_one({
            "business_name": "LuxeSalon",
            "business_email": "contact@luxesalon.com",
            "business_webpage": "https://luxesalon.com",
            "theme": "earthy-minimal"
        })

    # Seed locations
    loc_count = await db.locations.count_documents({})
    if loc_count == 0:
        loc1 = await db.locations.insert_one({"name": "Downtown Studio", "address": "42, MG Road, Connaught Place, New Delhi - 110001", "services": [], "employees": [], "created_at": datetime.now(timezone.utc).isoformat()})
        loc2 = await db.locations.insert_one({"name": "Bandra West", "address": "15, Hill Road, Bandra West, Mumbai - 400050", "services": [], "employees": [], "created_at": datetime.now(timezone.utc).isoformat()})
        loc1_id = str(loc1.inserted_id)
        loc2_id = str(loc2.inserted_id)

        # Seed employees
        emp1 = await db.employees.insert_one({
            "name": "Priya Sharma", "email": "priya@luxesalon.com", "phone": "+919876543210",
            "location": loc1_id, "expertise": ["Hair Styling", "Hair Color"],
            "working_hours": [
                {"day": "Monday", "start": "09:00", "end": "18:00", "is_off": False},
                {"day": "Tuesday", "start": "09:00", "end": "18:00", "is_off": False},
                {"day": "Wednesday", "start": "09:00", "end": "18:00", "is_off": False},
                {"day": "Thursday", "start": "09:00", "end": "18:00", "is_off": False},
                {"day": "Friday", "start": "09:00", "end": "18:00", "is_off": False},
                {"day": "Saturday", "start": "10:00", "end": "16:00", "is_off": False},
                {"day": "Sunday", "start": "00:00", "end": "00:00", "is_off": True}
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        emp2 = await db.employees.insert_one({
            "name": "Rahul Verma", "email": "rahul@luxesalon.com", "phone": "+919876543211",
            "location": loc2_id, "expertise": ["Facial", "Spa Treatment"],
            "working_hours": [
                {"day": "Monday", "start": "10:00", "end": "19:00", "is_off": False},
                {"day": "Tuesday", "start": "10:00", "end": "19:00", "is_off": False},
                {"day": "Wednesday", "start": "10:00", "end": "19:00", "is_off": False},
                {"day": "Thursday", "start": "10:00", "end": "19:00", "is_off": False},
                {"day": "Friday", "start": "10:00", "end": "19:00", "is_off": False},
                {"day": "Saturday", "start": "10:00", "end": "17:00", "is_off": False},
                {"day": "Sunday", "start": "00:00", "end": "00:00", "is_off": True}
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        emp3 = await db.employees.insert_one({
            "name": "Anita Desai", "email": "anita@luxesalon.com", "phone": "+919876543212",
            "location": loc1_id, "expertise": ["Manicure", "Pedicure", "Nail Art"],
            "working_hours": [
                {"day": "Monday", "start": "09:00", "end": "17:00", "is_off": False},
                {"day": "Tuesday", "start": "09:00", "end": "17:00", "is_off": False},
                {"day": "Wednesday", "start": "09:00", "end": "17:00", "is_off": False},
                {"day": "Thursday", "start": "09:00", "end": "17:00", "is_off": False},
                {"day": "Friday", "start": "09:00", "end": "17:00", "is_off": False},
                {"day": "Saturday", "start": "00:00", "end": "00:00", "is_off": True},
                {"day": "Sunday", "start": "00:00", "end": "00:00", "is_off": True}
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        emp1_id = str(emp1.inserted_id)
        emp2_id = str(emp2.inserted_id)
        emp3_id = str(emp3.inserted_id)

        # Update locations with employees
        await db.locations.update_one({"_id": ObjectId(loc1_id)}, {"$set": {"employees": [emp1_id, emp3_id]}})
        await db.locations.update_one({"_id": ObjectId(loc2_id)}, {"$set": {"employees": [emp2_id]}})

        # Seed services
        svc1 = await db.services.insert_one({
            "name": "Haircut & Styling", "price": 800, "duration_minutes": 45, "category": "Hair",
            "description": "Professional haircut with wash and styling",
            "add_ons": [
                {"id": str(uuid.uuid4()), "name": "Deep Conditioning", "price": 400, "duration_minutes": 20},
                {"id": str(uuid.uuid4()), "name": "Hair Spa", "price": 600, "duration_minutes": 30}
            ],
            "locations": [loc1_id, loc2_id], "employees": [emp1_id],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        svc2 = await db.services.insert_one({
            "name": "Hair Coloring", "price": 2500, "duration_minutes": 90, "category": "Hair",
            "description": "Full hair coloring with premium products",
            "add_ons": [
                {"id": str(uuid.uuid4()), "name": "Highlights", "price": 1500, "duration_minutes": 45},
                {"id": str(uuid.uuid4()), "name": "Root Touch-up", "price": 800, "duration_minutes": 30}
            ],
            "locations": [loc1_id, loc2_id], "employees": [emp1_id],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        svc3 = await db.services.insert_one({
            "name": "Classic Facial", "price": 1200, "duration_minutes": 60, "category": "Skin",
            "description": "Deep cleansing facial with extraction and mask",
            "add_ons": [
                {"id": str(uuid.uuid4()), "name": "LED Therapy", "price": 500, "duration_minutes": 15},
                {"id": str(uuid.uuid4()), "name": "Under-eye Treatment", "price": 300, "duration_minutes": 10}
            ],
            "locations": [loc1_id, loc2_id], "employees": [emp2_id],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        svc4 = await db.services.insert_one({
            "name": "Manicure", "price": 600, "duration_minutes": 30, "category": "Nails",
            "description": "Classic manicure with nail shaping and polish",
            "add_ons": [
                {"id": str(uuid.uuid4()), "name": "Gel Polish", "price": 400, "duration_minutes": 15},
                {"id": str(uuid.uuid4()), "name": "Nail Art (per nail)", "price": 100, "duration_minutes": 5}
            ],
            "locations": [loc1_id], "employees": [emp3_id],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        svc5 = await db.services.insert_one({
            "name": "Pedicure", "price": 700, "duration_minutes": 40, "category": "Nails",
            "description": "Relaxing pedicure with foot massage",
            "add_ons": [
                {"id": str(uuid.uuid4()), "name": "Gel Polish", "price": 400, "duration_minutes": 15},
                {"id": str(uuid.uuid4()), "name": "Paraffin Wax", "price": 300, "duration_minutes": 10}
            ],
            "locations": [loc1_id], "employees": [emp3_id],
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        svc_ids = [str(svc1.inserted_id), str(svc2.inserted_id), str(svc3.inserted_id), str(svc4.inserted_id), str(svc5.inserted_id)]
        await db.locations.update_one({"_id": ObjectId(loc1_id)}, {"$set": {"services": svc_ids}})
        await db.locations.update_one({"_id": ObjectId(loc2_id)}, {"$set": {"services": [svc_ids[0], svc_ids[1], svc_ids[2]]}})

    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n## Test Signup\n- Any email/password (min 6 chars) works for registration\n- Endpoint: POST /api/auth/register\n\n## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- POST /api/auth/logout\n- GET /api/auth/me\n\n## Booking Endpoints\n- POST /api/bookings\n- GET /api/bookings/{{id}}\n- PUT /api/bookings/{{id}}/cancel\n- PUT /api/bookings/{{id}}/reschedule\n- PUT /api/bookings/{{id}}/admin-cancel\n- PUT /api/bookings/{{id}}/admin-reschedule\n\n## Payment Endpoints (MOCKED)\n- POST /api/payments/create-order\n- POST /api/payments/verify\n- GET /api/payment-plans\n")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
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
