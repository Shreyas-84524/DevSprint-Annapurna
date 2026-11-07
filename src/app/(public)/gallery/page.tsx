"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getGalleryService } from "@/services/gallery";
import { GalleryItemDTO } from "@/types/contracts";
import { Image as ImageIcon, X, ZoomIn, AlertCircle, RefreshCw } from "lucide-react";
import Image from "next/image";

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<GalleryItemDTO | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const galleryService = useMemo(() => getGalleryService(), []);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await galleryService.getGalleryItems();
      if (fetchErr) {
        setError("Unable to load gallery photos.");
      } else {
        setItems(data || []);
      }
    } catch {
      setError("Network error loading gallery.");
    } finally {
      setLoading(false);
    }
  }, [galleryService]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // Handle escape key to close lightbox
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedItem) {
        setSelectedItem(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem]);

  // Focus close button on open
  useEffect(() => {
    if (selectedItem) {
      closeButtonRef.current?.focus();
    }
  }, [selectedItem]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-4">Our Gallery</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Moments of compassion. Photos of food distributions, volunteer pickups, and active community kitchen drives.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center justify-center" aria-live="polite">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading photos...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-12 rounded-3xl border border-red-100 text-center max-w-xl mx-auto shadow-sm">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2 text-brand-charcoal">Failed to Load Gallery</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={loadGallery}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center max-w-xl mx-auto shadow-sm">
          <ImageIcon className="mx-auto text-gray-300 mb-4" size={48} aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2 text-brand-charcoal">Gallery is empty</h2>
          <p className="text-gray-500">We will upload photos of our next hunger relief drives soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedItem(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedItem(item);
                }
              }}
              aria-label={`View full photo: ${item.title}`}
              className="group relative cursor-pointer aspect-square rounded-3xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-gold"
            >
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
              />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <ZoomIn className="text-white mb-2" size={24} aria-hidden="true" />
                <h2 className="text-white font-bold text-lg">{item.title}</h2>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Expanded preview of ${selectedItem.title}`}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setSelectedItem(null)}
              aria-label="Close photo preview"
              className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <X size={24} aria-hidden="true" />
            </button>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl max-h-[85vh] flex flex-col items-center cursor-default"
            >
              <div className="relative w-[85vw] max-w-3xl h-[65vh] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <h2 className="text-white font-semibold text-lg mt-4 text-center">
                {selectedItem.title}
              </h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
