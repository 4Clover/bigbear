import { DollarSign, Home, Mountain, Snowflake } from 'lucide-react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui'

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-forest-900 via-forest-800 to-forest-900 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl md:h-[56px] md:leading-none md:whitespace-nowrap font-bold mb-6">
              Your Alpine Adventure Awaits
            </h1>
            <p className="text-xl md:text-2xl text-forest-100 mb-8">
              Discover the perfect getaway at Grizzly Getaway. Surrounded by nature, equipped for
              comfort.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/book">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-forest-800 hover:bg-forest-50"
                >
                  Book Your Stay
                </Button>
              </Link>
              <Link href="/gallery">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-white text-white hover:bg-white/10"
                >
                  View Gallery
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Why Choose Grizzly Getaway?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FeatureCard
              icon={Home}
              title="Cozy & Comfortable"
              description={
                'Fully furnished cabin with a hot tub, 90" TV, and modern appliances — perfect for relaxation after a day of adventure.'
              }
            />
            <FeatureCard
              icon={Mountain}
              title="Scenic Location"
              description="Nestled in the mountains with breathtaking views and easy access to hiking trails and lake activities."
            />
            <FeatureCard
              icon={DollarSign}
              title="Great Value"
              description="Competitive pricing with transparent fees. No hidden costs, just honest mountain hospitality."
            />
            <FeatureCard
              icon={Snowflake}
              title="Steps from the Slopes"
              description="Just a 6-minute drive to Bear Mountain Ski Resort and 10 minutes to Snow Summit. Hit the slopes and be home in no time."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4 text-foreground">
            Ready for Your Grizzly Getaway?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Click the button below to check availability and book your stay today. Thank you for
            considering our humble cozy cabin.
          </p>
          <Link href="/book">
            <Button size="lg">Check Availability</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) => {
  return (
    <div className="text-center p-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-forest-100 dark:bg-forest-900 text-forest-600 dark:text-forest-400 mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
