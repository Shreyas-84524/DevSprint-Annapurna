import { EmailLoginForm } from "@/components/auth/EmailLoginForm";
import { Utensils } from "lucide-react";

export const metadata = {
  title: "Food Donor Sign In | Annapurna",
  description: "Sign in with your email address to donate surplus food and coordinate pickups.",
};

export default function DonorLoginPage() {
  return (
    <EmailLoginForm
      purpose="donor_login"
      portalTitle="Food Donor Portal"
      portalSubtitle="Enter your email address to sign in or create your food donor account."
      badgeLabel="Food Donor"
      badgeColorClass="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      accentButtonClass="bg-brand-charcoal text-white hover:bg-gray-800 focus:ring-brand-gold"
      icon={<Utensils size={28} className="text-brand-gold" aria-hidden="true" />}
      backHref="/login"
    />
  );
}
