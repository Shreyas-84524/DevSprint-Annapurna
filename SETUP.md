# Setup Instructions — Annapurna Foundation v2.0

Follow this step-by-step guide to configure the application in your local environment.

---

## 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js:** v18.0.0 or higher
* **npm:** v9.0.0 or higher
* **Git**

---

## 2. Installation
Clone the repository, navigate to the folder, and install the dependencies:
```bash
git clone <repository-url>
cd annapurna
npm install
```

---

## 3. Environment Variables Configuration
Copy the `.env.example` file to create your local `.env.local` file:
```bash
cp .env.example .env.local
```
Fill in the credentials as outlined in the following sections.

---

## 4. Supabase Setup
1. Create a free account at [supabase.com](https://supabase.com).
2. Start a new project and retrieve your **Supabase URL** and **Anon API Key** from the Project API settings.
3. Add these keys to your `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. Navigate to the SQL Editor in your Supabase dashboard and run the migrations:
   * Execute the schema SQL found in: `supabase/migrations/20260703000002_full_schema.sql`.
5. Run the following query to initialize default storage buckets:
   ```sql
   INSERT INTO storage.buckets (id, name, public) VALUES 
     ('avatars', 'avatars', false),
     ('blogs', 'blogs', true),
     ('gallery', 'gallery', true),
     ('receipts', 'receipts', false),
     ('documents', 'documents', false)
   ON CONFLICT (id) DO NOTHING;
   ```

---

## 5. OpenRouteService Integration
The volunteer navigation utilizes OpenStreetMap and OpenRouteService (ORS).
1. Create a free developer account at [openrouteservice.org](https://openrouteservice.org/).
2. Request a free token.
3. Add it to your `.env.local`:
   ```env
   NEXT_PUBLIC_ORS_API_KEY=your-ors-api-key
   ```

---

## 6. Razorpay Payment Setup (Mocked Mode)
To simulate transactions without configuring merchant accounts:
* Razorpay popup is mocked inside `src/app/(public)/donate/page.tsx`.
* It hits `/api/checkout` to create a simulated checkout order and records the donation status as `completed` in `monetary_donations`.

---

## 7. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.
