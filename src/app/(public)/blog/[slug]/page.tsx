import { createClient } from "@/lib/supabase-server";
import { getBlogsService } from "@/services/blogs";
import { Clock, User, ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const blogsService = getBlogsService(supabase);
  
  const { data: blog } = await blogsService.getBlogBySlug(slug).catch(() => ({ data: null }));

  if (!blog) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold mb-4 text-brand-charcoal">Article Not Found</h1>
        <p className="text-gray-500 mb-8">The requested article could not be found or is no longer available.</p>
        <Link href="/blog" className="px-6 py-2 bg-brand-charcoal text-white rounded-lg font-bold hover:bg-gray-800 transition-colors">
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-charcoal font-bold mb-8">
        <ArrowLeft size={16} /> Back to Blog
      </Link>

      <article>
        <header className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-gold bg-yellow-50 px-2.5 py-1.5 rounded">
            {blog.blog_categories?.name || "General"}
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-brand-charcoal mt-4 leading-tight">
            {blog.title}
          </h1>
          
          <div className="flex gap-6 items-center text-sm text-gray-500 mt-6 border-y border-gray-100 py-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-brand-gold" />
              <span className="font-medium text-brand-charcoal">{blog.users?.name || "Editor"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-brand-gold" />
              <span>{new Date(blog.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </header>

        {blog.image_url && (
          <div className="w-full aspect-[21/9] rounded-3xl overflow-hidden mb-12 shadow-sm">
            <img
              src={blog.image_url}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div 
          className="prose max-w-none text-gray-600 leading-relaxed text-lg space-y-6"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </article>
    </div>
  );
}
