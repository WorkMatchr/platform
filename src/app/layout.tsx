import type { Metadata } from 'next'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { siteConfig } from '@/config/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: 'WorkMatchr | Uw digitale arbo-adviseur',
  description:
    'WorkMatchr helpt organisaties hun arbo- en veiligheidsvraag te begrijpen, relevante verplichtingen te herkennen en passende specialisten te vinden.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: 'WorkMatchr | Uw digitale arbo-adviseur',
    description:
      'WorkMatchr helpt organisaties hun arbo- en veiligheidsvraag te begrijpen, relevante verplichtingen te herkennen en passende specialisten te vinden.',
    url: '/',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <a href="#main-content" className="sr-only m-0 z-50 rounded-control bg-surface px-4 py-3 font-semibold text-brand-dark focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
          Ga naar de hoofdinhoud
        </a>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
