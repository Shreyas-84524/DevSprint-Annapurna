"use client";

import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, LogIn, LogOut, Menu, UserPlus, Utensils, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/notifications/NotificationBell";
import { NavbarSession, resolveNavbarSession } from "@/components/layout/navbarAuth";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<NavbarSession>({ status: "loading" });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/" },
    { name: "Give Food", href: "/dashboard/donor" },
    { name: "Find Food", href: "/dashboard/beneficiary" },
    { name: "Deliver", href: "/dashboard/volunteer" },
    { name: "Stories", href: "/blog" },
    { name: "Events", href: "/events" },
    { name: "FAQ", href: "/faq" },
    { name: "Contact", href: "/contact" },
  ];

  // Close mobile menu on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!cancelled) {
          setSession(resolveNavbarSession(response.ok, payload));
        }
      } catch {
        if (!cancelled) {
          setSession({ status: "signed_out" });
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setSignOutError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Sign out failed");
      }
      window.location.replace("/login");
    } catch {
      setSignOutError("Could not sign out. Please try again.");
      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  const isSignedIn = session.status === "signed_in";

  return (
    <nav className="bg-black border-b border-gray-800 sticky top-0 z-40" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <div className="rounded-full group-hover:scale-105 transition-transform flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Annapurna Logo"
                  width={40}
                  height={40}
                  className="object-cover rounded-full"
                />
              </div>
              <span className="font-bold text-2xl text-white tracking-tight">Annapurna</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-6">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium relative py-2 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
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
          </div>

          {/* Right actions: authentication, notifications & CTA */}
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <>
                <NotificationBell />
                <Link
                  href={session.dashboardRoute}
                  prefetch={false}
                  className="hidden xl:inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <LayoutDashboard size={16} aria-hidden="true" />
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  aria-label={isSigningOut ? "Signing out" : "Sign out"}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-200 hover:text-white hover:bg-gray-800 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-50"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span className="hidden xl:inline">{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white text-brand-charcoal rounded-xl font-bold hover:bg-gray-100 transition-colors text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <LogIn size={16} aria-hidden="true" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Desktop CTA */}
            <div className="hidden sm:block">
              <Link
                href="/dashboard/donor"
                className="px-4 py-2 bg-brand-gold text-brand-charcoal rounded-xl font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Utensils size={16} aria-hidden="true" />
                <span>Donate Food</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label={isOpen ? "Close main menu" : "Open main menu"}
                className="text-white p-2 rounded-lg hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
              </button>
            </div>
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
            className="lg:hidden border-t border-gray-800 bg-black overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                      isActive
                        ? "bg-gray-900 text-white border-l-4 border-brand-gold"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white border-l-4 border-transparent"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <div className="border-t border-gray-800 mt-3 pt-3 space-y-2">
                {isSignedIn ? (
                  <>
                    <Link
                      href={session.dashboardRoute}
                      prefetch={false}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl text-base font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                    >
                      <LayoutDashboard size={18} aria-hidden="true" />
                      <span>My Dashboard</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-base font-semibold text-left text-gray-300 hover:text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-50"
                    >
                      <LogOut size={18} aria-hidden="true" />
                      <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      prefetch={false}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl text-base font-bold text-white bg-gray-800 hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                    >
                      <LogIn size={18} aria-hidden="true" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-3 py-3 rounded-xl text-base font-semibold text-brand-gold hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                    >
                      <UserPlus size={18} aria-hidden="true" />
                      <span>Create Account</span>
                    </Link>
                  </>
                )}
              </div>
              <div className="px-3 pt-4 sm:hidden">
                <Link
                  href="/dashboard/donor"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-brand-gold text-brand-charcoal rounded-xl font-bold hover:bg-yellow-500 transition-colors"
                >
                  <Utensils size={18} aria-hidden="true" />
                  <span>Donate Food</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {signOutError && (
        <div
          role="alert"
          className="absolute right-4 top-16 mt-2 max-w-sm rounded-xl border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-100 shadow-xl"
        >
          {signOutError}
        </div>
      )}
    </nav>
  );
}
