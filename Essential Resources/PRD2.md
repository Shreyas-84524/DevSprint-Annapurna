# Part 2

---
9. User Roles & Permissions

The Annapurna Foundation platform follows a Role-Based Access Control (RBAC) model. Every authenticated user is assigned a predefined role that determines the features and resources they can access. This approach ensures security, minimizes unauthorized actions, and simplifies permission management.

9.1 Visitor (Unauthenticated User)
Description

A visitor is any individual accessing the website without creating an account or signing in.

Permissions

Visitors can:

View the Home page
Read About Us
Browse Events
View Gallery
Read Blog articles
Access FAQs
Read Privacy Policy
Read Terms & Conditions
View Contact information
Submit the Contact form
Apply to become a Volunteer
View Donation page
Register for an account
Sign in
Restrictions

Visitors cannot:

Donate as a registered donor
View dashboards
Access donation history
Download receipts
View volunteer assignments
Access administrative resources
9.2 Donor
Description

A donor is a registered user who contributes monetary donations or food donations.

Permissions

Donors can:

Update profile information
Change password
Donate money
Submit food donation requests
View donation history
Download donation receipts
Track donation status
View completed donations
Contact administrators
Restrictions

Donors cannot:

Access volunteer management
Access administrative dashboards
Modify website content
Assign volunteers
Manage users
9.3 Volunteer
Description

Volunteers assist the foundation by collecting food donations from donors and delivering them to beneficiaries.

Permissions

Volunteers can:

View assigned tasks
Accept or reject assignments
View donor pickup details
View beneficiary details
Navigate using integrated map services
Update task status
Mark delivery milestones
View completed deliveries
View earned compensation based on travelled distance
Update personal profile
Restrictions

Volunteers cannot:

Assign themselves new tasks
Access donor payment records
Modify website content
Access admin modules
Delete donations
9.4 Partner NGO
Description

Partner NGOs collaborate with the foundation for identifying beneficiaries and coordinating successful deliveries.

Permissions

Partner NGOs can:

View assigned beneficiaries
Update beneficiary information
Coordinate with foundation administrators
Confirm successful deliveries
View assigned donation requests
Restrictions

Partner NGOs cannot:

Modify website content
Manage users
Access financial reports
Assign volunteers
Manage donations outside assigned records
9.5 Administrator
Description

Administrators manage the entire platform and oversee all operational workflows.

Permissions

Administrators can:

Manage all users
Manage donations
Verify donation requests
Assign volunteers
Manage blogs
Manage FAQs
Manage events
Manage gallery
Manage contact submissions
Generate reports
Generate receipts
Manage partner NGOs
View platform analytics
Configure platform settings
Restrictions

Administrative privileges should only be available to verified foundation personnel.

10. Product Features

This section defines every feature included within Version 2.0 of the Annapurna Foundation platform.

10.1 Public Website

The public-facing website serves as the primary communication platform for the foundation.

Features include:

Responsive homepage
About Us
Mission & Vision
Events
Gallery
Volunteer information
Donation information
Blog
FAQ
Contact page
Privacy Policy
Terms & Conditions
10.2 Authentication Module

The authentication module provides secure access to user-specific features.

Supported authentication methods:

Email & Password
Google Sign-In

Features include:

User registration
Login
Logout
Password reset
Session management
Protected routes
10.3 Donation Module

The donation system supports both monetary and food donations.

Monetary Donation

Features include:

Donation amount selection
Secure payment gateway
Payment confirmation
Receipt generation
Donation history
Food Donation

The food donation workflow includes:

Food details submission
Pickup location
Pickup time
Food quantity
Donation verification
Volunteer assignment
Delivery confirmation
Completion status
10.4 Volunteer Module

The volunteer management system enables efficient coordination between the foundation and registered volunteers.

Features include:

Volunteer registration
Volunteer application
Application review
Volunteer approval
Assignment management
Task tracking
Delivery status updates
Compensation tracking
10.5 Live Tracking Module

The live tracking module assists volunteers in completing food donation deliveries efficiently.

The module should provide:

Donor pickup location
Beneficiary delivery location
Route guidance
Estimated travel distance
Estimated travel time

During development, the system will use free-tier mapping solutions.

Preferred implementation:

Leaflet
OpenStreetMap
OpenRouteService
10.6 Blog Module

The foundation should be able to publish articles and updates.

Features include:

Blog listing
Individual blog pages
Rich text content
Featured image
Publish date
Author information

Administrators should be able to:

Create blogs
Edit blogs
Delete blogs
Publish blogs
10.7 FAQ Module

The FAQ module provides answers to frequently asked questions.

Features include:

FAQ listing
Expand/collapse answers
Category grouping

Administrators should be able to:

Add FAQs
Edit FAQs
Delete FAQs
10.8 Contact Module

Visitors should be able to contact the foundation.

Features include:

Contact form
Email notifications
Submission storage
Admin dashboard visibility
10.9 Dashboard Module

The dashboard provides personalized functionality for authenticated users.

Donor Dashboard

Features include:

Profile
Donation history
Receipt downloads
Food donation history
Account settings
Volunteer Dashboard

Features include:

Assigned tasks
Completed tasks
Pending assignments
Compensation history
Profile management
Administrator Dashboard

The administrative dashboard includes:

User management
Donation management
Volunteer management
Partner NGO management
Blog management
FAQ management
Contact management
Gallery management
Event management
11. Functional Requirements
11.1 Authentication

The system shall:

Allow user registration.
Allow secure login.
Allow Google authentication.
Store authenticated sessions securely.
Restrict protected pages to authenticated users.
11.2 User Management

The system shall:

Allow profile updates.
Store user information.
Support role assignment.
Restrict unauthorized actions.
11.3 Donation Management

The system shall:

Accept monetary donations.
Accept food donation requests.
Record donation history.
Generate downloadable receipts.
Maintain donation status.
11.4 Volunteer Management

The system shall:

Accept volunteer applications.
Allow administrators to approve or reject applications.
Assign volunteers to verified food donation requests.
Record assignment history.
Track completion status.
11.5 Food Donation Workflow

The workflow shall follow the sequence below:

Food Donation Created

↓

Administrator Verification

↓

Volunteer Assigned

↓

Volunteer Accepts Assignment

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

Receipt Generated (where applicable)

11.6 Receipt Generation

The system shall automatically generate downloadable receipts after successful monetary donations.

Receipts should include:

Receipt Number
Donor Name
Donation Amount
Donation Date
Transaction Reference
Foundation Information

For food donations, the system shall generate an acknowledgment receipt confirming successful collection and delivery.

11.7 Blog Management

Administrators shall:

Publish blogs
Edit blogs
Delete blogs
Manage blog visibility

Visitors shall:

Read published blogs
Browse previous articles
11.8 FAQ Management

Administrators shall:

Create FAQs
Edit FAQs
Remove FAQs

Visitors shall:

Browse FAQs
Expand answers
11.9 Contact Management

Visitors shall:

Submit contact requests

Administrators shall:

View submissions
Respond externally
Archive completed requests
12. Non-Functional Requirements
12.1 Performance

The platform should:

Load pages within acceptable response times.
Optimize image loading.
Minimize unnecessary API requests.
Support lazy loading where appropriate.
12.2 Security

The platform shall:

Encrypt sensitive information.
Use secure authentication.
Restrict access through role-based permissions.
Validate all user inputs.
Protect against common web vulnerabilities.
12.3 Scalability

The architecture should support future expansion without requiring major redesign.

12.4 Availability

The application should maintain high uptime and recover gracefully from temporary service interruptions.

12.5 Accessibility

The platform should follow modern accessibility practices, including:

Keyboard navigation
Proper semantic HTML
Screen reader compatibility
Adequate color contrast
12.6 Responsiveness

The application must function correctly across:

Desktop
Laptop
Tablet
Mobile devices
12.7 Maintainability

The codebase should be:

Modular
Well documented
Strongly typed
Reusable
Easy to extend
12.8 Reliability

Critical operations such as authentication, donation recording, volunteer assignment, and receipt generation must execute consistently without data loss.