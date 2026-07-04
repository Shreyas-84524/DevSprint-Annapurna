"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { getEventsService } from "@/services/events";
import { Trash2, Plus, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

export default function AdminEventsPage() {
  const supabase = createClient();
  const eventsService = getEventsService(supabase);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEvents = async () => {
    try {
      const { data } = await eventsService.getEvents();
      if (data) setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title,
        description,
        date: new Date(date).toISOString(),
        location,
        image_url: imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"
      };

      const { error } = await eventsService.createEvent(payload);
      if (error) throw error;
      
      setTitle("");
      setDescription("");
      setDate("");
      setLocation("");
      setImageUrl("");
      setShowForm(false);
      await loadEvents();
    } catch (err) {
      console.error("Error creating event:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const { error } = await eventsService.deleteEvent(id);
      if (error) throw error;
      await loadEvents();
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
        <h1 className="text-3xl font-black text-brand-charcoal">Redistribution Events</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> {showForm ? "Cancel" : "Create Event"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-3xl mb-12 space-y-6">
          <h2 className="text-xl font-bold text-brand-charcoal">New Event Details</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="e.g., Bandra Food Redistribution Drive"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="Briefly describe the event plan..."
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                required
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location / Venue</label>
              <input
                required
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
                placeholder="Full address or landmark"
              />
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-brand-charcoal text-white font-bold rounded-xl shadow-md hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? "Creating..." : "Create Event"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
          <Calendar className="mx-auto text-gray-300 mb-2" />
          No scheduled events.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 sm:p-6 w-1/4">Event</th>
                <th className="p-4 sm:p-6 w-1/3">Description</th>
                <th className="p-4 sm:p-6">Date</th>
                <th className="p-4 sm:p-6">Location</th>
                <th className="p-4 sm:p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {events.map(event => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 sm:p-6 font-bold text-brand-charcoal">{event.title}</td>
                  <td className="p-4 sm:p-6 text-gray-500 line-clamp-2">{event.description}</td>
                  <td className="p-4 sm:p-6 text-gray-400">{new Date(event.date).toLocaleString()}</td>
                  <td className="p-4 sm:p-6 text-gray-400 truncate max-w-[120px]">{event.location}</td>
                  <td className="p-4 sm:p-6 text-right">
                    <button
                      onClick={() => handleDelete(event.id)}
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
