# Part 4

---

# 17. Database Requirements

## 17.1 Overview

The Annapurna Foundation platform shall use **Supabase PostgreSQL** as its primary relational database.

The database shall be designed following normalization principles while maintaining simplicity, scalability, and maintainability.

All tables must include:

- Primary Key
- Created Timestamp
- Updated Timestamp
- Appropriate Foreign Keys
- Soft Delete capability where required
- Row Level Security (RLS)

---

# 17.2 Core Database Entities

The application shall include, but not be limited to, the following entities.

## Authentication

- Users
- User Roles
- Sessions

---

## Donations

- Monetary Donations
- Food Donations
- Donation Receipts

---

## Volunteer System

- Volunteer Applications
- Volunteer Assignments
- Volunteer Deliveries
- Volunteer Compensation

---

## Partner NGOs

- Partner NGOs
- Beneficiaries

---

## Website Content

- Blogs
- Blog Categories
- FAQs
- Events
- Gallery Images

---

## Communication

- Contact Messages

---

## Administration

- Activity Logs
- System Settings

---

# 17.3 Database Relationships

Users

↓

can create

↓

Monetary Donations

Food Donations

Volunteer Applications

↓

Administrator verifies

↓

Volunteer Assignment

↓

Delivery

↓

Completion

↓

Receipt Generation

---

Partner NGOs are linked to:

- Beneficiaries
- Food Deliveries

---

Volunteers are linked to:

- Assignments
- Deliveries
- Compensation

---

# 17.4 Data Retention

The system should retain historical records for:

- Donations
- Receipts
- Volunteer Activities
- Contact Messages
- Blogs
- Events

Deletion of critical operational records should be avoided.

Where possible, records should be archived instead of permanently deleted.

---

# 18. Third-Party Integrations

The platform intentionally uses technologies with generous free tiers during development.

---

## 18.1 Supabase

Purpose

- Authentication
- PostgreSQL Database
- Storage
- Realtime
- Row Level Security

---

## 18.2 Razorpay

Purpose

- Monetary Donations

Development

- Test Mode

Production

- Live Mode after deployment approval

---

## 18.3 React Email

Purpose

Generate professional email templates for:

- Donation Confirmation
- Volunteer Application Confirmation
- Contact Acknowledgement
- Password Reset
- Welcome Email

---

## 18.4 Email Delivery

Recommended Service

- Resend

Purpose

- Send transactional emails
- Deliver React Email templates

---

## 18.5 Maps

Purpose

Volunteer navigation.

Development Stack

- Leaflet
- OpenStreetMap
- OpenRouteService

The system shall avoid paid mapping APIs during development.

---

## 18.6 Hosting

Recommended Platform

- Vercel

Alternative

- GitHub (static hosting where applicable)

Final production hosting will be decided before deployment.

---

# 19. Security Requirements

Security is a fundamental requirement of the platform.

---

# 19.1 Authentication

The platform shall support:

- Email & Password Authentication
- Google Authentication

Passwords shall never be stored in plain text.

Authentication shall be handled through Supabase Auth.

---

# 19.2 Authorization

Role-Based Access Control (RBAC) shall be implemented.

Roles include:

- Visitor
- Donor
- Volunteer
- Partner NGO
- Administrator

Every protected resource must verify permissions before access.

---

# 19.3 Data Protection

Sensitive information shall be protected through:

- HTTPS
- Secure Authentication
- Environment Variables
- Server-side Validation
- Database Policies

---

# 19.4 Input Validation

All user input must be validated using:

- React Hook Form
- Zod

Validation must occur on both client and server.

---

# 19.5 File Upload Security

Uploaded files shall:

- Validate MIME Type
- Validate File Size
- Restrict Dangerous Extensions
- Store in Supabase Storage

---

# 19.6 Payment Security

The application shall never store:

- Card Numbers
- CVV
- Banking Credentials

Payment processing shall be delegated to Razorpay.

---

# 19.7 API Security

The backend shall:

- Verify Authentication
- Verify Authorization
- Validate Requests
- Return Proper HTTP Status Codes

---

# 19.8 Environment Variables

Sensitive configuration values shall be stored in environment variables.

Examples include:

- Supabase URL
- Supabase Keys
- Razorpay Keys
- Resend API Key

Secrets must never be committed to source control.

---

# 20. Acceptance Criteria

The project shall be considered MVP complete when all mandatory requirements have been implemented and verified.

---

## Public Website

- Home page completed
- About page completed
- Events page completed
- Gallery completed
- Blog completed
- FAQ completed
- Contact completed
- Privacy Policy completed
- Terms & Conditions completed

---

## Authentication

- User Registration
- Login
- Google Login
- Logout
- Protected Routes

---

## Donations

- Monetary Donations
- Food Donations
- Donation History
- Receipt Generation

---

## Volunteer System

- Volunteer Applications
- Volunteer Approval
- Volunteer Assignment
- Task Tracking
- Delivery Completion

---

## Dashboard

Donor Dashboard

Completed

Volunteer Dashboard

Completed

Administrator Dashboard

Completed

---

## Administration

Administrator can successfully manage:

- Users
- Donations
- Volunteers
- Blogs
- FAQs
- Events
- Gallery
- Contact Messages

---

## Quality

The application should be:

- Responsive
- Secure
- Stable
- Accessible
- Production-ready

---

# 21. Success Metrics

The success of Version 2.0 shall be measured using both technical and operational indicators.

## Product Metrics

- Successful user registrations
- Donation completion rate
- Volunteer application completion rate
- Blog engagement
- Contact form submissions

---

## Technical Metrics

- Fast page loading
- Stable deployment
- High uptime
- Minimal runtime errors

---

## Operational Metrics

- Reduced manual work
- Faster volunteer assignment
- Faster receipt generation
- Improved donation tracking

---

# 22. Risks & Assumptions

## Risks

Potential project risks include:

- Limited free-tier quotas
- Third-party API changes
- Payment gateway downtime
- Email delivery delays
- Mapping service limitations

---

## Assumptions

The project assumes:

- Stable internet connectivity
- Continued availability of selected free-tier services
- Modern browser support
- Active maintenance by the development team

---

# 23. Development Roadmap

Development shall follow a phased approach.

---

## Phase 1

Project Foundation

- Next.js Setup
- Supabase Integration
- Authentication
- Database Design

---

## Phase 2

Public Website

- Home
- About
- Gallery
- Events
- Blog
- FAQ
- Contact
- Privacy Policy
- Terms & Conditions

---

## Phase 3

Donation System

- Monetary Donation
- Food Donation
- Receipt Generation

---

## Phase 4

Volunteer System

- Volunteer Registration
- Approval Workflow
- Assignment Workflow
- Delivery Tracking
- Compensation Calculation

---

## Phase 5

Administrative Dashboard

- User Management
- Donation Management
- Volunteer Management
- Blog Management
- FAQ Management
- Event Management
- Gallery Management

---

## Phase 6

Testing & Deployment

- Functional Testing
- Performance Optimization
- Security Review
- Production Deployment

---

# 24. Future Scope

The following enhancements are intentionally outside the scope of Version 2.0 but may be considered in future releases.

- Native Android Application
- Native iOS Application
- Push Notifications
- SMS Notifications
- Multi-language Support
- Advanced Analytics Dashboard
- AI-powered Assistance
- Corporate Sponsorship Portal
- Accounting Software Integration
- Inventory Management
- QR Code Based Donation Tracking
- Automated Tax Certificate Generation
- Progressive Web App (PWA)

These items are not part of the current implementation plan and shall only be evaluated after the successful completion and deployment of Version 2.0.

---

# Conclusion

This Product Requirements Document defines the complete functional, technical, and business requirements for **Annapurna Foundation v2.0**.

It serves as the primary reference for all future design, development, testing, deployment, and maintenance activities. Any new feature, architectural change, or business requirement introduced after this document shall be evaluated against the objectives and scope defined herein and documented through a formal revision process.

**End of PRD**