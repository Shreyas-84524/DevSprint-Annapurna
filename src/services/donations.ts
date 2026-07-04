import { createClient } from "@/lib/supabase";

export const getDonationsService = (client = createClient()) => {
  return {
    // Food Donations
    async getFoodDonations() {
      return client
        .from("food_donations")
        .select("*")
        .order("created_at", { ascending: false });
    },

    async getFoodDonationById(id: string) {
      return client
        .from("food_donations")
        .select("*")
        .eq("id", id)
        .single();
    },

    async createFoodDonation(donation: any) {
      return client
        .from("food_donations")
        .insert(donation)
        .select();
    },

    async updateFoodDonationStatus(id: string, status: string) {
      return client
        .from("food_donations")
        .update({ status })
        .eq("id", id);
    },

    async verifyFoodQuality(id: string, qualityPassed: boolean) {
      return client
        .from("food_donations")
        .update({ quality_passed: qualityPassed })
        .eq("id", id);
    },

    // Monetary Donations
    async getMonetaryDonations() {
      return client
        .from("monetary_donations")
        .select("*")
        .order("created_at", { ascending: false });
    },

    async createMonetaryDonation(donation: any) {
      return client
        .from("monetary_donations")
        .insert(donation)
        .select();
    },

    // Receipts
    async getReceipts(userId: string) {
      return client
        .from("donation_receipts")
        .select("*, monetary_donations(*), food_donations(*)")
        .or(`monetary_donations.donor_id.eq.${userId},food_donations.donor_id.eq.${userId}`)
        .order("created_at", { ascending: false });
    }
  };
};
