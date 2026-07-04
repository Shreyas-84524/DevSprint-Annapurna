# Annapurna Foundation v2.0

# ARCHITECTURE.md

**Version:** 2.0

**Status:** Draft

**Project:** Annapurna Foundation Website

**Architecture Version:** 2.0

**Technology Stack:** Next.js 15 • React 19 • TypeScript • Supabase • PostgreSQL

**Last Updated:** July 2026

---

# Part 1

---

# 1. Purpose

This document defines the technical architecture of the Annapurna Foundation Version 2.0 platform.

It serves as the single source of truth for all architectural decisions, ensuring consistency, maintainability, scalability, and security throughout the application's lifecycle.

This document should be used alongside:

- PRD.md
- MVP.md
- README.md

---

# 2. Architecture Goals

The architecture has been designed around the following principles.

## Simplicity

The system should remain easy to understand for future contributors.

---

## Scalability

The architecture should allow future expansion without requiring major restructuring.

---

## Maintainability

The codebase should remain modular, reusable, and easy to extend.

---

## Security

Authentication, authorization, and sensitive data should follow modern security best practices.

---

## Performance

Pages should load quickly while minimizing unnecessary network requests.

---

## Cost Efficiency

During development, the platform should rely on free-tier and open-source technologies whenever possible.

---

# 3. System Overview

The platform consists of four primary layers.

```text
                Users
                   │
                   ▼
        Next.js Frontend (React)
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
 Authentication   API Layer   UI Components
      │            │
      └──────┬─────┘
             ▼
      Supabase Backend
             │
 ┌───────────┼─────────────┐
 ▼           ▼             ▼
Database   Storage     Realtime
             │
             ▼
 Third Party Services
```

---

# 4. Technology Stack

## Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion

---

## Backend

- Supabase

---

## Database

- PostgreSQL

---

## Authentication

- Supabase Auth

Authentication Providers

- Email & Password
- Google OAuth

---

## Storage

- Supabase Storage

Storage will contain:

- Blog Images
- Gallery Images
- User Avatars
- Receipt PDFs

---

## Forms

- React Hook Form

---

## Validation

- Zod

---

## Maps

- Leaflet
- OpenStreetMap
- OpenRouteService

---

## Email

Templates

- React Email

Delivery

- Resend

---

## Payments

- Razorpay

Development Mode

- Test Mode

---

## Hosting

Preferred

- Vercel

Alternative

- GitHub

---

# 5. High-Level Folder Structure

```text
annapurna-foundation/

│
├── app/
│
├── components/
│
├── features/
│
├── hooks/
│
├── lib/
│
├── services/
│
├── types/
│
├── utils/
│
├── constants/
│
├── public/
│
├── styles/
│
├── docs/
│
├── supabase/
│
└── middleware.ts
```

---

# 6. Frontend Architecture

The frontend follows a feature-based modular architecture.

```text
app/

├── (public)
│
├── (auth)
│
├── dashboard
│
├── admin
│
└── api
```

---

## Public Module

Contains:

- Home
- About
- Blog
- Events
- Gallery
- FAQ
- Donate
- Volunteer
- Contact

---

## Authentication Module

Contains

- Login
- Register
- Forgot Password

---

## Dashboard Module

Contains

- Donor Dashboard
- Volunteer Dashboard

---

## Administrator Module

Contains

- Dashboard
- User Management
- Donations
- Volunteers
- Blogs
- FAQs
- Events
- Gallery

---

# 7. Component Architecture

Reusable components shall be stored independently of pages.

```text
components/

├── ui/
│
├── layout/
│
├── forms/
│
├── navigation/
│
├── dashboard/
│
├── donation/
│
├── volunteer/
│
├── blog/
│
├── events/
│
└── shared/
```

Every component should follow the Single Responsibility Principle.

---

# 8. Feature-Based Architecture

Business logic shall be grouped by domain.

```text
features/

authentication/

donations/

volunteers/

blogs/

events/

gallery/

dashboard/

contact/

faq/

admin/
```

Each feature should contain:

- Components
- Hooks
- Services
- Types
- Validation
- Utilities

---

# 9. Backend Architecture

Supabase serves as the Backend-as-a-Service (BaaS).

Responsibilities include:

- Authentication
- PostgreSQL
- Storage
- Realtime
- Row Level Security

Application logic should remain inside the Next.js application.

---

# 10. Database Architecture

Database Engine

PostgreSQL

Hosted on

Supabase

Primary design goals

- Normalized
- Secure
- Scalable
- Easy to maintain

---

## Core Database Tables

### Authentication

- users
- user_roles

---

### Donations

- monetary_donations
- food_donations
- donation_receipts

---

### Volunteers

- volunteer_applications
- volunteer_assignments
- volunteer_compensation

---

### Partner NGOs

- partner_ngos
- beneficiaries

---

### Website

- blogs
- blog_categories
- faqs
- events
- gallery

---

### Communication

- contact_messages

---

### Administration

- system_settings
- activity_logs

---

# 11. Database Relationships

```text
Users

│

├───────────────┐
│               │
▼               ▼

Monetary     Food Donation

Donation

│

▼

Receipt

Food Donation

↓

Volunteer Assignment

↓

Volunteer

↓

Beneficiary

↓

Completion

↓

History
```

---

# 12. Authentication Architecture

Authentication is fully managed through Supabase Auth.

Supported providers

- Email & Password
- Google OAuth

Authentication Flow

```text
User

↓

Login

↓

Supabase Auth

↓

JWT Generated

↓

Session Created

↓

Protected Routes

↓

Dashboard
```

---

# 13. Authorization (RBAC)

The application implements Role-Based Access Control.

Roles

- Visitor
- Donor
- Volunteer
- Partner NGO
- Administrator

Permissions are enforced through:

- Middleware
- Server Components
- API validation
- Row Level Security (RLS)

---

# 14. Route Protection

Public Routes

- Home
- About
- Blog
- FAQ
- Contact
- Donate
- Volunteer

Protected Routes

- Dashboard
- Profile
- Donation History
- Volunteer Dashboard

Admin Routes

- Admin Dashboard
- User Management
- Blog Management
- Volunteer Management
- Event Management

Unauthorized users should be redirected to the Login page or an Access Denied page, as appropriate.

---

# 15. Storage Architecture

Supabase Storage shall be organized into dedicated buckets.

```text
storage/

avatars/

blogs/

gallery/

receipts/

documents/
```

Access Rules

Public

- Blog Images
- Gallery Images

Private

- User Avatars
- Donation Receipts
- Internal Documents

---

# 16. State Management

The application should minimize unnecessary global state.

## Local State

- React State

---

## Server State

- Server Components
- Server Actions

---

## Shared State

- React Context (only where appropriate)

Avoid unnecessary complexity by introducing external state management libraries only if the project requirements significantly grow.

---

# 17. API Architecture

The application follows a service-oriented API structure.

```text
Frontend

↓

Service Layer

↓

Server Actions / API Routes

↓

Supabase

↓

PostgreSQL
```

Each feature should expose only the APIs it requires.

Business logic should remain outside UI components.

---

# 18. Data Flow

Example: Monetary Donation

```text
User

↓

Donation Form

↓

Validation (Zod)

↓

Server Action

↓

Supabase Database

↓

Payment Verification

↓

Receipt Generation

↓

Dashboard Update
```

Example: Food Donation

```text
User

↓

Food Donation Form

↓

Validation

↓

Database

↓

Admin Verification

↓

Volunteer Assignment

↓

Delivery

↓

Completion

↓

History Updated
```

---

# 19. Realtime Architecture

Supabase Realtime will be used for live operational updates.

Supported realtime events include:

- Volunteer Assignment Updates
- Delivery Status Updates
- Donation Status Updates
- Dashboard Notifications

Realtime should be used selectively to reduce unnecessary resource consumption.

---

# 20. Architecture Principles

The application should follow these engineering principles throughout development.

- Single Responsibility Principle (SRP)
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)
- Separation of Concerns
- Feature-Based Organization
- Strong Type Safety
- Composition over Inheritance
- Secure by Default
- Mobile-First Responsive Design

Every new feature introduced into the project should align with these architectural principles to maintain consistency across the codebase.

---

# End of Part 1

The next part of the architecture document will define:

- UI Architecture
- Component Communication
- Volunteer Tracking Architecture
- Donation Workflow Architecture
- Receipt Generation Architecture
- Email Architecture
- Logging & Monitoring
- Security Architecture
- Error Handling Strategy
- Performance Optimization
- Deployment Architecture
- CI/CD Pipeline
- Coding Standards
- Scalability Strategy
- Future Architecture
- Final Technical Guidelines

This concludes Part 1 of the Architecture Document.