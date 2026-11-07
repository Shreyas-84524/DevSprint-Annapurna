import { FaqDTO, CreateFaqRequest, UpdateFaqRequest } from "@/types/contracts";

export const getFaqsService = () => {
  return {
    async getFaqs(): Promise<{ data: FaqDTO[] | null; error: Error | null }> {
      try {
        const res = await fetch("/api/cms/faqs", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch FAQs: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data ?? json.faqs ?? [], error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async createFaq(payload: CreateFaqRequest): Promise<{ data: FaqDTO | null; error: Error | null }> {
      try {
        const res = await fetch("/api/cms/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Failed to create FAQ: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data ?? json.faq ?? null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async updateFaq(id: string, payload: UpdateFaqRequest): Promise<{ data: FaqDTO | null; error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/faqs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Failed to update FAQ: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data ?? json.faq ?? null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async deleteFaq(id: string): Promise<{ error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/faqs/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Failed to delete FAQ: ${res.statusText}`);
        }
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },
  };
};
