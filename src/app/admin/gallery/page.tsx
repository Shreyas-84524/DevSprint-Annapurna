"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getGalleryService } from "@/services/gallery";
import { GalleryItemDTO } from "@/types/contracts";
import { Trash2, Plus, ArrowLeft, Image as ImageIcon, Upload, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AdminGalleryPage() {
  const galleryService = useMemo(() => getGalleryService(), []);

  const [items, setItems] = useState<GalleryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await galleryService.getGalleryItems();
      if (fetchErr) {
        setError(fetchErr.message || "Failed to load gallery photos.");
      } else {
        setItems(data || []);
      }
    } catch {
      setError("Network error loading gallery photos.");
    } finally {
      setLoading(false);
    }
  }, [galleryService]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError("File size exceeds 5 MB limit.");
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setFormError(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Photo title is required.");
      return;
    }

    if (!selectedFile && !imageUrl.trim()) {
      setFormError("Please select an image file or provide an image URL.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl = imageUrl.trim();

      // If file selected, upload via POST /api/cms/upload
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folder", "gallery");

        const uploadRes = await fetch("/api/cms/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || "File upload failed.");
        }

        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.data?.url;
        if (!finalImageUrl) throw new Error("The upload response did not include an asset URL.");
      }

      const payload = {
        title: title.trim(),
        imageUrl: finalImageUrl,
      };

      const { error: createErr } = await galleryService.addGalleryItem(payload);
      if (createErr) throw createErr;
      
      setTitle("");
      setImageUrl("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowForm(false);
      await loadGallery();
    } catch (err: any) {
      setFormError(err.message || "Error adding gallery photo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      const { error: delErr } = await galleryService.deleteGalleryItem(id);
      if (delErr) alert(delErr.message || "Failed to delete photo");
      await loadGallery();
    } catch (err: any) {
      alert(err.message || "Error deleting photo");
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
          <h1 className="text-3xl font-black text-brand-charcoal">Manage Photo Gallery</h1>
          <p className="text-gray-500 text-sm mt-1">Upload verified photos from food rescue operations and distribution hubs.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <Plus size={18} aria-hidden="true" />
          <span>{showForm ? "Cancel" : "Add Photo"}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-md mb-12 space-y-6">
          <h2 className="text-xl font-bold text-brand-charcoal border-b pb-3">Upload Gallery Photo</h2>

          {formError && (
            <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="gallery-title" className="block text-sm font-bold text-gray-700 mb-2">
                Photo Caption / Title <span className="text-red-500">*</span>
              </label>
              <input
                id="gallery-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Evening food pickup at Grand Palace Caterers"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
              />
            </div>

            <div>
              <label htmlFor="gallery-url" className="block text-sm font-bold text-gray-700 mb-2">
                External Image URL <span className="text-gray-400 font-normal">(Optional if uploading file)</span>
              </label>
              <input
                id="gallery-url"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Upload Image File <span className="text-gray-400 font-normal">(JPEG, PNG, WebP up to 5 MB)</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-brand-charcoal rounded-xl text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-brand-gold">
                <Upload size={16} aria-hidden="true" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              {selectedFile && (
                <span className="text-sm text-gray-600 truncate max-w-xs">{selectedFile.name}</span>
              )}
            </div>

            {filePreview && (
              <div className="mt-4 relative w-32 h-32 rounded-xl overflow-hidden border border-gray-200">
                <Image src={filePreview} alt="Preview" fill className="object-cover" unoptimized />
              </div>
            )}
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
              {isSubmitting ? "Uploading..." : "Save Photo"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 flex flex-col items-center" aria-live="polite">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Loading gallery...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-8 rounded-3xl border border-red-100 text-center max-w-md mx-auto">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={36} aria-hidden="true" />
          <p className="text-gray-700 font-semibold mb-4">{error}</p>
          <button
            type="button"
            onClick={loadGallery}
            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8">
          <ImageIcon className="mx-auto text-gray-300 mb-3" size={40} aria-hidden="true" />
          <h2 className="text-lg font-bold text-brand-charcoal mb-1">No Photos in Gallery</h2>
          <p className="text-gray-500 text-sm mb-4">Click &ldquo;Add Photo&rdquo; above to upload your first operation picture.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-gray-100">
                <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover" unoptimized />
              </div>
              <div className="p-4 flex items-center justify-between gap-2 flex-grow">
                <p className="font-semibold text-sm text-brand-charcoal truncate">{item.title}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  aria-label={`Delete photo ${item.title}`}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 shrink-0"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
