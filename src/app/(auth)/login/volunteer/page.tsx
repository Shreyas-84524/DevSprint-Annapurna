import { PasswordLoginForm } from "@/components/auth/PasswordLoginForm";
import { Truck } from "lucide-react";

export const metadata = {
  title: "Volunteer Sign In | Annapurna",
  description: "Sign in with your email and password to view and accept food delivery rescue tasks.",
};

export default function VolunteerLoginPage() {
  return (
    <PasswordLoginForm
      portalRole="volunteer"
      portalTitle="Volunteer Delivery Portal"
      portalSubtitle="Sign in with your email and password to view and accept active rescue tasks."
      badgeLabel="Delivery Volunteer"
      badgeColorClass="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      accentButtonClass="bg-brand-charcoal text-white hover:bg-gray-800 focus:ring-blue-500"
      icon={<Truck size={28} className="text-blue-600" aria-hidden="true" />}
      backHref="/login"
    />
  );
}
