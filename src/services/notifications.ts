import { NotificationDTO } from "@/types/contracts";

export const getNotificationsService = () => {
  return {
    async getNotifications(): Promise<{ data: NotificationDTO[] | null; error: Error | null }> {
      try {
        const res = await fetch("/api/notifications", {
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 401) {
            return { data: [], error: null };
          }
          throw new Error(`Failed to fetch notifications: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data?.notifications ?? json.notifications ?? [], error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async markAsRead(id: string): Promise<{ data: NotificationDTO | null; error: Error | null }> {
      try {
        const res = await fetch(`/api/notifications/${id}/read`, {
          method: "POST",
        });
        if (!res.ok) {
          throw new Error(`Failed to mark notification as read: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.data ?? json.notification ?? null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
  };
};
