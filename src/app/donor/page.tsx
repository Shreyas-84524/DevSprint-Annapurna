"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CheckCircle2, Clock, MapPin, Package, Camera, Building2, User } from "lucide-react";

export default function DonorDashboard() {
  const foodListings = useQuery(api.food.getFoodItems) || [];
  const addFoodItem = useMutation(api.food.addFoodItem);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [donorType, setDonorType] = useState<"individual" | "restaurant" | "caterer">("individual");
  const [foodType, setFoodType] = useState<"veg" | "non-veg">("veg");
  const [imageAttached, setImageAttached] = useState(false);

  // In a real app we'd filter by logged-in user ID. Here we just show all or mock it.
  const myDonations = foodListings.filter(item => item.donorName === "Current User");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const payload = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        quantity: formData.get("quantity") as string,
        location: formData.get("location") as string,
        donorName: "Current User",
        donorType: donorType,
        foodType: foodType,
      };

      await addFoodItem(payload);
      
      // Background sync to Google Sheets
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(console.error);
      
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setImageAttached(false);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Donation Form */}
        <div className="lg:col-span-1">
          <div className="bg-brand-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-2xl font-bold text-brand-charcoal mb-6">Donate Surplus Food</h2>
            
            {success ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 border border-green-200 text-brand-eco p-4 rounded-lg flex flex-col items-center justify-center py-8 text-center"
              >
                <CheckCircle2 size={48} className="mb-4" />
                <h3 className="text-xl font-bold mb-2">Donation Posted!</h3>
                <p className="text-sm">Volunteers are being notified to pick it up.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Donor Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">I am donating as:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setDonorType("individual")} className={`p-2 text-xs flex flex-col items-center gap-1 rounded border ${donorType === 'individual' ? 'border-brand-gold bg-yellow-50 text-brand-gold' : 'border-gray-200'}`}>
                      <User size={16} /> Individual
                    </button>
                    <button type="button" onClick={() => setDonorType("restaurant")} className={`p-2 text-xs flex flex-col items-center gap-1 rounded border ${donorType === 'restaurant' ? 'border-brand-gold bg-yellow-50 text-brand-gold' : 'border-gray-200'}`}>
                      <Building2 size={16} /> Restaurant
                    </button>
                    <button type="button" onClick={() => setDonorType("caterer")} className={`p-2 text-xs flex flex-col items-center gap-1 rounded border ${donorType === 'caterer' ? 'border-brand-gold bg-yellow-50 text-brand-gold' : 'border-gray-200'}`}>
                      <Package size={16} /> Caterer
                    </button>
                  </div>
                </div>

                {/* Food Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Food Type:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFoodType("veg")} className={`p-2 text-xs flex items-center justify-center gap-2 rounded border ${foodType === 'veg' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}>
                      <div className={`w-3 h-3 rounded-full border ${foodType === 'veg' ? 'bg-green-500' : 'bg-transparent'}`} /> Veg
                    </button>
                    <button type="button" onClick={() => setFoodType("non-veg")} className={`p-2 text-xs flex items-center justify-center gap-2 rounded border ${foodType === 'non-veg' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200'}`}>
                      <div className={`w-3 h-3 rounded-full border ${foodType === 'non-veg' ? 'bg-red-500' : 'bg-transparent'}`} /> Non-Veg
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Food Title</label>
                  <input name="title" required type="text" placeholder="e.g., 20 boxes of Veg Biryani" className="w-full px-4 py-2 bg-brand-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-gold outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea name="description" required rows={2} placeholder="Briefly describe the food..." className="w-full px-4 py-2 bg-brand-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-gold outline-none"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity / Servings</label>
                  <input name="quantity" required type="text" placeholder="e.g., Serves 15" className="w-full px-4 py-2 bg-brand-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-gold outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                  <input name="location" required type="text" placeholder="Full address" className="w-full px-4 py-2 bg-brand-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-gold outline-none" />
                </div>

                {/* Conditional Photo Upload for Individuals */}
                {donorType === "individual" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photo (Required for Individuals)</label>
                    <label className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${imageAttached ? 'border-brand-eco bg-green-50 text-brand-eco' : 'border-gray-300 hover:border-brand-gold text-gray-500'}`}>
                      {imageAttached ? <CheckCircle2 size={20} /> : <Camera size={20} />}
                      <span className="text-sm font-medium">{imageAttached ? 'Photo Attached' : 'Tap to take photo'}</span>
                      <input type="file" required accept="image/*" className="hidden" onChange={(e) => setImageAttached(!!e.target.files?.length)} />
                    </label>
                  </div>
                )}
                {donorType !== "individual" && (
                  <div className="bg-blue-50 text-blue-800 p-3 rounded text-xs">
                    As a verified {donorType}, photo upload is skipped. A volunteer will physically inspect the food upon arrival.
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md flex justify-center items-center mt-4 ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-brand-gold hover:bg-yellow-600"}`}>
                  {isSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : "Post Donation"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Donation History / Active Listings */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-brand-charcoal mb-6">Your Recent Donations</h2>
          
          <div className="space-y-4">
            {myDonations.length === 0 ? (
              <div className="bg-brand-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
                You haven't posted any donations yet.
              </div>
            ) : (
              myDonations.map((item, idx) => (
                <motion.div key={item._id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="bg-brand-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-brand-charcoal">{item.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      item.status === "pending_pickup" ? "bg-yellow-100 text-yellow-800" :
                      item.status === "pickup_assigned" ? "bg-blue-100 text-blue-800" :
                      item.status === "at_warehouse" ? "bg-purple-100 text-purple-800" :
                      item.status === "delivered" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
 
                  {item.status === "pickup_assigned" && item.etaMinutes !== undefined && (
                    <div className="mb-6 bg-brand-charcoal text-white p-4 rounded-xl flex items-center gap-4 border border-gray-700 shadow-inner">
                      <Clock className="text-brand-gold animate-pulse" size={28} />
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Volunteer is on the way</p>
                        <p className="text-xl font-bold text-brand-gold">Arriving in {item.etaMinutes} mins</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      {item.foodType === 'veg' ? <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600" /> : <div className="w-3 h-3 rounded-full bg-red-500 border border-red-600" />}
                      <span className="capitalize font-bold">{item.foodType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-brand-gold" />
                      {item.quantity}
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <MapPin size={16} className="text-brand-gold" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-2" suppressHydrationWarning>
                      <Clock size={16} className="text-brand-gold" />
                      {new Date(item._creationTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
