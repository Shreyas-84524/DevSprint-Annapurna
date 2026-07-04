"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { getBlogsService } from "@/services/blogs";
import { Trash2, Edit2, Plus, ArrowLeft, BookOpen, Check } from "lucide-react";
import Link from "next/link";

export default function AdminBlogsPage() {
  const supabase = createClient();
  const blogsService = getBlogsService(supabase);

  const [blogs, setBlogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBlogsAndCats = async () => {
    try {
      const { data: blogList } = await blogsService.getBlogs("all");
      if (blogList) setBlogs(blogList);
      
      const { data: catList } = await blogsService.getCategories();
      if (catList && catList.length > 0) {
        setCategories(catList);
      } else {
        // Seed default category if empty
        const defaultCat = { name: "Community Outreach", slug: "community-outreach" };
        const { data: seeded } = await blogsService.createCategory(defaultCat);
        if (seeded) setCategories(seeded);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogsAndCats();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        content,
        image_url: imageUrl || "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800",
        author_id: user?.id || null,
        category_id: categoryId || categories[0]?.id || null,
        status: "published"
      };

      const { error } = await blogsService.createBlog(payload);
      if (error) throw error;
      
      setTitle("");
      setSlug("");
      setContent("");
      setImageUrl("");
      setShowForm(false);
      await loadBlogsAndCats();
    } catch (err) {
      console.error("Error creating blog:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      const { error } = await blogsService.deleteBlog(id);
      if (error) throw error;
      await loadBlogsAndCats();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-charcoal font-bold mb-8">
        <ArrowLeft size={16} /> Back to Command Center
      </Link>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-brand-charcoal">Article Publishing</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> {showForm ? "Cancel" : "Create Article"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-3xl mb-12 space-y-6">
          <h2 className="text-xl font-bold text-brand-charcoal">New Article Details</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="e.g., Food Drive feeds 100 families"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL Path)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
                placeholder="e.g., food-drive-feeds-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="https://images.unsplash.com/photo-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article Content (HTML supported)</label>
            <textarea
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="Write the full content..."
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-brand-charcoal text-white font-bold rounded-xl shadow-md hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? "Publishing..." : "Publish Now"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
          <BookOpen className="mx-auto text-gray-300 mb-2" />
          No articles published yet.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 sm:p-6">Title</th>
                <th className="p-4 sm:p-6">Category</th>
                <th className="p-4 sm:p-6">Status</th>
                <th className="p-4 sm:p-6">Date</th>
                <th className="p-4 sm:p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {blogs.map(blog => (
                <tr key={blog.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 sm:p-6 font-bold text-brand-charcoal">{blog.title}</td>
                  <td className="p-4 sm:p-6 text-gray-500">{blog.blog_categories?.name || "General"}</td>
                  <td className="p-4 sm:p-6">
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded uppercase">
                      {blog.status}
                    </span>
                  </td>
                  <td className="p-4 sm:p-6 text-gray-400">{new Date(blog.created_at).toLocaleDateString()}</td>
                  <td className="p-4 sm:p-6 text-right">
                    <button
                      onClick={() => handleDelete(blog.id)}
                      className="text-red-500 hover:text-red-700 p-2 transition-colors inline-flex items-center gap-1 font-bold"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
