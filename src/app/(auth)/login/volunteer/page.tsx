import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";
import { Truck } from "lucide-react";

export const metadata = {
  title: "Volunteer Sign In | Annapurna",
  description: "Sign in with your mobile number to view and accept food delivery rescue tasks.",
};

export default function VolunteerLoginPage() {
  return (
    <PhoneLoginForm
      purpose="volunteer_login"
      portalTitle="Volunteer Delivery Portal"
      portalSubtitle="Enter your mobile number to sign in and view active rescue tasks."
      badgeLabel="Delivery Volunteer"
      badgeColorClass="bg-blue-100 text-blue-800"
      accentButtonClass="bg-brand-charcoal text-white hover:bg-gray-800 focus:ring-blue-500"
      icon={<Truck size={28} className="text-blue-600" aria-hidden="true" />}
      backHref="/login"
    />
  );
}
