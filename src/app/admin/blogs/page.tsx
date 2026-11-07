"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getBlogsService } from "@/services/blogs";
import { BlogPostDTO } from "@/types/contracts";
import { Trash2, Plus, ArrowLeft, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AdminBlogsPage() {
  const blogsService = useMemo(() => getBlogsService(), []);

  const [blogs, setBlogs] = useState<BlogPostDTO[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadBlogsAndCats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: blogList, error: blogErr } = await blogsService.getBlogs("all");
      if (blogErr) {
        setError(blogErr.message || "Failed to load stories.");
      } else {
        setBlogs(blogList || []);
      }
      
      const { data: catList } = await blogsService.getCategories();
      if (catList && catList.length > 0) {
        setCategories(catList);
      }
    } catch {
      setError("Network error loading stories.");
    } finally {
      setLoading(false);
    }
  }, [blogsService]);

  useEffect(() => {
    loadBlogsAndCats();
  }, [loadBlogsAndCats]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !content.trim()) {
      setFormError("Title and content are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        categoryId: categoryId || undefined,
        status,
      };

      const { error: createErr } = await blogsService.createBlog(payload);
      if (createErr) throw createErr;
      
      setTitle("");
      setSlug("");
      setContent("");
      setImageUrl("");
      setStatus("published");
      setShowForm(false);
      await loadBlogsAndCats();
    } catch (err: any) {
      setFormError(err.message || "Error creating story.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      const { error: delErr } = await blogsService.deleteBlog(id);
      if (delErr) alert(delErr.message || "Failed to delete article");
      await loadBlogsAndCats();
    } catch (err: any) {
      alert(err.message || "Error deleting story");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-charcoal font-bold mb-8 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to Command Center</span>
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-brand-charcoal">Manage Stories & Articles</h1>
          <p className="text-gray-500 text-sm mt-1">Publish verified impact stories and field updates.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <Plus size={18} aria-hidden="true" />
          <span>{showForm ? "Cancel" : "New Story"}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-md mb-12 space-y-6">
          <h2 className="text-xl font-bold text-brand-charcoal border-b pb-3">Author New Story</h2>

          {formError && (
            <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="blog-title" className="block text-sm font-bold text-gray-700 mb-2">
                Article Title <span className="text-red-500">*</span>
              </label>
              <input
                id="blog-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Over 5,000 Meals Rescued in Mumbai Drive"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
              />
            </div>

            <div>
              <label htmlFor="blog-slug" className="block text-sm font-bold text-gray-700 mb-2">
                URL Slug <span className="text-gray-400 font-normal">(Auto-generated if empty)</span>
              </label>
              <input
                id="blog-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="5000-meals-rescued-mumbai"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
              />
            </div>

            <div>
              <label htmlFor="blog-category" className="block text-sm font-bold text-gray-700 mb-2">
                Category
              </label>
              <select
                id="blog-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal bg-white"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="blog-status" className="block text-sm font-bold text-gray-700 mb-2">
                Publication Status
              </label>
              <select
                id="blog-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal bg-white"
              >
                <option value="published">Published (Public)</option>
                <option value="draft">Draft (Admin Only)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="blog-image" className="block text-sm font-bold text-gray-700 mb-2">
              Featured Image URL <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              id="blog-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
            />
          </div>

          <div>
            <label htmlFor="blog-content" className="block text-sm font-bold text-gray-700 mb-2">
              Article Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="blog-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              placeholder="Write the full story details..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Story"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 flex flex-col items-center" aria-live="polite">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Loading stories...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-8 rounded-3xl border border-red-100 text-center max-w-md mx-auto">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={36} aria-hidden="true" />
          <p className="text-gray-700 font-semibold mb-4">{error}</p>
          <button
            type="button"
            onClick={loadBlogsAndCats}
            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={40} aria-hidden="true" />
          <h2 className="text-lg font-bold text-brand-charcoal mb-1">No Stories Published</h2>
          <p className="text-gray-500 text-sm mb-4">Click &ldquo;New Story&rdquo; above to publish your first article.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Title</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {blogs.map((blog) => (
                  <tr key={blog.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-brand-charcoal max-w-xs truncate">
                      {blog.title}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          blog.status === "published"
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {blog.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {blog.category?.name || "General"}
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-xs">
                      {new Date(blog.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(blog.id)}
                        aria-label={`Delete story ${blog.title}`}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
