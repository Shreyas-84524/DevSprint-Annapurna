import { BlogPostDTO, CreateBlogPostRequest, UpdateBlogPostRequest } from "@/types/contracts";

export const getBlogsService = () => {
  return {
    async getCategories() {
      // Default categories for blogs
      return {
        data: [
          { id: "community", name: "Community Outreach", slug: "community-outreach" },
          { id: "impact", name: "Impact Stories", slug: "impact-stories" },
          { id: "operations", name: "Field Logistics", slug: "field-logistics" },
        ],
        error: null,
      };
    },

    async createCategory(category: { name: string; slug: string }) {
      return {
        data: [{ id: category.slug, name: category.name, slug: category.slug }],
        error: null,
      };
    },

    async getBlogs(status: "draft" | "published" | "all" = "published"): Promise<{ data: BlogPostDTO[] | null; error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/blogs?status=${status}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch blogs: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.blogs || [], error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async getBlogBySlug(slug: string): Promise<{ data: BlogPostDTO | null; error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/blogs?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch blog: ${res.statusText}`);
        }
        const json = await res.json();
        const found = json.blogs?.find((b: BlogPostDTO) => b.slug === slug) || null;
        return { data: found, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async createBlog(payload: CreateBlogPostRequest): Promise<{ data: BlogPostDTO | null; error: Error | null }> {
      try {
        const res = await fetch("/api/cms/blogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to create blog: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.blog || null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async updateBlog(id: string, payload: UpdateBlogPostRequest): Promise<{ data: BlogPostDTO | null; error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/blogs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to update blog: ${res.statusText}`);
        }
        const json = await res.json();
        return { data: json.blog || null, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async deleteBlog(id: string): Promise<{ error: Error | null }> {
      try {
        const res = await fetch(`/api/cms/blogs/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to delete blog: ${res.statusText}`);
        }
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },
  };
};
