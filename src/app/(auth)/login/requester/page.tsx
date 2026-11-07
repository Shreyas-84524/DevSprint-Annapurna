import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";
import { HeartHandshake } from "lucide-react";

export const metadata = {
  title: "Food Requester Sign In | Annapurna",
  description: "Sign in with your mobile number to request wholesome food for yourself or community.",
};

export default function RequesterLoginPage() {
  return (
    <PhoneLoginForm
      purpose="requester_login"
      portalTitle="Community Requester Portal"
      portalSubtitle="Enter your mobile number to sign in and discover available fresh meals."
      badgeLabel="Food Requester"
      badgeColorClass="bg-emerald-100 text-emerald-800"
      accentButtonClass="bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-500"
      icon={<HeartHandshake size={28} className="text-brand-eco" aria-hidden="true" />}
      backHref="/login"
    />
  );
}
