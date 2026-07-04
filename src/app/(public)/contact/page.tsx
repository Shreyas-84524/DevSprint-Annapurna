"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema } from "@/lib/validation";
import { getContactService } from "@/services/contact";
import { createClient } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, CheckCircle2, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const contactService = getContactService(supabase);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(contactSchema)
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await contactService.submitMessage({
        name: data.name,
        email: data.email,
        message: data.message
      });

      if (error) throw error;
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error("Error submitting contact form:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-4">Get in Touch</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Have questions about donating surplus food or joining as a volunteer? Reach out to us.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Info Column */}
        <div className="lg:col-span-1 space-y-8 bg-brand-charcoal p-8 rounded-3xl text-white">
          <div className="flex items-start gap-4">
            <div className="bg-white/10 p-3 rounded-2xl text-brand-gold">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Our Location</h3>
              <p className="text-gray-400 text-sm">Bandra West, Mumbai, MH, India</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-white/10 p-3 rounded-2xl text-brand-gold">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Email Address</h3>
              <p className="text-gray-400 text-sm">support@annapurna.org</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-white/10 p-3 rounded-2xl text-brand-gold">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Call Support</h3>
              <p className="text-gray-400 text-sm">+91 98765 43210</p>
            </div>
          </div>
        </div>

        {/* Contact Form Column */}
        <div className="lg:col-span-2 bg-white p-8 sm:p-12 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-brand-charcoal mb-6 flex items-center gap-2">
            <MessageSquare className="text-brand-gold" /> Write Us a Message
          </h2>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 border border-green-200 text-brand-eco p-6 rounded-2xl text-center py-12"
            >
              <CheckCircle2 size={48} className="mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
              <p className="text-sm">Thank you. An administrator will review and respond shortly.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  {...register("name")}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-brand-gold transition-shadow ${
                    errors.name ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="Rahul Sharma"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{String(errors.name.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  {...register("email")}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-brand-gold transition-shadow ${
                    errors.email ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="rahul@example.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{String(errors.email.message)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Message</label>
                <textarea
                  rows={4}
                  {...register("message")}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-brand-gold transition-shadow ${
                    errors.message ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="Describe your query..."
                ></textarea>
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1">{String(errors.message.message)}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 bg-brand-charcoal text-white font-bold rounded-xl shadow-md hover:bg-gray-800 transition-all flex justify-center items-center ${
                  isSubmitting ? "bg-gray-400 cursor-not-allowed" : "hover:-translate-y-0.5"
                }`}
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  "Send Message"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
