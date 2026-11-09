"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { UserRole } from "@/types/contracts";
import { resolvePostAuthDestination } from "@/components/auth/authNavigation";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export interface PasswordLoginFormProps {
  portalRole: UserRole;
  portalTitle: string;
  portalSubtitle: string;
  badgeLabel: string;
  badgeColorClass: string;
  accentButtonClass: string;
  icon: React.ReactNode;
  backHref?: string;
}

export function PasswordLoginForm({
  portalRole,
  portalTitle,
  portalSubtitle,
  badgeLabel,
  badgeColorClass,
  accentButtonClass,
  icon,
  backHref = "/login",
}: PasswordLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryError = params.get("error");
      const errorDescription = params.get("error_description");
      const errorMsg = queryError || errorDescription;
      if (errorMsg) {
        const lower = errorMsg.toLowerCase();
        if (
          lower.includes("access_denied") ||
          lower.includes("cancel") ||
          lower.includes("cancelled") ||
          lower.includes("canceled")
        ) {
          setError(
            "Google sign-in was canceled. Please try again or sign in with your email and password."
          );
        } else if (lower.includes("expired") || lower.includes("invalid")) {
          setError(
            "Your verification link has expired or was already used. You can sign in directly with your email and password below."
          );
        } else {
          setError(
            "Unable to complete sign-in. Please try again or sign in with your email and password."
          );
        }
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          portalRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errMessage = json?.error?.message || "Invalid email or password.";
        setError(errMessage);
        return;
      }

      if (json.data?.roleMismatch) {
        setNotice(
          `Notice: Your account is registered as a ${json.data.canonicalRole}. Redirecting to your assigned dashboard...`
        );
      }

      const redirectDestination = resolvePostAuthDestination(json.data?.redirectUrl);

      // Authentication is completed by a Route Handler that writes the SSR
      // session cookie. A document navigation guarantees the subsequent
      // protected request is made after the browser has committed Set-Cookie,
      // and avoids a stale prefetched App Router response from the login page.
      await new Promise((resolve) =>
        window.setTimeout(resolve, json.data?.roleMismatch ? 1200 : 150)
      );
      window.location.replace(redirectDestination);
    } catch {
      setError("Network error. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header & Back Link */}
      <div className="mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-brand-charcoal transition-colors mb-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
          <span>Back to selection</span>
        </Link>
        <div className="flex items-center justify-between mb-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColorClass}`}
          >
            {badgeLabel}
          </span>
          <div className="flex items-center text-xs text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-brand-eco" aria-hidden="true" />
            <span>Secure Sign In</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="p-2.5 rounded-2xl bg-amber-50 text-brand-gold border border-amber-100 shrink-0">
            {icon}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              {portalTitle}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {portalSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xl">
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

        {/* Notice Alert (e.g. role mismatch) */}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 font-medium">{notice}</div>
          </div>
        )}

        {/* Google Sign In (Public roles only: donor, requester, volunteer; never admin) */}
        {portalRole !== "admin" && (
          <div className="mb-6">
            <GoogleSignInButton
              portalRole={portalRole}
              disabled={loading}
              onError={(msg) => setError(msg)}
            />

            {/* Visual separator */}
            <div className="relative my-6" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400 font-bold tracking-wider">
                  or continue with email
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email input */}
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="email-input"
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
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password-input"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Password
              </label>
              {portalRole !== "admin" && (
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-gray-500 hover:text-brand-charcoal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${accentButtonClass}`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        {/* Footer info: Sign up link (for public roles only) */}
        {portalRole !== "admin" ? (
          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-500">
            Don&apos;t have an account yet?{" "}
            <Link
              href={`/register?role=${portalRole}`}
              className="font-bold text-brand-charcoal hover:underline ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
            >
              Sign up as {badgeLabel}
            </Link>
          </div>
        ) : (
          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-400">
            Administrative access is restricted to authorized personnel.
          </div>
        )}
      </div>
    </div>
  );
}
