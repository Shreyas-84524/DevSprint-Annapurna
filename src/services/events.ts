import { EventDTO, CreateEventRequest, UpdateEventRequest } from "@/types/contracts";

export const getEventsService = () => {
  return {
    async getEvents(): Promise<{ data: EventDTO[] | null; error: Error | null }> {
      try {
        const res = await fetch("/api/cms/events", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch events: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data ?? json.events ?? [], error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async createEvent(payload: CreateEventRequest): Promise<{ data: EventDTO | null; error: Error | null }> {
      try {
        const res = await fetch("/api/cms/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Failed to create event: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data ?? json.event ?? null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async updateEvent(id: string, payload: UpdateEventRequest): Promise<{ data: EventDTO | null; error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/events/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Failed to update event: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data ?? json.event ?? null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async deleteEvent(id: string): Promise<{ error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/events/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Failed to delete event: ${res.statusText}`);
        }
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },
  };
};
