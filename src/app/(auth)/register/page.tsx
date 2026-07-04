"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ShieldCheck, User, Mail, Phone, CreditCard, HeartHandshake, ArrowRight, Fingerprint, Lock } from "lucide-react";
import Link from "next/link";

export default function VolunteerSignup() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [upiId, setUpiId] = useState("");
  const [password, setPassword] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role: "volunteer",
            upi_id: upiId,
            aadhaar,
          },
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        alert("Registration submitted! If email verification is enabled, check your inbox. Otherwise, redirecting...");
        router.push("/dashboard/volunteer");
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
            <h2 className="text-3xl font-extrabold mb-4">Join the Movement.</h2>
            <p className="text-gray-400 text-lg">
              Sign up as an Annapurna Volunteer. You'll be the crucial link that ensures surplus food reaches those who need it most.
            </p>
          </div>
          
          <div className="space-y-4 text-sm text-gray-400">
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-brand-eco shrink-0 mt-0.5" size={20} />
              <span>We collect your Aadhaar for identity verification to ensure safe deliveries.</span>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-brand-eco shrink-0 mt-0.5" size={20} />
              <span>Your UPI ID allows us to reimburse any travel costs during logistics.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="text-center md:text-left mb-8">
            <h3 className="text-2xl font-bold text-brand-charcoal mb-2">Volunteer Application</h3>
            <p className="text-gray-500 text-sm">Fill in your details to get verified and start delivering.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200">
                {error}
              </div>
            )}
            
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow"
                  placeholder="Rahul Sharma"
                />
              </div>
            </div>

            {/* Email */}
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
                  placeholder="rahul@example.com"
                />
              </div>
            </div>

            {/* Password */}
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone size={18} />
                  </div>
                  <input
                    required
                    type="tel"
                    pattern="[0-9]{10}"
                    title="10 digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              {/* Aadhaar Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Fingerprint size={18} />
                  </div>
                  <input
                    required
                    type="text"
                    pattern="[0-9]{12}"
                    title="12 digit Aadhaar number"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow"
                    placeholder="123456789012"
                  />
                </div>
              </div>
            </div>

            {/* UPI ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID (For Reimbursements)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <CreditCard size={18} />
                </div>
                <input
                  required
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none transition-shadow"
                  placeholder="rahul@okhdfc"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-md flex justify-center items-center gap-2 mt-4 ${
                isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-brand-charcoal hover:bg-gray-800 hover:-translate-y-0.5"
              }`}
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  Submit Application <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already a volunteer?{" "}
            <Link href="/login" className="text-brand-gold font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
