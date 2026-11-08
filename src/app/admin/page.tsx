"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Package,
  CheckCircle,
  MessageSquare,
  BookOpen,
  Calendar,
  Image as ImageIcon,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Clock,
  Truck,
  HeartHandshake,
  ShieldCheck,
  Activity,
  CalendarCheck,
} from "lucide-react";
import Link from "next/link";
import { AdminStatsDTO, RecentActivityItemDTO } from "@/types/contracts";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStatsDTO>({
    activeListings: 0,
    deliveriesAwaitingVolunteer: 0,
    deliveriesInProgress: 0,
    deliveriesCompletedToday: 0,
    totalCompletedDeliveries: 0,
    completedDeliveries: 0,
    totalDonors: 0,
    totalRequesters: 0,
    totalVolunteers: 0,
    unreadMessages: 0,
    totalUsers: 0,
    pendingDeliveries: 0,
    recentActivity: [],
    lastUpdated: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const fetchAdminStats = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setIsUnauthorized(true);
          setError("Administrator privileges required to view operations metrics.");
        } else {
          setError("Failed to load operations metrics from server.");
        }
        return;
      }
      const payload = await res.json();
      if (!payload.data) {
        setError("The operations metrics response was incomplete.");
        return;
      }
      setStats(payload.data);
      setLastRefreshedAt(new Date());
    } catch {
      setError("Network error loading operations board.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch and auto-refresh every 45 seconds when page is visible
  useEffect(() => {
    fetchAdminStats();

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchAdminStats(true);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [fetchAdminStats]);

  const awaitingVolunteers = stats.deliveriesAwaitingVolunteer ?? stats.pendingDeliveries ?? 0;
  const inProgressDeliveries = stats.deliveriesInProgress ?? 0;
  const completedToday = stats.deliveriesCompletedToday ?? 0;
  const totalCompleted = stats.totalCompletedDeliveries ?? stats.completedDeliveries ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              Operations Center
            </span>
            {lastRefreshedAt && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={12} aria-hidden="true" />
                Updated {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-charcoal tracking-tight">
            Admin Command Center
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">
            Real-time rescue tracking, active inventory, community membership, and operational telemetry.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAdminStats(false)}
          disabled={loading || refreshing}
          aria-label="Refresh operations data"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-brand-charcoal text-sm font-semibold rounded-xl shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading || refreshing ? "animate-spin text-brand-gold" : "text-gray-500"}
            aria-hidden="true"
          />
          <span>{loading || refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center justify-center" aria-live="polite">
          <span className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Connecting to operations database...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-10 rounded-3xl border border-red-100 text-center max-w-lg mx-auto shadow-sm" role="alert">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={44} aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2 text-brand-charcoal">Operations Board Unavailable</h2>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          {isUnauthorized ? (
            <Link
              href="/login/admin"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Sign In as Administrator</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => fetchAdminStats(false)}
              className="px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Retry Connection
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Section 1: Live Delivery & Food Metrics */}
          <div className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-brand-gold" aria-hidden="true" />
              <span>Real-Time Rescue Operations</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Deliveries Awaiting Volunteer */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Awaiting Volunteer</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                    <Clock size={18} aria-hidden="true" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-brand-charcoal">{awaitingVolunteers}</h3>
                  {awaitingVolunteers > 0 && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Needs Action
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Claimed donations awaiting driver pickup assignment</p>
              </div>

              {/* Deliveries In Progress */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">In Transit</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                    <Truck size={18} aria-hidden="true" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-brand-charcoal">{inProgressDeliveries}</h3>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Assigned rescues actively being picked up or delivered</p>
              </div>

              {/* Deliveries Completed Today */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Completed Today</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <CalendarCheck size={18} aria-hidden="true" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-brand-charcoal">{completedToday}</h3>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Delivered meals verified with recipient OTP today</p>
              </div>

              {/* Total Completed Deliveries */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Rescues</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <CheckCircle size={18} aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-brand-charcoal">{totalCompleted}</h3>
                <p className="text-xs text-gray-500 mt-2">Cumulative verified meals saved from landfill</p>
              </div>
            </div>
          </div>

          {/* Section 2: Active Inventory & Community Membership */}
          <div className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <Users size={16} className="text-brand-charcoal" aria-hidden="true" />
              <span>Platform Inventory & User Base</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Active Listings */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs font-bold uppercase">Active Posts</span>
                  <Package className="text-brand-gold" size={16} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black text-brand-charcoal">{stats.activeListings}</h3>
                <span className="text-xs text-gray-400">Available food</span>
              </div>

              {/* Total Donors */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs font-bold uppercase">Donors</span>
                  <HeartHandshake className="text-amber-600" size={16} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black text-brand-charcoal">{stats.totalDonors}</h3>
                <span className="text-xs text-gray-400">Verified donors</span>
              </div>

              {/* Total Requesters */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs font-bold uppercase">Requesters</span>
                  <Users className="text-blue-500" size={16} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black text-brand-charcoal">{stats.totalRequesters}</h3>
                <span className="text-xs text-gray-400">Verified recipients</span>
              </div>

              {/* Total Volunteers */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs font-bold uppercase">Volunteers</span>
                  <Truck className="text-emerald-600" size={16} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black text-brand-charcoal">{stats.totalVolunteers}</h3>
                <span className="text-xs text-gray-400">Active drivers</span>
              </div>

              {/* Total Platform Users */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs font-bold uppercase">Total Users</span>
                  <Users className="text-brand-charcoal" size={16} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-black text-brand-charcoal">{stats.totalUsers}</h3>
                <span className="text-xs text-gray-400">All registered</span>
              </div>

              {/* Inquiries */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs font-bold uppercase">Inquiries</span>
                  <MessageSquare className="text-purple-500" size={16} aria-hidden="true" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-2xl font-black text-brand-charcoal">{stats.unreadMessages}</h3>
                  {stats.unreadMessages > 0 && (
                    <span className="text-xs text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded-full">
                      New
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">Unread contact</span>
              </div>
            </div>
          </div>

          {/* Section 3: Recent Operational Activity */}
          <div className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-gray-500" aria-hidden="true" />
              <span>Recent Operational Activity</span>
            </h2>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity: RecentActivityItemDTO) => (
                  <div key={activity.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-gray-100 text-brand-charcoal shrink-0 mt-0.5">
                        {activity.type === "delivery" ? (
                          <Truck size={16} aria-hidden="true" />
                        ) : activity.type === "listing" ? (
                          <Package size={16} aria-hidden="true" />
                        ) : (
                          <Activity size={16} aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-brand-charcoal">{activity.title}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {activity.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{activity.summary}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 sm:text-right shrink-0">
                      {new Date(activity.timestamp).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No recent operational events recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Quick Management Navigation Grid */}
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
            CMS & Community Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Link
              href="/admin/blogs"
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <div className="w-12 h-12 bg-yellow-50 text-brand-gold rounded-2xl flex items-center justify-center shrink-0">
                <BookOpen size={24} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-brand-charcoal group-hover:text-brand-gold transition-colors">
                    Articles & Stories
                  </h3>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-brand-gold transition-colors" aria-hidden="true" />
                </div>
                <p className="text-gray-500 text-sm mt-1">Create, edit, and publish community impact stories.</p>
              </div>
            </Link>

            <Link
              href="/admin/events"
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <div className="w-12 h-12 bg-emerald-50 text-brand-eco rounded-2xl flex items-center justify-center shrink-0">
                <Calendar size={24} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-brand-charcoal group-hover:text-brand-eco transition-colors">
                    Community Drives
                  </h3>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-brand-eco transition-colors" aria-hidden="true" />
                </div>
                <p className="text-gray-500 text-sm mt-1">Schedule food distribution drives and volunteer events.</p>
              </div>
            </Link>

            <Link
              href="/admin/gallery"
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <ImageIcon size={24} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-brand-charcoal group-hover:text-blue-600 transition-colors">
                    Photo Gallery
                  </h3>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" aria-hidden="true" />
                </div>
                <p className="text-gray-500 text-sm mt-1">Upload verified photos from food rescue operations.</p>
              </div>
            </Link>

            <Link
              href="/admin/faqs"
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                <HelpCircle size={24} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-brand-charcoal group-hover:text-orange-600 transition-colors">
                    Knowledge Base FAQs
                  </h3>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-orange-600 transition-colors" aria-hidden="true" />
                </div>
                <p className="text-gray-500 text-sm mt-1">Manage food safety and workflow help guides.</p>
              </div>
            </Link>

            <Link
              href="/admin/messages"
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                <MessageSquare size={24} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-brand-charcoal group-hover:text-purple-600 transition-colors">
                      Visitor Messages
                    </h3>
                    {stats.unreadMessages > 0 && (
                      <span className="bg-brand-gold text-black text-xs font-bold px-2 py-0.5 rounded-full">
                        {stats.unreadMessages}
                      </span>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-purple-600 transition-colors" aria-hidden="true" />
                </div>
                <p className="text-gray-500 text-sm mt-1">Review contact inquiries submitted by the public.</p>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
