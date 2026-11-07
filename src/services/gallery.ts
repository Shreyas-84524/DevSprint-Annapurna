import { GalleryItemDTO, CreateGalleryItemRequest } from "@/types/contracts";

export const getGalleryService = () => {
  return {
    async getGalleryItems(): Promise<{ data: GalleryItemDTO[] | null; error: Error | null }> {
      try {
        const res = await fetch("/api/cms/gallery", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch gallery items: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data ?? json.items ?? [], error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async addGalleryItem(payload: CreateGalleryItemRequest): Promise<{ data: GalleryItemDTO | null; error: Error | null }> {
      try {
        const res = await fetch("/api/cms/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Failed to add gallery item: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data ?? json.item ?? null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async deleteGalleryItem(id: string): Promise<{ error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/gallery/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Failed to delete gallery item: ${res.statusText}`);
        }
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },
  };
};
