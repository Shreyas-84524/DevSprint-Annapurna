"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Clock,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export interface PhoneLoginFormProps {
  purpose: "donor_login" | "requester_login" | "volunteer_login";
  portalTitle: string;
  portalSubtitle: string;
  badgeLabel: string;
  badgeColorClass: string;
  accentButtonClass: string;
  icon: React.ReactNode;
  backHref?: string;
}

export function PhoneLoginForm({
  purpose,
  portalTitle,
  portalSubtitle,
  badgeLabel,
  badgeColorClass,
  accentButtonClass,
  icon,
  backHref = "/login",
}: PhoneLoginFormProps) {
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [requestId, setRequestId] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);

  // Cooldown timer
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
      setErrorCode(null);

      const cleaned = phoneNumber.replace(/[\s\-()]/g, "");
      if (!cleaned || cleaned.length < 7 || cleaned.length > 15) {
        setError("Please enter a valid mobile number (7 to 15 digits).");
        return;
      }

      const fullPhone = cleaned.startsWith("+") ? cleaned : `${countryCode}${cleaned}`;

      setLoading(true);
      try {
        const res = await fetch("/api/auth/phone/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: fullPhone,
            purpose,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          const err = json?.error;
          setErrorCode(err?.code || "SEND_FAILED");
          setError(err?.message || "Failed to send verification code. Please try again.");
          if (err?.retryAfterSeconds) {
            setCooldown(err.retryAfterSeconds);
          }
          return;
        }

        setRequestId(json.data.requestId);
        setPhoneMasked(json.data.phoneMasked || fullPhone);
        setCooldown(json.data.resendAfter || 30);
        setStep("otp");
      } catch {
        setError("Network error sending verification code. Please check your connection.");
        setErrorCode("NETWORK_ERROR");
      } finally {
        setLoading(false);
      }
    },
    [countryCode, phoneNumber, purpose]
  );

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setErrorCode(null);

      const trimmedOtp = otpCode.trim();
      if (!trimmedOtp || !/^\d{4,8}$/.test(trimmedOtp)) {
        setError("Please enter the complete numeric verification code.");
        return;
      }

      const cleaned = phoneNumber.replace(/[\s\-()]/g, "");
      const fullPhone = cleaned.startsWith("+") ? cleaned : `${countryCode}${cleaned}`;

      setLoading(true);
      try {
        const res = await fetch("/api/auth/phone/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: fullPhone,
            requestId,
            otp: trimmedOtp,
            purpose,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          const err = json?.error;
          setErrorCode(err?.code || "VERIFY_FAILED");
          setError(err?.message || "Invalid verification code.");
          if (err?.details?.attemptsRemaining !== undefined) {
            setAttemptsRemaining(err.details.attemptsRemaining);
          }
          return;
        }

        setSuccess(true);
        const destination = json.data.redirectUrl || "/";

        // Brief success feedback then redirect
        setTimeout(() => {
          router.push(destination);
        }, 500);
      } catch {
        setError("Network error during verification. Please check your connection.");
        setErrorCode("NETWORK_ERROR");
      } finally {
        setLoading(false);
      }
    },
    [countryCode, phoneNumber, requestId, otpCode, purpose, router]
  );

  const handleBackToPhone = () => {
    setStep("phone");
    setOtpCode("");
    setError(null);
    setErrorCode(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-brand-slate">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 sm:p-10">
        {/* Navigation link back */}
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-brand-charcoal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold rounded"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to Sign In Options</span>
          </Link>
        </div>

        {/* Portal Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 mb-4 shadow-sm">
            {icon}
          </div>
          <div className="flex justify-center mb-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${badgeColorClass}`}
            >
              {badgeLabel}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-charcoal tracking-tight">
            {portalTitle}
          </h1>
          <p className="text-sm text-gray-500 mt-2">{portalSubtitle}</p>
        </div>

        {/* Success message */}
        {success && (
          <div
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Verified Successfully</p>
              <p className="text-xs text-emerald-700">Connecting you to Annapurna...</p>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && !success && (
          <div
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm"
            role="alert"
          >
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{error}</p>
              {attemptsRemaining !== null && attemptsRemaining > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining.
                </p>
              )}
              {errorCode === "SWIFT_UNAVAILABLE" && (
                <p className="text-xs text-red-600 mt-1">
                  SMS delivery is currently delayed. Please try again in a few moments.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Mobile Phone Number Input */}
        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label htmlFor="mobile-input" className="block text-sm font-bold text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  aria-label="Country Code"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>

                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Phone size={18} aria-hidden="true" />
                  </div>
                  <input
                    id="mobile-input"
                    type="tel"
                    autoComplete="tel"
                    required
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-brand-charcoal placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-brand-eco flex-shrink-0" />
                <span>We send a secure one-time code to verify your mobile identity.</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber.trim()}
              className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentButtonClass} ${
                loading || !phoneNumber.trim() ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification Code Input */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400 block">Code sent to:</span>
                <span className="font-bold text-brand-charcoal">{phoneMasked}</span>
              </div>
              <button
                type="button"
                onClick={handleBackToPhone}
                className="text-brand-gold hover:text-amber-700 font-bold focus:outline-none focus:underline"
              >
                Change
              </button>
            </div>

            <div>
              <label htmlFor="otp-input" className="block text-sm font-bold text-gray-700 mb-2">
                Enter Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} aria-hidden="true" />
                </div>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={8}
                  required
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-lg tracking-widest font-mono text-brand-charcoal placeholder-gray-400 text-center focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.trim().length < 4}
              className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentButtonClass} ${
                loading || otpCode.trim().length < 4 ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Resend Cooldown */}
            <div className="text-center pt-2">
              {cooldown > 0 ? (
                <div className="text-xs text-gray-400 flex items-center justify-center gap-1.5 font-medium">
                  <Clock size={14} />
                  <span>Resend available in {cooldown}s</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading}
                  className="text-xs font-bold text-brand-charcoal hover:text-brand-gold transition-colors focus:outline-none focus:underline"
                >
                  Did not receive code? Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Security badge footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <ShieldCheck size={16} className="text-brand-eco" />
          <span>Protected by Swift SMS Gateway & Annapurna Security</span>
        </div>
      </div>
    </div>
  );
}
