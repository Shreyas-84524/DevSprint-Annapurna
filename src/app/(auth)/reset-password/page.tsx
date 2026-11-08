"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [success, setSuccess] = useState(false);

  const isPasswordLongEnough = password.length >= 8;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordLongEnough) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (!doPasswordsMatch) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setIsSessionExpired(true);
          setError("Your password reset link is invalid or has expired. Please request a new link.");
        } else {
          setError(json?.error?.message || "Failed to update password. Please try again.");
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(json.data?.redirectUrl || "/login");
      }, 1500);
    } catch {
      setError("Network error. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-50 text-brand-gold border border-amber-100 shrink-0">
            <KeyRound size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              Create New Password
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Enter your new secure password below.
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

        {isSessionExpired ? (
          <div className="text-center py-4">
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-charcoal text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <span>Request New Reset Link</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : success ? (
          <div
            role="status"
            aria-live="polite"
            className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-emerald-900"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" aria-hidden="true" />
            <h2 className="font-bold text-base mb-1">Password Updated Successfully</h2>
            <p className="text-xs sm:text-sm text-emerald-800 mb-4">
              Your password has been changed. Redirecting to sign in...
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span>Sign In Now</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5"
              >
                New Password (min. 8 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="new-password"
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
                    {isPasswordLongEnough ? "Length requirement satisfied" : "Minimum 8 characters required"}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="confirm-new-password"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-brand-charcoal text-white hover:bg-gray-800 focus:ring-brand-gold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
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
