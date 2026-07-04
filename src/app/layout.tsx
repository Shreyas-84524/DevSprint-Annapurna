import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { FoodProvider } from "@/context/FoodContext";
import 'leaflet/dist/leaflet.css'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
