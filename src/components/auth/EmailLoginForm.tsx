"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Inbox,
} from "lucide-react";
import Link from "next/link";

export interface EmailLoginFormProps {
  purpose: "donor_login" | "requester_login" | "volunteer_login";
  portalTitle: string;
  portalSubtitle: string;
  badgeLabel: string;
  badgeColorClass: string;
  accentButtonClass: string;
  icon: React.ReactNode;
  backHref?: string;
}

export function EmailLoginForm({
  purpose,
  portalTitle,
  portalSubtitle,
  badgeLabel,
  badgeColorClass,
  accentButtonClass,
  icon,
  backHref = "/login",
}: EmailLoginFormProps) {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setError(null);
      setInfoNotice(null);

      const trimmedEmail = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/auth/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            purpose,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          const err = json?.error;
          setError(err?.message || "Failed to send verification code. Please try again.");
          if (err?.retryAfterSeconds) {
            setCooldown(err.retryAfterSeconds);
          }
          return;
        }

        if (json.data?.roleMismatch) {
          setInfoNotice(
            `Notice: Your account is registered with a different role (${json.data.existingRole}). You will be directed to your authorized dashboard upon verification.`
          );
        }

        setStep("otp");
        setCooldown(60);
      } catch (err: any) {
        console.error("Failed to send email verification code:", err);
        setError("Network error. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, purpose]
  );

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmedCode = otpCode.trim();
      if (!trimmedCode || !/^\d{4,8}$/.test(trimmedCode)) {
        setError("Please enter the 6-digit code received in your email.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/auth/email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            token: trimmedCode,
            purpose,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          const err = json?.error;
          setError(err?.message || "Invalid or expired code. Please try again.");
          return;
        }

        setSuccess(true);
        const destination = json.data?.redirectUrl || "/onboarding";
        setTimeout(() => {
          router.push(destination);
        }, 600);
      } catch (err: any) {
        console.error("Verification exception:", err);
        setError("Network error during verification. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, otpCode, purpose, router]
  );

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform" />
          Back to role selection
        </Link>
        <div className="flex items-center justify-between mb-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColorClass}`}
          >
            {badgeLabel}
          </span>
          <div className="flex items-center text-xs text-muted-foreground">
            <Lock className="w-3 h-3 mr-1 text-emerald-600" />
            Passwordless Security
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {portalTitle}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {portalSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Authentication notice</span>
              {error}
            </div>
          </div>
        )}

        {/* Info Notice */}
        {infoNotice && (
          <div
            role="status"
            className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              {infoNotice}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div
            role="status"
            className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-150"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Identity confirmed. Redirecting to your dashboard...</span>
          </div>
        )}

        {/* STEP 1: Email Entry */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={loading || success}
                  className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
                />
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                We will email you a secure 6-digit one-time code to authenticate. No password required.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || success || !email.trim()}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${accentButtonClass}`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  Send Verification Code
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP Verification */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="otp-input"
                  className="text-xs font-semibold text-foreground"
                >
                  6-Digit Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtpCode("");
                    setError(null);
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Change email
                </button>
              </div>

              <div className="p-2.5 bg-muted/40 rounded-xl mb-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{email}</span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Code sent
                </span>
              </div>

              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                disabled={loading || success}
                className="w-full px-3 py-3 bg-background border border-border rounded-xl text-center text-2xl font-mono tracking-widest text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                Check your inbox (and spam folder) for the verification code from Supabase Auth.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || success || otpCode.trim().length < 4}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${accentButtonClass}`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verifying identity...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Verify &amp; Continue
                </>
              )}
            </button>

            {/* Resend Cooldown */}
            <div className="pt-2 text-center">
              {cooldown > 0 ? (
                <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Resend code in {cooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading || success}
                  className="text-xs text-primary hover:underline font-semibold transition-colors disabled:opacity-50"
                >
                  Didn’t receive a code? Send again
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-muted-foreground space-y-1">
        <p>
          By continuing, you agree to Annapurna&apos;s{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          Annapurna Food Redistribution Network • Zero Hunger Initiative
        </p>
      </div>
    </div>
  );
}
