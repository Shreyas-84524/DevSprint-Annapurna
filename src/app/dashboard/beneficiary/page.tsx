"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import {
  Utensils,
  MapPin,
  Clock,
  Package,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldAlert,
  Filter,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { DeliveryDetailDTO, PublicListingSummaryDTO } from "@/types/contracts";
import DeliveryJourney from "@/components/delivery/DeliveryJourney";

export default function RequesterDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [listings, setListings] = useState<PublicListingSummaryDTO[]>([]);
  const [myClaims, setMyClaims] = useState<any[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Claim modal state
  const [claimingListing, setClaimingListing] = useState<PublicListingSummaryDTO | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffPhone, setDropoffPhone] = useState("");
  const [dropoffInstructions, setDropoffInstructions] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  // Load current user & profile
  const loadUserAndProfile = useCallback(async () => {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }
      setCurrentUser(user);

      const res = await fetch("/api/me");
      if (res.ok) {
        const json = await res.json();
        setUserProfile(json.data);
        if (json.data?.defaultLocation?.address) {
          setDropoffAddress(json.data.defaultLocation.address);
        }
        if (json.data?.phone) {
          setDropoffPhone(json.data.phone);
        }
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, is_verified, display_name, phone")
          .eq("id", user.id)
          .maybeSingle();
        setUserProfile(profile);
      }
    } catch (err) {
      console.error("Failed to load requester profile:", err);
      setIsOffline(true);
    }
  }, [supabase]);

  // Fetch public-safe nearby food listings via GET /api/listings/nearby
  const fetchNearbyListings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Use profile coordinates if available, otherwise Mumbai default coordinates
      const lat = userProfile?.defaultLocation?.latitude || 19.076;
      const lng = userProfile?.defaultLocation?.longitude || 72.8777;

      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radiusKm: String(radiusKm),
      });

      const res = await fetch(`/api/listings/nearby?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to fetch nearby listings");
      }

      setListings(json.data || []);
      setIsOffline(false);
    } catch (err: any) {
      console.error("Error fetching nearby listings:", err);
      setErrorMessage("Could not load nearby food listings. Please check your connection.");
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, radiusKm]);

  // Fetch user's active claims
  const fetchMyClaims = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from("claims")
        .select(`
          id,
          listing_id,
          status,
          dropoff_address,
          dropoff_contact_phone,
          claimed_at,
          food_listings (
            id,
            title,
            quantity,
            unit,
            food_type,
            status
          ),
          deliveries (
            id,
            status,
            row_version
          )
        `)
        .eq("requester_id", currentUser.id)
        .order("claimed_at", { ascending: false });

      if (!error && data) {
        setMyClaims(data);
        const activeClaim = data.find((claim: any) => claim.status === "active" && claim.deliveries);
        const deliveryRef = Array.isArray(activeClaim?.deliveries) ? activeClaim.deliveries[0] : activeClaim?.deliveries;
        const deliveryId = deliveryRef?.id;
        if (deliveryId) {
          const response = await fetch(`/api/deliveries/${deliveryId}`);
          const json = await response.json();
          if (response.ok) setActiveDelivery(json.data);
        } else {
          setActiveDelivery(null);
        }
      }
    } catch (err) {
      console.error("Error fetching claims:", err);
    }
  }, [currentUser, supabase]);

  useEffect(() => {
    loadUserAndProfile();
  }, [loadUserAndProfile]);

  useEffect(() => {
    if (userProfile) {
      fetchNearbyListings();
      fetchMyClaims();
    }
  }, [userProfile, fetchNearbyListings, fetchMyClaims]);

  // Open Claim Modal
  const openClaimModal = (listing: PublicListingSummaryDTO) => {
    setClaimingListing(listing);
    setClaimErrors({});
    if (userProfile?.defaultLocation?.address) {
      setDropoffAddress(userProfile.defaultLocation.address);
    }
    if (userProfile?.phone) {
      setDropoffPhone(userProfile.phone);
    }
  };

  // Submit Claim via POST /api/listings/:id/claim
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingListing) return;

    const errors: Record<string, string> = {};
    if (!dropoffAddress.trim() || dropoffAddress.trim().length < 3) {
      errors.address = "Dropoff address must be at least 3 characters long.";
    }
    if (!dropoffPhone.trim() || dropoffPhone.trim().length < 8) {
      errors.phone = "Valid contact phone number is required for delivery handover.";
    }
    if (Object.keys(errors).length > 0) {
      setClaimErrors(errors);
      return;
    }

    setIsClaiming(true);
    setErrorMessage(null);

    try {
      const payload = {
        dropoffAddress: dropoffAddress.trim(),
        dropoffLatitude: userProfile?.defaultLocation?.latitude || 19.076,
        dropoffLongitude: userProfile?.defaultLocation?.longitude || 72.8777,
        dropoffInstructions: dropoffInstructions.trim() || null,
        dropoffContactPhone: dropoffPhone.trim(),
        deliveryLocationId: userProfile?.defaultLocation?.id || undefined,
      };

      const idempotencyKey = `claim-${claimingListing.id}-${crypto.randomUUID()}`;

      const res = await fetch(`/api/listings/${claimingListing.id}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setErrorMessage(
            "Claim conflict: Another requester just claimed this listing or it is no longer available."
          );
        } else if (res.status === 410) {
          setErrorMessage("This listing has expired and cannot be claimed.");
        } else if (res.status === 403) {
          setErrorMessage("Unauthorized: Requester must be verified to claim food.");
        } else {
          setErrorMessage(result.error?.message || "Failed to claim listing. Please try again.");
        }
      } else {
        setSuccessMessage("Food listing successfully claimed! A volunteer task has been created for delivery.");
        setClaimingListing(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      }

      // Always re-fetch canonical state after claim mutation
      await fetchNearbyListings();
      await fetchMyClaims();
    } catch (err: any) {
      console.error("Error claiming listing:", err);
      setErrorMessage("Network error: Could not complete claim request.");
    } finally {
      setIsClaiming(false);
    }
  };

  // Filtered Listings
  const filteredListings = listings.filter((item) => {
    if (filterType !== "all" && item.foodType !== filterType) {
      return false;
    }
    return true;
  });

  // Unverified or wrong role state
  if (!isLoading && userProfile && (!userProfile.is_verified || userProfile.role !== "requester")) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <ShieldAlert size={48} className="text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-900 mb-2">
            {!userProfile.is_verified ? "Profile Verification Required" : "Requester Access Restricted"}
          </h2>
          <p className="text-amber-700 mb-6 max-w-lg mx-auto">
            {!userProfile.is_verified
              ? "To ensure community food security and prevent duplicate claims, requesters must complete onboarding."
              : "Your account is registered under a different role. Please switch or complete requester onboarding."}
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-charcoal font-bold rounded-xl hover:bg-yellow-500 transition-colors shadow-sm"
          >
            Complete Onboarding & Verification
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-charcoal">Requester Food Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">
            Discover available surplus food from local donors and claim whole listings for community redistribution.
          </p>
        </div>
        <button
          onClick={() => {
            fetchNearbyListings();
            fetchMyClaims();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Global Notification Alerts */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-3"
          >
            <AlertTriangle size={20} className="shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 text-sm">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
              <X size={16} />
            </button>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-start gap-3"
          >
            <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-green-600" />
            <div className="flex-1 text-sm">{successMessage}</div>
            <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
              <X size={16} />
            </button>
          </motion.div>
        )}

        {isOffline && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 flex items-center justify-between">
            <span className="text-sm">You appear to be offline or experiencing connection issues.</span>
            <button
              onClick={() => {
                fetchNearbyListings();
                fetchMyClaims();
              }}
              className="text-xs font-bold underline hover:text-yellow-900"
            >
              Retry Connection
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* My Active Claims Section */}
      {activeDelivery && (
        <div className="mb-10 p-6 bg-gradient-to-r from-brand-charcoal to-gray-800 text-white rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold">Your delivery journey</h2>
          <p className="text-sm text-gray-300">Status: {activeDelivery.status.replaceAll("_", " ")}</p>
          <DeliveryJourney delivery={activeDelivery} role="requester" onRefresh={fetchMyClaims} />
        </div>
      )}
      {myClaims.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-brand-charcoal mb-4 flex items-center gap-2">
            <Truck size={20} className="text-brand-gold" />
            Your Active Claims
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-brand-charcoal text-base">
                      {claim.food_listings?.title || "Food Claim"}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        claim.status === "active"
                          ? "bg-blue-100 text-blue-800"
                          : claim.status === "fulfilled"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {claim.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 mb-3">
                    <p>
                      Quantity: <span className="font-semibold text-gray-700">{claim.food_listings?.quantity} {claim.food_listings?.unit}</span>
                    </p>
                    <p className="truncate">Dropoff: {claim.dropoff_address}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Claimed: {new Date(claim.claimed_at).toLocaleDateString()}</span>
                  <span className="capitalize font-semibold text-brand-charcoal">
                    {claim.food_listings?.status?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovery Filters Header */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Food Type:</span>
          <div className="flex gap-1.5">
            {["all", "veg", "non-veg", "vegan"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filterType === type
                    ? "bg-brand-charcoal text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <MapPin size={16} className="text-brand-gold" />
          <span>Within:</span>
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700"
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={15}>15 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-brand-charcoal">Available Food Listings</h2>
          <span className="text-xs text-gray-500">
            {filteredListings.length} {filteredListings.length === 1 ? "available listing" : "available listings"}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-full mb-4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-gray-100 text-center text-gray-500">
            <Utensils size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-brand-charcoal mb-1">No Food Listings Nearby</h3>
            <p className="text-sm">
              There are currently no active surplus food listings within {radiusKm} km. Try expanding your search radius or check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-lg text-brand-charcoal line-clamp-1">{item.title}</h3>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.foodType === "veg"
                          ? "bg-green-100 text-green-800"
                          : item.foodType === "vegan"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.foodType}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                  )}

                  {/* Public-safe summary metrics (Strictly no private coordinates or phone) */}
                  <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Package size={14} className="text-brand-gold shrink-0" />
                      <span>
                        Quantity: <span className="font-semibold text-brand-charcoal">{item.quantity} {item.unit}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-brand-gold shrink-0" />
                      <span>
                        Area: {item.area || item.city || "Neighborhood vicinity"}
                        {item.distanceKm !== undefined && (
                          <span className="text-gray-400 ml-1">({item.distanceKm.toFixed(1)} km away)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-brand-gold shrink-0" />
                      <span>
                        Expires: {new Date(item.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Whole Listing Claim</span>
                  <button
                    onClick={() => openClaimModal(item)}
                    className="px-4 py-2 bg-brand-gold hover:bg-yellow-500 text-brand-charcoal font-bold rounded-lg text-xs transition-colors shadow-sm"
                  >
                    Claim Food
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claim Confirmation Modal */}
      <AnimatePresence>
        {claimingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-brand-charcoal">Confirm Food Claim</h3>
                <button
                  onClick={() => setClaimingListing(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-900 text-xs mb-4">
                You are claiming <span className="font-bold">{claimingListing.quantity} {claimingListing.unit}</span> of{" "}
                <span className="font-bold">{claimingListing.title}</span>. Once confirmed, an automated delivery assignment will be dispatched for volunteer pickup.
              </div>

              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Dropoff Delivery Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full community center or shelter address"
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold ${
                      claimErrors.address ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                  {claimErrors.address && (
                    <p className="text-xs text-red-500 mt-1">{claimErrors.address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Contact Phone (for Volunteer Handover) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={dropoffPhone}
                    onChange={(e) => setDropoffPhone(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold ${
                      claimErrors.phone ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                  {claimErrors.phone && (
                    <p className="text-xs text-red-500 mt-1">{claimErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Delivery Instructions / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Ring the bell at gate 2, ask for community coordinator."
                    value={dropoffInstructions}
                    onChange={(e) => setDropoffInstructions(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setClaimingListing(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isClaiming}
                    className="px-5 py-2 bg-brand-gold hover:bg-yellow-500 text-brand-charcoal rounded-lg text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isClaiming ? "Confirming..." : "Confirm & Claim Listing"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
