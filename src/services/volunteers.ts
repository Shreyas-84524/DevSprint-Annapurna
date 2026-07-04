import { createClient } from "@/lib/supabase";

export const getVolunteersService = (client = createClient()) => {
  return {
    async applyAsVolunteer(applicationData: { user_id: string; aadhaar: string; upi_id: string }) {
      return client
        .from("volunteer_applications")
        .insert(applicationData)
        .select();
    },

    async getVolunteerApplication(userId: string) {
      return client
        .from("volunteer_applications")
        .select("*")
        .eq("user_id", userId)
        .single();
    },

    async getAllVolunteerApplications() {
      return client
        .from("volunteer_applications")
        .select("*, users(*)")
        .order("created_at", { ascending: false });
    },

    async updateApplicationStatus(id: string, status: "approved" | "rejected") {
      return client
        .from("volunteer_applications")
        .update({ status })
        .eq("id", id);
    },

    // Volunteer Assignments
    async createAssignment(assignment: any) {
      return client
        .from("volunteer_assignments")
        .insert(assignment)
        .select();
    },

    async getAssignments(volunteerId: string) {
      return client
        .from("volunteer_assignments")
        .select("*, food_donations(*)")
        .eq("volunteer_id", volunteerId)
        .order("created_at", { ascending: false });
    },

    async updateAssignmentStatus(id: string, status: string) {
      return client
        .from("volunteer_assignments")
        .update({ status })
        .eq("id", id);
    },

    // Volunteer Compensation
    async logCompensation(compensation: { assignment_id: string; volunteer_id: string; distance_km: number; rate_per_km: number; amount: number }) {
      return client
        .from("volunteer_compensation")
        .insert(compensation)
        .select();
    },

    async getVolunteerEarnings(volunteerId: string) {
      return client
        .from("volunteer_compensation")
        .select("*")
        .eq("volunteer_id", volunteerId)
        .order("created_at", { ascending: false });
    }
  };
};
