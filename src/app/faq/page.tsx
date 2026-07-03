export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-brand-charcoal mb-8 text-center">Frequently Asked Questions (FAQ)</h1>
      
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-6 border-b pb-2">For Donors</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">What kind of food can I donate?</h3>
              <p className="text-gray-600">You can donate excess prepared meals from events, untouched restaurant surplus, or extra household meals, provided they have been stored safely and are not past their safe consumption window. We do not accept partially eaten food.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Can I support Annapurna without donating physical food?</h3>
              <p className="text-gray-600">Yes. You can use the "Donate" feature to make a monetary donation. These funds are directly used to compensate our delivery volunteers, ensuring the logistics engine keeps running.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-6 border-b pb-2">For Volunteers</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">How do I get paid?</h3>
              <p className="text-gray-600">Volunteers are compensated for each successful delivery. The funds are generated through banner ads on our platform and public sponsorships. Earnings are deposited directly into your linked bank account on a weekly basis.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">What happens if the food looks unsafe when I pick it up?</h3>
              <p className="text-gray-600">You have the authority to reject the pickup. Use the app to flag the donation as "Failed QC." You will still receive a partial compensation for your travel time, and the donor will be reviewed.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-6 border-b pb-2">For Beneficiaries</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Is my identity public when I request food?</h3>
              <p className="text-gray-600">No. The public feed only shows the general vicinity of the request. Your specific name and exact delivery location are only provided to the volunteer who accepts your delivery task.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Can NGOs use this platform?</h3>
              <p className="text-gray-600">Absolutely. NGO representatives can create organizational accounts to request bulk donations from large events or restaurants directly through the platform.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
