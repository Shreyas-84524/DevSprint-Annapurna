import { createClient } from "@/lib/supabase";

export const getBlogsService = (client = createClient()) => {
  return {
    async getCategories() {
      return client
        .from("blog_categories")
        .select("*")
        .order("name", { ascending: true });
    },

    async createCategory(category: { name: string; slug: string }) {
      return client
        .from("blog_categories")
        .insert(category)
        .select();
    },

    async getBlogs(status: "draft" | "published" | "all" = "published") {
      let query = client
        .from("blogs")
        .select("*, blog_categories(*), users(*)");

      if (status !== "all") {
        query = query.eq("status", status);
      }

      return query.order("created_at", { ascending: false });
    },

    async getBlogBySlug(slug: string) {
      return client
        .from("blogs")
        .select("*, blog_categories(*), users(*)")
        .eq("slug", slug)
        .single();
    },

    async createBlog(blog: any) {
      return client
        .from("blogs")
        .insert(blog)
        .select();
    },

    async updateBlog(id: string, blog: any) {
      return client
        .from("blogs")
        .update(blog)
        .eq("id", id)
        .select();
    },

    async deleteBlog(id: string) {
      return client
        .from("blogs")
        .delete()
        .eq("id", id);
    }
  };
};
