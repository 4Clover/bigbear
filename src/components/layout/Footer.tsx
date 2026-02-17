import { Mail, MapPin, TreePine } from 'lucide-react'
import Link from 'next/link'

export const Footer = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 dark:bg-stone-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <TreePine className="h-8 w-8 text-forest-400" />
              <span className="text-xl font-bold text-white">Grizzly Getaway</span>
            </div>
            <p className="text-sm max-w-md text-stone-400">
              Escape to our cozy mountain retreat at Grizzly Getaway in Big Bear. Perfect for
              families, couples, and groups seeking a peaceful getaway.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/gallery" className="hover:text-forest-400 transition-colors">
                  Photo Gallery
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-forest-400 transition-colors">
                  Book Your Stay
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-forest-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-forest-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-forest-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/cancellation-policy"
                  className="hover:text-forest-400 transition-colors"
                >
                  Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-forest-400" />
                1394 La Crescenta Dr, Big Bear, CA 92314
              </li>
              <li>
                <a
                  href="mailto:questions@grizzlygetaway.co"
                  className="flex items-center gap-2 hover:text-forest-400 transition-colors"
                >
                  <Mail className="h-4 w-4 text-forest-400" />
                  questions@grizzlygetaway.co
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-8 pt-8 text-sm text-center text-stone-500">
          <p>&copy; {new Date().getFullYear()} Grizzly Getaway. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
