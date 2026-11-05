"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldAlert,
  Phone,
  ArrowRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import { VolunteerTaskSummaryDTO, DeliveryDetailDTO } from "@/types/contracts";

export default function VolunteerDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [availableTasks, setAvailableTasks] = useState<VolunteerTaskSummaryDTO[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const supabase = createClient();

  // Load current user and profile
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
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, is_verified, display_name")
          .eq("id", user.id)
          .maybeSingle();
        setUserProfile(profile);
      }
    } catch (err) {
      console.error("Failed to load volunteer profile:", err);
      setIsOffline(true);
    }
  }, [supabase]);

  // Fetch active delivery for volunteer (One Active Delivery Invariant)
  const fetchActiveDelivery = useCallback(async () => {
    if (!currentUser) return;
    try {
      // Check if volunteer has an active delivery
      const { data: activeRow, error } = await supabase
        .from("deliveries")
        .select("id, status")
        .eq("volunteer_id", currentUser.id)
        .in("status", [
          "assigned",
          "at_pickup",
          "qc_passed",
          "collected",
          "en_route_dropoff",
          "handed_over",
        ])
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.warn("Could not query active deliveries:", error);
      }

      if (activeRow?.id) {
        // Fetch authoritative participant delivery detail
        const res = await fetch(`/api/deliveries/${activeRow.id}`);
        if (res.ok) {
          const json = await res.json();
          setActiveDelivery(json.data);
        }
      } else {
        setActiveDelivery(null);
      }
    } catch (err) {
      console.error("Error checking active delivery:", err);
    }
  }, [currentUser, supabase]);

  // Fetch available volunteer tasks via GET /api/volunteer/tasks/available
  const fetchAvailableTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/volunteer/tasks/available");
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setErrorMessage("Volunteer access required to view available pickup tasks.");
        } else {
          throw new Error(json.error?.message || "Failed to fetch tasks");
        }
        return;
      }

      setAvailableTasks(json.data || []);
      setIsOffline(false);
    } catch (err: any) {
      console.error("Error fetching available tasks:", err);
      setErrorMessage("Could not load available volunteer tasks. Please check your network.");
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserAndProfile();
  }, [loadUserAndProfile]);

  useEffect(() => {
    if (currentUser) {
      fetchActiveDelivery();
      fetchAvailableTasks();
    }
  }, [currentUser, fetchActiveDelivery, fetchAvailableTasks]);

  // Accept Delivery Task via POST /api/deliveries/:id/accept
  const handleAcceptTask = async (deliveryId: string) => {
    if (activeDelivery) {
      setErrorMessage(
        "Single active delivery constraint: You currently have a delivery in progress. Complete it before accepting another."
      );
      return;
    }

    setIsAccepting(deliveryId);
    setErrorMessage(null);

    try {
      const idempotencyKey = `accept-${deliveryId}-${crypto.randomUUID()}`;

      const res = await fetch(`/api/deliveries/${deliveryId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          if (result.error?.code === "VOLUNTEER_ACTIVE_DELIVERY_EXISTS") {
            setErrorMessage("Constraint error: You already have an active delivery assigned.");
          } else {
            setErrorMessage(
              "Assignment conflict: Another volunteer just accepted this delivery task."
            );
          }
        } else if (res.status === 410) {
          setErrorMessage("This listing has expired and the delivery task was cancelled.");
        } else {
          setErrorMessage(result.error?.message || "Failed to accept task.");
        }
      } else {
        setSuccessMessage("Delivery task accepted! Full pickup and dropoff details are now unlocked.");
        setTimeout(() => setSuccessMessage(null), 4000);
      }

      // Always re-fetch canonical state after acceptance attempt
      await fetchActiveDelivery();
      await fetchAvailableTasks();
    } catch (err: any) {
      console.error("Error accepting task:", err);
      setErrorMessage("Network error: Could not complete delivery task acceptance.");
    } finally {
      setIsAccepting(null);
    }
  };

  // Wrong role state
  if (!isLoading && userProfile && userProfile.role !== "volunteer") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <ShieldAlert size={48} className="text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-900 mb-2">Volunteer Role Required</h2>
          <p className="text-amber-700 mb-6 max-w-lg mx-auto">
            Your current account role is {userProfile.role}. The delivery dispatch portal is exclusively for registered community volunteers.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-charcoal font-bold rounded-xl hover:bg-yellow-500 transition-colors shadow-sm"
          >
            Switch to Volunteer Role
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-charcoal">Volunteer Delivery Dispatch</h1>
          <p className="text-gray-600 text-sm mt-1">
            Accept available surplus food pickups and transport meals directly to community recipients.
          </p>
        </div>
        <button
          onClick={() => {
            fetchActiveDelivery();
            fetchAvailableTasks();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh Tasks
        </button>
      </div>

      {/* Global Alerts */}
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
            <span className="text-sm">Connection issue detected. Reconnecting to live task queue...</span>
            <button
              onClick={() => {
                fetchActiveDelivery();
                fetchAvailableTasks();
              }}
              className="text-xs font-bold underline hover:text-yellow-900"
            >
              Retry Connection
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Active Delivery View (Strict 1 Active Delivery Enforced) */}
      {activeDelivery && (
        <div className="mb-10 p-6 bg-gradient-to-r from-brand-charcoal to-gray-800 text-white rounded-2xl shadow-lg border border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-gray-700">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Truck className="text-brand-gold" size={24} />
                <h2 className="text-xl font-bold">Active Delivery in Progress</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-gold text-brand-charcoal">
                  {activeDelivery.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-gray-300 text-xs">
                Delivery ID: {activeDelivery.id} | Task assigned at{" "}
                {activeDelivery.assignedAt ? new Date(activeDelivery.assignedAt).toLocaleTimeString() : "Just now"}
              </p>
            </div>
            <div className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg text-xs font-medium">
              1 Active Delivery Constraint Active
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup Location Details (Authorized Participant View) */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-gold">
                Step 1: Food Pickup
              </span>
              <h4 className="font-bold text-base">{activeDelivery.listing?.title}</h4>
              <p className="text-xs text-gray-300">
                Quantity: <span className="text-white font-semibold">{activeDelivery.listing?.quantity} {activeDelivery.listing?.unit}</span>
              </p>
              <div className="pt-2 text-xs space-y-1">
                <p className="flex items-start gap-1.5 text-gray-300">
                  <MapPin size={14} className="text-brand-gold shrink-0 mt-0.5" />
                  <span>{activeDelivery.pickupLocation?.address || "Pickup address registered on record"}</span>
                </p>
                {activeDelivery.pickupLocation?.contactPhone && (
                  <p className="flex items-center gap-1.5 text-gray-300">
                    <Phone size={14} className="text-brand-gold shrink-0" />
                    <span>Donor Contact: {activeDelivery.pickupLocation.contactPhone}</span>
                  </p>
                )}
                {activeDelivery.pickupLocation?.instructions && (
                  <p className="text-[11px] text-gray-400 italic">
                    Note: {activeDelivery.pickupLocation.instructions}
                  </p>
                )}
              </div>
            </div>

            {/* Dropoff Location Details (Authorized Participant View) */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">
                Step 2: Recipient Dropoff
              </span>
              <h4 className="font-bold text-base">Community Handover</h4>
              <p className="text-xs text-gray-300">
                Recipient: <span className="text-white font-semibold">{activeDelivery.requester?.displayName || "Community Member"}</span>
              </p>
              <div className="pt-2 text-xs space-y-1">
                <p className="flex items-start gap-1.5 text-gray-300">
                  <MapPin size={14} className="text-green-400 shrink-0 mt-0.5" />
                  <span>{activeDelivery.dropoffLocation?.address || "Dropoff address registered on claim"}</span>
                </p>
                {activeDelivery.dropoffLocation?.contactPhone && (
                  <p className="flex items-center gap-1.5 text-gray-300">
                    <Phone size={14} className="text-green-400 shrink-0" />
                    <span>Recipient Contact: {activeDelivery.dropoffLocation.contactPhone}</span>
                  </p>
                )}
                {activeDelivery.dropoffLocation?.instructions && (
                  <p className="text-[11px] text-gray-400 italic">
                    Note: {activeDelivery.dropoffLocation.instructions}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Delivery Tasks Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-brand-charcoal">Available Pickup Tasks</h2>
          <span className="text-xs text-gray-500">
            {availableTasks.length} {availableTasks.length === 1 ? "task awaiting volunteer" : "tasks awaiting volunteers"}
          </span>
        </div>

        {activeDelivery && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2">
            <Info size={16} className="text-blue-600 shrink-0" />
            <span>
              You currently have an active delivery task. You may view available tasks, but cannot accept a second delivery until the active delivery finishes.
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-full mb-4" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : availableTasks.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-gray-100 text-center text-gray-500">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-brand-charcoal mb-1">No Available Tasks</h3>
            <p className="text-sm">
              All surplus food donations are currently assigned or in delivery. Check back shortly for new claims.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTasks.map((task) => (
              <div
                key={task.deliveryId}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-bold text-lg text-brand-charcoal line-clamp-1">{task.foodTitle}</h3>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        task.foodType === "veg"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {task.foodType}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Package size={14} className="text-brand-gold shrink-0" />
                      <span>
                        Quantity: <span className="font-semibold text-brand-charcoal">{task.quantity} {task.unit}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-brand-gold shrink-0" />
                      <span>
                        Route: <span className="font-semibold">{task.pickupArea}</span>
                        <ArrowRight size={12} className="inline mx-1 text-gray-400" />
                        <span className="font-semibold">{task.dropoffArea}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-brand-gold shrink-0" />
                      <span>
                        Expires: {new Date(task.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Status: Awaiting Volunteer</span>
                  <button
                    onClick={() => handleAcceptTask(task.deliveryId)}
                    disabled={isAccepting === task.deliveryId || !!activeDelivery}
                    className={`px-4 py-2 font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1 ${
                      activeDelivery
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-brand-gold hover:bg-yellow-500 text-brand-charcoal"
                    }`}
                  >
                    {isAccepting === task.deliveryId ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-brand-charcoal border-t-transparent rounded-full animate-spin" />
                        <span>Accepting...</span>
                      </>
                    ) : (
                      <span>Accept Task</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
