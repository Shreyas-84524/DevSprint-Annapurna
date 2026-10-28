"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  HeartHandshake,
  Utensils,
  Truck,
  ShieldCheck,
  Phone,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { OnboardingRole } from "@/types/contracts";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  // Step state: 1 = Role & Profile, 2 = Location & Preferences, 3 = Phone Verification (Donors/Requesters only)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");

  // Form Fields
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<OnboardingRole>("donor");

  // Location Fields
  const [locationLabel, setLocationLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  // Volunteer Preference Fields
  const [vehicleType, setVehicleType] = useState<string>("motorcycle");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(10);

  // OTP Verification Fields (for Donors & Requesters)
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Check auth state and existing profile on load
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        // Fetch /api/me to see if profile already exists
        const res = await fetch("/api/me");
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.onboardingComplete) {
            router.replace(json.data.dashboardRoute);
            return;
          }
          if (json?.data?.role) {
            // Role already set, if donor/requester not verified, skip to step 3
            if (!json.data.isVerified && json.data.role !== "volunteer") {
              setSelectedRole(json.data.role);
              setDisplayName(json.data.displayName || "");
              setStep(3);
            }
          }
        }
      } catch (err) {
        console.error("Failed to check auth state:", err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router, supabase]);

  // Resend countdown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // Request GPS Location
  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. Please enter location manually.");
      return;
    }

    setGpsLoading(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsLoading(false);
        if (!address) {
          setAddress(`GPS Coordinates (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.message || "Location access denied or unavailable. Please enter address manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Step 1: Proceed to Location
  const handleProceedToLocation = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    if (!displayName.trim() || displayName.trim().length < 2) {
      setGeneralError("Please enter your name (at least 2 characters).");
      return;
    }

    setStep(2);
  };

  // Step 2: Complete Profile Creation & Route (or go to OTP verification)
  const handleCompleteStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setSubmitting(true);

    // Fallback coordinates if manual entry without GPS (e.g. Mumbai center)
    const finalLat = latitude ?? 19.076;
    const finalLng = longitude ?? 72.8777;

    const payload = {
      displayName: displayName.trim(),
      role: selectedRole,
      location: {
        label: locationLabel.trim() || "Primary Location",
        address: address.trim() || null,
        latitude: finalLat,
        longitude: finalLng,
      },
      volunteerPreferences:
        selectedRole === "volunteer"
          ? {
              vehicleType,
              maxDistanceKm,
            }
          : undefined,
    };

    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to save profile.");
      }

      // If volunteer, onboarding is complete!
      if (selectedRole === "volunteer") {
        router.replace("/dashboard/volunteer");
        return;
      }

      // If donor or requester, proceed to Step 3 (Phone OTP Verification)
      setStep(3);
    } catch (err: any) {
      setGeneralError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Send OTP Code
  const handleSendOtp = async () => {
    setOtpError("");
    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;

    if (phoneNumber.replace(/\D/g, "").length < 7) {
      setOtpError("Please enter a valid phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/verification/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to send verification code.");
      }

      setOtpSent(true);
      setOtpCooldown(json?.data?.resendAfter || 30);
    } catch (err: any) {
      setOtpError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Verify OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setSubmitting(true);

    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setOtpError("Please enter the verification code received via SMS.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/verification/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json?.error?.attemptsRemaining !== undefined) {
          setAttemptsRemaining(json.error.attemptsRemaining);
        }
        throw new Error(json?.error?.message || "Verification code is invalid or expired.");
      }

      setOtpSuccess(true);
      setTimeout(() => {
        if (selectedRole === "donor") {
          router.replace("/dashboard/donor");
        } else {
          router.replace("/dashboard/beneficiary");
        }
      }, 1500);
    } catch (err: any) {
      setOtpError(err.message || "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-slate">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-brand-slate">
      <div className="max-w-2xl w-full bg-brand-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 sm:p-10">
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            <span className={step >= 1 ? "text-brand-charcoal" : ""}>1. Role</span>
            <span className={step >= 2 ? "text-brand-charcoal" : ""}>2. Location</span>
            {selectedRole !== "volunteer" && (
              <span className={step >= 3 ? "text-brand-charcoal" : ""}>3. Phone Verification</span>
            )}
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-brand-gold h-full transition-all duration-300"
              style={{
                width:
                  selectedRole === "volunteer"
                    ? step === 1
                      ? "50%"
                      : "100%"
                    : step === 1
                    ? "33%"
                    : step === 2
                    ? "66%"
                    : "100%",
              }}
            ></div>
          </div>
        </div>

        {generalError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-600 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {/* STEP 1: Role Selection & Display Name */}
        {step === 1 && (
          <form onSubmit={handleProceedToLocation} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-brand-charcoal mb-1">Welcome to Project Annapurna</h2>
              <p className="text-gray-500 text-sm">Select how you would like to participate in food redistribution.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Your Full Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Aditi Sharma"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Choose Your Role</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Donor */}
                <div
                  onClick={() => setSelectedRole("donor")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedRole === "donor"
                      ? "border-brand-gold bg-yellow-50/50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <Utensils className={`mb-3 ${selectedRole === "donor" ? "text-brand-gold" : "text-gray-400"}`} size={28} />
                    <h3 className="font-bold text-brand-charcoal text-base mb-1">Food Donor</h3>
                    <p className="text-xs text-gray-500">Donate surplus meals from home, catering, or restaurants.</p>
                  </div>
                  <span className="text-[10px] font-bold mt-4 uppercase text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full inline-block w-fit">
                    Requires SMS OTP
                  </span>
                </div>

                {/* Requester */}
                <div
                  onClick={() => setSelectedRole("requester")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedRole === "requester"
                      ? "border-brand-gold bg-yellow-50/50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <HeartHandshake className={`mb-3 ${selectedRole === "requester" ? "text-brand-gold" : "text-gray-400"}`} size={28} />
                    <h3 className="font-bold text-brand-charcoal text-base mb-1">Requester</h3>
                    <p className="text-xs text-gray-500">Request food for families, communities, or shelters.</p>
                  </div>
                  <span className="text-[10px] font-bold mt-4 uppercase text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full inline-block w-fit">
                    Requires SMS OTP
                  </span>
                </div>

                {/* Volunteer */}
                <div
                  onClick={() => setSelectedRole("volunteer")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedRole === "volunteer"
                      ? "border-brand-eco bg-green-50/50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <Truck className={`mb-3 ${selectedRole === "volunteer" ? "text-brand-eco" : "text-gray-400"}`} size={28} />
                    <h3 className="font-bold text-brand-charcoal text-base mb-1">Volunteer</h3>
                    <p className="text-xs text-gray-500">Pick up donations and deliver them locally.</p>
                  </div>
                  <span className="text-[10px] font-bold mt-4 uppercase text-green-700 bg-green-100 px-2 py-0.5 rounded-full inline-block w-fit">
                    Instant Setup (No OTP)
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <span>Continue to Location</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* STEP 2: Location & Preferences */}
        {step === 2 && (
          <form onSubmit={handleCompleteStep2} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-brand-charcoal mb-1">Set Your Base Location</h2>
              <p className="text-gray-500 text-sm">
                Used to match you with nearby food donations and deliveries.
              </p>
            </div>

            {/* GPS or Manual Selector */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
                <button
                  type="button"
                  onClick={handleRequestGps}
                  disabled={gpsLoading}
                  className="px-4 py-2.5 bg-brand-gold text-brand-charcoal font-bold rounded-xl text-sm hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Navigation size={16} />
                  <span>{gpsLoading ? "Detecting GPS..." : "Detect Current GPS"}</span>
                </button>
                {latitude && longitude && (
                  <span className="text-xs text-green-700 font-bold bg-green-100 px-3 py-1.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    <span>Coordinates Captured ({latitude.toFixed(4)}, {longitude.toFixed(4)})</span>
                  </span>
                )}
              </div>

              {gpsError && (
                <p className="text-xs text-red-500 mb-2">{gpsError}</p>
              )}

              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-600 mb-1">Location Label</label>
                <input
                  type="text"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. Home, Main Kitchen, Community Center"
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Manual Address / Landmark</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Bandra West, Mumbai or Flat 402, Sunshine Apts"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Volunteer Specific Preferences */}
            {selectedRole === "volunteer" && (
              <div className="p-5 bg-green-50/60 border border-green-200 rounded-2xl space-y-4">
                <h3 className="font-bold text-brand-charcoal text-sm flex items-center gap-2">
                  <Truck size={18} className="text-brand-eco" />
                  <span>Volunteer Delivery Preferences</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mode of Transport</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                    >
                      <option value="motorcycle">Motorcycle / Scooter</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="car">Car</option>
                      <option value="foot">Walking</option>
                      <option value="van">Van / Small Truck</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Max Travel Radius: <span className="font-bold text-brand-eco">{maxDistanceKm} km</span>
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="30"
                      value={maxDistanceKm}
                      onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                      className="w-full accent-brand-eco mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Saving Profile...</span>
                ) : selectedRole === "volunteer" ? (
                  <>
                    <span>Complete Onboarding</span>
                    <CheckCircle2 size={18} className="text-brand-eco" />
                  </>
                ) : (
                  <>
                    <span>Proceed to Phone Verification</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Phone OTP Verification (Donors & Requesters) */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="w-12 h-12 bg-yellow-100 text-brand-gold rounded-2xl flex items-center justify-center mb-3">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-2xl font-bold text-brand-charcoal mb-1">Verify Your Phone Number</h2>
              <p className="text-gray-500 text-sm">
                Project Annapurna requires verified contact details for {selectedRole}s to coordinate safe food handovers.
              </p>
            </div>

            {otpError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{otpError}</p>
                  {attemptsRemaining !== null && (
                    <p className="text-xs mt-1">Attempts remaining: {attemptsRemaining}</p>
                  )}
                </div>
              </div>
            )}

            {otpSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-3 font-semibold">
                <CheckCircle2 size={20} className="text-brand-eco" />
                <span>Phone verified successfully! Redirecting to your dashboard...</span>
              </div>
            )}

            {!otpSent ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number (E.164 format)</label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 font-medium text-sm"
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                    </select>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9876543210"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none text-base"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={submitting}
                  className="w-full py-3.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone size={18} />
                  <span>{submitting ? "Sending SMS Code..." : "Send Verification Code"}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-bold text-gray-700">Enter 6-Digit Code</label>
                    <span className="text-xs text-gray-500">Sent to {countryCode} {phoneNumber}</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3 text-center tracking-widest text-2xl font-black border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || otpSuccess}
                  className="w-full py-3.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <span>{submitting ? "Verifying..." : "Confirm & Access Dashboard"}</span>
                  <ArrowRight size={18} />
                </button>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                  <span>Didn't receive the SMS?</span>
                  {otpCooldown > 0 ? (
                    <span className="font-bold text-gray-400">Resend in {otpCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={submitting}
                      className="font-bold text-brand-gold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
