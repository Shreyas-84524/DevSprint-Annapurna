"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getFaqsService } from "@/services/faqs";
import { FaqDTO } from "@/types/contracts";
import { Trash2, Plus, ArrowLeft, HelpCircle, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AdminFaqsPage() {
  const faqsService = useMemo(() => getFaqsService(), []);

  const [faqs, setFaqs] = useState<FaqDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await faqsService.getFaqs();
      if (fetchErr) {
        setError(fetchErr.message || "Failed to load FAQs.");
      } else {
        setFaqs(data || []);
      }
    } catch {
      setError("Network error loading FAQs.");
    } finally {
      setLoading(false);
    }
  }, [faqsService]);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!question.trim() || !answer.trim()) {
      setFormError("Question and answer are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim() || "General",
      };

      const { error: createErr } = await faqsService.createFaq(payload);
      if (createErr) throw createErr;
      
      setQuestion("");
      setAnswer("");
      setCategory("General");
      setShowForm(false);
      await loadFaqs();
    } catch (err: any) {
      setFormError(err.message || "Error creating FAQ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      const { error: delErr } = await faqsService.deleteFaq(id);
      if (delErr) alert(delErr.message || "Failed to delete FAQ");
      await loadFaqs();
    } catch (err: any) {
      alert(err.message || "Error deleting FAQ");
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
          <h1 className="text-3xl font-black text-brand-charcoal">Manage Knowledge Base FAQs</h1>
          <p className="text-gray-500 text-sm mt-1">Configure user guidelines for food donors, recipients, and volunteers.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <Plus size={18} aria-hidden="true" />
          <span>{showForm ? "Cancel" : "New FAQ"}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-md mb-12 space-y-6">
          <h2 className="text-xl font-bold text-brand-charcoal border-b pb-3">Add FAQ Entry</h2>

          {formError && (
            <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="faq-question" className="block text-sm font-bold text-gray-700 mb-2">
                Question <span className="text-red-500">*</span>
              </label>
              <input
                id="faq-question"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                placeholder="How do volunteers conduct QC on food packages?"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal"
              />
            </div>

            <div>
              <label htmlFor="faq-category" className="block text-sm font-bold text-gray-700 mb-2">
                Category
              </label>
              <select
                id="faq-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold text-brand-charcoal bg-white"
              >
                <option value="For Donors">For Donors</option>
                <option value="For Requesters">For Requesters</option>
                <option value="For Volunteers">For Volunteers</option>
                <option value="Food Safety & Logistics">Food Safety & Logistics</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="faq-answer" className="block text-sm font-bold text-gray-700 mb-2">
              Answer <span className="text-red-500">*</span>
            </label>
            <textarea
              id="faq-answer"
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
              placeholder="Explain the policy or instructions clearly..."
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
              {isSubmitting ? "Saving..." : "Save FAQ"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 flex flex-col items-center" aria-live="polite">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Loading FAQs...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-8 rounded-3xl border border-red-100 text-center max-w-md mx-auto">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={36} aria-hidden="true" />
          <p className="text-gray-700 font-semibold mb-4">{error}</p>
          <button
            type="button"
            onClick={loadFaqs}
            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8">
          <HelpCircle className="mx-auto text-gray-300 mb-3" size={40} aria-hidden="true" />
          <h2 className="text-lg font-bold text-brand-charcoal mb-1">No FAQs Configured</h2>
          <p className="text-gray-500 text-sm mb-4">Click &ldquo;New FAQ&rdquo; above to add common questions.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Question</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Answer Preview</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {faqs.map((faq) => (
                  <tr key={faq.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-brand-charcoal max-w-xs truncate">
                      {faq.question}
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {faq.category || "General"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 max-w-sm truncate text-xs">
                      {faq.answer}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(faq.id)}
                        aria-label={`Delete question ${faq.question}`}
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
