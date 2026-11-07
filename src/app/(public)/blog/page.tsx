"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { getBlogsService } from "@/services/blogs";
import { BlogPostDTO } from "@/types/contracts";
import { Clock, ArrowRight, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function BlogListingPage() {
  const [blogs, setBlogs] = useState<BlogPostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const blogsService = useMemo(() => getBlogsService(), []);

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await blogsService.getBlogs("published");
      if (fetchErr) {
        setError("Unable to load stories. Please try again.");
      } else {
        setBlogs(data || []);
      }
    } catch {
      setError("Network error loading stories.");
    } finally {
      setLoading(false);
    }
  }, [blogsService]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-4">Annapurna Stories</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Insights, operational updates, and inspiring stories from our volunteer network and zero hunger community.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center justify-center" aria-live="polite">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading stories...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-12 rounded-3xl border border-red-100 text-center max-w-xl mx-auto shadow-sm">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2 text-brand-charcoal">Failed to Load Stories</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={loadBlogs}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center max-w-xl mx-auto shadow-sm">
          <BookOpen className="mx-auto text-gray-300 mb-4" size={48} aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2 text-brand-charcoal">No articles published yet</h2>
          <p className="text-gray-500 mb-6">Our editors are working on putting together amazing insights. Check back soon!</p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            Return Home
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog, idx) => (
            <motion.article
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
            >
              {blog.imageUrl ? (
                <div className="relative w-full h-48 bg-gray-100">
                  <Image
                    src={blog.imageUrl}
                    alt={blog.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-brand-slate flex items-center justify-center text-brand-charcoal">
                  <BookOpen size={40} className="opacity-20" aria-hidden="true" />
                </div>
              )}

              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gold bg-yellow-50 px-2.5 py-1 rounded">
                    {blog.category?.name || "Community"}
                  </span>
                  <h2 className="text-xl font-bold text-brand-charcoal mt-3 line-clamp-2">
                    {blog.title}
                  </h2>
                  <p className="text-gray-500 text-sm mt-3 line-clamp-3 leading-relaxed">
                    {blog.content.replace(/<[^>]*>/g, "")}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
                  <span className="font-medium text-brand-charcoal">Annapurna Team</span>
                  <div className="flex items-center gap-1">
                    <Clock size={14} aria-hidden="true" />
                    <time dateTime={blog.createdAt}>
                      {new Date(blog.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </div>

                <Link
                  href={`/blog/${blog.slug}`}
                  className="mt-6 w-full py-2.5 border border-brand-charcoal hover:bg-brand-charcoal hover:text-white rounded-xl text-center text-sm font-bold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <span>Read Article</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
