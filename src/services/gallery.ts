import { createClient } from "@/lib/supabase";

export const getGalleryService = (client = createClient()) => {
  return {
    async getGalleryItems() {
      return client
        .from("gallery")
        .select("*")
        .order("created_at", { ascending: false });
    },

    async addGalleryItem(item: { title: string; image_url: string }) {
      return client
        .from("gallery")
        .insert(item)
        .select();
    },

    async deleteGalleryItem(id: string) {
      return client
        .from("gallery")
        .delete()
        .eq("id", id);
    }
  };
};
