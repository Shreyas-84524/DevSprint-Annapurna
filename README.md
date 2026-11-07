# Annapurna Foundation — Surplus Food Redistribution Platform

Annapurna is an unfinished food redistribution MVP that coordinates verified donors and requesters with authenticated delivery volunteers. The active plan is being rebuilt through the six-stage workflow under `docs/`.

---

## 🚀 Key Features
* **Food listings:** Verified donors publish time-sensitive food with a pickup location and optional image.
* **Whole-listing claims:** Verified requesters discover nearby food and atomically claim one listing.
* **Volunteer delivery:** Authenticated volunteers perform pickup QC, collection, tracking, handover, and delivery completion.
* **Requester confirmation:** The requester explicitly confirms receipt.
* **Retained CMS:** Useful blog, FAQ, gallery, event, and contact functionality will be reconnected after the core workflow.

Payments, payouts, wallets, Aadhaar collection, tax receipts, NGO management, and manual volunteer approval are outside the active MVP even where legacy code still exists.

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
│   │   ├── (public)/       # Landing and retained public/CMS pages
│   │   ├── dashboard/      # Donor, Volunteer, and legacy Beneficiary routes
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
Environment names and service setup are being re-established in Stages 2 and 6. Do not infer a working backend from placeholder values and do not put secrets in committed files.

### 2. Install & Start
```bash
npm install
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📖 Documentation
* [MVP](docs/product/MVP.md) and [PRD](docs/product/PRD.md) — authoritative product scope.
* [Architecture](docs/architecture/ARCHITECTURE.md), [data model](docs/architecture/DATA_MODEL.md), [API contracts](docs/architecture/API_CONTRACTS.md), and [ownership](docs/architecture/FILE_STRUCTURE.md).
