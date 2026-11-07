"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Package, CheckCircle, MessageSquare, BookOpen, Calendar, Image as ImageIcon, HelpCircle, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { AdminStatsDTO } from "@/types/contracts";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStatsDTO>({
    activeListings: 0,
    completedDeliveries: 0,
    totalDonors: 0,
    totalRequesters: 0,
    totalVolunteers: 0,
    unreadMessages: 0,
    totalUsers: 0,
    pendingDeliveries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Administrator privileges required to view operations metrics.");
        } else {
          setError("Failed to load operations metrics from server.");
        }
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch {
      setError("Network error loading operations board.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminStats();
  }, [fetchAdminStats]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-charcoal mb-2">Admin Command Center</h1>
          <p className="text-gray-600 text-sm sm:text-base">Monitor real-time operations, manage outreach content, and review inquiries.</p>
        </div>
        <button
          type="button"
          onClick={fetchAdminStats}
          disabled={loading}
          aria-label="Refresh operations data"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-brand-charcoal text-sm font-semibold rounded-xl shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center justify-center" aria-live="polite">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading operations board...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-10 rounded-3xl border border-red-100 text-center max-w-lg mx-auto shadow-sm">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={44} aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2 text-brand-charcoal">Operations Board Unavailable</h2>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <button
            type="button"
            onClick={fetchAdminStats}
            className="px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* Stats Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-12">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Listings</span>
                <Package className="text-brand-gold" size={18} aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal">{stats.activeListings}</h2>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Deliveries Done</span>
                <CheckCircle className="text-brand-eco" size={18} aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal">{stats.completedDeliveries}</h2>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Donors</span>
                <Users className="text-brand-charcoal" size={18} aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal">{stats.totalDonors}</h2>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Requesters</span>
                <Users className="text-blue-500" size={18} aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal">{stats.totalRequesters}</h2>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Volunteers</span>
                <Users className="text-emerald-600" size={18} aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal">{stats.totalVolunteers}</h2>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Inquiries</span>
                <MessageSquare className="text-purple-500" size={18} aria-hidden="true" />
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal">{stats.unreadMessages}</h2>
                {stats.unreadMessages > 0 && (
                  <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">New</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Management Navigation Grid */}
          <h2 className="text-xl font-bold text-brand-charcoal mb-6">CMS & Community Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
