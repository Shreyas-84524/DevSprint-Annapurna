import { createClient } from "@/lib/supabase";

export const getEventsService = (client = createClient()) => {
  return {
    async getEvents() {
      return client
        .from("events")
        .select("*")
        .order("date", { ascending: true });
    },

    async getEventById(id: string) {
      return client
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
    },

    async createEvent(event: any) {
      return client
        .from("events")
        .insert(event)
        .select();
    },

    async updateEvent(id: string, event: any) {
      return client
        .from("events")
        .update(event)
        .eq("id", id)
        .select();
    },

    async deleteEvent(id: string) {
      return client
        .from("events")
        .delete()
        .eq("id", id);
    }
  };
};
