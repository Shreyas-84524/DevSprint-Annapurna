"use client";

import { createClient } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Package, Clock, Utensils, CheckCircle2, Navigation } from "lucide-react";
import { useState, useEffect } from "react";

export default function BeneficiaryDashboard() {
  const [foodListings, setFoodListings] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "veg" | "non-veg">("all");
  
  const supabase = createClient();

  const fetchListingsAndRequests = async () => {
    // 1. Fetch available food donations
    const { data: listingsData } = await supabase
      .from("food_donations")
      .select("*")
      .order("created_at", { ascending: false });

    if (listingsData) {
      setFoodListings(listingsData);
    }

    // 2. Fetch requests for this logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      const { data: requestsData } = await supabase
        .from("food_requests")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });
      
      if (requestsData) {
        setMyRequests(requestsData);
      }
    }
  };

  useEffect(() => {
    fetchListingsAndRequests();

    // Subscribe to database changes
    const donationsChannel = supabase
      .channel("realtime-food-listings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_donations" },
        () => {
          fetchListingsAndRequests();
        }
      )
      .subscribe();

    const requestsChannel = supabase
      .channel("realtime-food-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_requests" },
        () => {
          fetchListingsAndRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(donationsChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [supabase]);

  // Show food that is either pending pickup, at warehouse, or newly posted
  const availableFood = foodListings.filter(item => 
    ["pending_pickup", "pickup_assigned", "at_warehouse", "pending_delivery"].includes(item.status) &&
    (filter === "all" || item.food_type === filter)
  );

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>, foodId: string) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const location = formData.get("location") as string;
      const requestType = formData.get("requestType") as string;
      const requesterName = currentUser?.user_metadata?.name || currentUser?.email || "Current Requester";

      // 1. Insert into food_requests
      const { error: requestError } = await supabase
        .from("food_requests")
        .insert({
          food_donation_id: foodId,
          requester_id: currentUser?.id || null,
          requester_name: requesterName,
          request_type: requestType,
          location: location,
          status: "pending"
        });

      if (requestError) throw requestError;

      // 2. Patch food_donations status to pending_delivery
      const { error: donationError } = await supabase
        .from("food_donations")
        .update({ status: "pending_delivery" })
        .eq("id", foodId);

      if (donationError) throw donationError;

      setClaimingId(null);
      await fetchListingsAndRequests();
    } catch (err) {
      console.error("Error creating food request:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">Available Food & Requests</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Browse surplus food from the warehouse and donors. Claim a meal, and track the volunteer delivery with Live ETA.
        </p>
      </div>

      {/* Active Requests Tracker */}
      {myRequests.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-brand-charcoal mb-6">Your Active Requests & Live ETA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myRequests.map(req => (
              <div key={req.id} className="bg-gradient-to-br from-brand-charcoal to-gray-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Navigation size={80} />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg">Delivery to {req.location}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${req.status === 'accepted' ? 'bg-green-500/20 text-green-300' : req.status === 'completed' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                      {req.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {req.status === "accepted" && req.eta_minutes !== null && req.eta_minutes !== undefined ? (
                     <div className="mt-6 flex items-center gap-4 bg-white/10 p-4 rounded-xl border border-white/20">
                       <Clock className="text-brand-gold animate-pulse" size={32} />
                       <div>
                         <p className="text-sm text-gray-300">Live Volunteer ETA</p>
                         <p className="text-2xl font-bold text-brand-gold">{req.eta_minutes} mins away</p>
                       </div>
                     </div>
                  ) : req.status === "completed" ? (
                     <div className="mt-6 flex items-center gap-4 bg-green-500/20 p-4 rounded-xl border border-green-500/30">
                       <CheckCircle2 className="text-green-400" size={32} />
                       <div>
                         <p className="text-xl font-bold text-green-400">Delivered Successfully</p>
                       </div>
                     </div>
                  ) : (
                     <div className="mt-6 bg-white/5 p-4 rounded-xl border border-white/10">
                       <p className="text-sm text-gray-300 flex items-center gap-2">
                         <span className="w-4 h-4 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
                         Waiting for a volunteer...
                       </p>
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-brand-charcoal">Available Food</h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setFilter("all")} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'all' ? 'bg-white shadow-sm text-brand-charcoal' : 'text-gray-500'}`}>ALL</button>
          <button onClick={() => setFilter("veg")} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${filter === 'veg' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>
            <div className="w-2 h-2 rounded-full bg-green-500" /> VEG
          </button>
          <button onClick={() => setFilter("non-veg")} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${filter === 'non-veg' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}>
            <div className="w-2 h-2 rounded-full bg-red-500" /> NON-VEG
          </button>
        </div>
      </div>
      {availableFood.length === 0 ? (
        <div className="bg-brand-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
          <Utensils size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-brand-charcoal mb-2">No food available right now</h2>
          <p className="text-gray-500">Check back later. Donors frequently post new surplus food.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {availableFood.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="bg-brand-white rounded-2xl overflow-hidden shadow-sm border border-brand-slate hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-brand-charcoal line-clamp-2">{item.title}</h3>
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-6 line-clamp-3">{item.description}</p>
                  
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${item.food_type === 'veg' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        <div className={`w-3 h-3 rounded-full ${item.food_type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                      </div>
                      <span className="font-bold capitalize">{item.food_type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-50 p-1.5 rounded-full text-brand-gold">
                        <Package size={16} />
                      </div>
                      <span className="font-medium text-brand-charcoal">{item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-50 p-1.5 rounded-full text-brand-gold">
                        <MapPin size={16} />
                      </div>
                      <span className="truncate">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-50 p-1.5 rounded-full text-brand-gold">
                        <Clock size={16} />
                      </div>
                      <span suppressHydrationWarning>Posted {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-brand-slate bg-gray-50">
                  {claimingId === item.id ? (
                    <form onSubmit={(e) => handleRequestSubmit(e, item.id)} className="space-y-3">
                      <select name="requestType" required className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-brand-gold border-gray-300">
                        <option value="self">Request for Myself</option>
                        <option value="third_party">Request for Someone Else (Requires Photo)</option>
                        <option value="ngo">Request for NGO</option>
                      </select>
                      <input name="location" required type="text" placeholder="Where should we deliver?" className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-brand-gold border-gray-300" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setClaimingId(null)} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-brand-charcoal text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-gray-800">
                          {isSubmitting ? "Sending..." : "Confirm"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setClaimingId(item.id)}
                      className="w-full py-3 bg-brand-charcoal text-brand-white rounded-lg font-bold hover:bg-gray-800 transition-colors flex justify-center items-center"
                    >
                      Request Delivery
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
