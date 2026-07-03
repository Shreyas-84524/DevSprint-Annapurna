"use client";

import { useState, useEffect, Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { motion } from "framer-motion";
import { Heart, Truck, Users, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function DonatePageContent() {
  const [loadingTier, setLoadingTier] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("success")) {
      setSuccess(true);
    }
  }, [searchParams]);

  const handleCheckout = async (amount: number, title: string) => {
    setLoadingTier(amount);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, title }),
      });
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error redirecting to checkout:", error);
    } finally {
      setLoadingTier(null);
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-green-50 p-12 rounded-3xl border border-green-100 shadow-sm">
          <CheckCircle2 size={80} className="mx-auto text-brand-eco mb-6" />
          <h1 className="text-4xl font-bold text-brand-charcoal mb-4">Thank You!</h1>
          <p className="text-xl text-gray-600 mb-8">Your generous donation will directly fund our volunteers and help deliver more surplus food to those in need.</p>
          <a href="/" className="px-8 py-3 bg-brand-charcoal text-white rounded-lg font-bold hover:bg-gray-800">Return Home</a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <Heart size={48} className="mx-auto text-red-500 mb-4" />
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-6">Fuel the Logistics</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Annapurna is powered by volunteer drivers who deliver surplus food. 
          Your donation pays for their time and fuel at ₹20/km. 
          Support the movement and keep the food moving.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Tier 1 */}
        <div className="bg-brand-white p-8 rounded-2xl shadow-md border border-gray-100 hover:border-brand-gold transition-colors flex flex-col">
          <Truck size={32} className="text-brand-gold mb-4" />
          <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Sponsor 1 Delivery</h2>
          <p className="text-gray-600 mb-6 flex-grow">Covers the average volunteer fuel cost for picking up and dropping off one large food donation.</p>
          <div className="text-4xl font-black text-brand-charcoal mb-6">₹100</div>
          <button 
            onClick={() => handleCheckout(100, "Sponsor 1 Delivery")}
            disabled={loadingTier !== null}
            className="w-full py-4 bg-yellow-50 text-brand-gold border-2 border-brand-gold rounded-xl font-bold hover:bg-brand-gold hover:text-white transition-colors"
          >
            {loadingTier === 100 ? "Processing..." : "Donate ₹100"}
          </button>
        </div>

        {/* Tier 2 */}
        <div className="bg-brand-charcoal p-8 rounded-2xl shadow-xl border border-gray-800 transform md:-translate-y-4 flex flex-col text-white relative">
          <div className="absolute top-0 right-0 bg-brand-gold text-brand-charcoal text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">MOST IMPACTFUL</div>
          <Users size={32} className="text-brand-gold mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sponsor 5 Deliveries</h2>
          <p className="text-gray-300 mb-6 flex-grow">Keep an entire neighborhood fed by ensuring volunteers can complete multiple routes.</p>
          <div className="text-4xl font-black mb-6 text-brand-gold">₹500</div>
          <button 
            onClick={() => handleCheckout(500, "Sponsor 5 Deliveries")}
            disabled={loadingTier !== null}
            className="w-full py-4 bg-brand-gold text-brand-charcoal rounded-xl font-bold hover:bg-yellow-500 transition-colors shadow-lg"
          >
            {loadingTier === 500 ? "Processing..." : "Donate ₹500"}
          </button>
        </div>

        {/* Tier 3 */}
        <div className="bg-brand-white p-8 rounded-2xl shadow-md border border-gray-100 hover:border-brand-eco transition-colors flex flex-col">
          <Heart size={32} className="text-brand-eco mb-4" />
          <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Fleet Sponsor</h2>
          <p className="text-gray-600 mb-6 flex-grow">Fund an entire day's worth of warehouse operations and volunteer logistics.</p>
          <div className="text-4xl font-black text-brand-charcoal mb-6">₹2000</div>
          <button 
            onClick={() => handleCheckout(2000, "Fleet Sponsor")}
            disabled={loadingTier !== null}
            className="w-full py-4 bg-green-50 text-brand-eco border-2 border-brand-eco rounded-xl font-bold hover:bg-brand-eco hover:text-white transition-colors"
          >
            {loadingTier === 2000 ? "Processing..." : "Donate ₹2000"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><span className="animate-spin w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full"></span></div>}>
      <DonatePageContent />
    </Suspense>
  );
}
