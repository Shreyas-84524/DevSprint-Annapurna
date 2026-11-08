import { PasswordLoginForm } from "@/components/auth/PasswordLoginForm";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Admin Sign In | Annapurna Operations",
  description: "Administrative access to Annapurna zero-hunger platform management and operations.",
};

export default function AdminLoginPage() {
  return (
    <PasswordLoginForm
      portalRole="admin"
      portalTitle="Operations Command Center"
      portalSubtitle="Authorized administrators sign in with email and administrative password."
      badgeLabel="System Admin"
      badgeColorClass="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      accentButtonClass="bg-brand-charcoal text-white hover:bg-gray-800 focus:ring-purple-500"
      icon={<ShieldCheck size={28} className="text-purple-600" aria-hidden="true" />}
      backHref="/login"
    />
  );
}
