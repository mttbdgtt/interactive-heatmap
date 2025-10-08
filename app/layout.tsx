import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Studio B',
  description: 'Studio B is an experimental design studio exploring the intersection of modern web technologies, design, motion and words.',
  keywords: ['design studio', 'experimental design', 'web design', 'modern web', 'creative studio'],
  authors: [{ name: 'Studio B' }],
  openGraph: {
    title: 'Studio B',
    description: 'Exploring the intersection of modern web technologies, design, motion and words.',
    url: 'https://studiokcmo.com',
    siteName: 'Studio B',
    images: [
      {
        url: '/og-image.jpg', // Add your own OG image
        width: 1200,
        height: 630,
        alt: 'Studio B',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Studio B - Experimental Design Studio',
    description: 'Exploring the intersection of modern web technologies, design and words.',
    images: ['/og-image.jpg'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}