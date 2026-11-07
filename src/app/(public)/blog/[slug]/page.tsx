import { getPublicBlogBySlug } from "@/server/cms";
import { Clock, User, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  
  let blog = null;
  try {
    blog = await getPublicBlogBySlug(slug);
  } catch {
    blog = null;
  }

  if (!blog) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold mb-4 text-brand-charcoal">Article Not Found</h1>
        <p className="text-gray-500 mb-8">The requested article could not be found or is no longer available.</p>
        <Link
          href="/blog"
          className="inline-flex px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          Back to Stories
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-charcoal font-bold mb-8 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to Stories</span>
      </Link>

      <article>
        <header className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-gold bg-yellow-50 px-2.5 py-1.5 rounded">
            {blog.category?.name || "Community"}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-brand-charcoal mt-4 leading-tight">
            {blog.title}
          </h1>
          
          <div className="flex gap-6 items-center text-sm text-gray-500 mt-6 border-y border-gray-100 py-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-brand-gold" aria-hidden="true" />
              <span className="font-medium text-brand-charcoal">Annapurna Team</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-brand-gold" aria-hidden="true" />
              <time dateTime={blog.createdAt}>
                {new Date(blog.createdAt).toLocaleDateString([], {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          </div>
        </header>

        {blog.imageUrl && (
          <div className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden mb-12 shadow-sm bg-gray-100">
            <Image
              src={blog.imageUrl}
              alt={blog.title}
              fill
              sizes="(max-width: 1024px) 100vw, 896px"
              className="object-cover"
              priority
              unoptimized
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
