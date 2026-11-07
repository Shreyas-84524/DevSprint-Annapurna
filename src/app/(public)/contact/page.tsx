"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema } from "@/lib/validation";
import { getContactService } from "@/services/contact";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MapPin, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";

interface ContactFormData {
  name: string;
  email: string;
  message: string;
  phone?: string;
}

export default function ContactPage() {
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const contactService = getContactService();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { error, status } = await contactService.submitMessage({
        name: data.name.trim(),
        email: data.email.trim(),
        message: data.message.trim(),
        phone: data.phone?.trim() || undefined,
      });

      if (error) {
        if (status === 429) {
          setSubmitError("Too many messages sent. Please wait an hour before submitting again.");
        } else {
          setSubmitError(error.message || "Failed to deliver message. Please try again later.");
        }
        return;
      }

      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setSubmitError("A network error occurred. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-4">Get in Touch</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Have questions about donating surplus food, community distributions, or volunteering? Reach out to us.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Info Column */}
        <div className="lg:col-span-1 space-y-8 bg-brand-charcoal p-8 sm:p-10 rounded-3xl text-white shadow-sm flex flex-col justify-between">
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white border-b border-gray-800 pb-4">
              Contact Information
            </h2>

            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-2xl text-brand-gold shrink-0">
                <MapPin size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Central Hub</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Bandra West, Mumbai, MH, 400050, India
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-2xl text-brand-gold shrink-0">
                <Mail size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Direct Support</h3>
                <a
                  href="mailto:support@annapurna.org"
                  className="text-gray-300 hover:text-brand-gold text-sm transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  support@annapurna.org
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-2xl text-brand-gold shrink-0">
                <Phone size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Urgent Helpline</h3>
                <a
                  href="tel:+919876543210"
                  className="text-gray-300 hover:text-brand-gold text-sm transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  +91 98765 43210
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 text-xs text-gray-400">
            Messages are securely delivered to our operational team and never made public.
          </div>
        </div>

        {/* Contact Form Column */}
        <div className="lg:col-span-2 bg-white p-8 sm:p-12 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-brand-charcoal mb-6 flex items-center gap-2">
            <MessageSquare className="text-brand-gold" aria-hidden="true" /> Send Us a Message
          </h2>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                role="alert"
                aria-live="polite"
                className="mb-8 p-6 bg-green-50 border border-green-200 rounded-2xl text-green-800 flex items-start gap-4"
              >
                <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={24} aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-base mb-1">Thank you! Your message has been sent.</h3>
                  <p className="text-sm text-green-700">
                    Our team will review your inquiry and follow up shortly via email.
                  </p>
                </div>
              </motion.div>
            )}

            {submitError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                role="alert"
                aria-live="assertive"
                className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 flex items-start gap-4"
              >
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={24} aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-base mb-1">Submission Failed</h3>
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div>
              <label htmlFor="contact-name" className="block text-sm font-bold text-brand-charcoal mb-2">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                {...register("name")}
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "name-error" : undefined}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.name ? "border-red-400 bg-red-50/50" : "border-gray-200"
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal`}
                placeholder="Priya Sharma"
              />
              {errors.name && (
                <p id="name-error" role="alert" className="text-red-500 text-xs font-semibold mt-1.5">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="contact-email" className="block text-sm font-bold text-brand-charcoal mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                {...register("email")}
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.email ? "border-red-400 bg-red-50/50" : "border-gray-200"
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal`}
                placeholder="priya@example.com"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-red-500 text-xs font-semibold mt-1.5">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="contact-phone" className="block text-sm font-bold text-brand-charcoal mb-2">
                Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="contact-phone"
                type="tel"
                {...register("phone")}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-sm font-bold text-brand-charcoal mb-2">
                Your Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="contact-message"
                rows={5}
                {...register("message")}
                aria-invalid={errors.message ? "true" : "false"}
                aria-describedby={errors.message ? "message-error" : undefined}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.message ? "border-red-400 bg-red-50/50" : "border-gray-200"
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal resize-y`}
                placeholder="Tell us about your organization, event, or inquiry..."
              />
              {errors.message && (
                <p id="message-error" role="alert" className="text-red-500 text-xs font-semibold mt-1.5">
                  {errors.message.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-charcoal hover:bg-gray-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending Message...</span>
                </>
              ) : (
                <span>Send Message</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
