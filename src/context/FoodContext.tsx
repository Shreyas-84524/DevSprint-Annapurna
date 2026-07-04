"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export type FoodStatus = 
  | "pending_pickup" 
  | "pickup_assigned" 
  | "at_warehouse" 
  | "pending_delivery" 
  | "delivery_assigned" 
  | "delivered" 
  | "donated_to_animals";

export interface FoodItem {
  id: string;
  title: string;
  description: string;
  quantity: string;
  location: string;
  status: FoodStatus;
  donorName: string;
  createdAt: Date;
  qualityPassed?: boolean;
  donorType: "individual" | "restaurant" | "caterer";
  foodType: "veg" | "non-veg";
  etaMinutes?: number;
}

interface FoodContextType {
  foodItems: FoodItem[];
  addFoodItem: (item: any) => Promise<void>;
  updateFoodStatus: (id: string, status: FoodStatus) => Promise<void>;
  verifyQuality: (id: string, passed: boolean) => Promise<void>;
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export function FoodProvider({ children }: { children: ReactNode }) {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const supabase = createClient();

  const fetchFoodItems = async () => {
    const { data, error } = await supabase
      .from("food_donations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching food items:", error);
      return;
    }

    if (data) {
      const mapped = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        location: item.location,
        status: item.status as FoodStatus,
        donorName: item.donor_name,
        createdAt: new Date(item.created_at),
        qualityPassed: item.quality_passed,
        donorType: item.donor_type,
        foodType: item.food_type,
        etaMinutes: item.eta_minutes
      }));
      setFoodItems(mapped);
    }
  };

  useEffect(() => {
    fetchFoodItems();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("realtime-food-donations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_donations" },
        () => {
          fetchFoodItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addFoodItem = async (item: any) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("food_donations").insert({
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      location: item.location,
      donor_name: item.donorName || "Anonymous",
      donor_type: item.donorType || "individual",
      food_type: item.foodType || "veg",
      status: "pending_pickup",
      donor_id: user?.id || null
    });

    if (error) {
      console.error("Error adding food item:", error);
      throw error;
    }
  };

  const updateFoodStatus = async (id: string, status: FoodStatus) => {
    const { error } = await supabase
      .from("food_donations")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating food status:", error);
      throw error;
    }
  };

  const verifyQuality = async (id: string, passed: boolean) => {
    const { error } = await supabase
      .from("food_donations")
      .update({ quality_passed: passed })
      .eq("id", id);

    if (error) {
      console.error("Error verifying food quality:", error);
      throw error;
    }
  };

  return (
    <FoodContext.Provider value={{ foodItems, addFoodItem, updateFoodStatus, verifyQuality }}>
      {children}
    </FoodContext.Provider>
  );
}

export function useFood() {
  const context = useContext(FoodContext);
  if (context === undefined) {
    throw new Error("useFood must be used within a FoodProvider");
  }
  return context;
}
