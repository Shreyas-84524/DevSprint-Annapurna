"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Utensils, Truck, HandHeart, CheckCircle, ArrowRight, BookOpen, Calendar, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-brand-white pt-16 pb-24 sm:pt-20 sm:pb-32 overflow-hidden border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="text-center lg:text-left lg:w-3/5">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-50 border border-yellow-200 text-brand-charcoal text-xs sm:text-sm font-semibold mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                <span>Hyperlocal Food Rescue & Redistribution</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-brand-charcoal tracking-tight mb-6 leading-tight"
              >
                Zero Hunger. Zero Waste. <br className="hidden sm:inline" />
                <span className="text-brand-gold">Infinite Impact.</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              >
                Annapurna is a verified, community-powered food logistics platform connecting commercial and household surplus food directly with people and shelters who need it most.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4"
              >
                <Link 
                  href="/dashboard/donor"
                  className="px-8 py-4 bg-brand-gold text-brand-charcoal rounded-xl font-bold text-base sm:text-lg hover:bg-yellow-500 transition-all hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
                >
                  <HandHeart size={20} aria-hidden="true" />
                  <span>Donate Food</span>
                </Link>
                <Link 
                  href="/dashboard/beneficiary"
                  className="px-8 py-4 bg-brand-charcoal text-white rounded-xl font-bold text-base sm:text-lg hover:bg-gray-800 transition-all hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
                >
                  <Utensils size={20} aria-hidden="true" />
                  <span>Request Meals</span>
                </Link>
              </motion.div>
            </div>
            
            {/* Mission Hero Graphic */}
            <div className="w-full lg:w-2/5 mt-8 lg:mt-0">
              <div className="bg-gradient-to-br from-brand-charcoal to-gray-900 rounded-3xl p-8 text-white shadow-xl border border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl" />
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-brand-gold">
                  <ShieldCheck size={24} aria-hidden="true" /> Verified Safety Pipeline
                </h3>
                <ul className="space-y-4 text-sm text-gray-300">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={18} className="text-brand-gold shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Every batch inspected with mandatory visual and olfactory Quality Control (QC).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={18} className="text-brand-gold shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Zero waste automated rerouting to animal shelters if human consumption window closes.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={18} className="text-brand-gold shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Strict privacy protection: exact location revealed only to the assigned volunteer.</span>
                  </li>
                </ul>

                <div className="mt-8 pt-6 border-t border-gray-800 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    Active in community centers
                  </div>
                  <Link
                    href="/standards"
                    className="text-xs text-brand-gold font-bold hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold rounded"
                  >
                    <span>Read Standards</span>
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 sm:py-24 bg-brand-slate" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-extrabold text-brand-charcoal mb-4">
              How Annapurna Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-base sm:text-lg">
              Our synchronized food rescue workflow moves safely prepared meals from donors to recipients within hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-yellow-50 text-brand-gold rounded-2xl flex items-center justify-center mb-6">
                  <HandHeart size={28} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-brand-charcoal mb-3">1. Donors List Surplus</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Restaurants, caterers, and households post freshly prepared surplus food with preparation time, dietary tags, and pickup address.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-50">
                <Link
                  href="/dashboard/donor"
                  className="text-sm font-bold text-brand-gold hover:underline inline-flex items-center gap-1"
                >
                  Create Listing <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-emerald-50 text-brand-eco rounded-2xl flex items-center justify-center mb-6">
                  <Truck size={28} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-brand-charcoal mb-3">2. Volunteers Deliver</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Community delivery volunteers accept nearby routes, verify packaging and food quality at pickup, and transport meals swiftly.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-50">
                <Link
                  href="/dashboard/volunteer"
                  className="text-sm font-bold text-brand-eco hover:underline inline-flex items-center gap-1"
                >
                  View Delivery Tasks <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Utensils size={28} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-brand-charcoal mb-3">3. Requesters Receive</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Individuals, families, and NGO shelters claim available portions and confirm receipt directly via SMS/OTP verification with dignity.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-50">
                <Link
                  href="/dashboard/beneficiary"
                  className="text-sm font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Claim Food <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Engagement Section */}
      <section className="py-20 sm:py-24 bg-white" aria-labelledby="community-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand-charcoal rounded-3xl p-8 sm:p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h2 id="community-heading" className="text-3xl sm:text-4xl font-extrabold mb-4">
                Join the Zero Hunger Mission
              </h2>
              <p className="text-gray-300 text-base sm:text-lg mb-8 leading-relaxed">
                Whether you have surplus food from today’s gathering or a scooter to transport meals to a local community kitchen, your action directly saves meals.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard/volunteer"
                  className="px-6 py-3 bg-brand-gold text-brand-charcoal rounded-xl font-bold hover:bg-yellow-500 transition-colors shadow-sm"
                >
                  Deliver as Volunteer
                </Link>
                <Link
                  href="/blog"
                  className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <BookOpen size={16} aria-hidden="true" />
                  <span>Read Stories</span>
                </Link>
                <Link
                  href="/events"
                  className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Calendar size={16} aria-hidden="true" />
                  <span>Upcoming Drives</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
