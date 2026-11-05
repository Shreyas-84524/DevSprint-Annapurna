"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/" },
    { name: "Donor Dashboard", href: "/dashboard/donor" },
    { name: "Requester Dashboard", href: "/dashboard/beneficiary" },
    { name: "Volunteer Dashboard", href: "/dashboard/volunteer" },
    { name: "Impact", href: "/impact" },
  ];

  return (
    <nav className="bg-black border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="rounded-full group-hover:scale-105 transition-transform flex items-center justify-center">
                <Image src="/logo.png" alt="Annapurna Logo" width={48} height={48} className="object-cover rounded-full" />
              </div>
              <span className="font-bold text-2xl text-white">Annapurna</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium relative py-2 ${
                    isActive ? "text-white" : "text-gray-300 hover:text-white"
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold"
                    />
                  )}
                </Link>
              );
            })}
            <Link
              href="/donate"
              className="px-4 py-2 bg-brand-gold text-brand-charcoal rounded-md font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2"
            >
              <Heart size={16} /> Donate
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white p-2"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-800 bg-black overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-4 rounded-md text-base font-medium ${
                      isActive
                        ? "bg-gray-900 text-white border-l-4 border-brand-gold"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white border-l-4 border-transparent"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <div className="px-3 pt-4">
                <Link
                  href="/donate"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-brand-gold text-brand-charcoal rounded-md font-bold"
                >
                  <Heart size={16} /> Donate
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
