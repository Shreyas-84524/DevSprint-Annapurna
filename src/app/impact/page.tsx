"use client";
import { Shield, Leaf, Users, Heart, Package, CheckCircle, Activity } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ImpactPage() {
  const liveStats = useQuery(api.liveUpdates.getDashboardStats);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black text-brand-charcoal mb-4">Our Real-Time Impact</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Annapurna is a community-driven ecosystem. Watch our live metrics to see how your support translates into direct action.
        </p>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <Package className="text-orange-500" size={24} />
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Food Donated</p>
          <h2 className="text-4xl font-black text-brand-charcoal">
            {liveStats?.foodDonationsCount ?? "..."}
          </h2>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <Users className="text-green-500" size={24} />
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Live Volunteers</p>
          <h2 className="text-4xl font-black text-brand-charcoal">
            {liveStats?.volunteersCount ?? "..."}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-medium italic">Online & Active</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <Heart className="text-blue-500" size={24} />
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Funds Raised</p>
          <h2 className="text-4xl font-black text-brand-charcoal">
            ₹{liveStats?.totalMonetaryDonations ?? "..."}
          </h2>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <CheckCircle className="text-indigo-500" size={24} />
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Meals Delivered</p>
          <h2 className="text-4xl font-black text-brand-charcoal">
            {liveStats?.foodDeliveredCount ?? "..."}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <h3 className="text-2xl font-bold text-brand-charcoal mb-6">Impact Principles</h3>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-brand-charcoal flex items-center gap-3 mb-4">
              <Shield className="text-blue-500" size={32} />
              1. Dignity First
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Receiving assistance should never be a source of stigma. Our platform is designed to allow beneficiaries to browse and request available food discreetly. Delivery volunteers must respect beneficiary privacy, facilitating handoffs smoothly and without judgment.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-brand-charcoal flex items-center gap-3 mb-4">
              <Users className="text-brand-gold" size={32} />
              2. Community Empowerment
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Annapurna is built to sustain the community that powers it. Our delivery volunteers are compensated for their time and effort via on-platform revenue and sponsorships, creating a self-sustaining micro-economy.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-brand-charcoal flex items-center gap-3 mb-4">
              <Leaf className="text-brand-eco" size={32} />
              3. Environmental Stewardship
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Food waste contributes to greenhouse gas emissions. By intercepting surplus food and guaranteeing a secondary safety net, we actively reduce the carbon footprint of our operating regions.
            </p>
          </div>
        </div>

        {/* Live Activity Feed Sidebar */}
        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-200">
          <h3 className="text-xl font-bold text-brand-charcoal flex items-center gap-3 mb-6">
            <Activity className="text-red-500" size={24} />
            Live Global Feed
          </h3>
          <div className="space-y-4">
            {liveStats?.recentFoodDonations.map((feed: any) => (
              <div key={feed._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className="font-bold text-brand-charcoal">{feed.donorName}</p>
                <p className="text-gray-500">Donated {feed.quantity} of food</p>
                <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-tighter">Just now • {feed.location}</p>
              </div>
            ))}
            {(!liveStats || liveStats.recentFoodDonations.length === 0) && (
              <div className="text-center py-12 text-gray-400">
                <p className="italic">Waiting for live donations...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
