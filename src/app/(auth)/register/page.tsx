import { Utensils, HeartHandshake, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Get Started | Annapurna Food Rescue",
  description: "Join Annapurna as a food donor or requester using fast, secure mobile number verification.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-brand-slate">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-50 text-brand-gold border border-amber-100 shadow-sm mb-2">
            <HeartHandshake size={32} aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-charcoal tracking-tight">
            Join the Annapurna Network
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto">
            Get started in seconds with your mobile number. No passwords required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-4">
          {/* Option 1: Donor */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-transparent hover:border-amber-300 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                  Donate Food
                </span>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-brand-gold flex items-center justify-center border border-amber-100">
                  <Utensils size={24} aria-hidden="true" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-brand-charcoal">
                Register as Food Donor
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                List surplus meals from your restaurant, catering company, event, or kitchen. Verified local volunteers collect directly from your location.
              </p>
            </div>

            <div className="pt-8">
              <Link
                href="/login/donor"
                className="w-full py-4 px-6 rounded-2xl bg-brand-charcoal text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-gray-800 transition-all"
              >
                <span>Register with Mobile OTP</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Option 2: Requester */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-transparent hover:border-emerald-300 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  Request Food
                </span>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-brand-eco flex items-center justify-center border border-emerald-100">
                  <HeartHandshake size={24} aria-hidden="true" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-brand-charcoal">
                Register as Food Requester
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Connect with fresh food donations for community centers, shelters, or households. Respectful, private requests delivered directly.
              </p>
            </div>

            <div className="pt-8">
              <Link
                href="/login/requester"
                className="w-full py-4 px-6 rounded-2xl bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-emerald-800 transition-all"
              >
                <span>Register with Mobile OTP</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center pt-6 text-xs text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-brand-charcoal hover:underline">
            Choose role to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
