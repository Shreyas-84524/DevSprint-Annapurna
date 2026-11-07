"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getContactService } from "@/services/contact";
import { ContactMessageDTO } from "@/types/contracts";
import { Trash2, ArrowLeft, MessageSquare, Mail, Calendar, User, Phone, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AdminMessagesPage() {
  const contactService = useMemo(() => getContactService(), []);

  const [messages, setMessages] = useState<ContactMessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await contactService.getMessages();
      if (fetchErr) {
        setError(fetchErr.message || "Failed to load visitor messages.");
      } else {
        setMessages(data || []);
      }
    } catch {
      setError("Network error loading visitor messages.");
    } finally {
      setLoading(false);
    }
  }, [contactService]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const { error: delErr } = await contactService.deleteMessage(id);
      if (delErr) alert(delErr.message || "Failed to delete message");
      await loadMessages();
    } catch (err: any) {
      alert(err.message || "Error deleting message");
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
          <h1 className="text-3xl font-black text-brand-charcoal">Visitor Inquiries & Messages</h1>
          <p className="text-gray-500 text-sm mt-1">Confidential messages submitted through the public contact form.</p>
        </div>

        <button
          type="button"
          onClick={loadMessages}
          disabled={loading}
          aria-label="Refresh messages"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-brand-charcoal rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center justify-center" aria-live="polite">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading messages...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-8 rounded-3xl border border-red-100 text-center max-w-md mx-auto">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={36} aria-hidden="true" />
          <p className="text-gray-700 font-semibold mb-4">{error}</p>
          <button
            type="button"
            onClick={loadMessages}
            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-3xl border border-gray-100 p-8">
          <MessageSquare className="mx-auto text-gray-300 mb-3" size={40} aria-hidden="true" />
          <h2 className="text-lg font-bold text-brand-charcoal mb-1">No Messages Received</h2>
          <p className="text-gray-400 text-sm">Inquiries from the public contact page will show here securely.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-gray-200 transition-colors"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-bold text-lg text-brand-charcoal flex items-center gap-2">
                      <User size={18} className="text-brand-gold shrink-0" aria-hidden="true" />
                      <span>{msg.name}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <a
                        href={`mailto:${msg.email}`}
                        className="inline-flex items-center gap-1 hover:text-brand-gold transition-colors"
                      >
                        <Mail size={12} aria-hidden="true" />
                        <span>{msg.email}</span>
                      </a>
                      {msg.phone && (
                        <a
                          href={`tel:${msg.phone}`}
                          className="inline-flex items-center gap-1 hover:text-brand-gold transition-colors"
                        >
                          <Phone size={12} aria-hidden="true" />
                          <span>{msg.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(msg.id)}
                    aria-label={`Delete message from ${msg.name}`}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 shrink-0"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.message}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} aria-hidden="true" />
                  <span>
                    {new Date(msg.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <a
                  href={`mailto:${msg.email}?subject=Re: Inquiry on Annapurna`}
                  className="font-semibold text-brand-charcoal hover:text-brand-gold transition-colors inline-flex items-center gap-1"
                >
                  <Mail size={12} aria-hidden="true" />
                  <span>Reply</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
