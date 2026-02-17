import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Grizzly Getaway | Mountain Retreat',
    template: '%s | Grizzly Getaway',
  },
  description:
    'Escape to Grizzly Getaway — a cozy mountain cabin in Big Bear with a hot tub, 90" TV, and modern amenities. Minutes from Bear Mountain and Snow Summit ski resorts. Perfect for families, couples, and groups.',
  keywords: [
    'Grizzly Getaway',
    'Big Bear',
    'Big Bear Lake',
    'cabin rental',
    'mountain retreat',
    'vacation rental',
    'snowboarding',
    'ski resort',
    'Bear Mountain',
    'Snow Summit',
    'hot tub',
    'modern appliances',
    '90 inch TV',
  ],
  authors: [{ name: 'Grizzly Getaway' }],
  openGraph: {
    title: 'Grizzly Getaway | Mountain Retreat',
    description:
      'Escape to Grizzly Getaway — a cozy mountain cabin in Big Bear with a hot tub, 90" TV, and modern amenities. Minutes from Bear Mountain and Snow Summit ski resorts. Perfect for families, couples, and groups.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Grizzly Getaway',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
