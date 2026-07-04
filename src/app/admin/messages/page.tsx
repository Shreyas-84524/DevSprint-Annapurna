"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { getContactService } from "@/services/contact";
import { Trash2, ArrowLeft, MessageSquare, Mail, Calendar, User } from "lucide-react";
import Link from "next/link";

export default function AdminMessagesPage() {
  const supabase = createClient();
  const contactService = getContactService(supabase);

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    try {
      const { data } = await contactService.getMessages();
      if (data) setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadMessages();
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
        <h1 className="text-3xl font-black text-brand-charcoal">Visitor Messages</h1>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
          <MessageSquare className="mx-auto text-gray-300 mb-2" />
          No messages received.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {messages.map(msg => (
            <div key={msg.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-brand-charcoal flex items-center gap-2 text-base">
                      <User size={16} className="text-brand-gold" /> {msg.name}
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-2">
                      <Mail size={14} className="text-brand-gold" /> {msg.email}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">
                  {msg.message}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 text-right">
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
