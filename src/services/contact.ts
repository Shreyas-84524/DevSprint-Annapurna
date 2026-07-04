import { createClient } from "@/lib/supabase";

export const getContactService = (client = createClient()) => {
  return {
    async submitMessage(message: { name: string; email: string; message: string }) {
      return client
        .from("contact_messages")
        .insert(message)
        .select();
    },

    async getMessages() {
      return client
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
    }
  };
};
