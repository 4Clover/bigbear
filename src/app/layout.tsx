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
    default: 'Big Bear Cabin | Mountain Retreat',
    template: '%s | Big Bear Cabin',
  },
  description:
    'Escape to our cozy mountain cabin in Big Bear. Perfect for families, couples, and groups seeking a peaceful retreat in nature.',
  keywords: ['Big Bear', 'cabin rental', 'mountain retreat', 'vacation rental', 'Big Bear Lake'],
  authors: [{ name: 'Big Bear Cabin' }],
  openGraph: {
    title: 'Big Bear Cabin | Mountain Retreat',
    description:
      'Escape to our cozy mountain cabin in Big Bear. Perfect for families, couples, and groups seeking a peaceful retreat in nature.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Big Bear Cabin',
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
