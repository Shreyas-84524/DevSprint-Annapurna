"use client";

import { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message || "Failed to process request. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <Link
          href="/login"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-brand-charcoal transition-colors mb-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
          <span>Back to sign in</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-50 text-brand-gold border border-amber-100 shrink-0">
            <KeyRound size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              Reset Your Password
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Enter your registered email to receive reset instructions.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xl">
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

        {submitted ? (
          <div
            role="status"
            aria-live="polite"
            className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-emerald-900"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" aria-hidden="true" />
            <h2 className="font-bold text-base mb-1">Check Your Email</h2>
            <p className="text-xs sm:text-sm text-emerald-800 mb-5 leading-relaxed">
              If an account exists with this email address, instructions to reset your password have been dispatched. Please review your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-charcoal text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <span>Return to Sign In</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5"
              >
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="forgot-email"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-brand-charcoal text-white hover:bg-gray-800 focus:ring-brand-gold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Instructions</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
