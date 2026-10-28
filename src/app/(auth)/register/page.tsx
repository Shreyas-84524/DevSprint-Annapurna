"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ShieldCheck, Mail, Lock, ArrowRight, HeartHandshake } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-brand-slate">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-brand-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        {/* Left Side: Branding / Info */}
        <div className="bg-brand-charcoal text-brand-white p-12 flex flex-col justify-between hidden md:flex">
          <div>
            <HeartHandshake size={48} className="text-brand-gold mb-6" />
            <h2 className="text-3xl font-extrabold mb-4">Join Annapurna.</h2>
            <p className="text-gray-400 text-lg">
              Connect surplus food directly with local families, shelters, and communities in need.
            </p>
          </div>

          <div className="space-y-4 text-sm text-gray-400">
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-brand-eco shrink-0 mt-0.5" size={20} />
              <span>Verified donors and requesters maintain food safety and trust.</span>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-brand-eco shrink-0 mt-0.5" size={20} />
              <span>Volunteers coordinate pickups and deliveries with full route visibility.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="text-center md:text-left mb-8">
            <h3 className="text-2xl font-bold text-brand-charcoal mb-2">Create Your Account</h3>
            <p className="text-gray-500 text-sm">Sign up and choose your participation role.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow"
                  placeholder="Repeat your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-md flex justify-center items-center gap-2 ${
                isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-brand-charcoal hover:bg-gray-800 hover:-translate-y-0.5"
              }`}
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  Continue to Onboarding <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-gold font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
