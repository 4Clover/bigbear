import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Grizzly Getaway cabin rental.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Effective Date: February 17, 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground">
              Grizzly Getaway (1394 La Crescenta Dr, Big Bear, CA 92314) is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use, and protect your
              personal information when you book a stay with us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">
              2. Information We Collect
            </h2>
            <p className="text-muted-foreground">We collect the following types of information:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong>Contact Information:</strong> Name, email address, and phone number
              </li>
              <li>
                <strong>Booking Details:</strong> Check-in/check-out dates, number of guests, and
                special requests
              </li>
              <li>
                <strong>Payment Information:</strong> Processed securely through Stripe; we do not
                store full credit card details
              </li>
              <li>
                <strong>Communication Records:</strong> Messages and inquiries sent through our
                contact form or email
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">
              3. How We Use Your Information
            </h2>
            <p className="text-muted-foreground">
              We use your information for the following purposes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Processing and confirming your booking</li>
              <li>Sending booking confirmations and reminders</li>
              <li>Responding to your inquiries and support requests</li>
              <li>Improving our services and user experience</li>
              <li>Complying with legal obligations</li>
              <li>Preventing fraud and ensuring property security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">
              4. Third-Party Services
            </h2>
            <p className="text-muted-foreground">
              We use the following third-party services to operate our booking platform:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong>Stripe:</strong> Payment processing. Your payment information is handled
                securely by Stripe and is subject to their privacy policy.
              </li>
              <li>
                <strong>Resend:</strong> Email delivery for booking confirmations and
                communications.
              </li>
              <li>
                <strong>Twilio:</strong> SMS notifications for booking reminders and updates.
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              These third parties are contractually obligated to use your information only as
              necessary to provide services to us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">
              5. Cookies and Tracking
            </h2>
            <p className="text-muted-foreground">
              Our website uses cookies to enhance your experience. Cookies help us remember your
              preferences and improve site functionality. You can disable cookies in your browser
              settings, though this may affect your ability to use certain features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal information for as long as necessary to fulfill the purposes
              outlined in this policy. Booking information is retained for at least 3 years for
              accounting and legal compliance. You may request deletion of your data at any time by
              contacting us at questions@grizzlygetaway.co.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">7. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your personal information,
              including encryption and secure server protocols. However, no method of transmission
              over the internet is 100% secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">8. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Access your personal information</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact us at questions@grizzlygetaway.co.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">
              9. Changes to This Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. Changes will be effective
              immediately upon posting. Your continued use of our services constitutes acceptance of
              the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">10. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or our privacy practices, please
              contact us at questions@grizzlygetaway.co.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
