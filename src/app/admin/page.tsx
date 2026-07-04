"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Users, Heart, ShieldAlert, CheckSquare, MessageSquare, Plus, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonors: 0,
    totalVolunteers: 0,
    pendingApps: 0,
    pendingDeliveries: 0,
    totalDonations: 0,
    activeNgos: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchAdminStats = async () => {
    try {
      const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true });
      const { count: donorsCount } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "donor");
      const { count: volsCount } = await supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "volunteer");
      const { count: pendingAppsCount } = await supabase.from("volunteer_applications").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: pendingDelCount } = await supabase.from("food_donations").select("*", { count: "exact", head: true }).eq("status", "pending_pickup");
      const { count: ngosCount } = await supabase.from("partner_ngos").select("*", { count: "exact", head: true });

      const { data: donations } = await supabase.from("monetary_donations").select("amount");
      const totalAmount = donations ? donations.reduce((sum, curr) => sum + Number(curr.amount), 0) : 0;

      setStats({
        totalUsers: usersCount || 0,
        totalDonors: donorsCount || 0,
        totalVolunteers: volsCount || 0,
        pendingApps: pendingAppsCount || 0,
        pendingDeliveries: pendingDelCount || 0,
        totalDonations: totalAmount || 0,
        activeNgos: ngosCount || 0
      });
    } catch (err) {
      console.error("Error loading admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-brand-charcoal mb-2">Admin Command Center</h1>
          <p className="text-gray-600">Control system operations, review applications, and publish outreach contents.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4"></span>
          <p className="text-gray-500">Loading operations board...</p>
        </div>
      ) : (
        <>
          {/* Stats Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Registered Users</span>
                <Users className="text-brand-gold" size={20} />
              </div>
              <h3 className="text-3xl font-black text-brand-charcoal">{stats.totalUsers}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Volunteers</span>
                <Users className="text-brand-eco" size={20} />
              </div>
              <h3 className="text-3xl font-black text-brand-charcoal">{stats.totalVolunteers}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Monetary Donations</span>
                <Heart className="text-red-500" size={20} />
              </div>
              <h3 className="text-3xl font-black text-brand-charcoal">₹{stats.totalDonations.toLocaleString()}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Pending Apps</span>
                <ShieldAlert className="text-yellow-500" size={20} />
              </div>
              <h3 className="text-3xl font-black text-brand-charcoal">{stats.pendingApps}</h3>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <h2 className="text-2xl font-bold text-brand-charcoal mb-6">Management Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/admin/blogs" className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-gold transition-colors flex items-start gap-4">
              <div className="bg-yellow-50 text-brand-gold p-3 rounded-xl"><Plus size={24} /></div>
              <div>
                <h3 className="font-bold text-lg text-brand-charcoal">Manage Blog</h3>
                <p className="text-gray-500 text-xs mt-1">Publish operational stories and community insights.</p>
              </div>
            </Link>

            <Link href="/admin/events" className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-gold transition-colors flex items-start gap-4">
              <div className="bg-yellow-50 text-brand-gold p-3 rounded-xl"><Plus size={24} /></div>
              <div>
                <h3 className="font-bold text-lg text-brand-charcoal">Manage Events</h3>
                <p className="text-gray-500 text-xs mt-1">Schedule food redistribution outreach events.</p>
              </div>
            </Link>

            <Link href="/admin/faqs" className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-gold transition-colors flex items-start gap-4">
              <div className="bg-yellow-50 text-brand-gold p-3 rounded-xl"><Plus size={24} /></div>
              <div>
                <h3 className="font-bold text-lg text-brand-charcoal">Manage FAQ</h3>
                <p className="text-gray-500 text-xs mt-1">Update operational Q&As for website visitors.</p>
              </div>
            </Link>

            <Link href="/admin/gallery" className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-gold transition-colors flex items-start gap-4">
              <div className="bg-yellow-50 text-brand-gold p-3 rounded-xl"><Plus size={24} /></div>
              <div>
                <h3 className="font-bold text-lg text-brand-charcoal">Manage Gallery</h3>
                <p className="text-gray-500 text-xs mt-1">Upload hunger drive capture photos.</p>
              </div>
            </Link>

            <Link href="/admin/messages" className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-gold transition-colors flex items-start gap-4">
              <div className="bg-yellow-50 text-brand-gold p-3 rounded-xl"><MessageSquare size={24} /></div>
              <div>
                <h3 className="font-bold text-lg text-brand-charcoal">Visitor Messages</h3>
                <p className="text-gray-500 text-xs mt-1">Review contact inquiries submitted by users.</p>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
