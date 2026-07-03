"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getRouteBetweenAddresses } from "@/utils/ors";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, ShieldCheck, MapPin, Package, CheckCircle2, AlertTriangle, Wallet, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { DynamicMap } from "@/components/map";

export default function VolunteerDashboard() {
  const volunteers = useQuery(api.users.getVolunteers);
  const createUser = useMutation(api.users.createUser);
  const withdrawEarnings = useMutation(api.users.withdrawEarnings);
  const [volunteerId, setVolunteerId] = useState<Id<"users"> | null>(null);

  useEffect(() => {
    if (volunteers !== undefined && volunteers.length === 0) {
      createUser({
        name: "Mock Volunteer",
        email: "volunteer@mock.com",
        phone: "9999999999",
        role: "volunteer"
      }).then(id => setVolunteerId(id as Id<"users">));
    } else if (volunteers && volunteers.length > 0) {
      setVolunteerId(volunteers[0]._id);
    }
  }, [volunteers, createUser]);

  const me = volunteers?.find(v => v._id === volunteerId);

  const foodListings = useQuery(api.food.getFoodItems) || [];
  const requests = useQuery(api.requests.getRequests) || [];
  
  const acceptPickup = useMutation(api.food.acceptPickup);
  const dropAtWarehouse = useMutation(api.food.dropAtWarehouse);
  const verifyQuality = useMutation(api.food.verifyQuality);
  
  const acceptDelivery = useMutation(api.requests.acceptDelivery);
  const completeDelivery = useMutation(api.requests.completeDelivery);

  const pendingPickups = foodListings.filter(item => item.status === "pending_pickup");
  const myPickups = foodListings.filter(item => item.volunteerId === volunteerId && item.status === "pickup_assigned");
  
  const pendingDeliveries = requests.filter(req => req.status === "pending");
  const myDeliveries = requests.filter(req => req.volunteerId === volunteerId && req.status === "accepted");

  const [activeTab, setActiveTab] = useState<"pickups" | "deliveries">("pickups");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const WAREHOUSE_LOCATION = "Bandra West, Mumbai";

  const handleAcceptPickup = async (item: any) => {
    if (!volunteerId) return;
    setIsProcessing(item._id);
    try {
      const route = await getRouteBetweenAddresses(WAREHOUSE_LOCATION, item.location);
      const distance = route ? route.distanceKm : 5.0; // fallback to 5km if ORS fails
      const eta = route ? route.durationMin : 15;
      
      await acceptPickup({
        id: item._id,
        volunteerId,
        pickupDistanceKm: distance,
        etaMinutes: eta
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDropWarehouse = async (id: Id<"foodListings">) => {
    setIsProcessing(id);
    try {
      await dropAtWarehouse({ id, volunteerId: volunteerId! });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAcceptDelivery = async (req: any) => {
    if (!volunteerId) return;
    
    // Find an available food listing at warehouse
    const availableFood = foodListings.find(f => f.status === "at_warehouse");
    if (!availableFood) {
      alert("No food available at the warehouse to deliver! Please complete a pickup first.");
      return;
    }
    
    setIsProcessing(req._id);
    try {
      const route = await getRouteBetweenAddresses(WAREHOUSE_LOCATION, req.location);
      const distance = route ? route.distanceKm : 5.0; 
      const eta = route ? route.durationMin : 15;

      await acceptDelivery({
        requestId: req._id,
        foodListingId: availableFood._id,
        volunteerId,
        deliveryDistanceKm: distance,
        etaMinutes: eta
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCompleteDelivery = async (requestId: Id<"foodRequests">) => {
    setIsProcessing(requestId);
    try {
      await completeDelivery({ requestId, volunteerId: volunteerId! });
    } finally {
      setIsProcessing(null);
    }
  };

  if (!volunteerId) return <div className="p-12 text-center flex flex-col items-center"><span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4"></span>Loading Volunteer Profile...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-charcoal mb-2">Volunteer Command Center</h1>
          <p className="text-gray-600">Accept jobs, route to the warehouse, and earn pay.</p>
        </div>
        
        {/* Earnings Wallet */}
        <div className="mt-4 md:mt-0 bg-green-50 border border-green-200 text-brand-eco px-6 py-3 rounded-xl flex items-center gap-4 shadow-sm transform transition hover:scale-105">
          <div className="flex items-center gap-3">
            <Wallet size={24} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide">Your Earnings</p>
              <p className="text-2xl font-black">₹{me?.earnings?.toFixed(2) || "0.00"}</p>
            </div>
          </div>
          {(me?.earnings || 0) > 0 && (
            <button 
              onClick={async () => {
                if (volunteerId) {
                  await withdrawEarnings({ id: volunteerId });
                  alert("Withdrawal to bank account initiated successfully! (Simulated)");
                }
              }}
              className="ml-4 px-4 py-2 bg-brand-eco text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              Withdraw to Bank
            </button>
          )}
        </div>
      </div>

      {/* Live Map Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-brand-charcoal mb-4">Live Route Map</h2>
        <DynamicMap />
      </div>

      <div className="flex bg-brand-slate p-1 rounded-lg mb-8 inline-flex">
        <button
          onClick={() => setActiveTab("pickups")}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${
            activeTab === "pickups" ? "bg-brand-white text-brand-charcoal shadow-sm" : "text-gray-500 hover:text-brand-charcoal"
          }`}
        >
          Pickups ({pendingPickups.length + myPickups.length})
        </button>
        <button
          onClick={() => setActiveTab("deliveries")}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${
            activeTab === "deliveries" ? "bg-brand-white text-brand-charcoal shadow-sm" : "text-gray-500 hover:text-brand-charcoal"
          }`}
        >
          Deliveries ({pendingDeliveries.length + myDeliveries.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "pickups" && (
          <motion.div key="pickups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {myPickups.length > 0 && (
              <>
                <h2 className="text-xl font-bold mb-4 text-brand-charcoal">Your Active Pickups</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {myPickups.map(item => (
                    <div key={item._id} className="bg-brand-white p-6 rounded-2xl shadow-md border-2 border-brand-gold relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10"><Package size={80}/></div>
                      <h3 className="font-bold text-xl mb-2">{item.title}</h3>
                      <p className="text-gray-600 mb-4 font-medium">{item.location} → Warehouse</p>
                      
                      <div className="flex items-center gap-2 mb-6 text-sm font-bold text-brand-gold">
                        <Clock size={16} /> Distance: {item.pickupDistanceKm} km
                      </div>
                      
                      {item.qualityPassed === undefined && item.donorType !== "individual" ? (
                          <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                            <p className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2"><ShieldCheck size={16}/> Perform Quality Check On-Site</p>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => verifyQuality({ id: item._id, passed: true })} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-bold transition-colors">Looks Good</button>
                              <button onClick={() => verifyQuality({ id: item._id, passed: false })} className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded text-sm font-bold transition-colors">Reject</button>
                            </div>
                          </div>
                      ) : item.qualityPassed === false ? (
                          <div className="bg-red-50 p-4 rounded-xl mb-4 border border-red-100">
                            <p className="text-red-600 font-bold flex items-center gap-2"><AlertTriangle size={18}/> Rejected. Please dispose.</p>
                          </div>
                      ) : (
                          <button 
                            onClick={() => handleDropWarehouse(item._id)}
                            disabled={isProcessing === item._id}
                            className="w-full py-3 bg-brand-charcoal hover:bg-gray-800 text-white rounded-lg font-bold flex justify-center transition-colors"
                          >
                            {isProcessing === item._id ? "Processing..." : "Drop at Warehouse & Earn Pay"}
                          </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="text-xl font-bold mb-4 text-brand-charcoal">Available Pickups from Donors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingPickups.length === 0 ? <p className="text-gray-500 bg-gray-50 p-6 rounded-xl border border-gray-100">No pending pickups.</p> : pendingPickups.map(item => (
                 <div key={item._id} className="bg-brand-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-brand-gold transition-colors">
                   <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                   <div className="text-sm text-gray-600 mb-6 flex flex-col gap-2">
                     <span className="flex items-center gap-2"><MapPin size={16} className="text-brand-gold"/> {item.location}</span>
                     <span className="flex items-center gap-2"><Package size={16} className="text-brand-gold"/> {item.quantity}</span>
                     <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mt-2">Donor: {item.donorType}</span>
                   </div>
                   <button 
                      onClick={() => handleAcceptPickup(item)}
                      disabled={isProcessing === item._id}
                      className="w-full py-3 bg-yellow-100 text-yellow-800 rounded-lg font-bold hover:bg-yellow-200 transition-colors"
                    >
                      {isProcessing === item._id ? "Calculating Route..." : "Accept Pickup"}
                    </button>
                 </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "deliveries" && (
          <motion.div key="deliveries" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {myDeliveries.length > 0 && (
              <>
                <h2 className="text-xl font-bold mb-4 text-brand-charcoal">Your Active Deliveries</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {myDeliveries.map(req => (
                    <div key={req._id} className="bg-brand-white p-6 rounded-2xl shadow-md border-2 border-brand-eco relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10"><Navigation size={80}/></div>
                      <h3 className="font-bold text-xl mb-2">Deliver to {req.requesterName}</h3>
                      <p className="text-gray-600 mb-4 font-medium">Warehouse → {req.location}</p>
                      
                      <div className="flex flex-col gap-1 mb-6 text-sm font-bold text-brand-eco">
                        <span className="flex items-center gap-2"><MapPin size={16} /> Distance: {req.deliveryDistanceKm} km</span>
                        <span className="flex items-center gap-2"><Clock size={16} /> ETA: {req.etaMinutes} mins</span>
                      </div>
                      
                      <button 
                        onClick={() => handleCompleteDelivery(req._id)}
                        disabled={isProcessing === req._id}
                        className="w-full py-3 bg-brand-eco hover:bg-green-600 text-white rounded-lg font-bold flex justify-center transition-colors"
                      >
                        {isProcessing === req._id ? "Processing..." : "Mark Delivered & Earn Pay"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="text-xl font-bold mb-4 text-brand-charcoal">Pending Requests from Beneficiaries</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingDeliveries.length === 0 ? <p className="text-gray-500 bg-gray-50 p-6 rounded-xl border border-gray-100">No pending requests.</p> : pendingDeliveries.map(req => (
                 <div key={req._id} className="bg-brand-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-brand-eco transition-colors">
                   <h3 className="font-bold text-lg mb-2">{req.requesterName}</h3>
                   <div className="text-sm text-gray-600 mb-6 flex flex-col gap-2">
                     <span className="flex items-center gap-2"><MapPin size={16} className="text-brand-eco"/> {req.location}</span>
                     <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mt-2">Type: {req.requestType.replace("_", " ")}</span>
                   </div>
                   <button 
                      onClick={() => handleAcceptDelivery(req)}
                      disabled={isProcessing === req._id}
                      className="w-full py-3 bg-green-50 text-brand-eco rounded-lg font-bold hover:bg-green-100 transition-colors"
                    >
                      {isProcessing === req._id ? "Calculating Route..." : "Accept Delivery"}
                    </button>
                 </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
