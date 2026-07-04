# Part 3

---

# 13. User Flows

This section defines the expected end-to-end workflows for every primary user of the Annapurna Foundation platform.

---

# 13.1 Visitor Journey

### Objective

Allow visitors to understand the foundation, build trust, and encourage them to become donors or volunteers.

### Flow

Landing Page

↓

Explore About Us

↓

Browse Events / Gallery / Blog

↓

Read FAQs

↓

Choose Action

├── Donate
├── Become Volunteer
├── Contact Foundation
└── Create Account

---

# 13.2 User Registration Flow

Landing Page

↓

Sign Up

↓

Enter Name

↓

Enter Email

↓

Create Password

↓

Email Verification (if enabled)

↓

Account Created

↓

Redirect to Dashboard

---

# 13.3 Login Flow

Landing Page

↓

Login

↓

Choose Login Method

├── Email & Password
└── Google Sign-In

↓

Authentication

↓

Dashboard

---

# 13.4 Monetary Donation Flow

Dashboard / Donate Page

↓

Choose Donation Amount

↓

Enter Donation Details

↓

Proceed to Payment

↓

Payment Successful

↓

Donation Recorded

↓

Receipt Generated

↓

Donation History Updated

---

# 13.5 Food Donation Flow

Dashboard

↓

Create Food Donation

↓

Enter Food Details

↓

Enter Pickup Address

↓

Select Pickup Time

↓

Submit Request

↓

Administrator Verification

↓

Volunteer Assigned

↓

Volunteer Accepts Task

↓

Volunteer Travels to Donor

↓

Food Collected

↓

Volunteer Travels to Beneficiary

↓

Food Delivered

↓

Task Completed

↓

Donation Record Updated

---

# 13.6 Volunteer Registration Flow

Volunteer Page

↓

Application Form

↓

Submit Application

↓

Administrator Review

↓

Approved / Rejected

↓

Volunteer Dashboard Access

---

# 13.7 Volunteer Assignment Flow

Administrator Dashboard

↓

Review Food Donation

↓

Assign Volunteer

↓

Volunteer Receives Assignment

↓

Volunteer Accepts

↓

Task Begins

↓

Pickup

↓

Delivery

↓

Task Completion

↓

Compensation Calculated

---

# 13.8 Volunteer Navigation Flow

Assigned Task

↓

Open Map

↓

Navigate to Donor

↓

Collect Donation

↓

Navigate to Beneficiary

↓

Complete Delivery

↓

Update Status

↓

Task Closed

---

# 13.9 Receipt Generation Flow

Donation Completed

↓

Generate Receipt

↓

Assign Receipt Number

↓

Store Receipt

↓

User Downloads Receipt

---

# 13.10 Blog Publishing Flow

Administrator Login

↓

Create Blog

↓

Upload Featured Image

↓

Write Content

↓

Preview

↓

Publish

↓

Visible on Website

---

# 13.11 FAQ Management Flow

Administrator Login

↓

Create FAQ

↓

Add Question

↓

Add Answer

↓

Publish

↓

Visible on Website

---

# 13.12 Contact Flow

Visitor

↓

Open Contact Page

↓

Submit Contact Form

↓

Message Stored

↓

Administrator Reviews

↓

Foundation Responds

---

# 14. Page Requirements

---

# 14.1 Home Page

## Purpose

Introduce visitors to the Annapurna Foundation.

## Components

- Hero Section
- About Preview
- Mission Statement
- Featured Events
- Featured Blogs
- Donation CTA
- Volunteer CTA
- Testimonials
- Footer

---

# 14.2 About Page

## Purpose

Provide information about the organization.

## Sections

- Foundation Story
- Mission
- Vision
- Core Values
- Objectives
- Leadership Team

---

# 14.3 Events Page

## Purpose

Display upcoming and previous foundation events.

## Features

- Event Cards
- Event Details
- Event Images
- Event Date
- Event Location

---

# 14.4 Gallery Page

## Purpose

Showcase the impact of the foundation.

## Features

- Photo Gallery
- Image Categories
- Lightbox Preview

---

# 14.5 Blog Page

## Purpose

Share updates and stories.

## Features

- Blog Listing
- Search (future)
- Featured Image
- Author
- Publish Date
- Reading Time

---

# 14.6 FAQ Page

## Purpose

Answer common questions.

## Features

- Accordion Layout
- Categorized Questions
- Expand/Collapse Answers

---

# 14.7 Volunteer Page

## Purpose

Encourage visitors to become volunteers.

## Features

- Volunteer Benefits
- Responsibilities
- Eligibility
- Application Form

---

# 14.8 Donate Page

## Purpose

Enable users to support the foundation.

## Sections

- Monetary Donation
- Food Donation
- Donation Information
- Frequently Asked Donation Questions

---

# 14.9 Contact Page

## Purpose

Allow visitors to contact the foundation.

## Features

- Contact Form
- Address
- Email
- Phone Number
- Google Maps / OpenStreetMap Location

---

# 14.10 Privacy Policy Page

## Purpose

Display the organization's privacy practices.

## Content

- Data Collection
- Data Usage
- User Rights
- Cookies
- Third-Party Services

---

# 14.11 Terms & Conditions Page

## Purpose

Define website usage terms.

## Sections

- User Responsibilities
- Donation Policy
- Copyright
- Liability
- Account Usage

---

# 14.12 Authentication Pages

## Login

Features

- Email Login
- Google Login
- Forgot Password

---

## Register

Features

- Name
- Email
- Password
- Confirm Password

---

# 15. Dashboard Requirements

---

# 15.1 Donor Dashboard

## Purpose

Allow donors to manage their account and donations.

## Modules

### Dashboard Overview

- Welcome Message
- Total Donations
- Recent Activity

---

### Profile

- Update Name
- Update Profile Picture
- Update Contact Information

---

### Donation History

- Monetary Donations
- Food Donations
- Donation Status

---

### Receipts

- Download Receipt
- View Previous Receipts

---

### Account Settings

- Change Password
- Logout

---

# 15.2 Volunteer Dashboard

## Purpose

Allow volunteers to manage assigned work.

## Modules

### Dashboard Overview

- Assigned Tasks
- Pending Tasks
- Completed Tasks

---

### Assigned Deliveries

Display

- Donor Information
- Beneficiary Information
- Pickup Address
- Delivery Address

---

### Live Navigation

Display

- Current Route
- Estimated Distance
- Estimated Time

Implementation will use:

- Leaflet
- OpenStreetMap
- OpenRouteService

---

### Task Status

Volunteer can update:

- Assigned
- Accepted
- Reached Donor
- Food Collected
- Reached Beneficiary
- Delivered
- Completed

---

### Compensation

Display

- Total Distance Travelled
- Rate Per Kilometer

Default Compensation Rate

₹10 / Kilometer

Compensation Formula

Volunteer Compensation =
Distance × Compensation Rate

The compensation rate should remain configurable through the Admin Dashboard instead of being hardcoded.

---

### Profile

Volunteer can

- Update Profile
- Change Password
- Logout

---

# 16. Administrator Module Requirements

The Administrator Dashboard serves as the operational control center of the platform.

---

# 16.1 Dashboard Overview

Display

- Total Users
- Total Donors
- Total Volunteers
- Total Partner NGOs
- Total Donations
- Food Donations
- Pending Requests
- Completed Deliveries

---

# 16.2 User Management

Administrator can

- View Users
- Edit Users
- Activate Accounts
- Deactivate Accounts
- Assign Roles

---

# 16.3 Donation Management

Administrator can

- View Monetary Donations
- View Food Donations
- Verify Food Donation Requests
- Update Donation Status
- View Donation History

---

# 16.4 Volunteer Management

Administrator can

- Review Applications
- Approve Volunteers
- Reject Volunteers
- Assign Deliveries
- View Volunteer History
- View Volunteer Compensation

---

# 16.5 Partner NGO Management

Administrator can

- Add Partner NGO
- Update NGO Information
- Remove NGO
- View Assigned Beneficiaries

---

# 16.6 Blog Management

Administrator can

- Create Blog
- Edit Blog
- Publish Blog
- Delete Blog

---

# 16.7 FAQ Management

Administrator can

- Create FAQ
- Edit FAQ
- Delete FAQ

---

# 16.8 Event Management

Administrator can

- Create Event
- Update Event
- Delete Event

---

# 16.9 Gallery Management

Administrator can

- Upload Images
- Categorize Images
- Delete Images

---

# 16.10 Contact Management

Administrator can

- View Contact Requests
- Mark Requests as Resolved
- Archive Requests

---

# 16.11 System Settings

Administrator can configure

- Volunteer Compensation Rate
- Foundation Contact Information
- Social Media Links
- Donation Settings
- Website Footer Information

---

# End of Part 3

The final part of the PRD will include:

- Database Requirements
- Third-Party Integrations
- Security Requirements
- Acceptance Criteria
- Success Metrics
- Risks & Assumptions
- Development Roadmap
- Future Scope