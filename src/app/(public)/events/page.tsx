"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getEventsService } from "@/services/events";
import { createClient } from "@/lib/supabase";
import { Calendar, MapPin, Clock, Heart } from "lucide-react";
import Link from "next/link";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const eventsService = getEventsService(supabase);

  useEffect(() => {
    eventsService.getEvents()
      .then(({ data }) => {
        if (data) setEvents(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-4">Upcoming Events</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Participate in food redistribution drives, community kitchen gatherings, and zero hunger campaigns.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4"></span>
          <p className="text-gray-500">Loading events list...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center max-w-xl mx-auto">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2 text-brand-charcoal">No scheduled events</h3>
          <p className="text-gray-500 mb-6">We are currently planning our next outreach events. Sign up to volunteer to get notified!</p>
          <Link href="/register" className="px-6 py-2 bg-brand-charcoal text-white rounded-lg font-bold hover:bg-gray-800 transition-colors">
            Register as Volunteer
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
            >
              {event.image_url ? (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-brand-slate flex items-center justify-center text-brand-charcoal">
                  <Calendar size={40} className="opacity-20" />
                </div>
              )}

              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-brand-charcoal mb-4 line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="text-gray-500 text-sm line-clamp-3 mb-6">
                    {event.description}
                  </p>
                </div>

                <div className="space-y-3 text-xs text-gray-500 border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-brand-gold" />
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-brand-gold" />
                    <span>{new Date(event.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-brand-gold" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>

                <Link
                  href="/register"
                  className="mt-6 w-full py-3 bg-brand-charcoal text-white rounded-xl text-center text-sm font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Heart size={16} className="text-brand-gold" /> Participate
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
