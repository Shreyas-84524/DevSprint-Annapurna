"use client";

import { useState, useEffect, useMemo } from "react";
import { getFaqsService } from "@/services/faqs";
import { FaqDTO } from "@/types/contracts";
import { ChevronDown, HelpCircle, Utensils, HeartHandshake, ShieldCheck, Truck } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FALLBACK_FAQS: FAQItem[] = [
  // For Donors
  {
    id: "f-donor-1",
    question: "What kind of food can I donate on Annapurna?",
    answer: "You can donate excess freshly prepared meals from households, restaurants, corporate cafeterias, and catered events. All items must be packed in clean, food-grade containers and within their safe consumption window. We cannot accept partially consumed dishes or unsealed perishables.",
    category: "For Donors",
  },
  {
    id: "f-donor-2",
    question: "How quickly will someone pick up my food donation?",
    answer: "Our automated dispatch notifies nearby volunteers immediately upon listing. For unexpired surplus, typical volunteer pickup times range between 30 and 60 minutes depending on volunteer density in your neighborhood.",
    category: "For Donors",
  },
  {
    id: "f-donor-3",
    question: "What if my food has a short remaining shelf life?",
    answer: "You declare the expected safe consumption window when creating the listing. If a listing is within 2 hours of expiry and has not been claimed for human consumption, our protocol automatically reroutes it to verified local animal shelters and community dog feeders.",
    category: "For Donors",
  },

  // For Requesters
  {
    id: "f-req-1",
    question: "Is my personal identity or exact location public when requesting food?",
    answer: "No. Your identity and exact address are completely private. Public listings and search summaries display only general locality pins. Your precise address and contact details are revealed exclusively to the verified volunteer who accepts your delivery task.",
    category: "For Requesters",
  },
  {
    id: "f-req-2",
    question: "Can shelter homes and charitable organizations claim food?",
    answer: "Yes. Community shelters, care homes, and verified NGOs can claim bulk food portions to feed multiple residents, with verification handled directly through our requester dashboard.",
    category: "For Requesters",
  },

  // For Volunteers
  {
    id: "f-vol-1",
    question: "What are volunteer responsibilities during food pickup?",
    answer: "Volunteers perform a standardized Quality Control (QC) check at pickup: verifying packaging integrity, assessing temperature to the touch, and checking for fresh appearance and absence of spoilage. If food fails inspection, volunteers can reject the pickup directly in the app.",
    category: "For Volunteers",
  },
  {
    id: "f-vol-2",
    question: "How does recipient confirmation work?",
    answer: "At delivery dropoff, a secure SMS/OTP code is sent to the recipient. The volunteer enters the code to verify successful handover and complete the delivery record.",
    category: "For Volunteers",
  },

  // Safety & Standards
  {
    id: "f-safe-1",
    question: "What food safety standards does Annapurna follow?",
    answer: "Annapurna follows strict hygiene guidelines aligned with Food Safety and Standards Authority guidelines: hot foods must be stored safely above 60°C, cold foods below 5°C, and all items must be transported in covered, clean containers.",
    category: "Food Safety & Logistics",
  },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>(FALLBACK_FAQS);
  const [expandedId, setExpandedId] = useState<string | null>("f-donor-1");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const faqsService = useMemo(() => getFaqsService(), []);

  useEffect(() => {
    faqsService.getFaqs().then(({ data }) => {
      if (data && data.length > 0) {
        // Merge or replace with database FAQs
        const mapped: FAQItem[] = data.map((d: FaqDTO) => ({
          id: d.id,
          question: d.question,
          answer: d.answer,
          category: d.category || "General",
        }));
        setFaqs(mapped);
      }
    }).catch(() => {
      // Use fallback
    });
  }, [faqsService]);

  const categories = ["All", ...Array.from(new Set(faqs.map((f) => f.category)))];

  const filteredFaqs = activeCategory === "All" 
    ? faqs 
    : faqs.filter((f) => f.category === activeCategory);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "for donors":
        return <HeartHandshake size={18} className="text-brand-gold" aria-hidden="true" />;
      case "for requesters":
      case "for beneficiaries":
        return <Utensils size={18} className="text-blue-500" aria-hidden="true" />;
      case "for volunteers":
        return <Truck size={18} className="text-brand-eco" aria-hidden="true" />;
      default:
        return <ShieldCheck size={18} className="text-purple-500" aria-hidden="true" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-brand-charcoal mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Learn how Annapurna connects surplus food, community volunteers, and zero hunger initiatives.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10" role="tablist" aria-label="FAQ categories">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                isSelected
                  ? "bg-brand-charcoal text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-4" role="region" aria-label="Questions list">
        {filteredFaqs.map((faq) => {
          const isExpanded = expandedId === faq.id;

          return (
            <div
              key={faq.id}
              className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => toggleAccordion(faq.id)}
                aria-expanded={isExpanded}
                aria-controls={`faq-answer-${faq.id}`}
                id={`faq-question-${faq.id}`}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-inset"
              >
                <div className="flex items-center gap-3">
                  {getCategoryIcon(faq.category)}
                  <span className="font-bold text-base sm:text-lg text-brand-charcoal">
                    {faq.question}
                  </span>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 shrink-0 transition-transform duration-200 ${
                    isExpanded ? "rotate-180 text-brand-gold" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isExpanded && (
                <div
                  id={`faq-answer-${faq.id}`}
                  role="region"
                  aria-labelledby={`faq-question-${faq.id}`}
                  className="px-6 pb-6 pt-1 text-gray-600 text-sm sm:text-base leading-relaxed border-t border-gray-100"
                >
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-16 p-8 bg-brand-charcoal rounded-3xl text-white text-center">
        <HelpCircle size={36} className="mx-auto text-brand-gold mb-3" aria-hidden="true" />
        <h2 className="text-xl font-bold mb-2">Have a question not listed here?</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
          Our team is available to assist food donors, volunteers, and partner institutions.
        </p>
        <a
          href="/contact"
          className="inline-flex px-6 py-2.5 bg-brand-gold text-brand-charcoal rounded-xl font-bold hover:bg-yellow-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
