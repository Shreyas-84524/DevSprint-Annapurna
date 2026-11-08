import { HeartHandshake, Utensils, Truck, ShieldCheck, ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Sign In | Annapurna Food Rescue",
  description: "Select your role to sign in to the Annapurna zero-hunger food redistribution network.",
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-brand-slate">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-50 text-brand-gold border border-amber-100 shadow-sm mb-2">
            <HeartHandshake size={32} aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-charcoal tracking-tight">
            Welcome to Annapurna
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto">
            Choose how you would like to participate in our community food redistribution network.
          </p>
        </div>

        {/* Distinct Role Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-4">
          {/* Card 1: Donor */}
          <div className="relative group bg-white rounded-3xl p-8 sm:p-10 border-2 border-transparent hover:border-amber-300 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                  Food Donor
                </span>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-brand-gold flex items-center justify-center border border-amber-100">
                  <Utensils size={24} aria-hidden="true" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-brand-charcoal">
                I want to donate food
              </h2>

              <p className="text-sm text-gray-600 leading-relaxed">
                Connect your restaurant, catered event, cafeteria, or household surplus with verified local community distributions. Fast pickup coordination with real-time tracking.
              </p>

              <ul className="text-xs text-gray-500 space-y-2 pt-2 border-t border-gray-100">
                <li className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-eco flex-shrink-0" />
                  <span>Verified, thermal-insulated volunteer pickup</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-eco flex-shrink-0" />
                  <span>Instant sign-in with email and password</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/login/donor"
                className="w-full py-4 px-6 rounded-2xl bg-brand-charcoal text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 transition-all group-hover:bg-amber-600"
              >
                <span>Continue as Food Donor</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Card 2: Requester */}
          <div className="relative group bg-white rounded-3xl p-8 sm:p-10 border-2 border-transparent hover:border-emerald-300 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  Food Requester
                </span>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-brand-eco flex items-center justify-center border border-emerald-100">
                  <HeartHandshake size={24} aria-hidden="true" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-brand-charcoal">
                I need food
              </h2>

              <p className="text-sm text-gray-600 leading-relaxed">
                Find wholesome, quality-inspected meals for yourself, family, shelter, or community center. Dignified, private requests with no bureaucracy or public queues.
              </p>

              <ul className="text-xs text-gray-500 space-y-2 pt-2 border-t border-gray-100">
                <li className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-eco flex-shrink-0" />
                  <span>Respectful, private community food assistance</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-eco flex-shrink-0" />
                  <span>Direct delivery by trained local volunteers</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/login/requester"
                className="w-full py-4 px-6 rounded-2xl bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all"
              >
                <span>Continue to Request Food</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {/* Secondary Access: Volunteer & Staff/Admin */}
        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-brand-gold" />
            <span>Are you a delivery volunteer?</span>
            <Link
              href="/login/volunteer"
              className="font-bold text-brand-charcoal hover:underline ml-1"
            >
              Sign in as Volunteer
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <KeyRound size={14} className="text-gray-400" />
            <span>Staff or Administrator?</span>
            <Link
              href="/login/admin"
              className="font-bold text-gray-600 hover:text-brand-charcoal hover:underline"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
