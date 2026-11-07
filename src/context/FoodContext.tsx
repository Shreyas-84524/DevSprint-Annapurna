"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface FoodContextType {
  foodItems: any[];
  addFoodItem: (item: any) => Promise<void>;
  updateFoodStatus: (id: string, status: any) => Promise<void>;
  verifyQuality: (id: string, passed: boolean) => Promise<void>;
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export function FoodProvider({ children }: { children: ReactNode }) {
  // Harmless context wrapper maintaining backward compatibility for layouts
  const value: FoodContextType = {
    foodItems: [],
    addFoodItem: async () => {},
    updateFoodStatus: async () => {},
    verifyQuality: async () => {},
  };

  return <FoodContext.Provider value={value}>{children}</FoodContext.Provider>;
}

export function useFood() {
  const context = useContext(FoodContext);
  if (!context) {
    throw new Error("useFood must be used within a FoodProvider");
  }
  return context;
}
