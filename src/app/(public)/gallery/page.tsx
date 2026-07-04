"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getGalleryService } from "@/services/gallery";
import { createClient } from "@/lib/supabase";
import { Image as ImageIcon, X, ZoomIn } from "lucide-react";

export default function GalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const supabase = createClient();
  const galleryService = getGalleryService(supabase);

  useEffect(() => {
    galleryService.getGalleryItems()
      .then(({ data }) => {
        if (data) setItems(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-4">Our Gallery</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Moments of compassion. Photos of food distributions, volunteer pickups, and active community kitchen drives.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4"></span>
          <p className="text-gray-500">Loading gallery photos...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center max-w-xl mx-auto">
          <ImageIcon className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2 text-brand-charcoal">Gallery is empty</h3>
          <p className="text-gray-500">We will upload photos of our next hunger relief drives soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedImage(item.image_url)}
              className="group relative cursor-pointer aspect-square rounded-3xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50"
            >
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <ZoomIn className="text-white mb-2" size={24} />
                <h4 className="text-white font-bold text-lg">{item.title}</h4>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={selectedImage}
              alt="Expanded Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
