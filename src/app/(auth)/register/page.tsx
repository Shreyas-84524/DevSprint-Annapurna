import { Suspense } from "react";
import { PasswordSignupForm } from "@/components/auth/PasswordSignupForm";

export const metadata = {
  title: "Get Started | Annapurna Food Rescue",
  description: "Join Annapurna as a food donor, requester, or volunteer using secure email and password registration.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-brand-slate">
      <Suspense
        fallback={
          <div className="text-center py-12" aria-live="polite">
            <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin inline-block mb-3" />
            <p className="text-gray-500 font-medium text-sm">Loading registration form...</p>
          </div>
        }
      >
        <PasswordSignupForm />
      </Suspense>
    </div>
  );
}
