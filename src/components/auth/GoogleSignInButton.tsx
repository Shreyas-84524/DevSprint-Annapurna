"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { OnboardingRole } from "@/types/contracts";

export interface GoogleSignInButtonProps {
  portalRole: OnboardingRole;
  onError?: (errorMessage: string) => void;
  disabled?: boolean;
  className?: string;
  supabaseClient?: any;
}

/**
 * Local Google 'G' Mark SVG adhering strictly to Google branding guidelines.
 * Never fetches untrusted runtime assets.
 */
export function GoogleIcon({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  portalRole,
  onError,
  disabled = false,
  className = "",
  supabaseClient,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading || disabled) return;
    setLoading(true);

    try {
      const supabase = supabaseClient || createClient();
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "";
      const redirectTo = `${origin}/auth/callback?role=${encodeURIComponent(portalRole)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        setLoading(false);
        onError?.(
          "Unable to connect to Google. Please try again or sign in with your email and password."
        );
      }
      // Note: On success, Supabase client automatically redirects browser to OAuth consent screen.
    } catch {
      setLoading(false);
      onError?.(
        "Google sign-in is temporarily unavailable. Please sign in with your email and password."
      );
    }
  };

  const isButtonDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={isButtonDisabled}
      aria-label="Continue with Google"
      className={`w-full py-3 px-4 bg-white border border-gray-300 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin text-gray-500 shrink-0" aria-hidden="true" />
          <span>Connecting to Google...</span>
        </>
      ) : (
        <>
          <GoogleIcon />
          <span>Continue with Google</span>
        </>
      )}
    </button>
  );
}
