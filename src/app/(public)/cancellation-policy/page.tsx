import type { Metadata } from 'next'

export const revalidate = 86400 // 24 hours ISR

export const metadata: Metadata = {
  title: 'Cancellation Policy',
  description: 'Cancellation and refund policy for Grizzly Getaway.',
}

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Cancellation Policy</h1>
        <p className="text-muted-foreground mb-8">Effective Date: February 17, 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">Overview</h2>
            <p className="text-muted-foreground">
              At Grizzly Getaway in Big Bear, CA, we understand that
              plans can change. Our cancellation policy is designed to be fair to both guests and
              property owners. The refund amount depends on how far in advance you cancel before
              your check-in date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">Refund Tiers</h2>
            <p className="text-muted-foreground">
              Your refund eligibility is determined by the number of days between your cancellation
              date and your scheduled check-in date:
            </p>

            <div className="mt-6 space-y-6">
              <div className="border-l-4 border-forest-500 pl-6 py-4 bg-muted rounded-r-lg">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  14 or More Days Before Check-in
                </h3>
                <p className="text-muted-foreground mb-2">
                  <strong>Refund: 100% (Full Refund)</strong>
                </p>
                <p className="text-muted-foreground">
                  If you cancel 14 or more days before your scheduled check-in date, you will
                  receive a full refund of your booking amount. The non-refundable security deposit
                  will be deducted from the refund.
                </p>
              </div>

              <div className="border-l-4 border-wood-500 pl-6 py-4 bg-muted rounded-r-lg">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  7 to 13 Days Before Check-in
                </h3>
                <p className="text-muted-foreground mb-2">
                  <strong>Refund: 50% (Partial Refund)</strong>
                </p>
                <p className="text-muted-foreground">
                  If you cancel between 7 and 13 days before your scheduled check-in date, you will
                  receive 50% of your booking amount. The non-refundable security deposit will be
                  deducted from this refund.
                </p>
              </div>

              <div className="border-l-4 border-stone-500 pl-6 py-4 bg-muted rounded-r-lg">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Less Than 7 Days Before Check-in
                </h3>
                <p className="text-muted-foreground mb-2">
                  <strong>Refund: 0% (No Refund)</strong>
                </p>
                <p className="text-muted-foreground">
                  If you cancel less than 7 days before your scheduled check-in date, no refund will
                  be issued. Your full payment, including the security deposit, will be retained.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">Security Deposit</h2>
            <p className="text-muted-foreground">
              The security deposit is always non-refundable, regardless of when you cancel. It is
              retained to cover potential damages or cleaning costs. If no damage occurs and the
              property is left in good condition, the deposit is simply not returned as part of any
              refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">How to Cancel</h2>
            <p className="text-muted-foreground">
              To cancel your booking, please contact us as soon as possible at
              questions@grizzlygetaway.co with your booking confirmation number. Include your name
              and the dates of your reservation. We will process your cancellation and calculate
              your refund based on the date we receive your cancellation request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">Refund Processing</h2>
            <p className="text-muted-foreground">
              Once your cancellation is processed, refunds are issued to your original payment
              method within 5 to 7 business days. Depending on your bank or credit card company, it
              may take an additional 1 to 3 business days for the funds to appear in your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">Special Circumstances</h2>
            <p className="text-muted-foreground">
              In rare cases, we may consider exceptions to this policy due to unforeseen
              circumstances such as illness, family emergencies, or natural disasters. Please
              contact us at questions@grizzlygetaway.co to discuss your situation. We will review
              each request on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">No-Show Policy</h2>
            <p className="text-muted-foreground">
              If you do not arrive for your scheduled check-in and have not cancelled in advance,
              your full payment will be retained. We recommend cancelling as soon as you know you
              cannot make your stay to potentially receive a refund based on the tier above.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground">Questions?</h2>
            <p className="text-muted-foreground">
              If you have any questions about our cancellation policy or need to discuss your
              specific situation, please reach out to us at questions@grizzlygetaway.co. We&apos;re
              here to help.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
