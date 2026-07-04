# Part 2

---

# 21. UI Architecture

The Annapurna Foundation platform follows a **component-driven UI architecture** using reusable and composable React components.

Every page should be constructed using reusable building blocks instead of page-specific implementations.

## UI Hierarchy

```text
Layout

│

├── Navbar

├── Sidebar (Dashboard/Admin)

├── Main Content

│ ├── Page

│ ├── Sections

│ ├── Components

│ └── UI Elements

└── Footer
```

---

## Design Principles

- Mobile First
- Responsive Layout
- Accessible Components
- Reusable UI
- Consistent Spacing
- Consistent Typography
- Consistent Color Palette
- Dark Mode Ready (Future Enhancement)

---

# 22. Component Communication

Components should communicate using unidirectional data flow.

```text
Parent Component

↓

Props

↓

Child Component

↓

User Action

↓

Callback

↓

State Update

↓

Re-render
```

For shared application state, use React Context only where necessary.

Business logic should remain outside presentation components.

---

# 23. Donation Workflow Architecture

The donation system is divided into two independent workflows.

---

## Monetary Donation Workflow

```text
User

↓

Donation Form

↓

Form Validation

↓

Server Action

↓

Razorpay Payment

↓

Payment Verification

↓

Database Entry

↓

Receipt Generation

↓

Dashboard Update
```

---

## Food Donation Workflow

```text
User

↓

Food Donation Form

↓

Validation

↓

Food Donation Record

↓

Admin Verification

↓

Volunteer Assignment

↓

Volunteer Accepts

↓

Food Collection

↓

Delivery

↓

Task Completion

↓

Acknowledgement Receipt

↓

History Updated
```

---

# 24. Volunteer Tracking Architecture

The volunteer module follows a task-based workflow.

---

## Assignment Lifecycle

```text
Food Donation Created

↓

Pending Verification

↓

Verified

↓

Volunteer Assigned

↓

Volunteer Accepted

↓

Travelling to Donor

↓

Food Collected

↓

Travelling to Beneficiary

↓

Food Delivered

↓

Task Completed
```

---

## Volunteer Status Values

- Pending
- Assigned
- Accepted
- Travelling to Donor
- Food Collected
- Travelling to Beneficiary
- Delivered
- Completed
- Cancelled

---

## Compensation Calculation

The system calculates volunteer compensation using the formula:

```text
Compensation = Distance × Rate Per Kilometer
```

Default Rate

```
₹10 / Kilometer
```

The compensation rate shall be configurable through the Administrator Dashboard.

---

# 25. Location & Navigation Architecture

The navigation module is responsible for guiding volunteers during food delivery operations.

---

## Technology Stack

- Leaflet
- OpenStreetMap
- OpenRouteService

---

## Navigation Flow

```text
Volunteer

↓

Assignment

↓

Open Map

↓

Navigate to Donor

↓

Pickup Completed

↓

Navigate to Beneficiary

↓

Delivery Completed

↓

Task Closed
```

---

## Location Data

The application stores:

- Pickup Latitude
- Pickup Longitude
- Delivery Latitude
- Delivery Longitude

The application should **not** continuously store live GPS coordinates for users. Instead, it should fetch the volunteer's current location during navigation to preserve privacy and reduce unnecessary database writes.

---

# 26. Receipt Generation Architecture

Receipts shall be automatically generated after successful donations.

---

## Monetary Donation

Receipt contains:

- Receipt Number
- Donor Name
- Donation Amount
- Transaction ID
- Payment Date
- Foundation Information

---

## Food Donation

Acknowledgement contains:

- Donor Name
- Donation Details
- Pickup Date
- Delivery Confirmation
- Volunteer Name
- Completion Date

---

## Receipt Workflow

```text
Donation Successful

↓

Generate PDF

↓

Store PDF

↓

Database Record

↓

Dashboard Download
```

---

# 27. Email Architecture

Emails are generated using **React Email**.

Delivery is handled through **Resend**.

---

## Transactional Emails

The platform should support:

- Welcome Email
- Password Reset
- Donation Confirmation
- Food Donation Confirmation
- Volunteer Application Confirmation
- Volunteer Approval
- Contact Form Acknowledgement

---

## Email Flow

```text
User Action

↓

React Email Template

↓

Resend

↓

Recipient Inbox
```

---

# 28. Logging & Monitoring

Logging should assist in debugging while protecting user privacy.

---

## Logged Events

- User Login
- User Registration
- Donation Created
- Payment Successful
- Volunteer Assigned
- Volunteer Completed Task
- Blog Published
- FAQ Updated
- Contact Submitted

---

## Error Logs

Critical errors should include:

- Timestamp
- User ID (if authenticated)
- Error Type
- Request Path
- Stack Trace (Development Only)

Sensitive information must never be logged.

---

# 29. Error Handling Strategy

The application should gracefully recover from failures.

---

## Client Errors

Examples:

- Invalid Form Input
- Missing Required Fields
- Invalid Login Credentials

Display user-friendly messages without exposing technical details.

---

## Server Errors

Examples:

- Database Failure
- Authentication Failure
- Payment Failure

Return standardized HTTP status codes and meaningful error responses.

---

## Fallback Strategy

- Retry transient requests where appropriate.
- Display informative error pages.
- Log failures for administrator review.

---

# 30. Security Architecture

Security is enforced at multiple layers.

---

## Frontend

- Input Validation
- Route Protection
- Secure Forms

---

## Backend

- Row Level Security
- Authentication Verification
- Authorization Verification
- Server-side Validation

---

## Database

- Foreign Keys
- Constraints
- Indexed Queries
- Secure Policies

---

## Storage

Public Buckets

- Blogs
- Gallery

Private Buckets

- Receipts
- User Avatars
- Internal Documents

---

## Secrets

Sensitive values must be stored in environment variables.

Never commit secrets to Git.

---

# 31. Performance Optimization

The platform should prioritize performance across all devices.

---

## Frontend

- Server Components
- Lazy Loading
- Dynamic Imports
- Optimized Images
- Code Splitting

---

## Backend

- Indexed Database Queries
- Pagination
- Optimized API Calls

---

## Network

- Compression
- Browser Caching
- CDN Delivery (Vercel)

---

# 32. Deployment Architecture

The application will follow a cloud-first deployment model.

```text
Developer

↓

GitHub Repository

↓

Vercel Deployment

↓

Production Website

↓

Supabase Backend

↓

PostgreSQL Database
```

---

## Deployment Pipeline

Development

↓

Testing

↓

Preview Deployment

↓

Production Deployment

---

# 33. Environment Variables

The application requires the following environment variables.

```env
NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

RAZORPAY_KEY_ID=

RAZORPAY_SECRET=

RESEND_API_KEY=

NEXT_PUBLIC_ORS_API_KEY=
```

Additional variables may be introduced as required.

---

# 34. Git Workflow

Development should follow a feature-branch workflow.

```text
main

↓

develop

↓

feature/feature-name

↓

Pull Request

↓

Code Review

↓

Merge into develop

↓

Merge into main

↓

Production
```

Branch Naming Convention

- feature/
- fix/
- refactor/
- docs/
- hotfix/

---

# 35. Coding Standards

The project should follow consistent engineering standards.

---

## Naming

Components

```text
PascalCase
```

Functions

```text
camelCase
```

Variables

```text
camelCase
```

Constants

```text
UPPER_SNAKE_CASE
```

Folders

```text
kebab-case
```

---

## General Guidelines

- Prefer functional components.
- Use TypeScript strict mode.
- Keep functions small and focused.
- Avoid duplicated code.
- Write reusable utilities.
- Document complex logic.

---

# 36. CI/CD Pipeline

Recommended workflow:

```text
Git Push

↓

GitHub

↓

Vercel Build

↓

Type Check

↓

Lint

↓

Build

↓

Preview Deployment

↓

Production Deployment
```

Future improvements may include automated testing before deployment.

---

# 37. Scalability Strategy

The architecture is designed to scale horizontally as the platform grows.

Potential future enhancements include:

- Separate API services
- Background job processing
- Queue-based email delivery
- CDN optimization
- Advanced caching
- Search indexing
- Analytics services

The current architecture is intentionally modular to minimize future migration effort.

---

# 38. Future Architecture Considerations

The architecture should support future expansion without major restructuring.

Potential future additions include:

- Mobile Applications
- Push Notifications
- SMS Notifications
- Progressive Web App (PWA)
- Multi-language Support
- AI-powered Assistance
- Corporate Sponsorship Portal
- Advanced Analytics Dashboard
- Accounting Integration

These enhancements should be implemented as independent modules without impacting the existing architecture.

---

# 39. Architecture Decision Records (ADRs)

The following key architectural decisions have been made for Version 2.0:

| Decision | Rationale |
|----------|-----------|
| Next.js 15 | Modern React framework with App Router and Server Components |
| TypeScript | Strong type safety and maintainability |
| Supabase | Open-source BaaS with generous free tier |
| PostgreSQL | Reliable relational database |
| Leaflet + OpenStreetMap + OpenRouteService | Free mapping and routing during development |
| React Email + Resend | Modern email templating and delivery |
| Razorpay | Widely used payment gateway with test mode |
| Vercel | Simple and optimized deployment for Next.js |

---

# 40. Conclusion

The architecture of **Annapurna Foundation v2.0** has been designed to prioritize **maintainability**, **security**, **performance**, and **scalability** while remaining cost-effective during development.

By adopting a modular feature-based structure, leveraging Supabase as the backend platform, and relying on free-tier services where practical, the project establishes a strong technical foundation that supports both current MVP requirements and future expansion.

Together with **PRD.md** and **MVP.md**, this Architecture Document serves as the definitive technical blueprint for the Annapurna Foundation platform.

---

**End of ARCHITECTURE.md**