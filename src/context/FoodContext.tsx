"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export type FoodStatus = "available" | "claimed" | "in_transit" | "delivered";

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
}

interface FoodContextType {
  foodItems: FoodItem[];
  addFoodItem: (item: Omit<FoodItem, "id" | "status" | "createdAt">) => void;
  updateFoodStatus: (id: string, status: FoodStatus) => void;
  verifyQuality: (id: string, passed: boolean) => void;
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export function FoodProvider({ children }: { children: ReactNode }) {
  const convexFoodItems = useQuery(api.food.getFoodItems) || [];
  const mutateAddFoodItem = useMutation(api.food.addFoodItem);
  const mutateVerifyQuality = useMutation(api.food.verifyQuality);

  const foodItems: FoodItem[] = convexFoodItems.map((item) => ({
    id: item._id as string,
    title: item.title,
    description: item.description,
    quantity: item.quantity,
    location: item.location,
    status: item.status as FoodStatus,
    donorName: item.donorName,
    createdAt: new Date(item._creationTime),
    qualityPassed: item.qualityPassed,
  }));

  const addFoodItem = (item: any) => {
    mutateAddFoodItem(item);
  };

  const updateFoodStatus = (id: string, status: FoodStatus) => {
    // Deprecated. We don't have this mutation anymore.
    // mutateUpdateStatus({ id: id as Id<"foodListings">, status });
  };

  const verifyQuality = (id: string, passed: boolean) => {
    mutateVerifyQuality({ id: id as Id<"foodListings">, passed });
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
