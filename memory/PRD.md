# Salon Appointment Scheduling Platform - PRD

## Original Problem Statement
Build a comprehensive appointment scheduling platform for salons with customer booking, admin management, authentication (login+signup), payment integration, booking cancellation/rescheduling, and WhatsApp notifications.

## Architecture
- **Backend**: FastAPI (Python) on port 8001 with MongoDB
- **Frontend**: React with Shadcn UI, Tailwind CSS on port 3000
- **Auth**: JWT with bcrypt, open signup + admin seeding
- **DB Collections**: users, locations, services, employees, bookings, customers, settings, profiles

## User Personas
1. **Salon Admin** - Manages services, employees, locations, views bookings, cancels/reschedules
2. **Customer** - Books appointments, manages bookings (cancel/reschedule), makes payments

## What's Been Implemented

### Phase 1 (April 15, 2026)
- Full backend API with all CRUD endpoints
- JWT authentication with admin seeding
- Customer booking page with 4-step flow
- Admin portal: Schedule, Booking Link, Services, Employees, Locations, Customers, Profile, Settings
- 3 color themes (Earthy Minimal, Midnight Luxe, Soft Blush)
- Pre-seeded sample data

### Phase 2 (April 15, 2026)
- **Admin Signup**: Open registration with Sign In/Sign Up tabs
- **Mock Razorpay Payment**: Payment dialog in booking flow, mock order creation/verification
- **Booking Cancel/Reschedule**: Customer self-service at /manage-booking/:id with phone verification + Admin cancel/reschedule from schedule page
- **Payment Plans**: Free Trial (1 month), Starter (₹1000/location/month), Custom (dynamic)
- **WhatsApp MOCKED**: Confirmation, cancellation, reschedule notices logged to console

## Payment Plans
1. Free Trial - 1 month, unlimited locations, all features
2. Starter - ₹1,000/location/month for 2 months
3. Custom - Dynamic pricing based on features

## Integrations Status
- WhatsApp: **MOCKED** (ready for Twilio)
- Razorpay: **MOCKED** (ready for real keys)

## P1 Features (Backlog)
- Real Twilio WhatsApp integration
- Real Razorpay payment integration
- Automated reminder cron job
- Email notifications
- Multi-tenant isolation (per-admin data)

## P2 Features
- Customer login/signup portal
- Booking history for customers
- Analytics dashboard
- Stripe as alternative payment
