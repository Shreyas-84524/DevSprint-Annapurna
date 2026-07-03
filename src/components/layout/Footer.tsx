import Link from "next/link";
import Image from "next/image";
import { Heart, Globe, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-brand-charcoal text-gray-300 py-12 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="rounded-full group-hover:scale-105 transition-transform flex items-center justify-center bg-transparent">
                <Image src="/logo.png" alt="Annapurna Logo" width={40} height={40} className="object-cover rounded-full" />
              </div>
              <span className="font-bold text-xl text-brand-white">Annapurna</span>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              Zero Hunger. Zero Waste. Infinite Impact. Connecting surplus food with those who need it most.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-brand-gold transition-colors">
                <Globe size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-brand-gold transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-brand-white font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/donor" className="hover:text-brand-gold transition-colors">
                  Donate Food
                </Link>
              </li>
              <li>
                <Link href="/beneficiary" className="hover:text-brand-gold transition-colors">
                  Request a Meal
                </Link>
              </li>
              <li>
                <Link href="/volunteer" className="hover:text-brand-gold transition-colors">
                  Volunteer
                </Link>
              </li>
              <li>
                <Link href="/donate" className="hover:text-brand-gold transition-colors">
                  Sponsorship
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-brand-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-brand-gold transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/impact" className="hover:text-brand-gold transition-colors">
                  Impact Guidelines
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-brand-gold transition-colors">
                  Food Safety Standards
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-brand-gold transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-brand-white font-semibold mb-4">Join the Mission</h3>
            <p className="text-sm text-gray-400 mb-4">
              Subscribe to our newsletter for impact updates and volunteer opportunities.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Email address"
                className="bg-gray-800 text-brand-white border border-gray-700 rounded-l-md px-4 py-2 w-full focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold text-sm"
              />
              <button className="bg-brand-gold text-brand-charcoal px-4 py-2 rounded-r-md font-semibold hover:bg-yellow-500 transition-colors flex items-center justify-center">
                <Heart size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Annapurna Platform. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-brand-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-brand-white transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-brand-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
