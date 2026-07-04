# Annapurna Foundation v2.0

# Minimum Viable Product (MVP)

**Version:** 2.0

**Status:** Draft

**Project:** Annapurna Foundation Website

**Document Type:** MVP Specification

**Technology Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase

**Last Updated:** July 2026

---

# Part 1

---

# 1. Purpose

This document defines the Minimum Viable Product (MVP) for the Annapurna Foundation platform.

The MVP establishes the smallest complete version of the product that delivers real value to users while remaining production-ready and maintainable.

The objective is **not** to build every possible feature, but to build the right features that allow the foundation to begin real-world operations.

This document should be used together with:

- PRD.md
- ARCHITECTURE.md

---

# 2. MVP Vision

The MVP aims to digitize the essential operations of the Annapurna Foundation by providing a secure, scalable, and user-friendly platform for:

- Public awareness
- Monetary donations
- Food donations
- Volunteer coordination
- Partner NGO collaboration
- Administrative management

The platform should replace manual workflows wherever possible while maintaining simplicity.

---

# 3. MVP Objectives

The MVP has the following objectives:

- Launch a fully functional public website.
- Enable secure user authentication.
- Allow online monetary donations.
- Allow users to submit food donation requests.
- Enable volunteer registration and assignment.
- Provide role-based dashboards.
- Allow administrators to manage foundation operations.
- Generate downloadable donation receipts.
- Establish a scalable architecture for future releases.

---

# 4. Success Criteria

The MVP will be considered successful if it satisfies the following goals.

## Business Goals

- Foundation information is publicly accessible.
- Visitors can become donors or volunteers.
- Donations are recorded digitally.
- Volunteers can complete assigned deliveries.
- Administrators can manage operations without manual spreadsheets.

---

## Technical Goals

- Responsive UI across devices.
- Secure authentication.
- Stable backend.
- Reliable database.
- Proper role-based access control.
- Clean codebase.
- Modular architecture.

---

## User Experience Goals

Users should be able to:

- Register easily.
- Donate within a few steps.
- Apply as volunteers.
- Navigate the website without confusion.
- Download receipts without contacting administrators.

---

# 5. MVP Scope

The following functionality is included in Version 2.0.

---

## Public Website

Included pages:

- Home
- About
- Events
- Gallery
- Blog
- FAQ
- Volunteer
- Donate
- Contact
- Privacy Policy
- Terms & Conditions

---

## Authentication

Included:

- Email & Password
- Google Sign-In
- Registration
- Login
- Logout
- Password Reset
- Protected Routes

---

## Dashboard

Included:

- Donor Dashboard
- Volunteer Dashboard
- Administrator Dashboard

---

## Donations

Included:

- Monetary Donations
- Food Donations
- Donation History
- Receipt Generation

---

## Volunteer System

Included:

- Volunteer Registration
- Volunteer Approval
- Assignment Management
- Delivery Tracking
- Compensation Calculation

---

## Partner NGO

Included:

- Partner NGO Management
- Beneficiary Coordination

---

## Content Management

Included:

- Blog Management
- FAQ Management
- Gallery Management
- Events Management

---

# 6. Out of Scope

The following features are intentionally excluded from the MVP.

- Mobile Applications
- AI Chatbot
- SMS Notifications
- Push Notifications
- Multi-language Support
- Advanced Analytics
- Corporate Sponsorship Portal
- Inventory Management
- Accounting Integrations
- Offline Mode
- Progressive Web App (PWA)

These features may be evaluated in future versions after successful deployment.

---

# 7. User Roles

The MVP supports five user roles.

---

## Visitor

Capabilities:

- Browse website
- Read blogs
- Read FAQs
- Contact foundation
- Register
- Login
- Apply as volunteer

---

## Donor

Capabilities:

- Donate money
- Donate food
- Download receipts
- View donation history
- Manage profile

---

## Volunteer

Capabilities:

- View assignments
- Accept tasks
- Track deliveries
- Update delivery status
- View compensation
- Manage profile

---

## Partner NGO

Capabilities:

- View assigned beneficiaries
- Coordinate deliveries
- Update beneficiary information

---

## Administrator

Capabilities:

- Manage users
- Manage volunteers
- Manage donations
- Manage blogs
- Manage FAQs
- Manage events
- Manage gallery
- View reports
- Configure system settings

---

# 8. MVP Guiding Principles

The MVP should adhere to the following principles.

## Simplicity

Every feature should solve a real operational problem.

---

## Reliability

Critical workflows such as donations, volunteer assignments, and receipt generation must function consistently.

---

## Transparency

Users should always know the status of their donations and volunteer activities.

---

## Security

Authentication, authorization, and user data must be protected using industry best practices.

---

## Scalability

The architecture should support future growth without requiring major redesign.

---

## Cost Efficiency

During development, the platform shall prioritize free-tier services and open-source technologies wherever practical.

---

# 9. Technology Stack

The MVP shall use the following technologies.

| Category | Technology |
|----------|------------|
| Frontend | Next.js 15 |
| Language | TypeScript |
| UI | React 19 |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Forms | React Hook Form |
| Validation | Zod |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Maps | Leaflet + OpenStreetMap |
| Routing | OpenRouteService |
| Email Templates | React Email |
| Payments | Razorpay (Test Mode) |
| Hosting | Vercel |

---

# 10. MVP Deliverables

At the completion of Version 2.0, the following deliverables should be available.

- Fully functional public website
- Responsive user interface
- Secure authentication
- Role-based dashboards
- Donation management system
- Volunteer management system
- Partner NGO support
- Blog management
- FAQ management
- Contact management
- Receipt generation
- Administrative dashboard
- Deployment-ready application

---

# End of Part 1

The next part will define every MVP feature in detail, including feature priorities (Must Have, Should Have, Could Have), dependencies, implementation notes, and acceptance requirements.