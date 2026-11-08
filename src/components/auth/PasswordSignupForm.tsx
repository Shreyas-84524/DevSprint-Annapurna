"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Utensils,
  HeartHandshake,
  Truck,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { OnboardingRole } from "@/types/contracts";

interface PasswordSignupFormProps {
  initialRole?: OnboardingRole;
}

export function PasswordSignupForm({ initialRole }: PasswordSignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryRole = searchParams.get("role") as OnboardingRole | null;
  const validRoles: OnboardingRole[] = ["donor", "requester", "volunteer"];
  const defaultRole = (initialRole && validRoles.includes(initialRole))
    ? initialRole
    : (queryRole && validRoles.includes(queryRole))
    ? queryRole
    : "donor";

  const [role, setRole] = useState<OnboardingRole>(defaultRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const isPasswordLongEnough = password.length >= 8;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!isPasswordLongEnough) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!doPasswordsMatch) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          role,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message || "Failed to create account. Please try again.");
        return;
      }

      if (json.data?.emailConfirmationRequired) {
        setSuccessInfo(
          "Registration successful! Please check your email inbox to confirm your account before signing in."
        );
      } else {
        const dest = json.data?.redirectUrl || "/onboarding";
        router.push(dest);
      }
    } catch {
      setError("Network error. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-50 text-brand-gold border border-amber-100 mb-3 shadow-sm">
            <ShieldCheck size={28} aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Join the Annapurna food rescue community in a few simple steps.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
            Select Your Role
          </label>
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl">
            <button
              type="button"
              onClick={() => setRole("donor")}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                role === "donor"
                  ? "bg-white text-amber-800 shadow-sm border border-amber-200"
                  : "text-gray-500 hover:text-brand-charcoal"
              }`}
            >
              <Utensils size={18} className={role === "donor" ? "text-brand-gold mb-1" : "text-gray-400 mb-1"} aria-hidden="true" />
              <span>Food Donor</span>
            </button>

            <button
              type="button"
              onClick={() => setRole("requester")}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                role === "requester"
                  ? "bg-white text-emerald-800 shadow-sm border border-emerald-200"
                  : "text-gray-500 hover:text-brand-charcoal"
              }`}
            >
              <HeartHandshake size={18} className={role === "requester" ? "text-brand-eco mb-1" : "text-gray-400 mb-1"} aria-hidden="true" />
              <span>Requester</span>
            </button>

            <button
              type="button"
              onClick={() => setRole("volunteer")}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                role === "volunteer"
                  ? "bg-white text-blue-800 shadow-sm border border-blue-200"
                  : "text-gray-500 hover:text-brand-charcoal"
              }`}
            >
              <Truck size={18} className={role === "volunteer" ? "text-blue-600 mb-1" : "text-gray-400 mb-1"} aria-hidden="true" />
              <span>Volunteer</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Success Alert */}
        {successInfo ? (
          <div
            role="status"
            aria-live="polite"
            className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" aria-hidden="true" />
            <h2 className="font-bold text-base mb-1">Check Your Inbox</h2>
            <p className="text-xs sm:text-sm text-emerald-800 mb-4">{successInfo}</p>
            <Link
              href={`/login/${role}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span>Return to Login</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email input */}
            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={loading}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-brand-charcoal placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5"
              >
                Password (min. 8 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={loading}
                  required
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-brand-charcoal placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isPasswordLongEnough ? "bg-emerald-500" : "bg-red-400"}`} />
                  <span className={isPasswordLongEnough ? "text-emerald-700 font-medium" : "text-red-600"}>
                    {isPasswordLongEnough ? "Password length requirement satisfied" : "Must be at least 8 characters"}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password input */}
            <div>
              <label
                htmlFor="signup-confirm-password"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={loading}
                  required
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-brand-charcoal placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  <div className={`w-2 h-2 rounded-full ${doPasswordsMatch ? "bg-emerald-500" : "bg-red-400"}`} />
                  <span className={doPasswordsMatch ? "text-emerald-700 font-medium" : "text-red-600"}>
                    {doPasswordsMatch ? "Passwords match" : "Passwords do not match"}
                  </span>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-brand-charcoal text-white hover:bg-gray-800 focus:ring-brand-gold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-500">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-bold text-brand-charcoal hover:underline ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
