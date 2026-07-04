export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-brand-charcoal mb-4 text-center">Terms of Service</h1>
      <p className="text-center text-gray-500 mb-12">Last Updated: April 20, 2026</p>
      
      <div className="prose prose-lg max-w-none text-gray-600 space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">1. Platform Usage</h2>
          <p>
            Annapurna provides a technological logistics interface. We do not prepare or manufacture food. Users agree to use the platform in good faith, providing accurate information regarding food status, location, and intentions. Any misuse of the platform, including false listings or fraudulent pickup confirmations, will result in immediate suspension.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">2. Volunteer Agreement</h2>
          <p>
            Delivery volunteers act as independent contractors. Compensation is dynamically calculated based on platform advertising revenue and public monetary donations. Annapurna guarantees a base payout per completed delivery, but exact compensation may fluctuate based on platform revenue. Volunteers are strictly prohibited from soliciting direct payments from beneficiaries.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">3. Limitation of Liability</h2>
          <p>
            While Annapurna enforces mandatory Volunteer QC checks, donors are ultimately legally responsible for the safety of the food they post. Annapurna acts as a facilitator and shall not be held liable for health complications arising from undeclared allergens or misrepresented food safety windows by the donor.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">4. Account Termination</h2>
          <p>
            Annapurna reserves the right to terminate or suspend user accounts at our sole discretion, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users of the platform, us, or third parties, or for any other reason.
          </p>
        </section>
      </div>
    </div>
  );
}
