"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  HeartHandshake,
  Utensils,
  Truck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Navigation,
  MapPin,
  LogIn,
  AlertTriangle,
} from "lucide-react";
import { OnboardingRole } from "@/types/contracts";

// Common city coordinate presets for manual entry fallback
const CITY_PRESETS = [
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
];

export default function OnboardingPage() {
  const router = useRouter();

  // Fail-closed Supabase client initialization
  const isConfigured = isSupabaseConfigured();
  const supabase = useMemo(() => {
    if (!isConfigured) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, [isConfigured]);

  // Step state: 1 = Role & Profile, 2 = Location & Preferences
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
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
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [manualEntryMode, setManualEntryMode] = useState(false);

  // Volunteer Preference Fields
  const [vehicleType, setVehicleType] = useState<string>("motorcycle");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(10);

  // Check auth state and existing profile on load
  const checkAuth = useCallback(async () => {
    setLoading(true);
    setGeneralError("");
    setSessionExpired(false);

    if (!supabase) {
      setGeneralError("Authentication service is not configured. Please check public environment variables.");
      setLoading(false);
      return;
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setSessionExpired(true);
        setLoading(false);
        return;
      }

      // Fetch /api/me to check profile and onboarding completion
      const res = await fetch("/api/me");
      if (res.status === 401) {
        setSessionExpired(true);
        setLoading(false);
        return;
      }

      if (res.ok) {
        const json = await res.json();
        const me = json?.data;
        if (me?.onboardingComplete) {
          window.location.replace(me.dashboardRoute || "/");
          return;
        }

        if (me?.role) {
          setSelectedRole(me.role);
          if (me.displayName) setDisplayName(me.displayName);
          if (me.defaultLocation) {
            setLocationLabel(me.defaultLocation.label || "Home");
            setAddress(me.defaultLocation.address || "");
            setLatitude(me.defaultLocation.latitude ?? null);
            setLongitude(me.defaultLocation.longitude ?? null);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to check auth state:", err);
      setGeneralError("Unable to check account setup. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Request GPS Location with permission detection & manual entry fallback
  const handleRequestGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setPermissionDenied(true);
      setManualEntryMode(true);
      setGpsError("Geolocation is not supported by your browser. Please enter your location details manually.");
      return;
    }

    setGpsLoading(true);
    setGpsError("");
    setPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsLoading(false);
        setPermissionDenied(false);
        setGpsError("");
        if (!address) {
          setAddress(`GPS Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          // GeolocationPositionError.PERMISSION_DENIED
          setPermissionDenied(true);
          setManualEntryMode(true);
          setGpsError("Location permission was denied. Please enter your location details manually below.");
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          setManualEntryMode(true);
          setGpsError("Location information is currently unavailable. Please enter details manually.");
        } else if (err.code === 3) {
          // TIMEOUT
          setGpsError("Location request timed out. Please retry or enter details manually.");
        } else {
          setGpsError(err.message || "Unable to retrieve GPS coordinates. Please enter manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [address]);

  // City preset selection for manual entry fallback
  const handleSelectCityPreset = (city: { name: string; lat: number; lng: number }) => {
    setLatitude(city.lat);
    setLongitude(city.lng);
    setGpsError("");
    setPermissionDenied(false);
    if (!address) {
      setAddress(`${city.name}, India`);
    }
  };

  // Step 1: Proceed to Location
  const handleProceedToLocation = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    const trimmed = displayName.trim();
    if (!trimmed || trimmed.length < 2) {
      setGeneralError("Please enter your name (at least 2 characters).");
      return;
    }

    setStep(2);
  };

  // Step 2: Complete Profile Creation & Route directly to dashboard
  const handleCompleteStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    // Validate location label
    const trimmedLabel = locationLabel.trim();
    if (!trimmedLabel) {
      setGeneralError("Please provide a label for your location (e.g. Home, Kitchen, Shelter).");
      return;
    }

    // Validate address
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setGeneralError("Please enter an address or landmark for your location.");
      return;
    }

    // Validate coordinates
    if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
      setGeneralError("Valid location coordinates are required. Detect your GPS or enter coordinates manually.");
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setGeneralError("Coordinates out of valid range: Latitude must be between -90 and 90, Longitude between -180 and 180.");
      return;
    }

    setSubmitting(true);

    const payload = {
      displayName: displayName.trim(),
      role: selectedRole,
      location: {
        label: trimmedLabel,
        address: trimmedAddress,
        latitude,
        longitude,
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

      if (res.status === 401) {
        setSessionExpired(true);
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        // If profile already exists, route to dashboard or check status
        if (json?.error?.code === "PROFILE_ALREADY_EXISTS") {
          const meRes = await fetch("/api/me");
          if (meRes.ok) {
            const meJson = await meRes.json();
            if (meJson?.data?.onboardingComplete) {
              window.location.replace(meJson.data.dashboardRoute);
              return;
            }
          }
          window.location.replace(
            selectedRole === "donor"
              ? "/dashboard/donor"
              : selectedRole === "requester"
              ? "/dashboard/beneficiary"
              : "/dashboard/volunteer"
          );
          return;
        }
        throw new Error(json?.error?.message || "Failed to save profile. Please try again.");
      }

      const destination =
        json?.data?.dashboardRoute ||
        (selectedRole === "donor"
          ? "/dashboard/donor"
          : selectedRole === "requester"
          ? "/dashboard/beneficiary"
          : "/dashboard/volunteer");

      window.location.replace(destination);
    } catch (err: any) {
      setGeneralError(err.message || "An unexpected error occurred while saving profile.");
    } finally {
      setSubmitting(false);
    }
  };

  // Initial Loading View
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-slate px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-600">Verifying your account details...</p>
        </div>
      </div>
    );
  }

  // Session-Expired View
  if (sessionExpired) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-brand-slate">
        <div className="max-w-md w-full bg-brand-white rounded-3xl shadow-xl overflow-hidden border border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn size={32} />
          </div>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-2">Session Expired</h2>
          <p className="text-sm text-gray-600 mb-6">
            Your login session is either expired or missing. Please sign in to your account to complete your profile setup.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push("/login")}
              className="flex-1 py-3.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              <span>Go to Sign In</span>
            </button>
            <button
              onClick={checkAuth}
              className="px-5 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
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
            <span className={step >= 1 ? "text-brand-charcoal font-bold" : ""}>1. Role & Profile</span>
            <span className={step >= 2 ? "text-brand-charcoal font-bold" : ""}>2. Base Location</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-brand-gold h-full transition-all duration-300"
              style={{
                width: step === 1 ? "50%" : "100%",
              }}
            ></div>
          </div>
        </div>

        {/* Global Error Notice with Retry */}
        {generalError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-600 text-sm">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
            <button
              type="button"
              onClick={() => setGeneralError("")}
              className="text-xs font-bold text-red-700 hover:underline shrink-0"
            >
              Dismiss
            </button>
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
                    Direct Access
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
                A saved location is required to coordinate food redistribution within your service area.
              </p>
            </div>

            {/* GPS Detection & Status Box */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleRequestGps}
                  disabled={gpsLoading}
                  className="px-4 py-2.5 bg-brand-gold text-brand-charcoal font-bold rounded-xl text-sm hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {gpsLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-brand-charcoal border-t-transparent rounded-full animate-spin"></div>
                      <span>Detecting Location...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={16} />
                      <span>{permissionDenied || gpsError ? "Retry GPS Detection" : "Detect Current GPS"}</span>
                    </>
                  )}
                </button>

                {latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude) && (
                  <span className="text-xs text-green-700 font-bold bg-green-100 px-3 py-1.5 rounded-full flex items-center gap-1 self-start sm:self-auto">
                    <CheckCircle2 size={14} />
                    <span>Coordinates Captured ({latitude.toFixed(4)}, {longitude.toFixed(4)})</span>
                  </span>
                )}
              </div>

              {/* Permission Denied Notice */}
              {permissionDenied && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span className="font-bold">Location Permission Denied: </span>
                    <span>Browser location access was blocked. Please enter your address and coordinates manually below, or select a city preset.</span>
                  </div>
                </div>
              )}

              {/* Other GPS Errors */}
              {gpsError && !permissionDenied && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-red-600 text-xs">
                  <span>{gpsError}</span>
                  <button
                    type="button"
                    onClick={handleRequestGps}
                    className="font-bold underline shrink-0 hover:text-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Location Label Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Location Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. Home, Main Kitchen, Community Center"
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-gold focus:outline-none"
                />
              </div>

              {/* Address Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Address / Landmark <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 402, Sunshine Apts, Bandra West, Mumbai"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-gold focus:outline-none"
                />
              </div>

              {/* Manual Entry Fallback & Coordinate Inputs */}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <MapPin size={14} className="text-brand-charcoal" />
                    <span>Coordinates (Latitude & Longitude) <span className="text-red-500">*</span></span>
                  </label>
                  {!manualEntryMode && (
                    <button
                      type="button"
                      onClick={() => setManualEntryMode(true)}
                      className="text-[11px] text-brand-charcoal font-semibold hover:underline"
                    >
                      Enter manually
                    </button>
                  )}
                </div>

                {(manualEntryMode || permissionDenied || latitude !== null) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="block text-[11px] text-gray-500 mb-1">Latitude (-90 to 90)</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={latitude ?? ""}
                          onChange={(e) => setLatitude(e.target.value === "" ? null : parseFloat(e.target.value))}
                          placeholder="e.g. 19.0760"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-gold focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <span className="block text-[11px] text-gray-500 mb-1">Longitude (-180 to 180)</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={longitude ?? ""}
                          onChange={(e) => setLongitude(e.target.value === "" ? null : parseFloat(e.target.value))}
                          placeholder="e.g. 72.8777"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-gold focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Quick City Presets */}
                    <div>
                      <span className="block text-[11px] text-gray-500 mb-1.5">Quick Location Presets:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {CITY_PRESETS.map((city) => (
                          <button
                            key={city.name}
                            type="button"
                            onClick={() => handleSelectCityPreset(city)}
                            className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:border-brand-gold hover:bg-yellow-50/50 transition-colors text-gray-700 font-medium"
                          >
                            {city.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
                className="flex-1 py-3.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Onboarding</span>
                    <CheckCircle2 size={18} className="text-brand-eco" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
