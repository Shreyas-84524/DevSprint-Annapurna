"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { getEventsService } from "@/services/events";
import { EventDTO } from "@/types/contracts";
import { Calendar, MapPin, Clock, Heart, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function EventsPage() {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventsService = useMemo(() => getEventsService(), []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await eventsService.getEvents();
      if (fetchErr) {
        setError("Unable to load upcoming events.");
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-4">Upcoming Events</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Participate in food redistribution drives, community kitchen gatherings, and zero hunger campaigns.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center justify-center" aria-live="polite">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading events...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-12 rounded-3xl border border-red-100 text-center max-w-xl mx-auto shadow-sm">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2 text-brand-charcoal">Failed to Load Events</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={loadEvents}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center max-w-xl mx-auto shadow-sm">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2 text-brand-charcoal">No scheduled events</h2>
          <p className="text-gray-500 mb-6">We are currently planning our next outreach drives. Join as a volunteer to get notified first!</p>
          <Link
            href="/dashboard/volunteer"
            className="inline-flex items-center px-6 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            Volunteer Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, idx) => (
            <motion.article
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
            >
              {event.imageUrl ? (
                <div className="relative w-full h-48 bg-gray-100">
                  <Image
                    src={event.imageUrl}
                    alt={event.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-brand-slate flex items-center justify-center text-brand-charcoal">
                  <Calendar size={40} className="opacity-20" aria-hidden="true" />
                </div>
              )}

              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold text-brand-charcoal mb-3 line-clamp-2">
                    {event.title}
                  </h2>
                  <p className="text-gray-500 text-sm line-clamp-3 mb-6 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <div className="space-y-2.5 text-xs text-gray-500 border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-brand-gold shrink-0" aria-hidden="true" />
                    <span>{new Date(event.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-brand-gold shrink-0" aria-hidden="true" />
                    <span>{new Date(event.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-brand-gold shrink-0" aria-hidden="true" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>

                <Link
                  href="/dashboard/volunteer"
                  className="mt-6 w-full py-3 bg-brand-charcoal text-white rounded-xl text-center text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <Heart size={16} className="text-brand-gold" aria-hidden="true" />
                  <span>Participate</span>
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
