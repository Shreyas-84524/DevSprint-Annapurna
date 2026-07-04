"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Heart, ShieldCheck, CheckCircle2, Utensils } from "lucide-react";

export default function SponsorPage() {
  const [amount, setAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDonate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Mock processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
    }, 2000);
  };

  const currentAmount = amount || Number(customAmount) || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <Heart size={48} className="mx-auto text-brand-gold mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-brand-charcoal mb-4">Fuel the Mission</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Your sponsorship covers logistics, app maintenance, and expands our reach. Every $1 sponsors roughly 10 rescued meals.
        </p>
      </div>

      <div className="bg-brand-white rounded-3xl shadow-xl overflow-hidden border border-brand-slate flex flex-col md:flex-row">
        
        {/* Left Side: Form */}
        <div className="p-8 md:p-12 w-full md:w-3/5">
          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <h2 className="text-2xl font-bold text-brand-charcoal mb-6">Choose Sponsorship Amount</h2>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => { setAmount(preset); setCustomAmount(""); }}
                      className={`py-3 rounded-xl font-bold text-lg transition-all ${
                        amount === preset 
                          ? "bg-brand-gold text-brand-white shadow-md ring-2 ring-brand-gold ring-offset-2" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      placeholder="Other amount"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setAmount(null);
                      }}
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow font-semibold"
                    />
                  </div>
                </div>

                <form onSubmit={handleDonate}>
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input required type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow" placeholder="Full Name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input required type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow" placeholder="Email Address" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || currentAmount <= 0}
                    className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg flex justify-center items-center gap-2 ${
                      isProcessing || currentAmount <= 0 ? "bg-gray-400 cursor-not-allowed" : "bg-brand-charcoal hover:bg-gray-800 hover:-translate-y-1"
                    }`}
                  >
                    {isProcessing ? (
                       <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <CreditCard size={20} />
                        Sponsor ${currentAmount || "0"}
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-12"
              >
                <div className="w-20 h-20 bg-green-100 text-brand-eco rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-extrabold text-brand-charcoal mb-4">Thank You!</h2>
                <p className="text-gray-600 text-lg mb-8">
                  Your generous sponsorship of ${currentAmount} helps us rescue approximately <span className="font-bold text-brand-eco">{currentAmount * 10} meals</span>.
                </p>
                <button
                  onClick={() => { setSuccess(false); setAmount(50); setCustomAmount(""); }}
                  className="px-8 py-3 bg-brand-slate text-brand-charcoal font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Sponsor Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Info / Impact */}
        <div className="bg-brand-slate p-8 md:p-12 w-full md:w-2/5 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-200">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-brand-charcoal mb-4">Your Impact</h3>
            <div className="bg-brand-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-brand-gold opacity-10">
                <Utensils size={100} />
              </div>
              <div className="text-4xl font-extrabold text-brand-eco mb-1">
                {currentAmount > 0 ? (currentAmount * 10).toLocaleString() : 0}
              </div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Meals Rescued
              </div>
            </div>
          </div>

          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <ShieldCheck className="text-brand-eco flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-600">Secure, encrypted payment processing.</p>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="text-brand-eco flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-600">100% of your donation goes directly toward platform logistics and operations.</p>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="text-brand-eco flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-600">Tax-deductible receipt will be sent to your email instantly.</p>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
