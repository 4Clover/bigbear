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
              <span className="text-xl font-bold text-white">Big Bear Cabin</span>
            </div>
            <p className="text-sm max-w-md text-stone-400">
              Escape to our cozy mountain cabin nestled in the heart of Big Bear. Perfect for
              families, couples, and groups seeking a peaceful retreat.
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
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-forest-400" />
                Big Bear Lake, CA
              </li>
              <li>
                <a
                  href="mailto:hello@bigbearcabin.com"
                  className="flex items-center gap-2 hover:text-forest-400 transition-colors"
                >
                  <Mail className="h-4 w-4 text-forest-400" />
                  hello@bigbearcabin.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-8 pt-8 text-sm text-center text-stone-500">
          <p>&copy; {new Date().getFullYear()} Big Bear Cabin. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
