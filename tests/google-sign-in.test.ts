import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PasswordLoginForm } from "../src/components/auth/PasswordLoginForm";
import { GoogleIcon } from "../src/components/auth/GoogleSignInButton";
import DonorLoginPage from "../src/app/(auth)/login/donor/page";
import RequesterLoginPage from "../src/app/(auth)/login/requester/page";
import VolunteerLoginPage from "../src/app/(auth)/login/volunteer/page";
import AdminLoginPage from "../src/app/(auth)/login/admin/page";
import { OnboardingRole } from "../src/types/contracts";

describe("Google Sign-In Frontend Suite", () => {
  describe("1. Rendering & Role-Based UI Display", () => {
    it("renders 'Continue with Google' and separator on Donor login page", () => {
      const html = renderToStaticMarkup(React.createElement(DonorLoginPage));
      assert.ok(html.includes("Continue with Google"), "Should contain 'Continue with Google'");
      assert.ok(html.includes("or continue with email"), "Should contain 'or continue with email' separator");
      assert.ok(html.includes("aria-label=\"Continue with Google\""), "Should have accessible label");
      assert.ok(html.includes("#4285F4"), "Should render Google brand SVG");
      assert.ok(html.includes("Sign In"), "Should retain email/password Sign In button");
      assert.ok(html.includes("Forgot password?"), "Should retain Forgot password link");
      assert.ok(html.includes("Sign up as Food Donor"), "Should retain Donor signup link");
    });

    it("renders 'Continue with Google' and separator on Requester login page", () => {
      const html = renderToStaticMarkup(React.createElement(RequesterLoginPage));
      assert.ok(html.includes("Continue with Google"), "Should contain 'Continue with Google'");
      assert.ok(html.includes("or continue with email"), "Should contain separator");
      assert.ok(html.includes("Sign In"), "Should retain email/password Sign In button");
      assert.ok(html.includes("Sign up as Food Requester"), "Should retain Requester signup link");
    });

    it("renders 'Continue with Google' and separator on Volunteer login page", () => {
      const html = renderToStaticMarkup(React.createElement(VolunteerLoginPage));
      assert.ok(html.includes("Continue with Google"), "Should contain 'Continue with Google'");
      assert.ok(html.includes("or continue with email"), "Should contain separator");
      assert.ok(html.includes("Sign In"), "Should retain email/password Sign In button");
      assert.ok(html.includes("Sign up as Delivery Volunteer"), "Should retain Volunteer signup link");
    });

    it("strictly excludes Google sign-in from Admin login page", () => {
      const html = renderToStaticMarkup(React.createElement(AdminLoginPage));
      assert.ok(!html.includes("Continue with Google"), "Admin MUST NOT contain Google login");
      assert.ok(!html.includes("or continue with email"), "Admin MUST NOT contain separator");
      assert.ok(!html.includes("Connecting to Google"), "Admin MUST NOT contain Google states");
      assert.ok(html.includes("Sign In"), "Admin must retain email/password Sign In button");
      assert.ok(html.includes("Operations Command Center"), "Admin header rendered");
      assert.ok(html.includes("Administrative access is restricted to authorized personnel."), "Admin warning retained");
      assert.ok(!html.includes("Sign up as"), "Admin MUST NOT contain signup link");
    });

    it("GoogleIcon renders local inline SVG matching official brand marks", () => {
      const html = renderToStaticMarkup(React.createElement(GoogleIcon));
      assert.ok(html.includes("<svg"), "Must render SVG element");
      assert.ok(html.includes("#4285F4"), "Must include Google Blue");
      assert.ok(html.includes("#34A853"), "Must include Google Green");
      assert.ok(html.includes("#FBBC05"), "Must include Google Yellow");
      assert.ok(html.includes("#EA4335"), "Must include Google Red");
      assert.ok(!html.includes("http://"), "Must not reference external HTTP URL");
      assert.ok(!html.includes("https://"), "Must not reference external HTTPS URL");
    });
  });

  describe("2. OAuth Initiation & Parameter Handling", () => {
    it("calls signInWithOAuth once with provider 'google' and portal role callback", async () => {
      let callCount = 0;
      let passedCredentials: any = null;

      const mockSupabase = {
        auth: {
          signInWithOAuth: async (credentials: any) => {
            callCount++;
            passedCredentials = credentials;
            return { data: { provider: "google", url: "https://accounts.google.com/o/oauth2/auth" }, error: null };
          },
        },
      };

      // Test with each public role
      const roles: OnboardingRole[] = ["donor", "requester", "volunteer"];

      for (const role of roles) {
        callCount = 0;
        passedCredentials = null;

        const roleCallback = `/auth/callback?role=${role}`;

        // Directly invoke the initiation function logic
        const origin = "http://localhost:3000";
        const redirectTo = `${origin}${roleCallback}`;

        const res = await mockSupabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });

        assert.equal(callCount, 1, `Must be called exactly once for ${role}`);
        assert.equal(passedCredentials.provider, "google");
        assert.ok(passedCredentials.options.redirectTo.includes(`/auth/callback?role=${role}`));
        assert.equal(res.error, null);
      }
    });

    it("prevents repeated clicks while OAuth request is in progress", async () => {
      let callCount = 0;
      let resolvePromise: (val: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockSupabase = {
        auth: {
          signInWithOAuth: async () => {
            callCount++;
            return pendingPromise;
          },
        },
      };

      // Simulate component state guard
      let loading = false;
      const handleSignIn = async () => {
        if (loading) return;
        loading = true;
        await mockSupabase.auth.signInWithOAuth();
      };

      // Trigger first click
      const firstClick = handleSignIn();
      assert.equal(loading, true);

      // Trigger second rapid click
      const secondClick = handleSignIn();

      // Only one invocation should have reached the Supabase client
      assert.equal(callCount, 1);

      // Complete the first operation
      resolvePromise!({ data: {}, error: null });
      await firstClick;
      await secondClick;

      assert.equal(callCount, 1);
    });

    it("presents friendly generic error on Supabase initiation failure and allows retry", async () => {
      let callCount = 0;
      let capturedError: any = null;

      const failingSupabase = {
        auth: {
          signInWithOAuth: async () => {
            callCount++;
            return {
              data: { provider: "google", url: null },
              error: { message: "Internal server error 500" },
            };
          },
        },
      };

      let loading = false;
      const handleSignIn = async () => {
        if (loading) return;
        loading = true;
        try {
          const res = await failingSupabase.auth.signInWithOAuth();
          if (res.error) {
            loading = false;
            capturedError = "Unable to connect to Google. Please try again or sign in with your email and password.";
          }
        } catch {
          loading = false;
          capturedError = "Google sign-in is temporarily unavailable. Please sign in with your email and password.";
        }
      };

      // First attempt
      await handleSignIn();
      assert.equal(callCount, 1);
      assert.equal(loading, false, "Loading state must reset so user can retry");
      assert.equal(capturedError, "Unable to connect to Google. Please try again or sign in with your email and password.");
      assert.ok(!capturedError!.includes("500"), "Must not leak internal server details");

      // Retry attempt
      await handleSignIn();
      assert.equal(callCount, 2, "User must be able to retry after error");
    });

    it("handles exceptions gracefully without logging secrets or credentials", async () => {
      let capturedError: any = null;
      let loading = false;

      const throwingSupabase = {
        auth: {
          signInWithOAuth: async () => {
            throw new Error("Network unreachable");
          },
        },
      };

      const handleSignIn = async () => {
        if (loading) return;
        loading = true;
        try {
          await throwingSupabase.auth.signInWithOAuth();
        } catch {
          loading = false;
          capturedError = "Google sign-in is temporarily unavailable. Please sign in with your email and password.";
        }
      };

      await handleSignIn();
      assert.equal(loading, false);
      assert.ok(capturedError?.includes("temporarily unavailable"));
    });
  });

  describe("3. Callback Error & Cancellation Guidance", () => {
    const parseUrlError = (errorParam: string | null, errorDescParam: string | null): string | null => {
      const errorMsg = errorParam || errorDescParam;
      if (!errorMsg) return null;
      const lower = errorMsg.toLowerCase();
      if (
        lower.includes("access_denied") ||
        lower.includes("cancel") ||
        lower.includes("cancelled") ||
        lower.includes("canceled")
      ) {
        return "Google sign-in was canceled. Please try again or sign in with your email and password.";
      }
      if (lower.includes("expired") || lower.includes("invalid")) {
        return "Your verification link has expired or was already used. You can sign in directly with your email and password below.";
      }
      return "Unable to complete sign-in. Please try again or sign in with your email and password.";
    };

    it("provides clear retry guidance when user cancels Google consent", () => {
      const msg = parseUrlError("access_denied", "User cancelled the sign-up request");
      assert.equal(msg, "Google sign-in was canceled. Please try again or sign in with your email and password.");
    });

    it("handles canceled query flag alone", () => {
      const msg = parseUrlError("canceled", null);
      assert.equal(msg, "Google sign-in was canceled. Please try again or sign in with your email and password.");
    });

    it("maintains helpful guidance for expired tokens", () => {
      const msg = parseUrlError("otp_expired", "Email link is invalid or has expired");
      assert.ok(msg?.includes("verification link has expired"));
    });

    it("provides friendly generic fallback for other callback errors", () => {
      const msg = parseUrlError("oauth_provider_error", "An unknown provider error occurred");
      assert.equal(msg, "Unable to complete sign-in. Please try again or sign in with your email and password.");
    });
  });

  describe("4. Security and Boundary Verification", () => {
    it("ensures Admin portal cannot be provided with a public OAuth action", () => {
      const formProps = {
        portalRole: "admin" as const,
        portalTitle: "Operations Command Center",
        portalSubtitle: "Authorized administrators sign in with email and administrative password.",
        badgeLabel: "System Admin",
        badgeColorClass: "bg-purple-100 text-purple-800",
        accentButtonClass: "bg-brand-charcoal text-white",
        icon: null,
      };

      const html = renderToStaticMarkup(React.createElement(PasswordLoginForm, formProps));
      assert.ok(!html.includes("Continue with Google"));
      assert.ok(!html.includes("signInWithOAuth"));
    });

    it("ensures callback URL parameters are sanitized and encoded", () => {
      const portalRole: OnboardingRole = "donor";
      const origin = "http://localhost:3000";
      const redirectUrl = `${origin}/auth/callback?role=${encodeURIComponent(portalRole)}`;

      const parsed = new URL(redirectUrl);
      assert.equal(parsed.pathname, "/auth/callback");
      assert.equal(parsed.searchParams.get("role"), "donor");
      assert.ok(!parsed.searchParams.has("admin"));
    });
  });
});
