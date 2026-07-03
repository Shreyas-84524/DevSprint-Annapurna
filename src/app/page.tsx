"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Utensils, HeartHandshake, Truck, MapPin, HandHeart } from "lucide-react";

const ADS_HERO = [
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=400&h=500&q=80",
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=400&h=500&q=80",
  "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=400&h=500&q=80",
];

const ADS_CTA = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=300&h=300&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=300&h=300&q=80",
];

export default function Home() {
  const [heroAd, setHeroAd] = useState<string>("");
  const [ctaAd, setCtaAd] = useState<string>("");

  useEffect(() => {
    setHeroAd(ADS_HERO[Math.floor(Math.random() * ADS_HERO.length)]);
    setCtaAd(ADS_CTA[Math.floor(Math.random() * ADS_CTA.length)]);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-brand-white pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="text-center lg:text-left lg:w-2/3">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-5xl md:text-6xl font-extrabold text-brand-charcoal tracking-tight mb-6"
              >
                Zero Hunger. Zero Waste. <br className="hidden lg:block" /><span className="text-brand-gold">Infinite Impact.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-xl text-gray-600 mb-10 lg:pr-8"
              >
                Annapurna is a smart food redistribution platform connecting surplus food with those who need it most. Join the movement today.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4"
              >
                <Link 
                  href="/donor"
                  className="px-8 py-4 bg-brand-gold text-brand-white rounded-lg font-bold text-lg hover:bg-yellow-600 transition-all hover:-translate-y-1 shadow-lg flex items-center justify-center gap-2"
                >
                  <HandHeart size={20} />
                  Donate Food
                </Link>
                <Link 
                  href="/beneficiary"
                  className="px-8 py-4 bg-brand-charcoal text-brand-white rounded-lg font-bold text-lg hover:bg-gray-800 transition-all hover:-translate-y-1 shadow-lg flex items-center justify-center gap-2"
                >
                  <Utensils size={20} />
                  Request a Meal
                </Link>
              </motion.div>
            </div>
            
            {/* Ad Space */}
            <div className="w-full lg:w-1/3 mt-12 lg:mt-0">
              {heroAd ? (
                <div className="w-full h-[400px] rounded-2xl overflow-hidden shadow-xl relative">
                  <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded z-10 backdrop-blur-sm">Sponsored</span>
                  <img src={heroAd} alt="Advertisement" className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" />
                </div>
              ) : (
                <div className="w-full h-[400px] bg-gray-100 rounded-2xl animate-pulse"></div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 bg-brand-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">How Annapurna Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Our localized logistics network ensures surplus food reaches hungry people quickly and safely.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <HandHeart size={32} />,
                title: "1. Donate Surplus",
                desc: "Restaurants, events, and individuals list their surplus edible food on our localized feed."
              },
              {
                icon: <MapPin size={32} />,
                title: "2. Claim & Match",
                desc: "Beneficiaries or NGOs claim the food. Our system finds the nearest available volunteer."
              },
              {
                icon: <Truck size={32} />,
                title: "3. Verify & Deliver",
                desc: "Volunteers pick up, perform a quick quality check, and deliver the food safely."
              }
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-brand-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center group hover:shadow-md transition-shadow"
              >
                <div className="mx-auto w-16 h-16 bg-yellow-50 text-brand-gold rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-brand-charcoal mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Stats (Mock) */}
      <section className="py-20 bg-brand-charcoal text-brand-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Meals Distributed", value: "12,450+" },
              { label: "Food Waste Saved", value: "5,200 kg" },
              { label: "Active Volunteers", value: "850+" },
              { label: "NGO Partners", value: "45" },
            ].map((stat, idx) => (
              <div key={idx} className="p-4">
                <div className="text-4xl md:text-5xl font-extrabold text-brand-gold mb-2">{stat.value}</div>
                <div className="text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-brand-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="text-center lg:text-left lg:w-2/3">
              <HeartHandshake size={48} className="mx-auto lg:mx-0 text-brand-eco mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-6">Become a Zero Hunger Hero</h2>
              <p className="text-xl text-gray-600 mb-10 lg:pr-12">Whether you want to deliver food, donate meals, or sponsor logistics, your contribution matters.</p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <Link 
                  href="/volunteer/login"
                  className="px-8 py-4 bg-brand-eco text-brand-white rounded-lg font-bold text-lg hover:bg-emerald-600 transition-colors shadow-lg"
                >
                  Become a Volunteer
                </Link>
                <Link 
                  href="/sponsor"
                  className="px-8 py-4 bg-brand-white text-brand-charcoal border-2 border-brand-slate rounded-lg font-bold text-lg hover:border-brand-gold transition-colors shadow-sm"
                >
                  Sponsor Our Mission
                </Link>
              </div>
            </div>
            
            {/* Ad Space */}
            <div className="w-full lg:w-1/3">
              {ctaAd ? (
                <div className="w-full h-[300px] rounded-2xl overflow-hidden shadow-lg relative">
                  <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded z-10 backdrop-blur-sm">Sponsored</span>
                  <img src={ctaAd} alt="Advertisement" className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" />
                </div>
              ) : (
                <div className="w-full h-[300px] bg-gray-100 rounded-2xl animate-pulse"></div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
