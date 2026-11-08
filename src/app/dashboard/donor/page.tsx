"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import {
  CheckCircle2,
  Clock,
  Package,
  Camera,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Send,
  X,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { FoodType, ListingDTO, ListingStatus, FOOD_TYPES } from "@/types/contracts";

interface FormState {
  title: string;
  description: string;
  quantity: string;
  unit: string;
  foodType: FoodType;
  dietaryTags: string[];
  expiresHours: number;
  publishImmediately: boolean;
  address: string;
}

const INITIAL_FORM: FormState = {
  title: "",
  description: "",
  quantity: "",
  unit: "servings",
  foodType: "veg",
  dietaryTags: [],
  expiresHours: 6,
  publishImmediately: true,
  address: "",
};

export default function DonorDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [listings, setListings] = useState<ListingDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Editing state
  const [editingListing, setEditingListing] = useState<ListingDTO | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const supabase = createClient();

  // Load user and profile
  const loadUserAndProfile = useCallback(async () => {
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }
      setCurrentUser(user);

      // Fetch profile via /api/me or direct supabase select
      const res = await fetch("/api/me");
      if (res.ok) {
        const json = await res.json();
        setUserProfile(json.data);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, display_name")
          .eq("id", user.id)
          .maybeSingle();
        setUserProfile(profile);
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      setIsOffline(true);
    }
  }, [supabase]);

  // Re-fetch canonical listings from database (RLS ensures donor only sees their own)
  const fetchMyListings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const mapped: ListingDTO[] = (data || []).map((row: any) => ({
        id: row.id,
        donorId: row.donor_id,
        title: row.title,
        description: row.description,
        quantity: Number(row.quantity),
        unit: row.unit,
        foodType: row.food_type as FoodType,
        dietaryTags: row.dietary_tags || [],
        status: row.status as ListingStatus,
        expiresAt: row.expires_at,
        pickupLocationId: row.pickup_location_id,
        generalArea: row.general_area,
        rowVersion: row.row_version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setListings(mapped);
      setIsOffline(false);
    } catch (err: any) {
      console.error("Failed to fetch listings:", err);
      setErrorMessage("Could not load listings. Please check your network connection and retry.");
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadUserAndProfile();
  }, [loadUserAndProfile]);

  useEffect(() => {
    if (currentUser) {
      fetchMyListings();
    }
  }, [currentUser, fetchMyListings]);

  // Image selection handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setValidationErrors((prev) => ({
          ...prev,
          image: "Image must be JPEG, PNG, or WebP.",
        }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setValidationErrors((prev) => ({
          ...prev,
          image: "Image size must not exceed 5MB.",
        }));
        return;
      }
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.image;
        return next;
      });
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim() || form.title.trim().length < 2) {
      errors.title = "Title must be at least 2 characters long.";
    }
    const q = Number(form.quantity);
    if (!q || isNaN(q) || q <= 0) {
      errors.quantity = "Quantity must be a positive number.";
    }
    if (!form.unit.trim()) {
      errors.unit = "Unit of measurement is required.";
    }
    if (!form.address.trim() && !userProfile?.defaultLocation?.address) {
      errors.address = "Pickup address is required.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create Listing via POST /api/listings
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Upload image if selected
      let imageStoragePath: string | null = null;
      if (imageFile && currentUser) {
        setUploadingImage(true);
        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const fileName = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.warn("Storage upload non-fatal warning:", uploadError);
        } else {
          imageStoragePath = fileName;
        }
        setUploadingImage(false);
      }

      // Calculate future expiry date
      const expiresAt = new Date(Date.now() + form.expiresHours * 60 * 60 * 1000).toISOString();

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
        foodType: form.foodType,
        dietaryTags: form.dietaryTags,
        expiresAt,
        publishImmediately: form.publishImmediately,
        pickupLocationId: userProfile?.defaultLocation?.id || null,
        preparedImageToken: imageStoragePath || undefined,
      };

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setErrorMessage("This account does not have permission to publish food listings.");
        } else if (res.status === 401) {
          setErrorMessage("Session expired. Please sign in again.");
        } else {
          setErrorMessage(result.error?.message || "Failed to create listing. Please try again.");
        }
        return;
      }

      setSuccessMessage("Food listing posted successfully! Available for claim.");
      setForm(INITIAL_FORM);
      setImageFile(null);
      setImagePreview(null);
      setValidationErrors({});

      // Always re-fetch canonical server state after mutation
      await fetchMyListings();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Error creating listing:", err);
      setErrorMessage("Network error: Could not submit food listing. Please retry.");
    } finally {
      setIsSubmitting(false);
      setUploadingImage(false);
    }
  };

  // Publish Draft Listing via POST /api/listings/:id/publish
  const handlePublishListing = async (listingId: string) => {
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/publish`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          setErrorMessage("Cannot publish: This listing has already expired.");
        } else {
          setErrorMessage(data.error?.message || "Failed to publish listing.");
        }
      } else {
        setSuccessMessage("Listing published successfully.");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
      // Re-fetch canonical state
      await fetchMyListings();
    } catch (err) {
      console.error("Error publishing listing:", err);
      setErrorMessage("Network error: Failed to publish listing.");
    }
  };

  // Open Edit Modal
  const startEdit = (listing: ListingDTO) => {
    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditQuantity(String(listing.quantity));
    setEditUnit(listing.unit);
  };

  // Update Listing with Row Version Check via PATCH /api/listings/:id
  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const payload = {
        rowVersion: editingListing.rowVersion,
        title: editTitle.trim(),
        quantity: Number(editQuantity),
        unit: editUnit.trim(),
      };

      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setErrorMessage(
            "Conflict: This listing was updated or claimed by another session. Refreshing latest state..."
          );
        } else if (res.status === 410) {
          setErrorMessage("This listing has expired and can no longer be edited.");
        } else {
          setErrorMessage(data.error?.message || "Failed to update listing.");
        }
      } else {
        setSuccessMessage("Listing updated successfully.");
        setEditingListing(null);
        setTimeout(() => setSuccessMessage(null), 3000);
      }

      // Re-fetch canonical state
      await fetchMyListings();
    } catch (err) {
      console.error("Error updating listing:", err);
      setErrorMessage("Network error: Failed to update listing.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper for status badge colors
  const getStatusBadge = (status: ListingStatus) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "claimed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_delivery":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Preserve canonical role isolation without treating account verification as an access gate.
  if (!isLoading && userProfile && userProfile.role !== "donor") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <ShieldAlert size={48} className="text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-900 mb-2">Donor Access Restricted</h2>
          <p className="text-amber-700 mb-6 max-w-lg mx-auto">
            Your current account is registered under a different role. Complete onboarding with the role you intend to use.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-charcoal font-bold rounded-xl hover:bg-yellow-500 transition-colors shadow-sm"
          >
            Review Onboarding
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
          <h1 className="text-3xl font-bold text-brand-charcoal">Food Donor Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">
            Post surplus meals, track listing claims, and support community distribution.
          </p>
        </div>
        <button
          onClick={fetchMyListings}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
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
            <span className="text-sm">You appear to be offline or experiencing connection issues.</span>
            <button
              onClick={fetchMyListings}
              className="text-xs font-bold underline hover:text-yellow-900"
            >
              Retry Connection
            </button>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create Listing Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-xl font-bold text-brand-charcoal mb-4 flex items-center gap-2">
              <Package size={20} className="text-brand-gold" />
              Post Surplus Food
            </h2>

            <form onSubmit={handleCreateListing} className="space-y-4">
              {/* Food Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Food Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 25 Boxes of Veg Biryani"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={`w-full px-3 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold ${
                    validationErrors.title ? "border-red-400" : "border-gray-200"
                  }`}
                />
                {validationErrors.title && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.title}</p>
                )}
              </div>

              {/* Quantity and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 25"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold ${
                      validationErrors.quantity ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                  {validationErrors.quantity && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.quantity}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  >
                    <option value="servings">servings</option>
                    <option value="meals">meals</option>
                    <option value="boxes">boxes</option>
                    <option value="kg">kg</option>
                    <option value="packets">packets</option>
                  </select>
                </div>
              </div>

              {/* Food Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Food Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FOOD_TYPES.filter((t) => t !== "other").map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, foodType: type })}
                      className={`py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all ${
                        form.foodType === type
                          ? "border-brand-gold bg-yellow-50 text-brand-gold"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiry Window */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Safe Expiry Window *
                </label>
                <select
                  value={form.expiresHours}
                  onChange={(e) => setForm({ ...form, expiresHours: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                >
                  <option value={2}>Next 2 Hours (Fresh Cooked)</option>
                  <option value={4}>Next 4 Hours</option>
                  <option value={6}>Next 6 Hours</option>
                  <option value={12}>Next 12 Hours</option>
                  <option value={24}>Next 24 Hours (Packaged)</option>
                </select>
              </div>

              {/* Pickup Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Pickup Address *
                </label>
                <input
                  type="text"
                  placeholder={userProfile?.defaultLocation?.address || "Street, Area, City"}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                />
                {userProfile?.defaultLocation?.address && !form.address && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Using saved default location: {userProfile.defaultLocation.address}
                  </p>
                )}
                {validationErrors.address && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.address}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. freshly cooked at banquet hall, packed in foil trays."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                />
              </div>

              {/* Optional Photo Attachment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Food Photo (Optional)
                </label>
                <label className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-gold transition-colors text-xs text-gray-600 bg-gray-50">
                  <Camera size={16} />
                  <span>{imageFile ? imageFile.name : "Attach photo"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
                {validationErrors.image && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.image}</p>
                )}
                {imagePreview && (
                  <div className="mt-2 relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Publish immediately checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="publishImmediately"
                  checked={form.publishImmediately}
                  onChange={(e) => setForm({ ...form, publishImmediately: e.target.checked })}
                  className="rounded text-brand-gold focus:ring-brand-gold"
                />
                <label htmlFor="publishImmediately" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Publish immediately (available for claims right away)
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || uploadingImage}
                className="w-full py-2.5 bg-brand-gold hover:bg-yellow-500 text-brand-charcoal font-bold rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting || uploadingImage ? (
                  <>
                    <span className="w-4 h-4 border-2 border-brand-charcoal border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Post Surplus Food</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Listings Inventory */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-brand-charcoal">Your Food Listings</h2>
            <span className="text-xs text-gray-500">
              {listings.length} {listings.length === 1 ? "listing" : "listings"} recorded
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 bg-white rounded-2xl border border-gray-100 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-2/3 mb-4" />
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-gray-100 text-center text-gray-500">
              <Package size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-brand-charcoal mb-1">No Listings Yet</h3>
              <p className="text-sm">Post surplus food from your kitchen or venue using the form.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-gray-200 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-brand-charcoal">{item.title}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>

                    {/* Actions for draft or published listings */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {item.status === "draft" && (
                        <button
                          onClick={() => handlePublishListing(item.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Send size={12} /> Publish
                        </button>
                      )}
                      {["draft", "published"].includes(item.status) && (
                        <button
                          onClick={() => startEdit(item)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-50 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-brand-charcoal">Qty:</span>
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-brand-charcoal">Type:</span>
                      <span className="capitalize">{item.foodType}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-brand-gold" />
                      <span>
                        Expires: {new Date(item.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-400">v{item.rowVersion}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal with Row Version Optimistic Concurrency */}
      <AnimatePresence>
        {editingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-brand-charcoal">Edit Listing</h3>
                <button
                  onClick={() => setEditingListing(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateListing} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      required
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  Target version: <span className="font-semibold">v{editingListing.rowVersion}</span>. If another session edits this listing concurrently, changes will be safely prevented.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingListing(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 bg-brand-gold hover:bg-yellow-500 text-brand-charcoal rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
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
