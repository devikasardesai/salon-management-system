# Salon Appointment Scheduling Platform - PRD

## Original Problem Statement
Build a comprehensive appointment scheduling platform for salons with customer booking and admin management portal. Features include multi-step booking flow, services/employees/locations CRUD, schedule calendar, theme customization, WhatsApp notifications (mocked), customer database, and business settings.

## Architecture
- **Backend**: FastAPI (Python) on port 8001 with MongoDB
- **Frontend**: React with Shadcn UI, Tailwind CSS on port 3000
- **Auth**: JWT-based with cookies, bcrypt password hashing
- **DB Collections**: users, locations, services, employees, bookings, customers, settings, profiles

## User Personas
1. **Salon Admin** - Manages services, employees, locations, views bookings, configures business settings
2. **Customer** - Books appointments through a public booking page

## Core Requirements
- Multi-step booking: Location → Services → Date/Time → Confirm
- Services with add-ons/sub-products, pricing in INR (₹)
- Employee management with working hours
- Location management with service/employee assignments
- Schedule calendar with location filter
- Business info settings reflected in header
- 3 color themes (Earthy Minimal, Midnight Luxe, Soft Blush)
- Phone validation: +91 followed by 10 digits
- WhatsApp checkbox on booking confirmation
- Customer database auto-populated from bookings

## What's Been Implemented (April 15, 2026)
- Full backend API with all CRUD endpoints
- JWT authentication with admin seeding
- Customer booking page with 4-step flow
- Admin portal with all pages: Schedule, Booking Link, Services, Employees, Locations, Customers, Profile, Settings
- 3 color themes with real-time switching
- Pre-seeded sample data (2 locations, 3 employees, 5 services)
- WhatsApp MOCKED (logged to console)
- Dynamic business name in header
- Phone/WhatsApp validation with +91 format

## P0 Features Remaining
- None (MVP complete)

## P1 Features (Backlog)
- Real WhatsApp integration (Twilio)
- Automated reminder scheduling (1hr, 30min before)
- Booking cancellation/rescheduling
- Employee schedule/availability view
- Payment integration

## P2 Features
- Customer login/signup
- Booking history for customers
- Analytics dashboard
- Multi-admin support
- Email notifications
