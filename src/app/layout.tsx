import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { FoodProvider } from "@/context/FoodContext";
import 'leaflet/dist/leaflet.css'

export const metadata: Metadata = {
  title: "Annapurna - Zero Hunger Platform",
  description: "A smart food redistribution platform connecting donors, beneficiaries, NGOs, and volunteers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-brand-slate text-brand-charcoal">
        <Navbar />
        <main className="flex-grow">
          <FoodProvider>{children}</FoodProvider>
        </main>
        <Footer />
      </body>
    </html>
  );
}
