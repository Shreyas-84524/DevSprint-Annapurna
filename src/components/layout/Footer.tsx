import Link from "next/link";
import Image from "next/image";
import { Globe, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-brand-charcoal text-gray-300 py-12 border-t border-gray-800 mt-auto" aria-label="Footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 mb-4 group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <div className="rounded-full group-hover:scale-105 transition-transform flex items-center justify-center bg-transparent">
                <Image
                  src="/logo.png"
                  alt="Annapurna Logo"
                  width={40}
                  height={40}
                  className="object-cover rounded-full"
                />
              </div>
              <span className="font-bold text-xl text-white">Annapurna</span>
            </Link>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Zero Hunger. Zero Waste. Infinite Impact. Connecting surplus food directly with people and shelters who need it most.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://annapurna.org"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Annapurna Official Website"
                className="text-gray-400 hover:text-brand-gold transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                <Globe size={20} aria-hidden="true" />
              </a>
              <Link
                href="/contact"
                aria-label="Contact Annapurna Team"
                className="text-gray-400 hover:text-brand-gold transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                <Mail size={20} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-4 text-base">Platform Workflows</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/dashboard/donor"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Donate Food
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/beneficiary"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Request Food
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/volunteer"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Volunteer Delivery
                </Link>
              </li>
              <li>
                <Link
                  href="/impact"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Live Impact Metrics
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-4 text-base">Stories & Community</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/blog"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Stories & Updates
                </Link>
              </li>
              <li>
                <Link
                  href="/events"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Upcoming Drives
                </Link>
              </li>
              <li>
                <Link
                  href="/gallery"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Photo Gallery
                </Link>
              </li>
              <li>
                <Link
                  href="/standards"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Food Safety Standards
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-white font-semibold mb-4 text-base">Resources & Help</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  About Our Mission
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-brand-gold transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                >
                  Get in Touch
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} Annapurna Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/standards" className="hover:text-brand-gold transition-colors">
              Safety & Hygiene
            </Link>
            <Link href="/about" className="hover:text-brand-gold transition-colors">
              Privacy & Dignity
            </Link>
            <Link href="/contact" className="hover:text-brand-gold transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
