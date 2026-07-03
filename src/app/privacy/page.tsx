export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-brand-charcoal mb-8 text-center">Privacy Policy</h1>
      
      <div className="prose prose-lg max-w-none text-gray-600 space-y-8">
        <p className="text-xl leading-relaxed mb-8">
          Protecting user data—especially the identities of our beneficiaries—is core to our mission.
        </p>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">Data Collection & Live Tracking</h2>
          <p>
            To facilitate efficient logistics, Annapurna utilizes location data.
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-4">
            <li><strong>For Volunteers:</strong> GPS location is actively tracked and shared with the assigned beneficiary only from the moment a food pickup is confirmed until the delivery is marked complete.</li>
            <li><strong>For Beneficiaries:</strong> Exact delivery addresses are only revealed to the assigned volunteer and are hidden from the public feed.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">Data Usage</h2>
          <p>
            User data is never sold to third-party brokers. Advertising on the platform is contextual, not personalized based on individual user profiles. We maintain the highest standards of data encryption to ensure beneficiary requests remain strictly confidential.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">Third-Party Integrations</h2>
          <p>
            We use OpenRouteService for routing and Stripe for payment processing. These third parties only receive the data necessary to perform their respective functions (e.g., coordinates for routing, payment details for donations). They are contractually obligated to protect this information.
          </p>
        </section>
      </div>
    </div>
  );
}
