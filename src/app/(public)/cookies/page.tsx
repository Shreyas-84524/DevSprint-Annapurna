export default function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-brand-charcoal mb-8 text-center">Cookie Policy</h1>
      
      <div className="prose prose-lg max-w-none text-gray-600 space-y-8">
        <p className="text-xl leading-relaxed mb-8">
          Annapurna uses cookies and similar technologies to ensure our platform functions correctly, to understand how users interact with our service, and to maintain a secure environment.
        </p>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">What are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">How We Use Cookies</h2>
          <ul className="list-disc pl-6 space-y-4">
            <li><strong>Essential Cookies:</strong> These are required for the operation of our platform. They include, for example, cookies that enable you to log into secure areas of our website.</li>
            <li><strong>Functional Cookies:</strong> These are used to recognize you when you return to our website. This enables us to personalize our content for you and remember your preferences.</li>
            <li><strong>Analytical/Performance Cookies:</strong> They allow us to recognize and count the number of visitors and to see how visitors move around our website when they are using it. This helps us to improve the way our website works.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-brand-charcoal mb-4">Managing Cookies</h2>
          <p>
            You can manage your cookie preferences through your browser settings. Please note that if you block essential cookies, certain features of the Annapurna platform (such as logging in or claiming a delivery) may not function properly.
          </p>
        </section>
      </div>
    </div>
  );
}
