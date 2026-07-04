"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Trash2, Plus, ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function AdminFaqsPage() {
  const supabase = createClient();

  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFaqs = async () => {
    try {
      const { data } = await supabase
        .from("faqs")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setFaqs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("faqs")
        .insert({ question, answer, category });
      
      if (error) throw error;
      
      setQuestion("");
      setAnswer("");
      setCategory("General");
      setShowForm(false);
      await loadFaqs();
    } catch (err) {
      console.error("Error creating FAQ:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      const { error } = await supabase
        .from("faqs")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadFaqs();
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
        <h1 className="text-3xl font-black text-brand-charcoal">FAQ Editor</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> {showForm ? "Cancel" : "Create FAQ"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-3xl mb-12 space-y-6">
          <h2 className="text-xl font-bold text-brand-charcoal">New FAQ Details</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <input
              required
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="e.g., How do I donate food surplus?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
            >
              <option value="General">General</option>
              <option value="Donation">Donation</option>
              <option value="Volunteer">Volunteer</option>
              <option value="NGO">Partner NGO</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
            <textarea
              required
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="Write the explanation details..."
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-brand-charcoal text-white font-bold rounded-xl shadow-md hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? "Saving..." : "Add FAQ"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12">
          <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
          <HelpCircle className="mx-auto text-gray-300 mb-2" />
          No FAQs created yet.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 sm:p-6 w-1/3">Question</th>
                <th className="p-4 sm:p-6 w-1/2">Answer</th>
                <th className="p-4 sm:p-6">Category</th>
                <th className="p-4 sm:p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {faqs.map(faq => (
                <tr key={faq.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 sm:p-6 font-bold text-brand-charcoal">{faq.question}</td>
                  <td className="p-4 sm:p-6 text-gray-500 line-clamp-2">{faq.answer}</td>
                  <td className="p-4 sm:p-6">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded">
                      {faq.category}
                    </span>
                  </td>
                  <td className="p-4 sm:p-6 text-right">
                    <button
                      onClick={() => handleDelete(faq.id)}
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
