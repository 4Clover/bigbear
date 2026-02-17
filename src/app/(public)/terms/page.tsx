import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for Grizzly Getaway cabin rental.',
}

export default async function TermsPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Effective Date: February 17, 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">1. Booking and Payment</h2>
            <p className="text-muted-foreground">
              By booking a stay at Grizzly Getaway (1394 La Crescenta Dr, Big Bear, CA 92314), you
              agree to these terms. A booking is confirmed once payment is received. We accept
              payment via Stripe and other methods as displayed during checkout. All prices are in
              USD and include applicable taxes unless otherwise stated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">2. Cancellation Policy</h2>
            <p className="text-muted-foreground">
              Cancellations are subject to the following refund schedule:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>
                <strong>14 or more days before check-in:</strong> Full refund of the booking amount
                minus the non-refundable security deposit.
              </li>
              <li>
                <strong>7 to 13 days before check-in:</strong> 50% refund of the booking amount
                (minus the non-refundable security deposit).
              </li>
              <li>
                <strong>Less than 7 days before check-in:</strong> No refund.
              </li>
              <li>
                <strong>Security deposit:</strong> Always non-refundable, regardless of cancellation
                timing.
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To cancel, contact us at questions@grizzlygetaway.co with your booking details.
              Refunds are processed within 5-7 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">
              3. Check-in and Check-out
            </h2>
            <p className="text-muted-foreground">
              Check-in is at 4:00 PM and check-out is at 11:00 AM on your respective dates. Early
              check-in or late check-out may be available upon request and subject to additional
              fees. Please contact us at questions@grizzlygetaway.co to arrange.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">4. Property Rules</h2>
            <p className="text-muted-foreground">Guests agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Respect quiet hours (10:00 PM to 8:00 AM)</li>
              <li>Not exceed the maximum occupancy stated in the booking</li>
              <li>Not host parties or events without prior written consent</li>
              <li>Not smoke inside the property</li>
              <li>Not bring pets unless explicitly approved</li>
              <li>Leave the property in clean condition</li>
              <li>Report any damage or maintenance issues immediately</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">
              5. Damage and Liability
            </h2>
            <p className="text-muted-foreground">
              Guests are responsible for any damage caused during their stay beyond normal wear and
              tear. Grizzly Getaway reserves the right to charge for repairs or replacement of
              damaged items. The security deposit may be used to cover such costs.
            </p>
            <p className="text-muted-foreground mt-4">
              Grizzly Getaway is not liable for personal injury, loss of personal property, or any
              indirect damages during your stay. Guests use the property at their own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">
              6. Guest Responsibilities
            </h2>
            <p className="text-muted-foreground">Guests agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate information during booking</li>
              <li>Follow all local laws and regulations</li>
              <li>Use the property only for residential purposes</li>
              <li>Not sublease or transfer the booking without consent</li>
              <li>Comply with all posted house rules</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">
              7. Limitation of Liability
            </h2>
            <p className="text-muted-foreground">
              To the fullest extent permitted by law, Grizzly Getaway and its owners, managers, and
              staff are not liable for any direct, indirect, incidental, special, or consequential
              damages arising from your use of the property or these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">8. Changes to Terms</h2>
            <p className="text-muted-foreground">
              Grizzly Getaway reserves the right to modify these terms at any time. Changes will be
              effective immediately upon posting. Your continued use of the booking system
              constitutes acceptance of updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">9. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these terms, please contact us at questions@grizzlygetaway.co.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
