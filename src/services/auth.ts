import { createClient } from "@/lib/supabase";

export const getAuthService = (client = createClient()) => {
  return {
    async signUp(email: string, password: string, metadata: any) {
      return client.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
    },

    async signIn(email: string, password: string) {
      return client.auth.signInWithPassword({ email, password });
    },

    async signOut() {
      return client.auth.signOut();
    },

    async getUser() {
      return client.auth.getUser();
    },

    async getProfile(userId: string) {
      return client
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
    },

    async updateProfile(userId: string, profileData: any) {
      return client
        .from("users")
        .update(profileData)
        .eq("id", userId);
    }
  };
};
