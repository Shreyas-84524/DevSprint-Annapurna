import { ContactSubmissionRequest, ContactMessageDTO } from "@/types/contracts";

export const getContactService = () => {
  return {
    async submitMessage(message: ContactSubmissionRequest): Promise<{ data: any; error: Error | null; status?: number }> {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(json.error || `Failed to submit message: ${res.statusText}`);
          (err as any).status = res.status;
          (err as any).code = json.code;
          return { data: null, error: err, status: res.status };
        }
        return { data: json, error: null, status: res.status };
      } catch (err: any) {
        return { data: null, error: err, status: 500 };
      }
    },

    async getMessages(): Promise<{ data: ContactMessageDTO[] | null; error: Error | null }> {
      try {
        const res = await fetch("/api/cms/messages", {
          cache: "no-store",
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Failed to fetch messages: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.messages || [], error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async deleteMessage(id: string): Promise<{ error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/messages/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Failed to delete message: ${res.statusText}`);
        }
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },
  };
};
