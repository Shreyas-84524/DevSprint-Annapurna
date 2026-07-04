import { createClient } from "@/lib/supabase";

export const getStorageService = (client = createClient()) => {
  return {
    async uploadFile(bucket: "avatars" | "blogs" | "gallery" | "receipts" | "documents", path: string, file: File) {
      return client.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true
        });
    },

    async downloadFile(bucket: "avatars" | "blogs" | "gallery" | "receipts" | "documents", path: string) {
      return client.storage
        .from(bucket)
        .download(path);
    },

    async removeFile(bucket: "avatars" | "blogs" | "gallery" | "receipts" | "documents", paths: string[]) {
      return client.storage
        .from(bucket)
        .remove(paths);
    },

    getPublicUrl(bucket: "avatars" | "blogs" | "gallery" | "receipts" | "documents", path: string) {
      return client.storage
        .from(bucket)
        .getPublicUrl(path).data.publicUrl;
    }
  };
};
