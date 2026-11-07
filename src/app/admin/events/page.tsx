"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getEventsService } from "@/services/events";
import { EventDTO } from "@/types/contracts";
import { Trash2, Plus, ArrowLeft, Calendar, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AdminEventsPage() {
  const eventsService = useMemo(() => getEventsService(), []);

  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await eventsService.getEvents();
      if (fetchErr) {
        setError(fetchErr.message || "Failed to load events.");
      } else {
        setEvents(data || []);
      }
    } catch {
      setError("Network error loading events.");
    } finally {
      setLoading(false);
    }
  }, [eventsService]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !description.trim() || !date || !location.trim()) {
      setFormError("All required fields must be filled.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        date: new Date(date).toISOString(),
        location: location.trim(),
        imageUrl: imageUrl.trim() || undefined,
      };

      const { error: createErr } = await eventsService.createEvent(payload);
      if (createErr) throw createErr;
      
      setTitle("");
      setDescription("");
      setDate("");
      setLocation("");
      setImageUrl("");
      setShowForm(false);
      await loadEvents();
    } catch (err: any) {
      setFormError(err.message || "Error creating event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const { error: delErr } = await eventsService.deleteEvent(id);
      if (delErr) alert(delErr.message || "Failed to delete event");
      await loadEvents();
    } catch (err: any) {
      alert(err.message || "Error deleting event");
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
          <h1 className="text-3xl font-black text-brand-charcoal">Manage Community Events</h1>
          <p className="text-gray-500 text-sm mt-1">Schedule food relief drives, community kitchens, and volunteer meetups.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <Plus size={18} aria-hidden="true" />
          <span>{showForm ? "Cancel" : "New Event"}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-md mb-12 space-y-6">
          <h2 className="text-xl font-bold text-brand-charcoal border-b pb-3">Schedule New Event</h2>

          {formError && (
            <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="event-title" className="block text-sm font-bold text-gray-700 mb-2">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                id="event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Mega Weekend Surplus Drive"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
              />
            </div>

            <div>
              <label htmlFor="event-date" className="block text-sm font-bold text-gray-700 mb-2">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                id="event-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal bg-white"
              />
            </div>

            <div>
              <label htmlFor="event-location" className="block text-sm font-bold text-gray-700 mb-2">
                Location / Venue <span className="text-red-500">*</span>
              </label>
              <input
                id="event-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="Dadar Community Hall, Mumbai"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
              />
            </div>

            <div>
              <label htmlFor="event-image" className="block text-sm font-bold text-gray-700 mb-2">
                Banner Image URL <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="event-image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-desc" className="block text-sm font-bold text-gray-700 mb-2">
              Event Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="event-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Provide briefing notes for volunteers and attendees..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal resize-y"
            />
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
              {isSubmitting ? "Scheduling..." : "Schedule Event"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 flex flex-col items-center" aria-live="polite">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Loading events...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-8 rounded-3xl border border-red-100 text-center max-w-md mx-auto">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={36} aria-hidden="true" />
          <p className="text-gray-700 font-semibold mb-4">{error}</p>
          <button
            type="button"
            onClick={loadEvents}
            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8">
          <Calendar className="mx-auto text-gray-300 mb-3" size={40} aria-hidden="true" />
          <h2 className="text-lg font-bold text-brand-charcoal mb-1">No Events Scheduled</h2>
          <p className="text-gray-500 text-sm mb-4">Click &ldquo;New Event&rdquo; above to schedule your first drive.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Event</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Date & Time</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-brand-charcoal max-w-xs truncate">
                      {event.title}
                    </td>
                    <td className="py-4 px-6 text-gray-500 max-w-xs truncate">
                      {event.location}
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-xs">
                      {new Date(event.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(event.id)}
                        aria-label={`Delete event ${event.title}`}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
