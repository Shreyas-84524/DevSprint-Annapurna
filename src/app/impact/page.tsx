"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Leaf, Users, HeartHandshake, Package, CheckCircle, Activity, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface ImpactStats {
  foodListingsCount: number;
  volunteersCount: number;
  donorsCount: number;
  foodDeliveredCount: number;
  recentListings: Array<{
    id: string;
    title: string;
    foodType: string;
    quantity: number;
    unit: string;
    createdAt: string;
  }>;
}

export default function ImpactPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<ImpactStats>({
    foodListingsCount: 0,
    volunteersCount: 0,
    donorsCount: 0,
    foodDeliveredCount: 0,
    recentListings: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      // 1. Food listings count
      const { count: listingCount } = await supabase
        .from("food_listings")
        .select("*", { count: "exact", head: true });

      // 2. Volunteers count
      const { count: volCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "volunteer");

      // 3. Donors count
      const { count: donCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "donor");

      // 4. Food delivered count
      const { count: delCount } = await supabase
        .from("deliveries")
        .select("*", { count: "exact", head: true })
        .eq("status", "delivered");

      // 5. Recent food listings (privacy-safe projection: no exact address or phone)
      const { data: recentListingsData } = await supabase
        .from("food_listings")
        .select("id, title, food_type, quantity, unit, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        foodListingsCount: listingCount || 0,
        volunteersCount: volCount || 0,
        donorsCount: donCount || 0,
        foodDeliveredCount: delCount || 0,
        recentListings: (recentListingsData || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          foodType: item.food_type,
          quantity: Number(item.quantity),
          unit: item.unit,
          createdAt: item.created_at,
        })),
      });
    } catch {
      // Graceful fallback for offline / disconnected
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-black text-brand-charcoal mb-4">Our Real-Time Impact</h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Annapurna is a verified, community-driven ecosystem. Watch our operational metrics translate surplus food into direct sustenance.
        </p>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <Package className="text-orange-500" size={24} aria-hidden="true" />
          </div>
          <p className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider mb-1">Food Batches Listed</p>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal">
            {loading ? "..." : stats.foodListingsCount}
          </h2>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <Users className="text-green-500" size={24} aria-hidden="true" />
          </div>
          <p className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider mb-1">Active Volunteers</p>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal">
            {loading ? "..." : stats.volunteersCount}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">On-Duty Network</span>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-yellow-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <HeartHandshake className="text-brand-gold" size={24} aria-hidden="true" />
          </div>
          <p className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider mb-1">Verified Donors</p>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal">
            {loading ? "..." : stats.donorsCount}
          </h2>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <CheckCircle className="text-indigo-500" size={24} aria-hidden="true" />
          </div>
          <p className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider mb-1">Deliveries Completed</p>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal">
            {loading ? "..." : stats.foodDeliveredCount}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-2xl font-bold text-brand-charcoal mb-6">Impact Principles</h2>
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-brand-charcoal flex items-center gap-3 mb-4">
              <Shield className="text-blue-500" size={28} aria-hidden="true" />
              1. Dignity First
            </h3>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
              Receiving nourishment should never carry stigma. Beneficiaries browse and claim food discreetly. Exact addresses and contact details are disclosed only to the assigned delivery volunteer.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-brand-charcoal flex items-center gap-3 mb-4">
              <Users className="text-brand-gold" size={28} aria-hidden="true" />
              2. Community Empowerment
            </h3>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
              Annapurna is driven by verified grassroots volunteers and donors working together to build a resilient local safety net across cities and neighborhoods.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-brand-charcoal flex items-center gap-3 mb-4">
              <Leaf className="text-brand-eco" size={28} aria-hidden="true" />
              3. Environmental Stewardship
            </h3>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
              Surplus food decay in landfills generates harmful greenhouse gas emissions. Intercepting safe surplus and enabling zero waste animal rerouting directly curbs carbon impact.
            </p>
          </div>
        </div>

        {/* Live Activity Feed Sidebar */}
        <div className="bg-gray-50 p-6 sm:p-8 rounded-3xl border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-brand-charcoal flex items-center gap-2">
              <Activity className="text-red-500" size={22} aria-hidden="true" />
              Live Available Listings
            </h2>
            <button
              type="button"
              onClick={fetchStats}
              aria-label="Refresh live feed"
              className="p-1.5 text-gray-400 hover:text-brand-charcoal rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-3" role="feed" aria-busy={loading}>
            {stats.recentListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-sm transition-all hover:border-gray-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-brand-charcoal truncate flex-1">{listing.title}</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-yellow-50 text-brand-charcoal">
                    {listing.foodType}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Quantity: {listing.quantity} {listing.unit}
                </p>
                <p className="text-[10px] text-gray-400 mt-2">
                  Listed {new Date(listing.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </p>
              </div>
            ))}
            {stats.recentListings.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                <p>No active public listings at this moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
