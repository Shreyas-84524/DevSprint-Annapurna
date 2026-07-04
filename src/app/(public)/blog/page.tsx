"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getBlogsService } from "@/services/blogs";
import { createClient } from "@/lib/supabase";
import { Clock, User, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

export default function BlogListingPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const blogsService = getBlogsService(supabase);

  useEffect(() => {
    blogsService.getBlogs("published")
      .then(({ data }) => {
        if (data) setBlogs(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-4">Annapurna Stories</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Insights, operational updates, and inspiring stories from our volunteer network and zero hunger community.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4"></span>
          <p className="text-gray-500">Loading articles...</p>
        </div>
      ) : blogs.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center max-w-xl mx-auto">
          <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2 text-brand-charcoal">No articles published yet</h3>
          <p className="text-gray-500 mb-6">Our editors are working on putting together amazing insights. Check back soon!</p>
          <Link href="/" className="px-6 py-2 bg-brand-charcoal text-white rounded-lg font-bold hover:bg-gray-800 transition-colors">
            Return Home
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog, idx) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
            >
              {blog.image_url ? (
                <img
                  src={blog.image_url}
                  alt={blog.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-brand-slate flex items-center justify-center text-brand-charcoal">
                  <BookOpen size={40} className="opacity-20" />
                </div>
              )}

              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gold bg-yellow-50 px-2 py-1 rounded">
                    {blog.blog_categories?.name || "General"}
                  </span>
                  <h3 className="text-xl font-bold text-brand-charcoal mt-3 line-clamp-2">
                    {blog.title}
                  </h3>
                  <p className="text-gray-500 text-sm mt-3 line-clamp-3">
                    {blog.content.replace(/<[^>]*>/g, "")}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    <span>{blog.users?.name || "Editor"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <Link
                  href={`/blog/${blog.slug}`}
                  className="mt-6 w-full py-2 border border-brand-charcoal hover:bg-brand-charcoal hover:text-white rounded-xl text-center text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  Read Article <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
