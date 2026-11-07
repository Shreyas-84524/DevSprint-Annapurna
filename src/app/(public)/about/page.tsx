import { Heart, Globe } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-brand-charcoal mb-8 text-center">About Annapurna</h1>
      
      <div className="prose prose-lg max-w-none text-gray-600">
        <p className="text-xl leading-relaxed mb-8">
          Headquartered in Mumbai, Annapurna operates on a simple but profound premise: hunger is not a problem of scarcity, but a problem of logistics. Every day, highly nutritious, perfectly safe surplus food is discarded by households, event organizers, and restaurants, while members of our community struggle to secure their next meal.
        </p>

        <div className="bg-brand-white border border-gray-100 shadow-sm rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4 flex items-center gap-2"><Globe className="text-brand-gold" aria-hidden="true" /> The Zero Hunger Ecosystem</h2>
          <p className="mb-4">
            We are a localized, tech-enabled ecosystem designed to bridge the gap between food surplus and food scarcity. By connecting willing donors, discreet beneficiaries, and a dedicated fleet of community delivery volunteers, we ensure that excess food is redistributed efficiently, safely, and with the utmost dignity.
          </p>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-brand-eco mb-4 flex items-center gap-2"><Heart className="text-brand-eco" aria-hidden="true" /> Our "True Zero Waste" Commitment</h2>
          <p className="mb-4">
            We believe every ounce of nourishment has value. Our platform features an automated rerouting protocol: if donated food is nearing its expiry window and has not been requested by a human beneficiary, our system immediately alerts volunteers to redistribute the food to local animal shelters and street dogs. We guarantee absolute zero food waste.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-brand-charcoal mt-12 mb-4">Our Vision for the Future</h2>
        <p>
          We envision a world where surplus never equates to waste. By leveraging real-time logistics and a community-driven volunteer network, we are building a scalable model that can be replicated in any city, creating localized safety nets that protect both the vulnerable and the environment.
        </p>
      </div>
    </div>
  );
}
