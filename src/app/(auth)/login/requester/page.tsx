import { PasswordLoginForm } from "@/components/auth/PasswordLoginForm";
import { HeartHandshake } from "lucide-react";

export const metadata = {
  title: "Food Requester Sign In | Annapurna",
  description: "Sign in with your email and password to request wholesome food for yourself or community.",
};

export default function RequesterLoginPage() {
  return (
    <PasswordLoginForm
      portalRole="requester"
      portalTitle="Community Requester Portal"
      portalSubtitle="Sign in with your email and password to discover available fresh meals."
      badgeLabel="Food Requester"
      badgeColorClass="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
      accentButtonClass="bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-500"
      icon={<HeartHandshake size={28} className="text-brand-eco" aria-hidden="true" />}
      backHref="/login"
    />
  );
}
