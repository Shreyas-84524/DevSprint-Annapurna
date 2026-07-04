# Annapurna Foundation — Surplus Food Redistribution Platform

Annapurna Foundation is a high-fidelity web platform that coordinates food redistribution campaigns, manages volunteer logistics, accepts monetary donations, and connects partner NGOs to local soup kitchens and hunger relief projects.

---

## 🚀 Key Features
* **Surplus Food Donation:** Donors can log food items, select preferred pickup dates/times, and track collection statuses.
* **Volunteer Management:** Seamless driver onboarding, pickup-delivery task acceptance, Leaflet maps routing guidance, and automated travel mileage payouts.
* **Monetary Donations:** Real-time online charity sponsorship using mocked Razorpay gateways.
* **NGO & Beneficiary Coordination:** Coordinate local food distributions.
* **Admin Command Center:** Manage blogs, FAQs, media galleries, events, user permissions, and audit logs.

---

## 🛠️ Tech Stack
* **Framework:** Next.js 16 (App Router)
* **Language:** TypeScript (Strict Type Safety)
* **Styling:** Tailwind CSS v4 & Framer Motion
* **Database & Auth:** Supabase PostgreSQL & Row Level Security (RLS)
* **Maps & Navigation:** Leaflet, OpenStreetMap, OpenRouteService (ORS)
* **Forms:** React Hook Form & Zod Validation

---

## 📁 Folder Structure
```text
annapurna/
├── src/
│   ├── app/                # Next.js App Router Pages
│   │   ├── (auth)/         # User login & registration
│   │   ├── (public)/       # Landing, About, Contact, FAQ, Blog, Donate
│   │   ├── dashboard/      # Donor, Volunteer, and Beneficiary dashboards
│   │   └── admin/          # Admin operations command center
│   ├── components/         # Reusable React components
│   │   ├── ui/             # Core UI components
│   │   ├── map/            # Leaflet map integrations
│   │   └── layout/         # Header, Footer, and Navbar wrappers
│   ├── services/           # Supabase query handlers
│   ├── types/              # Unified TypeScript definitions
│   └── utils/              # Mapping and error utilities
├── supabase/
│   └── migrations/         # PostgreSQL schema migration files
```

---

## 🔧 Getting Started

### 1. Configure Credentials
Copy the environment variables template:
```bash
cp .env.example .env.local
```
Fill in the variables in `.env.local`.

### 2. Install & Start
```bash
npm install
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📖 Documentation
* [SETUP.md](SETUP.md) — Detailed environment setup, database migrations, and integration parameters.
* [DEPLOYMENT.md](DEPLOYMENT.md) — Production release checklists and Vercel hosting instructions.
