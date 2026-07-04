"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { getGalleryService } from "@/services/gallery";
import { Trash2, Plus, ArrowLeft, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default function AdminGalleryPage() {
  const supabase = createClient();
  const galleryService = getGalleryService(supabase);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadGallery = async () => {
    try {
      const { data } = await galleryService.getGalleryItems();
      if (data) setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title,
        image_url: imageUrl || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800"
      };

      const { error } = await galleryService.addGalleryItem(payload);
      if (error) throw error;
      
      setTitle("");
      setImageUrl("");
      setShowForm(false);
      await loadGallery();
    } catch (err) {
      console.error("Error adding gallery photo:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      const { error } = await galleryService.deleteGalleryItem(id);
      if (error) throw error;
      await loadGallery();
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
        <h1 className="text-3xl font-black text-brand-charcoal">Gallery Manager</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> {showForm ? "Cancel" : "Add Image"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-3xl mb-12 space-y-6">
          <h2 className="text-xl font-bold text-brand-charcoal">New Photo Details</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image Caption</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="e.g., Food Distribution in Bandra slums"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input
              required
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="https://images.unsplash.com/photo-..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-brand-charcoal text-white font-bold rounded-xl shadow-md hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? "Uploading..." : "Save Image"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
          <ImageIcon className="mx-auto text-gray-300 mb-2" />
          No gallery images uploaded.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col justify-between">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full aspect-square object-cover"
              />
              <div className="p-4 flex justify-between items-center bg-gray-50 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-600 truncate max-w-[150px]">{item.title}</span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
