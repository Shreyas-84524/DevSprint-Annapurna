import { PasswordLoginForm } from "@/components/auth/PasswordLoginForm";
import { Utensils } from "lucide-react";

export const metadata = {
  title: "Food Donor Sign In | Annapurna",
  description: "Sign in with your email and password to donate surplus food and coordinate pickups.",
};

export default function DonorLoginPage() {
  return (
    <PasswordLoginForm
      portalRole="donor"
      portalTitle="Food Donor Portal"
      portalSubtitle="Sign in with your email and password to coordinate food donations."
      badgeLabel="Food Donor"
      badgeColorClass="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      accentButtonClass="bg-brand-charcoal text-white hover:bg-gray-800 focus:ring-brand-gold"
      icon={<Utensils size={28} className="text-brand-gold" aria-hidden="true" />}
      backHref="/login"
    />
  );
}
